import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tracking-feature-affinity')

/**
 * POST /api/tracking/feature-affinity
 *
 * Tracks how much time a student spends on each feature, whether they
 * navigated there voluntarily or were nudged. Uses the upsert_feature_affinity
 * RPC function to efficiently update the feature_affinity table.
 *
 * Called via navigator.sendBeacon from the useFeatureTracker hook.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { featureName, timeSpentMs, isVoluntary } = body

    if (!featureName || typeof featureName !== 'string') {
      return NextResponse.json({ error: 'featureName is required' }, { status: 400 })
    }

    if (!timeSpentMs || typeof timeSpentMs !== 'number' || timeSpentMs < 0) {
      return NextResponse.json({ error: 'Valid timeSpentMs is required' }, { status: 400 })
    }

    const { error } = await supabase.rpc('upsert_feature_affinity', {
      p_user_id: user.id,
      p_feature_name: featureName,
      p_time_spent_ms: Math.round(timeSpentMs),
      p_is_voluntary: isVoluntary !== false, // default true
    })

    if (error) {
      log.warn({ err: error }, 'RPC error')
      return NextResponse.json({ success: false }, { status: 200 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.warn({ error }, 'Error')
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
