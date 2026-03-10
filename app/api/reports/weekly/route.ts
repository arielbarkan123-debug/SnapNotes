import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { generateWeeklyReport } from '@/lib/email/report-generator'
import { generateReportHtml } from '@/lib/email/templates/WeeklyProgressReport'
import { sendEmail } from '@/lib/email/resend-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:reports-weekly')

export const maxDuration = 60

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://snap-notes-j68u-three.vercel.app'

// GET: Preview report (returns HTML)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const reportData = await generateWeeklyReport(user.id)
    const html = generateReportHtml(reportData, DASHBOARD_URL)

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    log.error({ err: error }, 'Preview error')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate report preview')
  }
}

// POST: Send report to parent email
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Get parent email from profile
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('parent_email, reports_enabled')
      .eq('user_id', user.id)
      .single()

    if (!profile?.parent_email || !profile?.reports_enabled) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Parent reports not configured or not enabled')
    }

    // Generate and send
    const reportData = await generateWeeklyReport(user.id)
    const html = generateReportHtml(reportData, DASHBOARD_URL)

    const result = await sendEmail({
      to: profile.parent_email,
      subject: `📊 Weekly Progress Report — ${reportData.studentName}`,
      html,
    })

    if (!result.success) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to send email')
    }

    // Update last sent timestamp
    try {
      await supabase
        .from('user_learning_profile')
        .update({ last_report_sent: new Date().toISOString() })
        .eq('user_id', user.id)
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      emailId: result.id,
    })
  } catch (error) {
    log.error({ err: error }, 'Send error')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to send report')
  }
}
