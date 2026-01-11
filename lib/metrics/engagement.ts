/**
 * Engagement & Retention Tracking Module
 *
 * Tracks engagement metrics for learning effectiveness measurement.
 * Research target: Increased engagement and course completion rates.
 */

import { createClient } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

export type EngagementEventType =
  | 'session_start'
  | 'session_end'
  | 'lesson_start'
  | 'lesson_complete'
  | 'question_answered'
  | 'hint_used'
  | 'retry_attempt'
  | 'voluntary_practice'
  | 'review_started'
  | 'srs_review'
  | 'exam_practice'
  | 'content_revisit'

export interface EngagementEvent {
  id?: string
  userId: string
  courseId?: string
  eventType: EngagementEventType
  lessonIndex?: number
  stepIndex?: number
  durationSeconds?: number
  wasSuccessful?: boolean
  sessionId?: string
  deviceType?: string
  createdAt?: Date
}

export interface EngagementMetrics {
  // Session metrics
  totalSessions: number
  avgSessionDurationMinutes: number
  sessionCompletionRate: number

  // Lesson metrics
  lessonsStarted: number
  lessonsCompleted: number
  lessonCompletionRate: number

  // Question metrics
  questionsAnswered: number
  correctAnswers: number
  accuracy: number
  hintsUsed: number
  retryAttempts: number

  // Voluntary engagement
  voluntaryPracticeSessions: number
  srsReviewSessions: number
  contentRevisits: number
  voluntaryEngagementRate: number

  // Time metrics
  totalTimeOnTaskMinutes: number
  avgTimePerLessonMinutes: number
}

export interface RetentionMetrics {
  // 7-day retention
  retention7Day: number
  cardsReviewed7Day: number
  cardsCorrect7Day: number

  // 30-day retention
  retention30Day: number
  cardsReviewed30Day: number
  cardsCorrect30Day: number

  // Learning velocity
  conceptsMastered: number
  avgTimeToMasteryMinutes: number
  questionsToMasteryAvg: number
}

// =============================================================================
// Event Recording
// =============================================================================

/**
 * Records an engagement event
 */
export async function recordEngagementEvent(
  event: Omit<EngagementEvent, 'id' | 'createdAt'>
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('engagement_events')
      .insert({
        user_id: event.userId,
        course_id: event.courseId || null,
        event_type: event.eventType,
        lesson_index: event.lessonIndex,
        step_index: event.stepIndex,
        duration_seconds: event.durationSeconds,
        was_successful: event.wasSuccessful,
        session_id: event.sessionId,
        device_type: event.deviceType,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, eventId: data.id }
  } catch (error) {
    console.error('Error recording engagement event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Records multiple engagement events in batch
 */
export async function recordEngagementEventsBatch(
  events: Omit<EngagementEvent, 'id' | 'createdAt'>[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = createClient()

    const rows = events.map(event => ({
      user_id: event.userId,
      course_id: event.courseId || null,
      event_type: event.eventType,
      lesson_index: event.lessonIndex,
      step_index: event.stepIndex,
      duration_seconds: event.durationSeconds,
      was_successful: event.wasSuccessful,
      session_id: event.sessionId,
      device_type: event.deviceType,
    }))

    const { error } = await supabase
      .from('engagement_events')
      .insert(rows)

    if (error) throw error

    return { success: true, count: events.length }
  } catch (error) {
    console.error('Error recording engagement events batch:', error)
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// Metrics Calculation
// =============================================================================

/**
 * Calculates engagement metrics for a user over a time period
 */
export async function calculateEngagementMetrics(
  userId: string,
  startDate: Date,
  endDate: Date,
  courseId?: string
): Promise<EngagementMetrics> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('engagement_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: events, error } = await query

    if (error) throw error

    const eventList = events || []

    // Session metrics
    const sessionStarts = eventList.filter(e => e.event_type === 'session_start')
    const sessionEnds = eventList.filter(e => e.event_type === 'session_end')
    const totalSessions = sessionStarts.length
    const completedSessions = sessionEnds.length
    const sessionCompletionRate = totalSessions > 0 ? completedSessions / totalSessions : 0

    const sessionDurations = sessionEnds
      .filter(e => e.duration_seconds)
      .map(e => e.duration_seconds!)
    const avgSessionDurationMinutes = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length / 60
      : 0

    // Lesson metrics
    const lessonStarts = eventList.filter(e => e.event_type === 'lesson_start')
    const lessonCompletes = eventList.filter(e => e.event_type === 'lesson_complete')
    const lessonsStarted = lessonStarts.length
    const lessonsCompleted = lessonCompletes.length
    const lessonCompletionRate = lessonsStarted > 0 ? lessonsCompleted / lessonsStarted : 0

    // Question metrics
    const questionEvents = eventList.filter(e => e.event_type === 'question_answered')
    const questionsAnswered = questionEvents.length
    const correctAnswers = questionEvents.filter(e => e.was_successful).length
    const accuracy = questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0

    const hintsUsed = eventList.filter(e => e.event_type === 'hint_used').length
    const retryAttempts = eventList.filter(e => e.event_type === 'retry_attempt').length

    // Voluntary engagement
    const voluntaryPracticeSessions = eventList.filter(e => e.event_type === 'voluntary_practice').length
    const srsReviewSessions = eventList.filter(e => e.event_type === 'srs_review').length
    const contentRevisits = eventList.filter(e => e.event_type === 'content_revisit').length
    const voluntaryEngagementRate = totalSessions > 0
      ? (voluntaryPracticeSessions + srsReviewSessions + contentRevisits) / totalSessions
      : 0

    // Time metrics
    const totalTimeOnTaskMinutes = eventList
      .filter(e => e.duration_seconds)
      .reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 60

    const lessonDurations = lessonCompletes
      .filter(e => e.duration_seconds)
      .map(e => e.duration_seconds!)
    const avgTimePerLessonMinutes = lessonDurations.length > 0
      ? lessonDurations.reduce((a, b) => a + b, 0) / lessonDurations.length / 60
      : 0

    return {
      totalSessions,
      avgSessionDurationMinutes: Number(avgSessionDurationMinutes.toFixed(1)),
      sessionCompletionRate: Number(sessionCompletionRate.toFixed(2)),
      lessonsStarted,
      lessonsCompleted,
      lessonCompletionRate: Number(lessonCompletionRate.toFixed(2)),
      questionsAnswered,
      correctAnswers,
      accuracy: Number(accuracy.toFixed(2)),
      hintsUsed,
      retryAttempts,
      voluntaryPracticeSessions,
      srsReviewSessions,
      contentRevisits,
      voluntaryEngagementRate: Number(voluntaryEngagementRate.toFixed(2)),
      totalTimeOnTaskMinutes: Number(totalTimeOnTaskMinutes.toFixed(1)),
      avgTimePerLessonMinutes: Number(avgTimePerLessonMinutes.toFixed(1)),
    }
  } catch (error) {
    console.error('Error calculating engagement metrics:', error)
    return getEmptyEngagementMetrics()
  }
}

/**
 * Calculates retention metrics based on SRS review data
 */
export async function calculateRetentionMetrics(
  userId: string,
  courseId?: string
): Promise<RetentionMetrics> {
  try {
    const supabase = createClient()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get SRS review events
    let query = supabase
      .from('engagement_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'srs_review')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: srsEvents, error } = await query

    if (error) throw error

    const eventList = srsEvents || []

    // 7-day retention
    const events7Day = eventList.filter(e =>
      new Date(e.created_at) >= sevenDaysAgo
    )
    const cardsReviewed7Day = events7Day.length
    const cardsCorrect7Day = events7Day.filter(e => e.was_successful).length
    const retention7Day = cardsReviewed7Day > 0 ? cardsCorrect7Day / cardsReviewed7Day : 0

    // 30-day retention
    const cardsReviewed30Day = eventList.length
    const cardsCorrect30Day = eventList.filter(e => e.was_successful).length
    const retention30Day = cardsReviewed30Day > 0 ? cardsCorrect30Day / cardsReviewed30Day : 0

    // Learning velocity - get from user mastery data
    let conceptsMastered = 0
    const avgTimeToMasteryMinutes = 0 // TODO: Calculate from time-to-mastery tracking
    let questionsToMasteryAvg = 0

    try {
      let masteryQuery = supabase
        .from('user_mastery')
        .select('mastery_score, total_attempts')
        .eq('user_id', userId)
        .gte('mastery_score', 0.8) // 80% mastery threshold

      if (courseId) {
        masteryQuery = masteryQuery.eq('course_id', courseId)
      }

      const { data: masteryData } = await masteryQuery

      if (masteryData) {
        conceptsMastered = masteryData.length
        const totalAttempts = masteryData.reduce((sum, m) => sum + (m.total_attempts || 0), 0)
        questionsToMasteryAvg = conceptsMastered > 0 ? totalAttempts / conceptsMastered : 0
      }
    } catch {
      // Mastery table might not exist yet
    }

    return {
      retention7Day: Number(retention7Day.toFixed(2)),
      cardsReviewed7Day,
      cardsCorrect7Day,
      retention30Day: Number(retention30Day.toFixed(2)),
      cardsReviewed30Day,
      cardsCorrect30Day,
      conceptsMastered,
      avgTimeToMasteryMinutes,
      questionsToMasteryAvg: Number(questionsToMasteryAvg.toFixed(1)),
    }
  } catch (error) {
    console.error('Error calculating retention metrics:', error)
    return getEmptyRetentionMetrics()
  }
}

// =============================================================================
// Learning Effectiveness Aggregation
// =============================================================================

/**
 * Aggregates and stores learning effectiveness metrics for a period
 */
export async function aggregateLearningEffectiveness(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  periodType: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Calculate all metrics
    const engagement = await calculateEngagementMetrics(userId, periodStart, periodEnd)
    const retention = await calculateRetentionMetrics(userId)

    // Get self-efficacy data
    const { data: selfEfficacyData } = await supabase
      .from('self_efficacy_surveys')
      .select('self_efficacy_score')
      .eq('user_id', userId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    const selfEfficacyScores = (selfEfficacyData || [])
      .map(d => d.self_efficacy_score)
      .filter((s): s is number => s !== null)

    const selfEfficacyScore = selfEfficacyScores.length > 0
      ? selfEfficacyScores.reduce((a, b) => a + b, 0) / selfEfficacyScores.length
      : null

    // Determine trend
    let selfEfficacyTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (selfEfficacyScores.length >= 2) {
      const recent = selfEfficacyScores[0]
      const older = selfEfficacyScores[selfEfficacyScores.length - 1]
      if (recent - older > 0.2) selfEfficacyTrend = 'improving'
      else if (older - recent > 0.2) selfEfficacyTrend = 'declining'
    }

    // Upsert metrics
    const { error } = await supabase
      .from('learning_effectiveness_metrics')
      .upsert({
        user_id: userId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        period_type: periodType,

        // Self-efficacy
        self_efficacy_score: selfEfficacyScore,
        self_efficacy_trend: selfEfficacyTrend,

        // Engagement
        avg_session_completion_rate: engagement.sessionCompletionRate,
        avg_time_on_task_seconds: Math.round(engagement.totalTimeOnTaskMinutes * 60),
        voluntary_practice_rate: engagement.voluntaryEngagementRate,
        lessons_started: engagement.lessonsStarted,
        lessons_completed: engagement.lessonsCompleted,

        // Retention
        retention_rate_7day: retention.retention7Day,
        retention_rate_30day: retention.retention30Day,
        cards_due_completed_rate: retention.cardsReviewed7Day > 0
          ? retention.cardsCorrect7Day / retention.cardsReviewed7Day
          : null,

        // Learning velocity
        concepts_mastered_this_period: retention.conceptsMastered,
        questions_to_mastery_avg: retention.questionsToMasteryAvg,
      }, {
        onConflict: 'user_id,period_start,period_end',
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error aggregating learning effectiveness:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getEmptyEngagementMetrics(): EngagementMetrics {
  return {
    totalSessions: 0,
    avgSessionDurationMinutes: 0,
    sessionCompletionRate: 0,
    lessonsStarted: 0,
    lessonsCompleted: 0,
    lessonCompletionRate: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    hintsUsed: 0,
    retryAttempts: 0,
    voluntaryPracticeSessions: 0,
    srsReviewSessions: 0,
    contentRevisits: 0,
    voluntaryEngagementRate: 0,
    totalTimeOnTaskMinutes: 0,
    avgTimePerLessonMinutes: 0,
  }
}

function getEmptyRetentionMetrics(): RetentionMetrics {
  return {
    retention7Day: 0,
    cardsReviewed7Day: 0,
    cardsCorrect7Day: 0,
    retention30Day: 0,
    cardsReviewed30Day: 0,
    cardsCorrect30Day: 0,
    conceptsMastered: 0,
    avgTimeToMasteryMinutes: 0,
    questionsToMasteryAvg: 0,
  }
}

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// =============================================================================
// Export
// =============================================================================

const engagementMetrics = {
  recordEngagementEvent,
  recordEngagementEventsBatch,
  calculateEngagementMetrics,
  calculateRetentionMetrics,
  aggregateLearningEffectiveness,
  generateSessionId,
}

export default engagementMetrics
