import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

/**
 * GET /api/admin/analytics/page-views
 * Get page view analytics
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const pagePath = searchParams.get('path')

  const supabase = createServiceClient()

  try {
    let query = supabase
      .from('analytics_page_views')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (pagePath) {
      query = query.eq('page_path', pagePath)
    }

    const { data: pageViews, count, error: queryError } = await query

    if (queryError) throw queryError

    // Get aggregated stats per page
    const { data: allPageViews } = await supabase
      .from('analytics_page_views')
      .select('page_path, time_on_page_ms, scroll_depth_percent')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Calculate page stats
    const pageStats: Record<string, {
      views: number
      totalTime: number
      totalScroll: number
    }> = {}

    allPageViews?.forEach((pv) => {
      if (!pageStats[pv.page_path]) {
        pageStats[pv.page_path] = { views: 0, totalTime: 0, totalScroll: 0 }
      }
      pageStats[pv.page_path].views++
      pageStats[pv.page_path].totalTime += pv.time_on_page_ms || 0
      pageStats[pv.page_path].totalScroll += pv.scroll_depth_percent || 0
    })

    const aggregatedPages = Object.entries(pageStats)
      .map(([path, stats]) => ({
        path,
        views: stats.views,
        avgTimeOnPage: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
        avgScrollDepth: stats.views > 0 ? Math.round(stats.totalScroll / stats.views) : 0,
      }))
      .sort((a, b) => b.views - a.views)

    return NextResponse.json({
      pageViews: pageViews || [],
      total: count || 0,
      page,
      limit,
      aggregatedPages,
    })
  } catch (error) {
    console.error('[Admin Analytics] Page views error:', error)
    return createErrorResponse(ErrorCodes.ADMIN_ANALYTICS_FETCH_FAILED)
  }
}
