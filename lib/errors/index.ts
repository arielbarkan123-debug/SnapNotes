/**
 * NoteSnap Error Code System
 *
 * A comprehensive error naming system where every possible error has a unique,
 * identifiable code. Error codes follow the pattern: NS-{AREA}-{NUMBER}
 *
 * @example
 * // In an API route
 * import { createErrorResponse, ErrorCodes, logError } from '@/lib/errors'
 *
 * export async function GET(request: Request) {
 *   try {
 *     const user = await getUser()
 *     if (!user) {
 *       return createErrorResponse(ErrorCodes.UNAUTHORIZED)
 *     }
 *     // ...
 *   } catch (error) {
 *     logError(ErrorCodes.DATABASE_UNKNOWN, error)
 *     return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
 *   }
 * }
 *
 * @example
 * // In a React component
 * import { getDisplayError, isRetryableError } from '@/lib/errors'
 *
 * try {
 *   await apiCall()
 * } catch (error) {
 *   const message = getDisplayError(error)
 *   const canRetry = isRetryableError(error)
 *   toast.error(message)
 * }
 */

// ============================================================================
// Error Codes
// ============================================================================

export {
  // All error codes grouped by category
  AuthErrorCodes,
  CourseErrorCodes,
  HomeworkErrorCodes,
  PracticeErrorCodes,
  ExamErrorCodes,
  UploadErrorCodes,
  DocumentErrorCodes,
  AIErrorCodes,
  DatabaseErrorCodes,
  GamificationErrorCodes,
  AnalyticsErrorCodes,
  UserErrorCodes,
  ClientErrorCodes,
  RateLimitErrorCodes,
  ValidationErrorCodes,
  ExternalErrorCodes,
  MonitoringErrorCodes,
  AdaptiveErrorCodes,
  HelpErrorCodes,
  PerformanceErrorCodes,
  // Combined error codes
  ErrorCodes,
  // Types and utilities
  type ErrorCode,
  type ErrorCategory,
  getErrorCategory,
  isErrorCategory,
} from './codes'

// ============================================================================
// Error Messages
// ============================================================================

export {
  ErrorMessages,
  getErrorMessage,
  getErrorMessageWithCode,
} from './messages'

// ============================================================================
// HTTP Status Codes
// ============================================================================

export {
  HttpStatus,
  ErrorHttpStatus,
  getHttpStatus,
  isClientError,
  isServerError,
  isRetryable,
} from './http-status'

// ============================================================================
// Helper Functions
// ============================================================================

export {
  // Response creation
  createErrorResponse,
  createSuccessResponse,
  // Logging
  logError,
  logAndRespond,
  // Error classification
  isCategory,
  isAuthError,
  isValidationError,
  isRateLimitError,
  isAIError,
  isDatabaseError,
  // Safe error handling
  getSafeErrorMessage,
  // Error code validation
  isValidErrorCode,
  parseErrorCode,
  // Request context
  getRequestContext,
  // AppError class
  AppError,
  isAppError,
  getErrorCode,
  // Types
  type APIErrorResponse,
  type APISuccessResponse,
  type ErrorLogContext,
  type StructuredError,
} from './helpers'

// ============================================================================
// Error Mappers
// ============================================================================

export {
  // Supabase mappers
  mapSupabaseAuthError,
  mapSupabaseDatabaseError,
  mapSupabaseStorageError,
  mapSupabaseError,
  // Claude API mappers
  mapClaudeAPIError,
  mapStreamingError,
  mapResponseParseError,
  mapVisionError,
  // Validation mappers
  mapFieldValidationError,
  mapBodyValidationError,
  mapParamValidationError,
  mapQueryValidationError,
  mapFileValidationError,
  mapValidationError,
  mapZodError,
  mapZodErrorSingle,
  // Types
  type ClaudeAPIError,
  type ValidationError,
} from './mappers'

// ============================================================================
// Client-Side Utilities
// ============================================================================

export {
  // API error parsing
  parseAPIError,
  // Client error mapping
  mapClientError,
  // Display helpers
  getDisplayError,
  getDisplayErrorCode,
  isRetryableError,
  // Error sanitization
  isUserFriendlyMessage,
  sanitizeError,
  createErrorHandler,
  // Toast helpers
  formatToastError,
  // Form helpers
  extractFieldErrors,
  // Types
  type ParsedAPIError,
  type ClientErrorOptions,
  type ToastErrorOptions,
} from './client'
