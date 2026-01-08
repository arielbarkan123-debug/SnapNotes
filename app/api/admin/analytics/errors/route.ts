import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'

/**
 * DELETE /api/admin/analytics/errors
 * Clear all error tracking data
 */
export async function DELETE() {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const supabase = createServiceClient()

  try {
    // Delete all errors from the analytics_errors table
    const { error: deleteError } = await supabase
      .from('analytics_errors')
      .delete()
      .gte('id', 0) // This matches all rows

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'All errors have been cleared',
    })
  } catch (err) {
    console.error('[Admin Analytics] Clear errors error:', err)
    return NextResponse.json({ error: 'Failed to clear errors' }, { status: 500 })
  }
}

/**
 * GET /api/admin/analytics/errors
 * Get error tracking data
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const errorType = searchParams.get('type')

  const supabase = createServiceClient()

  try {
    let query = supabase
      .from('analytics_errors')
      .select('*', { count: 'exact' })
      .gte('occurred_at', startDate.toISOString())
      .lte('occurred_at', endDate.toISOString())
      .order('occurred_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (errorType) {
      query = query.eq('error_type', errorType)
    }

    const { data: errors, count, error: queryError } = await query

    if (queryError) throw queryError

    // Get error aggregates
    const { data: allErrors } = await supabase
      .from('analytics_errors')
      .select('error_type, error_message, page_path')
      .gte('occurred_at', startDate.toISOString())
      .lte('occurred_at', endDate.toISOString())

    // Aggregate by type
    const typeCounts: Record<string, number> = {
      javascript: 0,
      api: 0,
      network: 0,
      unhandled: 0,
    }

    // Aggregate by message (top errors)
    const messageCounts: Record<string, number> = {}

    // Aggregate by page
    const pageCounts: Record<string, number> = {}

    allErrors?.forEach((err) => {
      if (err.error_type) {
        typeCounts[err.error_type] = (typeCounts[err.error_type] || 0) + 1
      }

      // Truncate message for grouping
      const shortMessage = err.error_message?.slice(0, 100) || 'Unknown'
      messageCounts[shortMessage] = (messageCounts[shortMessage] || 0) + 1

      if (err.page_path) {
        pageCounts[err.page_path] = (pageCounts[err.page_path] || 0) + 1
      }
    })

    const topErrors = Object.entries(messageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }))

    const errorsByPage = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }))

    return NextResponse.json({
      errors: errors || [],
      total: count || 0,
      page,
      limit,
      typeBreakdown: typeCounts,
      topErrors,
      errorsByPage,
    })
  } catch (error) {
    console.error('[Admin Analytics] Errors error:', error)
    return NextResponse.json({ error: 'Failed to fetch error data' }, { status: 500 })
  }
}
