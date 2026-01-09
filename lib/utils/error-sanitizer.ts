/**
 * Sanitizes error messages before showing them to users.
 * Maps cryptic browser/technical errors to user-friendly messages.
 *
 * This prevents raw error messages like:
 * - "SyntaxError: The string did not match the expected pattern" (Safari)
 * - "TypeError: Failed to fetch"
 * - "AbortError: The operation was aborted"
 * - JSON parse errors
 * - Network errors
 */

type ErrorMessageMap = {
  patterns: string[]
  message: string
}

// Map of error patterns to user-friendly messages
const ERROR_MAPPINGS: ErrorMessageMap[] = [
  // Safari JSON parse error
  {
    patterns: ['did not match the expected pattern', 'syntaxerror: the string'],
    message: 'Server error. Please try again.',
  },
  // Network/fetch errors
  {
    patterns: ['failed to fetch', 'network error', 'networkerror', 'load failed', 'fetch failed'],
    message: 'Connection error. Please check your internet and try again.',
  },
  // Abort errors
  {
    patterns: ['aborted', 'abort'],
    message: 'Request was cancelled. Please try again.',
  },
  // Timeout errors
  {
    patterns: ['timeout', 'timed out', 'time out'],
    message: 'Server is taking too long. Please try again.',
  },
  // JSON parse errors
  {
    patterns: ['json', 'unexpected token', 'unexpected end'],
    message: 'Server error. Please try again.',
  },
  // CORS errors
  {
    patterns: ['cors', 'cross-origin', 'blocked by cors'],
    message: 'Connection blocked. Please try again.',
  },
  // SSL/certificate errors
  {
    patterns: ['certificate', 'ssl', 'secure connection'],
    message: 'Secure connection error. Please try again.',
  },
]

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
]

/**
 * Checks if an error message appears to already be user-friendly
 */
function isUserFriendlyMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return USER_FRIENDLY_PATTERNS.some((pattern) => lowerMessage.includes(pattern))
}

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

  const lowerMessage = rawMessage.toLowerCase()

  // Check if message is already user-friendly
  if (isUserFriendlyMessage(rawMessage)) {
    return rawMessage
  }

  // Try to map to a user-friendly message
  for (const mapping of ERROR_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (lowerMessage.includes(pattern)) {
        return mapping.message
      }
    }
  }

  // Log unexpected errors for debugging but don't show to user
  console.error('[ErrorSanitizer] Unmapped error:', rawMessage)
  return fallback
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
  return (error: unknown) => {
    setError(sanitizeError(error, fallback))
  }
}
