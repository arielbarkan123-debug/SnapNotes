/**
 * Supabase Error Mapper
 *
 * Maps Supabase errors (Auth, Database, Storage) to NoteSnap error codes
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

// ============================================================================
// Supabase Auth Error Mapping
// ============================================================================

/**
 * Maps Supabase Auth error messages to error codes
 */
export function mapSupabaseAuthError(errorMessage: string): MappedError {
  const message = errorMessage.toLowerCase()

  // Invalid credentials
  if (message.includes('invalid login credentials') || message.includes('invalid password')) {
    return {
      code: ErrorCodes.INVALID_CREDENTIALS,
      message: getErrorMessage(ErrorCodes.INVALID_CREDENTIALS),
    }
  }

  // Email not verified
  if (message.includes('email not confirmed') || message.includes('not verified')) {
    return {
      code: ErrorCodes.EMAIL_NOT_VERIFIED,
      message: getErrorMessage(ErrorCodes.EMAIL_NOT_VERIFIED),
    }
  }

  // User not found (treat as invalid credentials for security)
  if (message.includes('user not found') || message.includes('no user')) {
    return {
      code: ErrorCodes.INVALID_CREDENTIALS,
      message: getErrorMessage(ErrorCodes.INVALID_CREDENTIALS),
    }
  }

  // Email already registered
  if (message.includes('already registered') || message.includes('already exists') || message.includes('already been registered')) {
    return {
      code: ErrorCodes.EMAIL_ALREADY_EXISTS,
      message: getErrorMessage(ErrorCodes.EMAIL_ALREADY_EXISTS),
    }
  }

  // Weak password
  if (message.includes('password') && (message.includes('weak') || message.includes('short') || message.includes('minimum'))) {
    return {
      code: ErrorCodes.PASSWORD_TOO_WEAK,
      message: getErrorMessage(ErrorCodes.PASSWORD_TOO_WEAK),
    }
  }

  // Invalid email format
  if (message.includes('invalid email') || message.includes('email format')) {
    return {
      code: ErrorCodes.INVALID_EMAIL_FORMAT,
      message: getErrorMessage(ErrorCodes.INVALID_EMAIL_FORMAT),
    }
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('too many attempts')) {
    return {
      code: ErrorCodes.RESET_RATE_LIMITED,
      message: getErrorMessage(ErrorCodes.RESET_RATE_LIMITED),
    }
  }

  // Session expired
  if (message.includes('session') && (message.includes('expired') || message.includes('invalid'))) {
    return {
      code: ErrorCodes.SESSION_EXPIRED,
      message: getErrorMessage(ErrorCodes.SESSION_EXPIRED),
    }
  }

  // Refresh token issues
  if (message.includes('refresh token') && (message.includes('expired') || message.includes('invalid') || message.includes('not found'))) {
    return {
      code: ErrorCodes.REFRESH_TOKEN_EXPIRED,
      message: getErrorMessage(ErrorCodes.REFRESH_TOKEN_EXPIRED),
    }
  }

  // OAuth errors
  if (message.includes('oauth') || message.includes('provider')) {
    return {
      code: ErrorCodes.OAUTH_PROVIDER_ERROR,
      message: getErrorMessage(ErrorCodes.OAUTH_PROVIDER_ERROR),
    }
  }

  // Token expired (password reset)
  if (message.includes('token') && message.includes('expired')) {
    return {
      code: ErrorCodes.RESET_TOKEN_EXPIRED,
      message: getErrorMessage(ErrorCodes.RESET_TOKEN_EXPIRED),
    }
  }

  // Token invalid (password reset)
  if (message.includes('token') && message.includes('invalid')) {
    return {
      code: ErrorCodes.RESET_TOKEN_INVALID,
      message: getErrorMessage(ErrorCodes.RESET_TOKEN_INVALID),
    }
  }

  // Account disabled
  if (message.includes('disabled') || message.includes('banned')) {
    return {
      code: ErrorCodes.ACCOUNT_DISABLED,
      message: getErrorMessage(ErrorCodes.ACCOUNT_DISABLED),
    }
  }

  // Default auth error
  return {
    code: ErrorCodes.AUTH_UNKNOWN,
    message: getErrorMessage(ErrorCodes.AUTH_UNKNOWN),
  }
}

// ============================================================================
// Supabase Database Error Mapping
// ============================================================================

/**
 * Maps Supabase/Postgres database error codes and messages to error codes
 */
export function mapSupabaseDatabaseError(error: unknown): MappedError {
  const errorObj = error as { code?: string; message?: string; details?: string }
  const pgCode = errorObj.code || ''
  const message = (errorObj.message || '').toLowerCase()
  // Note: details may be used in future for more specific error mapping
  const _details = (errorObj.details || '').toLowerCase()

  // PostgreSQL error codes
  // https://www.postgresql.org/docs/current/errcodes-appendix.html

  // 23505 - unique_violation
  if (pgCode === '23505' || message.includes('duplicate key') || message.includes('unique constraint')) {
    return {
      code: ErrorCodes.DUPLICATE_RECORD,
      message: getErrorMessage(ErrorCodes.DUPLICATE_RECORD),
    }
  }

  // 23503 - foreign_key_violation
  if (pgCode === '23503' || message.includes('foreign key')) {
    return {
      code: ErrorCodes.FOREIGN_KEY_VIOLATION,
      message: getErrorMessage(ErrorCodes.FOREIGN_KEY_VIOLATION),
    }
  }

  // 23514 - check_violation
  if (pgCode === '23514' || message.includes('check constraint')) {
    return {
      code: ErrorCodes.CONSTRAINT_VIOLATION,
      message: getErrorMessage(ErrorCodes.CONSTRAINT_VIOLATION),
    }
  }

  // 23502 - not_null_violation
  if (pgCode === '23502' || message.includes('not-null constraint') || message.includes('not null constraint')) {
    return {
      code: ErrorCodes.CONSTRAINT_VIOLATION,
      message: getErrorMessage(ErrorCodes.CONSTRAINT_VIOLATION),
    }
  }

  // 42P01 - undefined_table
  if (pgCode === '42P01' || message.includes('undefined table') || message.includes('does not exist')) {
    return {
      code: ErrorCodes.QUERY_INVALID,
      message: getErrorMessage(ErrorCodes.QUERY_INVALID),
    }
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out') || pgCode === '57014') {
    return {
      code: ErrorCodes.QUERY_TIMEOUT,
      message: getErrorMessage(ErrorCodes.QUERY_TIMEOUT),
    }
  }

  // Connection errors
  if (message.includes('connection') || message.includes('connect') || pgCode.startsWith('08')) {
    return {
      code: ErrorCodes.CONNECTION_FAILED,
      message: getErrorMessage(ErrorCodes.CONNECTION_FAILED),
    }
  }

  // Deadlock
  if (pgCode === '40P01' || message.includes('deadlock')) {
    return {
      code: ErrorCodes.DEADLOCK,
      message: getErrorMessage(ErrorCodes.DEADLOCK),
    }
  }

  // RLS policy violation
  if (message.includes('row-level security') || message.includes('rls') || message.includes('policy')) {
    return {
      code: ErrorCodes.RLS_ACCESS_DENIED,
      message: getErrorMessage(ErrorCodes.RLS_ACCESS_DENIED),
    }
  }

  // PGRST codes (PostgREST)
  if (pgCode === 'PGRST116' || message.includes('no rows')) {
    return {
      code: ErrorCodes.RECORD_NOT_FOUND,
      message: getErrorMessage(ErrorCodes.RECORD_NOT_FOUND),
    }
  }

  // Permission denied
  if (message.includes('permission denied') || pgCode === '42501') {
    return {
      code: ErrorCodes.RLS_POLICY_VIOLATION,
      message: getErrorMessage(ErrorCodes.RLS_POLICY_VIOLATION),
    }
  }

  // Default database error
  return {
    code: ErrorCodes.DATABASE_UNKNOWN,
    message: getErrorMessage(ErrorCodes.DATABASE_UNKNOWN),
  }
}

// ============================================================================
// Supabase Storage Error Mapping
// ============================================================================

/**
 * Maps Supabase Storage errors to error codes
 */
export function mapSupabaseStorageError(error: unknown): MappedError {
  const errorObj = error as { statusCode?: number; error?: string; message?: string }
  const statusCode = errorObj.statusCode || 0
  // Note: errorType may be used in future for more specific error mapping
  const _errorType = (errorObj.error || '').toLowerCase()
  const message = (errorObj.message || '').toLowerCase()

  // 400 - Bad Request
  if (statusCode === 400) {
    if (message.includes('size') || message.includes('too large')) {
      return {
        code: ErrorCodes.FILE_TOO_LARGE,
        message: getErrorMessage(ErrorCodes.FILE_TOO_LARGE),
      }
    }
    if (message.includes('mime') || message.includes('type')) {
      return {
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: getErrorMessage(ErrorCodes.INVALID_FILE_TYPE),
      }
    }
    return {
      code: ErrorCodes.UPLOAD_UNKNOWN,
      message: getErrorMessage(ErrorCodes.UPLOAD_UNKNOWN),
    }
  }

  // 401/403 - Unauthorized/Forbidden
  if (statusCode === 401 || statusCode === 403) {
    return {
      code: ErrorCodes.STORAGE_ACCESS_DENIED,
      message: getErrorMessage(ErrorCodes.STORAGE_ACCESS_DENIED),
    }
  }

  // 404 - Not Found
  if (statusCode === 404) {
    if (message.includes('bucket')) {
      return {
        code: ErrorCodes.STORAGE_BUCKET_NOT_FOUND,
        message: getErrorMessage(ErrorCodes.STORAGE_BUCKET_NOT_FOUND),
      }
    }
    return {
      code: ErrorCodes.RECORD_NOT_FOUND,
      message: 'File not found.',
    }
  }

  // 413 - Payload Too Large
  if (statusCode === 413) {
    return {
      code: ErrorCodes.FILE_TOO_LARGE,
      message: getErrorMessage(ErrorCodes.FILE_TOO_LARGE),
    }
  }

  // 507 - Insufficient Storage
  if (statusCode === 507 || message.includes('quota') || message.includes('storage limit')) {
    return {
      code: ErrorCodes.STORAGE_QUOTA_EXCEEDED,
      message: getErrorMessage(ErrorCodes.STORAGE_QUOTA_EXCEEDED),
    }
  }

  // Generic storage error
  return {
    code: ErrorCodes.STORAGE_UPLOAD_FAILED,
    message: getErrorMessage(ErrorCodes.STORAGE_UPLOAD_FAILED),
  }
}

// ============================================================================
// Generic Supabase Error Mapper
// ============================================================================

/**
 * Maps any Supabase error to the appropriate error code
 * Attempts to determine the type of error and use the appropriate mapper
 */
export function mapSupabaseError(error: unknown, context?: 'auth' | 'database' | 'storage'): MappedError {
  if (typeof error === 'string') {
    // String errors are usually auth errors
    return mapSupabaseAuthError(error)
  }

  const errorObj = error as { message?: string; code?: string; statusCode?: number; error?: string }

  // If context is explicitly provided, use the appropriate mapper
  if (context === 'auth') {
    return mapSupabaseAuthError(errorObj.message || '')
  }
  if (context === 'storage') {
    return mapSupabaseStorageError(error)
  }
  if (context === 'database') {
    return mapSupabaseDatabaseError(error)
  }

  // Try to detect the error type
  // Storage errors typically have statusCode
  if (errorObj.statusCode) {
    return mapSupabaseStorageError(error)
  }

  // Database errors typically have PostgreSQL codes (5 characters)
  if (errorObj.code && errorObj.code.length === 5) {
    return mapSupabaseDatabaseError(error)
  }

  // PGRST codes
  if (errorObj.code && errorObj.code.startsWith('PGRST')) {
    return mapSupabaseDatabaseError(error)
  }

  // Default to auth error mapper for string messages
  if (errorObj.message) {
    return mapSupabaseAuthError(errorObj.message)
  }

  // Unknown error
  return {
    code: ErrorCodes.EXTERNAL_UNKNOWN,
    message: getErrorMessage(ErrorCodes.EXTERNAL_UNKNOWN),
  }
}
