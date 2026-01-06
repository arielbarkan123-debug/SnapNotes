/**
 * Adaptive Difficulty Types
 *
 * Type definitions for the adaptive difficulty system that
 * adjusts question difficulty based on student performance.
 */

// =============================================================================
// Enums & Constants
// =============================================================================

/**
 * Bloom's Taxonomy cognitive levels
 * Used to ensure variety in question types
 */
export type CognitiveLevel =
  | 'remember'    // Level 1: Recall facts
  | 'understand'  // Level 2: Explain ideas
  | 'apply'       // Level 3: Use in new situations
  | 'analyze'     // Level 4: Draw connections
  | 'evaluate'    // Level 5: Justify decisions
  | 'create'      // Level 6: Produce new work

/**
 * Source of the question
 */
export type QuestionSource = 'exam' | 'lesson' | 'practice' | 'srs'

/**
 * Difficulty level (1-5 scale)
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

// =============================================================================
// Configuration
// =============================================================================

export const ADAPTIVE_CONFIG = {
  // Target success rate for optimal learning (Zone of Proximal Development)
  targetSuccessRate: 0.75,

  // How much to adjust difficulty after streaks
  adjustmentStep: 0.3,
  streakBonus: 0.1,

  // Difficulty bounds
  minDifficulty: 1,
  maxDifficulty: 5,

  // Learning rate for rolling average
  rollingAverageAlpha: 0.1,

  // Learning rate for ability estimation (IRT)
  abilityLearningRate: 0.3,

  // Streak thresholds for difficulty adjustment
  streakThreshold: 3,

  // Success rate thresholds
  successRateHigh: 0.85,  // Increase difficulty above this
  successRateLow: 0.65,   // Decrease difficulty below this
} as const

// =============================================================================
// Database Models
// =============================================================================

/**
 * Question difficulty metadata from database
 */
export interface QuestionDifficulty {
  id: string
  question_source: QuestionSource
  question_id: string
  base_difficulty: number
  empirical_difficulty: number | null
  primary_concept_id: string | null
  cognitive_level: CognitiveLevel | null
  times_shown: number
  times_correct: number
  avg_response_time_ms: number | null
  created_at: string
  updated_at: string
}

/**
 * User's current performance state
 */
export interface UserPerformanceState {
  id: string
  user_id: string
  course_id: string | null
  session_difficulty_level: number
  target_difficulty: number
  rolling_accuracy: number
  rolling_response_time_ms: number
  estimated_ability: number
  correct_streak: number
  wrong_streak: number
  last_cognitive_level: CognitiveLevel | null
  questions_answered: number
  session_start: string | null
  created_at: string
  updated_at: string
}

/**
 * Historical performance snapshot
 */
export interface PerformanceHistoryEntry {
  id: string
  user_id: string
  course_id: string | null
  accuracy: number
  estimated_ability: number
  questions_answered: number
  recorded_at: string
}

// =============================================================================
// Algorithm Types
// =============================================================================

/**
 * Input for recording a question answer
 */
export interface AnswerRecord {
  userId: string
  courseId?: string
  questionId: string
  questionSource: QuestionSource
  isCorrect: boolean
  responseTimeMs?: number
  questionDifficulty?: number
  conceptId?: string
  usedHint?: boolean
}

/**
 * Question with scoring for adaptive selection
 */
export interface ScoredQuestion {
  questionId: string
  score: number
  difficultyMatch: number
  conceptPriority: number
  varietyBonus: number
}

/**
 * Options for adaptive question selection
 */
export interface QuestionSelectionOptions {
  userId: string
  courseId?: string
  availableQuestionIds: string[]
  weakConceptIds?: string[]
  excludeQuestionIds?: string[]
  count?: number
}

/**
 * Result of difficulty calculation
 */
export interface DifficultyResult {
  targetDifficulty: number
  adjustmentReason: 'streak_up' | 'streak_down' | 'accuracy_high' | 'accuracy_low' | 'stable'
  currentAccuracy: number
  estimatedAbility: number
}

/**
 * Performance update result
 */
export interface PerformanceUpdateResult {
  newState: UserPerformanceState
  difficultyChanged: boolean
  newDifficulty: number
  feedback: {
    message: string
    type: 'encouragement' | 'challenge' | 'neutral'
  }
}

// =============================================================================
// API Types
// =============================================================================

/**
 * Request to record an answer
 */
export interface RecordAnswerRequest {
  question_id: string
  question_source: QuestionSource
  is_correct: boolean
  response_time_ms?: number
  question_difficulty?: number
  concept_id?: string
}

/**
 * Response after recording an answer
 */
export interface RecordAnswerResponse {
  success: boolean
  new_difficulty: number
  estimated_ability: number
  accuracy: number
  streak: number
  feedback?: string
}

/**
 * Request to get adaptive question selection
 */
export interface SelectQuestionsRequest {
  course_id?: string
  available_question_ids: string[]
  weak_concept_ids?: string[]
  count?: number
}

/**
 * Response with selected questions
 */
export interface SelectQuestionsResponse {
  questions: ScoredQuestion[]
  target_difficulty: number
  user_ability: number
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Question with difficulty info for selection
 */
export interface QuestionWithDifficulty {
  id: string
  difficulty: number
  empiricalDifficulty?: number
  cognitiveLevel?: CognitiveLevel
  conceptId?: string
  lastSeenAt?: string
  timesShown?: number
}

/**
 * Performance summary for UI display
 */
export interface PerformanceSummary {
  accuracy: number
  accuracyTrend: 'improving' | 'declining' | 'stable'
  currentDifficulty: number
  estimatedAbility: number
  questionsAnswered: number
  streak: number
  streakType: 'correct' | 'wrong' | 'none'
}
