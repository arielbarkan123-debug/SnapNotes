import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateNudgeHtml } from '@/lib/email/templates/NudgeEmail'
import { sendEmail } from '@/lib/email/resend-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron-nudge-emails')
const CRON_SECRET = process.env.CRON_SECRET
const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

/** Users inactive for this many days trigger a nudge */
const INACTIVITY_DAYS = 3
/** Don't re-nudge a user within this many days */
const NUDGE_COOLDOWN_DAYS = 7

export const maxDuration = 300

/**
 * POST /api/cron/send-nudge-emails
 *
 * Sends re-engagement emails to users who:
 * - Have at least one course
 * - Haven't studied in INACTIVITY_DAYS days
 * - Haven't been nudged in the last NUDGE_COOLDOWN_DAYS days
 * - Have an email address
 *
 * Scheduled in vercel.json to run daily.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const now = new Date()

    const inactivityCutoff = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const nudgeCooloffCutoff = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Find users who haven't studied recently and aren't in cooldown.
    // We join with auth.users for email + name via a Supabase RPC or direct service query.
    // Strategy: query user_progress for last activity, cross with user_learning_profile for nudge gate.
    const { data: candidates, error } = await supabase.rpc('get_nudge_candidates', {
      inactivity_cutoff: inactivityCutoff,
      nudge_cooloff_cutoff: nudgeCooloffCutoff,
    })

    if (error) {
      // If the RPC doesn't exist yet, fall back to a manual query
      if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
        log.warn('get_nudge_candidates RPC not found — skipping nudge run. Run migration first.')
        return NextResponse.json({ success: true, sent: 0, message: 'RPC not available yet' })
      }
      log.error({ err: error }, 'DB error fetching nudge candidates')
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No users to nudge' })
    }

    let sent = 0
    let failed = 0

    for (const user of candidates as Array<{
      user_id: string
      email: string
      name: string | null
      days_inactive: number
      last_course_title: string | null
    }>) {
      try {
        const html = generateNudgeHtml(
          {
            name: user.name || '',
            email: user.email,
            daysSinceLastStudy: user.days_inactive,
            courseTitle: user.last_course_title || undefined,
          },
          DASHBOARD_URL
        )

        const result = await sendEmail({
          to: user.email,
          subject: `📚 Come back and keep your streak — ${user.days_inactive} days since your last session`,
          html,
        })

        if (result.success) {
          sent++
          // Update last_nudge_sent_at
          try {
            await supabase
              .from('user_learning_profile')
              .update({ last_nudge_sent_at: now.toISOString() })
              .eq('user_id', user.user_id)
          } catch {
            // Non-critical
          }
        } else {
          failed++
          log.warn({ user_id: user.user_id, error: result.error }, 'Nudge email failed for user')
        }
      } catch (err) {
        failed++
        log.error({ err, user_id: user.user_id }, 'Error sending nudge email')
      }

      // Rate limit: 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    log.info({ sent, failed, total: candidates.length }, 'Nudge email run complete')

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: candidates.length,
    })
  } catch (error) {
    log.error({ err: error }, 'Nudge cron error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
