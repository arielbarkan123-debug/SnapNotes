import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Secret key for cron authentication (REQUIRED in environment variables)
const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/cron/aggregate-analytics
 *
 * Triggers daily analytics aggregation.
 * Should be called by a cron job (Vercel Cron, Supabase, or external scheduler).
 *
 * For Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/aggregate-analytics",
 *     "schedule": "0 2 * * *"  // Run at 2 AM UTC daily
 *   }]
 * }
 *
 * IMPORTANT: Set CRON_SECRET in environment variables for security
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for security (REQUIRED)
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get dates to aggregate (yesterday and today for real-time updates)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dates = [
      yesterday.toISOString().split('T')[0],
      today.toISOString().split('T')[0],
    ]

    const results: { date: string; status: string; error?: string }[] = []

    for (const date of dates) {
      try {
        // Aggregate daily metrics
        const { error: dailyError } = await supabase.rpc('aggregate_daily_metrics', {
          target_date: date,
        })

        if (dailyError) throw dailyError

        // Aggregate hourly patterns
        const { error: hourlyError } = await supabase.rpc('aggregate_hourly_patterns', {
          target_date: date,
        })

        if (hourlyError) throw hourlyError

        // Aggregate page metrics
        await aggregatePageMetrics(supabase, date)

        // Aggregate feature usage
        await aggregateFeatureUsage(supabase, date)

        results.push({ date, status: 'success' })
      } catch (error) {
        results.push({
          date,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      aggregatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Aggregation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for manual testing (requires admin auth)
 */
export async function GET(request: NextRequest) {
  // Only allow in development or with secret
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Use POST for cron jobs' }, { status: 405 })
  }

  return POST(request)
}

/**
 * Aggregate page-level metrics for a specific date
 */
async function aggregatePageMetrics(supabase: ReturnType<typeof createServiceClient>, date: string) {
  // Get all page views for the date
  const { data: pageViews, error } = await supabase
    .from('analytics_page_views')
    .select('page_path, user_id, time_on_page_ms, scroll_depth_percent, is_entry_page, is_exit_page')
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${date}T23:59:59.999`)

  if (error) throw error

  // Aggregate by page path
  const pageStats: Record<string, {
    views: number
    uniqueUsers: Set<string>
    totalTime: number
    bounces: number
    totalScroll: number
    entryCount: number
    exitCount: number
  }> = {}

  pageViews?.forEach((pv) => {
    if (!pageStats[pv.page_path]) {
      pageStats[pv.page_path] = {
        views: 0,
        uniqueUsers: new Set(),
        totalTime: 0,
        bounces: 0,
        totalScroll: 0,
        entryCount: 0,
        exitCount: 0,
      }
    }

    const stats = pageStats[pv.page_path]
    stats.views++
    if (pv.user_id) stats.uniqueUsers.add(pv.user_id)
    stats.totalTime += pv.time_on_page_ms || 0
    stats.totalScroll += pv.scroll_depth_percent || 0
    if (pv.is_entry_page) stats.entryCount++
    if (pv.is_exit_page) stats.exitCount++
  })

  // Upsert page metrics
  for (const [pagePath, stats] of Object.entries(pageStats)) {
    const avgTime = stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0
    const avgScroll = stats.views > 0 ? Math.round(stats.totalScroll / stats.views) : 0
    const bounceRate = stats.views > 0 ? Math.round((stats.bounces / stats.views) * 100) : 0

    await supabase.from('analytics_page_metrics').upsert(
      {
        date,
        page_path: pagePath,
        views: stats.views,
        unique_visitors: stats.uniqueUsers.size,
        avg_time_on_page_ms: avgTime,
        bounce_rate: bounceRate,
        entry_count: stats.entryCount,
        exit_count: stats.exitCount,
        avg_scroll_depth: avgScroll,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'date,page_path' }
    )
  }
}

/**
 * Aggregate feature usage for a specific date
 */
async function aggregateFeatureUsage(supabase: ReturnType<typeof createServiceClient>, date: string) {
  // Get all feature events for the date
  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('event_name, user_id, properties')
    .eq('event_category', 'feature')
    .gte('event_time', `${date}T00:00:00`)
    .lt('event_time', `${date}T23:59:59.999`)

  if (error) throw error

  // Aggregate by feature name
  const featureStats: Record<string, {
    count: number
    uniqueUsers: Set<string>
    totalDuration: number
  }> = {}

  events?.forEach((event) => {
    const featureName = event.event_name
    if (!featureStats[featureName]) {
      featureStats[featureName] = {
        count: 0,
        uniqueUsers: new Set(),
        totalDuration: 0,
      }
    }

    const stats = featureStats[featureName]
    stats.count++
    if (event.user_id) stats.uniqueUsers.add(event.user_id)
    if (event.properties?.durationMs) {
      stats.totalDuration += Number(event.properties.durationMs)
    }
  })

  // Upsert feature usage
  for (const [featureName, stats] of Object.entries(featureStats)) {
    const avgDuration = stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0

    await supabase.from('analytics_feature_usage').upsert(
      {
        date,
        feature_name: featureName,
        usage_count: stats.count,
        unique_users: stats.uniqueUsers.size,
        avg_duration_ms: avgDuration,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'date,feature_name' }
    )
  }
}
