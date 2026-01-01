// =============================================================================
// Practice Module Exports
// =============================================================================

// Types
export * from './types'

// Question Generator
export {
  generatePracticeQuestions,
  storePracticeQuestions,
  generateAndStoreQuestions,
  selectExistingQuestions,
  type SelectQuestionsOptions,
} from './question-generator'

// Session Manager
export {
  createPracticeSession,
  getSession,
  getSessionProgress,
  getCurrentQuestion,
  getSessionQuestions,
  recordAnswer,
  completeSession,
  pauseSession,
  resumeSession,
  abandonSession,
  getUserPracticeStats,
  getActiveSessions,
  getRecentSessions,
} from './session-manager'
