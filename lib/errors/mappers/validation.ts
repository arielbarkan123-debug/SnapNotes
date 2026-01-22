/**
 * Validation Error Mapper
 *
 * Maps validation errors to NoteSnap error codes
 */

import { type ErrorCode, ErrorCodes } from '../codes'
import { getErrorMessage } from '../messages'

// ============================================================================
// Types
// ============================================================================

export interface MappedError {
  code: ErrorCode
  message: string
  field?: string
}

export interface ValidationError {
  field?: string
  message?: string
  code?: string
  type?: string
  path?: string | string[]
  value?: unknown
}

// ============================================================================
// Field Validation Error Mapping
// ============================================================================

/**
 * Maps a field validation error to an error code
 */
export function mapFieldValidationError(error: ValidationError): MappedError {
  const message = (error.message || '').toLowerCase()
  const field = error.field || (Array.isArray(error.path) ? error.path.join('.') : error.path)

  // Required field
  if (
    message.includes('required') ||
    message.includes('missing') ||
    message.includes('must provide') ||
    error.type === 'required'
  ) {
    return {
      code: ErrorCodes.FIELD_REQUIRED,
      message: field ? `${field} is required.` : getErrorMessage(ErrorCodes.FIELD_REQUIRED),
      field,
    }
  }

  // Invalid type
  if (
    message.includes('invalid type') ||
    message.includes('expected') ||
    message.includes('must be') ||
    error.type === 'type'
  ) {
    return {
      code: ErrorCodes.FIELD_INVALID_TYPE,
      message: field ? `${field} has an invalid type.` : getErrorMessage(ErrorCodes.FIELD_INVALID_TYPE),
      field,
    }
  }

  // Too short
  if (
    message.includes('too short') ||
    message.includes('at least') ||
    message.includes('minimum') ||
    message.includes('min')
  ) {
    return {
      code: ErrorCodes.FIELD_TOO_SHORT,
      message: field ? `${field} is too short.` : getErrorMessage(ErrorCodes.FIELD_TOO_SHORT),
      field,
    }
  }

  // Too long
  if (
    message.includes('too long') ||
    message.includes('at most') ||
    message.includes('maximum') ||
    message.includes('max')
  ) {
    return {
      code: ErrorCodes.FIELD_TOO_LONG,
      message: field ? `${field} is too long.` : getErrorMessage(ErrorCodes.FIELD_TOO_LONG),
      field,
    }
  }

  // Invalid format
  if (
    message.includes('format') ||
    message.includes('pattern') ||
    message.includes('invalid') ||
    error.type === 'format'
  ) {
    return {
      code: ErrorCodes.FIELD_INVALID_FORMAT,
      message: field ? `${field} has an invalid format.` : getErrorMessage(ErrorCodes.FIELD_INVALID_FORMAT),
      field,
    }
  }

  // Out of range
  if (
    message.includes('range') ||
    message.includes('between') ||
    message.includes('greater than') ||
    message.includes('less than')
  ) {
    return {
      code: ErrorCodes.FIELD_OUT_OF_RANGE,
      message: field ? `${field} is out of range.` : getErrorMessage(ErrorCodes.FIELD_OUT_OF_RANGE),
      field,
    }
  }

  // Default field error
  return {
    code: ErrorCodes.FIELD_INVALID_FORMAT,
    message: field ? `${field} is invalid.` : getErrorMessage(ErrorCodes.FIELD_INVALID_FORMAT),
    field,
  }
}

// ============================================================================
// Request Body Validation
// ============================================================================

/**
 * Maps request body validation errors to error codes
 */
export function mapBodyValidationError(error: unknown): MappedError {
  if (error instanceof SyntaxError) {
    return {
      code: ErrorCodes.BODY_INVALID_JSON,
      message: getErrorMessage(ErrorCodes.BODY_INVALID_JSON),
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // No body
    if (
      message.includes('body is empty') ||
      message.includes('no body') ||
      message.includes('body required')
    ) {
      return {
        code: ErrorCodes.BODY_REQUIRED,
        message: getErrorMessage(ErrorCodes.BODY_REQUIRED),
      }
    }

    // JSON parse error
    if (
      message.includes('json') ||
      message.includes('parse') ||
      message.includes('unexpected token')
    ) {
      return {
        code: ErrorCodes.BODY_INVALID_JSON,
        message: getErrorMessage(ErrorCodes.BODY_INVALID_JSON),
      }
    }

    // Body too large
    if (
      message.includes('too large') ||
      message.includes('payload too large') ||
      message.includes('entity too large')
    ) {
      return {
        code: ErrorCodes.BODY_TOO_LARGE,
        message: getErrorMessage(ErrorCodes.BODY_TOO_LARGE),
      }
    }
  }

  return {
    code: ErrorCodes.VALIDATION_UNKNOWN,
    message: getErrorMessage(ErrorCodes.VALIDATION_UNKNOWN),
  }
}

// ============================================================================
// URL Parameter Validation
// ============================================================================

/**
 * Maps URL parameter validation errors to error codes
 */
export function mapParamValidationError(paramName: string, error?: string): MappedError {
  const message = (error || '').toLowerCase()

  if (
    message.includes('required') ||
    message.includes('missing') ||
    !error
  ) {
    return {
      code: ErrorCodes.PARAM_REQUIRED,
      message: `Parameter '${paramName}' is required.`,
    }
  }

  return {
    code: ErrorCodes.PARAM_INVALID,
    message: `Parameter '${paramName}' is invalid.`,
  }
}

// ============================================================================
// Query Parameter Validation
// ============================================================================

/**
 * Maps query parameter validation errors to error codes
 */
export function mapQueryValidationError(paramName?: string, error?: string): MappedError {
  const message = (error || '').toLowerCase()

  if (paramName && (message.includes('required') || message.includes('missing'))) {
    return {
      code: ErrorCodes.QUERY_PARAM_REQUIRED,
      message: `Query parameter '${paramName}' is required.`,
    }
  }

  return {
    code: ErrorCodes.QUERY_INVALID,
    message: paramName
      ? `Query parameter '${paramName}' is invalid.`
      : getErrorMessage(ErrorCodes.QUERY_INVALID),
  }
}

// ============================================================================
// File Validation
// ============================================================================

/**
 * Maps file validation errors to error codes
 */
export function mapFileValidationError(error: unknown): MappedError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // File too large
    if (message.includes('too large') || message.includes('size')) {
      return {
        code: ErrorCodes.FILE_TOO_LARGE,
        message: getErrorMessage(ErrorCodes.FILE_TOO_LARGE),
      }
    }

    // Invalid type
    if (
      message.includes('type') ||
      message.includes('mime') ||
      message.includes('format') ||
      message.includes('extension')
    ) {
      return {
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: getErrorMessage(ErrorCodes.INVALID_FILE_TYPE),
      }
    }

    // No files
    if (message.includes('no file') || message.includes('missing file')) {
      return {
        code: ErrorCodes.NO_FILES_PROVIDED,
        message: getErrorMessage(ErrorCodes.NO_FILES_PROVIDED),
      }
    }

    // Too many files
    if (message.includes('too many') || message.includes('limit')) {
      return {
        code: ErrorCodes.TOO_MANY_FILES,
        message: getErrorMessage(ErrorCodes.TOO_MANY_FILES),
      }
    }

    // Corrupted
    if (message.includes('corrupt') || message.includes('invalid file') || message.includes('damaged')) {
      return {
        code: ErrorCodes.FILE_CORRUPTED,
        message: getErrorMessage(ErrorCodes.FILE_CORRUPTED),
      }
    }

    // Empty
    if (message.includes('empty') || message.includes('0 bytes')) {
      return {
        code: ErrorCodes.FILE_EMPTY,
        message: getErrorMessage(ErrorCodes.FILE_EMPTY),
      }
    }
  }

  return {
    code: ErrorCodes.UPLOAD_UNKNOWN,
    message: getErrorMessage(ErrorCodes.UPLOAD_UNKNOWN),
  }
}

// ============================================================================
// Generic Validation Error Mapping
// ============================================================================

/**
 * Maps any validation error to the appropriate error code
 */
export function mapValidationError(
  error: unknown,
  context?: 'body' | 'field' | 'param' | 'query' | 'file'
): MappedError {
  switch (context) {
    case 'body':
      return mapBodyValidationError(error)
    case 'field':
      return mapFieldValidationError(error as ValidationError)
    case 'file':
      return mapFileValidationError(error)
    case 'param':
      if (typeof error === 'string') {
        return mapParamValidationError(error)
      }
      return mapParamValidationError('unknown')
    case 'query':
      if (typeof error === 'string') {
        return mapQueryValidationError(error)
      }
      return mapQueryValidationError()
    default:
      // Try to determine the type
      if (error instanceof SyntaxError) {
        return mapBodyValidationError(error)
      }
      if (error && typeof error === 'object' && 'field' in error) {
        return mapFieldValidationError(error as ValidationError)
      }
      return {
        code: ErrorCodes.VALIDATION_UNKNOWN,
        message: getErrorMessage(ErrorCodes.VALIDATION_UNKNOWN),
      }
  }
}

// ============================================================================
// Zod Error Mapping (if using Zod)
// ============================================================================

interface ZodIssue {
  code: string
  path: (string | number)[]
  message: string
  minimum?: number
  maximum?: number
  type?: string
}

interface ZodError {
  issues: ZodIssue[]
}

/**
 * Maps Zod validation errors to NoteSnap error codes
 */
export function mapZodError(error: ZodError): MappedError[] {
  return error.issues.map((issue) => {
    const field = issue.path.join('.')

    switch (issue.code) {
      case 'invalid_type':
        if (issue.type === 'undefined') {
          return {
            code: ErrorCodes.FIELD_REQUIRED,
            message: `${field} is required.`,
            field,
          }
        }
        return {
          code: ErrorCodes.FIELD_INVALID_TYPE,
          message: `${field} has an invalid type.`,
          field,
        }

      case 'too_small':
        return {
          code: ErrorCodes.FIELD_TOO_SHORT,
          message: issue.minimum
            ? `${field} must be at least ${issue.minimum} characters.`
            : `${field} is too short.`,
          field,
        }

      case 'too_big':
        return {
          code: ErrorCodes.FIELD_TOO_LONG,
          message: issue.maximum
            ? `${field} must be at most ${issue.maximum} characters.`
            : `${field} is too long.`,
          field,
        }

      case 'invalid_string':
        return {
          code: ErrorCodes.FIELD_INVALID_FORMAT,
          message: `${field} has an invalid format.`,
          field,
        }

      case 'custom':
        return {
          code: ErrorCodes.FIELD_INVALID_FORMAT,
          message: issue.message || `${field} is invalid.`,
          field,
        }

      default:
        return {
          code: ErrorCodes.VALIDATION_UNKNOWN,
          message: issue.message || `${field} is invalid.`,
          field,
        }
    }
  })
}

/**
 * Gets the first Zod error as a single MappedError
 */
export function mapZodErrorSingle(error: ZodError): MappedError {
  const errors = mapZodError(error)
  return errors[0] || {
    code: ErrorCodes.VALIDATION_UNKNOWN,
    message: getErrorMessage(ErrorCodes.VALIDATION_UNKNOWN),
  }
}
