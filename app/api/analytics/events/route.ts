import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface BatchEvent {
  name: string
  category: string
  pagePath: string
  properties: Record<string, unknown>
  clickX?: number
  clickY?: number
  elementId?: string
  elementClass?: string
  elementText?: string
  eventTime: string
}

interface BatchPageView {
  pagePath: string
  pageTitle: string
  referrerPath?: string
  viewStartAt: string
  viewEndAt?: string
  timeOnPageMs?: number
  scrollDepthPercent?: number
  isEntryPage: boolean
  isExitPage: boolean
}

interface BatchError {
  type: 'javascript' | 'api' | 'network' | 'unhandled'
  message: string
  stackTrace?: string
  pagePath: string
  componentName?: string
  apiEndpoint?: string
  httpStatus?: number
  httpMethod?: string
  context?: Record<string, unknown>
  occurredAt: string
}

interface BatchFunnelStep {
  funnelName: string
  stepName: string
  stepOrder: number
  properties?: Record<string, unknown>
  timeFromPreviousStepMs?: number
  completedAt: string
}

interface SessionUpdate {
  endedAt?: string
  pageCount?: number
  isBounce?: boolean
}

interface AnalyticsBatch {
  sessionId: string
  userId?: string | null
  events: BatchEvent[]
  pageViews: BatchPageView[]
  errors: BatchError[]
  funnelSteps: BatchFunnelStep[]
  sessionUpdate?: SessionUpdate
}

/**
 * POST /api/analytics/events
 * Batch insert analytics data (events, page views, errors, funnel steps)
 */
export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and text (beacon might send as text)
    let batch: AnalyticsBatch

    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      batch = await request.json()
    } else {
      const text = await request.text()
      batch = JSON.parse(text)
    }

    const { sessionId, userId, events, pageViews, errors, funnelSteps, sessionUpdate } = batch

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Validate UUID format to prevent database errors
    if (!UUID_REGEX.test(sessionId)) {
      // Silently ignore invalid sessions (likely old format or admin sessions)
      return NextResponse.json({ success: true, skipped: true })
    }

    const supabase = await createClient()
    // Use service client for database operations to bypass RLS
    const serviceClient = createServiceClient()

    // Get current user if not provided
    let actualUserId = userId
    if (actualUserId === undefined) {
      const { data: { user } } = await supabase.auth.getUser()
      actualUserId = user?.id || null
    }

    const results = {
      events: 0,
      pageViews: 0,
      errors: 0,
      funnelSteps: 0,
    }

    // Insert page views
    if (pageViews && pageViews.length > 0) {
      const pageViewRecords = pageViews.map((pv) => ({
        user_id: actualUserId,
        session_id: sessionId,
        page_path: pv.pagePath,
        page_title: pv.pageTitle,
        referrer_path: pv.referrerPath || null,
        view_start_at: pv.viewStartAt,
        view_end_at: pv.viewEndAt || null,
        time_on_page_ms: pv.timeOnPageMs || null,
        scroll_depth_percent: pv.scrollDepthPercent || 0,
        is_entry_page: pv.isEntryPage,
        is_exit_page: pv.isExitPage,
      }))

      const { error } = await serviceClient.from('analytics_page_views').insert(pageViewRecords)
      if (error) {
        console.error('[Analytics] Failed to insert page views:', error)
      } else {
        results.pageViews = pageViewRecords.length
      }
    }

    // Insert events
    if (events && events.length > 0) {
      const eventRecords = events.map((e) => ({
        user_id: actualUserId,
        session_id: sessionId,
        event_name: e.name,
        event_category: e.category,
        page_path: e.pagePath,
        properties: e.properties || {},
        click_x: e.clickX || null,
        click_y: e.clickY || null,
        element_id: e.elementId || null,
        element_class: e.elementClass || null,
        element_text: e.elementText || null,
        event_time: e.eventTime,
      }))

      const { error } = await serviceClient.from('analytics_events').insert(eventRecords)
      if (error) {
        console.error('[Analytics] Failed to insert events:', error)
      } else {
        results.events = eventRecords.length
      }
    }

    // Insert errors
    if (errors && errors.length > 0) {
      const errorRecords = errors.map((e) => ({
        user_id: actualUserId,
        session_id: sessionId,
        error_type: e.type,
        error_message: e.message,
        stack_trace: e.stackTrace || null,
        page_path: e.pagePath,
        component_name: e.componentName || null,
        api_endpoint: e.apiEndpoint || null,
        http_status: e.httpStatus || null,
        http_method: e.httpMethod || null,
        additional_context: e.context || {},
        occurred_at: e.occurredAt,
      }))

      const { error } = await serviceClient.from('analytics_errors').insert(errorRecords)
      if (error) {
        console.error('[Analytics] Failed to insert errors:', error)
      } else {
        results.errors = errorRecords.length
      }
    }

    // Insert funnel steps (with upsert to prevent duplicates)
    if (funnelSteps && funnelSteps.length > 0) {
      for (const step of funnelSteps) {
        const { error } = await serviceClient.from('analytics_funnels').upsert(
          {
            user_id: actualUserId,
            session_id: sessionId,
            funnel_name: step.funnelName,
            step_name: step.stepName,
            step_order: step.stepOrder,
            properties: step.properties || {},
            time_from_previous_step_ms: step.timeFromPreviousStepMs || null,
            completed_at: step.completedAt,
          },
          {
            onConflict: 'user_id,funnel_name,step_name',
            ignoreDuplicates: true,
          }
        )
        if (!error) {
          results.funnelSteps++
        }
      }
    }

    // Update session if provided
    if (sessionUpdate) {
      const updateData: Record<string, unknown> = {}
      if (sessionUpdate.endedAt) updateData.ended_at = sessionUpdate.endedAt
      if (sessionUpdate.pageCount !== undefined) updateData.page_count = sessionUpdate.pageCount
      if (sessionUpdate.isBounce !== undefined) updateData.is_bounce = sessionUpdate.isBounce

      if (Object.keys(updateData).length > 0) {
        await serviceClient.from('analytics_sessions').update(updateData).eq('id', sessionId)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('[Analytics] Batch insert error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
