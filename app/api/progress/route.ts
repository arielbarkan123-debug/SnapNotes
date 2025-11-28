import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/progress
 *
 * Returns comprehensive progress analytics for the current user
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
    const today = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startOfWeek = getStartOfWeek(now)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch all data in parallel
    const [
      reviewLogsWeek,
      reviewLogsMonth,
      reviewLogs30Days,
      reviewLogs7Days,
      previousPeriodLogs,
      courseProgress,
      lessonProgress,
      userProfile,
      gamificationStats,
    ] = await Promise.all([
      // Review logs this week
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', startOfWeek.toISOString()),

      // Review logs this month
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', startOfMonth.toISOString()),

      // Review logs last 30 days (for accuracy chart)
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', thirtyDaysAgo.toISOString())
        .order('reviewed_at', { ascending: true }),

      // Review logs last 7 days (for time chart)
      supabase
        .from('review_logs')
        .select('id, rating, review_duration_ms, reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', sevenDaysAgo.toISOString())
        .order('reviewed_at', { ascending: true }),

      // Previous 7 days (for trend comparison)
      supabase
        .from('review_logs')
        .select('id, rating')
        .eq('user_id', user.id)
        .gte('reviewed_at', new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .lt('reviewed_at', sevenDaysAgo.toISOString()),

      // Course progress with course details
      supabase
        .from('courses')
        .select(`
          id,
          title,
          cover_image_url,
          lessons(
            id,
            title,
            order_index,
            lesson_progress(
              mastery_level,
              completed
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // All lesson progress for weak/strong areas
      supabase
        .from('lesson_progress')
        .select(`
          lesson_id,
          mastery_level,
          completed,
          lessons!inner(
            id,
            title,
            course_id,
            courses!inner(title)
          )
        `)
        .eq('user_id', user.id)
        .order('mastery_level', { ascending: true }),

      // User learning profile
      supabase
        .from('user_learning_profile')
        .select('*')
        .eq('user_id', user.id)
        .single(),

      // Gamification stats
      supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .single(),
    ])

    // Calculate overview stats
    const weekLogs = reviewLogsWeek.data || []
    const monthLogs = reviewLogsMonth.data || []
    const last30DaysLogs = reviewLogs30Days.data || []
    const last7DaysLogs = reviewLogs7Days.data || []
    const prevPeriodLogs = previousPeriodLogs.data || []

    // Study time calculations
    const studyTimeWeek = weekLogs.reduce((sum, l) => sum + (l.review_duration_ms || 0), 0)
    const studyTimeMonth = monthLogs.reduce((sum, l) => sum + (l.review_duration_ms || 0), 0)

    // Cards reviewed with trend
    const cardsThisPeriod = last7DaysLogs.length
    const cardsPrevPeriod = prevPeriodLogs.length
    const cardsTrend = cardsPrevPeriod > 0
      ? ((cardsThisPeriod - cardsPrevPeriod) / cardsPrevPeriod) * 100
      : cardsThisPeriod > 0 ? 100 : 0

    // Accuracy calculations
    const correctThisPeriod = last7DaysLogs.filter(l => l.rating >= 3).length
    const accuracyThisPeriod = cardsThisPeriod > 0
      ? Math.round((correctThisPeriod / cardsThisPeriod) * 100)
      : 0

    const correctPrevPeriod = prevPeriodLogs.filter(l => l.rating >= 3).length
    const accuracyPrevPeriod = cardsPrevPeriod > 0
      ? Math.round((correctPrevPeriod / cardsPrevPeriod) * 100)
      : 0

    const accuracyTrend = accuracyPrevPeriod > 0
      ? accuracyThisPeriod - accuracyPrevPeriod
      : 0

    // Overall mastery calculation
    const allLessonProgress = lessonProgress.data || []
    const totalLessons = allLessonProgress.length
    const avgMastery = totalLessons > 0
      ? allLessonProgress.reduce((sum, lp) => sum + (lp.mastery_level || 0), 0) / totalLessons
      : 0

    // Build accuracy chart data (daily accuracy for last 30 days)
    const accuracyChart = buildDailyAccuracyData(last30DaysLogs, 30)

    // Build time chart data (daily time for last 7 days)
    const timeChart = buildDailyTimeData(last7DaysLogs, 7)

    // Build mastery map
    const masteryMap = buildMasteryMap(courseProgress.data || [])

    // Get weak and strong areas
    const weakAreas = allLessonProgress
      .filter(lp => (lp.mastery_level || 0) < 0.5)
      .slice(0, 5)
      .map((lp: any) => ({
        lessonId: lp.lesson_id,
        lessonTitle: lp.lessons.title,
        courseId: lp.lessons.course_id,
        courseTitle: lp.lessons.courses.title,
        mastery: lp.mastery_level || 0,
      }))

    const strongAreas = [...allLessonProgress]
      .filter(lp => (lp.mastery_level || 0) >= 0.8 && lp.completed)
      .sort((a, b) => (b.mastery_level || 0) - (a.mastery_level || 0))
      .slice(0, 5)
      .map((lp: any) => ({
        lessonId: lp.lesson_id,
        lessonTitle: lp.lessons.title,
        courseId: lp.lessons.course_id,
        courseTitle: lp.lessons.courses.title,
        mastery: lp.mastery_level || 0,
      }))

    // Generate insights
    const insights = generateInsights(
      userProfile.data,
      accuracyChart,
      timeChart,
      weakAreas,
      strongAreas,
      gamificationStats.data
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
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

function buildDailyAccuracyData(logs: ReviewLog[], days: number) {
  const data: { date: string; accuracy: number; count: number }[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const dayLogs = logs.filter(l => l.reviewed_at.startsWith(dateStr))
    const correct = dayLogs.filter(l => l.rating >= 3).length
    const accuracy = dayLogs.length > 0 ? Math.round((correct / dayLogs.length) * 100) : null

    data.push({
      date: dateStr,
      accuracy: accuracy ?? 0,
      count: dayLogs.length,
    })
  }

  return data
}

function buildDailyTimeData(logs: ReviewLog[], days: number) {
  const data: { date: string; minutes: number; dayLabel: string }[] = []
  const now = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const dayLogs = logs.filter(l => l.reviewed_at.startsWith(dateStr))
    const totalMs = dayLogs.reduce((sum, l) => sum + (l.review_duration_ms || 0), 0)

    data.push({
      date: dateStr,
      minutes: Math.round(totalMs / 60000),
      dayLabel: dayNames[date.getDay()],
    })
  }

  return data
}

interface CourseWithLessons {
  id: string
  title: string
  cover_image_url: string | null
  lessons: Array<{
    id: string
    title: string
    order_index: number
    lesson_progress: Array<{
      mastery_level: number
      completed: boolean
    }>
  }>
}

function buildMasteryMap(courses: CourseWithLessons[]) {
  return courses.map(course => {
    const lessons = course.lessons || []
    const lessonsWithMastery = lessons.map(lesson => {
      const progress = lesson.lesson_progress?.[0]
      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order_index,
        mastery: progress?.mastery_level || 0,
        completed: progress?.completed || false,
      }
    }).sort((a, b) => a.order - b.order)

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

interface LearningProfile {
  preferred_study_time: string | null
  optimal_session_length: number | null
  peak_performance_hour: number | null
  accuracy_trend: string | null
  study_goal: string | null
}

interface WeakArea {
  lessonTitle: string
  courseTitle: string
}

interface GamificationStats {
  current_streak: number
  total_xp: number
}

function generateInsights(
  profile: LearningProfile | null,
  accuracyChart: { date: string; accuracy: number; count: number }[],
  timeChart: { date: string; minutes: number }[],
  weakAreas: WeakArea[],
  strongAreas: WeakArea[],
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
  const recentAccuracy = accuracyChart.slice(-7)
  const avgRecent = recentAccuracy.filter(d => d.count > 0).reduce((sum, d) => sum + d.accuracy, 0) /
    Math.max(recentAccuracy.filter(d => d.count > 0).length, 1)
  const olderAccuracy = accuracyChart.slice(0, 14).filter(d => d.count > 0)
  const avgOlder = olderAccuracy.reduce((sum, d) => sum + d.accuracy, 0) /
    Math.max(olderAccuracy.length, 1)

  if (avgRecent > avgOlder + 5) {
    insights.push({
      icon: '📈',
      text: 'Your accuracy is improving! Keep up the great work.',
      type: 'positive',
    })
  } else if (avgRecent < avgOlder - 5) {
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
  } else if (studyDays <= 2) {
    insights.push({
      icon: '📅',
      text: 'Try to study more consistently. Even 5 minutes daily helps retention.',
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

  return insights.slice(0, 5) // Limit to 5 insights
}
