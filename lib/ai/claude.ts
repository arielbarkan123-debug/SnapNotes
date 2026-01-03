/**
 * Claude AI Service for NoteSnap
 *
 * Handles all communication with the Anthropic Claude API:
 * - Image analysis for notebook pages
 * - Course generation from extracted content
 * - Combined image-to-course pipeline
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  getImageAnalysisPrompt,
  getMultiPageImageAnalysisPrompt,
  getCourseGenerationPrompt,
  getCombinedAnalysisPrompt,
  getDocumentCoursePrompt,
  getTextCoursePrompt,
  cleanJsonResponse,
  validateExtractedContent,
  formatExtractedContentForPrompt,
  ExtractedContent,
  UserLearningContext,
} from './prompts'
import type { ExtractedDocument } from '@/lib/documents'
import { GeneratedCourse } from '@/types'

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS_EXTRACTION = 4096
const MAX_TOKENS_GENERATION = 8192
const MAX_IMAGES_PER_REQUEST = 5 // Claude's recommended limit for optimal performance
const API_TIMEOUT_MS = 120000 // 2 minute timeout for AI operations

// Initialize Anthropic client (singleton)
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new ClaudeAPIError(
        'ANTHROPIC_API_KEY environment variable is not set',
        'CONFIG_ERROR'
      )
    }
    anthropicClient = new Anthropic({
      apiKey,
      timeout: API_TIMEOUT_MS,
    })
  }
  return anthropicClient
}

// ============================================================================
// Types
// ============================================================================

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface ImageData {
  base64: string
  mediaType: ImageMediaType
}

export interface AnalysisResult {
  extractedContent: ExtractedContent
  rawText: string
}

export interface CourseGenerationResult {
  course: GeneratedCourse
  rawText: string
}

export interface FullPipelineResult {
  extractedContent: ExtractedContent
  generatedCourse: GeneratedCourse
  extractionRawText: string
  generationRawText: string
}

export type ClaudeErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_IMAGE'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'CONFIG_ERROR'
  | 'EMPTY_CONTENT'
  | 'TIMEOUT'

// ============================================================================
// Custom Error Class
// ============================================================================

export class ClaudeAPIError extends Error {
  code: ClaudeErrorCode
  retryable: boolean
  statusCode?: number

  constructor(message: string, code: ClaudeErrorCode, statusCode?: number) {
    super(message)
    this.name = 'ClaudeAPIError'
    this.code = code
    this.statusCode = statusCode
    this.retryable = code === 'RATE_LIMIT' || code === 'NETWORK_ERROR'
  }

  static fromAnthropicError(error: unknown): ClaudeAPIError {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return new ClaudeAPIError(
          'API rate limit exceeded. Please wait a moment and try again.',
          'RATE_LIMIT',
          429
        )
      }
      if (error.status === 400) {
        return new ClaudeAPIError(
          'Could not process the image. The image may be corrupted or in an unsupported format.',
          'INVALID_IMAGE',
          400
        )
      }
      if (error.status === 401 || error.status === 403) {
        return new ClaudeAPIError(
          'API authentication failed. Please check your API key configuration.',
          'CONFIG_ERROR',
          error.status
        )
      }
      return new ClaudeAPIError(
        `API error: ${error.message}`,
        'API_ERROR',
        error.status
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return new ClaudeAPIError(
          'Network error. Please check your connection and try again.',
          'NETWORK_ERROR'
        )
      }
      if (error.message.includes('timeout') || error.name === 'AbortError') {
        return new ClaudeAPIError(
          'The request took too long. Please try again with a smaller file.',
          'TIMEOUT'
        )
      }
      return new ClaudeAPIError(error.message, 'API_ERROR')
    }

    return new ClaudeAPIError('An unknown error occurred', 'API_ERROR')
  }
}

// ============================================================================
// Image Utilities
// ============================================================================

// Timeout for image fetching (10 seconds)
const IMAGE_FETCH_TIMEOUT_MS = 10000

/**
 * Fetches an image from URL and converts it to base64
 * Includes timeout protection for slow/unresponsive CDNs
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<ImageData> {
  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)

    const response = await fetch(imageUrl, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new ClaudeAPIError(
        `Failed to fetch image: HTTP ${response.status}`,
        'INVALID_IMAGE',
        response.status
      )
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()

    if (arrayBuffer.byteLength === 0) {
      throw new ClaudeAPIError(
        'Image file is empty',
        'INVALID_IMAGE'
      )
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mediaType = getMediaType(contentType)

    return { base64, mediaType }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ClaudeAPIError(
        'Image fetch timed out. The image server is taking too long to respond.',
        'TIMEOUT'
      )
    }
    throw new ClaudeAPIError(
      'Failed to fetch image. Please check the URL and try again.',
      'NETWORK_ERROR'
    )
  }
}

/**
 * Maps content-type header to Anthropic's expected media types
 */
function getMediaType(contentType: string): ImageMediaType {
  if (contentType.includes('png')) return 'image/png'
  if (contentType.includes('gif')) return 'image/gif'
  if (contentType.includes('webp')) return 'image/webp'
  return 'image/jpeg'
}

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * Analyzes a notebook image and extracts structured content
 *
 * @param imageUrl - URL of the image to analyze
 * @returns Extracted content object and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function analyzeNotebookImage(imageUrl: string): Promise<AnalysisResult> {
  const client = getAnthropicClient()
  const { base64, mediaType } = await fetchImageAsBase64(imageUrl)
  const { systemPrompt, userPrompt } = getImageAnalysisPrompt()

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS_EXTRACTION,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError(
        'No text content in AI response',
        'PARSE_ERROR'
      )
    }

    const rawText = textContent.text

    // Parse JSON response
    const jsonText = cleanJsonResponse(rawText)
    let extractedContent: ExtractedContent

    try {
      extractedContent = JSON.parse(jsonText)
    } catch {
      throw new ClaudeAPIError(
        'Failed to parse extracted content as JSON. The AI response format was unexpected.',
        'PARSE_ERROR'
      )
    }

    // Validate structure
    if (!validateExtractedContent(extractedContent)) {
      throw new ClaudeAPIError(
        'Extracted content is missing required fields',
        'PARSE_ERROR'
      )
    }

    // Check for meaningful content
    if (extractedContent.content.length === 0 && extractedContent.mainTopics.length === 0) {
      throw new ClaudeAPIError(
        'No readable content found in the image. Please upload a clearer photo.',
        'EMPTY_CONTENT'
      )
    }

    return { extractedContent, rawText }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    throw ClaudeAPIError.fromAnthropicError(error)
  }
}

/**
 * Generates a study course from extracted content
 *
 * @param extractedContent - Previously extracted content from image
 * @param userTitle - Optional user-provided title
 * @param imageUrls - Optional array of image URLs available for the course
 * @param userContext - Optional user learning context for personalization
 * @returns Generated course object and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function generateStudyCourse(
  extractedContent: ExtractedContent,
  userTitle?: string,
  imageUrls?: string[],
  userContext?: UserLearningContext
): Promise<CourseGenerationResult> {
  const client = getAnthropicClient()

  // Format extracted content for the prompt
  const formattedContent = formatExtractedContentForPrompt(extractedContent)
  const imageCount = imageUrls?.length || 0
  const { systemPrompt, userPrompt } = getCourseGenerationPrompt(formattedContent, userTitle, imageCount, userContext)

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS_GENERATION,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError(
        'No text content in AI response',
        'PARSE_ERROR'
      )
    }

    const rawText = textContent.text

    // Parse JSON response
    const jsonText = cleanJsonResponse(rawText)
    let course: GeneratedCourse

    try {
      course = JSON.parse(jsonText)
    } catch {
      throw new ClaudeAPIError(
        'Failed to parse course structure as JSON. The AI response format was unexpected.',
        'PARSE_ERROR'
      )
    }

    // Validate required fields (AI may return "sections" or "lessons")
    const hasLessons = course.lessons || (course as any).sections
    if (!course.title || !course.overview || !hasLessons) {
      throw new ClaudeAPIError(
        'Generated course is missing required fields',
        'PARSE_ERROR'
      )
    }

    // Apply user title if provided
    if (userTitle && userTitle.trim()) {
      course.title = userTitle.trim()
    }

    // Ensure optional arrays exist and map image URLs
    const { normalizedCourse, webImageQueries } = normalizeGeneratedCourse(course, imageUrls)
    course = normalizedCourse

    // Fetch web images if needed
    if (webImageQueries.length > 0) {
      const { searchEducationalImages } = await import('@/lib/images')
      const subject = course.title.split(':')[0].trim()

      for (const query of webImageQueries) {
        try {
          const searchQuery = `${query.query} ${subject}`
          const webImages = await searchEducationalImages(searchQuery.slice(0, 100))
          if (webImages.length > 0) {
            const webImage = webImages[0]
            const step = course.lessons[query.lessonIndex]?.steps[query.stepIndex]
            if (step) {
              step.imageUrl = webImage.url
              step.imageAlt = query.alt
              step.imageSource = 'web'
              step.imageCaption = query.alt
              step.imageCredit = webImage.credit
              step.imageCreditUrl = webImage.creditUrl
            }
          }
        } catch {
          // Continue without this image
        }
      }
    }

    return { course, rawText }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    throw ClaudeAPIError.fromAnthropicError(error)
  }
}

/**
 * Full pipeline: Analyzes image and generates course in two steps
 *
 * @param imageUrl - URL of the image to process
 * @param userTitle - Optional user-provided title
 * @param userContext - Optional user learning context for personalization
 * @returns Both extracted content and generated course
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromImage(
  imageUrl: string,
  userTitle?: string,
  userContext?: UserLearningContext
): Promise<FullPipelineResult> {
  // Step 1: Extract content from image
  const { extractedContent, rawText: extractionRawText } = await analyzeNotebookImage(imageUrl)

  // Step 2: Generate course from extracted content
  const { course: generatedCourse, rawText: generationRawText } = await generateStudyCourse(
    extractedContent,
    userTitle,
    undefined,
    userContext
  )

  return {
    extractedContent,
    generatedCourse,
    extractionRawText,
    generationRawText,
  }
}

/**
 * Single-call pipeline: Analyzes image and generates course in one API call
 * More efficient but less flexible than two-step approach
 *
 * @param imageUrl - URL of the image to process
 * @param userTitle - Optional user-provided title
 * @returns Generated course
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromImageSingleCall(
  imageUrl: string,
  userTitle?: string
): Promise<{ course: GeneratedCourse; rawText: string }> {
  const client = getAnthropicClient()
  const { base64, mediaType } = await fetchImageAsBase64(imageUrl)
  const { systemPrompt, userPrompt } = getCombinedAnalysisPrompt(userTitle)

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS_GENERATION,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError(
        'No text content in AI response',
        'PARSE_ERROR'
      )
    }

    const rawText = textContent.text

    // Parse JSON response
    const jsonText = cleanJsonResponse(rawText)
    let course: GeneratedCourse

    try {
      course = JSON.parse(jsonText)
    } catch {
      throw new ClaudeAPIError(
        'Failed to parse course as JSON. The AI response format was unexpected.',
        'PARSE_ERROR'
      )
    }

    // Validate and apply user title (AI may return "sections" or "lessons")
    const hasLessons = course.lessons || (course as any).sections
    if (!course.title || !course.overview || !hasLessons) {
      throw new ClaudeAPIError(
        'Generated course is missing required fields',
        'PARSE_ERROR'
      )
    }

    if (userTitle && userTitle.trim()) {
      course.title = userTitle.trim()
    }

    const { normalizedCourse, webImageQueries } = normalizeGeneratedCourse(course)
    course = normalizedCourse

    // Fetch web images if requested
    if (webImageQueries.length > 0) {
      const { searchEducationalImages } = await import('@/lib/images')
      const subject = course.title.split(':')[0].trim()

      for (const query of webImageQueries) {
        try {
          const searchQuery = `${query.query} ${subject}`
          const webImages = await searchEducationalImages(searchQuery.slice(0, 100))
          if (webImages.length > 0) {
            const webImage = webImages[0]
            const step = course.lessons[query.lessonIndex]?.steps[query.stepIndex]
            if (step) {
              step.imageUrl = webImage.url
              step.imageAlt = query.alt
              step.imageSource = 'web'
              step.imageCaption = query.alt
              step.imageCredit = webImage.credit
              step.imageCreditUrl = webImage.creditUrl
            }
          }
        } catch {
          // Continue without this image
        }
      }
    }

    return { course, rawText }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    throw ClaudeAPIError.fromAnthropicError(error)
  }
}

// ============================================================================
// Multi-Image Analysis Functions
// ============================================================================

/**
 * Analyzes multiple notebook images and extracts combined structured content
 * Processes images in batches if more than MAX_IMAGES_PER_REQUEST
 *
 * @param imageUrls - Array of URLs of images to analyze
 * @returns Combined extracted content and raw text
 * @throws ClaudeAPIError on failure
 */
export async function analyzeMultipleNotebookImages(
  imageUrls: string[]
): Promise<AnalysisResult> {
  if (imageUrls.length === 0) {
    throw new ClaudeAPIError('No images provided', 'INVALID_IMAGE')
  }

  // If only one image, use existing single-image function
  if (imageUrls.length === 1) {
    return analyzeNotebookImage(imageUrls[0])
  }

  // Process in batches if more than MAX_IMAGES_PER_REQUEST
  if (imageUrls.length > MAX_IMAGES_PER_REQUEST) {
    return analyzeImagesInBatches(imageUrls)
  }

  // Process all images in a single request
  return analyzeImageBatch(imageUrls)
}

/**
 * Analyzes a batch of images (up to MAX_IMAGES_PER_REQUEST) in a single API call
 */
async function analyzeImageBatch(imageUrls: string[]): Promise<AnalysisResult> {
  const client = getAnthropicClient()

  // Fetch all images in parallel
  const imageDataPromises = imageUrls.map((url) => fetchImageAsBase64(url))
  const imagesData = await Promise.all(imageDataPromises)

  // Use multi-page prompts for multiple images
  const { systemPrompt, userPrompt } = getMultiPageImageAnalysisPrompt(imageUrls.length)

  // Build message content with all images
  const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = []

  // Add each image with page indicators
  imagesData.forEach((imageData, index) => {
    // Add page label before each image
    messageContent.push({
      type: 'text',
      text: `--- Page ${index + 1} of ${imageUrls.length} ---`,
    })
    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageData.mediaType,
        data: imageData.base64,
      },
    })
  })

  // Add the analysis prompt at the end
  messageContent.push({
    type: 'text',
    text: userPrompt,
  })

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS_EXTRACTION * 2, // More tokens for multiple images
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    })

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

    const rawText = textContent.text

    // Parse JSON response
    const jsonText = cleanJsonResponse(rawText)
    let extractedContent: ExtractedContent

    try {
      extractedContent = JSON.parse(jsonText)
    } catch {
      throw new ClaudeAPIError(
        'Failed to parse extracted content as JSON. The AI response format was unexpected.',
        'PARSE_ERROR'
      )
    }

    // Validate structure
    if (!validateExtractedContent(extractedContent)) {
      throw new ClaudeAPIError(
        'Extracted content is missing required fields',
        'PARSE_ERROR'
      )
    }

    // Check for meaningful content
    if (
      extractedContent.content.length === 0 &&
      extractedContent.mainTopics.length === 0
    ) {
      throw new ClaudeAPIError(
        'No readable content found in the images. Please upload clearer photos.',
        'EMPTY_CONTENT'
      )
    }

    return { extractedContent, rawText }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    throw ClaudeAPIError.fromAnthropicError(error)
  }
}

/**
 * Processes images in batches when there are more than MAX_IMAGES_PER_REQUEST
 * Combines extracted content from all batches
 */
async function analyzeImagesInBatches(imageUrls: string[]): Promise<AnalysisResult> {
  const batches: string[][] = []

  // Split into batches
  for (let i = 0; i < imageUrls.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(imageUrls.slice(i, i + MAX_IMAGES_PER_REQUEST))
  }

  // Process each batch
  const batchResults: AnalysisResult[] = []
  for (let i = 0; i < batches.length; i++) {
    const result = await analyzeImageBatch(batches[i])
    batchResults.push(result)
  }

  // Combine results from all batches
  const combinedContent: ExtractedContent = {
    subject: '',
    mainTopics: [],
    content: [],
    diagrams: [],
    formulas: [],
    structure: '',
    summary: '',
  }

  const rawTexts: string[] = []

  for (let i = 0; i < batchResults.length; i++) {
    const result = batchResults[i]
    const content = result.extractedContent

    // Use subject and structure from first batch result
    if (i === 0) {
      combinedContent.subject = content.subject
      combinedContent.structure = content.structure
    }

    // Merge arrays, avoiding duplicates in mainTopics
    content.mainTopics.forEach((topic) => {
      if (!combinedContent.mainTopics.includes(topic)) {
        combinedContent.mainTopics.push(topic)
      }
    })

    combinedContent.content.push(...content.content)
    if (content.diagrams) {
      combinedContent.diagrams!.push(...content.diagrams)
    }
    if (content.formulas) {
      combinedContent.formulas!.push(...content.formulas)
    }

    // Combine summaries
    if (content.summary) {
      combinedContent.summary = combinedContent.summary
        ? `${combinedContent.summary}\n\n${content.summary}`
        : content.summary
    }

    rawTexts.push(result.rawText)
  }

  return {
    extractedContent: combinedContent,
    rawText: rawTexts.join('\n\n---\n\n'),
  }
}

/**
 * Full pipeline for multiple images: Analyzes all images and generates a single course
 *
 * @param imageUrls - Array of URLs of images to process
 * @param userTitle - Optional user-provided title
 * @param userContext - Optional user learning context for personalization
 * @returns Both extracted content and generated course
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromMultipleImages(
  imageUrls: string[],
  userTitle?: string,
  userContext?: UserLearningContext
): Promise<FullPipelineResult> {
  // Step 1: Extract content from all images
  const { extractedContent, rawText: extractionRawText } =
    await analyzeMultipleNotebookImages(imageUrls)

  // Step 2: Generate course from combined extracted content
  const { course: generatedCourse, rawText: generationRawText } =
    await generateStudyCourse(extractedContent, userTitle, undefined, userContext)

  return {
    extractedContent,
    generatedCourse,
    extractionRawText,
    generationRawText,
  }
}

// ============================================================================
// Document-Based Course Generation
// ============================================================================

export interface DocumentCourseResult {
  generatedCourse: GeneratedCourse
  generationRawText: string
}

/**
 * Generates a study course directly from extracted document content
 * Skips image analysis step since document content is already extracted
 *
 * @param document - ExtractedDocument from PDF, PPTX, or DOCX processing
 * @param userTitle - Optional user-provided title
 * @param imageUrls - Optional array of image URLs extracted from the document
 * @param userContext - Optional user learning context for personalization
 * @returns Generated course and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromDocument(
  document: ExtractedDocument,
  userTitle?: string,
  imageUrls?: string[],
  userContext?: UserLearningContext
): Promise<DocumentCourseResult> {
  const client = getAnthropicClient()
  const imageCount = imageUrls?.length || 0
  const { systemPrompt, userPrompt } = getDocumentCoursePrompt(document, userTitle, imageCount, userContext)

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS_GENERATION,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

    const rawText = textContent.text

    // Parse JSON response
    const jsonText = cleanJsonResponse(rawText)
    let course: GeneratedCourse

    try {
      course = JSON.parse(jsonText)
    } catch {
      throw new ClaudeAPIError(
        'Failed to parse course structure as JSON. The AI response format was unexpected.',
        'PARSE_ERROR'
      )
    }

    // Validate required fields (AI may return "sections" or "lessons")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasLessons = course.lessons || (course as any).sections
    if (!course.title || !course.overview || !hasLessons) {
      throw new ClaudeAPIError(
        'Generated course is missing required fields',
        'PARSE_ERROR'
      )
    }

    // Apply user title if provided
    if (userTitle && userTitle.trim()) {
      course.title = userTitle.trim()
    }

    // Ensure optional arrays exist and map image URLs
    const { normalizedCourse, webImageQueries } = normalizeGeneratedCourse(course, imageUrls)
    course = normalizedCourse

    // Fetch web images for any webImageQuery requests
    if (webImageQueries.length > 0) {
      const { searchEducationalImages } = await import('@/lib/images')

      // Use course title as subject context for better searches
      const subject = course.title.split(':')[0].trim()

      for (const query of webImageQueries) {
        try {
          // Search with the specific query + subject context
          const searchQuery = `${query.query} ${subject}`
          const webImages = await searchEducationalImages(searchQuery.slice(0, 100)) // Limit query length

          if (webImages.length > 0) {
            const webImage = webImages[0]
            const step = course.lessons[query.lessonIndex]?.steps[query.stepIndex]
            if (step) {
              step.imageUrl = webImage.url
              step.imageAlt = query.alt
              step.imageSource = 'web'
              step.imageCaption = query.alt
              step.imageCredit = webImage.credit
              step.imageCreditUrl = webImage.creditUrl
            }
          }
        } catch {
          // Continue without this image
        }
      }
    }

    return {
      generatedCourse: course,
      generationRawText: rawText,
    }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    throw ClaudeAPIError.fromAnthropicError(error)
  }
}

// ============================================================================
// Text-Based Course Generation
// ============================================================================

export interface TextCourseResult {
  generatedCourse: GeneratedCourse
  generationRawText: string
}

/**
 * Generates a study course directly from user-provided text content
 * The text can be topics, outlines, study notes, or subject descriptions
 *
 * @param textContent - Plain text content provided by the user
 * @param userTitle - Optional user-provided title
 * @param userContext - Optional user learning context for personalization
 * @returns Generated course and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromText(
  textContent: string,
  userTitle?: string,
  userContext?: UserLearningContext
): Promise<TextCourseResult> {
  // Validate text content
  if (!textContent || textContent.trim().length === 0) {
    throw new ClaudeAPIError(
      'Text content cannot be empty',
      'EMPTY_CONTENT'
    )
  }

  // Minimum content length check (at least 20 characters)
  if (textContent.trim().length < 20) {
    throw new ClaudeAPIError(
      'Please provide more detailed content to generate a course',
      'EMPTY_CONTENT'
    )
  }

  const client = getAnthropicClient()
  const { systemPrompt, userPrompt } = getTextCoursePrompt(textContent, userTitle, userContext)

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS_GENERATION,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text from response
    const textResponseContent = response.content.find((block) => block.type === 'text')
    if (!textResponseContent || textResponseContent.type !== 'text') {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

    const rawText = textResponseContent.text

    // Parse JSON response
    const jsonText = cleanJsonResponse(rawText)
    let course: GeneratedCourse

    try {
      course = JSON.parse(jsonText)
    } catch {
      throw new ClaudeAPIError(
        'Failed to parse course structure as JSON. The AI response format was unexpected.',
        'PARSE_ERROR'
      )
    }

    // Validate required fields (AI may return "sections" or "lessons")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasLessons = course.lessons || (course as any).sections
    if (!course.title || !course.overview || !hasLessons) {
      throw new ClaudeAPIError(
        'Generated course is missing required fields',
        'PARSE_ERROR'
      )
    }

    // Apply user title if provided
    if (userTitle && userTitle.trim()) {
      course.title = userTitle.trim()
    }

    // Ensure optional arrays exist
    const { normalizedCourse, webImageQueries } = normalizeGeneratedCourse(course)
    course = normalizedCourse

    // Fetch web images if requested (text courses often need web images)
    if (webImageQueries.length > 0) {
      const { searchEducationalImages } = await import('@/lib/images')
      const subject = course.title.split(':')[0].trim()

      for (const query of webImageQueries) {
        try {
          const searchQuery = `${query.query} ${subject}`
          const webImages = await searchEducationalImages(searchQuery.slice(0, 100))
          if (webImages.length > 0) {
            const webImage = webImages[0]
            const step = course.lessons[query.lessonIndex]?.steps[query.stepIndex]
            if (step) {
              step.imageUrl = webImage.url
              step.imageAlt = query.alt
              step.imageSource = 'web'
              step.imageCaption = query.alt
              step.imageCredit = webImage.credit
              step.imageCreditUrl = webImage.creditUrl
            }
          }
        } catch {
          // Continue without this image
        }
      }
    }

    return {
      generatedCourse: course,
      generationRawText: rawText,
    }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    throw ClaudeAPIError.fromAnthropicError(error)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes a generated course by ensuring all optional arrays exist
 * Also handles the sections -> lessons mapping (AI generates "sections" but type expects "lessons")
 * Maps imageIndex references to actual image URLs if provided
 * Collects webImageQuery requests for later processing
 *
 * @param course - The raw course object from AI
 * @param imageUrls - Optional array of image URLs to map from imageIndex
 * @returns Normalized course and any web image queries that need to be fetched
 */
function normalizeGeneratedCourse(
  course: GeneratedCourse & { sections?: any[] },
  imageUrls?: string[]
): { normalizedCourse: GeneratedCourse; webImageQueries: { lessonIndex: number; stepIndex: number; query: string; alt: string }[] } {
  // Handle AI response that uses "sections" instead of "lessons"
  const lessonsData = course.lessons || course.sections || []
  const webImageQueries: { lessonIndex: number; stepIndex: number; query: string; alt: string }[] = []

  const normalizedCourse: GeneratedCourse = {
    title: course.title,
    overview: course.overview,
    lessons: lessonsData.map((lesson: any, lessonIndex: number) => ({
      title: lesson.title || 'Untitled Lesson',
      steps: (lesson.steps || []).map((step: any, stepIndex: number) => {
        // For question steps, put the question text in content
        // AI generates: { type: "question", question: "What is...?", options: [...] }
        // We need: { type: "question", content: "What is...?", options: [...] }
        const content = step.type === 'question'
          ? (step.question || step.content || '')
          : (step.content || '')

        // Map imageIndex to actual URL if available
        let imageUrl: string | undefined
        let imageAlt: string | undefined
        let imageSource: 'extracted' | 'web' | 'uploaded' | undefined

        if (
          typeof step.imageIndex === 'number' &&
          imageUrls &&
          step.imageIndex >= 0 &&
          step.imageIndex < imageUrls.length
        ) {
          imageUrl = imageUrls[step.imageIndex]
          imageAlt = step.imageAlt || `Image ${step.imageIndex + 1}`
          imageSource = 'extracted'
        } else if (step.webImageQuery && typeof step.webImageQuery === 'string') {
          // Collect web image queries for later processing
          webImageQueries.push({
            lessonIndex,
            stepIndex,
            query: step.webImageQuery,
            alt: step.imageAlt || step.webImageQuery,
          })
        }

        return {
          type: step.type || 'explanation',
          content,
          title: step.title,
          options: step.options,
          correct_answer: step.correctIndex ?? step.correct_answer,
          explanation: step.explanation,
          imageUrl,
          imageAlt,
          imageSource,
        }
      }),
    })),
  }

  return { normalizedCourse, webImageQueries }
}

/**
 * Utility to check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ClaudeAPIError) {
    return error.retryable
  }
  return false
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof ClaudeAPIError) {
    switch (error.code) {
      case 'RATE_LIMIT':
        return 'Service is busy. Please try again in a moment.'
      case 'INVALID_IMAGE':
        return 'Could not read the image. Please upload a clearer photo.'
      case 'PARSE_ERROR':
        return 'Failed to process the notes. Please try again.'
      case 'NETWORK_ERROR':
        return 'Connection error. Please check your internet and try again.'
      case 'EMPTY_CONTENT':
        return 'No readable content found. Please upload a clearer photo with visible notes.'
      case 'CONFIG_ERROR':
        return 'Service configuration error. Please contact support.'
      case 'TIMEOUT':
        return 'The request took too long. Please try again with a smaller file.'
      default:
        return error.message
    }
  }
  return 'An unexpected error occurred. Please try again.'
}

// ============================================================================
// Exports
// ============================================================================

export type { ExtractedContent, ExtractedDocument }
export { AI_MODEL }
