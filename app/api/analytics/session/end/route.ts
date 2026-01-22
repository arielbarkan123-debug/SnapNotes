import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * POST /api/analytics/session/end
 * End an analytics session (usually called via beacon on page unload)
 */
export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and text (beacon might send as text)
    let body: { sessionId: string; endedAt: string; pageCount?: number; isBounce?: boolean }

    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      body = await request.json()
    } else {
      const text = await request.text()
      body = JSON.parse(text)
    }

    const { sessionId, endedAt, pageCount, isBounce } = body

    if (!sessionId) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Session ID is required')
    }

    // Validate UUID format to prevent database errors
    if (!UUID_REGEX.test(sessionId)) {
      // Silently ignore invalid sessions (likely old format or admin sessions)
      return NextResponse.json({ success: true, skipped: true })
    }

    const supabase = await createClient()

    // Update session with end time
    const { error } = await supabase
      .from('analytics_sessions')
      .update({
        ended_at: endedAt || new Date().toISOString(),
        page_count: pageCount,
        is_bounce: isBounce ?? (pageCount !== undefined ? pageCount <= 1 : undefined),
      })
      .eq('id', sessionId)

    if (error) {
      console.error('[Analytics] Failed to end session:', error)
      return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to end session')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Analytics] Session end error:', error)
    return createErrorResponse(ErrorCodes.ANALYTICS_UNKNOWN)
  }
}
