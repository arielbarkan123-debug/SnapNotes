/**
 * API Error Utilities
 *
 * This file re-exports the comprehensive error code system from @/lib/errors
 * for backward compatibility with existing code.
 *
 * New code should import directly from '@/lib/errors' for access to
 * the full error code system.
 */

import { NextResponse } from 'next/server'
import {
  ErrorCodes as NewErrorCodes,
  type ErrorCode as NewErrorCode,
  getErrorMessage,
  getHttpStatus,
  isRetryable,
  mapSupabaseAuthError as newMapSupabaseAuthError,
  mapClaudeAPIError as newMapClaudeAPIError,
} from '@/lib/errors'

// ============================================================================
// Legacy Error Codes (mapped to new system for backward compatibility)
// ============================================================================

export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: NewErrorCodes.UNAUTHORIZED,
  SESSION_EXPIRED: NewErrorCodes.SESSION_EXPIRED,
  INVALID_CREDENTIALS: NewErrorCodes.INVALID_CREDENTIALS,
  EMAIL_NOT_VERIFIED: NewErrorCodes.EMAIL_NOT_VERIFIED,
  ACCOUNT_DISABLED: NewErrorCodes.ACCOUNT_DISABLED,

  // Validation errors
  VALIDATION_ERROR: NewErrorCodes.VALIDATION_UNKNOWN,
  INVALID_INPUT: NewErrorCodes.FIELD_INVALID_FORMAT,
  MISSING_FIELD: NewErrorCodes.FIELD_REQUIRED,

  // Resource errors
  NOT_FOUND: NewErrorCodes.RECORD_NOT_FOUND,
  FORBIDDEN: NewErrorCodes.FORBIDDEN,
  CONFLICT: NewErrorCodes.DUPLICATE_RECORD,

  // Upload errors
  FILE_TOO_LARGE: NewErrorCodes.FILE_TOO_LARGE,
  INVALID_FILE_TYPE: NewErrorCodes.INVALID_FILE_TYPE,
  UPLOAD_FAILED: NewErrorCodes.STORAGE_UPLOAD_FAILED,
  STORAGE_QUOTA_EXCEEDED: NewErrorCodes.STORAGE_QUOTA_EXCEEDED,

  // Document processing errors
  DOCUMENT_PROCESSING_FAILED: NewErrorCodes.PROCESSING_FAILED,
  DOCUMENT_PASSWORD_PROTECTED: NewErrorCodes.PDF_PASSWORD_PROTECTED,
  DOCUMENT_EMPTY: NewErrorCodes.PDF_EMPTY,
  DOCUMENT_SCANNED: NewErrorCodes.PDF_SCANNED_DOCUMENT,

  // AI/Processing errors
  AI_SERVICE_UNAVAILABLE: NewErrorCodes.API_UNAVAILABLE,
  AI_PROCESSING_FAILED: NewErrorCodes.AI_UNKNOWN,
  AI_TIMEOUT: NewErrorCodes.API_TIMEOUT,
  IMAGE_UNREADABLE: NewErrorCodes.IMAGE_UNREADABLE,
  RATE_LIMITED: NewErrorCodes.API_RATE_LIMITED,
  PROCESSING_TIMEOUT: NewErrorCodes.PROCESSING_TIMEOUT,

  // Server errors
  INTERNAL_ERROR: NewErrorCodes.DATABASE_UNKNOWN,
  DATABASE_ERROR: NewErrorCodes.QUERY_FAILED,
  NETWORK_ERROR: NewErrorCodes.NETWORK_REQUEST_FAILED,

  // Network-specific errors
  NETWORK_TIMEOUT: NewErrorCodes.NETWORK_TIMEOUT,
  SLOW_CONNECTION: NewErrorCodes.NETWORK_SLOW,
  SERVICE_UNAVAILABLE_LEGACY: NewErrorCodes.API_UNAVAILABLE,
  IMAGE_FETCH_FAILED: NewErrorCodes.IMAGE_FETCH_FAILED,
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ============================================================================
// API Error Response Type
// ============================================================================

export interface APIErrorResponse {
  success: false
  error: {
    code: NewErrorCode
    message: string
    retryable: boolean
  }
}

export interface APISuccessResponse<T = unknown> {
  success: true
  data?: T
  [key: string]: unknown
}

// ============================================================================
// Error Messages (using new system)
// ============================================================================

const defaultErrorMessages: Record<ErrorCode, string> = {
  // Auth
  [ErrorCodes.UNAUTHORIZED]: getErrorMessage(NewErrorCodes.UNAUTHORIZED),
  [ErrorCodes.SESSION_EXPIRED]: getErrorMessage(NewErrorCodes.SESSION_EXPIRED),
  [ErrorCodes.INVALID_CREDENTIALS]: getErrorMessage(NewErrorCodes.INVALID_CREDENTIALS),
  [ErrorCodes.EMAIL_NOT_VERIFIED]: getErrorMessage(NewErrorCodes.EMAIL_NOT_VERIFIED),
  [ErrorCodes.ACCOUNT_DISABLED]: getErrorMessage(NewErrorCodes.ACCOUNT_DISABLED),

  // Validation
  [ErrorCodes.VALIDATION_ERROR]: getErrorMessage(NewErrorCodes.VALIDATION_UNKNOWN),
  [ErrorCodes.INVALID_INPUT]: getErrorMessage(NewErrorCodes.FIELD_INVALID_FORMAT),
  [ErrorCodes.MISSING_FIELD]: getErrorMessage(NewErrorCodes.FIELD_REQUIRED),

  // Resource
  [ErrorCodes.NOT_FOUND]: getErrorMessage(NewErrorCodes.RECORD_NOT_FOUND),
  [ErrorCodes.FORBIDDEN]: getErrorMessage(NewErrorCodes.FORBIDDEN),
  [ErrorCodes.CONFLICT]: getErrorMessage(NewErrorCodes.DUPLICATE_RECORD),

  // Upload
  [ErrorCodes.FILE_TOO_LARGE]: getErrorMessage(NewErrorCodes.FILE_TOO_LARGE),
  [ErrorCodes.INVALID_FILE_TYPE]: getErrorMessage(NewErrorCodes.INVALID_FILE_TYPE),
  [ErrorCodes.UPLOAD_FAILED]: getErrorMessage(NewErrorCodes.STORAGE_UPLOAD_FAILED),
  [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: getErrorMessage(NewErrorCodes.STORAGE_QUOTA_EXCEEDED),

  // Document processing
  [ErrorCodes.DOCUMENT_PROCESSING_FAILED]: getErrorMessage(NewErrorCodes.PROCESSING_FAILED),
  [ErrorCodes.DOCUMENT_PASSWORD_PROTECTED]: getErrorMessage(NewErrorCodes.PDF_PASSWORD_PROTECTED),
  [ErrorCodes.DOCUMENT_EMPTY]: getErrorMessage(NewErrorCodes.PDF_EMPTY),
  [ErrorCodes.DOCUMENT_SCANNED]: getErrorMessage(NewErrorCodes.PDF_SCANNED_DOCUMENT),

  // AI
  [ErrorCodes.AI_SERVICE_UNAVAILABLE]: getErrorMessage(NewErrorCodes.API_UNAVAILABLE),
  [ErrorCodes.AI_PROCESSING_FAILED]: getErrorMessage(NewErrorCodes.AI_UNKNOWN),
  [ErrorCodes.AI_TIMEOUT]: getErrorMessage(NewErrorCodes.API_TIMEOUT),
  [ErrorCodes.IMAGE_UNREADABLE]: getErrorMessage(NewErrorCodes.IMAGE_UNREADABLE),
  [ErrorCodes.RATE_LIMITED]: getErrorMessage(NewErrorCodes.API_RATE_LIMITED),
  [ErrorCodes.PROCESSING_TIMEOUT]: getErrorMessage(NewErrorCodes.PROCESSING_TIMEOUT),

  // Server
  [ErrorCodes.INTERNAL_ERROR]: getErrorMessage(NewErrorCodes.DATABASE_UNKNOWN),
  [ErrorCodes.DATABASE_ERROR]: getErrorMessage(NewErrorCodes.QUERY_FAILED),
  [ErrorCodes.NETWORK_ERROR]: getErrorMessage(NewErrorCodes.NETWORK_REQUEST_FAILED),

  // Network-specific
  [ErrorCodes.NETWORK_TIMEOUT]: getErrorMessage(NewErrorCodes.NETWORK_TIMEOUT),
  [ErrorCodes.SLOW_CONNECTION]: getErrorMessage(NewErrorCodes.NETWORK_SLOW),
  // Note: SERVICE_UNAVAILABLE_LEGACY maps to same code as AI_SERVICE_UNAVAILABLE (NS-AI-001)
  [ErrorCodes.IMAGE_FETCH_FAILED]: getErrorMessage(NewErrorCodes.IMAGE_FETCH_FAILED),
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a standardized error response
 * @deprecated Use createErrorResponse from '@/lib/errors' for new code
 */
export function createErrorResponse(
  code: ErrorCode | NewErrorCode,
  message?: string,
  status?: number
): NextResponse<APIErrorResponse> {
  const errorMessage = message || defaultErrorMessages[code as ErrorCode] || getErrorMessage(code as NewErrorCode)
  const statusCode = status || getHttpStatus(code as NewErrorCode)
  const retryable = isRetryable(code as NewErrorCode)

  return NextResponse.json(
    {
      success: false as const,
      error: {
        code: code as NewErrorCode,
        message: errorMessage,
        retryable,
      },
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
 * Safely extracts error message without exposing internals
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      return error.message
    }
  }
  return 'An unexpected error occurred'
}

/**
 * Logs error to console (in production, would send to monitoring service)
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)
}

/**
 * Maps Supabase auth errors to our error codes
 * @deprecated Use mapSupabaseAuthError from '@/lib/errors' for new code
 */
export function mapSupabaseAuthError(errorMessage: string): { code: ErrorCode; message: string } {
  const mapped = newMapSupabaseAuthError(errorMessage)
  return {
    code: mapped.code as ErrorCode,
    message: mapped.message,
  }
}

/**
 * Maps Claude API errors to our error codes
 * @deprecated Use mapClaudeAPIError from '@/lib/errors' for new code
 */
export function mapClaudeAPIError(error: unknown): { code: ErrorCode; message: string } {
  const mapped = newMapClaudeAPIError(error)
  return {
    code: mapped.code as ErrorCode,
    message: mapped.message,
  }
}
