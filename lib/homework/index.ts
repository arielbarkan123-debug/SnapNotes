/**
 * Homework Help Feature
 * Socratic tutoring system for guided homework assistance
 */

// Types
export * from './types'

// Question Analysis
export { analyzeQuestion, analyzeMultipleQuestions } from './question-analyzer'

// Reference Analysis
export { analyzeReferences, checkRelevance } from './reference-analyzer'

// Tutoring Engine
export {
  generateInitialGreeting,
  generateTutorResponse,
  checkForSolution,
  getComfortLevelGuidance,
} from './tutor-engine'

// Hint Generation
export {
  generateHint,
  getHintLevelInfo,
  getRecommendedHintLevel,
  shouldEncourageAttempt,
} from './hint-generator'

// Session Management
export {
  createSession,
  getSession,
  getUserSessions,
  updateSession,
  deleteSession,
  addMessage,
  updateProgress,
  completeSession,
  getRecentMessages,
} from './session-manager'
