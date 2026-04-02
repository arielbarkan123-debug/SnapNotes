import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:reports-unsubscribe')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

/**
 * GET /api/reports/unsubscribe?token=...
 *
 * One-click unsubscribe link included in every weekly report email.
 * Sets reports_enabled = false for the user and redirects to a confirmation page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const decoded = verifyUnsubscribeToken(token)
  if (!decoded) {
    return new NextResponse('Invalid or expired unsubscribe link.', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const { userId, emailType } = decoded

  try {
    const supabase = createServiceClient()

    if (emailType === 'weekly_reports') {
      const { error } = await supabase
        .from('user_learning_profile')
        .update({ reports_enabled: false, parent_email: null })
        .eq('user_id', userId)

      if (error) {
        log.error({ err: error, userId }, 'Failed to unsubscribe user')
        return new NextResponse('Something went wrong. Please try again.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
      }
    }

    log.info({ userId, emailType }, 'User unsubscribed')

    // Redirect to settings page with a success message
    return NextResponse.redirect(`${APP_URL}/settings?messageKey=unsubscribed`)
  } catch (err) {
    log.error({ err, userId }, 'Unsubscribe error')
    return new NextResponse('Something went wrong. Please try again.', { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }
}
