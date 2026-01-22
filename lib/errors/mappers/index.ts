/**
 * Error Mappers Index
 *
 * Exports all error mapping functions
 */

// Supabase error mappers
export {
  mapSupabaseAuthError,
  mapSupabaseDatabaseError,
  mapSupabaseStorageError,
  mapSupabaseError,
  type MappedError as SupabaseMappedError,
} from './supabase'

// Claude API error mappers
export {
  mapClaudeAPIError,
  mapStreamingError,
  mapResponseParseError,
  mapVisionError,
  type MappedError as ClaudeMappedError,
  type ClaudeAPIError,
} from './claude'

// Validation error mappers
export {
  mapFieldValidationError,
  mapBodyValidationError,
  mapParamValidationError,
  mapQueryValidationError,
  mapFileValidationError,
  mapValidationError,
  mapZodError,
  mapZodErrorSingle,
  type MappedError as ValidationMappedError,
  type ValidationError,
} from './validation'
