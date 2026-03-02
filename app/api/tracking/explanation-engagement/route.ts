import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/tracking/explanation-engagement
 *
 * Tracks how long a student spends reading an explanation, scroll depth,
 * and whether they expanded details. Called via navigator.sendBeacon
 * from the client-side useExplanationTracker hook.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      sourceType,
      sourceId,
      questionId,
      timeSpentReadingMs,
      scrollDepthPercent,
      didExpandDetails,
    } = body

    if (!sourceType) {
      return NextResponse.json({ error: 'sourceType is required' }, { status: 400 })
    }

    const validSourceTypes = ['practice', 'homework', 'exam', 'lesson']
    if (!validSourceTypes.includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }

    const { error } = await supabase
      .from('explanation_engagement')
      .insert({
        user_id: user.id,
        source_type: sourceType,
        source_id: sourceId || null,
        question_id: questionId || null,
        time_spent_reading_ms: timeSpentReadingMs || null,
        scroll_depth_percent: scrollDepthPercent != null
          ? Math.max(0, Math.min(100, scrollDepthPercent))
          : null,
        did_expand_details: didExpandDetails ?? false,
      })

    if (error) {
      // Don't fail loudly for tracking — it's non-critical
      console.warn('[Explanation Engagement] Insert error:', error.message)
      return NextResponse.json({ success: false }, { status: 200 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.warn('[Explanation Engagement] Error:', error)
    // Always return 200 for tracking endpoints — don't block the UI
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
