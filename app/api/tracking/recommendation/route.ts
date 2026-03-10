import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tracking-recommendation')

/**
 * POST /api/tracking/recommendation
 *
 * Records when a recommendation is shown to a user, or when a user acts on one.
 *
 * Two use cases:
 * 1. Record a new recommendation shown (no recommendationId):
 *    { recommendationType, recommendationData }
 *    Returns { id } of the created tracking record.
 *
 * 2. Record that user acted on a recommendation (with recommendationId):
 *    { recommendationId }
 *    Updates the record with acted_on = true and time_to_action_ms.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Case 2: User acted on a recommendation
    if (body.recommendationId) {
      const { recommendationId } = body

      // Fetch the original record to compute time_to_action_ms
      const { data: existing } = await supabase
        .from('recommendation_tracking')
        .select('shown_at')
        .eq('id', recommendationId)
        .eq('user_id', user.id)
        .single()

      if (!existing) {
        return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
      }

      const timeToActionMs = Math.round(
        Date.now() - new Date(existing.shown_at).getTime()
      )

      const { error } = await supabase
        .from('recommendation_tracking')
        .update({
          acted_on: true,
          acted_on_at: new Date().toISOString(),
          time_to_action_ms: timeToActionMs,
        })
        .eq('id', recommendationId)
        .eq('user_id', user.id)

      if (error) {
        log.warn({ err: error }, 'Update error')
        return NextResponse.json({ success: false }, { status: 200 })
      }

      return NextResponse.json({ success: true, timeToActionMs })
    }

    // Case 1: Record a new recommendation shown
    const { recommendationType, recommendationData } = body

    if (!recommendationType || typeof recommendationType !== 'string') {
      return NextResponse.json({ error: 'recommendationType is required' }, { status: 400 })
    }

    if (!recommendationData || typeof recommendationData !== 'object') {
      return NextResponse.json({ error: 'recommendationData is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recommendation_tracking')
      .insert({
        user_id: user.id,
        recommendation_type: recommendationType,
        recommendation_data: recommendationData,
        shown_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      log.warn({ err: error }, 'Insert error')
      return NextResponse.json({ success: false }, { status: 200 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    log.warn({ error }, 'Error')
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
