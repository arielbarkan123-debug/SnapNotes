# Day 4: Mistake Pattern Detector + Gap Auto-Router

## Goal
**Part A**: Analyze students' practice history with Claude to find systematic error patterns (not random mistakes) → show top patterns on dashboard with targeted remediation.
**Part B**: When a student fails 3+ times on the same topic, detect prerequisite gaps and offer a mini-lesson route.

## Prerequisites
- Day 0-3 completed, `npm run build` passes
- `mistake_patterns` table created (Day 0 migration)
- Dashboard component exists at `app/(main)/dashboard/DashboardContent.tsx`
- Practice session system exists with `practice_logs` table

---

## Project Context & Conventions

**NoteSnap** is a Next.js 14 (App Router) homework assistant with Supabase, Tailwind, next-intl (EN+HE), dark mode.

### Key Conventions
- **API Routes**: `createClient()` + `getUser()`, `createErrorResponse(ErrorCodes.X)`
- **Dashboard Widgets**: Use `useSWR()` for data fetching, wrap in error boundaries, loading/error/empty states
- **i18n**: `useTranslations('namespace')` + JSON files in `messages/{en,he}/`
- **Supabase**: Always filter by `user_id`, use RLS policies
- **AI**: `import Anthropic from '@anthropic-ai/sdk'`, `import { AI_MODEL } from '@/lib/ai/claude'`
- **Components**: `'use client'`, Tailwind `dark:` classes, Framer Motion animations

### Critical File Locations
- `app/(main)/dashboard/DashboardContent.tsx` — Dashboard client component (add widget here)
- `app/(main)/dashboard/page.tsx` — Dashboard server component
- Practice-related tables: `practice_sessions`, `practice_logs`, `practice_question_logs`
- `app/api/practice/` — Practice API routes
- `lib/supabase/server.ts` / `lib/supabase/client.ts` — Supabase clients
- `contexts/ToastContext.tsx` — Toast notifications

### Database Tables (existing)
- `practice_sessions` — Contains `user_id`, `topic`, `correct_count`, `total_count`
- `practice_question_logs` — Contains individual question attempts with `is_correct`, `user_answer`, `correct_answer`
- `homework_checks` — Contains homework submissions with `feedback` JSONB
- `user_concept_mastery` — Contains `user_id`, `concept`, `mastery_level` (0-1 float)

---

## Part A: Mistake Pattern Detector

### Step 1: Create `lib/insights/mistake-analyzer.ts`

```typescript
/**
 * Mistake Pattern Analyzer
 *
 * Analyzes a student's practice history to find systematic error patterns
 * using Claude AI. Results are cached in the mistake_patterns table.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { createClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MistakeInsight {
  patternName: string
  patternNameHe: string
  description: string
  descriptionHe: string
  severity: 'low' | 'medium' | 'high'
  frequency: number // How many times this pattern appeared
  examples: Array<{
    question: string
    wrongAnswer: string
    correctAnswer: string
    whatWentWrong: string
  }>
  remediation: {
    lessonTitle: string
    lessonTitleHe: string
    practiceQuestions: Array<{
      question: string
      questionHe: string
      answer: string
      answerHe: string
    }>
  }
  subject: string
  topic: string
}

export interface MistakeAnalysisResult {
  patterns: MistakeInsight[]
  insufficientData: boolean
  analyzedCount: number
}

// ─── Minimum Data Threshold ──────────────────────────────────────────────────

const MIN_PRACTICE_ATTEMPTS = 20

// ─── Fetch Practice History ──────────────────────────────────────────────────

async function fetchPracticeHistory(userId: string): Promise<{
  logs: Array<{
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    topic: string | null
    subject: string | null
  }>
  totalCount: number
}> {
  const supabase = await createClient()

  // Fetch recent practice question logs (wrong answers are most interesting)
  const { data: logs, error } = await supabase
    .from('practice_question_logs')
    .select('question_text, user_answer, correct_answer, is_correct, topic, subject')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[MistakeAnalyzer] Failed to fetch practice logs:', error)
    return { logs: [], totalCount: 0 }
  }

  const mapped = (logs || []).map(log => ({
    question: log.question_text || '',
    userAnswer: log.user_answer || '',
    correctAnswer: log.correct_answer || '',
    isCorrect: log.is_correct ?? false,
    topic: log.topic || null,
    subject: log.subject || null,
  }))

  return { logs: mapped, totalCount: mapped.length }
}

// ─── Claude Analysis ─────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are an expert educational diagnostician. Analyze the student's practice history to identify SYSTEMATIC error patterns — not random mistakes, but recurring patterns that indicate a conceptual misunderstanding or skill gap.

Given the student's wrong answers, find 2-5 patterns. For each pattern:
1. Name it clearly (both English and Hebrew)
2. Describe what the student consistently gets wrong
3. Rate severity (low/medium/high based on how fundamental the gap is)
4. Count frequency (how many examples match this pattern)
5. Give 2-3 specific examples from their history
6. Provide remediation: a mini-lesson title and 2-3 practice questions to fix it

Return JSON (no markdown):
{
  "patterns": [
    {
      "patternName": "English name",
      "patternNameHe": "Hebrew name",
      "description": "English description of the systematic error",
      "descriptionHe": "Hebrew description",
      "severity": "low|medium|high",
      "frequency": 5,
      "examples": [
        {
          "question": "The question",
          "wrongAnswer": "What student answered",
          "correctAnswer": "The right answer",
          "whatWentWrong": "Why the student's approach was wrong"
        }
      ],
      "remediation": {
        "lessonTitle": "English title for a remediation lesson",
        "lessonTitleHe": "Hebrew title",
        "practiceQuestions": [
          {
            "question": "Remediation question (English)",
            "questionHe": "Same in Hebrew",
            "answer": "Answer (English)",
            "answerHe": "Answer in Hebrew"
          }
        ]
      },
      "subject": "Math",
      "topic": "Fractions"
    }
  ]
}

Rules:
- Only report REAL patterns with 2+ occurrences
- Distinguish between random mistakes and systematic errors
- Higher severity = more fundamental conceptual gaps
- Remediation questions should target the specific gap
- Be specific, not generic
- If fewer than 2 patterns found, return fewer`

async function analyzeWithClaude(
  wrongAnswers: Array<{ question: string; userAnswer: string; correctAnswer: string; topic: string | null }>
): Promise<MistakeInsight[]> {
  const client = new Anthropic()

  const historyText = wrongAnswers
    .slice(0, 50) // Cap at 50 for token budget
    .map((wa, i) => `${i + 1}. Q: ${wa.question}\n   Student: ${wa.userAnswer}\n   Correct: ${wa.correctAnswer}\n   Topic: ${wa.topic || 'unknown'}`)
    .join('\n\n')

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system: ANALYSIS_PROMPT,
    messages: [{
      role: 'user',
      content: `Here are the student's wrong answers from practice sessions:\n\n${historyText}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse mistake analysis')
  }

  const result = JSON.parse(jsonMatch[0])
  return result.patterns || []
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Analyze mistake patterns for a user.
 * Checks cache first, generates if stale or missing.
 */
export async function analyzeMistakePatterns(
  userId: string,
  forceRegenerate = false,
): Promise<MistakeAnalysisResult> {
  const supabase = await createClient()

  // Check cache (unless forcing regeneration)
  if (!forceRegenerate) {
    const { data: cached } = await supabase
      .from('mistake_patterns')
      .select('patterns, insufficient_data, stale_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cached && new Date(cached.stale_after) > new Date()) {
      return {
        patterns: cached.patterns as MistakeInsight[],
        insufficientData: cached.insufficient_data,
        analyzedCount: 0,
      }
    }
  }

  // Fetch practice history
  const { logs, totalCount } = await fetchPracticeHistory(userId)

  // Check minimum threshold
  if (totalCount < MIN_PRACTICE_ATTEMPTS) {
    const result: MistakeAnalysisResult = {
      patterns: [],
      insufficientData: true,
      analyzedCount: totalCount,
    }

    // Cache the insufficient data result too (expires sooner)
    await supabase
      .from('mistake_patterns')
      .upsert({
        user_id: userId,
        patterns: [],
        insufficient_data: true,
        generated_at: new Date().toISOString(),
        stale_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day for insufficient
      }, {
        onConflict: 'user_id',
      })

    return result
  }

  // Filter to wrong answers only
  const wrongAnswers = logs.filter(l => !l.isCorrect)

  if (wrongAnswers.length < 3) {
    return {
      patterns: [],
      insufficientData: false,
      analyzedCount: totalCount,
    }
  }

  // Analyze with Claude
  const patterns = await analyzeWithClaude(wrongAnswers)

  // Sort by severity (high first) then frequency
  const severityOrder = { high: 0, medium: 1, low: 2 }
  patterns.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (sevDiff !== 0) return sevDiff
    return b.frequency - a.frequency
  })

  // Cache result
  await supabase
    .from('mistake_patterns')
    .upsert({
      user_id: userId,
      patterns,
      insufficient_data: false,
      generated_at: new Date().toISOString(),
      stale_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }, {
      onConflict: 'user_id',
    })

  return {
    patterns,
    insufficientData: false,
    analyzedCount: totalCount,
  }
}
```

**IMPORTANT**: The column names in the Supabase queries (e.g., `question_text`, `user_answer`, `correct_answer`, `is_correct`, `topic`, `subject`) must match the actual database schema. Read the existing practice-related API routes to confirm the exact column names before using them.

### Step 2: Create `app/api/insights/mistakes/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { analyzeMistakePatterns } from '@/lib/insights/mistake-analyzer'

export const maxDuration = 60

// GET: Fetch cached or generate patterns
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const result = await analyzeMistakePatterns(user.id)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[MistakeInsights] GET error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to analyze mistakes')
  }
}

// POST: Force regeneration
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const result = await analyzeMistakePatterns(user.id, true)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[MistakeInsights] POST error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to regenerate analysis')
  }
}
```

### Step 3: Create `components/insights/MistakeInsightsCard.tsx`

Dashboard widget showing top 3 mistake patterns.

```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { AlertTriangle, TrendingDown, RefreshCw, Zap } from 'lucide-react'
import RemediationModal from './RemediationModal'
import type { MistakeInsight } from '@/lib/insights/mistake-analyzer'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const severityConfig = {
  high: {
    border: 'border-red-200 dark:border-red-800',
    bg: 'bg-red-50 dark:bg-red-900/20',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    icon: '🔴',
  },
  medium: {
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    icon: '🟡',
  },
  low: {
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-900/20',
    badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    icon: '🟢',
  },
}

export default function MistakeInsightsCard() {
  const t = useTranslations('insights')
  const [selectedPattern, setSelectedPattern] = useState<MistakeInsight | null>(null)

  const { data, isLoading, error, mutate } = useSWR<{
    success: boolean
    patterns: MistakeInsight[]
    insufficientData: boolean
  }>('/api/insights/mistakes', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const handleRegenerate = async () => {
    await fetch('/api/insights/mistakes', { method: 'POST' })
    mutate()
  }

  // Loading
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    )
  }

  // Error
  if (error) return null

  // Insufficient data
  if (data?.insufficientData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-violet-500" />
          {t('title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('insufficientData')}
        </p>
      </div>
    )
  }

  // No patterns found
  if (!data?.patterns?.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-violet-500" />
          {t('title')}
        </h3>
        <p className="text-sm text-green-600 dark:text-green-400">
          {t('noPatterns')}
        </p>
      </div>
    )
  }

  const patterns = data.patterns.slice(0, 3) // Top 3

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-6 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-violet-500" />
            {t('title')}
          </h3>
          <button
            onClick={handleRegenerate}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('regenerate')}
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Pattern Cards */}
        <div className="space-y-3">
          {patterns.map((pattern, i) => {
            const config = severityConfig[pattern.severity]
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${config.bg} ${config.border} border rounded-xl p-4`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {pattern.patternName}
                    </h4>
                  </div>
                  <span className={`${config.badge} text-xs px-2 py-0.5 rounded-full`}>
                    {pattern.frequency}x
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {pattern.description}
                </p>
                <button
                  onClick={() => setSelectedPattern(pattern)}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  {t('fixThis')}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Remediation Modal */}
      {selectedPattern && (
        <RemediationModal
          pattern={selectedPattern}
          onClose={() => setSelectedPattern(null)}
        />
      )}
    </>
  )
}
```

### Step 4: Create `components/insights/RemediationModal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { MistakeInsight } from '@/lib/insights/mistake-analyzer'

interface RemediationModalProps {
  pattern: MistakeInsight
  onClose: () => void
}

export default function RemediationModal({ pattern, onClose }: RemediationModalProps) {
  const t = useTranslations('insights')
  const [currentQ, setCurrentQ] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const questions = pattern.remediation.practiceQuestions
  const question = questions[currentQ]

  const handleSubmit = () => {
    // Simple check — in production you'd want fuzzy matching or AI grading
    const isCorrect = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
    if (isCorrect) setScore(s => s + 1)
    setShowResult(true)
  }

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setIsComplete(true)
    } else {
      setCurrentQ(q => q + 1)
      setUserAnswer('')
      setShowResult(false)
    }
  }

  const passRate = questions.length > 0 ? (score / questions.length) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {pattern.remediation.lessonTitle}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('fixing')}: {pattern.patternName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isComplete ? (
            <>
              {/* Pattern explanation */}
              {currentQ === 0 && !showResult && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {pattern.description}
                  </p>
                </div>
              )}

              {/* Progress */}
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                {t('questionOf', { current: currentQ + 1, total: questions.length })}
              </p>

              {/* Question */}
              <p className="text-sm text-gray-900 dark:text-gray-100 mb-4 font-medium">
                {question.question}
              </p>

              {/* Answer input */}
              {!showResult ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && userAnswer.trim() && handleSubmit()}
                    placeholder={t('typAnswer')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!userAnswer.trim()}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {t('checkAnswer')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Result */}
                  <div className={`p-3 rounded-xl flex items-center gap-2 ${
                    userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    {userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase() ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
                          ? t('correct')
                          : t('incorrect')}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('correctAnswer')}: {question.answer}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {currentQ + 1 >= questions.length ? t('seeResults') : t('nextQuestion')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Completion Screen */
            <div className="text-center py-4">
              <div className={`text-4xl mb-3 ${passRate >= 80 ? '' : ''}`}>
                {passRate >= 80 ? '🎉' : passRate >= 50 ? '💪' : '📚'}
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {passRate >= 80 ? t('excellent') : passRate >= 50 ? t('goodProgress') : t('keepPracticing')}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('scoreResult', { score, total: questions.length })}
              </p>

              {/* Score bar */}
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${passRate}%` }}
                  className={`h-full rounded-full ${passRate >= 80 ? 'bg-green-500' : passRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                />
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {t('done')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
```

### Step 5: Add Widget to Dashboard

In `app/(main)/dashboard/DashboardContent.tsx`, add the lazy-loaded widget:

```typescript
import dynamic from 'next/dynamic'

const MistakeInsightsCard = dynamic(() => import('@/components/insights/MistakeInsightsCard'), {
  ssr: false,
  loading: () => null,
})
```

Then in the JSX, add after the course list or stats section:
```tsx
{/* Mistake Insights */}
<MistakeInsightsCard />
```

Wrap in a `SilentErrorBoundary` if that pattern exists in the dashboard.

---

## Part B: Gap Auto-Router

### Step 6: Create `lib/insights/gap-router.ts`

```typescript
/**
 * Gap Auto-Router
 *
 * Detects prerequisite knowledge gaps when a student struggles
 * and suggests mini-lessons to fill those gaps.
 */

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

export interface GapRoute {
  currentTopic: string
  prerequisiteTopic: string
  prerequisiteTopicHe: string
  prerequisiteMastery: number // 0-1
  miniLessonTitle: string
  miniLessonTitleHe: string
  reason: string
  reasonHe: string
}

// ─── Prerequisite Map ────────────────────────────────────────────────────────
// Common prerequisite relationships (fallback if AI detection not needed)

const PREREQUISITE_MAP: Record<string, string[]> = {
  'algebra': ['arithmetic', 'order of operations'],
  'quadratic equations': ['linear equations', 'factoring'],
  'calculus': ['algebra', 'trigonometry', 'limits'],
  'trigonometry': ['geometry', 'algebra'],
  'fractions': ['division', 'multiplication'],
  'percentages': ['fractions', 'decimals'],
  'geometry proofs': ['basic geometry', 'logic'],
  'statistics': ['arithmetic', 'fractions', 'percentages'],
  'probability': ['fractions', 'statistics'],
}

/**
 * Detect if a student has a prerequisite gap that's causing failures.
 *
 * Called when: student gets 3+ wrong on the same topic in a session
 * Returns: GapRoute if a prerequisite is weak, null otherwise
 */
export async function detectPrerequisiteGap(
  userId: string,
  currentTopic: string,
  currentPerformance: number, // 0-1 ratio of correct answers
): Promise<GapRoute | null> {
  // Only trigger if performance is poor
  if (currentPerformance >= 0.4) return null

  const supabase = await createClient()

  // Check known prerequisites
  const topicLower = currentTopic.toLowerCase()
  let prerequisiteTopics: string[] = []

  // Try exact match first
  for (const [topic, prereqs] of Object.entries(PREREQUISITE_MAP)) {
    if (topicLower.includes(topic) || topic.includes(topicLower)) {
      prerequisiteTopics = prereqs
      break
    }
  }

  // If no known prerequisites, ask Claude
  if (prerequisiteTopics.length === 0) {
    try {
      const client = new Anthropic()
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `What are the 2-3 most important prerequisite topics a student needs to understand before learning "${currentTopic}"? Return ONLY a JSON array of strings, no markdown. Example: ["topic1", "topic2"]`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        prerequisiteTopics = JSON.parse(match[0])
      }
    } catch {
      return null // Can't determine prerequisites
    }
  }

  if (prerequisiteTopics.length === 0) return null

  // Check mastery of prerequisites
  const { data: masteryData } = await supabase
    .from('user_concept_mastery')
    .select('concept, mastery_level')
    .eq('user_id', userId)
    .in('concept', prerequisiteTopics)

  // Find weakest prerequisite
  let weakestPrereq: { concept: string; mastery: number } | null = null

  for (const prereq of prerequisiteTopics) {
    const mastery = masteryData?.find(m =>
      m.concept.toLowerCase() === prereq.toLowerCase()
    )
    const level = mastery?.mastery_level ?? 0.3 // Default low if never practiced

    if (!weakestPrereq || level < weakestPrereq.mastery) {
      weakestPrereq = { concept: prereq, mastery: level }
    }
  }

  // Only route if prerequisite mastery is below 0.5
  if (!weakestPrereq || weakestPrereq.mastery >= 0.5) return null

  return {
    currentTopic,
    prerequisiteTopic: weakestPrereq.concept,
    prerequisiteTopicHe: weakestPrereq.concept, // TODO: translate
    prerequisiteMastery: weakestPrereq.mastery,
    miniLessonTitle: `Review: ${weakestPrereq.concept}`,
    miniLessonTitleHe: `חזרה: ${weakestPrereq.concept}`,
    reason: `You might be struggling with ${currentTopic} because ${weakestPrereq.concept} needs more practice.`,
    reasonHe: `ייתכן שאתה מתקשה ב${currentTopic} כי ${weakestPrereq.concept} דורש תרגול נוסף.`,
  }
}
```

### Step 7: Create `components/practice/GapDetectedBanner.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { BookOpen, X, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { GapRoute } from '@/lib/insights/gap-router'

interface GapDetectedBannerProps {
  gap: GapRoute
  onReview: () => void
  onDismiss: () => void
}

export default function GapDetectedBanner({ gap, onReview, onDismiss }: GapDetectedBannerProps) {
  const t = useTranslations('insights')

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      className="mb-4"
    >
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-lg flex-shrink-0">
            <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
              {t('gapDetected')}
            </h4>
            <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">
              {gap.reason}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={onReview}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                {t('reviewTopic', { topic: gap.prerequisiteTopic })}
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-colors"
              >
                {t('continueAnyway')}
              </button>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded">
            <X className="w-4 h-4 text-violet-400" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
```

### Step 8: Create i18n Files

**Create `messages/en/insights.json`:**
```json
{
  "title": "Mistake Patterns",
  "insufficientData": "Complete at least 20 practice questions to see your mistake patterns",
  "noPatterns": "Great job! No systematic error patterns detected",
  "fixThis": "Fix this",
  "regenerate": "Refresh analysis",
  "fixing": "Fixing",
  "questionOf": "Question {current} of {total}",
  "typAnswer": "Type your answer...",
  "checkAnswer": "Check Answer",
  "correct": "Correct!",
  "incorrect": "Not quite right",
  "correctAnswer": "Correct answer",
  "nextQuestion": "Next Question",
  "seeResults": "See Results",
  "excellent": "Pattern Fixed!",
  "goodProgress": "Good Progress!",
  "keepPracticing": "Keep Practicing",
  "scoreResult": "You got {score} out of {total} correct",
  "done": "Done",
  "gapDetected": "Knowledge Gap Detected",
  "reviewTopic": "Review {topic}",
  "continueAnyway": "Continue anyway"
}
```

**Create `messages/he/insights.json`:**
```json
{
  "title": "דפוסי טעויות",
  "insufficientData": "השלם לפחות 20 שאלות תרגול כדי לראות את דפוסי הטעויות שלך",
  "noPatterns": "כל הכבוד! לא נמצאו דפוסי שגיאה שיטתיים",
  "fixThis": "תקן את זה",
  "regenerate": "רענן ניתוח",
  "fixing": "מתקן",
  "questionOf": "שאלה {current} מתוך {total}",
  "typAnswer": "הקלד את תשובתך...",
  "checkAnswer": "בדוק תשובה",
  "correct": "נכון!",
  "incorrect": "לא בדיוק",
  "correctAnswer": "תשובה נכונה",
  "nextQuestion": "שאלה הבאה",
  "seeResults": "ראה תוצאות",
  "excellent": "הדפוס תוקן!",
  "goodProgress": "התקדמות טובה!",
  "keepPracticing": "המשך לתרגל",
  "scoreResult": "ענית נכון על {score} מתוך {total}",
  "done": "סיום",
  "gapDetected": "נמצא חוסר בידע בסיסי",
  "reviewTopic": "חזור על {topic}",
  "continueAnyway": "המשך בכל זאת"
}
```

Register in `messages/en/index.ts` and `messages/he/index.ts`:
```typescript
import insights from './insights.json'
// Add to messages object: insights,
```

---

## Testing Checklist

```bash
npx tsc --noEmit   # Zero errors
npm test            # All pass
npm run build       # Clean
```

### Browser Testing
1. **Dashboard**: Navigate to `/dashboard` → MistakeInsightsCard should appear
2. **With data**: If user has 20+ practice logs → should show 1-3 pattern cards
3. **Without data**: New user → "Complete at least 20 practice questions" message
4. **Fix this**: Click → RemediationModal opens with pattern explanation + questions
5. **Answer questions**: Type answers → correct/incorrect feedback → completion screen
6. **Refresh**: Click refresh icon → regenerates analysis
7. **Gap banner**: During practice, after 3 wrong answers → gap banner slides down
8. **Review topic**: Click → should route to relevant content
9. **Continue anyway**: Click → banner dismisses
10. **Hebrew**: All labels in Hebrew, RTL layout
11. **Dark mode**: All components have dark variants
12. **Mobile 375px**: Cards stack properly, modal is full-width

---

## Files Created
- `lib/insights/mistake-analyzer.ts`
- `lib/insights/gap-router.ts`
- `app/api/insights/mistakes/route.ts`
- `components/insights/MistakeInsightsCard.tsx`
- `components/insights/RemediationModal.tsx`
- `components/practice/GapDetectedBanner.tsx`
- `messages/en/insights.json`
- `messages/he/insights.json`

## Files Modified
- `app/(main)/dashboard/DashboardContent.tsx` (add MistakeInsightsCard widget)
- `messages/en/index.ts` (register insights namespace)
- `messages/he/index.ts` (register insights namespace)
- Practice session component (integrate gap detection — find the specific file)

## What's Next
Day 5: Parent Reports + Exam Prediction (`day5-parent-reports.md`)
