import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * POST /api/analytics/session
 * Create a new analytics session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // SECURITY: Never accept userId from client - always use authenticated user
    const { sessionId, deviceInfo, utmParams, referrer, landingPage } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Validate UUID format to prevent database errors
    if (!UUID_REGEX.test(sessionId)) {
      // Silently ignore invalid sessions (likely old format or admin sessions)
      return NextResponse.json({ success: true, skipped: true })
    }

    const supabase = await createClient()
    // Use service client for database operations to bypass RLS
    const serviceClient = createServiceClient()

    // SECURITY: Always get userId from authenticated session, never from request
    const { data: { user } } = await supabase.auth.getUser()
    const actualUserId = user?.id || null

    // Insert session
    const { error } = await serviceClient.from('analytics_sessions').insert({
      id: sessionId,
      user_id: actualUserId,
      started_at: new Date().toISOString(),
      device_type: deviceInfo?.deviceType || null,
      browser: deviceInfo?.browser || null,
      browser_version: deviceInfo?.browserVersion || null,
      os: deviceInfo?.os || null,
      os_version: deviceInfo?.osVersion || null,
      screen_width: deviceInfo?.screenWidth || null,
      screen_height: deviceInfo?.screenHeight || null,
      timezone: deviceInfo?.timezone || null,
      locale: deviceInfo?.locale || null,
      utm_source: utmParams?.source || null,
      utm_medium: utmParams?.medium || null,
      utm_campaign: utmParams?.campaign || null,
      landing_page: landingPage || null,
      referrer: referrer || null,
      page_count: 0,
      is_bounce: true,
    })

    if (error) {
      console.error('[Analytics] Failed to create session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.error('[Analytics] Session creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
