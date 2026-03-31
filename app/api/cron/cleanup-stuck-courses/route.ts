import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron-cleanup')
const CRON_SECRET = process.env.CRON_SECRET
const STUCK_THRESHOLD_MINUTES = 10

/**
 * POST /api/cron/cleanup-stuck-courses
 *
 * Resets courses that have been stuck in 'generating' status for more than
 * STUCK_THRESHOLD_MINUTES. This happens when a streaming generation request
 * is interrupted before it can update the final status.
 *
 * Scheduled in vercel.json to run hourly.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString()

    const { data: stuck, error: fetchError } = await supabase
      .from('courses')
      .select('id, updated_at')
      .eq('generation_status', 'generating')
      .lt('updated_at', cutoff)

    if (fetchError) {
      log.error({ err: fetchError }, 'Failed to query stuck courses')
      return NextResponse.json({ error: 'DB query failed' }, { status: 500 })
    }

    if (!stuck || stuck.length === 0) {
      log.info('No stuck courses found')
      return NextResponse.json({ cleaned: 0 })
    }

    const ids = stuck.map((c) => c.id)
    const { error: updateError } = await supabase
      .from('courses')
      .update({ generation_status: 'failed' })
      .in('id', ids)

    if (updateError) {
      log.error({ err: updateError, ids }, 'Failed to reset stuck courses')
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }

    log.info({ count: ids.length, ids }, 'Reset stuck courses to failed')
    return NextResponse.json({ cleaned: ids.length, ids })
  } catch (error) {
    log.error({ err: error }, 'Unexpected error in stuck-course cleanup')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
