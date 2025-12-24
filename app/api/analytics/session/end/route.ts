import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Analytics] Session end error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
