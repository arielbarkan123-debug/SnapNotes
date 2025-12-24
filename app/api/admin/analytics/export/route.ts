import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'

/**
 * GET /api/admin/analytics/export
 * Export analytics data as CSV or JSON
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)
  const format = searchParams.get('format') || 'json'
  const dataType = searchParams.get('type') || 'sessions'
  const limit = parseInt(searchParams.get('limit') || '10000')

  const supabase = createServiceClient()

  try {
    let data: Record<string, unknown>[] = []
    let columns: string[] = []

    switch (dataType) {
      case 'sessions': {
        const { data: sessions } = await supabase
          .from('analytics_sessions')
          .select('*')
          .gte('started_at', startDate.toISOString())
          .lte('started_at', endDate.toISOString())
          .order('started_at', { ascending: false })
          .limit(limit)

        data = sessions || []
        columns = [
          'id', 'user_id', 'started_at', 'ended_at', 'duration_ms',
          'page_count', 'is_bounce', 'device_type', 'browser', 'os',
          'landing_page', 'referrer',
        ]
        break
      }

      case 'page-views': {
        const { data: pageViews } = await supabase
          .from('analytics_page_views')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(limit)

        data = pageViews || []
        columns = [
          'id', 'user_id', 'session_id', 'page_path', 'page_title',
          'view_start_at', 'view_end_at', 'time_on_page_ms', 'scroll_depth_percent',
          'is_entry_page', 'is_exit_page',
        ]
        break
      }

      case 'events': {
        const { data: events } = await supabase
          .from('analytics_events')
          .select('*')
          .gte('event_time', startDate.toISOString())
          .lte('event_time', endDate.toISOString())
          .order('event_time', { ascending: false })
          .limit(limit)

        data = events || []
        columns = [
          'id', 'user_id', 'session_id', 'event_name', 'event_category',
          'page_path', 'event_time', 'properties',
        ]
        break
      }

      case 'errors': {
        const { data: errors } = await supabase
          .from('analytics_errors')
          .select('*')
          .gte('occurred_at', startDate.toISOString())
          .lte('occurred_at', endDate.toISOString())
          .order('occurred_at', { ascending: false })
          .limit(limit)

        data = errors || []
        columns = [
          'id', 'user_id', 'error_type', 'error_message', 'page_path',
          'api_endpoint', 'http_status', 'occurred_at',
        ]
        break
      }

      case 'funnels': {
        const { data: funnels } = await supabase
          .from('analytics_funnels')
          .select('*')
          .gte('completed_at', startDate.toISOString())
          .lte('completed_at', endDate.toISOString())
          .order('completed_at', { ascending: false })
          .limit(limit)

        data = funnels || []
        columns = [
          'id', 'user_id', 'funnel_name', 'step_name', 'step_order',
          'completed_at', 'time_from_previous_step_ms',
        ]
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 })
    }

    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = columns.join(',')
      const csvRows = data.map((row) =>
        columns.map((col) => {
          const value = row[col]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        }).join(',')
      )

      const csv = [csvHeader, ...csvRows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics_${dataType}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      dataType,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      count: data.length,
      data,
    })
  } catch (error) {
    console.error('[Admin Analytics] Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
