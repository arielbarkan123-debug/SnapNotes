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

  // Document processing errors
  DOCUMENT_PROCESSING_FAILED: 'DOCUMENT_PROCESSING_FAILED',
  DOCUMENT_PASSWORD_PROTECTED: 'DOCUMENT_PASSWORD_PROTECTED',
  DOCUMENT_EMPTY: 'DOCUMENT_EMPTY',
  DOCUMENT_SCANNED: 'DOCUMENT_SCANNED',

  // AI/Processing errors
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  IMAGE_UNREADABLE: 'IMAGE_UNREADABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Network-specific errors (for better user feedback)
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  SLOW_CONNECTION: 'SLOW_CONNECTION',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  IMAGE_FETCH_FAILED: 'IMAGE_FETCH_FAILED',
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
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please log in again to continue',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Email or password is incorrect. Please check and try again',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Please check your inbox and verify your email to continue',
  [ErrorCodes.ACCOUNT_DISABLED]: 'Your account has been disabled. Please contact support',

  // Validation
  [ErrorCodes.VALIDATION_ERROR]: 'Some information is missing or incorrect. Please check and try again',
  [ErrorCodes.INVALID_INPUT]: 'The information provided is not valid. Please check and try again',
  [ErrorCodes.MISSING_FIELD]: 'Please fill in all required fields',

  // Resource
  [ErrorCodes.NOT_FOUND]: 'This content could not be found. It may have been deleted',
  [ErrorCodes.FORBIDDEN]: 'You don\'t have access to this content',
  [ErrorCodes.CONFLICT]: 'This already exists. Please use a different name or check your courses',

  // Upload
  [ErrorCodes.FILE_TOO_LARGE]: 'File is too large (max 10MB). Try a smaller file or compress it',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Please upload an image (JPEG, PNG) or PDF file',
  [ErrorCodes.UPLOAD_FAILED]: 'Upload failed. Please check your connection and try again',
  [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: 'Storage is full. Please delete some old courses to free up space',

  // Document processing
  [ErrorCodes.DOCUMENT_PROCESSING_FAILED]: 'Could not read this document. Please try a different file or take photos instead',
  [ErrorCodes.DOCUMENT_PASSWORD_PROTECTED]: 'This PDF is password-protected. Please remove the password and try again',
  [ErrorCodes.DOCUMENT_EMPTY]: 'This document appears empty. Please upload a file with visible text or images',
  [ErrorCodes.DOCUMENT_SCANNED]: 'This looks like a scanned document. For best results, take photos of each page instead',

  // AI
  [ErrorCodes.AI_SERVICE_UNAVAILABLE]: 'Our AI is temporarily busy. Please wait a minute and try again',
  [ErrorCodes.AI_PROCESSING_FAILED]: 'Could not process your notes. Please try again or upload different images',
  [ErrorCodes.AI_TIMEOUT]: 'This is taking longer than expected. Please try again with fewer images',
  [ErrorCodes.IMAGE_UNREADABLE]: 'Could not read this image clearly. Please take a clearer photo with good lighting',
  [ErrorCodes.RATE_LIMITED]: 'You\'re going too fast! Please wait a moment and try again',
  [ErrorCodes.PROCESSING_TIMEOUT]: 'Processing took too long. Try uploading fewer images at once',

  // Server
  [ErrorCodes.INTERNAL_ERROR]: 'Something went wrong on our end. Please try again in a moment',
  [ErrorCodes.DATABASE_ERROR]: 'Could not save your data. Please try again',
  [ErrorCodes.NETWORK_ERROR]: 'Connection lost. Please check your internet and try again',

  // Network-specific
  [ErrorCodes.NETWORK_TIMEOUT]: 'The request timed out. Your connection may be slow - please try again',
  [ErrorCodes.SLOW_CONNECTION]: 'Your connection seems slow. Please wait or try again later',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'This service is temporarily unavailable. Please try again in a few minutes',
  [ErrorCodes.IMAGE_FETCH_FAILED]: 'Could not load the image. Please check your connection and try again',
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
    case ErrorCodes.DOCUMENT_PASSWORD_PROTECTED:
    case ErrorCodes.DOCUMENT_EMPTY:
    case ErrorCodes.DOCUMENT_SCANNED:
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
    case ErrorCodes.AI_TIMEOUT:
      return 504

    // 500 Internal Server Error (default)
    case ErrorCodes.INTERNAL_ERROR:
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.UPLOAD_FAILED:
    case ErrorCodes.AI_PROCESSING_FAILED:
    case ErrorCodes.NETWORK_ERROR:
    case ErrorCodes.STORAGE_QUOTA_EXCEEDED:
    case ErrorCodes.DOCUMENT_PROCESSING_FAILED:
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

    // Check for API usage limits error (comes as 400, not 429)
    if (message.includes('api usage limit') ||
        message.includes('usage limit') ||
        message.includes('you have reached your')) {
      return { code: ErrorCodes.RATE_LIMITED, message: 'API usage limit reached. Please try again later or contact support' }
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return { code: ErrorCodes.RATE_LIMITED, message: 'Our AI is receiving many requests. Please wait a moment and try again' }
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return { code: ErrorCodes.AI_TIMEOUT, message: 'This is taking longer than expected. Please try again with fewer images' }
    }

    if (message.includes('unavailable') || message.includes('503') || message.includes('500')) {
      return { code: ErrorCodes.AI_SERVICE_UNAVAILABLE, message: 'Our AI is temporarily unavailable. Please try again in a few minutes' }
    }

    if (message.includes('invalid') && message.includes('image')) {
      return { code: ErrorCodes.IMAGE_UNREADABLE, message: 'Could not read this image. Please take a clearer photo with good lighting' }
    }

    if (message.includes('overloaded') || message.includes('capacity')) {
      return { code: ErrorCodes.AI_SERVICE_UNAVAILABLE, message: 'Our AI is experiencing high demand. Please try again in a few minutes' }
    }
  }

  return { code: ErrorCodes.AI_PROCESSING_FAILED, message: 'Could not process your notes. Please try again or upload different images' }
}
