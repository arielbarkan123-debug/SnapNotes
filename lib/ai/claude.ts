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
  getExamCoursePrompt,
  getInitialCoursePrompt,
  getContinuationPrompt,
  isExamContent,
  cleanJsonResponse,
  validateExtractedContent,
  formatExtractedContentForPrompt,
  ExtractedContent,
  UserLearningContext,
} from './prompts'
import type { ExtractedDocument } from '@/lib/documents'
import { GeneratedCourse, Lesson, LessonOutline, LessonIntensityMode, StepType, LearningObjective } from '@/types'
import { filterForbiddenContent } from './course-validator'

// ============================================================================
// Configuration
// ============================================================================

// AI model with environment variable fallback
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'
const AI_MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-3-5-haiku-20241022'
const MAX_TOKENS_EXTRACTION = 4096
const MAX_TOKENS_GENERATION = 16384  // Increased for large documents (31 slides needs more tokens)
const MAX_IMAGES_PER_REQUEST = 5 // Claude's recommended limit for optimal performance
const API_TIMEOUT_MS = 180000 // 3 minute timeout - matches client timeout for Safari compatibility

/**
 * Get the default AI model for standard operations
 */
export function getAIModel(): string {
  return AI_MODEL
}

/**
 * Get the fast AI model for quick responses
 */
export function getAIModelFast(): string {
  return AI_MODEL_FAST
}

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
// Retry Logic with Exponential Backoff
// ============================================================================

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

/**
 * Checks if an Anthropic error is retryable (transient server issues)
 */
function isAnthropicErrorRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Retry on server errors, overload, rate limits, timeouts
    const retryableStatuses = [429, 500, 502, 503, 504, 529]
    return retryableStatuses.includes(error.status)
  }
  if (error instanceof Error) {
    // Retry on network/timeout errors
    const message = error.message.toLowerCase()
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('fetch') ||
           error.name === 'AbortError'
  }
  return false
}

/**
 * Executes a streaming operation with retry logic for Safari reliability.
 * Wraps the stream creation and consumption with automatic retry on transient errors.
 *
 * @param createStream - Function that creates the message stream
 * @param processStream - Function that processes the stream and extracts result
 * @param operationName - Name for logging
 * @returns The processed result
 */
async function withStreamRetry<T>(
  createStream: () => ReturnType<Anthropic['messages']['stream']>,
  processStream: (stream: ReturnType<Anthropic['messages']['stream']>) => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = createStream()
      return await processStream(stream)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if this error is retryable
      const shouldRetry = isAnthropicErrorRetryable(error) ||
        (error instanceof ClaudeAPIError && error.retryable)

      if (!shouldRetry || attempt === MAX_RETRIES) {
        // Convert to ClaudeAPIError if needed
        if (error instanceof ClaudeAPIError) {
          throw error
        }
        throw ClaudeAPIError.fromAnthropicError(error)
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.warn(
        `[${operationName}] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms...`
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new ClaudeAPIError('Unknown retry error', 'API_ERROR')
}

// ============================================================================
// JSON Extraction Utility
// ============================================================================

/**
 * Extracts JSON from AI response, handling various formats:
 * - Plain JSON
 * - JSON wrapped in markdown code blocks
 * - JSON with extra text before/after
 * - JSON with thinking tags
 */
function extractJsonFromResponse(text: string): string {
  let cleaned = text.trim()

  // Remove thinking tags if present (Opus sometimes uses these)
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
  cleaned = cleaned.replace(/<antThinking>[\s\S]*?<\/antThinking>/gi, '')

  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```json\s*/i, '')
  cleaned = cleaned.replace(/^```\s*/i, '')
  cleaned = cleaned.replace(/\s*```$/i, '')

  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleaned = jsonMatch[0]
  }

  // Clean up any remaining issues
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Attempts to repair truncated JSON by closing open brackets and braces.
 * This handles cases where AI response is cut off due to max_tokens.
 */
function repairTruncatedJson(json: string): string {
  let repaired = json.trim()

  // Count open brackets and braces
  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let escape = false

  for (const char of repaired) {
    if (escape) {
      escape = false
      continue
    }
    if (char === '\\') {
      escape = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (char === '{') openBraces++
    else if (char === '}') openBraces--
    else if (char === '[') openBrackets++
    else if (char === ']') openBrackets--
  }

  // If we're in a string, try to close it
  if (inString) {
    repaired += '"'
  }

  // Remove trailing comma if present (common in truncated arrays/objects)
  repaired = repaired.replace(/,\s*$/, '')

  // Close open brackets and braces
  while (openBrackets > 0) {
    repaired += ']'
    openBrackets--
  }
  while (openBraces > 0) {
    repaired += '}'
    openBraces--
  }

  console.log(`[repairTruncatedJson] Added ${json.length !== repaired.length ? repaired.length - json.length : 0} closing chars`)

  return repaired
}

// ============================================================================
// Parallel Web Image Fetching
// ============================================================================

interface WebImageQuery {
  lessonIndex: number
  stepIndex: number
  query: string
  alt: string
}

/**
 * Fetches web images in parallel instead of sequentially.
 * This reduces image fetch time from 4-5 minutes to ~20 seconds.
 */
async function fetchWebImagesParallel(
  webImageQueries: WebImageQuery[],
  course: GeneratedCourse,
  subject: string
): Promise<void> {
  if (webImageQueries.length === 0) return

  const { searchEducationalImages } = await import('@/lib/images')

  // Process 20 images at a time for faster finalization
  const BATCH_SIZE = 20
  const batches: WebImageQuery[][] = []

  for (let i = 0; i < webImageQueries.length; i += BATCH_SIZE) {
    batches.push(webImageQueries.slice(i, i + BATCH_SIZE))
  }

  console.log(`[fetchWebImagesParallel] Fetching ${webImageQueries.length} images in ${batches.length} batches`)

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async (query) => {
        try {
          const searchQuery = `${query.query} ${subject}`.slice(0, 100)
          const webImages = await searchEducationalImages(searchQuery)
          return { query, webImages }
        } catch {
          return { query, webImages: [] }
        }
      })
    )

    // Apply results to course steps
    for (const { query, webImages } of results) {
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
    }
  }

  console.log(`[fetchWebImagesParallel] Done fetching images`)
}

// ============================================================================
// Security: Input Sanitization
// ============================================================================

/**
 * Sanitizes user input to prevent prompt injection attacks.
 * - Limits length to prevent token exhaustion
 * - Removes characters that could be interpreted as prompt delimiters
 * - Escapes potential control sequences
 */
function sanitizeUserInput(input: string | undefined, maxLength: number = 200): string | undefined {
  if (!input) return undefined

  return input
    .slice(0, maxLength) // Limit length
    .replace(/[<>{}[\]\\]/g, '') // Remove potential control characters
    .replace(/```/g, '') // Remove code blocks that could inject prompts
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .trim()
}

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
    // Retry on transient errors: rate limits, network issues, timeouts
    this.retryable = code === 'RATE_LIMIT' || code === 'NETWORK_ERROR' || code === 'TIMEOUT'
  }

  static fromAnthropicError(error: unknown): ClaudeAPIError {
    // Log the actual error for debugging
    console.error('[ClaudeAPIError] Raw error:', error instanceof Error ? error.message : error)

    if (error instanceof Anthropic.APIError) {
      console.error('[ClaudeAPIError] Anthropic API error:', {
        status: error.status,
        message: error.message,
        name: error.name
      })

      if (error.status === 429) {
        return new ClaudeAPIError(
          'API rate limit exceeded. Please wait a moment and try again.',
          'RATE_LIMIT',
          429
        )
      }
      if (error.status === 400) {
        // Check actual error message to determine type
        const errorMessage = error.message || ''
        const errorMessageLower = errorMessage.toLowerCase()

        // Check for API usage limits error (comes as 400, not 429)
        if (errorMessageLower.includes('api usage limit') ||
            errorMessageLower.includes('usage limit') ||
            errorMessageLower.includes('you have reached your')) {
          return new ClaudeAPIError(
            'API usage limit reached. Please try again later or contact support.',
            'RATE_LIMIT',
            400
          )
        }

        const isImageError = errorMessageLower.includes('image') ||
                            errorMessageLower.includes('media')

        if (isImageError) {
          return new ClaudeAPIError(
            'Could not process the image. The image may be corrupted or in an unsupported format.',
            'INVALID_IMAGE',
            400
          )
        }

        // For other 400 errors, return a clean message without raw JSON
        return new ClaudeAPIError(
          'Invalid request. Please try again.',
          'API_ERROR',
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
      // Handle transient server errors with specific messages
      if (error.status === 529 || error.status === 503) {
        // API overloaded or service unavailable - these are retryable
        return new ClaudeAPIError(
          'AI service is temporarily busy. Please wait a moment and try again.',
          'RATE_LIMIT', // Use RATE_LIMIT code to make it retryable
          error.status
        )
      }
      if (error.status === 500 || error.status === 502) {
        // Internal server error or bad gateway - temporary issue
        return new ClaudeAPIError(
          'AI service encountered a temporary issue. Please try again.',
          'RATE_LIMIT', // Use RATE_LIMIT code to make it retryable
          error.status
        )
      }
      if (error.status === 408 || error.status === 504) {
        // Request timeout or gateway timeout
        return new ClaudeAPIError(
          'Request timed out. Please try again with a smaller file.',
          'TIMEOUT',
          error.status
        )
      }
      // Don't expose raw error messages to users - they may contain JSON/technical details
      return new ClaudeAPIError(
        'Something went wrong. Please try again.',
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
      // Don't expose raw error messages - they may contain technical details
      // Log it for debugging but return a user-friendly message
      console.error('[ClaudeAPIError] Unexpected error:', error.message)
      return new ClaudeAPIError('Something went wrong. Please try again.', 'API_ERROR')
    }

    return new ClaudeAPIError('An unknown error occurred', 'API_ERROR')
  }
}

// ============================================================================
// Image Utilities
// ============================================================================

// Timeout for image fetching (30 seconds - increased for Supabase signed URLs)
const IMAGE_FETCH_TIMEOUT_MS = 30000

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
    // Use streaming to prevent mobile connection timeouts
    console.log('[analyzeNotebookImage] Starting streaming request')

    const stream = client.messages.stream({
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

    // Collect response text from stream
    let rawText = ''
    let lastLogTime = Date.now()
    const LOG_INTERVAL_MS = 10000

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
      }

      const now = Date.now()
      if (now - lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[analyzeNotebookImage] Streaming: ${rawText.length} chars`)
        lastLogTime = now
      }
    }

    const finalMessage = await stream.finalMessage()
    if (finalMessage.stop_reason !== 'end_turn' && finalMessage.stop_reason !== 'stop_sequence') {
      console.warn(`[analyzeNotebookImage] Stream ended with stop_reason: ${finalMessage.stop_reason}`)
    }

    console.log(`[analyzeNotebookImage] Complete: ${rawText.length} chars`)

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError(
        'No text content in AI response',
        'PARSE_ERROR'
      )
    }

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
 * @param intensityMode - Lesson intensity mode (quick, standard, deep_practice)
 * @returns Generated course object and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function generateStudyCourse(
  extractedContent: ExtractedContent,
  userTitle?: string,
  imageUrls?: string[],
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
): Promise<CourseGenerationResult> {
  const client = getAnthropicClient()

  // Format extracted content for the prompt
  const formattedContent = formatExtractedContentForPrompt(extractedContent)
  const imageCount = imageUrls?.length || 0
  // SECURITY: Sanitize user input before passing to prompt
  const safeTitle = sanitizeUserInput(userTitle)
  const { systemPrompt, userPrompt } = getCourseGenerationPrompt(formattedContent, safeTitle, imageCount, userContext, undefined, intensityMode)

  try {
    // Use streaming to avoid timeout for large content
    // Streaming keeps the connection alive and collects response incrementally
    console.log('[generateStudyCourse] Starting streaming request for course generation')

    const stream = client.messages.stream({
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

    // Collect the full response text from the stream with activity logging
    let rawText = ''
    let lastActivity = Date.now()
    let lastLogTime = Date.now()
    const LOG_INTERVAL_MS = 15000 // Log every 15 seconds of activity

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
        lastActivity = Date.now()
      }

      // Log progress periodically during generation
      const now = Date.now()
      if (now - lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[generateStudyCourse] Streaming in progress: ${rawText.length} chars received`)
        lastLogTime = now
      }

      // Warn if no activity for 30 seconds
      if (now - lastActivity > 30000) {
        console.warn(`[generateStudyCourse] No activity for 30s at ${rawText.length} chars, still waiting...`)
        lastActivity = now // Reset to avoid spamming logs
      }
    }

    // Ensure the stream completed successfully
    const finalMessage = await stream.finalMessage()
    if (finalMessage.stop_reason !== 'end_turn' && finalMessage.stop_reason !== 'stop_sequence') {
      console.warn(`[generateStudyCourse] Stream ended with stop_reason: ${finalMessage.stop_reason}`)
    }

    console.log(`[generateStudyCourse] Streaming complete, received ${rawText.length} characters in ${Date.now() - lastLogTime}ms`)

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError(
        'No text content in AI response',
        'PARSE_ERROR'
      )
    }

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
    const hasLessons = course.lessons || (course as { sections?: unknown }).sections
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

    // Fetch web images in parallel (much faster than sequential)
    const subject = course.title.split(':')[0].trim()
    await fetchWebImagesParallel(webImageQueries, course, subject)

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
 * @param intensityMode - Lesson intensity mode (quick, standard, deep_practice)
 * @returns Both extracted content and generated course
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromImage(
  imageUrl: string,
  userTitle?: string,
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
): Promise<FullPipelineResult> {
  // Step 1: Extract content from image
  const { extractedContent, rawText: extractionRawText } = await analyzeNotebookImage(imageUrl)

  // Step 2: Generate course from extracted content
  const { course: generatedCourse, rawText: generationRawText } = await generateStudyCourse(
    extractedContent,
    userTitle,
    undefined,
    userContext,
    intensityMode
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
  // SECURITY: Sanitize user input before passing to prompt
  const safeTitle = sanitizeUserInput(userTitle)
  const { systemPrompt, userPrompt } = getCombinedAnalysisPrompt(safeTitle)

  try {
    // Use streaming to prevent mobile connection timeouts
    console.log('[generateCourseFromImageSingleCall] Starting streaming request')

    const stream = client.messages.stream({
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

    // Collect response text from stream
    let rawText = ''
    let lastLogTime = Date.now()
    const LOG_INTERVAL_MS = 15000

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
      }

      const now = Date.now()
      if (now - lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[generateCourseFromImageSingleCall] Streaming: ${rawText.length} chars`)
        lastLogTime = now
      }
    }

    const finalMessage = await stream.finalMessage()
    if (finalMessage.stop_reason !== 'end_turn' && finalMessage.stop_reason !== 'stop_sequence') {
      console.warn(`[generateCourseFromImageSingleCall] Stream ended with stop_reason: ${finalMessage.stop_reason}`)
    }

    console.log(`[generateCourseFromImageSingleCall] Complete: ${rawText.length} chars`)

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError(
        'No text content in AI response',
        'PARSE_ERROR'
      )
    }

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
    const hasLessons = course.lessons || (course as { sections?: unknown }).sections
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

    // Fetch web images in parallel (much faster than sequential)
    const subject = course.title.split(':')[0].trim()
    await fetchWebImagesParallel(webImageQueries, course, subject)

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
 * Uses Promise.allSettled for resilient image fetching - continues with successful images
 */
async function analyzeImageBatch(imageUrls: string[]): Promise<AnalysisResult> {
  const client = getAnthropicClient()

  // Fetch all images in parallel with resilient error handling
  const imageDataPromises = imageUrls.map((url) => fetchImageAsBase64(url))
  const settledResults = await Promise.allSettled(imageDataPromises)

  // Collect successful images and log failures
  const successfulImages: { data: ImageData; originalIndex: number }[] = []
  const failedIndices: number[] = []

  settledResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulImages.push({ data: result.value, originalIndex: index })
    } else {
      failedIndices.push(index)
      console.warn(`[analyzeImageBatch] Failed to fetch image ${index + 1}/${imageUrls.length}: ${result.reason?.message || 'Unknown error'}`)
    }
  })

  // If all images failed, throw error
  if (successfulImages.length === 0) {
    throw new ClaudeAPIError(
      'Failed to fetch any images. Please check your images and try again.',
      'INVALID_IMAGE'
    )
  }

  // Log if some images were skipped
  if (failedIndices.length > 0) {
    console.warn(`[analyzeImageBatch] Proceeding with ${successfulImages.length}/${imageUrls.length} images. Failed indices: ${failedIndices.join(', ')}`)
  }

  // Use multi-page prompts for multiple images (based on successful count)
  const { systemPrompt, userPrompt } = getMultiPageImageAnalysisPrompt(successfulImages.length)

  // Build message content with successful images only
  const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = []

  // Add each successful image with page indicators
  successfulImages.forEach((img, idx) => {
    // Add page label before each image (using sequential numbering for AI context)
    messageContent.push({
      type: 'text',
      text: `--- Page ${idx + 1} of ${successfulImages.length} ---`,
    })
    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.data.mediaType,
        data: img.data.base64,
      },
    })
  })

  // Add the analysis prompt at the end
  messageContent.push({
    type: 'text',
    text: userPrompt,
  })

  try {
    // Use streaming to prevent mobile connection timeouts
    console.log(`[analyzeImageBatch] Starting streaming request for ${imageUrls.length} images`)

    const stream = client.messages.stream({
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

    // Collect response text from stream
    let rawText = ''
    let lastLogTime = Date.now()
    const LOG_INTERVAL_MS = 10000

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
      }

      const now = Date.now()
      if (now - lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[analyzeImageBatch] Streaming: ${rawText.length} chars`)
        lastLogTime = now
      }
    }

    const finalMessage = await stream.finalMessage()
    if (finalMessage.stop_reason !== 'end_turn' && finalMessage.stop_reason !== 'stop_sequence') {
      console.warn(`[analyzeImageBatch] Stream ended with stop_reason: ${finalMessage.stop_reason}`)
    }

    console.log(`[analyzeImageBatch] Complete: ${rawText.length} chars`)

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

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
 * Processes batches in PARALLEL for faster performance
 */
async function analyzeImagesInBatches(imageUrls: string[]): Promise<AnalysisResult> {
  const batches: string[][] = []

  // Split into batches
  for (let i = 0; i < imageUrls.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(imageUrls.slice(i, i + MAX_IMAGES_PER_REQUEST))
  }

  console.log(`[analyzeImagesInBatches] Processing ${batches.length} batches in parallel`)

  // Process all batches in PARALLEL for faster performance
  // Using Promise.allSettled to handle partial failures gracefully
  const settledBatchResults = await Promise.allSettled(
    batches.map((batch, index) => {
      console.log(`[analyzeImagesInBatches] Starting batch ${index + 1}/${batches.length} with ${batch.length} images`)
      return analyzeImageBatch(batch)
    })
  )

  // Collect successful results and log failures
  const batchResults: AnalysisResult[] = []
  const failedBatches: number[] = []

  settledBatchResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      batchResults.push(result.value)
      console.log(`[analyzeImagesInBatches] Batch ${index + 1} completed successfully`)
    } else {
      failedBatches.push(index)
      console.error(`[analyzeImagesInBatches] Batch ${index + 1} failed: ${result.reason?.message || 'Unknown error'}`)
    }
  })

  // If all batches failed, throw error
  if (batchResults.length === 0) {
    throw new ClaudeAPIError(
      'Failed to analyze any image batches. Please try again.',
      'API_ERROR'
    )
  }

  // Log warning if some batches failed
  if (failedBatches.length > 0) {
    console.warn(`[analyzeImagesInBatches] ${failedBatches.length}/${batches.length} batches failed. Proceeding with ${batchResults.length} successful batches.`)
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
 * @param intensityMode - Lesson intensity mode (quick, standard, deep_practice)
 * @returns Both extracted content and generated course
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromMultipleImages(
  imageUrls: string[],
  userTitle?: string,
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
): Promise<FullPipelineResult> {
  // Step 1: Extract content from all images
  const { extractedContent, rawText: extractionRawText } =
    await analyzeMultipleNotebookImages(imageUrls)

  // Step 2: Generate course from combined extracted content
  const { course: generatedCourse, rawText: generationRawText } =
    await generateStudyCourse(extractedContent, userTitle, undefined, userContext, intensityMode)

  return {
    extractedContent,
    generatedCourse,
    extractionRawText,
    generationRawText,
  }
}

// ============================================================================
// Progressive Image Course Generation
// ============================================================================

/**
 * Result from progressive multi-image course generation
 * Returns quickly with 2 lessons, rest generated in background
 */
export interface InitialImageCourseResult {
  /** Extracted content from all images */
  extractedContent: ExtractedContent
  /** Partial course with only first 2 lessons */
  generatedCourse: GeneratedCourse
  /** Full outline of all planned lessons */
  lessonOutline: LessonOutline[]
  /** Summary for continuation calls */
  documentSummary: string
  /** Total number of planned lessons */
  totalLessons: number
  /** Raw extraction response text */
  extractionRawText: string
  /** Raw generation response text */
  generationRawText: string
}

/**
 * Converts ExtractedContent (from images) to ExtractedDocument format
 * for use with generateInitialCourse
 */
function extractedContentToDocument(
  extracted: ExtractedContent,
  imageCount: number
): ExtractedDocument {
  const formattedContent = formatExtractedContentForPrompt(extracted, true)

  return {
    type: 'pdf', // Generic type for images
    title: extracted.subject || 'Notebook Images',
    content: formattedContent,
    sections: [{
      title: extracted.subject || 'Extracted Content',
      content: formattedContent,
      pageNumber: 1
    }],
    metadata: {
      pageCount: extracted.pageCount || imageCount
    }
  }
}

/**
 * Progressive multi-image course generation.
 * Returns quickly with 2 lessons, rest generated in background.
 *
 * This mirrors the document flow:
 * 1. Analyze images → ExtractedContent
 * 2. Convert to ExtractedDocument format
 * 3. Generate initial course (2 lessons + outline)
 * 4. Return for immediate display, continue in background
 *
 * @param imageUrls - Array of image URLs to process
 * @param userTitle - Optional user-provided title
 * @param userContext - Optional user learning context
 * @param intensityMode - Lesson intensity mode
 * @returns Initial course result with extracted content, 2 lessons, outline, and summary
 */
export async function generateCourseFromMultipleImagesProgressive(
  imageUrls: string[],
  userTitle?: string,
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
): Promise<InitialImageCourseResult> {
  console.log(`[generateCourseFromMultipleImagesProgressive] Starting progressive generation for ${imageUrls.length} images`)

  // Step 1: Extract content from all images (parallel batch processing)
  const { extractedContent, rawText: extractionRawText } =
    await analyzeMultipleNotebookImages(imageUrls)

  console.log(`[generateCourseFromMultipleImagesProgressive] Image analysis complete, generating initial course`)

  // Step 2: Convert extracted content to document format for initial course generation
  const document = extractedContentToDocument(extractedContent, imageUrls.length)

  // Step 3: Generate initial course (fast - only 2 lessons + outline)
  const initialResult = await generateInitialCourse(
    document,
    userTitle,
    imageUrls,
    userContext,
    intensityMode
  )

  console.log(`[generateCourseFromMultipleImagesProgressive] Initial course generated: ${initialResult.generatedCourse.lessons.length} lessons ready, ${initialResult.totalLessons} total planned`)

  return {
    extractedContent,
    generatedCourse: initialResult.generatedCourse,
    lessonOutline: initialResult.lessonOutline,
    documentSummary: initialResult.documentSummary,
    totalLessons: initialResult.totalLessons,
    extractionRawText,
    generationRawText: initialResult.generationRawText,
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
 * @param intensityMode - Lesson intensity mode (quick, standard, deep_practice)
 * @returns Generated course and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromDocument(
  document: ExtractedDocument,
  userTitle?: string,
  imageUrls?: string[],
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
): Promise<DocumentCourseResult> {
  const client = getAnthropicClient()
  const imageCount = imageUrls?.length || 0
  // SECURITY: Sanitize user input before passing to prompt
  const safeTitle = sanitizeUserInput(userTitle)

  // Check if content is exam-based and use appropriate prompt
  const allContent = document.sections.map(s => s.content).join('\n')
  const isExam = isExamContent(allContent)

  // Use exam-specific prompt for exam content (derives lessons from actual exam questions)
  // Use regular document prompt for educational materials (lectures, notes, etc.)
  const { systemPrompt, userPrompt } = isExam
    ? getExamCoursePrompt(document, safeTitle, imageCount, userContext)
    : getDocumentCoursePrompt(document, safeTitle, imageCount, userContext, undefined, intensityMode)

  console.log(`[generateCourseFromDocument] Using ${isExam ? 'EXAM' : 'DOCUMENT'} prompt for content`)

  try {
    // Use streaming to prevent mobile connection timeouts
    console.log('[generateCourseFromDocument] Starting streaming request')

    const stream = client.messages.stream({
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

    // Collect the full response text from the stream with activity logging
    let rawText = ''
    let lastLogTime = Date.now()
    const LOG_INTERVAL_MS = 15000 // Log every 15 seconds

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
      }

      // Log progress periodically
      const now = Date.now()
      if (now - lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[generateCourseFromDocument] Streaming in progress: ${rawText.length} chars received`)
        lastLogTime = now
      }
    }

    // Verify stream completed successfully
    const finalMessage = await stream.finalMessage()
    if (finalMessage.stop_reason !== 'end_turn' && finalMessage.stop_reason !== 'stop_sequence') {
      console.warn(`[generateCourseFromDocument] Stream ended with stop_reason: ${finalMessage.stop_reason}`)
    }

    console.log(`[generateCourseFromDocument] Streaming complete, received ${rawText.length} characters`)

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

    // Log raw response length for debugging
    console.log(`[generateCourseFromDocument] Raw response length: ${rawText.length} characters`)
    console.log(`[generateCourseFromDocument] First 500 chars: ${rawText.substring(0, 500)}`)

    // Parse JSON response with improved extraction
    const jsonText = extractJsonFromResponse(rawText)
    let course: GeneratedCourse

    try {
      course = JSON.parse(jsonText)
    } catch (parseError) {
      // Log the actual error and response for debugging
      console.error(`[generateCourseFromDocument] JSON parse error:`, parseError)
      console.error(`[generateCourseFromDocument] Cleaned text (first 1000 chars): ${jsonText.substring(0, 1000)}`)
      console.error(`[generateCourseFromDocument] Cleaned text (last 500 chars): ${jsonText.substring(Math.max(0, jsonText.length - 500))}`)

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

    // Fetch web images in parallel (much faster than sequential)
    const subject = course.title.split(':')[0].trim()
    await fetchWebImagesParallel(webImageQueries, course, subject)

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
 * @param intensityMode - Lesson intensity mode (quick, standard, deep_practice)
 * @returns Generated course and raw response text
 * @throws ClaudeAPIError on failure
 */
export async function generateCourseFromText(
  textContent: string,
  userTitle?: string,
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
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
  // SECURITY: Sanitize user input before passing to prompt
  const safeTitle = sanitizeUserInput(userTitle)

  // Check if content is exam-based and use appropriate prompt
  const isExam = isExamContent(textContent)

  // Use exam-specific prompt for exam content (derives lessons from actual exam questions)
  // Use regular text prompt for general content (topics, notes, etc.)
  const { systemPrompt, userPrompt } = isExam
    ? getExamCoursePrompt(textContent, safeTitle, undefined, userContext)
    : getTextCoursePrompt(textContent, safeTitle, userContext, undefined, intensityMode)

  console.log(`[generateCourseFromText] Using ${isExam ? 'EXAM' : 'TEXT'} prompt for content (intensity: ${intensityMode || 'standard'})`)

  try {
    // Use streaming to prevent mobile connection timeouts
    console.log('[generateCourseFromText] Starting streaming request')

    const stream = client.messages.stream({
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

    // Collect the full response text from the stream
    let rawText = ''
    let lastLogTime = Date.now()
    const LOG_INTERVAL_MS = 15000

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
      }

      const now = Date.now()
      if (now - lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[generateCourseFromText] Streaming in progress: ${rawText.length} chars received`)
        lastLogTime = now
      }
    }

    // Verify stream completed successfully
    const finalMessage = await stream.finalMessage()
    if (finalMessage.stop_reason !== 'end_turn' && finalMessage.stop_reason !== 'stop_sequence') {
      console.warn(`[generateCourseFromText] Stream ended with stop_reason: ${finalMessage.stop_reason}`)
    }

    console.log(`[generateCourseFromText] Streaming complete, received ${rawText.length} characters`)

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

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

    // Fetch web images in parallel (much faster than sequential)
    const subject = course.title.split(':')[0].trim()
    await fetchWebImagesParallel(webImageQueries, course, subject)

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
type RawLesson = { title?: string; steps?: RawStep[] }
type RawStep = { type?: string; title?: string; question?: string; content?: string; imageIndex?: number; imageUrl?: string; imageAlt?: string; webImageQuery?: string; options?: string[]; correctIndex?: number; correct_answer?: number | string; isTrue?: boolean; explanation?: string }

function normalizeGeneratedCourse(
  course: GeneratedCourse & { sections?: RawLesson[] },
  imageUrls?: string[]
): { normalizedCourse: GeneratedCourse; webImageQueries: { lessonIndex: number; stepIndex: number; query: string; alt: string }[] } {
  // Handle AI response that uses "sections" instead of "lessons"
  const lessonsData = course.lessons || course.sections || []
  const webImageQueries: { lessonIndex: number; stepIndex: number; query: string; alt: string }[] = []

  const normalizedCourse: GeneratedCourse = {
    title: course.title,
    overview: course.overview,
    lessons: lessonsData.map((lesson: RawLesson, lessonIndex: number) => ({
      title: lesson.title || 'Untitled Lesson',
      steps: (lesson.steps || []).map((step: RawStep, stepIndex: number) => {
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

        // Convert correct_answer to number if it's a string
        const rawAnswer = step.correctIndex ?? step.correct_answer
        const correctAnswer = typeof rawAnswer === 'string' ? parseInt(rawAnswer, 10) : rawAnswer

        return {
          type: (step.type || 'explanation') as StepType,
          content,
          title: step.title,
          options: step.options,
          correct_answer: correctAnswer,
          explanation: step.explanation,
          imageUrl,
          imageAlt,
          imageSource,
        }
      }),
    })),
  }

  // Apply post-generation content validation to filter forbidden exam logistics
  const filteredCourse = filterForbiddenContent(normalizedCourse)

  return { normalizedCourse: filteredCourse, webImageQueries }
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
        // Be specific about retry for Safari users who may see this more often
        return 'AI service is temporarily busy. Please wait a moment and try again.'
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
        return 'The request took too long. Please try again with a smaller file or fewer images.'
      case 'API_ERROR':
      default:
        // Provide actionable message instead of generic error
        return 'The AI service encountered an issue. Please try again. If the problem persists, try with a smaller image or fewer pages.'
    }
  }
  return 'An unexpected error occurred. Please try again.'
}

// ============================================================================
// Progressive Course Generation
// Fast initial (2 lessons) + background continuation
// ============================================================================

/**
 * Result from initial fast course generation
 */
export interface InitialCourseResult {
  /** Partial course with only first 2 lessons */
  generatedCourse: GeneratedCourse
  /** Full outline of all planned lessons */
  lessonOutline: LessonOutline[]
  /** Document summary for continuation calls */
  documentSummary: string
  /** Total number of planned lessons */
  totalLessons: number
  /** Raw AI response text */
  generationRawText: string
}

/**
 * Result from continuation lesson generation
 */
export interface ContinuationResult {
  /** Newly generated lessons */
  newLessons: Lesson[]
  /** Raw AI response text */
  generationRawText: string
}

/**
 * Generates initial course structure with first 2 lessons only.
 * Returns outline + summary for background continuation.
 * This is the FAST path - returns in ~30 seconds instead of 2-5 minutes.
 *
 * @param document - ExtractedDocument from PDF, PPTX, or DOCX
 * @param userTitle - Optional user-provided title
 * @param imageUrls - Optional array of image URLs extracted from document
 * @param userContext - Optional user learning context
 * @param intensityMode - Lesson intensity mode (quick, standard, deep_practice)
 * @returns Partial course (2 lessons), full outline, and document summary
 */
export async function generateInitialCourse(
  document: ExtractedDocument,
  userTitle?: string,
  imageUrls?: string[],
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
): Promise<InitialCourseResult> {
  const client = getAnthropicClient()
  const imageCount = imageUrls?.length || 0
  const safeTitle = sanitizeUserInput(userTitle)

  const { systemPrompt, userPrompt } = getInitialCoursePrompt(
    document,
    safeTitle,
    imageCount,
    userContext,
    intensityMode
  )

  console.log(`[generateInitialCourse] Starting fast initial generation (streaming with retry)`)

  try {
    // Use streaming with retry to handle transient Safari/network issues
    const { rawText, stopReason } = await withStreamRetry(
      () => client.messages.stream({
        model: AI_MODEL,
        max_tokens: 16384, // Enough for 2 lessons + full outline + summary
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      async (stream) => {
        // Collect the full response text from the stream
        let rawText = ''
        let lastLogTime = Date.now()
        const LOG_INTERVAL_MS = 15000

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            rawText += event.delta.text
          }

          const now = Date.now()
          if (now - lastLogTime > LOG_INTERVAL_MS) {
            console.log(`[generateInitialCourse] Streaming in progress: ${rawText.length} chars received`)
            lastLogTime = now
          }
        }

        const finalMessage = await stream.finalMessage()
        const stopReason = finalMessage.stop_reason

        console.log(`[generateInitialCourse] Streaming complete: ${rawText.length} chars, stop_reason: ${stopReason}`)
        return { rawText, stopReason }
      },
      'generateInitialCourse'
    )

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

    // Check if response was truncated
    if (stopReason === 'max_tokens') {
      console.warn(`[generateInitialCourse] Response was truncated due to max_tokens`)
    }

    let jsonText = extractJsonFromResponse(rawText)

    // Try to repair truncated JSON by closing open brackets
    if (stopReason === 'max_tokens' || !jsonText.trim().endsWith('}')) {
      console.log(`[generateInitialCourse] Attempting JSON repair...`)
      jsonText = repairTruncatedJson(jsonText)
    }
    let parsed: {
      title: string
      overview: string
      learningObjectives?: string[]
      documentSummary: string
      lessonOutline: LessonOutline[]
      lessons: RawLesson[]
    }

    try {
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      console.error(`[generateInitialCourse] JSON parse error:`, parseError)
      throw new ClaudeAPIError(
        'Failed to parse initial course as JSON',
        'PARSE_ERROR'
      )
    }

    // Validate required fields
    if (!parsed.title || !parsed.overview || !parsed.lessons || !parsed.lessonOutline || !parsed.documentSummary) {
      throw new ClaudeAPIError(
        'Initial course response missing required fields (title, overview, lessons, lessonOutline, documentSummary)',
        'PARSE_ERROR'
      )
    }

    // Build partial GeneratedCourse with only first 2 lessons
    const partialCourse: GeneratedCourse = {
      title: safeTitle || parsed.title,
      overview: parsed.overview,
      lessons: parsed.lessons.map((lesson: RawLesson) => ({
        title: lesson.title || 'Untitled Lesson',
        steps: (lesson.steps || []).map((step: RawStep) => {
          const rawAnswer = step.correctIndex ?? step.correct_answer
          return {
            type: (step.type || 'explanation') as StepType,
            content: step.type === 'question' ? (step.question || step.content || '') : (step.content || ''),
            title: step.title,
            options: step.options,
            correct_answer: typeof rawAnswer === 'string' ? parseInt(rawAnswer, 10) : rawAnswer,
            explanation: step.explanation,
          }
        }),
      })),
      learningObjectives: parsed.learningObjectives as LearningObjective[] | undefined,
    }

    // Apply content filter
    const filteredCourse = filterForbiddenContent(partialCourse)

    console.log(`[generateInitialCourse] Generated ${filteredCourse.lessons.length} lessons, outline has ${parsed.lessonOutline.length} total`)

    return {
      generatedCourse: filteredCourse,
      lessonOutline: parsed.lessonOutline,
      documentSummary: parsed.documentSummary,
      totalLessons: parsed.lessonOutline.length,
      generationRawText: rawText,
    }
  } catch (error) {
    if (error instanceof ClaudeAPIError) {
      throw error
    }
    throw ClaudeAPIError.fromAnthropicError(error)
  }
}

/**
 * Generates continuation lessons using document summary and outline.
 * Called in background to generate remaining lessons after initial fast response.
 *
 * @param documentSummary - Summary of document content (from initial generation)
 * @param lessonOutline - Full lesson outline (from initial generation)
 * @param previousLessons - Already generated lessons (for style consistency)
 * @param targetLessonIndices - Which lessons to generate (0-indexed)
 * @param userContext - Optional user learning context
 * @returns Newly generated lessons
 */
export async function generateContinuationLessons(
  documentSummary: string,
  lessonOutline: LessonOutline[],
  previousLessons: Lesson[],
  targetLessonIndices: number[],
  userContext?: UserLearningContext
): Promise<ContinuationResult> {
  const client = getAnthropicClient()

  const { systemPrompt, userPrompt } = getContinuationPrompt(
    documentSummary,
    lessonOutline,
    previousLessons,
    targetLessonIndices,
    userContext
  )

  console.log(`[generateContinuationLessons] Generating lessons ${targetLessonIndices.map(i => i + 1).join(', ')} (streaming)`)

  try {
    // Use streaming to prevent mobile connection timeouts
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 8192, // 2 lessons at a time
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Collect the full response text from the stream
    let rawText = ''
    let lastLogTime = Date.now()
    const LOG_INTERVAL_MS = 15000

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
      }

      const now = Date.now()
      if (now - lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[generateContinuationLessons] Streaming in progress: ${rawText.length} chars received`)
        lastLogTime = now
      }
    }

    const finalMessage = await stream.finalMessage()
    if (finalMessage.stop_reason !== 'end_turn' && finalMessage.stop_reason !== 'stop_sequence') {
      console.warn(`[generateContinuationLessons] Stream ended with stop_reason: ${finalMessage.stop_reason}`)
    }

    console.log(`[generateContinuationLessons] Streaming complete: ${rawText.length} chars`)

    if (!rawText || rawText.trim().length === 0) {
      throw new ClaudeAPIError('No text content in AI response', 'PARSE_ERROR')
    }

    const jsonText = extractJsonFromResponse(rawText)
    let parsed: { lessons: RawLesson[] }

    try {
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      console.error(`[generateContinuationLessons] JSON parse error:`, parseError)
      throw new ClaudeAPIError(
        'Failed to parse continuation lessons as JSON',
        'PARSE_ERROR'
      )
    }

    if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
      throw new ClaudeAPIError(
        'Continuation response missing lessons array',
        'PARSE_ERROR'
      )
    }

    // Normalize the lessons
    const newLessons: Lesson[] = parsed.lessons.map((lesson: RawLesson) => ({
      title: lesson.title || 'Untitled Lesson',
      steps: (lesson.steps || []).map((step: RawStep) => {
        const rawAnswer = step.correctIndex ?? step.correct_answer
        return {
          type: (step.type || 'explanation') as StepType,
          content: step.type === 'question' ? (step.question || step.content || '') : (step.content || ''),
          title: step.title,
          options: step.options,
          correct_answer: typeof rawAnswer === 'string' ? parseInt(rawAnswer, 10) : rawAnswer,
          explanation: step.explanation,
        }
      }),
    }))

    console.log(`[generateContinuationLessons] Generated ${newLessons.length} new lessons`)

    return {
      newLessons,
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
// Exports
// ============================================================================

export type { ExtractedContent, ExtractedDocument }
export { AI_MODEL }
