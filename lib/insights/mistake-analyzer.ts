/**
 * Mistake Pattern Analyzer
 *
 * Analyzes a student's practice history to find systematic error patterns
 * using Claude AI. Results are cached in the mistake_patterns table.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('insights:mistake-analyzer')

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MistakeInsight {
  patternName: string
  patternNameHe: string
  description: string
  descriptionHe: string
  severity: 'low' | 'medium' | 'high'
  frequency: number
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

  // Join practice_session_questions with practice_questions to get full data
  // Also need to filter by user via practice_sessions
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!sessions?.length) {
    return { logs: [], totalCount: 0 }
  }

  const sessionIds = sessions.map(s => s.id)

  // Fetch session questions with their related question data
  const { data: sessionQuestions, error } = await supabase
    .from('practice_session_questions')
    .select(`
      user_answer,
      is_correct,
      question_id,
      practice_questions!inner (
        question_text,
        correct_answer,
        topic,
        subject
      )
    `)
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    log.error({ err: error }, 'Failed to fetch practice logs:')
    // Fallback: try simpler query without join
    return await fetchSimplePracticeHistory(userId)
  }

  const mapped = (sessionQuestions || []).map((sq: Record<string, unknown>) => {
    const pq = sq.practice_questions as Record<string, unknown> | null
    return {
      question: (pq?.question_text as string) || '',
      userAnswer: (sq.user_answer as string) || '',
      correctAnswer: (pq?.correct_answer as string) || '',
      isCorrect: (sq.is_correct as boolean) ?? false,
      topic: (pq?.topic as string) || null,
      subject: (pq?.subject as string) || null,
    }
  })

  return { logs: mapped, totalCount: mapped.length }
}

/**
 * Fallback: fetch from homework_checks if practice data isn't available
 */
async function fetchSimplePracticeHistory(userId: string): Promise<{
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

  const { data: checks } = await supabase
    .from('homework_checks')
    .select('feedback')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!checks?.length) return { logs: [], totalCount: 0 }

  const logs: Array<{
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    topic: string | null
    subject: string | null
  }> = []

  for (const check of checks) {
    const feedback = check.feedback as Record<string, unknown> | null
    if (!feedback) continue
    const items = (feedback.items || feedback.results) as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (item.isCorrect === false || item.is_correct === false) {
        logs.push({
          question: (item.question as string) || '',
          userAnswer: (item.studentAnswer as string) || (item.user_answer as string) || '',
          correctAnswer: (item.correctAnswer as string) || (item.correct_answer as string) || '',
          isCorrect: false,
          topic: null,
          subject: null,
        })
      }
    }
  }

  return { logs, totalCount: logs.length + (checks.length * 3) } // Approximate
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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const client = new Anthropic({ apiKey })

  const historyText = wrongAnswers
    .slice(0, 50)
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

    // Cache the insufficient data result (expires sooner)
    try {
      await supabase
        .from('mistake_patterns')
        .upsert({
          user_id: userId,
          patterns: [],
          insufficient_data: true,
          generated_at: new Date().toISOString(),
          stale_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'user_id',
        })
    } catch {
      // Table may not exist yet if migration not applied
    }

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
  try {
    await supabase
      .from('mistake_patterns')
      .upsert({
        user_id: userId,
        patterns,
        insufficient_data: false,
        generated_at: new Date().toISOString(),
        stale_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'user_id',
      })
  } catch {
    // Table may not exist yet if migration not applied
  }

  return {
    patterns,
    insufficientData: false,
    analyzedCount: totalCount,
  }
}
