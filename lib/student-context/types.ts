/**
 * Student Context Types
 *
 * Defines the full StudentContext assembled from multiple DB tables,
 * plus StudentDirectives that downstream features consume to
 * personalize the learning experience.
 */

// =============================================================================
// Raw Context (assembled from DB)
// =============================================================================

export interface StudentContext {
  // Identity & Preferences (from user_learning_profile)
  userId: string
  grade: string | null
  studySystem: string
  subjects: string[]
  subjectLevels: Record<string, string>
  examFormat: string | null
  language: 'en' | 'he'
  learningStyles: string[]
  studyGoal: string | null
  preferredStudyTime: string | null
  difficultyPreference: string | null
  speedPreference: string | null

  // Live Performance (from profile_refinement_state)
  rollingAccuracy: number         // 0-1
  rollingSpeed: number            // questions/minute
  rollingConfidence: number       // self-efficacy 0-1
  estimatedAbility: number        // 0-1
  trendDirection: 'improving' | 'stable' | 'declining'
  trendStrength: number           // 0-1
  currentDifficultyTarget: number // 1-5

  // Weaknesses (from profile_refinement_state + mistake_patterns)
  weakConceptIds: string[]
  mistakePatterns: Record<string, number> // { algebraic: 3, arithmetic: 1 }
  mistakeDataSufficient: boolean

  // Engagement (from user_gamification)
  currentStreak: number
  longestStreak: number
  currentLevel: number
  totalXp: number
  lastActivityDate: string | null
  streakFreezes: number

  // Activity Signals (computed from study_sessions)
  avgSessionLengthMinutes: number
  peakStudyHour: number | null       // 0-23, actual not self-reported
  totalStudyTimeThisWeekMinutes: number
  sessionsThisWeek: number

  // Review Status (from review_cards)
  cardsDueToday: number
  overdueCardCount: number           // cards overdue by 3+ days
  totalActiveCards: number

  // Course Context (from user_progress + lesson_progress + user_mastery)
  activeCourses: CourseSnapshot[]
  weakestCourseId: string | null
  strongestCourseId: string | null

  // Meta
  contextGeneratedAt: string         // ISO timestamp
}

export interface CourseSnapshot {
  courseId: string
  title: string
  masteryScore: number              // 0-1
  lastActivityAt: string | null
  lessonsCompleted: number
  totalLessons: number
  currentLesson: number
}

// =============================================================================
// Directives types
// =============================================================================

export interface StudentDirectives {
  practice: PracticeDirectives
  homework: HomeworkDirectives
  lessons: LessonDirectives
  dashboard: DashboardDirectives
  srs: SrsDirectives
  exams: ExamDirectives
}

export interface PracticeDirectives {
  recommendedConceptIds: string[]
  targetDifficulty: number
  recommendedSessionLength: number
  questionTypeWeights: Record<string, number>
  avoidConceptIds: string[]
  urgentGaps: UrgentGap[]
}

export interface UrgentGap {
  conceptId: string
  reason: string
}

export interface HomeworkDirectives {
  explanationDepth: 'brief' | 'standard' | 'detailed'
  anticipatedMisconceptions: string[]
  scaffoldingLevel: number
  preferredExplanationStyle: 'visual' | 'step-by-step' | 'analogy' | 'mixed'
  knownPrerequisiteGaps: string[]
  studentAbilitySummary: string
}

export interface LessonDirectives {
  pacing: 'accelerated' | 'standard' | 'reinforced'
  skipWorkedExamples: boolean
  extraPracticeSteps: number
  prerequisiteReviewNeeded: PrerequisiteGap[]
  contentFormat: 'concise' | 'detailed'
}

export interface PrerequisiteGap {
  conceptName: string
  courseId: string | null
  lessonIndex: number | null
}

export interface DashboardDirectives {
  primaryAction: DashboardAction
  nudge: string | null
  courseOrder: string[]
  streakRisk: boolean
  celebrationDue: string | null
  weeklyGoalProgress: number
}

export interface DashboardAction {
  type: 'review_cards' | 'continue_lesson' | 'practice_weak' | 'start_exam_prep' | 'take_break'
  label: string
  courseId?: string
  count?: number
}

export interface SrsDirectives {
  priorityCardIds: string[]
  adjustedNewCardLimit: number
  retireSuggestionIds: string[]
  interleaveRecommended: boolean
}

export interface ExamDirectives {
  weakTopicWeights: Record<string, number>
  targetDifficulty: number
  focusQuestionTypes: string[]
  estimatedScore: number
}
