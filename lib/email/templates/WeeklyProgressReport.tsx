/**
 * Weekly Progress Report — HTML Email Template
 *
 * Inline CSS for email client compatibility.
 * Not a React component to render — generates HTML string.
 */

import type { WeeklyReportData } from '../report-generator'

const COLORS = {
  violet: '#7C3AED',
  violetDark: '#6D28D9',
  purple: '#8B5CF6',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
}

export function generateReportHtml(data: WeeklyReportData, dashboardUrl: string): string {
  const { studentName, periodStart, periodEnd, stats, masteryChanges, topMistakes, recommendedTopics, encouragement } = data

  const masteryRows = masteryChanges.map(m => {
    const arrow = m.direction === 'up' ? '↑' : m.direction === 'down' ? '↓' : '🆕'
    const color = m.direction === 'up' ? COLORS.green : m.direction === 'down' ? COLORS.red : COLORS.violet
    return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid ${COLORS.gray100}; font-size: 14px; color: ${COLORS.gray700};">
          ${m.topic}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid ${COLORS.gray100}; font-size: 14px; text-align: center; color: ${COLORS.gray600};">
          ${m.previousScore}%
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid ${COLORS.gray100}; font-size: 14px; text-align: center; font-weight: 600; color: ${color};">
          <span style="color: ${color};">${arrow} ${m.currentScore}%</span>
        </td>
      </tr>
    `
  }).join('')

  const mistakeCards = topMistakes.map(m => {
    const severityColor = m.severity === 'high' ? COLORS.red : m.severity === 'medium' ? COLORS.amber : COLORS.green
    return `
      <div style="background: ${COLORS.gray50}; border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 3px solid ${severityColor};">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${COLORS.gray900};">${m.patternName}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: ${COLORS.gray600};">${m.frequency} occurrences • ${m.severity} priority</p>
      </div>
    `
  }).join('')

  const recommendedList = recommendedTopics.map(t => `
    <li style="padding: 4px 0; font-size: 14px; color: ${COLORS.gray700};">📌 ${t}</li>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Progress Report - ${studentName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.gray100};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.violet}, ${COLORS.purple}); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 14px; color: rgba(255,255,255,0.8);">📊 Weekly Progress Report</p>
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${COLORS.white};">${studentName}</h1>
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7);">${periodStart} — ${periodEnd}</p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="background: ${COLORS.white}; padding: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align: center; padding: 12px;">
                    <p style="margin: 0; font-size: 28px; font-weight: 800; color: ${COLORS.violet};">${stats.totalSessions}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: ${COLORS.gray600};">Sessions</p>
                  </td>
                  <td width="33%" style="text-align: center; padding: 12px; border-left: 1px solid ${COLORS.gray200}; border-right: 1px solid ${COLORS.gray200};">
                    <p style="margin: 0; font-size: 28px; font-weight: 800; color: ${COLORS.violet};">${stats.questionsAnswered}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: ${COLORS.gray600};">Questions</p>
                  </td>
                  <td width="33%" style="text-align: center; padding: 12px;">
                    <p style="margin: 0; font-size: 28px; font-weight: 800; color: ${stats.accuracy >= 70 ? COLORS.green : COLORS.amber};">${stats.accuracy}%</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: ${COLORS.gray600};">Accuracy</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
                <tr>
                  <td width="50%" style="text-align: center; padding: 8px;">
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${COLORS.gray900};">🔥 ${stats.currentStreak}</p>
                    <p style="margin: 2px 0 0; font-size: 12px; color: ${COLORS.gray600};">Day Streak</p>
                  </td>
                  <td width="50%" style="text-align: center; padding: 8px;">
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${COLORS.gray900};">⏱ ${stats.studyMinutes}m</p>
                    <p style="margin: 2px 0 0; font-size: 12px; color: ${COLORS.gray600};">Study Time</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Mastery Changes -->
          ${masteryChanges.length > 0 ? `
          <tr>
            <td style="background: ${COLORS.white}; padding: 0 24px 24px;">
              <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: ${COLORS.gray900};">📈 Mastery Progress</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${COLORS.gray200}; border-radius: 8px; overflow: hidden;">
                <tr style="background: ${COLORS.gray50};">
                  <th style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${COLORS.gray600}; text-align: left;">Topic</th>
                  <th style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${COLORS.gray600}; text-align: center;">Before</th>
                  <th style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${COLORS.gray600}; text-align: center;">Now</th>
                </tr>
                ${masteryRows}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Mistake Patterns -->
          ${topMistakes.length > 0 ? `
          <tr>
            <td style="background: ${COLORS.white}; padding: 0 24px 24px;">
              <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: ${COLORS.gray900};">⚠️ Areas Needing Attention</h2>
              ${mistakeCards}
            </td>
          </tr>
          ` : ''}

          <!-- Recommended Focus -->
          <tr>
            <td style="background: ${COLORS.white}; padding: 0 24px 24px;">
              <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: ${COLORS.gray900};">🎯 Recommended Focus</h2>
              <ul style="margin: 0; padding: 0 0 0 8px; list-style: none;">
                ${recommendedList}
              </ul>
            </td>
          </tr>

          <!-- Encouragement -->
          <tr>
            <td style="background: ${COLORS.white}; padding: 0 24px 24px;">
              <div style="background: #ECFDF5; border-radius: 12px; padding: 16px; border: 1px solid #D1FAE5;">
                <p style="margin: 0; font-size: 14px; color: #065F46; line-height: 1.5;">
                  💚 ${encouragement}
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background: ${COLORS.white}; padding: 0 24px 32px; text-align: center; border-radius: 0 0 16px 16px;">
              <a href="${dashboardUrl}" style="display: inline-block; background: ${COLORS.violet}; color: ${COLORS.white}; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                View Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: ${COLORS.gray600};">
                This report was sent by NoteSnap.
                <a href="${dashboardUrl}/settings" style="color: ${COLORS.violet}; text-decoration: underline;">Manage report settings</a>
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: ${COLORS.gray600};">
                © ${new Date().getFullYear()} NoteSnap
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
