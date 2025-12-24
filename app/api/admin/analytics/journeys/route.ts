import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'

interface PageTransition {
  from: string
  to: string
  count: number
}

/**
 * GET /api/admin/analytics/journeys
 * Get user journey/navigation flow data
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)

  const supabase = createServiceClient()

  try {
    // Get page views ordered by session and time
    const { data: pageViews, error: queryError } = await supabase
      .from('analytics_page_views')
      .select('session_id, page_path, created_at, is_entry_page, is_exit_page')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (queryError) throw queryError

    // Group by session
    const sessionPageViews: Record<string, { path: string; time: string }[]> = {}
    pageViews?.forEach((pv) => {
      if (!pv.session_id) return
      if (!sessionPageViews[pv.session_id]) {
        sessionPageViews[pv.session_id] = []
      }
      sessionPageViews[pv.session_id].push({
        path: pv.page_path,
        time: pv.created_at,
      })
    })

    // Calculate transitions
    const transitions: Record<string, number> = {}
    const entryPages: Record<string, number> = {}
    const exitPages: Record<string, number> = {}

    Object.values(sessionPageViews).forEach((session) => {
      if (session.length === 0) return

      // Track entry page
      const entryPage = session[0].path
      entryPages[entryPage] = (entryPages[entryPage] || 0) + 1

      // Track exit page
      const exitPage = session[session.length - 1].path
      exitPages[exitPage] = (exitPages[exitPage] || 0) + 1

      // Track transitions
      for (let i = 0; i < session.length - 1; i++) {
        const from = session[i].path
        const to = session[i + 1].path
        const key = `${from}|${to}`
        transitions[key] = (transitions[key] || 0) + 1
      }
    })

    // Convert to array format
    const transitionArray: PageTransition[] = Object.entries(transitions)
      .map(([key, count]) => {
        const [from, to] = key.split('|')
        return { from, to, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50) // Top 50 transitions

    // Get unique pages
    const allPages = new Set<string>()
    transitionArray.forEach((t) => {
      allPages.add(t.from)
      allPages.add(t.to)
    })

    // Format entry/exit pages
    const topEntryPages = Object.entries(entryPages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }))

    const topExitPages = Object.entries(exitPages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }))

    // Calculate flow statistics
    const totalSessions = Object.keys(sessionPageViews).length
    const avgPagesPerSession =
      totalSessions > 0
        ? (Object.values(sessionPageViews).reduce((sum, s) => sum + s.length, 0) / totalSessions).toFixed(1)
        : '0'

    return NextResponse.json({
      transitions: transitionArray,
      pages: Array.from(allPages),
      entryPages: topEntryPages,
      exitPages: topExitPages,
      stats: {
        totalSessions,
        avgPagesPerSession,
        totalTransitions: Object.values(transitions).reduce((a, b) => a + b, 0),
      },
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('[Admin Analytics] Journeys error:', error)
    return NextResponse.json({ error: 'Failed to fetch journey data' }, { status: 500 })
  }
}
