/**
 * Smart Solver — Subject Classification Utilities
 *
 * Maps fine-grained SubjectCategory to verification strategies
 * and back to simple subject strings for compatibility with
 * the existing VerifiedProblem.subject field.
 */

import type { SubjectCategory, VerificationStrategy } from './types'

/**
 * Determine the verification strategy for a subject category.
 * - e2b_sympy: Full Python/SymPy independent computation (most accurate)
 * - mathjs_only: Lightweight mathjs verification (fast, basic arithmetic)
 * - ai_only: No computational verification (non-math subjects)
 */
export function getVerificationStrategy(category: SubjectCategory): VerificationStrategy {
  switch (category) {
    case 'math_algebra':
    case 'math_calculus':
    case 'math_geometry':
    case 'math_trigonometry':
    case 'math_statistics':
    case 'physics':
      return 'e2b_sympy'
    case 'math_arithmetic':
    case 'chemistry':
      return 'mathjs_only'
    case 'biology':
    case 'history':
    case 'literature':
    case 'language':
    case 'general':
    default:
      return 'ai_only'
  }
}

/**
 * Shorthand: does this subject support E2B compute verification?
 */
export function isComputeVerifiable(category: SubjectCategory): boolean {
  return getVerificationStrategy(category) === 'e2b_sympy'
}

/**
 * Map a SubjectCategory back to a simple subject string
 * compatible with VerifiedProblem.subject.
 */
export function getSubjectFromCategory(category: SubjectCategory): string {
  switch (category) {
    case 'math_arithmetic':
      return 'mathematics'
    case 'math_algebra':
      return 'algebra'
    case 'math_calculus':
      return 'calculus'
    case 'math_geometry':
      return 'geometry'
    case 'math_trigonometry':
      return 'trigonometry'
    case 'math_statistics':
      return 'statistics'
    case 'physics':
      return 'physics'
    case 'chemistry':
      return 'chemistry'
    case 'biology':
      return 'biology'
    case 'history':
      return 'history'
    case 'literature':
      return 'literature'
    case 'language':
      return 'language'
    case 'general':
    default:
      return 'general'
  }
}
