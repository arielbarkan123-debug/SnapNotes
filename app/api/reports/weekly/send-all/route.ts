import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWeeklyReport } from '@/lib/email/report-generator'
import { generateReportHtml } from '@/lib/email/templates/WeeklyProgressReport'
import { sendEmail } from '@/lib/email/resend-client'
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:reports-send-all')

export const maxDuration = 300

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

/**
 * POST /api/reports/weekly/send-all
 *
 * Batch endpoint for Vercel Cron.
 * Sends weekly reports to all users who have reports_enabled = true.
 * Protected by CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch all users with reports enabled
    const { data: users, error } = await supabase
      .from('user_learning_profile')
      .select('user_id, parent_email')
      .eq('reports_enabled', true)
      .not('parent_email', 'is', null)

    if (error) {
      log.error({ err: error }, 'DB error')
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No users with reports enabled' })
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const user of users) {
      try {
        const reportData = await generateWeeklyReport(user.user_id)
        const unsubscribeToken = generateUnsubscribeToken(user.user_id, 'weekly_reports')
        const unsubscribeUrl = `${DASHBOARD_URL}/api/reports/unsubscribe?token=${unsubscribeToken}`
        const html = generateReportHtml(reportData, DASHBOARD_URL, unsubscribeUrl)

        const result = await sendEmail({
          to: user.parent_email,
          subject: `📊 Weekly Progress Report — ${reportData.studentName}`,
          html,
        })

        if (result.success) {
          sent++
          // Update timestamp
          try {
            await supabase
              .from('user_learning_profile')
              .update({ last_report_sent: new Date().toISOString() })
              .eq('user_id', user.user_id)
          } catch {
            // Non-critical
          }
        } else {
          failed++
          log.error({ user_id: user.user_id, error: result.error }, 'Failed for user')
          errors.push(result.error || 'Send failed')
        }
      } catch (err) {
        failed++
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        log.error({ user_id: user.user_id, errMsg: errMsg }, 'Error for user')
        errors.push(errMsg)
      }

      // Rate limiting: 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    log.debug({ sent: sent, failed: failed, length: users.length }, 'Complete: sent, failed of total')

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: users.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    })
  } catch (error) {
    log.error({ err: error }, 'Error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
