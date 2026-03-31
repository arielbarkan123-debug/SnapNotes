import { sendEmail } from './resend-client'
import { generateCourseCompletionHtml } from './templates/CourseCompletionEmail'
import { createLogger } from '@/lib/logger'

const log = createLogger('email:course-completion')

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://notesnap.app'

/**
 * Send a course completion email to the user.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendCourseCompletionEmail(
  email: string,
  name: string,
  courseTitle: string,
  totalLessons: number
): Promise<void> {
  try {
    const html = generateCourseCompletionHtml(
      { name, email, courseTitle, totalLessons },
      DASHBOARD_URL
    )
    const result = await sendEmail({
      to: email,
      subject: `🎉 You completed "${courseTitle}"!`,
      html,
    })

    if (result.success) {
      log.info({ email, courseTitle }, 'Course completion email sent')
    } else {
      log.warn({ email, courseTitle, error: result.error }, 'Course completion email failed')
    }
  } catch (err) {
    log.error({ err, email, courseTitle }, 'Unexpected error sending course completion email')
  }
}
