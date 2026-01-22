/**
 * Claude API Error Mapper
 *
 * Maps Claude/Anthropic API errors to NoteSnap error codes
 */

import { type ErrorCode, ErrorCodes } from '../codes'
import { getErrorMessage } from '../messages'

// ============================================================================
// Types
// ============================================================================

export interface MappedError {
  code: ErrorCode
  message: string
}

export interface ClaudeAPIError {
  status?: number
  error?: {
    type?: string
    message?: string
  }
  message?: string
  type?: string
}

// ============================================================================
// Claude API Error Mapping
// ============================================================================

/**
 * Maps Claude API errors to NoteSnap error codes
 */
export function mapClaudeAPIError(error: unknown): MappedError {
  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const errorName = error.name.toLowerCase()

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out') || errorName.includes('timeout')) {
      return {
        code: ErrorCodes.API_TIMEOUT,
        message: getErrorMessage(ErrorCodes.API_TIMEOUT),
      }
    }

    // Abort errors
    if (message.includes('abort') || errorName === 'aborterror') {
      return {
        code: ErrorCodes.API_TIMEOUT,
        message: getErrorMessage(ErrorCodes.API_TIMEOUT),
      }
    }

    // Rate limit / usage limit errors
    if (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    ) {
      return {
        code: ErrorCodes.API_RATE_LIMITED,
        message: getErrorMessage(ErrorCodes.API_RATE_LIMITED),
      }
    }

    // Usage limit errors (different from rate limit - these are billing related)
    if (
      message.includes('usage limit') ||
      message.includes('api usage limit') ||
      message.includes('you have reached your') ||
      message.includes('credit balance')
    ) {
      return {
        code: ErrorCodes.USAGE_LIMIT_EXCEEDED,
        message: getErrorMessage(ErrorCodes.USAGE_LIMIT_EXCEEDED),
      }
    }

    // Overloaded / capacity errors
    if (
      message.includes('overloaded') ||
      message.includes('capacity') ||
      message.includes('529') ||
      message.includes('server is overloaded')
    ) {
      return {
        code: ErrorCodes.API_OVERLOADED,
        message: getErrorMessage(ErrorCodes.API_OVERLOADED),
      }
    }

    // Service unavailable
    if (
      message.includes('unavailable') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('500')
    ) {
      return {
        code: ErrorCodes.API_UNAVAILABLE,
        message: getErrorMessage(ErrorCodes.API_UNAVAILABLE),
      }
    }

    // Authentication errors
    if (
      message.includes('authentication') ||
      message.includes('api key') ||
      message.includes('invalid key') ||
      message.includes('401')
    ) {
      return {
        code: ErrorCodes.API_KEY_INVALID,
        message: getErrorMessage(ErrorCodes.API_KEY_INVALID),
      }
    }

    // Invalid image errors
    if (
      message.includes('invalid') && message.includes('image') ||
      message.includes('could not process image')
    ) {
      return {
        code: ErrorCodes.IMAGE_UNREADABLE,
        message: getErrorMessage(ErrorCodes.IMAGE_UNREADABLE),
      }
    }

    // Content filter errors
    if (
      message.includes('content filter') ||
      message.includes('unsafe content') ||
      message.includes('content policy')
    ) {
      return {
        code: ErrorCodes.CONTENT_FILTERED,
        message: getErrorMessage(ErrorCodes.CONTENT_FILTERED),
      }
    }

    // Network/fetch errors
    if (
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    ) {
      return {
        code: ErrorCodes.API_UNAVAILABLE,
        message: getErrorMessage(ErrorCodes.API_UNAVAILABLE),
      }
    }
  }

  // Handle API response errors
  const apiError = error as ClaudeAPIError

  // Check HTTP status codes
  if (apiError.status) {
    switch (apiError.status) {
      case 400:
        // Bad request - could be various issues
        return {
          code: ErrorCodes.RESPONSE_INVALID_FORMAT,
          message: getErrorMessage(ErrorCodes.RESPONSE_INVALID_FORMAT),
        }
      case 401:
        return {
          code: ErrorCodes.API_KEY_INVALID,
          message: getErrorMessage(ErrorCodes.API_KEY_INVALID),
        }
      case 403:
        return {
          code: ErrorCodes.CONTENT_FILTERED,
          message: getErrorMessage(ErrorCodes.CONTENT_FILTERED),
        }
      case 429:
        return {
          code: ErrorCodes.API_RATE_LIMITED,
          message: getErrorMessage(ErrorCodes.API_RATE_LIMITED),
        }
      case 500:
        return {
          code: ErrorCodes.API_UNAVAILABLE,
          message: getErrorMessage(ErrorCodes.API_UNAVAILABLE),
        }
      case 502:
      case 503:
        return {
          code: ErrorCodes.API_UNAVAILABLE,
          message: getErrorMessage(ErrorCodes.API_UNAVAILABLE),
        }
      case 504:
        return {
          code: ErrorCodes.API_TIMEOUT,
          message: getErrorMessage(ErrorCodes.API_TIMEOUT),
        }
      case 529:
        return {
          code: ErrorCodes.API_OVERLOADED,
          message: getErrorMessage(ErrorCodes.API_OVERLOADED),
        }
    }
  }

  // Check error type field
  const errorType = apiError.error?.type || apiError.type || ''
  switch (errorType) {
    case 'authentication_error':
      return {
        code: ErrorCodes.API_KEY_INVALID,
        message: getErrorMessage(ErrorCodes.API_KEY_INVALID),
      }
    case 'rate_limit_error':
      return {
        code: ErrorCodes.API_RATE_LIMITED,
        message: getErrorMessage(ErrorCodes.API_RATE_LIMITED),
      }
    case 'overloaded_error':
      return {
        code: ErrorCodes.API_OVERLOADED,
        message: getErrorMessage(ErrorCodes.API_OVERLOADED),
      }
    case 'invalid_request_error':
      return {
        code: ErrorCodes.RESPONSE_INVALID_FORMAT,
        message: getErrorMessage(ErrorCodes.RESPONSE_INVALID_FORMAT),
      }
    case 'api_error':
    case 'server_error':
      return {
        code: ErrorCodes.API_UNAVAILABLE,
        message: getErrorMessage(ErrorCodes.API_UNAVAILABLE),
      }
  }

  // Default to unknown AI error
  return {
    code: ErrorCodes.AI_UNKNOWN,
    message: getErrorMessage(ErrorCodes.AI_UNKNOWN),
  }
}

// ============================================================================
// Streaming Error Mapping
// ============================================================================

/**
 * Maps streaming-specific errors to error codes
 */
export function mapStreamingError(error: unknown): MappedError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Connection lost
    if (
      message.includes('connection') ||
      message.includes('closed') ||
      message.includes('disconnected')
    ) {
      return {
        code: ErrorCodes.STREAM_CONNECTION_LOST,
        message: getErrorMessage(ErrorCodes.STREAM_CONNECTION_LOST),
      }
    }

    // Parse errors in stream
    if (
      message.includes('parse') ||
      message.includes('json') ||
      message.includes('unexpected')
    ) {
      return {
        code: ErrorCodes.STREAM_PARSE_ERROR,
        message: getErrorMessage(ErrorCodes.STREAM_PARSE_ERROR),
      }
    }

    // Timeout
    if (message.includes('timeout')) {
      return {
        code: ErrorCodes.STREAM_TIMEOUT,
        message: getErrorMessage(ErrorCodes.STREAM_TIMEOUT),
      }
    }
  }

  // Fall back to general Claude error mapping
  return mapClaudeAPIError(error)
}

// ============================================================================
// Response Parsing Error Mapping
// ============================================================================

/**
 * Maps response parsing errors to error codes
 */
export function mapResponseParseError(error: unknown, _context?: string): MappedError {
  if (error instanceof SyntaxError) {
    return {
      code: ErrorCodes.RESPONSE_PARSE_FAILED,
      message: getErrorMessage(ErrorCodes.RESPONSE_PARSE_FAILED),
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Missing required fields
    if (message.includes('undefined') || message.includes('null') || message.includes('missing')) {
      return {
        code: ErrorCodes.RESPONSE_MISSING_FIELDS,
        message: getErrorMessage(ErrorCodes.RESPONSE_MISSING_FIELDS),
      }
    }

    // Type errors (wrong structure)
    if (message.includes('type') || message.includes('expected')) {
      return {
        code: ErrorCodes.RESPONSE_INVALID_FORMAT,
        message: getErrorMessage(ErrorCodes.RESPONSE_INVALID_FORMAT),
      }
    }
  }

  return {
    code: ErrorCodes.RESPONSE_PARSE_FAILED,
    message: getErrorMessage(ErrorCodes.RESPONSE_PARSE_FAILED),
  }
}

// ============================================================================
// Vision/Image Error Mapping
// ============================================================================

/**
 * Maps image-related AI errors to error codes
 */
export function mapVisionError(error: unknown): MappedError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Image unreadable
    if (
      message.includes('unreadable') ||
      message.includes('cannot read') ||
      message.includes('illegible') ||
      message.includes('blurry') ||
      message.includes('unclear')
    ) {
      return {
        code: ErrorCodes.IMAGE_UNREADABLE,
        message: getErrorMessage(ErrorCodes.IMAGE_UNREADABLE),
      }
    }

    // No content found
    if (
      message.includes('no content') ||
      message.includes('empty') ||
      message.includes('blank') ||
      message.includes('nothing')
    ) {
      return {
        code: ErrorCodes.IMAGE_NO_CONTENT,
        message: getErrorMessage(ErrorCodes.IMAGE_NO_CONTENT),
      }
    }

    // Image too small
    if (message.includes('too small') || message.includes('resolution')) {
      return {
        code: ErrorCodes.IMAGE_TOO_SMALL,
        message: getErrorMessage(ErrorCodes.IMAGE_TOO_SMALL),
      }
    }

    // Image too large (for API)
    if (message.includes('too large') || message.includes('size limit')) {
      return {
        code: ErrorCodes.IMAGE_TOO_LARGE,
        message: getErrorMessage(ErrorCodes.IMAGE_TOO_LARGE),
      }
    }

    // Unsupported format
    if (message.includes('unsupported') || message.includes('format')) {
      return {
        code: ErrorCodes.IMAGE_UNSUPPORTED,
        message: getErrorMessage(ErrorCodes.IMAGE_UNSUPPORTED),
      }
    }
  }

  // Fall back to general unreadable
  return {
    code: ErrorCodes.IMAGE_UNREADABLE,
    message: getErrorMessage(ErrorCodes.IMAGE_UNREADABLE),
  }
}
