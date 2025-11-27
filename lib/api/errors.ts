import { NextResponse } from 'next/server'

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',

  // Upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',

  // AI/Processing errors
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
  IMAGE_UNREADABLE: 'IMAGE_UNREADABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ============================================================================
// API Error Response Type
// ============================================================================

export interface APIErrorResponse {
  success: false
  error: string
  code?: ErrorCode
}

export interface APISuccessResponse<T = unknown> {
  success: true
  data?: T
  [key: string]: unknown
}

// ============================================================================
// Error Messages
// ============================================================================

const defaultErrorMessages: Record<ErrorCode, string> = {
  // Auth
  [ErrorCodes.UNAUTHORIZED]: 'Please log in to continue',
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please log in again',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Please verify your email before continuing',
  [ErrorCodes.ACCOUNT_DISABLED]: 'Your account has been disabled',

  // Validation
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCodes.MISSING_FIELD]: 'Required field is missing',

  // Resource
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to access this resource',
  [ErrorCodes.CONFLICT]: 'This action conflicts with an existing resource',

  // Upload
  [ErrorCodes.FILE_TOO_LARGE]: 'File is too large. Maximum size is 10MB',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type. Please upload an image',
  [ErrorCodes.UPLOAD_FAILED]: 'Failed to upload file. Please try again',
  [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded',

  // AI
  [ErrorCodes.AI_SERVICE_UNAVAILABLE]: 'AI service is temporarily unavailable. Please try again later',
  [ErrorCodes.AI_PROCESSING_FAILED]: 'Failed to process your notes. Please try again',
  [ErrorCodes.IMAGE_UNREADABLE]: 'Could not read the image. Please upload a clearer photo',
  [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again',
  [ErrorCodes.PROCESSING_TIMEOUT]: 'Processing took too long. Please try again',

  // Server
  [ErrorCodes.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again',
  [ErrorCodes.DATABASE_ERROR]: 'Database error. Please try again',
  [ErrorCodes.NETWORK_ERROR]: 'Network error. Please check your connection',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  status?: number
): NextResponse<APIErrorResponse> {
  const errorMessage = message || defaultErrorMessages[code]
  const statusCode = status || getStatusCodeForError(code)

  return NextResponse.json(
    {
      success: false as const,
      error: errorMessage,
      code,
    },
    { status: statusCode }
  )
}

/**
 * Creates a standardized success response
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

/**
 * Gets the appropriate HTTP status code for an error code
 */
function getStatusCodeForError(code: ErrorCode): number {
  switch (code) {
    // 400 Bad Request
    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.INVALID_INPUT:
    case ErrorCodes.MISSING_FIELD:
    case ErrorCodes.FILE_TOO_LARGE:
    case ErrorCodes.INVALID_FILE_TYPE:
    case ErrorCodes.IMAGE_UNREADABLE:
      return 400

    // 401 Unauthorized
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.SESSION_EXPIRED:
    case ErrorCodes.INVALID_CREDENTIALS:
    case ErrorCodes.EMAIL_NOT_VERIFIED:
      return 401

    // 403 Forbidden
    case ErrorCodes.FORBIDDEN:
    case ErrorCodes.ACCOUNT_DISABLED:
      return 403

    // 404 Not Found
    case ErrorCodes.NOT_FOUND:
      return 404

    // 409 Conflict
    case ErrorCodes.CONFLICT:
      return 409

    // 429 Too Many Requests
    case ErrorCodes.RATE_LIMITED:
      return 429

    // 503 Service Unavailable
    case ErrorCodes.AI_SERVICE_UNAVAILABLE:
      return 503

    // 504 Gateway Timeout
    case ErrorCodes.PROCESSING_TIMEOUT:
      return 504

    // 500 Internal Server Error (default)
    case ErrorCodes.INTERNAL_ERROR:
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.UPLOAD_FAILED:
    case ErrorCodes.AI_PROCESSING_FAILED:
    case ErrorCodes.NETWORK_ERROR:
    case ErrorCodes.STORAGE_QUOTA_EXCEEDED:
    default:
      return 500
  }
}

/**
 * Safely extracts error message without exposing internals
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // In development, return the actual error message
    if (process.env.NODE_ENV === 'development') {
      return error.message
    }
    // In production, return a generic message
    return 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}

/**
 * Logs error to console (in production, would send to monitoring service)
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)

  // In production, you would send this to an error tracking service like Sentry
  // Example: Sentry.captureException(error, { tags: { context } })
}

/**
 * Maps Supabase auth errors to our error codes
 */
export function mapSupabaseAuthError(errorMessage: string): { code: ErrorCode; message: string } {
  const message = errorMessage.toLowerCase()

  if (message.includes('invalid login credentials') || message.includes('invalid password')) {
    return { code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid email or password' }
  }

  if (message.includes('email not confirmed') || message.includes('not verified')) {
    return { code: ErrorCodes.EMAIL_NOT_VERIFIED, message: 'Please verify your email before logging in' }
  }

  if (message.includes('user not found') || message.includes('no user')) {
    return { code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid email or password' }
  }

  if (message.includes('already registered') || message.includes('already exists')) {
    return { code: ErrorCodes.CONFLICT, message: 'An account with this email already exists' }
  }

  if (message.includes('password') && message.includes('weak')) {
    return { code: ErrorCodes.VALIDATION_ERROR, message: 'Password is too weak. Use at least 8 characters' }
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return { code: ErrorCodes.RATE_LIMITED, message: 'Too many attempts. Please wait and try again' }
  }

  if (message.includes('session') && (message.includes('expired') || message.includes('invalid'))) {
    return { code: ErrorCodes.SESSION_EXPIRED, message: 'Your session has expired. Please log in again' }
  }

  // Default
  return { code: ErrorCodes.INTERNAL_ERROR, message: 'Authentication failed. Please try again' }
}

/**
 * Maps Claude API errors to our error codes
 */
export function mapClaudeAPIError(error: unknown): { code: ErrorCode; message: string } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('rate limit') || message.includes('429')) {
      return { code: ErrorCodes.RATE_LIMITED, message: 'AI service is busy. Please try again in a moment' }
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return { code: ErrorCodes.PROCESSING_TIMEOUT, message: 'Processing took too long. Please try again' }
    }

    if (message.includes('unavailable') || message.includes('503') || message.includes('500')) {
      return { code: ErrorCodes.AI_SERVICE_UNAVAILABLE, message: 'AI service is temporarily unavailable' }
    }

    if (message.includes('invalid') && message.includes('image')) {
      return { code: ErrorCodes.IMAGE_UNREADABLE, message: 'Could not read the image. Please upload a clearer photo' }
    }
  }

  return { code: ErrorCodes.AI_PROCESSING_FAILED, message: 'Failed to process your notes. Please try again' }
}
