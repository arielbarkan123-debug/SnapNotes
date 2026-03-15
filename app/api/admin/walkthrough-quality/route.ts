/**
 * Admin Walkthrough Quality API
 *
 * GET /api/admin/walkthrough-quality
 *   Lists walkthrough sessions with quality telemetry and user feedback.
 *   Admin-only endpoint.
 *
 * Query params:
 *   - filter: 'all' | 'with_feedback' | 'thumbs_down' | 'failed' (default: 'all')
 *   - topic: topic classification filter (e.g. 'projectile', 'generic', 'text-only')
 *   - limit: number of results (default: 50, max: 200)
 *   - offset: pagination offset (default: 0)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin/utils'
import { createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin-walkthrough-quality')

export async function GET(request: NextRequest) {
  // Admin check
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin || error) {
    return error || NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') || 'all'
  const topic = searchParams.get('topic') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  const serviceClient = createServiceClient()

  // Build query
  let query = serviceClient
    .from('walkthrough_sessions')
    .select('id, homework_session_id, user_id, question_text, solution, generation_status, steps_rendered, total_steps, step_images, topic_classified, validation_errors, compilation_failures, user_rating, user_feedback, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
  switch (filter) {
    case 'with_feedback':
      query = query.not('user_rating', 'is', null)
      break
    case 'thumbs_down':
      query = query.eq('user_rating', 1)
      break
    case 'failed':
      query = query.or('generation_status.eq.failed,generation_status.eq.partial')
      break
  }

  if (topic) {
    query = query.eq('topic_classified', topic)
  }

  const { data: walkthroughs, error: queryError } = await query

  if (queryError) {
    log.error({ err: queryError }, 'Query error')
    return NextResponse.json({ error: 'Failed to fetch walkthroughs' }, { status: 500 })
  }

  // Get aggregate stats
  const { data: statsData } = await serviceClient
    .from('walkthrough_sessions')
    .select('id, user_rating, topic_classified, generation_status, compilation_failures')

  const stats = {
    total: statsData?.length || 0,
    withFeedback: statsData?.filter(w => w.user_rating !== null).length || 0,
    thumbsUp: statsData?.filter(w => w.user_rating === 5).length || 0,
    thumbsDown: statsData?.filter(w => w.user_rating === 1).length || 0,
    failed: statsData?.filter(w => w.generation_status === 'failed' || w.generation_status === 'partial').length || 0,
    withCompilationFailures: statsData?.filter(w => (w.compilation_failures || 0) > 0).length || 0,
    byTopic: {} as Record<string, number>,
  }

  // Count by topic
  statsData?.forEach(w => {
    const t = w.topic_classified || 'unknown'
    stats.byTopic[t] = (stats.byTopic[t] || 0) + 1
  })

  return NextResponse.json({
    walkthroughs: walkthroughs || [],
    stats,
    pagination: { offset, limit, hasMore: (walkthroughs?.length || 0) === limit },
  })
}
