/**
 * Course Completion Email Template
 *
 * Sent once when a user completes all lessons in a course.
 * Inline CSS for email client compatibility.
 * Generates an HTML string — not a React component.
 */

const COLORS = {
  violet: '#7C3AED',
  purple: '#8B5CF6',
  green: '#10B981',
  greenLight: '#ECFDF5',
  greenBorder: '#D1FAE5',
  amber: '#F59E0B',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
}

export interface CourseCompletionEmailData {
  name: string
  email: string
  courseTitle: string
  totalLessons: number
}

export function generateCourseCompletionHtml(
  data: CourseCompletionEmailData,
  dashboardUrl: string
): string {
  const { name, courseTitle, totalLessons } = data
  const displayName = name || 'there'

  const nextSteps = [
    { emoji: '🃏', title: 'Review Flashcards', desc: 'Reinforce your memory with spaced repetition cards.' },
    { emoji: '📝', title: 'Take a Practice Exam', desc: 'Test your knowledge with AI-generated exam questions.' },
    { emoji: '🤖', title: 'Ask the AI Tutor', desc: 'Dive deeper into any topic you found challenging.' },
  ]

  const stepCards = nextSteps.map(s => `
    <td style="width: 33%; padding: 6px; vertical-align: top;">
      <div style="background: ${COLORS.gray50}; border-radius: 10px; padding: 14px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 6px;">${s.emoji}</div>
        <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: ${COLORS.gray900};">${s.title}</p>
        <p style="margin: 0; font-size: 12px; color: ${COLORS.gray600}; line-height: 1.5;">${s.desc}</p>
      </div>
    </td>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Complete — ${courseTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.gray100}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.green} 0%, #059669 100%); padding: 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 40px;">🎉</p>
              <h1 style="margin: 0; color: ${COLORS.white}; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Course Complete!</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 15px; font-style: italic;">"${courseTitle}"</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <p style="margin: 0 0 20px; font-size: 16px; color: ${COLORS.gray700}; line-height: 1.6;">
                Hi <strong>${displayName}</strong>,<br><br>
                You just finished all <strong>${totalLessons} lesson${totalLessons !== 1 ? 's' : ''}</strong> in <strong>${courseTitle}</strong>. That's a real achievement — great work!
              </p>

              <!-- Celebration banner -->
              <div style="background: ${COLORS.greenLight}; border: 1px solid ${COLORS.greenBorder}; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; text-align: center;">
                <p style="margin: 0; font-size: 15px; color: #065F46; font-weight: 600;">
                  🏆 You completed ${totalLessons} lesson${totalLessons !== 1 ? 's' : ''}. Keep the momentum going!
                </p>
              </div>

              <!-- Next steps -->
              <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: ${COLORS.gray900}; text-transform: uppercase; letter-spacing: 0.5px;">What's next?</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>${stepCards}</tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${dashboardUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, ${COLORS.violet} 0%, ${COLORS.purple} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 700;">
                      Continue Studying →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; color: ${COLORS.gray600}; line-height: 1.6; border-top: 1px solid ${COLORS.gray100}; padding-top: 20px;">
                Keep up the great work.<br>
                <strong>The NoteSnap Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: ${COLORS.gray50}; padding: 20px 32px; text-align: center; border-top: 1px solid ${COLORS.gray100};">
              <p style="margin: 0; font-size: 12px; color: ${COLORS.gray600};">
                © ${new Date().getFullYear()} NoteSnap. All rights reserved.<br>
                <a href="${dashboardUrl}/settings" style="color: ${COLORS.violet}; text-decoration: none;">Manage email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
