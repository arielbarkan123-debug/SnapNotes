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

// Re-export directives engine
export { generateDirectives } from './directives'

// Re-export fatigue detection
export { detectSessionFatigue, computeAccuracyIntervals } from './fatigue-detector'
export type { FatigueSignal, AccuracyInterval } from './fatigue-detector'

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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Run all 14 queries in parallel
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
    fatigueSessionsResult,
    explanationEngagementResult,
    featureAffinityResult,
    answerBehaviorResult,
  ] = await Promise.allSettled([
    // 1. user_learning_profile
    supabase
      .from('user_learning_profile')
      .select(
        'study_system, grade, subjects, subject_levels, exam_format, language, ' +
        'learning_styles, study_goal, preferred_study_time, difficulty_preference, ' +
        'speed_preference, accuracy_trend'
      )
      .eq('user_id', userId)
      .maybeSingle(),

    // 2. profile_refinement_state
    supabase
      .from('profile_refinement_state')
      .select(
        'rolling_accuracy, rolling_response_time_ms, confidence_calibration, ' +
        'estimated_ability, current_difficulty_target, accuracy_confidence, weak_concept_ids'
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

    // 11. study_sessions: fatigue data (last 30 days, where fatigue was detected)
    supabase
      .from('study_sessions')
      .select('fatigue_detected, fatigue_detected_at_minute, started_at')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .not('fatigue_detected', 'is', null),

    // 12. explanation_engagement: reading time and effectiveness
    supabase
      .from('explanation_engagement')
      .select('time_spent_reading_ms, next_similar_question_correct')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),

    // 13. feature_affinity: most-used features
    supabase
      .from('feature_affinity')
      .select('feature_name, visit_count, total_time_ms')
      .eq('user_id', userId)
      .order('visit_count', { ascending: false })
      .limit(20),

    // 14. practice_session_questions: answer behavior (revision data)
    // Note: practice_session_questions has no user_id column, so we query
    // practice_sessions filtered by user_id and select related questions.
    supabase
      .from('practice_sessions')
      .select('practice_session_questions(answer_revision_count, revision_helped, time_to_first_action_ms, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
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

  // New implicit data queries
  const fatigueSessions = extractSettledArray(fatigueSessionsResult) as unknown as FatigueSessionRow[]
  const explanationRows = extractSettledArray(explanationEngagementResult) as unknown as ExplanationEngagementRow[]
  const featureAffinityRows = extractSettledArray(featureAffinityResult) as unknown as FeatureAffinityRow[]
  // Answer behavior comes from sessions with nested questions — flatten
  const answerBehaviorSessions = extractSettledArray(answerBehaviorResult) as unknown as Array<{
    practice_session_questions: AnswerBehaviorRow[]
  }>
  const answerBehaviorRows: AnswerBehaviorRow[] = answerBehaviorSessions
    .flatMap(s => s.practice_session_questions || [])

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
    : 1.0

  // Trend direction from accuracy_trend in profile, or derive from refinement data
  const trendDirection = deriveTrendDirection(profile)

  // Course snapshots
  const activeCourses = buildCourseSnapshots(progressRows, masteryRows)

  // Weakest / strongest course
  const { weakestCourseId, strongestCourseId } = findWeakestStrongest(activeCourses)

  // Fatigue signals
  const { avgFatigueOnsetMinute, lastSessionFatigued } = computeFatigueSignals(fatigueSessions)

  // Explanation engagement
  const { avgExplanationReadTimeMs, explanationEffectiveness } =
    computeExplanationEngagement(explanationRows)

  // Feature affinity
  const { preferredFeatures, underusedFeatures } = computeFeatureAffinity(featureAffinityRows)

  // Answer behavior
  const { revisionRate, revisionHelpsRate, avgTimeToFirstActionMs } =
    computeAnswerBehavior(answerBehaviorRows)

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
    weakConceptIds: Array.isArray(refinement?.weak_concept_ids) ? refinement.weak_concept_ids : [],
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

    // Fatigue Signals
    avgFatigueOnsetMinute,
    lastSessionFatigued,

    // Explanation Engagement
    avgExplanationReadTimeMs,
    explanationEffectiveness,

    // Feature Affinity
    preferredFeatures,
    underusedFeatures,

    // Answer Behavior
    revisionRate,
    revisionHelpsRate,
    avgTimeToFirstActionMs,

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
  if (result.status === 'rejected') {
    console.warn('[student-context] Query rejected:', result.reason)
    return null
  }
  if (result.value?.error) {
    console.warn('[student-context] Supabase error:', result.value.error)
  }
  if (result.value?.data) {
    return result.value.data
  }
  return null
}

function extractSettledArray<T>(
  result: PromiseSettledResult<{ data: T[] | null; error: unknown }>
): T[] {
  if (result.status === 'rejected') {
    console.warn('[student-context] Query rejected:', result.reason)
    return []
  }
  if (result.value?.error) {
    console.warn('[student-context] Supabase error:', result.value.error)
  }
  if (Array.isArray(result.value?.data)) {
    return result.value.data
  }
  return []
}

function extractSettledCount(
  result: PromiseSettledResult<{ count: number | null; data: unknown; error: unknown }>
): number {
  if (result.status === 'rejected') {
    console.warn('[student-context] Query rejected:', result.reason)
    return 0
  }
  if (result.value?.error) {
    console.warn('[student-context] Supabase error:', result.value.error)
  }
  if (result.value?.count != null) {
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

// =============================================================================
// Fatigue signals from study_sessions
// =============================================================================

interface FatigueSessionRow {
  fatigue_detected: boolean | null
  fatigue_detected_at_minute: number | null
  started_at: string
}

function computeFatigueSignals(sessions: FatigueSessionRow[]): {
  avgFatigueOnsetMinute: number | null
  lastSessionFatigued: boolean
} {
  if (sessions.length === 0) {
    return { avgFatigueOnsetMinute: null, lastSessionFatigued: false }
  }

  // Compute average fatigue onset minute from sessions that have it
  const onsetMinutes = sessions
    .filter(s => s.fatigue_detected_at_minute != null && s.fatigue_detected_at_minute > 0)
    .map(s => s.fatigue_detected_at_minute!)

  const avgFatigueOnsetMinute = onsetMinutes.length > 0
    ? Math.round(onsetMinutes.reduce((a, b) => a + b, 0) / onsetMinutes.length)
    : null

  // Check if most recent session had fatigue
  // Sessions come from query ordered by started_at via gte filter — pick most recent
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )
  const lastSessionFatigued = sorted[0]?.fatigue_detected === true

  return { avgFatigueOnsetMinute, lastSessionFatigued }
}

// =============================================================================
// Explanation engagement
// =============================================================================

interface ExplanationEngagementRow {
  time_spent_reading_ms: number | null
  next_similar_question_correct: boolean | null
}

function computeExplanationEngagement(rows: ExplanationEngagementRow[]): {
  avgExplanationReadTimeMs: number
  explanationEffectiveness: number
} {
  if (rows.length === 0) {
    return { avgExplanationReadTimeMs: 0, explanationEffectiveness: 0 }
  }

  // Average read time
  const readTimes = rows
    .filter(r => r.time_spent_reading_ms != null && r.time_spent_reading_ms > 0)
    .map(r => r.time_spent_reading_ms!)

  const avgExplanationReadTimeMs = readTimes.length > 0
    ? Math.round(readTimes.reduce((a, b) => a + b, 0) / readTimes.length)
    : 0

  // Effectiveness: ratio of rows where next_similar_question_correct = true
  const withOutcome = rows.filter(r => r.next_similar_question_correct !== null)
  const correctAfter = withOutcome.filter(r => r.next_similar_question_correct === true).length
  const explanationEffectiveness = withOutcome.length > 0
    ? Number((correctAfter / withOutcome.length).toFixed(2))
    : 0

  return { avgExplanationReadTimeMs, explanationEffectiveness }
}

// =============================================================================
// Feature affinity
// =============================================================================

interface FeatureAffinityRow {
  feature_name: string
  visit_count: number
  total_time_ms: number | null
}

// All features the app offers — used to compute underused features
const ALL_APP_FEATURES = [
  'practice', 'homework', 'review', 'exams', 'dashboard', 'courses', 'study-plan',
]

function computeFeatureAffinity(rows: FeatureAffinityRow[]): {
  preferredFeatures: string[]
  underusedFeatures: string[]
} {
  if (rows.length === 0) {
    return { preferredFeatures: [], underusedFeatures: [...ALL_APP_FEATURES] }
  }

  // Top 3 by visit_count (already sorted DESC from query)
  const preferredFeatures = rows.slice(0, 3).map(r => r.feature_name)

  // Features the user hasn't used much (visit_count < 3)
  const usedFeatureSet = new Set(rows.filter(r => r.visit_count >= 3).map(r => r.feature_name))
  const underusedFeatures = ALL_APP_FEATURES.filter(f => !usedFeatureSet.has(f))

  return { preferredFeatures, underusedFeatures }
}

// =============================================================================
// Answer behavior from practice_session_questions
// =============================================================================

interface AnswerBehaviorRow {
  answer_revision_count: number | null
  revision_helped: boolean | null
  time_to_first_action_ms: number | null
}

function computeAnswerBehavior(rows: AnswerBehaviorRow[]): {
  revisionRate: number
  revisionHelpsRate: number
  avgTimeToFirstActionMs: number
} {
  if (rows.length === 0) {
    return { revisionRate: 0, revisionHelpsRate: 0, avgTimeToFirstActionMs: 0 }
  }

  // Revision rate: % of rows where answer_revision_count > 0
  const revisedRows = rows.filter(
    r => r.answer_revision_count != null && r.answer_revision_count > 0
  )
  const revisionRate = Number((revisedRows.length / rows.length).toFixed(2))

  // Revision helps rate: % of revised rows where revision_helped = true
  const helpedRows = revisedRows.filter(r => r.revision_helped === true)
  const revisionHelpsRate = revisedRows.length > 0
    ? Number((helpedRows.length / revisedRows.length).toFixed(2))
    : 0

  // Average time to first action
  const actionTimes = rows
    .filter(r => r.time_to_first_action_ms != null && r.time_to_first_action_ms > 0)
    .map(r => r.time_to_first_action_ms!)

  const avgTimeToFirstActionMs = actionTimes.length > 0
    ? Math.round(actionTimes.reduce((a, b) => a + b, 0) / actionTimes.length)
    : 0

  return { revisionRate, revisionHelpsRate, avgTimeToFirstActionMs }
}
