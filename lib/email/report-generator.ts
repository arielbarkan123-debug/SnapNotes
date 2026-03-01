/**
 * Weekly Progress Report Generator
 *
 * Aggregates student data for parent reports:
 * - Practice stats (sessions, questions, accuracy)
 * - Mastery changes
 * - Mistake patterns (top 2)
 * - Recommended focus topics
 */

import { createClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeeklyReportData {
  studentName: string
  periodStart: string
  periodEnd: string
  stats: {
    totalSessions: number
    questionsAnswered: number
    accuracy: number
    currentStreak: number
    studyMinutes: number
  }
  masteryChanges: Array<{
    topic: string
    previousScore: number
    currentScore: number
    direction: 'up' | 'down' | 'new'
  }>
  topMistakes: Array<{
    patternName: string
    severity: string
    frequency: number
  }>
  recommendedTopics: string[]
  encouragement: string
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export async function generateWeeklyReport(userId: string): Promise<WeeklyReportData> {
  const supabase = await createClient()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const periodStart = weekAgo.toISOString().split('T')[0]
  const periodEnd = now.toISOString().split('T')[0]

  // Get user profile
  const { data: profile } = await supabase
    .from('user_learning_profile')
    .select('display_name')
    .eq('user_id', userId)
    .single()

  // Use profile display name (works in both user-request and cron contexts)
  const studentName = profile?.display_name || 'Student'

  // Fetch practice sessions this week
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('id, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekAgo.toISOString())

  const sessionIds = sessions?.map(s => s.id) || []
  const totalSessions = sessionIds.length

  // Fetch question stats
  let questionsAnswered = 0
  let correctCount = 0

  if (sessionIds.length > 0) {
    const { data: questions } = await supabase
      .from('practice_session_questions')
      .select('is_correct')
      .in('session_id', sessionIds)

    if (questions) {
      questionsAnswered = questions.length
      correctCount = questions.filter(q => q.is_correct).length
    }
  }

  const accuracy = questionsAnswered > 0
    ? Math.round((correctCount / questionsAnswered) * 100)
    : 0

  // Get gamification streak
  let currentStreak = 0
  try {
    const { data: gamification } = await supabase
      .from('gamification')
      .select('current_streak')
      .eq('user_id', userId)
      .single()
    currentStreak = gamification?.current_streak || 0
  } catch {
    // Gamification table might not exist
  }

  // Estimate study minutes (rough: 3 min per question + 5 min per session)
  const studyMinutes = (questionsAnswered * 3) + (totalSessions * 5)

  // Fetch mastery changes
  const masteryChanges: WeeklyReportData['masteryChanges'] = []
  try {
    const { data: mastery } = await supabase
      .from('user_concept_mastery')
      .select('topic, mastery_score, previous_score, updated_at')
      .eq('user_id', userId)
      .gte('updated_at', weekAgo.toISOString())
      .order('mastery_score', { ascending: false })
      .limit(10)

    if (mastery) {
      for (const m of mastery) {
        const prev = m.previous_score ?? 0
        const curr = m.mastery_score ?? 0
        masteryChanges.push({
          topic: m.topic,
          previousScore: Math.round(prev * 100),
          currentScore: Math.round(curr * 100),
          direction: prev === 0 ? 'new' : curr > prev ? 'up' : 'down',
        })
      }
    }
  } catch {
    // Table might not exist
  }

  // Fetch top mistake patterns
  const topMistakes: WeeklyReportData['topMistakes'] = []
  try {
    const { data: patterns } = await supabase
      .from('mistake_patterns')
      .select('patterns')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (patterns?.patterns && Array.isArray(patterns.patterns)) {
      const sorted = (patterns.patterns as Array<{
        patternName: string
        severity: string
        frequency: number
      }>).slice(0, 2)

      for (const p of sorted) {
        topMistakes.push({
          patternName: p.patternName,
          severity: p.severity,
          frequency: p.frequency,
        })
      }
    }
  } catch {
    // Table might not exist
  }

  // Generate recommended topics
  const recommendedTopics: string[] = []
  // From low mastery
  const lowMastery = masteryChanges
    .filter(m => m.currentScore < 60)
    .map(m => m.topic)
    .slice(0, 2)
  recommendedTopics.push(...lowMastery)

  // From mistakes
  if (topMistakes.length > 0 && recommendedTopics.length < 3) {
    recommendedTopics.push(topMistakes[0].patternName)
  }

  // Fallback
  if (recommendedTopics.length === 0) {
    recommendedTopics.push('Continue practicing current topics')
  }

  // Generate encouragement
  let encouragement: string
  if (accuracy >= 80) {
    encouragement = `Great work this week! ${studentName} scored ${accuracy}% accuracy across ${questionsAnswered} questions. Keep up the excellent progress!`
  } else if (accuracy >= 60) {
    encouragement = `Good effort this week! ${studentName} answered ${questionsAnswered} questions with ${accuracy}% accuracy. With a bit more practice on weak areas, results will improve quickly.`
  } else if (questionsAnswered > 0) {
    encouragement = `${studentName} completed ${questionsAnswered} practice questions this week. Encouraging consistent practice will help build stronger foundations.`
  } else {
    encouragement = `${studentName} had a quiet week. Encouraging even 10-15 minutes of daily practice can make a big difference!`
  }

  return {
    studentName,
    periodStart,
    periodEnd,
    stats: {
      totalSessions,
      questionsAnswered,
      accuracy,
      currentStreak,
      studyMinutes,
    },
    masteryChanges: masteryChanges.slice(0, 6),
    topMistakes,
    recommendedTopics: recommendedTopics.slice(0, 3),
    encouragement,
  }
}
