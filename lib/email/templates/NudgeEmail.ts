/**
 * Inactivity Nudge Email Template
 *
 * Sent when a user hasn't studied in 3+ days and has at least one course.
 * Inline CSS for email client compatibility.
 * Generates an HTML string — not a React component.
 */

const COLORS = {
  violet: '#7C3AED',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  amberBorder: '#FDE68A',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
}

export interface NudgeEmailData {
  name: string
  email: string
  daysSinceLastStudy: number
  courseTitle?: string
}

export function generateNudgeHtml(data: NudgeEmailData, dashboardUrl: string): string {
  const { name, daysSinceLastStudy, courseTitle } = data
  const displayName = name || 'there'

  const dayText = daysSinceLastStudy === 1 ? '1 day' : `${daysSinceLastStudy} days`
  const courseHint = courseTitle ? ` — you were working on <strong>${courseTitle}</strong>` : ''

  const tips = [
    { emoji: '⏱', text: 'Even 5 minutes of review helps lock in what you\'ve learned.' },
    { emoji: '🃏', text: 'Your flashcard deck is waiting. Spaced repetition works best when you\'re consistent.' },
    { emoji: '🧠', text: 'Ask the AI tutor one question — it only takes a moment to get unstuck.' },
  ]

  const tipItems = tips.map(t => `
    <tr>
      <td style="padding: 8px 0; vertical-align: top; width: 28px; font-size: 18px;">${t.emoji}</td>
      <td style="padding: 8px 0 8px 8px; font-size: 14px; color: ${COLORS.gray700}; line-height: 1.5;">${t.text}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time to get back to studying!</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.gray100}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.violet} 0%, ${COLORS.purple} 100%); padding: 36px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 36px;">📚</p>
              <h1 style="margin: 0; color: ${COLORS.white}; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Your notes miss you!</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Come back and keep the streak alive.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <p style="margin: 0 0 20px; font-size: 16px; color: ${COLORS.gray700}; line-height: 1.6;">
                Hi <strong>${displayName}</strong>,<br><br>
                It's been <strong>${dayText}</strong> since you last studied${courseHint}. Consistency is everything when it comes to learning — let's pick up where you left off.
              </p>

              <!-- Reminder banner -->
              <div style="background: ${COLORS.amberLight}; border: 1px solid ${COLORS.amberBorder}; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: 600;">
                  ⚡ Short, regular sessions beat long, infrequent ones every time.
                </p>
              </div>

              <!-- Tips -->
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: ${COLORS.gray900}; text-transform: uppercase; letter-spacing: 0.5px;">Quick ways to get started:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                ${tipItems}
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${dashboardUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, ${COLORS.violet} 0%, ${COLORS.purple} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 700;">
                      Resume Studying →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; color: ${COLORS.gray600}; line-height: 1.6; border-top: 1px solid ${COLORS.gray100}; padding-top: 20px;">
                You've got this.<br>
                <strong>The X+1 Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: ${COLORS.gray50}; padding: 20px 32px; text-align: center; border-top: 1px solid ${COLORS.gray100};">
              <p style="margin: 0; font-size: 12px; color: ${COLORS.gray600};">
                © ${new Date().getFullYear()} X+1. All rights reserved.<br>
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
