import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

/**
 * GET /api/admin/analytics/events
 * Get event analytics
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const eventName = searchParams.get('eventName')
  const category = searchParams.get('category')

  const supabase = createServiceClient()

  try {
    let query = supabase
      .from('analytics_events')
      .select('*', { count: 'exact' })
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString())
      .order('event_time', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (eventName) {
      query = query.eq('event_name', eventName)
    }
    if (category) {
      query = query.eq('event_category', category)
    }

    const { data: events, count, error: queryError } = await query

    if (queryError) throw queryError

    // Get event aggregates
    const { data: allEvents } = await supabase
      .from('analytics_events')
      .select('event_name, event_category')
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString())

    // Aggregate by event name
    const eventCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}

    allEvents?.forEach((event) => {
      eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1
      categoryCounts[event.event_category] = (categoryCounts[event.event_category] || 0) + 1
    })

    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    const categoryBreakdown = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }))

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      page,
      limit,
      topEvents,
      categoryBreakdown,
    })
  } catch (error) {
    console.error('[Admin Analytics] Events error:', error)
    return createErrorResponse(ErrorCodes.ADMIN_ANALYTICS_FETCH_FAILED)
  }
}
