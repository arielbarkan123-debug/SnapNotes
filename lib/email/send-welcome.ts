import { sendEmail } from './resend-client'
import { generateWelcomeHtml } from './templates/WelcomeEmail'
import { createLogger } from '@/lib/logger'

const log = createLogger('email:welcome')

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://notesnap.app'

/**
 * Send a welcome email to a newly verified user.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  try {
    const html = generateWelcomeHtml({ name, email }, DASHBOARD_URL)
    const result = await sendEmail({
      to: email,
      subject: 'Welcome to NoteSnap! 📚',
      html,
    })

    if (result.success) {
      log.info({ email }, 'Welcome email sent')
    } else {
      log.warn({ email, error: result.error }, 'Welcome email failed')
    }
  } catch (err) {
    log.error({ err, email }, 'Unexpected error sending welcome email')
  }
}
