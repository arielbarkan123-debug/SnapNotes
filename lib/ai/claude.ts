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
  getCourseGenerationPrompt,
  getCombinedAnalysisPrompt,
  cleanJsonResponse,
  validateExtractedContent,
  formatExtractedContentForPrompt,
  ExtractedContent,
} from './prompts'
import { GeneratedCourse } from '@/types'

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS_EXTRACTION = 4096
const MAX_TOKENS_GENERATION = 8192

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
    anthropicClient = new Anthropic({ apiKey })
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
      return new ClaudeAPIError(error.message, 'API_ERROR')
    }

    return new ClaudeAPIError('An unknown error occurred', 'API_ERROR')
  }
}

// ============================================================================
// Image Utilities
// ============================================================================

/**
 * Fetches an image from URL and converts it to base64
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<ImageData> {
  try {
    const response = await fetch(imageUrl)

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
 * @returns Generated course object and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function generateStudyCourse(
  extractedContent: ExtractedContent,
  userTitle?: string
): Promise<CourseGenerationResult> {
  const client = getAnthropicClient()

  // Format extracted content for the prompt
  const formattedContent = formatExtractedContentForPrompt(extractedContent)
  const { systemPrompt, userPrompt } = getCourseGenerationPrompt(formattedContent, userTitle)

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

    // Validate required fields
    if (!course.title || !course.overview || !course.sections) {
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
    course = normalizeGeneratedCourse(course)

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
 * @returns Both extracted content and generated course
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromImage(
  imageUrl: string,
  userTitle?: string
): Promise<FullPipelineResult> {
  // Step 1: Extract content from image
  const { extractedContent, rawText: extractionRawText } = await analyzeNotebookImage(imageUrl)

  // Step 2: Generate course from extracted content
  const { course: generatedCourse, rawText: generationRawText } = await generateStudyCourse(
    extractedContent,
    userTitle
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

    // Validate and apply user title
    if (!course.title || !course.overview || !course.sections) {
      throw new ClaudeAPIError(
        'Generated course is missing required fields',
        'PARSE_ERROR'
      )
    }

    if (userTitle && userTitle.trim()) {
      course.title = userTitle.trim()
    }

    course = normalizeGeneratedCourse(course)

    return { course, rawText }
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
 */
function normalizeGeneratedCourse(course: GeneratedCourse): GeneratedCourse {
  return {
    ...course,
    keyConcepts: course.keyConcepts || [],
    furtherStudy: course.furtherStudy || [],
    sections: course.sections.map(section => ({
      ...section,
      keyPoints: section.keyPoints || [],
      formulas: section.formulas || [],
      diagrams: section.diagrams || [],
      examples: section.examples || [],
    })),
  }
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
      default:
        return error.message
    }
  }
  return 'An unexpected error occurred. Please try again.'
}

// ============================================================================
// Exports
// ============================================================================

export type { ExtractedContent }
export { AI_MODEL }
