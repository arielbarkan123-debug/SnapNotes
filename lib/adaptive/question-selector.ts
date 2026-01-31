/**
 * Adaptive Question Selector
 *
 * Selects questions based on user's current performance state
 * to maintain the optimal learning zone (~75% success rate).
 *
 * Algorithm:
 * 1. Calculate target difficulty based on recent performance
 * 2. Score all available questions by:
 *    - Difficulty match (closer to target = higher score)
 *    - Concept priority (weak concepts get bonus)
 *    - Variety bonus (different cognitive level than last)
 *    - Freshness (haven't seen recently = bonus)
 * 3. Use weighted random selection for variety
 */

import { createClient } from '@/lib/supabase/server'
import type {
  UserPerformanceState,
  QuestionWithDifficulty,
  ScoredQuestion,
  QuestionSelectionOptions,
  DifficultyResult,
} from './types'

// Re-export config for use in this module
const CONFIG = {
  targetSuccessRate: 0.75,
  adjustmentStep: 0.4,
  streakBonus: 0.25,
  minDifficulty: 1,
  maxDifficulty: 5,
  streakThreshold: 2,
  successRateHigh: 0.80,
  successRateLow: 0.65,
} as const

// Bloom's Taxonomy bonus for question scoring (biases toward higher cognitive levels)
const BLOOM_BONUS: Record<string, number> = {
  remember: 0,
  understand: 3,
  apply: 6,
  analyze: 10,
  evaluate: 13,
  create: 15,
}

// =============================================================================
// Core Selection Functions
// =============================================================================

/**
 * Calculate target difficulty based on user's performance state
 */
export function calculateTargetDifficulty(state: UserPerformanceState): DifficultyResult {
  let targetDifficulty = state.session_difficulty_level
  let adjustmentReason: DifficultyResult['adjustmentReason'] = 'stable'

  // Adjust based on rolling accuracy
  if (state.rolling_accuracy > CONFIG.successRateHigh) {
    // Doing too well - increase difficulty
    targetDifficulty += CONFIG.adjustmentStep
    adjustmentReason = 'accuracy_high'

    // Extra boost for correct streak
    if (state.correct_streak >= CONFIG.streakThreshold) {
      targetDifficulty += CONFIG.streakBonus
      adjustmentReason = 'streak_up'
    }
  } else if (state.rolling_accuracy < CONFIG.successRateLow) {
    // Struggling - decrease difficulty
    targetDifficulty -= CONFIG.adjustmentStep
    adjustmentReason = 'accuracy_low'

    // Extra decrease for wrong streak
    if (state.wrong_streak >= CONFIG.streakThreshold) {
      targetDifficulty -= CONFIG.streakBonus
      adjustmentReason = 'streak_down'
    }
  }

  // Apply difficulty floor
  targetDifficulty = Math.max(targetDifficulty, state.difficulty_floor || 1)

  // Clamp to valid range
  targetDifficulty = Math.max(CONFIG.minDifficulty, Math.min(CONFIG.maxDifficulty, targetDifficulty))

  return {
    targetDifficulty,
    adjustmentReason,
    currentAccuracy: state.rolling_accuracy,
    estimatedAbility: state.estimated_ability,
  }
}

/**
 * Score a question based on how well it matches the target difficulty
 * and other factors like concept priority and variety
 */
export function scoreQuestion(
  question: QuestionWithDifficulty,
  targetDifficulty: number,
  weakConceptIds: string[] = [],
  lastCognitiveLevel?: string,
  weakConcepts?: { id: string; mastery: number }[]
): number {
  let score = 0

  // 1. Difficulty match (0-50 points)
  // Closer to target = higher score
  const difficulty = question.empiricalDifficulty ?? question.difficulty
  const difficultyGap = Math.abs(difficulty - targetDifficulty)
  score += (1 - difficultyGap / 4) * 50

  // 2. Concept priority (0-50 points) — weak concepts get strong bonus
  if (question.conceptId) {
    // Check for detailed weakness data first
    const weakConcept = weakConcepts?.find(wc => wc.id === question.conceptId)
    if (weakConcept) {
      // Base bonus + severity bonus based on how low mastery is
      score += 50
      score += 20 * (1 - weakConcept.mastery) // 0-20 points: lower mastery = higher score
    } else if (weakConceptIds.includes(question.conceptId)) {
      // Fallback to simple weak concept bonus
      score += 50
    }
  }

  // 3. Variety bonus (0-10 points)
  // Different cognitive level than last question
  if (question.cognitiveLevel && question.cognitiveLevel !== lastCognitiveLevel) {
    score += 10
  }

  // 4. Freshness bonus (0-10 points)
  // Haven't seen this question recently
  if (!question.lastSeenAt) {
    score += 10
  } else {
    const hoursSinceSeen = (Date.now() - new Date(question.lastSeenAt).getTime()) / 3600000
    score += Math.min(10, hoursSinceSeen / 24 * 10)
  }

  // 5. Novelty bonus based on times shown
  if (question.timesShown === undefined || question.timesShown === 0) {
    score += 5
  } else {
    score += Math.max(0, 5 - question.timesShown)
  }

  // 6. Bloom's taxonomy bonus (0-15 points) — biases toward higher cognitive levels
  if (question.cognitiveLevel) {
    score += BLOOM_BONUS[question.cognitiveLevel] || 0
  }

  return score
}

/**
 * Select the best questions from available pool
 * Uses weighted random selection to maintain variety
 */
export function selectQuestions(
  questions: QuestionWithDifficulty[],
  targetDifficulty: number,
  weakConceptIds: string[] = [],
  lastCognitiveLevel?: string,
  count: number = 1,
  weakConcepts?: { id: string; mastery: number }[]
): ScoredQuestion[] {
  // Score all questions
  const scored = questions.map(q => ({
    questionId: q.id,
    score: scoreQuestion(q, targetDifficulty, weakConceptIds, lastCognitiveLevel, weakConcepts),
    difficultyMatch: (1 - Math.abs((q.empiricalDifficulty ?? q.difficulty) - targetDifficulty) / 4) * 50,
    conceptPriority: (q.conceptId && weakConceptIds.includes(q.conceptId)) ? 50 : 0,
    varietyBonus: (q.cognitiveLevel && q.cognitiveLevel !== lastCognitiveLevel) ? 10 : 0,
  }))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // For single selection, use weighted random from top candidates
  if (count === 1 && scored.length > 0) {
    // Take top 5 candidates for variety
    const candidates = scored.slice(0, Math.min(5, scored.length))
    const totalScore = candidates.reduce((sum, c) => sum + c.score, 0)

    if (totalScore > 0) {
      let random = Math.random() * totalScore
      for (const candidate of candidates) {
        random -= candidate.score
        if (random <= 0) {
          return [candidate]
        }
      }
    }

    return [candidates[0]]
  }

  // For multiple selections, return top N
  return scored.slice(0, count)
}

// =============================================================================
// Database Integration
// =============================================================================

/**
 * Get or create user's performance state
 */
export async function getOrCreatePerformanceState(
  userId: string,
  courseId?: string
): Promise<UserPerformanceState> {
  const supabase = await createClient()

  // Try to get existing state
  let query = supabase
    .from('user_performance_state')
    .select('*')
    .eq('user_id', userId)

  if (courseId) {
    query = query.eq('course_id', courseId)
  } else {
    query = query.is('course_id', null)
  }

  const { data: existing } = await query.single()

  if (existing) {
    return existing as UserPerformanceState
  }

  // Create new state
  const { data: newState, error } = await supabase
    .from('user_performance_state')
    .insert({
      user_id: userId,
      course_id: courseId,
      session_start: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    // Return default state on error
    return {
      id: '',
      user_id: userId,
      course_id: courseId || null,
      session_difficulty_level: 2.5,
      target_difficulty: 3.0,
      rolling_accuracy: 0.5,
      rolling_response_time_ms: 0,
      estimated_ability: 2.5,
      correct_streak: 0,
      wrong_streak: 0,
      last_cognitive_level: null,
      questions_answered: 0,
      session_start: null,
      difficulty_floor: 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return newState as UserPerformanceState
}

/**
 * Select adaptive questions using database
 */
export async function selectAdaptiveQuestions(
  options: QuestionSelectionOptions
): Promise<ScoredQuestion[]> {
  const { userId, courseId, availableQuestionIds, weakConceptIds, weakConcepts, excludeQuestionIds, count = 1 } = options

  const supabase = await createClient()

  // Get user's performance state
  const state = await getOrCreatePerformanceState(userId, courseId)
  const { targetDifficulty } = calculateTargetDifficulty(state)

  // Filter out excluded questions
  const questionIds = excludeQuestionIds
    ? availableQuestionIds.filter(id => !excludeQuestionIds.includes(id))
    : availableQuestionIds

  if (questionIds.length === 0) {
    return []
  }

  // Get difficulty data for available questions
  const { data: difficultyData } = await supabase
    .from('question_difficulty')
    .select('*')
    .in('question_id', questionIds)

  // Build question objects
  const questions: QuestionWithDifficulty[] = questionIds.map(id => {
    const diffData = difficultyData?.find(d => d.question_id === id)
    return {
      id,
      difficulty: diffData?.base_difficulty ?? 3,
      empiricalDifficulty: diffData?.empirical_difficulty ?? undefined,
      cognitiveLevel: diffData?.cognitive_level ?? undefined,
      conceptId: diffData?.primary_concept_id ?? undefined,
      timesShown: diffData?.times_shown ?? 0,
    }
  })

  // Resolve weak concept IDs (backward compat: convert weakConceptIds to weakConcepts if needed)
  const resolvedWeakConceptIds = weakConceptIds || weakConcepts?.map(wc => wc.id) || []

  // Select questions
  return selectQuestions(
    questions,
    targetDifficulty,
    resolvedWeakConceptIds,
    state.last_cognitive_level || undefined,
    count,
    weakConcepts
  )
}

/**
 * Get weak concepts with mastery levels for a user
 */
export async function getWeakConcepts(
  userId: string,
  _courseId?: string
): Promise<{ id: string; mastery: number }[]> {
  const supabase = await createClient()

  // Get concepts with low mastery (threshold 0.6 to catch borderline concepts)
  const { data: weakMastery } = await supabase
    .from('user_concept_mastery')
    .select('concept_id, mastery_level')
    .eq('user_id', userId)
    .lt('mastery_level', 0.6)

  const { data: activeGaps } = await supabase
    .from('user_knowledge_gaps')
    .select('concept_id')
    .eq('user_id', userId)
    .eq('resolved', false)

  const conceptMap = new Map<string, number>()

  weakMastery?.forEach(m => conceptMap.set(m.concept_id, m.mastery_level))
  // Active gaps that aren't already in mastery data get low mastery
  activeGaps?.forEach(g => {
    if (!conceptMap.has(g.concept_id)) {
      conceptMap.set(g.concept_id, 0.1)
    }
  })

  return Array.from(conceptMap.entries()).map(([id, mastery]) => ({ id, mastery }))
}

/**
 * Get weak concept IDs for a user (backward-compatible wrapper)
 */
export async function getWeakConceptIds(
  userId: string,
  courseId?: string
): Promise<string[]> {
  const weakConcepts = await getWeakConcepts(userId, courseId)
  return weakConcepts.map(wc => wc.id)
}

// =============================================================================
// Export
// =============================================================================

const questionSelector = {
  calculateTargetDifficulty,
  scoreQuestion,
  selectQuestions,
  getOrCreatePerformanceState,
  selectAdaptiveQuestions,
  getWeakConcepts,
  getWeakConceptIds,
}

export default questionSelector
