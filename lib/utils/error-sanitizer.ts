/**
 * Error Sanitizer
 *
 * Sanitizes error messages before showing them to users.
 * Maps cryptic browser/technical errors to user-friendly messages.
 *
 * This module now uses the comprehensive error code system from @/lib/errors
 * for consistent error handling across the application.
 */

import {
  sanitizeError as newSanitizeError,
  createErrorHandler as newCreateErrorHandler,
  getDisplayError,
  getDisplayErrorCode,
  isUserFriendlyMessage,
  type ErrorCode,
} from '@/lib/errors'

// Re-export from the new error system for backward compatibility
export { isUserFriendlyMessage }

/**
 * Sanitizes an error to produce a user-friendly message
 *
 * @param error - The error to sanitize (can be Error, string, or unknown)
 * @param fallback - Default message if no mapping is found
 * @returns User-friendly error message
 *
 * @example
 * try {
 *   const data = await response.json()
 * } catch (err) {
 *   setError(sanitizeError(err))
 * }
 */
export function sanitizeError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  return newSanitizeError(error, fallback)
}

/**
 * Creates a sanitized error handler for use in catch blocks
 *
 * @example
 * const handleError = createErrorHandler(setError)
 *
 * try {
 *   await doSomething()
 * } catch (err) {
 *   handleError(err)
 * }
 */
export function createErrorHandler(
  setError: (message: string) => void,
  fallback?: string
): (error: unknown) => void {
  return newCreateErrorHandler(setError, { fallbackMessage: fallback })
}

/**
 * Sanitizes an error and returns both the message and error code
 *
 * @example
 * try {
 *   await doSomething()
 * } catch (err) {
 *   const { message, code } = sanitizeErrorWithCode(err)
 *   console.log(`[${code}] ${message}`)
 * }
 */
export function sanitizeErrorWithCode(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): { message: string; code: ErrorCode } {
  const code = getDisplayErrorCode(error)
  const message = getDisplayError(error, { fallbackMessage: fallback })
  return { message, code }
}
