import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange, formatDateForSQL } from '@/lib/admin/utils'

/**
 * GET /api/admin/analytics/engagement
 * Get engagement metrics (DAU, WAU, MAU, retention)
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)

  const supabase = createServiceClient()

  try {
    // Get daily active users over time
    const { data: dailyMetrics } = await supabase
      .from('analytics_daily_metrics')
      .select('date, daily_active_users, new_users, returning_users')
      .gte('date', formatDateForSQL(startDate))
      .lte('date', formatDateForSQL(endDate))
      .order('date', { ascending: true })

    // Calculate WAU and MAU
    const now = new Date()
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    // Get unique users in last 7 days
    const { data: weeklyUsers } = await supabase
      .from('analytics_sessions')
      .select('user_id')
      .gte('started_at', oneWeekAgo.toISOString())
      .not('user_id', 'is', null)

    const weeklyActiveUsers = new Set(weeklyUsers?.map((u) => u.user_id) || []).size

    // Get unique users in last 30 days
    const { data: monthlyUsers } = await supabase
      .from('analytics_sessions')
      .select('user_id')
      .gte('started_at', oneMonthAgo.toISOString())
      .not('user_id', 'is', null)

    const monthlyActiveUsers = new Set(monthlyUsers?.map((u) => u.user_id) || []).size

    // Get hourly patterns for heatmap
    const { data: hourlyPatterns } = await supabase
      .from('analytics_hourly_patterns')
      .select('hour, day_of_week, session_count, unique_users')
      .gte('date', formatDateForSQL(startDate))
      .lte('date', formatDateForSQL(endDate))

    // Aggregate hourly data into heatmap format
    const heatmapData: number[][] = Array(7)
      .fill(null)
      .map(() => Array(24).fill(0))

    hourlyPatterns?.forEach((pattern) => {
      if (pattern.day_of_week >= 0 && pattern.day_of_week < 7) {
        heatmapData[pattern.day_of_week][pattern.hour] += pattern.session_count || 0
      }
    })

    // Calculate retention (simplified - users who returned within 7 days)
    // This is a basic implementation - real cohort analysis would be more complex
    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('user_id, started_at')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .not('user_id', 'is', null)
      .order('started_at', { ascending: true })

    // Group sessions by user
    const userSessions: Record<string, Date[]> = {}
    sessions?.forEach((s) => {
      if (s.user_id) {
        if (!userSessions[s.user_id]) {
          userSessions[s.user_id] = []
        }
        userSessions[s.user_id].push(new Date(s.started_at))
      }
    })

    // Calculate simple day 1, 7, 30 retention
    let day1Retention = 0
    let day7Retention = 0
    let day30Retention = 0
    let totalUsers = 0

    Object.values(userSessions).forEach((dates) => {
      if (dates.length < 1) return
      totalUsers++

      const firstSession = dates[0]
      const hasDay1 = dates.some((d) => {
        const diff = Math.floor((d.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24))
        return diff === 1
      })
      const hasDay7 = dates.some((d) => {
        const diff = Math.floor((d.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24))
        return diff >= 6 && diff <= 8
      })
      const hasDay30 = dates.some((d) => {
        const diff = Math.floor((d.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24))
        return diff >= 28 && diff <= 32
      })

      if (hasDay1) day1Retention++
      if (hasDay7) day7Retention++
      if (hasDay30) day30Retention++
    })

    return NextResponse.json({
      activeUsers: {
        daily: dailyMetrics?.[dailyMetrics.length - 1]?.daily_active_users || 0,
        weekly: weeklyActiveUsers,
        monthly: monthlyActiveUsers,
      },
      dailyMetrics: dailyMetrics || [],
      heatmapData,
      retention: {
        day1: totalUsers > 0 ? Math.round((day1Retention / totalUsers) * 100) : 0,
        day7: totalUsers > 0 ? Math.round((day7Retention / totalUsers) * 100) : 0,
        day30: totalUsers > 0 ? Math.round((day30Retention / totalUsers) * 100) : 0,
      },
      stickiness: monthlyActiveUsers > 0
        ? Math.round((dailyMetrics?.[dailyMetrics.length - 1]?.daily_active_users || 0) / monthlyActiveUsers * 100)
        : 0,
    })
  } catch (error) {
    console.error('[Admin Analytics] Engagement error:', error)
    return NextResponse.json({ error: 'Failed to fetch engagement data' }, { status: 500 })
  }
}
