import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'

/**
 * GET /api/admin/analytics/sessions
 * Get session analytics
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const deviceType = searchParams.get('deviceType')

  const supabase = createServiceClient()

  try {
    let query = supabase
      .from('analytics_sessions')
      .select('*', { count: 'exact' })
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .order('started_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (deviceType) {
      query = query.eq('device_type', deviceType)
    }

    const { data: sessions, count, error: queryError } = await query

    if (queryError) throw queryError

    // Get session stats
    const { data: allSessions } = await supabase
      .from('analytics_sessions')
      .select('duration_ms, is_bounce, device_type, page_count')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())

    let totalDuration = 0
    let bounceCount = 0
    let totalPageCount = 0
    const deviceCounts: Record<string, number> = {}

    allSessions?.forEach((session) => {
      totalDuration += session.duration_ms || 0
      if (session.is_bounce) bounceCount++
      totalPageCount += session.page_count || 0
      if (session.device_type) {
        deviceCounts[session.device_type] = (deviceCounts[session.device_type] || 0) + 1
      }
    })

    const sessionCount = allSessions?.length || 0

    // Get hourly distribution
    const { data: hourlyData } = await supabase
      .from('analytics_hourly_patterns')
      .select('hour, session_count')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // Aggregate hourly data
    const hourlyDistribution = Array(24).fill(0)
    hourlyData?.forEach((h) => {
      hourlyDistribution[h.hour] += h.session_count || 0
    })

    return NextResponse.json({
      sessions: sessions || [],
      total: count || 0,
      page,
      limit,
      stats: {
        totalSessions: sessionCount,
        totalTimeInApp: totalDuration,
        avgDuration: sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0,
        bounceRate: sessionCount > 0 ? Math.round((bounceCount / sessionCount) * 100) : 0,
        avgPagesPerSession: sessionCount > 0 ? (totalPageCount / sessionCount).toFixed(1) : '0',
        deviceBreakdown: deviceCounts,
      },
      hourlyDistribution,
    })
  } catch (error) {
    console.error('[Admin Analytics] Sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch session data' }, { status: 500 })
  }
}
