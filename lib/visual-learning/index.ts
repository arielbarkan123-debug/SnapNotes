/**
 * Visual Learning System
 *
 * Core infrastructure for diagram schema validation.
 * Used by tutor-engine.ts for validating AI-generated diagram data.
 */

// Types
export * from './types'

// Validator (only exports used by tutor-engine.ts)
export {
  validateSchema,
  autoCorrectDiagram,
} from './validator'
