/**
 * Engagement Tracking API
 *
 * POST: Record engagement events
 * GET: Get engagement metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  recordEngagementEvent,
  recordEngagementEventsBatch,
  calculateEngagementMetrics,
  calculateRetentionMetrics,
  aggregateLearningEffectiveness,
  type EngagementEventType,
} from '@/lib/metrics'

// =============================================================================
// GET: Fetch engagement metrics
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId') || undefined
    const action = searchParams.get('action') || 'engagement'

    // Default date range: last 7 days
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

    const startParam = searchParams.get('startDate')
    const endParam = searchParams.get('endDate')

    if (startParam) {
      startDate.setTime(new Date(startParam).getTime())
    }
    if (endParam) {
      endDate.setTime(new Date(endParam).getTime())
    }

    switch (action) {
      case 'engagement': {
        const metrics = await calculateEngagementMetrics(user.id, startDate, endDate, courseId)
        return NextResponse.json({ success: true, metrics })
      }

      case 'retention': {
        const metrics = await calculateRetentionMetrics(user.id, courseId)
        return NextResponse.json({ success: true, metrics })
      }

      case 'aggregate': {
        // Force aggregation of current period
        const periodType = (searchParams.get('periodType') || 'weekly') as 'daily' | 'weekly' | 'monthly'
        const result = await aggregateLearningEffectiveness(user.id, startDate, endDate, periodType)
        return NextResponse.json({ success: result.success, error: result.error })
      }

      case 'all': {
        const [engagement, retention] = await Promise.all([
          calculateEngagementMetrics(user.id, startDate, endDate, courseId),
          calculateRetentionMetrics(user.id, courseId),
        ])
        return NextResponse.json({
          success: true,
          engagement,
          retention,
          period: { start: startDate.toISOString(), end: endDate.toISOString() },
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in engagement GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch engagement metrics' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST: Record engagement events
// =============================================================================

const VALID_EVENT_TYPES: EngagementEventType[] = [
  'session_start', 'session_end', 'lesson_start', 'lesson_complete',
  'question_answered', 'hint_used', 'retry_attempt', 'voluntary_practice',
  'review_started', 'srs_review', 'exam_practice', 'content_revisit'
]

interface EventPayload {
  events?: Array<{
    eventType: EngagementEventType
    courseId?: string
    lessonIndex?: number
    stepIndex?: number
    durationSeconds?: number
    wasSuccessful?: boolean
    sessionId?: string
    deviceType?: string
  }>
  // Single event (legacy support)
  eventType?: EngagementEventType
  courseId?: string
  lessonIndex?: number
  stepIndex?: number
  durationSeconds?: number
  wasSuccessful?: boolean
  sessionId?: string
  deviceType?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: EventPayload = await request.json()

    // Handle batch events
    if (body.events && Array.isArray(body.events)) {
      // Validate all event types
      for (const event of body.events) {
        if (!VALID_EVENT_TYPES.includes(event.eventType)) {
          return NextResponse.json(
            { error: `Invalid event type: ${event.eventType}` },
            { status: 400 }
          )
        }
      }

      const result = await recordEngagementEventsBatch(
        body.events.map(event => ({
          userId: user.id,
          ...event,
        }))
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        count: result.count,
      })
    }

    // Handle single event
    if (!body.eventType) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 })
    }

    if (!VALID_EVENT_TYPES.includes(body.eventType)) {
      return NextResponse.json(
        { error: `Invalid event type: ${body.eventType}` },
        { status: 400 }
      )
    }

    const result = await recordEngagementEvent({
      userId: user.id,
      courseId: body.courseId,
      eventType: body.eventType,
      lessonIndex: body.lessonIndex,
      stepIndex: body.stepIndex,
      durationSeconds: body.durationSeconds,
      wasSuccessful: body.wasSuccessful,
      sessionId: body.sessionId,
      deviceType: body.deviceType,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
    })
  } catch (error) {
    console.error('Error in engagement POST:', error)
    return NextResponse.json(
      { error: 'Failed to record engagement event' },
      { status: 500 }
    )
  }
}
