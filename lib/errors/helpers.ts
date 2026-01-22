/**
 * Error Response Helpers
 *
 * Helper functions for creating standardized error responses
 * and logging errors with proper context.
 */

import { NextResponse } from 'next/server'
import { type ErrorCode, ErrorCodes, type ErrorCategory } from './codes'
import { getErrorMessage } from './messages'
import { getHttpStatus, isRetryable } from './http-status'

// ============================================================================
// Types
// ============================================================================

export interface APIErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    retryable: boolean
  }
}

export interface APISuccessResponse<T = unknown> {
  success: true
  data?: T
  [key: string]: unknown
}

export interface ErrorLogContext {
  userId?: string
  requestId?: string
  path?: string
  method?: string
  userAgent?: string
  ip?: string
  [key: string]: unknown
}

export interface StructuredError {
  code: ErrorCode
  message: string
  timestamp: string
  context?: ErrorLogContext
  originalError?: {
    name: string
    message: string
    stack?: string
  }
}

// ============================================================================
// Error Response Creation
// ============================================================================

/**
 * Creates a standardized error response for API routes
 *
 * @example
 * // In an API route
 * import { createErrorResponse, ErrorCodes } from '@/lib/errors'
 *
 * export async function GET() {
 *   try {
 *     const user = await getUser()
 *     if (!user) {
 *       return createErrorResponse(ErrorCodes.UNAUTHORIZED)
 *     }
 *     // ...
 *   } catch (error) {
 *     return createErrorResponse(ErrorCodes.INTERNAL_ERROR)
 *   }
 * }
 */
export function createErrorResponse(
  code: ErrorCode,
  customMessage?: string
): NextResponse<APIErrorResponse> {
  const message = customMessage || getErrorMessage(code)
  const status = getHttpStatus(code)
  const retryable = isRetryable(code)

  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        retryable,
      },
    },
    { status }
  )
}

/**
 * Creates a standardized success response for API routes
 *
 * @example
 * import { createSuccessResponse } from '@/lib/errors'
 *
 * export async function GET() {
 *   const data = await fetchData()
 *   return createSuccessResponse(data)
 * }
 */
export function createSuccessResponse<T>(
  data: T,
  additionalFields?: Record<string, unknown>
): NextResponse<APISuccessResponse<T>> {
  return NextResponse.json({
    success: true as const,
    data,
    ...additionalFields,
  })
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Logs an error with structured context for debugging and monitoring
 *
 * @example
 * import { logError, ErrorCodes } from '@/lib/errors'
 *
 * try {
 *   await doSomething()
 * } catch (error) {
 *   logError(ErrorCodes.DATABASE_ERROR, error, { userId: user.id })
 *   return createErrorResponse(ErrorCodes.DATABASE_ERROR)
 * }
 */
export function logError(
  code: ErrorCode,
  originalError?: unknown,
  context?: ErrorLogContext
): void {
  const structuredError: StructuredError = {
    code,
    message: getErrorMessage(code),
    timestamp: new Date().toISOString(),
    context,
  }

  if (originalError instanceof Error) {
    structuredError.originalError = {
      name: originalError.name,
      message: originalError.message,
      stack: process.env.NODE_ENV === 'development' ? originalError.stack : undefined,
    }
  } else if (originalError !== undefined) {
    structuredError.originalError = {
      name: 'Unknown',
      message: String(originalError),
    }
  }

  // In development, log with more detail
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${code}]`, structuredError)
  } else {
    // In production, log in a structured format suitable for log aggregation
    console.error(JSON.stringify(structuredError))
  }

  // In production, you would also send this to an error tracking service like Sentry
  // Example: Sentry.captureException(originalError, { tags: { code }, extra: context })
}

/**
 * Logs an error and returns an error response in one call
 *
 * @example
 * try {
 *   await doSomething()
 * } catch (error) {
 *   return logAndRespond(ErrorCodes.DATABASE_ERROR, error, { userId: user.id })
 * }
 */
export function logAndRespond(
  code: ErrorCode,
  originalError?: unknown,
  context?: ErrorLogContext,
  customMessage?: string
): NextResponse<APIErrorResponse> {
  logError(code, originalError, context)
  return createErrorResponse(code, customMessage)
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Checks if an error code is from a specific category
 *
 * @example
 * if (isCategory(errorCode, 'AUTH')) {
 *   // Handle auth error specifically
 * }
 */
export function isCategory(code: ErrorCode, category: ErrorCategory): boolean {
  return code.startsWith(`NS-${category}-`)
}

/**
 * Checks if an error is authentication-related
 */
export function isAuthError(code: ErrorCode): boolean {
  return isCategory(code, 'AUTH')
}

/**
 * Checks if an error is a validation error
 */
export function isValidationError(code: ErrorCode): boolean {
  return isCategory(code, 'VAL')
}

/**
 * Checks if an error is a rate limiting error
 */
export function isRateLimitError(code: ErrorCode): boolean {
  return isCategory(code, 'RATE')
}

/**
 * Checks if an error is an AI-related error
 */
export function isAIError(code: ErrorCode): boolean {
  return isCategory(code, 'AI')
}

/**
 * Checks if an error is a database error
 */
export function isDatabaseError(code: ErrorCode): boolean {
  return isCategory(code, 'DB')
}

// ============================================================================
// Safe Error Message Extraction
// ============================================================================

/**
 * Safely extracts a message from an unknown error without exposing internals
 * Only returns the original message in development; generic message in production
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      return error.message
    }
  }
  return 'An unexpected error occurred'
}

// ============================================================================
// Error Code Validation
// ============================================================================

/**
 * Checks if a string is a valid error code
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  const allCodes = Object.values(ErrorCodes) as string[]
  return allCodes.includes(code)
}

/**
 * Parses an error code from a string, returning undefined if invalid
 */
export function parseErrorCode(code: string): ErrorCode | undefined {
  return isValidErrorCode(code) ? code : undefined
}

// ============================================================================
// Request Context Helpers
// ============================================================================

/**
 * Extracts error context from a Next.js request
 */
export function getRequestContext(request: Request): ErrorLogContext {
  const url = new URL(request.url)
  return {
    path: url.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || undefined,
    requestId: request.headers.get('x-request-id') || undefined,
  }
}

// ============================================================================
// Typed Error Class
// ============================================================================

/**
 * Custom error class with error code
 *
 * @example
 * throw new AppError(ErrorCodes.COURSE_NOT_FOUND, 'Course with ID 123 not found')
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string
  ) {
    super(message || getErrorMessage(code))
    this.name = 'AppError'
  }
}

/**
 * Checks if an error is an AppError with a specific code
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Gets the error code from an error, or returns a default code
 */
export function getErrorCode(error: unknown, defaultCode: ErrorCode = ErrorCodes.DATABASE_UNKNOWN): ErrorCode {
  if (isAppError(error)) {
    return error.code
  }
  return defaultCode
}
