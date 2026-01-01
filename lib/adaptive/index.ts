/**
 * Adaptive Difficulty System
 *
 * Exports the adaptive difficulty algorithm and utilities for
 * adjusting question difficulty based on student performance.
 *
 * Key Features:
 * - Target ~75% success rate (Zone of Proximal Development)
 * - Real-time difficulty adjustment
 * - Streak-based bonuses/penalties
 * - Item Response Theory for ability estimation
 */

// Types
export type {
  CognitiveLevel,
  QuestionSource,
  DifficultyLevel,
  QuestionDifficulty,
  UserPerformanceState,
  PerformanceHistoryEntry,
  AnswerRecord,
  ScoredQuestion,
  QuestionSelectionOptions,
  DifficultyResult,
  PerformanceUpdateResult,
  RecordAnswerRequest,
  RecordAnswerResponse,
  SelectQuestionsRequest,
  SelectQuestionsResponse,
  QuestionWithDifficulty,
  PerformanceSummary,
} from './types'

export { ADAPTIVE_CONFIG } from './types'

// Question Selection
export {
  calculateTargetDifficulty,
  scoreQuestion,
  selectQuestions,
  getOrCreatePerformanceState,
  selectAdaptiveQuestions,
  getWeakConceptIds,
  default as questionSelector,
} from './question-selector'

// Performance Tracking
export {
  recordAnswer,
  getPerformanceSummary,
  resetSessionState,
  savePerformanceSnapshot,
  default as realtimeAdjuster,
} from './realtime-adjuster'
