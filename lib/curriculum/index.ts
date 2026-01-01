/**
 * Curriculum Module
 *
 * Provides curriculum context for AI personalization.
 * Supports IB, A-Levels, AP, Israeli Bagrut, and other education systems.
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
  StudySystem,
  ExamFormat,
  ContextPurpose,
  SystemOverview,
  SubjectOverview,
  TopicDetails,
  CurriculumContext,
  CurriculumContextMetadata,
  ContextBuilderOptions,
  SubjectDetectionResult,
  AvailableSubject,
  SystemSubjects,
  UserCurriculumProfile,
  AssessmentComponent,
  AssessmentObjective,
  TopicListItem,
  KeyConcept,
  Misconception,
  ExamFocus,
  CommandTerm,
  GradeDescription,
  ExamFormatConfig,
  // Grade types
  IBGrade,
  BagrutGrade,
  ALevelGrade,
  APGrade,
  USGrade,
  GeneralGrade,
  SystemGrade,
  GradeOption,
  SystemGradeConfig,
  LevelType,
  LevelConfig,
  CurriculumSetupStatus,
} from './types'

// =============================================================================
// Context Builder Exports
// =============================================================================

export {
  buildCurriculumContext,
  buildCourseContext,
  buildExamContext,
  buildChatContext,
  formatContextForPrompt,
  hasSignificantContext,
} from './context-builder'

// =============================================================================
// Loader Exports
// =============================================================================

export {
  loadSystemOverview,
  loadSubjectOverview,
  loadTopicDetails,
  loadAvailableSubjects,
  clearCurriculumCache,
  getCacheStats,
  preloadSystem,
  hasSystemData,
  hasSubjectData,
  hasTopicData,
} from './loader'

// =============================================================================
// Subject Detection Exports
// =============================================================================

export {
  detectSubjectFromContent,
  detectTopicFromContent,
  getAvailableSubjectsForSystem,
  isValidSubject,
} from './subject-detector'

// =============================================================================
// Grade Configuration Exports
// =============================================================================

export {
  getGradesForSystem,
  getDefaultGrade,
  getLevelConfig,
  hasSubjectLevels,
  getDefaultLevel,
  hasCurriculumData,
  getGradeLabel,
  getLevelLabel,
  isYoungGrade,
} from './grades'
