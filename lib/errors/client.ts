/**
 * Client-Side Error Utilities
 *
 * Error handling utilities for client-side code (React components, hooks, etc.)
 */

import { type ErrorCode, ErrorCodes } from './codes'
import { getErrorMessage, getErrorMessageWithCode } from './messages'

// ============================================================================
// Types
// ============================================================================

export interface ParsedAPIError {
  code: ErrorCode
  message: string
  retryable: boolean
}

export interface ClientErrorOptions {
  showCode?: boolean // Whether to show the error code to the user
  fallbackMessage?: string
}

// ============================================================================
// API Error Parsing
// ============================================================================

/**
 * Parses an API error response to extract the error code and message
 */
export function parseAPIError(response: unknown): ParsedAPIError | null {
  if (!response || typeof response !== 'object') {
    return null
  }

  const errorResponse = response as {
    success?: boolean
    error?: {
      code?: string
      message?: string
      retryable?: boolean
    } | string
  }

  if (errorResponse.success === false && errorResponse.error) {
    // New format: { success: false, error: { code, message, retryable } }
    if (typeof errorResponse.error === 'object') {
      const { code, message, retryable } = errorResponse.error
      if (code && isValidErrorCode(code)) {
        return {
          code: code as ErrorCode,
          message: message || getErrorMessage(code as ErrorCode),
          retryable: retryable ?? false,
        }
      }
    }

    // Old format: { success: false, error: "message" }
    if (typeof errorResponse.error === 'string') {
      return {
        code: ErrorCodes.CLIENT_UNKNOWN,
        message: errorResponse.error,
        retryable: false,
      }
    }
  }

  return null
}

/**
 * Checks if a string is a valid error code
 */
function isValidErrorCode(code: string): boolean {
  return /^NS-[A-Z]+-\d{3}$/.test(code)
}

// ============================================================================
// Client Error Mapping
// ============================================================================

/**
 * Maps client-side errors (fetch failures, timeouts, etc.) to error codes
 * Includes comprehensive Safari/iOS error handling
 */
export function mapClientError(error: unknown): ParsedAPIError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // =========================================================================
    // Network errors (including Safari/iOS specific patterns)
    // =========================================================================
    if (
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      message.includes('networkerror') ||
      message.includes('load failed') || // Safari network error
      message.includes('network request failed') ||
      message.includes('the network connection was lost') || // Safari connection lost
      message.includes('a server with the specified hostname could not be found') || // Safari DNS error
      message.includes('could not connect to the server') || // Safari connection error
      message.includes('the operation couldn\'t be completed') // Safari generic network error
    ) {
      return {
        code: ErrorCodes.NETWORK_REQUEST_FAILED,
        message: getErrorMessage(ErrorCodes.NETWORK_REQUEST_FAILED),
        retryable: true,
      }
    }

    // =========================================================================
    // Timeout errors
    // =========================================================================
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('the request timed out') || // Safari timeout
      name.includes('timeout')
    ) {
      return {
        code: ErrorCodes.NETWORK_TIMEOUT,
        message: getErrorMessage(ErrorCodes.NETWORK_TIMEOUT),
        retryable: true,
      }
    }

    // =========================================================================
    // Abort/Cancel errors (Safari uses "cancelled" spelling)
    // =========================================================================
    if (
      name === 'aborterror' ||
      message.includes('aborted') ||
      message.includes('cancelled') || // Safari uses British spelling
      message.includes('canceled') ||
      message.includes('the user aborted a request') // Safari abort
    ) {
      return {
        code: ErrorCodes.NETWORK_TIMEOUT,
        message: getErrorMessage(ErrorCodes.NETWORK_TIMEOUT),
        retryable: true,
      }
    }

    // =========================================================================
    // Offline errors (including Safari/iOS specific)
    // =========================================================================
    if (
      message.includes('offline') ||
      message.includes('no internet') ||
      message.includes('the internet connection appears to be offline') || // Safari offline
      message.includes('not connected to the internet') || // iOS offline
      message.includes('network is offline')
    ) {
      return {
        code: ErrorCodes.NETWORK_OFFLINE,
        message: getErrorMessage(ErrorCodes.NETWORK_OFFLINE),
        retryable: true,
      }
    }

    // =========================================================================
    // CORS errors
    // =========================================================================
    if (
      message.includes('cors') ||
      message.includes('cross-origin') ||
      message.includes('origin is not allowed') ||
      message.includes('blocked by cors policy')
    ) {
      return {
        code: ErrorCodes.CORS_BLOCKED,
        message: getErrorMessage(ErrorCodes.CORS_BLOCKED),
        retryable: false,
      }
    }

    // =========================================================================
    // JSON parse errors (including Safari specific)
    // =========================================================================
    if (
      message.includes('json') ||
      message.includes('unexpected token') ||
      message.includes('unexpected end') ||
      message.includes('did not match the expected pattern') || // Safari JSON parse error
      message.includes('json parse error') ||
      message.includes('invalid json') ||
      (name === 'syntaxerror' && (message.includes('token') || message.includes('json')))
    ) {
      return {
        code: ErrorCodes.JSON_PARSE_ERROR,
        message: getErrorMessage(ErrorCodes.JSON_PARSE_ERROR),
        retryable: true,
      }
    }

    // =========================================================================
    // SSL/TLS/Security errors
    // =========================================================================
    if (
      message.includes('ssl') ||
      message.includes('certificate') ||
      message.includes('tls') ||
      message.includes('secure connection') ||
      message.includes('cannot verify server identity') // iOS SSL error
    ) {
      return {
        code: ErrorCodes.SSL_ERROR,
        message: getErrorMessage(ErrorCodes.SSL_ERROR),
        retryable: false,
      }
    }

    // =========================================================================
    // Storage/Quota errors (Safari/iOS specific)
    // =========================================================================
    if (
      message.includes('quota') ||
      message.includes('storage') && message.includes('full') ||
      message.includes('exceeded the quota') || // Safari storage quota
      message.includes('disk space')
    ) {
      return {
        code: ErrorCodes.LOCALSTORAGE_QUOTA,
        message: getErrorMessage(ErrorCodes.LOCALSTORAGE_QUOTA),
        retryable: false,
      }
    }

    // =========================================================================
    // WebKit/Safari internal errors
    // =========================================================================
    if (
      message.includes('webkit') ||
      message.includes('internal error') ||
      message.includes('webkiterror')
    ) {
      return {
        code: ErrorCodes.JS_ERROR,
        message: getErrorMessage(ErrorCodes.JS_ERROR),
        retryable: true,
      }
    }

    // =========================================================================
    // Type errors (often Safari-specific null/undefined issues)
    // =========================================================================
    if (
      name === 'typeerror' &&
      (message.includes('null') ||
        message.includes('undefined') ||
        message.includes('cannot read prop') ||
        message.includes('is not a function'))
    ) {
      return {
        code: ErrorCodes.JS_ERROR,
        message: getErrorMessage(ErrorCodes.JS_ERROR),
        retryable: true,
      }
    }
  }

  // Default to unknown client error
  return {
    code: ErrorCodes.CLIENT_UNKNOWN,
    message: getErrorMessage(ErrorCodes.CLIENT_UNKNOWN),
    retryable: false,
  }
}

// ============================================================================
// Error Sanitization Helpers (must be before getDisplayError)
// ============================================================================

// Patterns that indicate the message is already user-friendly
const USER_FRIENDLY_PATTERNS = [
  'please',
  'try again',
  'failed to',
  'could not',
  'unable to',
  'invalid',
  'required',
  'not found',
  'unauthorized',
  'forbidden',
  'too many',
  'limit',
]

/**
 * Checks if an error message appears to already be user-friendly
 */
export function isUserFriendlyMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return USER_FRIENDLY_PATTERNS.some((pattern) => lowerMessage.includes(pattern))
}

// ============================================================================
// Error Display Helpers
// ============================================================================

/**
 * Gets a user-friendly error message from any error source
 * Handles API responses, client errors, and raw errors
 */
export function getDisplayError(
  error: unknown,
  options: ClientErrorOptions = {}
): string {
  const { showCode = false, fallbackMessage } = options
  const defaultFallback = fallbackMessage || 'An unexpected error occurred. Please try again.'

  // Try to parse as API error response
  const apiError = parseAPIError(error)
  if (apiError) {
    return showCode
      ? getErrorMessageWithCode(apiError.code)
      : apiError.message
  }

  // Try to map as client error (Error objects)
  if (error instanceof Error) {
    const clientError = mapClientError(error)
    // If it mapped to an unknown error, use the fallback
    if (clientError.code === ErrorCodes.CLIENT_UNKNOWN) {
      // Check if the original message is user-friendly
      if (isUserFriendlyMessage(error.message)) {
        return error.message
      }
      return defaultFallback
    }
    return showCode
      ? getErrorMessageWithCode(clientError.code)
      : clientError.message
  }

  // Try to map as client error (objects with message)
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    const clientError = mapClientError(new Error(message))
    // If it mapped to an unknown error, use the fallback
    if (clientError.code === ErrorCodes.CLIENT_UNKNOWN) {
      // Check if the original message is user-friendly
      if (isUserFriendlyMessage(message)) {
        return message
      }
      return defaultFallback
    }
    return showCode
      ? getErrorMessageWithCode(clientError.code)
      : clientError.message
  }

  // String error - check if user-friendly, otherwise try to map it
  if (typeof error === 'string') {
    // Check if the string is already user-friendly
    if (isUserFriendlyMessage(error)) {
      return error
    }
    // Try to map it as a client error
    const clientError = mapClientError(new Error(error))
    if (clientError.code !== ErrorCodes.CLIENT_UNKNOWN) {
      return showCode
        ? getErrorMessageWithCode(clientError.code)
        : clientError.message
    }
    // Unmapped string - use fallback
    return defaultFallback
  }

  // Fallback for null, undefined, numbers, etc.
  return defaultFallback
}

/**
 * Gets an error code from any error source
 */
export function getDisplayErrorCode(error: unknown): ErrorCode {
  // Try to parse as API error response
  const apiError = parseAPIError(error)
  if (apiError) {
    return apiError.code
  }

  // Map as client error
  const clientError = mapClientError(error)
  return clientError.code
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // Try to parse as API error response
  const apiError = parseAPIError(error)
  if (apiError) {
    return apiError.retryable
  }

  // Map as client error
  const clientError = mapClientError(error)
  return clientError.retryable
}

// ============================================================================
// Error Sanitization
// ============================================================================

/**
 * Sanitizes an error to produce a user-friendly message
 * Preserves error codes when present
 */
export function sanitizeError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  // Try API error first
  const apiError = parseAPIError(error)
  if (apiError) {
    return apiError.message
  }

  // Extract message from various error types
  let rawMessage: string

  if (error instanceof Error) {
    rawMessage = error.message
  } else if (typeof error === 'string') {
    rawMessage = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    rawMessage = String((error as { message: unknown }).message)
  } else {
    return fallback
  }

  // IMPORTANT: First try to map to a known client error (catches Safari/iOS errors)
  // This must come BEFORE the user-friendly check, because some Safari errors
  // like "A server with the specified hostname could not be found" contain
  // patterns like "could not" and "not found" that would incorrectly trigger
  // the user-friendly check
  const clientError = mapClientError(new Error(rawMessage))

  // If it mapped to a known error (not CLIENT_UNKNOWN), use that message
  if (clientError.code !== ErrorCodes.CLIENT_UNKNOWN) {
    return clientError.message
  }

  // For unknown errors, check if message is already user-friendly
  if (isUserFriendlyMessage(rawMessage)) {
    return rawMessage
  }

  // Unknown error with non-user-friendly message - use fallback
  return fallback
}

/**
 * Creates a sanitized error handler for use in catch blocks
 */
export function createErrorHandler(
  setError: (message: string) => void,
  options?: ClientErrorOptions
): (error: unknown) => void {
  return (error: unknown) => {
    setError(getDisplayError(error, options))
  }
}

// ============================================================================
// Toast Helpers
// ============================================================================

export interface ToastErrorOptions extends ClientErrorOptions {
  duration?: number
}

/**
 * Formats an error for display in a toast notification
 * Returns both the title and message for the toast
 */
export function formatToastError(
  error: unknown,
  options: ToastErrorOptions = {}
): { title: string; message: string; code: ErrorCode } {
  const code = getDisplayErrorCode(error)
  const message = getDisplayError(error, { ...options, showCode: false })

  return {
    title: `Error ${code}`,
    message,
    code,
  }
}

// ============================================================================
// Form Error Helpers
// ============================================================================

/**
 * Extracts field-specific errors from an API response
 */
export function extractFieldErrors(
  error: unknown
): Record<string, string> | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const response = error as {
    errors?: Record<string, string>
    fieldErrors?: Record<string, string>
    fields?: Record<string, string>
  }

  return response.errors || response.fieldErrors || response.fields || null
}
