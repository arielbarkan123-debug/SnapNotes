# Day 5: Parent Progress Reports + Exam Prediction Engine

## Goal
**Part A**: Weekly email reports to parents with study progress, mastery gains, top mistakes, and recommendations. Sent automatically via Vercel Cron every Sunday morning.
**Part B**: Upload 3+ analyzed past exam papers → AI predicts likely topics for next exam → generates a targeted study plan.

## Prerequisites
- Day 0-4 completed, `npm run build` passes
- `resend` + `@react-email/components` installed (Day 0)
- `user_learning_profile` has `parent_email`, `reports_enabled`, `last_report_sent` columns (Day 0 migration)
- `RESEND_API_KEY` environment variable set in `.env.local` and Vercel

---

## Project Context & Conventions

**NoteSnap** is a Next.js 14 (App Router) homework assistant with Supabase, Tailwind, next-intl (EN+HE), dark mode.

### Key Conventions
- **API Routes**: `createClient()` + `getUser()`, `createErrorResponse(ErrorCodes.X)`
- **Settings**: `app/(main)/settings/page.tsx` — client component with sections, uses `createClient()` from `@/lib/supabase/client`
- **Supabase**: Filter by `user_id`, RLS policies on all tables
- **Toast**: `useToast()` from `@/contexts/ToastContext`
- **Env vars**: `.env.local` for local dev, Vercel env for production

### Critical File Locations
- `app/(main)/settings/page.tsx` — Settings page (add Parent Reports section)
- `app/(main)/exams/` — Past exams pages
- Practice tables: `practice_sessions`, `practice_question_logs`
- Mastery table: `user_concept_mastery`
- Gamification: `gamification_profiles` table (streaks, XP)
- `lib/errors.ts` — Error codes and utilities
- `vercel.json` — Vercel config (add cron)

---

## Part A: Parent Progress Reports

### Step 1: Create `lib/email/resend-client.ts`

```typescript
/**
 * Resend Email Client
 *
 * Wrapper for sending emails via Resend.
 * Used for parent weekly progress reports.
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NoteSnap <noreply@notesnap.app>'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Send an email via Resend.
 * Returns the email ID on success, throws on failure.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<string> {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    replyTo,
  })

  if (error) {
    console.error('[Email] Send failed:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }

  console.log(`[Email] Sent to ${to}, ID: ${data?.id}`)
  return data?.id || ''
}
```

### Step 2: Create `lib/email/report-generator.ts`

```typescript
/**
 * Weekly Report Data Generator
 *
 * Fetches practice stats, mastery changes, and insights
 * for the weekly parent email.
 */

import { createClient } from '@/lib/supabase/server'

export interface WeeklyReportData {
  studentName: string
  periodStart: string // ISO date
  periodEnd: string
  stats: {
    totalSessions: number
    questionsAnswered: number
    correctRate: number // 0-100
    currentStreak: number
    studyMinutes: number
  }
  masteryChanges: Array<{
    concept: string
    previousLevel: number
    currentLevel: number
    direction: 'up' | 'down' | 'new'
  }>
  topMistakePatterns: Array<{
    name: string
    severity: 'low' | 'medium' | 'high'
    frequency: number
  }>
  recommendedTopics: string[]
  encouragement: string
}

export async function generateWeeklyReport(userId: string): Promise<WeeklyReportData> {
  const supabase = await createClient()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get user info
  const { data: user } = await supabase.auth.admin.getUserById(userId)
  const studentName = user?.user?.user_metadata?.name || user?.user?.email?.split('@')[0] || 'Student'

  // Get practice sessions this week
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('correct_count, total_count, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekAgo.toISOString())

  const totalSessions = sessions?.length || 0
  const questionsAnswered = sessions?.reduce((sum, s) => sum + (s.total_count || 0), 0) || 0
  const correctTotal = sessions?.reduce((sum, s) => sum + (s.correct_count || 0), 0) || 0
  const correctRate = questionsAnswered > 0 ? Math.round((correctTotal / questionsAnswered) * 100) : 0

  // Get streak from gamification
  const { data: gamification } = await supabase
    .from('gamification_profiles')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  // Get mastery changes
  const { data: mastery } = await supabase
    .from('user_concept_mastery')
    .select('concept, mastery_level, previous_mastery_level, updated_at')
    .eq('user_id', userId)
    .gte('updated_at', weekAgo.toISOString())
    .order('mastery_level', { ascending: false })
    .limit(10)

  const masteryChanges = (mastery || []).map(m => ({
    concept: m.concept,
    previousLevel: m.previous_mastery_level ?? 0,
    currentLevel: m.mastery_level,
    direction: m.previous_mastery_level == null
      ? 'new' as const
      : m.mastery_level > (m.previous_mastery_level || 0)
        ? 'up' as const
        : 'down' as const,
  }))

  // Get mistake patterns (cached)
  const { data: mistakes } = await supabase
    .from('mistake_patterns')
    .select('patterns')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const topMistakePatterns = ((mistakes?.patterns as unknown[]) || [])
    .slice(0, 2)
    .map((p: Record<string, unknown>) => ({
      name: (p.patternName as string) || '',
      severity: (p.severity as 'low' | 'medium' | 'high') || 'low',
      frequency: (p.frequency as number) || 0,
    }))

  // Determine recommended topics (low mastery topics)
  const { data: lowMastery } = await supabase
    .from('user_concept_mastery')
    .select('concept')
    .eq('user_id', userId)
    .lt('mastery_level', 0.5)
    .order('mastery_level', { ascending: true })
    .limit(3)

  const recommendedTopics = (lowMastery || []).map(m => m.concept)

  // Generate encouragement based on performance
  let encouragement: string
  if (correctRate >= 80) {
    encouragement = `${studentName} is doing excellent work! Keep up the great momentum!`
  } else if (correctRate >= 60) {
    encouragement = `${studentName} is making steady progress. Focused practice on weak areas will help reach the next level.`
  } else if (totalSessions > 0) {
    encouragement = `${studentName} is putting in effort. With consistent daily practice, improvement will follow.`
  } else {
    encouragement = `${studentName} hasn't practiced this week. Even 10 minutes of daily practice makes a big difference.`
  }

  return {
    studentName,
    periodStart: weekAgo.toISOString(),
    periodEnd: now.toISOString(),
    stats: {
      totalSessions,
      questionsAnswered,
      correctRate,
      currentStreak: gamification?.current_streak || 0,
      studyMinutes: totalSessions * 15, // Rough estimate
    },
    masteryChanges,
    topMistakePatterns,
    recommendedTopics,
    encouragement,
  }
}
```

### Step 3: Create `lib/email/templates/WeeklyProgressReport.tsx`

This generates the email HTML string. Using inline styles (not Tailwind) since email clients don't support CSS classes.

```typescript
/**
 * Weekly Progress Report Email Template
 *
 * Generates HTML email for parent progress reports.
 * Uses inline styles (email clients don't support CSS classes).
 */

import type { WeeklyReportData } from '../report-generator'

export function renderWeeklyReportEmail(data: WeeklyReportData): string {
  const { studentName, stats, masteryChanges, topMistakePatterns, recommendedTopics, encouragement } = data

  const periodStart = new Date(data.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const periodEnd = new Date(data.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">📚 NoteSnap</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Weekly Progress Report</p>
      <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px;">${periodStart} — ${periodEnd}</p>
    </div>

    <!-- Main Content -->
    <div style="background:white;padding:24px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;">
      <!-- Student Name -->
      <h2 style="color:#1f2937;font-size:18px;margin:0 0 16px;">Hi! Here's how ${studentName} did this week:</h2>

      <!-- Stats Grid -->
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="color:#6b7280;font-size:11px;margin:0;text-transform:uppercase;">Sessions</p>
          <p style="color:#1f2937;font-size:28px;font-weight:700;margin:4px 0 0;">${stats.totalSessions}</p>
        </div>
        <div style="flex:1;min-width:120px;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="color:#6b7280;font-size:11px;margin:0;text-transform:uppercase;">Questions</p>
          <p style="color:#1f2937;font-size:28px;font-weight:700;margin:4px 0 0;">${stats.questionsAnswered}</p>
        </div>
        <div style="flex:1;min-width:120px;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="color:#6b7280;font-size:11px;margin:0;text-transform:uppercase;">Accuracy</p>
          <p style="color:${stats.correctRate >= 70 ? '#16a34a' : stats.correctRate >= 50 ? '#d97706' : '#dc2626'};font-size:28px;font-weight:700;margin:4px 0 0;">${stats.correctRate}%</p>
        </div>
      </div>

      ${stats.currentStreak > 0 ? `
      <div style="background:#fef3c7;border-radius:12px;padding:12px 16px;margin-bottom:24px;text-align:center;">
        <p style="color:#92400e;font-size:14px;margin:0;">🔥 ${stats.currentStreak}-day study streak!</p>
      </div>
      ` : ''}

      <!-- Mastery Changes -->
      ${masteryChanges.length > 0 ? `
      <h3 style="color:#1f2937;font-size:16px;margin:24px 0 12px;">📈 Mastery Progress</h3>
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        ${masteryChanges.slice(0, 5).map(m => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f3f4f6;">
          <span style="color:#374151;font-size:14px;">${m.concept}</span>
          <span style="color:${m.direction === 'up' ? '#16a34a' : m.direction === 'down' ? '#dc2626' : '#7c3aed'};font-size:14px;font-weight:600;">
            ${m.direction === 'up' ? '↑' : m.direction === 'down' ? '↓' : '🆕'} ${Math.round(m.currentLevel * 100)}%
          </span>
        </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Mistake Patterns -->
      ${topMistakePatterns.length > 0 ? `
      <h3 style="color:#1f2937;font-size:16px;margin:24px 0 12px;">⚠️ Areas to Watch</h3>
      ${topMistakePatterns.map(p => `
      <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
        <p style="color:#991b1b;font-size:14px;margin:0;font-weight:500;">${p.name}</p>
        <p style="color:#b91c1c;font-size:12px;margin:4px 0 0;">Occurred ${p.frequency} times</p>
      </div>
      `).join('')}
      ` : ''}

      <!-- Recommended Topics -->
      ${recommendedTopics.length > 0 ? `
      <h3 style="color:#1f2937;font-size:16px;margin:24px 0 12px;">🎯 Recommended Focus</h3>
      <ul style="color:#374151;font-size:14px;margin:0;padding-left:20px;">
        ${recommendedTopics.map(t => `<li style="margin-bottom:6px;">${t}</li>`).join('')}
      </ul>
      ` : ''}

      <!-- Encouragement -->
      <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:24px 0;border-left:4px solid #22c55e;">
        <p style="color:#166534;font-size:14px;margin:0;">${encouragement}</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="https://snap-notes-j68u-three.vercel.app/dashboard"
           style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
          View Full Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">Sent by NoteSnap • Weekly Progress Report</p>
      <p style="margin:4px 0 0;">
        <a href="https://snap-notes-j68u-three.vercel.app/settings" style="color:#7c3aed;">Manage email preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
```

### Step 4: Create `app/api/reports/weekly/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { generateWeeklyReport } from '@/lib/email/report-generator'
import { renderWeeklyReportEmail } from '@/lib/email/templates/WeeklyProgressReport'
import { sendEmail } from '@/lib/email/resend-client'

export const maxDuration = 30

// GET: Preview report (returns HTML)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const data = await generateWeeklyReport(user.id)
    const html = renderWeeklyReportEmail(data)

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('[WeeklyReport] Preview error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to preview report')
  }
}

// POST: Send report to parent email
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    // Get parent email from profile
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('parent_email, reports_enabled')
      .eq('user_id', user.id)
      .single()

    const body = await request.json().catch(() => ({}))
    const targetEmail = body.email || profile?.parent_email

    if (!targetEmail) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'No parent email configured')
    }

    // Generate and send
    const data = await generateWeeklyReport(user.id)
    const html = renderWeeklyReportEmail(data)

    await sendEmail({
      to: targetEmail,
      subject: `📚 ${data.studentName}'s Weekly Progress Report`,
      html,
    })

    // Update last sent timestamp
    await supabase
      .from('user_learning_profile')
      .update({ last_report_sent: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[WeeklyReport] Send error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to send report')
  }
}
```

### Step 5: Create `app/api/reports/weekly/send-all/route.ts` (Cron endpoint)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWeeklyReport } from '@/lib/email/report-generator'
import { renderWeeklyReportEmail } from '@/lib/email/templates/WeeklyProgressReport'
import { sendEmail } from '@/lib/email/resend-client'

export const maxDuration = 300 // 5 minutes for batch

// Verify cron secret to prevent unauthorized calls
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // No secret = allow (dev mode)
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get all users with reports enabled
  const { data: profiles } = await supabase
    .from('user_learning_profile')
    .select('user_id, parent_email')
    .eq('reports_enabled', true)
    .not('parent_email', 'is', null)

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0, message: 'No users with reports enabled' })
  }

  let sent = 0
  let failed = 0

  for (const profile of profiles) {
    try {
      const data = await generateWeeklyReport(profile.user_id)
      const html = renderWeeklyReportEmail(data)

      await sendEmail({
        to: profile.parent_email,
        subject: `📚 ${data.studentName}'s Weekly Progress Report`,
        html,
      })

      // Update last sent
      await supabase
        .from('user_learning_profile')
        .update({ last_report_sent: new Date().toISOString() })
        .eq('user_id', profile.user_id)

      sent++
    } catch (err) {
      console.error(`[WeeklyCron] Failed for ${profile.user_id}:`, err)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, total: profiles.length })
}
```

### Step 6: Add Vercel Cron Config

Check if `vercel.json` exists at the project root. If it does, add/merge the crons section:

```json
{
  "crons": [
    {
      "path": "/api/reports/weekly/send-all",
      "schedule": "0 8 * * 0"
    }
  ]
}
```

This runs every Sunday at 8:00 AM UTC.

### Step 7: Add Parent Reports Section to Settings

In `app/(main)/settings/page.tsx`, add a new section:

```tsx
{/* Parent Reports Section */}
<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
    📧 {t('parentReports.title')}
  </h3>
  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
    {t('parentReports.description')}
  </p>

  {/* Parent email input */}
  <div className="mb-4">
    <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
      {t('parentReports.emailLabel')}
    </label>
    <input
      type="email"
      value={parentEmail}
      onChange={(e) => { setParentEmail(e.target.value); setHasChanges(true) }}
      placeholder="parent@email.com"
      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
    />
  </div>

  {/* Enable toggle */}
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm text-gray-700 dark:text-gray-300">
      {t('parentReports.enableWeekly')}
    </span>
    <button
      onClick={() => { setReportsEnabled(!reportsEnabled); setHasChanges(true) }}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        reportsEnabled ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
        reportsEnabled ? 'translate-x-5' : ''
      }`} />
    </button>
  </div>

  {/* Send test button */}
  <button
    onClick={handleSendTestReport}
    disabled={!parentEmail || isSendingTest}
    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors"
  >
    {isSendingTest ? t('parentReports.sending') : t('parentReports.sendTest')}
  </button>
</div>
```

Add the state and handlers:
```typescript
const [parentEmail, setParentEmail] = useState('')
const [reportsEnabled, setReportsEnabled] = useState(false)
const [isSendingTest, setIsSendingTest] = useState(false)

// Load from profile
useEffect(() => {
  // In the existing user data load, also fetch:
  // parent_email, reports_enabled from user_learning_profile
  // setParentEmail(profile.parent_email || '')
  // setReportsEnabled(profile.reports_enabled || false)
}, [])

// Save handler should include parent_email and reports_enabled in the update

const handleSendTestReport = async () => {
  setIsSendingTest(true)
  try {
    const res = await fetch('/api/reports/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: parentEmail }),
    })
    if (!res.ok) throw new Error('Failed to send')
    showSuccess(t('parentReports.testSent'))
  } catch {
    showError(t('parentReports.testFailed'))
  } finally {
    setIsSendingTest(false)
  }
}
```

### Step 8: Add settings i18n keys

Add to `messages/en/settings.json` (or wherever settings translations live):
```json
{
  "parentReports": {
    "title": "Parent Reports",
    "description": "Send weekly progress reports to a parent or guardian email",
    "emailLabel": "Parent Email",
    "enableWeekly": "Send weekly reports",
    "sendTest": "Send Test Report",
    "sending": "Sending...",
    "testSent": "Test report sent!",
    "testFailed": "Failed to send test report"
  }
}
```

Hebrew version in `messages/he/settings.json`:
```json
{
  "parentReports": {
    "title": "דוחות להורים",
    "description": "שלח דוחות התקדמות שבועיים לאימייל של הורה או אפוטרופוס",
    "emailLabel": "אימייל הורה",
    "enableWeekly": "שלח דוחות שבועיים",
    "sendTest": "שלח דוח ניסיון",
    "sending": "שולח...",
    "testSent": "דוח ניסיון נשלח!",
    "testFailed": "שליחת דוח הניסיון נכשלה"
  }
}
```

---

## Part B: Exam Prediction Engine

### Step 9: Create `lib/exam-prediction/predictor.ts`

```typescript
/**
 * Exam Prediction Engine
 *
 * Analyzes 3+ past exam papers to predict likely topics
 * for the next exam and generate a targeted study plan.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

export interface ExamPrediction {
  predictedTopics: Array<{
    topic: string
    topicHe: string
    likelihood: number // 0-100
    avgPoints: number
    difficulty: 'easy' | 'medium' | 'hard'
    trend: 'increasing' | 'stable' | 'decreasing'
    reasoning: string
  }>
  studyPriorities: Array<{
    topic: string
    topicHe: string
    priority: 'critical' | 'important' | 'recommended'
    reason: string
    reasonHe: string
    suggestedMinutes: number
  }>
  confidence: number // 0-100 based on number of papers and consistency
  summary: string
  summaryHe: string
}

const PREDICTION_PROMPT = `You are an expert exam analyst. Given data from multiple past exam papers for the same course, predict what topics are most likely to appear on the next exam.

Analyze:
1. Topic frequency — what appears on every exam vs rarely
2. Difficulty trends — are exams getting harder?
3. Format patterns — types of questions (MCQ vs open, calculation vs theory)
4. Point distribution — which topics are worth more

Return JSON (no markdown):
{
  "predictedTopics": [
    {
      "topic": "English topic name",
      "topicHe": "Hebrew topic name",
      "likelihood": 85,
      "avgPoints": 15,
      "difficulty": "medium",
      "trend": "increasing",
      "reasoning": "Appeared in 4/5 past papers, increasing in points"
    }
  ],
  "studyPriorities": [
    {
      "topic": "Topic name",
      "topicHe": "Hebrew name",
      "priority": "critical",
      "reason": "High likelihood + high points + student has low mastery",
      "reasonHe": "Hebrew reason",
      "suggestedMinutes": 60
    }
  ],
  "confidence": 75,
  "summary": "English summary of predictions",
  "summaryHe": "Hebrew summary"
}

Rules:
- Sort predictedTopics by likelihood (highest first)
- Sort studyPriorities by priority (critical > important > recommended)
- Confidence: 3 papers = 50-65%, 5+ papers = 70-85%, 10+ = 85-95%
- Be honest about uncertainty
- suggestedMinutes should be realistic (15-120 per topic)`

export async function predictExamTopics(
  examData: Array<{
    title: string
    date?: string
    topics: string[]
    totalPoints: number
    topicBreakdown: Array<{ topic: string; points: number; questionTypes: string[] }>
  }>
): Promise<ExamPrediction> {
  if (examData.length < 3) {
    throw new Error('At least 3 exam papers are required for prediction')
  }

  const client = new Anthropic()

  const examSummary = examData.map((exam, i) => `
Exam ${i + 1}: "${exam.title}" ${exam.date ? `(${exam.date})` : ''}
Total Points: ${exam.totalPoints}
Topics: ${exam.topicBreakdown.map(t => `${t.topic} (${t.points} pts, ${t.questionTypes.join('/')})`).join(', ')}
`).join('\n')

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system: PREDICTION_PROMPT,
    messages: [{
      role: 'user',
      content: `Analyze these ${examData.length} past exam papers and predict the next exam:\n\n${examSummary}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse prediction response')
  }

  return JSON.parse(jsonMatch[0]) as ExamPrediction
}
```

### Step 10: Create `app/api/exam-prediction/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { predictExamTopics } from '@/lib/exam-prediction/predictor'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { examIds } = await request.json() as { examIds: string[] }

    if (!examIds || examIds.length < 3) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'At least 3 exam papers required')
    }

    // Fetch exam data
    const { data: exams, error } = await supabase
      .from('exam_templates')
      .select('id, title, analysis, created_at')
      .eq('user_id', user.id)
      .in('id', examIds)

    if (error || !exams?.length) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Exams not found')
    }

    // Transform exam data for predictor
    const examData = exams.map(exam => {
      const analysis = exam.analysis as Record<string, unknown> || {}
      return {
        title: exam.title || 'Untitled',
        date: exam.created_at,
        topics: (analysis.topics as string[]) || [],
        totalPoints: (analysis.totalPoints as number) || 100,
        topicBreakdown: (analysis.topicBreakdown as Array<{
          topic: string
          points: number
          questionTypes: string[]
        }>) || [],
      }
    })

    const prediction = await predictExamTopics(examData)

    return NextResponse.json({
      success: true,
      prediction,
    })
  } catch (error) {
    console.error('[ExamPrediction] Error:', error)
    const message = error instanceof Error ? error.message : 'Prediction failed'
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message)
  }
}
```

### Step 11: Create `components/exams/ExamPredictionPanel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Sparkles, TrendingUp, TrendingDown, Minus, Loader2, BookOpen } from 'lucide-react'

interface PredictedTopic {
  topic: string
  topicHe: string
  likelihood: number
  avgPoints: number
  difficulty: 'easy' | 'medium' | 'hard'
  trend: 'increasing' | 'stable' | 'decreasing'
  reasoning: string
}

interface ExamPredictionPanelProps {
  examIds: string[]
  language?: 'en' | 'he'
}

export default function ExamPredictionPanel({ examIds, language = 'en' }: ExamPredictionPanelProps) {
  const t = useTranslations('examPrediction')
  const isHe = language === 'he'
  const [isGenerating, setIsGenerating] = useState(false)
  const [prediction, setPrediction] = useState<{
    predictedTopics: PredictedTopic[]
    confidence: number
    summary: string
    summaryHe: string
  } | null>(null)

  const canPredict = examIds.length >= 3

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/exam-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examIds }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setPrediction(data.prediction)
    } catch {
      // Error toast
    } finally {
      setIsGenerating(false)
    }
  }

  const trendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-3 h-3 text-red-500" />
    if (trend === 'decreasing') return <TrendingDown className="w-3 h-3 text-green-500" />
    return <Minus className="w-3 h-3 text-gray-400" />
  }

  const difficultyColor = (d: string) => {
    if (d === 'hard') return 'text-red-600 dark:text-red-400'
    if (d === 'medium') return 'text-amber-600 dark:text-amber-400'
    return 'text-green-600 dark:text-green-400'
  }

  if (!canPredict) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <Sparkles className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('needMorePapers', { count: 3 - examIds.length })}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          {t('title')}
        </h3>
        {!prediction && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('generating')}</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {t('generate')}</>
            )}
          </button>
        )}
      </div>

      {prediction && (
        <div className="p-6 space-y-4">
          {/* Confidence */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {t('confidence')}: <span className="font-semibold">{prediction.confidence}%</span>
          </div>

          {/* Summary */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isHe ? prediction.summaryHe : prediction.summary}
          </p>

          {/* Topics */}
          <div className="space-y-2">
            {prediction.predictedTopics.map((topic, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
              >
                {/* Likelihood bar */}
                <div className="w-12 text-center">
                  <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                    {topic.likelihood}%
                  </span>
                </div>

                {/* Topic info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {isHe ? topic.topicHe : topic.topic}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{topic.avgPoints} pts</span>
                    <span className={`text-xs ${difficultyColor(topic.difficulty)}`}>{topic.difficulty}</span>
                    <span className="flex items-center gap-0.5">{trendIcon(topic.trend)}</span>
                  </div>
                </div>

                {/* Likelihood bar visual */}
                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.likelihood}%` }}
                    className="h-full bg-violet-500 rounded-full"
                    transition={{ delay: i * 0.05 + 0.2 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### Step 12: Create i18n Files

**Create `messages/en/examPrediction.json`:**
```json
{
  "title": "Exam Prediction",
  "needMorePapers": "Upload {count} more past papers to enable predictions",
  "generate": "Generate Prediction",
  "generating": "Analyzing...",
  "confidence": "Prediction confidence",
  "createStudyPlan": "Create Study Plan from Predictions"
}
```

**Create `messages/he/examPrediction.json`:**
```json
{
  "title": "חיזוי מבחן",
  "needMorePapers": "העלה עוד {count} מבחנים קודמים כדי לאפשר חיזויים",
  "generate": "צור חיזוי",
  "generating": "מנתח...",
  "confidence": "רמת ביטחון בחיזוי",
  "createStudyPlan": "צור תוכנית לימוד מהחיזויים"
}
```

Register both in `messages/{en,he}/index.ts`.

---

## Testing Checklist

```bash
npx tsc --noEmit   # Zero errors
npm test            # All pass
npm run build       # Clean
```

### Browser Testing — Part A (Reports)
1. Settings page → Parent Reports section visible
2. Enter email → toggle enabled → save
3. Click "Send Test Report" → email arrives in inbox
4. Preview: visit `/api/reports/weekly` → HTML renders
5. Email layout correct in Gmail/Outlook
6. Stats accurate (if user has practice history)

### Browser Testing — Part B (Prediction)
1. Past exams page → with 3+ analyzed papers → prediction panel shows
2. Click "Generate Prediction" → loading → results with topics + bars
3. With <3 papers → "Upload X more" message
4. Hebrew, dark mode, mobile all work

---

## Files Created
- `lib/email/resend-client.ts`
- `lib/email/report-generator.ts`
- `lib/email/templates/WeeklyProgressReport.tsx`
- `app/api/reports/weekly/route.ts`
- `app/api/reports/weekly/send-all/route.ts`
- `lib/exam-prediction/predictor.ts`
- `app/api/exam-prediction/route.ts`
- `components/exams/ExamPredictionPanel.tsx`
- `messages/en/examPrediction.json` + `messages/he/examPrediction.json`

## Files Modified
- `app/(main)/settings/page.tsx` (parent reports section)
- `vercel.json` (add cron)
- Settings i18n files (parent report keys)
- Exam pages (add prediction panel)
- `messages/{en,he}/index.ts` (register namespaces)

## What's Next
Day 6: YouTube → Course + AI Cheatsheets (`day6-youtube-cheatsheets.md`)
