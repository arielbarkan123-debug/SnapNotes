import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================================
// Types
// ============================================================================

interface ErrorReport {
  errorType: 'javascript' | 'api' | 'network' | 'unhandled'
  errorMessage: string
  errorStack?: string
  componentName?: string
  pagePath?: string
  sessionId?: string
  userAgent?: string
  context?: Record<string, unknown>
  apiEndpoint?: string
  httpMethod?: string
  httpStatus?: number
  deviceInfo?: {
    browser?: string
    browserVersion?: string
    os?: string
    osVersion?: string
    deviceType?: string
    screenResolution?: string
  }
}

// ============================================================================
// POST - Report an error
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ErrorReport = await request.json()

    // Validate required fields
    if (!body.errorMessage) {
      return NextResponse.json(
        { error: 'errorMessage is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Insert error log
    const { error: insertError } = await supabase
      .from('error_logs')
      .insert({
        error_type: body.errorType || 'javascript',
        error_message: body.errorMessage.slice(0, 5000), // Limit message length
        error_stack: body.errorStack?.slice(0, 10000), // Limit stack length
        component_name: body.componentName,
        page_path: body.pagePath,
        user_id: user?.id || null,
        session_id: body.sessionId,
        user_agent: body.userAgent || request.headers.get('user-agent'),
        browser: body.deviceInfo?.browser,
        browser_version: body.deviceInfo?.browserVersion,
        os: body.deviceInfo?.os,
        os_version: body.deviceInfo?.osVersion,
        device_type: body.deviceInfo?.deviceType,
        screen_resolution: body.deviceInfo?.screenResolution,
        context: body.context || {},
        api_endpoint: body.apiEndpoint,
        http_method: body.httpMethod,
        http_status: body.httpStatus,
      })

    if (insertError) {
      console.error('[Error Monitoring] Failed to log error:', insertError)
      // Don't fail the request - error logging should be silent
      return NextResponse.json({ logged: false })
    }

    return NextResponse.json({ logged: true })
  } catch (err) {
    console.error('[Error Monitoring] Exception:', err)
    return NextResponse.json({ logged: false })
  }
}

// ============================================================================
// GET - Get error logs (admin only)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')
    const errorType = searchParams.get('type')
    const pagePath = searchParams.get('page')
    const timeRange = searchParams.get('range') || '24h' // 1h, 24h, 7d, 30d
    const grouped = searchParams.get('grouped') === 'true'

    // Calculate time filter
    const timeFilters: Record<string, string> = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    }
    const timeFilter = timeFilters[timeRange] || '24 hours'

    if (grouped) {
      // Return grouped/aggregated errors
      const { data, error } = await supabase
        .rpc('get_grouped_errors', {
          time_range: timeFilter,
          error_type_filter: errorType || null,
          page_path_filter: pagePath || null,
          result_limit: limit,
        })

      if (error) {
        // Fallback to regular query if RPC doesn't exist
        const { data: errors, error: queryError } = await supabase
          .from('error_logs')
          .select('*')
          .gte('created_at', new Date(Date.now() - parseDuration(timeFilter)).toISOString())
          .order('created_at', { ascending: false })
          .limit(limit)

        if (queryError) throw queryError
        return NextResponse.json({ errors, grouped: false })
      }

      return NextResponse.json({ errors: data, grouped: true })
    }

    // Build query
    let query = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - parseDuration(timeFilter)).toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (errorType) {
      query = query.eq('error_type', errorType)
    }
    if (pagePath) {
      query = query.eq('page_path', pagePath)
    }

    const { data: errors, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      errors,
      total: count,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[Error Monitoring] GET error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Clear old error logs (admin only)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const olderThan = searchParams.get('olderThan') || '30d'

    const daysMap: Record<string, number> = {
      '7d': 7,
      '14d': 14,
      '30d': 30,
    }
    const days = daysMap[olderThan] || 30
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const { error, count } = await supabase
      .from('error_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    if (error) throw error

    return NextResponse.json({ deleted: count || 0 })
  } catch (err) {
    console.error('[Error Monitoring] DELETE error:', err)
    return NextResponse.json(
      { error: 'Failed to delete error logs' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helpers
// ============================================================================

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)\s*(hour|hours|day|days)$/)
  if (!match) return 24 * 60 * 60 * 1000 // Default 24h

  const value = parseInt(match[1])
  const unit = match[2]

  if (unit.startsWith('hour')) {
    return value * 60 * 60 * 1000
  }
  return value * 24 * 60 * 60 * 1000
}
