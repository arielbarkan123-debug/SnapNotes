/**
 * Welcome Email Template
 *
 * Sent once when a user verifies their email for the first time.
 * Inline CSS for email client compatibility.
 * Generates an HTML string — not a React component.
 */

const COLORS = {
  violet: '#7C3AED',
  violetDark: '#6D28D9',
  purple: '#8B5CF6',
  green: '#10B981',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
}

export interface WelcomeEmailData {
  name: string
  email: string
}

export function generateWelcomeHtml(data: WelcomeEmailData, dashboardUrl: string): string {
  const { name } = data
  const displayName = name || 'there'

  const features = [
    {
      emoji: '📸',
      title: 'Snap Your Notes',
      desc: 'Upload a photo of your notebook or paste text — NoteSnap extracts and organizes everything.',
    },
    {
      emoji: '🤖',
      title: 'AI Builds Your Course',
      desc: 'Claude AI turns your notes into structured lessons with explanations, examples, and diagrams.',
    },
    {
      emoji: '🧠',
      title: 'Study & Practice',
      desc: 'Review with spaced repetition, practice questions, and AI tutoring until you truly understand.',
    },
  ]

  const featureCards = features.map(f => `
    <td style="width: 33%; padding: 8px; vertical-align: top;">
      <div style="background: ${COLORS.gray50}; border-radius: 10px; padding: 16px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 8px;">${f.emoji}</div>
        <p style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: ${COLORS.gray900};">${f.title}</p>
        <p style="margin: 0; font-size: 12px; color: ${COLORS.gray600}; line-height: 1.5;">${f.desc}</p>
      </div>
    </td>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to NoteSnap</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.gray100}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.violet} 0%, ${COLORS.purple} 100%); padding: 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 28px;">📚</p>
              <h1 style="margin: 0; color: ${COLORS.white}; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Welcome to NoteSnap!</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 15px;">Your AI-powered study companion is ready.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <p style="margin: 0 0 24px; font-size: 16px; color: ${COLORS.gray700}; line-height: 1.6;">
                Hi <strong>${displayName}</strong>,<br><br>
                You're all set! NoteSnap turns your notes into personalized courses so you can study smarter, not harder.
              </p>

              <!-- Feature cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>${featureCards}</tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${dashboardUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, ${COLORS.violet} 0%, ${COLORS.purple} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.2px;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; color: ${COLORS.gray600}; line-height: 1.6; border-top: 1px solid ${COLORS.gray100}; padding-top: 20px;">
                Have questions? Just reply to this email — we're happy to help.<br>
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
