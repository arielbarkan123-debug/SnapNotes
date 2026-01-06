/**
 * Profile Module
 *
 * Dynamic Profile Refinement System (RLPA-Style)
 * Based on research: "Architecting an End-to-End AI Pipeline for
 * Personalized Educational Content Transformation"
 */

// Core refinement engine
export {
  type RefinementState,
  type QuestionSignal,
  type SessionSignal,
  type SelfAssessmentSignal,
  type RefinementSignal,
  type RefinementUpdate,
  EMA_ALPHA,
  UPDATE_THRESHOLDS,
  RATE_LIMITS,
  applyEMA,
  calculateConfidence,
  canUpdate,
  processLearningSignal,
  getRefinementState,
  initializeRefinementState,
  createProfileSnapshot,
  rollbackProfile,
  getProfileHistory,
} from './refinement-engine'

// Signal processors
export { processQuestionSignal } from './signals/question-signal'
export { processSessionSignal, getTimeOfDay } from './signals/session-signal'
export {
  processSelfAssessmentSignal,
  type CalibrationInsight,
} from './signals/self-assessment-signal'

// Profile synchronization
export {
  type UserLearningProfile,
  type EffectiveProfile,
  type SyncResult,
  getUserProfile,
  calculateEffectiveProfile,
  syncRefinementToProfile,
  lockAttribute,
  unlockAttribute,
  getLockedAttributes,
} from './profile-sync'
