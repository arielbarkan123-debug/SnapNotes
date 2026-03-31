import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'

const log = createLogger('api:auth-forgot-password')

// Admin email for support contact (from env)
const ADMIN_EMAIL = process.env.ADMIN_SUPPORT_EMAIL || 'support@notesnap.app'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check rate limit — keyed by IP:email to prevent both IP and email abuse
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    const rateLimitKey = `ip:${ip}:${email.toLowerCase()}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMITS.forgotPassword)

    if (!rateLimitResult.allowed) {
      const retryAfterSec = Math.ceil(rateLimitResult.resetIn / 1000)
      return NextResponse.json(
        {
          success: false,
          error: `Too many reset attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
          retryAfter: retryAfterSec,
        },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    const supabase = createServiceClient()

    // Log for security monitoring (don't expose to client)
    // Note: We intentionally don't check if user exists - resetPasswordForEmail()
    // handles non-existent emails silently, and checking would require loading all users
    log.debug('Request for ***@***')

    // Always attempt to send the reset email
    // Supabase will ONLY send to the registered email - this is secure by design
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://notesnap.app'}/reset-password`,
      }
    )

    if (resetError) {
      log.error({ err: resetError }, 'Supabase password reset error')

      // Don't reveal specific errors to prevent email enumeration
      // Just return success message regardless
    }

    // Always return success to prevent email enumeration attacks
    // The reset email will ONLY be sent to the account's registered email
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
      adminEmail: ADMIN_EMAIL,
    })
  } catch (error) {
    log.error({ err: error }, 'Error')
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
