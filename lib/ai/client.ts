import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '@/lib/logger'
import { aiLogger, type AIAction } from './ai-logger'

const log = createLogger('ai:client')

// ============================================================================
// Model Configuration
// ============================================================================

export const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
export const AI_MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-sonnet-4-6'

export const MAX_TOKENS_EXTRACTION = 4096
export const MAX_TOKENS_GENERATION = 16384 // Increased for large documents (31 slides needs more tokens)
export const MAX_IMAGES_PER_REQUEST = 5    // Claude's recommended limit for optimal performance
export const API_TIMEOUT_MS = 180000       // 3 minute timeout - matches client timeout for Safari compatibility

export function getAIModel(): string {
  return AI_MODEL
}

export function getAIModelFast(): string {
  return AI_MODEL_FAST
}

// ============================================================================
// LLM Usage Logging
// ============================================================================

// Sonnet 4.6 pricing ($/1M tokens) — update if model changes (keep in sync with ai-logger.ts)
const LLM_PRICE = { input: 3.00, output: 15.00, cache_read: 0.30, cache_write: 3.75 }

const FN_TO_ACTION: Readonly<Record<string, AIAction>> = {
  analyzeNotebookImage:              'course-generation',
  generateStudyCourse:               'course-generation',
  generateCourseFromImageSingleCall: 'course-generation',
  analyzeImageBatch:                 'course-generation',
  generateCourseFromDocument:        'course-generation',
  generateCourseFromText:            'course-generation',
  generateInitialCourse:             'course-generation',
  generateContinuationLessons:       'lesson-expansion',
} as const

export function logLLMUsage(
  fn: string,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null },
  durationMs?: number,
  ctx: { user_id?: string; route?: string } = {}
) {
  const cacheRead  = usage.cache_read_input_tokens  ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const billable   = usage.input_tokens - cacheRead

  const cost = +(
    (billable              / 1_000_000) * LLM_PRICE.input +
    (usage.output_tokens   / 1_000_000) * LLM_PRICE.output +
    (cacheRead             / 1_000_000) * LLM_PRICE.cache_read +
    (cacheWrite            / 1_000_000) * LLM_PRICE.cache_write
  ).toFixed(6)

  log.info({
    event:                       '💰 llm_usage',
    fn,
    model:                       AI_MODEL,
    input_tokens:                usage.input_tokens,
    output_tokens:               usage.output_tokens,
    cache_read_input_tokens:     cacheRead,
    cache_creation_input_tokens: cacheWrite,
    total_tokens:                usage.input_tokens + usage.output_tokens,
    estimated_cost_usd:          cost,
    duration_ms:                 durationMs,
    ...ctx,
  }, `📊 LLM usage — ${fn}: ${usage.input_tokens} in / ${usage.output_tokens} out (~$${cost})`)

  const action = FN_TO_ACTION[fn] ?? 'course-generation'
  aiLogger.llmUsage(action, usage, { model: AI_MODEL, fn, durationMs, ...ctx })
}

// ============================================================================
// Anthropic Client Singleton
// ============================================================================

let anthropicClient: Anthropic | null = null

/**
 * Get the shared Anthropic client singleton (180s default timeout).
 * For longer operations, pass { timeout } in individual API call options.
 */
export function getAnthropicClient(): Anthropic {
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
// Error Types
// ============================================================================

export type ClaudeErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_IMAGE'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'CONFIG_ERROR'
  | 'EMPTY_CONTENT'
  | 'TIMEOUT'

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
    log.error({ err: error instanceof Error ? error : undefined, rawError: !(error instanceof Error) ? error : undefined }, 'Raw error')

    if (error instanceof Anthropic.APIError) {
      log.error({ status: error.status, message: error.message, name: error.name }, 'Anthropic API error')

      if (error.status === 429) {
        return new ClaudeAPIError(
          'API rate limit exceeded. Please wait a moment and try again.',
          'RATE_LIMIT',
          429
        )
      }
      if (error.status === 400) {
        const errorMessage = error.message || ''
        const errorMessageLower = errorMessage.toLowerCase()

        if (errorMessageLower.includes('api usage limit') ||
            errorMessageLower.includes('usage limit') ||
            errorMessageLower.includes('you have reached your')) {
          return new ClaudeAPIError(
            '[CLAUDE] Out of credits. The Claude AI budget has run out. The app cannot function until credits are added at console.anthropic.com/settings/billing.',
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
      if (error.status === 529 || error.status === 503) {
        return new ClaudeAPIError(
          'AI service is temporarily busy. Please wait a moment and try again.',
          'RATE_LIMIT',
          error.status
        )
      }
      if (error.status === 500 || error.status === 502) {
        return new ClaudeAPIError(
          'AI service encountered a temporary issue. Please try again.',
          'RATE_LIMIT',
          error.status
        )
      }
      if (error.status === 408 || error.status === 504) {
        return new ClaudeAPIError(
          'Request timed out. Please try again with a smaller file.',
          'TIMEOUT',
          error.status
        )
      }
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
      log.error({ err: error }, 'Unexpected error')
      return new ClaudeAPIError('Something went wrong. Please try again.', 'API_ERROR')
    }

    return new ClaudeAPIError('An unknown error occurred', 'API_ERROR')
  }
}
