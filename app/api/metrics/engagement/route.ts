/**
 * Engagement Tracking API
 *
 * POST: Record engagement events
 * GET: Get engagement metrics
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  recordEngagementEvent,
  recordEngagementEventsBatch,
  calculateEngagementMetrics,
  calculateRetentionMetrics,
  aggregateLearningEffectiveness,
  type EngagementEventType,
} from '@/lib/metrics'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
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
        return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, 'Invalid action')
    }
  } catch (error) {
    console.error('Error in engagement GET:', error)
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: EventPayload = await request.json()

    // Handle batch events
    if (body.events && Array.isArray(body.events)) {
      // Validate all event types
      for (const event of body.events) {
        if (!VALID_EVENT_TYPES.includes(event.eventType)) {
          return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, `Invalid event type: ${event.eventType}`)
        }
      }

      const result = await recordEngagementEventsBatch(
        body.events.map(event => ({
          userId: user.id,
          ...event,
        }))
      )

      if (!result.success) {
        return createErrorResponse(ErrorCodes.INSERT_FAILED, result.error || 'Failed to record events')
      }

      return NextResponse.json({
        success: true,
        count: result.count,
      })
    }

    // Handle single event
    if (!body.eventType) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Event type is required')
    }

    if (!VALID_EVENT_TYPES.includes(body.eventType)) {
      return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, `Invalid event type: ${body.eventType}`)
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
      return createErrorResponse(ErrorCodes.INSERT_FAILED, result.error || 'Failed to record event')
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
    })
  } catch (error) {
    console.error('Error in engagement POST:', error)
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}
