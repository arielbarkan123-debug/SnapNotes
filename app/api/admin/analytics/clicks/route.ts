import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'

/**
 * GET /api/admin/analytics/clicks
 * Get click position data for heatmap visualization
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)
  const pagePath = searchParams.get('path')

  const supabase = createServiceClient()

  try {
    // Build query
    let query = supabase
      .from('analytics_events')
      .select('page_path, click_x, click_y, event_name, event_time')
      .not('click_x', 'is', null)
      .not('click_y', 'is', null)
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString())
      .order('event_time', { ascending: false })
      .limit(5000)

    if (pagePath) {
      query = query.eq('page_path', pagePath)
    }

    const { data: clicks, error: queryError } = await query

    if (queryError) throw queryError

    // Get list of unique pages with click data
    const { data: pages } = await supabase
      .from('analytics_events')
      .select('page_path')
      .not('click_x', 'is', null)
      .not('click_y', 'is', null)
      .gte('event_time', startDate.toISOString())
      .lte('event_time', endDate.toISOString())

    const uniquePages = [...new Set(pages?.map((p) => p.page_path) || [])]

    // Aggregate click density for heatmap
    const clickData = clicks?.map((click) => ({
      x: click.click_x,
      y: click.click_y,
      path: click.page_path,
      event: click.event_name,
      time: click.event_time,
    })) || []

    // Calculate density grid (10x10 grid for overview)
    const gridSize = 10
    const densityGrid: number[][] = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0))

    clickData.forEach((click) => {
      // Normalize to 0-1 range (assuming viewport is 0-1 or 0-100%)
      const normalizedX = Math.min(click.x / 100, 1)
      const normalizedY = Math.min(click.y / 100, 1)

      const gridX = Math.min(Math.floor(normalizedX * gridSize), gridSize - 1)
      const gridY = Math.min(Math.floor(normalizedY * gridSize), gridSize - 1)

      densityGrid[gridY][gridX]++
    })

    // Find max for color scaling
    const maxDensity = Math.max(...densityGrid.flat(), 1)

    return NextResponse.json({
      clicks: clickData,
      pages: uniquePages,
      densityGrid,
      maxDensity,
      totalClicks: clickData.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('[Admin Analytics] Clicks error:', error)
    return NextResponse.json({ error: 'Failed to fetch click data' }, { status: 500 })
  }
}
