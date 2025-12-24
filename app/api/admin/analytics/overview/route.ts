import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange, formatDateForSQL } from '@/lib/admin/utils'

/**
 * GET /api/admin/analytics/overview
 * Get analytics overview dashboard data
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)

  const supabase = createServiceClient()

  try {
    // Calculate previous period dates (same duration, just before current period)
    const periodDuration = endDate.getTime() - startDate.getTime()
    const previousStartDate = new Date(startDate.getTime() - periodDuration)
    const previousEndDate = new Date(startDate.getTime() - 1) // Day before current start
    previousEndDate.setHours(23, 59, 59, 999)

    // Get daily metrics for current date range
    const { data: dailyMetrics, error: metricsError } = await supabase
      .from('analytics_daily_metrics')
      .select('*')
      .gte('date', formatDateForSQL(startDate))
      .lte('date', formatDateForSQL(endDate))
      .order('date', { ascending: true })

    if (metricsError) throw metricsError

    // Get daily metrics for previous period
    const { data: previousMetrics } = await supabase
      .from('analytics_daily_metrics')
      .select('*')
      .gte('date', formatDateForSQL(previousStartDate))
      .lte('date', formatDateForSQL(previousEndDate))

    // Calculate current period totals
    const totals = dailyMetrics?.reduce(
      (acc, day) => ({
        totalUsers: acc.totalUsers + (day.daily_active_users || 0),
        totalSessions: acc.totalSessions + (day.total_sessions || 0),
        totalPageViews: acc.totalPageViews + (day.total_page_views || 0),
        totalEvents: acc.totalEvents + (day.total_events || 0),
        totalErrors: acc.totalErrors + (day.total_errors || 0),
        newUsers: acc.newUsers + (day.new_users || 0),
      }),
      { totalUsers: 0, totalSessions: 0, totalPageViews: 0, totalEvents: 0, totalErrors: 0, newUsers: 0 }
    ) || { totalUsers: 0, totalSessions: 0, totalPageViews: 0, totalEvents: 0, totalErrors: 0, newUsers: 0 }

    // Calculate previous period totals
    const previousTotals = previousMetrics?.reduce(
      (acc, day) => ({
        totalUsers: acc.totalUsers + (day.daily_active_users || 0),
        totalSessions: acc.totalSessions + (day.total_sessions || 0),
        totalPageViews: acc.totalPageViews + (day.total_page_views || 0),
        totalEvents: acc.totalEvents + (day.total_events || 0),
        totalErrors: acc.totalErrors + (day.total_errors || 0),
        newUsers: acc.newUsers + (day.new_users || 0),
      }),
      { totalUsers: 0, totalSessions: 0, totalPageViews: 0, totalEvents: 0, totalErrors: 0, newUsers: 0 }
    ) || { totalUsers: 0, totalSessions: 0, totalPageViews: 0, totalEvents: 0, totalErrors: 0, newUsers: 0 }

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const comparison = {
      users: calculateChange(totals.totalUsers, previousTotals.totalUsers),
      sessions: calculateChange(totals.totalSessions, previousTotals.totalSessions),
      pageViews: calculateChange(totals.totalPageViews, previousTotals.totalPageViews),
      events: calculateChange(totals.totalEvents, previousTotals.totalEvents),
      errors: calculateChange(totals.totalErrors, previousTotals.totalErrors),
      newUsers: calculateChange(totals.newUsers, previousTotals.newUsers),
    }

    // Get real-time stats (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { count: activeSessionsCount } = await supabase
      .from('analytics_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', yesterday.toISOString())
      .is('ended_at', null)

    const { count: recentErrorsCount } = await supabase
      .from('analytics_errors')
      .select('*', { count: 'exact', head: true })
      .gte('occurred_at', yesterday.toISOString())

    // Get top pages for the period
    const { data: topPages } = await supabase
      .from('analytics_page_views')
      .select('page_path')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Count page views manually
    const pageViewCounts: Record<string, number> = {}
    topPages?.forEach((pv) => {
      pageViewCounts[pv.page_path] = (pageViewCounts[pv.page_path] || 0) + 1
    })

    const topPagesArray = Object.entries(pageViewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }))

    // Get device breakdown
    const { data: deviceData } = await supabase
      .from('analytics_sessions')
      .select('device_type')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())

    const deviceBreakdown = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    }

    deviceData?.forEach((session) => {
      if (session.device_type === 'desktop') deviceBreakdown.desktop++
      else if (session.device_type === 'mobile') deviceBreakdown.mobile++
      else if (session.device_type === 'tablet') deviceBreakdown.tablet++
    })

    return NextResponse.json({
      dateRange: {
        start: formatDateForSQL(startDate),
        end: formatDateForSQL(endDate),
      },
      previousPeriod: {
        start: formatDateForSQL(previousStartDate),
        end: formatDateForSQL(previousEndDate),
      },
      totals,
      previousTotals,
      comparison,
      dailyMetrics: dailyMetrics || [],
      realtime: {
        activeSessions: activeSessionsCount || 0,
        recentErrors: recentErrorsCount || 0,
      },
      topPages: topPagesArray,
      deviceBreakdown,
    })
  } catch (error) {
    console.error('[Admin Analytics] Overview error:', error)
    return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 })
  }
}
