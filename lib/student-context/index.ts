/**
 * Student Context Loader
 *
 * Assembles a full StudentContext from 10 parallel Supabase queries.
 * Every feature (practice, homework, lessons, dashboard, SRS, exams)
 * consumes this context to personalize the experience.
 *
 * Pattern follows lib/user-profile.ts — accepts a SupabaseClient,
 * returns typed data with safe defaults for missing rows.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudentContext, CourseSnapshot } from './types'

// Re-export all types for convenience
export * from './types'

// =============================================================================
// Main function
// =============================================================================

/**
 * Load the full student context from multiple DB tables in parallel.
 *
 * Returns null only if the user has no learning profile at all (brand new user).
 * Otherwise returns a complete StudentContext with safe defaults for any
 * missing data.
 */
export async function getStudentContext(
  supabase: SupabaseClient,
  userId: string
): Promise<StudentContext | null> {
  const now = new Date()
  const startOfWeek = getStartOfWeek(now)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  // Run all 10 queries in parallel
  const [
    profileResult,
    refinementResult,
    mistakePatternsResult,
    gamificationResult,
    cardsDueTodayResult,
    overdueCardsResult,
    totalActiveCardsResult,
    studySessionsResult,
    masteryResult,
    progressResult,
  ] = await Promise.allSettled([
    // 1. user_learning_profile
    supabase
      .from('user_learning_profile')
      .select(
        'study_system, grade, subjects, subject_levels, exam_format, language, ' +
        'learning_styles, study_goal, preferred_study_time, difficulty_preference, ' +
        'speed_preference'
      )
      .eq('user_id', userId)
      .maybeSingle(),

    // 2. profile_refinement_state
    supabase
      .from('profile_refinement_state')
      .select(
        'rolling_accuracy, rolling_response_time_ms, confidence_calibration, ' +
        'estimated_ability, current_difficulty_target, accuracy_confidence'
      )
      .eq('user_id', userId)
      .maybeSingle(),

    // 3. mistake_patterns (latest non-stale)
    supabase
      .from('mistake_patterns')
      .select('patterns, insufficient_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 4. user_gamification
    supabase
      .from('user_gamification')
      .select(
        'current_streak, longest_streak, current_level, total_xp, ' +
        'last_activity_date, streak_freezes'
      )
      .eq('user_id', userId)
      .maybeSingle(),

    // 5. review_cards: cards due today
    supabase
      .from('review_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due_date', now.toISOString())
      .in('state', ['learning', 'review', 'relearning']),

    // 6. review_cards: overdue by 3+ days
    supabase
      .from('review_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due_date', threeDaysAgo.toISOString())
      .in('state', ['learning', 'review', 'relearning']),

    // 7. review_cards: total active (not 'new')
    supabase
      .from('review_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('state', 'new'),

    // 8. study_sessions this week (completed)
    supabase
      .from('study_sessions')
      .select('duration_seconds, started_at')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .gte('started_at', startOfWeek.toISOString()),

    // 9. user_mastery (per-course mastery scores)
    supabase
      .from('user_mastery')
      .select('course_id, mastery_score, last_practiced')
      .eq('user_id', userId),

    // 10. user_progress + courses (current lesson, completed lessons, course title)
    supabase
      .from('user_progress')
      .select(
        'course_id, current_lesson, completed_lessons, ' +
        'courses!inner(id, title, generated_course)'
      )
      .eq('user_id', userId),
  ])

  // ─── Extract results with safe fallbacks ─────────────────────────────────
  // Note: We cast extracted data to `any` because this project does not use
  // generated Supabase database types, so the client returns GenericStringError.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = extractSettled(profileResult) as Record<string, any> | null
  // If no profile at all, user hasn't onboarded yet — return null
  if (!profile) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refinement = extractSettled(refinementResult) as Record<string, any> | null
  const mistakeData = extractSettled(mistakePatternsResult) as MistakePatternRow | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gamification = extractSettled(gamificationResult) as Record<string, any> | null
  const studySessions = extractSettledArray(studySessionsResult) as unknown as StudySessionRow[]
  const masteryRows = extractSettledArray(masteryResult) as unknown as MasteryRow[]
  const progressRows = extractSettledArray(progressResult) as unknown as ProgressRow[]

  // Counts from head: true queries use the `count` property
  const cardsDueToday = extractSettledCount(cardsDueTodayResult)
  const overdueCardCount = extractSettledCount(overdueCardsResult)
  const totalActiveCards = extractSettledCount(totalActiveCardsResult)

  // ─── Compute derived fields ──────────────────────────────────────────────

  // Activity signals from study_sessions
  const { avgSessionLengthMinutes, peakStudyHour, totalStudyTimeThisWeekMinutes, sessionsThisWeek } =
    computeActivitySignals(studySessions)

  // Mistake patterns — flatten the AI-generated patterns into a frequency map
  const { mistakePatterns, mistakeDataSufficient } = computeMistakePatterns(mistakeData)

  // Rolling speed: convert response time (ms) to questions per minute
  const rollingResponseTimeMs = refinement?.rolling_response_time_ms ?? 0
  const rollingSpeed = rollingResponseTimeMs > 0
    ? 60000 / rollingResponseTimeMs
    : 0

  // Trend direction from accuracy_trend in profile, or derive from refinement data
  const trendDirection = deriveTrendDirection(profile)

  // Course snapshots
  const activeCourses = buildCourseSnapshots(progressRows, masteryRows)

  // Weakest / strongest course
  const { weakestCourseId, strongestCourseId } = findWeakestStrongest(activeCourses)

  // ─── Assemble context ────────────────────────────────────────────────────

  return {
    // Identity & Preferences
    userId,
    grade: profile.grade ?? null,
    studySystem: profile.study_system || 'general',
    subjects: profile.subjects || [],
    subjectLevels: profile.subject_levels || {},
    examFormat: profile.exam_format ?? null,
    language: (profile.language === 'he' ? 'he' : 'en') as 'en' | 'he',
    learningStyles: profile.learning_styles || ['practice'],
    studyGoal: profile.study_goal ?? null,
    preferredStudyTime: profile.preferred_study_time ?? null,
    difficultyPreference: profile.difficulty_preference ?? null,
    speedPreference: profile.speed_preference ?? null,

    // Live Performance
    rollingAccuracy: Number(refinement?.rolling_accuracy ?? 0.5),
    rollingSpeed: Number(rollingSpeed.toFixed(2)),
    rollingConfidence: Number(refinement?.confidence_calibration ?? 0),
    estimatedAbility: normalizeAbility(Number(refinement?.estimated_ability ?? 2.5)),
    trendDirection,
    trendStrength: Number(refinement?.accuracy_confidence ?? 0),
    currentDifficultyTarget: Number(refinement?.current_difficulty_target ?? 3),

    // Weaknesses
    weakConceptIds: [], // profile_refinement_state doesn't store these yet — placeholder
    mistakePatterns,
    mistakeDataSufficient,

    // Engagement
    currentStreak: gamification?.current_streak ?? 0,
    longestStreak: gamification?.longest_streak ?? 0,
    currentLevel: gamification?.current_level ?? 1,
    totalXp: gamification?.total_xp ?? 0,
    lastActivityDate: gamification?.last_activity_date ?? null,
    streakFreezes: gamification?.streak_freezes ?? 0,

    // Activity Signals
    avgSessionLengthMinutes,
    peakStudyHour,
    totalStudyTimeThisWeekMinutes,
    sessionsThisWeek,

    // Review Status
    cardsDueToday,
    overdueCardCount,
    totalActiveCards,

    // Course Context
    activeCourses,
    weakestCourseId,
    strongestCourseId,

    // Meta
    contextGeneratedAt: now.toISOString(),
  }
}

// =============================================================================
// Helper: extract from PromiseSettledResult
// =============================================================================

function extractSettled<T>(
  result: PromiseSettledResult<{ data: T | null; error: unknown }>
): T | null {
  if (result.status === 'fulfilled' && result.value?.data) {
    return result.value.data
  }
  return null
}

function extractSettledArray<T>(
  result: PromiseSettledResult<{ data: T[] | null; error: unknown }>
): T[] {
  if (result.status === 'fulfilled' && Array.isArray(result.value?.data)) {
    return result.value.data
  }
  return []
}

function extractSettledCount(
  result: PromiseSettledResult<{ count: number | null; data: unknown; error: unknown }>
): number {
  if (result.status === 'fulfilled' && result.value?.count != null) {
    return result.value.count
  }
  return 0
}

// =============================================================================
// Compute activity signals from study_sessions
// =============================================================================

interface StudySessionRow {
  duration_seconds: number | null
  started_at: string
}

function computeActivitySignals(sessions: StudySessionRow[]): {
  avgSessionLengthMinutes: number
  peakStudyHour: number | null
  totalStudyTimeThisWeekMinutes: number
  sessionsThisWeek: number
} {
  if (sessions.length === 0) {
    return {
      avgSessionLengthMinutes: 0,
      peakStudyHour: null,
      totalStudyTimeThisWeekMinutes: 0,
      sessionsThisWeek: 0,
    }
  }

  let totalSeconds = 0
  const hourCounts: Record<number, number> = {}

  for (const s of sessions) {
    totalSeconds += s.duration_seconds ?? 0

    const hour = new Date(s.started_at).getUTCHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  const totalMinutes = Math.round(totalSeconds / 60)
  const avgMinutes = Math.round(totalMinutes / sessions.length)

  // Peak study hour = most frequent start hour
  let peakHour: number | null = null
  let maxCount = 0
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count > maxCount) {
      maxCount = count
      peakHour = Number(hour)
    }
  }

  return {
    avgSessionLengthMinutes: avgMinutes,
    peakStudyHour: peakHour,
    totalStudyTimeThisWeekMinutes: totalMinutes,
    sessionsThisWeek: sessions.length,
  }
}

// =============================================================================
// Compute mistake patterns
// =============================================================================

interface MistakePatternRow {
  patterns: Array<{ patternName?: string; frequency?: number }> | null
  insufficient_data: boolean | null
}

function computeMistakePatterns(data: MistakePatternRow | null): {
  mistakePatterns: Record<string, number>
  mistakeDataSufficient: boolean
} {
  if (!data || !data.patterns || !Array.isArray(data.patterns)) {
    return {
      mistakePatterns: {},
      mistakeDataSufficient: false,
    }
  }

  const map: Record<string, number> = {}
  for (const pattern of data.patterns) {
    if (pattern.patternName && pattern.frequency) {
      map[pattern.patternName] = pattern.frequency
    }
  }

  return {
    mistakePatterns: map,
    mistakeDataSufficient: !data.insufficient_data,
  }
}

// =============================================================================
// Derive trend direction from user_learning_profile
// =============================================================================

function deriveTrendDirection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any>
): 'improving' | 'stable' | 'declining' {
  const trend = profile.accuracy_trend
  if (trend === 'improving') return 'improving'
  if (trend === 'declining') return 'declining'
  return 'stable'
}

// =============================================================================
// Normalize ability from 1-5 scale to 0-1
// =============================================================================

function normalizeAbility(ability: number): number {
  // estimated_ability is on a 1-5 scale; normalize to 0-1
  return Number(Math.max(0, Math.min(1, (ability - 1) / 4)).toFixed(2))
}

// =============================================================================
// Build course snapshots
// =============================================================================

interface ProgressRow {
  course_id: string
  current_lesson: number
  completed_lessons: number[]
  courses: {
    id: string
    title: string
    generated_course: {
      lessons?: unknown[]
      sections?: unknown[]
    }
  }
}

interface MasteryRow {
  course_id: string
  mastery_score: number
  last_practiced: string | null
}

function buildCourseSnapshots(
  progressRows: ProgressRow[],
  masteryRows: MasteryRow[]
): CourseSnapshot[] {
  const masteryMap = new Map<string, MasteryRow>()
  for (const row of masteryRows) {
    masteryMap.set(row.course_id, row)
  }

  return progressRows.map((p) => {
    const course = p.courses
    const mastery = masteryMap.get(p.course_id)
    const generatedCourse = course?.generated_course || {}
    const totalLessons = (generatedCourse.lessons || generatedCourse.sections || []).length

    return {
      courseId: p.course_id,
      title: course?.title || 'Untitled Course',
      masteryScore: Number(mastery?.mastery_score ?? 0),
      lastActivityAt: mastery?.last_practiced ?? null,
      lessonsCompleted: (p.completed_lessons || []).length,
      totalLessons,
      currentLesson: p.current_lesson ?? 0,
    }
  })
}

// =============================================================================
// Find weakest/strongest course
// =============================================================================

function findWeakestStrongest(courses: CourseSnapshot[]): {
  weakestCourseId: string | null
  strongestCourseId: string | null
} {
  if (courses.length === 0) {
    return { weakestCourseId: null, strongestCourseId: null }
  }

  let weakest: CourseSnapshot | null = null
  let strongest: CourseSnapshot | null = null

  for (const c of courses) {
    if (!weakest || c.masteryScore < weakest.masteryScore) {
      weakest = c
    }
    if (!strongest || c.masteryScore > strongest.masteryScore) {
      strongest = c
    }
  }

  return {
    weakestCourseId: weakest?.courseId ?? null,
    strongestCourseId: strongest?.courseId ?? null,
  }
}

// =============================================================================
// Date helpers
// =============================================================================

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
