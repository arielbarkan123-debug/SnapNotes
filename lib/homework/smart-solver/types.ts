/**
 * Smart Solver Pipeline — Type Definitions
 *
 * Extends the existing homework checker types with decomposition,
 * sub-problem solving, and compute verification types.
 */

// ============================================================================
// Subject Classification
// ============================================================================

/** Fine-grained subject classification for decomposition strategy */
export type SubjectCategory =
  | 'math_arithmetic'
  | 'math_algebra'
  | 'math_calculus'
  | 'math_geometry'
  | 'math_trigonometry'
  | 'math_statistics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'history'
  | 'literature'
  | 'language'
  | 'general'

/** Determines how the final answer is verified */
export type VerificationStrategy = 'e2b_sympy' | 'mathjs_only' | 'ai_only'

// ============================================================================
// Decomposition Types (Step 1)
// ============================================================================

/** A single atomic sub-problem produced by the Decompose step */
export interface SubProblem {
  /** Unique ID, e.g. "q1_sub1" */
  id: string
  /** Parent problem ID, e.g. "q1" */
  parentProblemId: string
  /** What this sub-problem asks */
  description: string
  /** IDs of sub-problems that must be solved first */
  dependsOn: string[]
  /** For math: specific formula; for non-math: analysis method */
  formulaOrMethod: string
  /** Extracted values/context needed for this sub-problem */
  givenValues: Record<string, string>
  /** Execution order (1-based) */
  order: number
}

/** A decomposed problem ready for solving */
export interface DecomposedProblem {
  /** Problem ID, e.g. "q1" */
  id: string
  /** Original question text */
  questionText: string
  /** Fine-grained subject classification */
  subjectCategory: SubjectCategory
  /** How the answer should be verified */
  verificationStrategy: VerificationStrategy
  /** Atomic sub-problems in dependency order */
  subProblems: SubProblem[]
  /** Student answer (only in combined-image mode) */
  studentAnswer?: string
  /** Confidence of student answer reading */
  studentAnswerConfidence?: 'high' | 'medium' | 'low'
}

/** Output of Step 1: Classify & Decompose */
export interface DecompositionResult {
  problems: DecomposedProblem[]
  detectedLanguage: string
}

// ============================================================================
// Solve Types (Step 2)
// ============================================================================

/** Result of solving a single sub-problem */
export interface SubProblemSolution {
  subProblemId: string
  /** The answer to this sub-problem */
  result: string
  /** Step-by-step work shown */
  workShown: string
  confidence: 'high' | 'medium' | 'low'
}

/** A decomposed problem with all sub-problems solved */
export interface SolvedDecomposedProblem extends DecomposedProblem {
  subProblemSolutions: SubProblemSolution[]
  /** Final combined answer */
  finalAnswer: string
  /** Flattened solution steps from all sub-problems */
  solutionSteps: string[]
}

// ============================================================================
// Compute Verification Types (Step 3)
// ============================================================================

/** Result of E2B/SymPy compute verification for a single problem */
export interface ComputeVerificationResult {
  problemId: string
  /** Answer computed independently by SymPy */
  computedAnswer: string
  /** The SymPy code that was executed */
  sympyCode: string
  /** Whether AI's answer matches the computed answer */
  matchesAI: boolean
  /** Time taken for computation in ms */
  computeTimeMs: number
  /** Number of E2B execution attempts */
  attempts: number
}

// ============================================================================
// Retry Types (Step 4)
// ============================================================================

/** Result of an auto-retry attempt */
export interface RetryResult {
  problemId: string
  originalAnswer: string
  correctedAnswer: string
  correctedSteps: string[]
  retryAttempt: number
  /** How the disagreement was resolved */
  resolvedVia: 'ai_correction' | 'compute_accepted' | 'unresolved'
}

// ============================================================================
// Pipeline Metadata
// ============================================================================

/** Execution stats for observability */
export interface SmartSolverMetadata {
  pipelineUsed: boolean
  totalAICalls: number
  totalComputeCalls: number
  totalTimeMs: number
  problemBreakdown: Array<{
    problemId: string
    subjectCategory: SubjectCategory
    verificationStrategy: VerificationStrategy
    subProblemCount: number
    retryCount: number
    verified: boolean
  }>
  fallbackReason?: string
}
