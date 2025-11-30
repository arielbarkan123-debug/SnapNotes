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
