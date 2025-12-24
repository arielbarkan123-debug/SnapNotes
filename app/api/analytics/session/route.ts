import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/analytics/session
 * Create a new analytics session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, userId, deviceInfo, utmParams, referrer, landingPage } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    // Use service client for database operations to bypass RLS
    const serviceClient = createServiceClient()

    // Get current user if not provided
    let actualUserId = userId
    if (!actualUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      actualUserId = user?.id || null
    }

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
