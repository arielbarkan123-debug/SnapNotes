import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// In-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = {
  MAX_REQUESTS: 3, // Max 3 reset requests
  WINDOW_MS: 15 * 60 * 1000, // Per 15 minutes
  BLOCK_DURATION_MS: 60 * 60 * 1000, // Block for 1 hour after exceeding
}

function getRateLimitKey(ip: string, email: string): string {
  // Rate limit by IP AND email to prevent both IP-based and email-based abuse
  return `${ip}:${email.toLowerCase()}`
}

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT.WINDOW_MS })
    return { allowed: true }
  }

  // Check if window has reset
  if (now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT.WINDOW_MS })
    return { allowed: true }
  }

  // Check if exceeded
  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment count
  record.count++
  return { allowed: true }
}

// Admin email for support contact (from env)
const ADMIN_EMAIL = process.env.ADMIN_SUPPORT_EMAIL || 'support@notesnap.com'

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

    // Get client IP for rate limiting
    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown'

    // Check rate limit
    const rateLimitKey = getRateLimitKey(ip, email)
    const { allowed, retryAfter } = checkRateLimit(rateLimitKey)

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many reset attempts. Please try again in ${Math.ceil((retryAfter || 0) / 60)} minutes.`,
          retryAfter,
        },
        { status: 429 }
      )
    }

    const supabase = createServiceClient()

    // Check if email exists in the system (for internal logging only, don't reveal to user)
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    // Log for security monitoring (don't expose to client)
    console.log(`[Password Reset] Request for ${email.substring(0, 3)}***@*** - User exists: ${userExists}`)

    // Always attempt to send the reset email
    // Supabase will ONLY send to the registered email - this is secure by design
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase(),
      {
        redirectTo: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      }
    )

    if (resetError) {
      console.error('[Password Reset] Supabase error:', resetError.message)

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
    console.error('[Password Reset] Error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
