import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/progress
 *
 * Returns comprehensive progress analytics for the current user
 * Data sources:
 * - study_sessions: Total study time tracking
 * - review_logs: Card review history and accuracy
 * - practice_logs: Practice session data
 * - step_performance: Lesson step performance
 * - lesson_progress: Per-lesson mastery and completion
 * - user_gamification: Streaks, XP, levels
 * - user_learning_profile: Learning preferences
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate date ranges
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startOfWeek = getStartOfWeek(now)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch all data in parallel (with error handling for missing tables)
    const [
      reviewLogsWeekResult,
      reviewLogsMonthResult,
      reviewLogs30DaysResult,
      reviewLogs7DaysResult,
      previousPeriodLogsResult,
      practiceLogsWeekResult,
      practiceLogs30DaysResult,
      practiceLogsPrevPeriodResult,
      studySessionsWeekResult,
      studySessionsMonthResult,
      coursesResult,
      lessonProgressResult,
      stepPerformanceResult,
      userProfileResult,
      gamificationStatsResult,
    ] = await Promise.allSettled([
      // Review logs this week (limit to prevent memory issues)
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', startOfWeek.toISOString())
        .limit(1000),

      // Review logs this month
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', startOfMonth.toISOString())
        .limit(5000),

      // Review logs last 30 days (for accuracy chart)
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', thirtyDaysAgo.toISOString())
        .order('reviewed_at', { ascending: true })
        .limit(5000),

      // Review logs last 7 days (for time chart)
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', sevenDaysAgo.toISOString())
        .order('reviewed_at', { ascending: true })
        .limit(1000),

      // Previous 7 days (for trend comparison)
      supabase
        .from('review_logs')
        .select('id, rating')
        .eq('user_id', user.id)
        .gte('reviewed_at', fourteenDaysAgo.toISOString())
        .lt('reviewed_at', sevenDaysAgo.toISOString())
        .limit(1000),

      // Practice logs this week (mixed practice sessions)
      supabase
        .from('practice_logs')
        .select('id, was_correct, duration_ms, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(1000),

      // Practice logs last 30 days (for chart)
      supabase
        .from('practice_logs')
        .select('id, was_correct, duration_ms, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(5000),

      // Practice logs previous 7 days (for trend)
      supabase
        .from('practice_logs')
        .select('id, was_correct')
        .eq('user_id', user.id)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())
        .limit(1000),

      // Study sessions this week
      supabase
        .from('study_sessions')
        .select('duration_seconds, session_type, started_at')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('started_at', startOfWeek.toISOString())
        .limit(500),

      // Study sessions this month
      supabase
        .from('study_sessions')
        .select('duration_seconds, session_type, started_at')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('started_at', startOfMonth.toISOString())
        .limit(1000),

      // User's courses (reasonable limit for UI)
      supabase
        .from('courses')
        .select('id, title, cover_image_url, generated_course')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),

      // Lesson progress - select only needed fields for mastery calculations
      supabase
        .from('lesson_progress')
        .select('id, course_id, lesson_index, lesson_title, completed, mastery_level, total_attempts, total_correct')
        .eq('user_id', user.id)
        .order('mastery_level', { ascending: true })
        .limit(1000),

      // Step performance for fallback mastery calculation (limited to prevent memory issues)
      supabase
        .from('step_performance')
        .select('course_id, lesson_index, was_correct, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1000),

      // User learning profile - select only fields needed for insights
      supabase
        .from('user_learning_profile')
        .select('preferred_study_time, optimal_session_length, peak_performance_hour, accuracy_trend, study_goal')
        .eq('user_id', user.id)
        .maybeSingle(),

      // Gamification stats - select only fields needed for insights
      supabase
        .from('user_gamification')
        .select('current_streak, total_xp')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    // Helper to safely extract data from PromiseSettledResult
    function extractData<T>(result: PromiseSettledResult<{ data: T | null; error: unknown }>): T | null {
      if (result.status === 'fulfilled' && result.value?.data) {
        return result.value.data
      }
      return null
    }

    // Extract data with fallbacks (handles rejected promises gracefully)
    const weekLogs: ReviewLog[] = (extractData(reviewLogsWeekResult) || []) as ReviewLog[]
    const monthLogs: ReviewLog[] = (extractData(reviewLogsMonthResult) || []) as ReviewLog[]
    const last30DaysLogs: ReviewLog[] = (extractData(reviewLogs30DaysResult) || []) as ReviewLog[]
    const last7DaysLogs: ReviewLog[] = (extractData(reviewLogs7DaysResult) || []) as ReviewLog[]
    const prevPeriodLogs: ReviewLog[] = (extractData(previousPeriodLogsResult) || []) as ReviewLog[]
    const practiceLogsWeek: PracticeLog[] = (extractData(practiceLogsWeekResult) || []) as PracticeLog[]
    const practiceLogs30Days: PracticeLog[] = (extractData(practiceLogs30DaysResult) || []) as PracticeLog[]
    const practiceLogsPrevPeriod: PracticeLog[] = (extractData(practiceLogsPrevPeriodResult) || []) as PracticeLog[]
    const studySessionsWeek: StudySession[] = (extractData(studySessionsWeekResult) || []) as StudySession[]
    const studySessionsMonth: StudySession[] = (extractData(studySessionsMonthResult) || []) as StudySession[]
    const courses: Course[] = (extractData(coursesResult) || []) as Course[]
    const lessonProgress: LessonProgress[] = (extractData(lessonProgressResult) || []) as LessonProgress[]
    const stepPerformance: StepPerformance[] = (extractData(stepPerformanceResult) || []) as StepPerformance[]
    const userProfile = extractData(userProfileResult) as LearningProfile | null
    const gamificationStats = extractData(gamificationStatsResult) as GamificationStats | null

    // =========================================================================
    // Study Time Calculations
    // =========================================================================

    // From review_logs (card review duration in ms)
    const reviewTimeWeekMs = weekLogs.reduce((sum, l) => sum + (l.review_duration_ms || 0), 0)
    const reviewTimeMonthMs = monthLogs.reduce((sum, l) => sum + (l.review_duration_ms || 0), 0)

    // From practice_logs (duration in ms)
    const practiceTimeWeekMs = practiceLogsWeek.reduce((sum, l) => sum + (l.duration_ms || 0), 0)
    const practiceTimeMonthMs = practiceLogs30Days.reduce((sum, l) => sum + (l.duration_ms || 0), 0)

    // From study_sessions (session duration in seconds)
    const sessionTimeWeekSec = studySessionsWeek.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
    const sessionTimeMonthSec = studySessionsMonth.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)

    // Total study time in milliseconds
    const studyTimeWeek = reviewTimeWeekMs + practiceTimeWeekMs + (sessionTimeWeekSec * 1000)
    const studyTimeMonth = reviewTimeMonthMs + practiceTimeMonthMs + (sessionTimeMonthSec * 1000)

    // =========================================================================
    // Cards Reviewed with Trend (combines review_logs + practice_logs)
    // =========================================================================
    const reviewCardsThisPeriod = last7DaysLogs.length
    const practiceCardsThisPeriod = practiceLogsWeek.length
    const cardsThisPeriod = reviewCardsThisPeriod + practiceCardsThisPeriod

    const reviewCardsPrevPeriod = prevPeriodLogs.length
    const practiceCardsPrevPeriod = practiceLogsPrevPeriod.length
    const cardsPrevPeriod = reviewCardsPrevPeriod + practiceCardsPrevPeriod

    const cardsTrend = cardsPrevPeriod > 0
      ? ((cardsThisPeriod - cardsPrevPeriod) / cardsPrevPeriod) * 100
      : cardsThisPeriod > 0 ? 100 : 0

    // =========================================================================
    // Accuracy Calculations (combines review_logs + practice_logs)
    // =========================================================================
    // Review logs: rating >= 3 = correct
    const reviewCorrectThisPeriod = last7DaysLogs.filter(l => l.rating >= 3).length
    // Practice logs: was_correct = true
    const practiceCorrectThisPeriod = practiceLogsWeek.filter(l => l.was_correct === true).length
    const correctThisPeriod = reviewCorrectThisPeriod + practiceCorrectThisPeriod

    const accuracyThisPeriod = cardsThisPeriod > 0
      ? Math.round((correctThisPeriod / cardsThisPeriod) * 100)
      : 0

    const reviewCorrectPrevPeriod = prevPeriodLogs.filter(l => l.rating >= 3).length
    const practiceCorrectPrevPeriod = practiceLogsPrevPeriod.filter(l => l.was_correct === true).length
    const correctPrevPeriod = reviewCorrectPrevPeriod + practiceCorrectPrevPeriod

    const accuracyPrevPeriod = cardsPrevPeriod > 0
      ? Math.round((correctPrevPeriod / cardsPrevPeriod) * 100)
      : 0

    const accuracyTrend = accuracyPrevPeriod > 0
      ? accuracyThisPeriod - accuracyPrevPeriod
      : 0

    // =========================================================================
    // Mastery Calculation
    // =========================================================================
    let avgMastery = 0
    let totalLessons = 0

    if (lessonProgress.length > 0) {
      // Use lesson_progress table if available
      totalLessons = lessonProgress.length
      avgMastery = lessonProgress.reduce((sum, lp) => sum + (lp.mastery_level || 0), 0) / totalLessons
    } else if (stepPerformance.length > 0) {
      // Fallback: calculate from step_performance
      const lessonMastery = calculateMasteryFromStepPerformance(stepPerformance)
      totalLessons = Object.keys(lessonMastery).length
      if (totalLessons > 0) {
        avgMastery = Object.values(lessonMastery).reduce((sum, m) => sum + m, 0) / totalLessons
      }
    }

    // =========================================================================
    // Build Charts Data
    // =========================================================================
    const accuracyChart = buildDailyAccuracyData(last30DaysLogs, practiceLogs30Days, stepPerformance, 30)
    const timeChart = buildDailyTimeData(last7DaysLogs, practiceLogsWeek, studySessionsWeek, 7)

    // =========================================================================
    // Build Mastery Map (per course with lessons)
    // =========================================================================
    const masteryMap = buildMasteryMap(courses, lessonProgress, stepPerformance)

    // =========================================================================
    // Weak and Strong Areas
    // =========================================================================
    const { weakAreas, strongAreas } = getWeakAndStrongAreas(
      courses,
      lessonProgress,
      stepPerformance
    )

    // =========================================================================
    // Generate Insights
    // =========================================================================
    const insights = generateInsights(
      userProfile,
      accuracyChart,
      timeChart,
      weakAreas,
      strongAreas,
      gamificationStats
    )

    return NextResponse.json({
      overview: {
        studyTime: {
          week: studyTimeWeek,
          month: studyTimeMonth,
        },
        cardsReviewed: {
          count: cardsThisPeriod,
          trend: Math.round(cardsTrend),
        },
        accuracy: {
          percent: accuracyThisPeriod,
          trend: accuracyTrend,
        },
        mastery: {
          percent: Math.round(avgMastery * 100),
          totalLessons,
        },
      },
      accuracyChart,
      timeChart,
      masteryMap,
      weakAreas,
      strongAreas,
      insights,
    })
  } catch (error) {
    console.error('Progress API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

interface ReviewLog {
  id: string
  rating: number
  review_duration_ms: number | null
  reviewed_at: string
}

interface StepPerformance {
  course_id: string
  lesson_index: number
  was_correct: boolean | null
  created_at: string
}

interface StudySession {
  duration_seconds: number | null
  session_type: string
  started_at: string
}

interface PracticeLog {
  id: string
  was_correct: boolean | null
  duration_ms: number | null
  created_at: string
}

interface Course {
  id: string
  title: string
  cover_image_url: string | null
  generated_course: {
    lessons?: Array<{ title?: string; steps?: unknown[] }>
    sections?: Array<{ title?: string; steps?: unknown[] }>
  }
}

interface LessonProgress {
  id: string
  course_id: string
  lesson_index: number
  lesson_title: string | null
  completed: boolean
  mastery_level: number
  total_attempts: number
  total_correct: number
}

/**
 * Calculate mastery from step_performance when lesson_progress is empty
 */
function calculateMasteryFromStepPerformance(steps: StepPerformance[]): Record<string, number> {
  const lessonData: Record<string, { correct: number; total: number; lastDate: Date }> = {}

  for (const step of steps) {
    if (step.was_correct === null) continue

    const key = `${step.course_id}-${step.lesson_index}`
    if (!lessonData[key]) {
      lessonData[key] = { correct: 0, total: 0, lastDate: new Date(0) }
    }

    lessonData[key].total++
    if (step.was_correct) lessonData[key].correct++

    const stepDate = new Date(step.created_at)
    if (stepDate > lessonData[key].lastDate) {
      lessonData[key].lastDate = stepDate
    }
  }

  const mastery: Record<string, number> = {}
  for (const [key, data] of Object.entries(lessonData)) {
    if (data.total === 0) continue

    const accuracy = data.correct / data.total
    const daysSince = (Date.now() - data.lastDate.getTime()) / (1000 * 60 * 60 * 24)

    let recencyWeight = 1.0
    if (daysSince > 14) recencyWeight = 0.6
    else if (daysSince > 7) recencyWeight = 0.7
    else if (daysSince > 3) recencyWeight = 0.85

    mastery[key] = Math.min(accuracy * recencyWeight, 1.0)
  }

  return mastery
}

/**
 * Build daily accuracy data for chart
 */
function buildDailyAccuracyData(
  reviewLogs: ReviewLog[],
  practiceLogs: PracticeLog[],
  stepPerformance: StepPerformance[],
  days: number
) {
  const data: { date: string; accuracy: number; count: number }[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // From review_logs
    const dayReviewLogs = reviewLogs.filter(l => l.reviewed_at.startsWith(dateStr))
    const reviewCorrect = dayReviewLogs.filter(l => l.rating >= 3).length

    // From practice_logs
    const dayPracticeLogs = practiceLogs.filter(l => l.created_at.startsWith(dateStr))
    const practiceCorrect = dayPracticeLogs.filter(l => l.was_correct === true).length

    // From step_performance
    const daySteps = stepPerformance.filter(s => s.created_at.startsWith(dateStr) && s.was_correct !== null)
    const stepCorrect = daySteps.filter(s => s.was_correct).length

    const totalCount = dayReviewLogs.length + dayPracticeLogs.length + daySteps.length
    const totalCorrect = reviewCorrect + practiceCorrect + stepCorrect
    const accuracy = totalCount > 0 ? Math.round((totalCorrect / totalCount) * 100) : 0

    data.push({
      date: dateStr,
      accuracy,
      count: totalCount,
    })
  }

  return data
}

/**
 * Build daily time data for chart
 */
function buildDailyTimeData(
  reviewLogs: ReviewLog[],
  practiceLogs: PracticeLog[],
  studySessions: StudySession[],
  days: number
) {
  const data: { date: string; minutes: number; dayLabel: string }[] = []
  const now = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // From review_logs (ms)
    const dayReviewLogs = reviewLogs.filter(l => l.reviewed_at.startsWith(dateStr))
    const reviewTimeMs = dayReviewLogs.reduce((sum, l) => sum + (l.review_duration_ms || 0), 0)

    // From practice_logs (ms)
    const dayPracticeLogs = practiceLogs.filter(l => l.created_at.startsWith(dateStr))
    const practiceTimeMs = dayPracticeLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0)

    // From study_sessions (seconds)
    const daySessions = studySessions.filter(s => s.started_at.startsWith(dateStr))
    const sessionTimeSec = daySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)

    // Total minutes
    const totalMinutes = Math.round((reviewTimeMs / 60000) + (practiceTimeMs / 60000) + (sessionTimeSec / 60))

    data.push({
      date: dateStr,
      minutes: totalMinutes,
      dayLabel: dayNames[date.getDay()],
    })
  }

  return data
}

/**
 * Build mastery map for all courses
 */
function buildMasteryMap(
  courses: Course[],
  lessonProgress: LessonProgress[],
  stepPerformance: StepPerformance[]
) {
  // Calculate mastery from step_performance for fallback
  const stepMastery = calculateMasteryFromStepPerformance(stepPerformance)

  return courses.map(course => {
    // Get lessons from generated_course
    const generatedCourse = course.generated_course || {}
    const lessons = generatedCourse.lessons || generatedCourse.sections || []

    const lessonsWithMastery = lessons.map((lesson, index) => {
      // Try lesson_progress first
      const progress = lessonProgress.find(
        lp => lp.course_id === course.id && lp.lesson_index === index
      )

      // Fallback to step_performance
      const fallbackMastery = stepMastery[`${course.id}-${index}`] || 0

      return {
        id: `${course.id}-${index}`,
        title: lesson?.title || `Lesson ${index + 1}`,
        order: index,
        mastery: progress?.mastery_level || fallbackMastery,
        completed: progress?.completed || false,
      }
    })

    const totalMastery = lessonsWithMastery.reduce((sum, l) => sum + l.mastery, 0)
    const avgMastery = lessonsWithMastery.length > 0
      ? totalMastery / lessonsWithMastery.length
      : 0

    return {
      id: course.id,
      title: course.title,
      coverImage: course.cover_image_url,
      mastery: avgMastery,
      lessons: lessonsWithMastery,
      lessonCount: lessonsWithMastery.length,
      completedCount: lessonsWithMastery.filter(l => l.completed).length,
    }
  })
}

/**
 * Get weak and strong areas
 */
function getWeakAndStrongAreas(
  courses: Course[],
  lessonProgress: LessonProgress[],
  stepPerformance: StepPerformance[]
) {
  const stepMastery = calculateMasteryFromStepPerformance(stepPerformance)

  // Build list of all lessons with mastery
  interface LessonArea {
    lessonId: string
    lessonTitle: string
    courseId: string
    courseTitle: string
    mastery: number
    completed: boolean
  }

  const allLessons: LessonArea[] = []

  for (const course of courses) {
    const generatedCourse = course.generated_course || {}
    const lessons = generatedCourse.lessons || generatedCourse.sections || []

    lessons.forEach((lesson, index) => {
      const progress = lessonProgress.find(
        lp => lp.course_id === course.id && lp.lesson_index === index
      )
      const fallbackMastery = stepMastery[`${course.id}-${index}`] || 0
      const mastery = progress?.mastery_level || fallbackMastery

      allLessons.push({
        lessonId: `${course.id}-${index}`,
        lessonTitle: lesson?.title || progress?.lesson_title || `Lesson ${index + 1}`,
        courseId: course.id,
        courseTitle: course.title,
        mastery,
        completed: progress?.completed || false,
      })
    })
  }

  // Weak areas: mastery < 0.5
  const weakAreas = allLessons
    .filter(l => l.mastery < 0.5 && l.mastery > 0) // Has some activity but low mastery
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5)

  // Strong areas: mastery >= 0.8 and completed
  const strongAreas = allLessons
    .filter(l => l.mastery >= 0.8)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 5)

  return { weakAreas, strongAreas }
}

/**
 * Generate personalized insights
 */
interface LearningProfile {
  preferred_study_time: string | null
  optimal_session_length: number | null
  peak_performance_hour: number | null
  accuracy_trend: string | null
  study_goal: string | null
}

interface GamificationStats {
  current_streak: number
  total_xp: number
}

interface LessonArea {
  lessonTitle: string
  courseTitle: string
}

function generateInsights(
  profile: LearningProfile | null,
  accuracyChart: { date: string; accuracy: number; count: number }[],
  timeChart: { date: string; minutes: number }[],
  weakAreas: LessonArea[],
  strongAreas: LessonArea[],
  gamification: GamificationStats | null
): { icon: string; text: string; type: 'positive' | 'neutral' | 'suggestion' }[] {
  const insights: { icon: string; text: string; type: 'positive' | 'neutral' | 'suggestion' }[] = []

  // Time-based insight
  if (profile?.preferred_study_time) {
    const timeLabels: Record<string, string> = {
      morning: 'in the morning',
      afternoon: 'in the afternoon',
      evening: 'in the evening',
      varies: 'at different times',
    }
    insights.push({
      icon: '🌅',
      text: `You study best ${timeLabels[profile.preferred_study_time] || 'throughout the day'}`,
      type: 'positive',
    })
  }

  // Accuracy trend insight
  const recentAccuracy = accuracyChart.slice(-7).filter(d => d.count > 0)
  const avgRecent = recentAccuracy.length > 0
    ? recentAccuracy.reduce((sum, d) => sum + d.accuracy, 0) / recentAccuracy.length
    : 0
  const olderAccuracy = accuracyChart.slice(0, 14).filter(d => d.count > 0)
  const avgOlder = olderAccuracy.length > 0
    ? olderAccuracy.reduce((sum, d) => sum + d.accuracy, 0) / olderAccuracy.length
    : avgRecent

  if (avgRecent > avgOlder + 5) {
    insights.push({
      icon: '📈',
      text: 'Your accuracy is improving! Keep up the great work.',
      type: 'positive',
    })
  } else if (avgRecent < avgOlder - 5 && avgRecent > 0) {
    insights.push({
      icon: '💡',
      text: 'Your accuracy has dipped recently. Try shorter, more focused sessions.',
      type: 'suggestion',
    })
  }

  // Study consistency insight
  const studyDays = timeChart.filter(d => d.minutes > 0).length
  if (studyDays >= 5) {
    insights.push({
      icon: '🔥',
      text: `You studied ${studyDays} out of the last 7 days. Excellent consistency!`,
      type: 'positive',
    })
  } else if (studyDays <= 2 && studyDays > 0) {
    insights.push({
      icon: '📅',
      text: 'Try to study more consistently. Even 5 minutes daily helps retention.',
      type: 'suggestion',
    })
  } else if (studyDays === 0) {
    insights.push({
      icon: '📚',
      text: 'Start reviewing to build your study streak!',
      type: 'suggestion',
    })
  }

  // Weak area suggestion
  if (weakAreas.length > 0) {
    const weakLesson = weakAreas[0]
    insights.push({
      icon: '🎯',
      text: `Focus on "${weakLesson.lessonTitle}" from ${weakLesson.courseTitle} to improve.`,
      type: 'suggestion',
    })
  }

  // Streak celebration
  if (gamification?.current_streak && gamification.current_streak >= 7) {
    insights.push({
      icon: '🏆',
      text: `Amazing ${gamification.current_streak}-day streak! You're building a strong habit.`,
      type: 'positive',
    })
  } else if (gamification?.current_streak && gamification.current_streak >= 3) {
    insights.push({
      icon: '🔥',
      text: `${gamification.current_streak}-day streak! Keep going to build momentum.`,
      type: 'positive',
    })
  }

  // Strong area celebration
  if (strongAreas.length >= 3) {
    insights.push({
      icon: '⭐',
      text: `You've mastered ${strongAreas.length} lessons. Your hard work is paying off!`,
      type: 'positive',
    })
  }

  // Session length insight
  if (profile?.optimal_session_length) {
    insights.push({
      icon: '⏱️',
      text: `Your optimal session length is ${profile.optimal_session_length} minutes.`,
      type: 'neutral',
    })
  }

  // No activity insight
  if (studyDays === 0 && weakAreas.length === 0 && strongAreas.length === 0) {
    insights.push({
      icon: '🚀',
      text: 'Complete some lessons to start tracking your progress!',
      type: 'suggestion',
    })
  }

  return insights.slice(0, 5)
}
