// Utility hooks
export { useDebounce } from './useDebounce'
export { useInView } from './useInView'

// SWR-powered data hooks
export {
  useCourses,
  COURSES_CACHE_KEY,
  type SortOrder,
  type UseCoursesOptions,
  type UseCoursesReturn,
} from './useCourses'

export {
  useExams,
  EXAMS_CACHE_KEY,
  getExamsCacheKey,
  type Exam,
  type UseExamsOptions,
  type UseExamsReturn,
} from './useExams'

export {
  useStats,
  STATS_CACHE_KEY,
  type GamificationStats,
  type UseStatsReturn,
} from './useStats'

export {
  useStreak,
  STREAK_CACHE_KEY,
  type StreakData,
  type UseStreakReturn,
} from './useStreak'

export {
  useProgress,
  PROGRESS_CACHE_KEY,
  type ProgressData,
  type UseProgressReturn,
} from './useProgress'

// PWA / Service Worker
export { useServiceWorker } from './useServiceWorker'

// Network Status
export { useOnlineStatus } from './useOnlineStatus'

// Curriculum
export { useCurriculumStatus } from './useCurriculumStatus'

// Knowledge Gaps
export { usePrerequisiteCheck } from './usePrerequisiteCheck'
export {
  useKnowledgeGaps,
  GAPS_CACHE_KEY,
  type UseKnowledgeGapsOptions,
  type UseKnowledgeGapsReturn,
} from './useKnowledgeGaps'
export { useConceptMastery } from './useConceptMastery'
export {
  useCourseMastery,
  type UseCourseMasteryOptions,
  type UseCourseMasteryReturn,
} from './useCourseMastery'

// Adaptive Difficulty
export {
  useAdaptiveDifficulty,
  useResponseTimer,
} from './useAdaptiveDifficulty'

// Practice Sessions
export {
  usePracticeSession,
  usePracticeStats,
  PRACTICE_SESSION_KEY,
  PRACTICE_STATS_KEY,
  type CreateSessionOptions,
  type UsePracticeSessionReturn,
  type UsePracticeStatsReturn,
} from './usePracticeSession'

// Past Exam Templates
export {
  usePastExamTemplates,
  PAST_EXAMS_CACHE_KEY,
  type UsePastExamTemplatesReturn,
} from './usePastExamTemplates'
