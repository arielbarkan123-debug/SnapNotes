/**
 * Realtime Performance Adjuster
 *
 * Updates user performance state in real-time as they answer questions.
 * Tracks accuracy, streaks, ability estimation, and adjusts difficulty.
 *
 * Key Features:
 * - Rolling average accuracy calculation
 * - Item Response Theory (IRT) for ability estimation
 * - Streak-based difficulty adjustment
 * - Question difficulty updates based on outcomes
 */

import { createClient } from '@/lib/supabase/server'
import type {
  UserPerformanceState,
  AnswerRecord,
  PerformanceUpdateResult,
  QuestionSource,
} from './types'
import { processLearningSignal, type QuestionSignal } from '@/lib/profile'

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Learning rate for rolling average (higher = more responsive to recent performance)
  rollingAverageAlpha: 0.1,

  // Learning rate for ability estimation
  abilityLearningRate: 0.3,

  // Difficulty adjustment amounts
  adjustmentStep: 0.3,
  streakBonus: 0.2,

  // Thresholds
  streakThreshold: 3,
  accuracyHighThreshold: 0.85,
  accuracyLowThreshold: 0.65,

  // Bounds
  minDifficulty: 1.0,
  maxDifficulty: 5.0,
  minAbility: 1.0,
  maxAbility: 5.0,
} as const

// =============================================================================
// Performance State Updates
// =============================================================================

/**
 * Record an answer and update all performance metrics
 */
export async function recordAnswer(record: AnswerRecord): Promise<PerformanceUpdateResult> {
  const supabase = await createClient()

  // Get or create performance state
  let stateQuery = supabase
    .from('user_performance_state')
    .select('*')
    .eq('user_id', record.userId)

  if (record.courseId) {
    stateQuery = stateQuery.eq('course_id', record.courseId)
  } else {
    stateQuery = stateQuery.is('course_id', null)
  }

  const { data: existingState } = await stateQuery.single()

  let state: UserPerformanceState

  if (!existingState) {
    // Create new state
    const { data: newState, error } = await supabase
      .from('user_performance_state')
      .insert({
        user_id: record.userId,
        course_id: record.courseId || null,
        session_start: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !newState) {
      throw new Error('Failed to create performance state')
    }

    state = newState as UserPerformanceState
  } else {
    state = existingState as UserPerformanceState
  }

  // Calculate updates
  const updates = calculateStateUpdates(state, record)

  // Update state in database
  const { data: updatedState, error: updateError } = await supabase
    .from('user_performance_state')
    .update(updates)
    .eq('id', state.id)
    .select()
    .single()

  if (updateError || !updatedState) {
    throw new Error('Failed to update performance state')
  }

  // Update question difficulty
  await updateQuestionDifficulty(
    supabase,
    record.questionSource,
    record.questionId,
    record.isCorrect,
    record.responseTimeMs
  )

  // Emit signal to profile refinement engine (RLPA-style dynamic profiling)
  // This runs asynchronously and doesn't block the response
  emitProfileRefinementSignal(record).catch((err) => {
    console.error('Failed to emit profile refinement signal:', err)
  })

  // Generate feedback
  const feedback = generateFeedback(state, updatedState as UserPerformanceState, record.isCorrect)

  return {
    newState: updatedState as UserPerformanceState,
    difficultyChanged: updatedState.target_difficulty !== state.target_difficulty,
    newDifficulty: updatedState.target_difficulty,
    feedback,
  }
}

/**
 * Calculate all state updates based on the answer
 */
function calculateStateUpdates(
  state: UserPerformanceState,
  record: AnswerRecord
): Partial<UserPerformanceState> {
  const { isCorrect, responseTimeMs, questionDifficulty = 3 } = record

  // 1. Update rolling accuracy
  const effectiveScore = isCorrect ? 1 : 0
  const newAccuracy = state.rolling_accuracy * (1 - CONFIG.rollingAverageAlpha) +
                      effectiveScore * CONFIG.rollingAverageAlpha

  // 2. Update streaks
  const newCorrectStreak = isCorrect ? state.correct_streak + 1 : 0
  const newWrongStreak = isCorrect ? 0 : state.wrong_streak + 1

  // 3. Update ability estimate using simplified IRT
  // P(correct) = 1 / (1 + exp(-(ability - difficulty)))
  const expectedProb = 1 / (1 + Math.exp(-(state.estimated_ability - questionDifficulty)))
  const surprise = effectiveScore - expectedProb
  let newAbility = state.estimated_ability + CONFIG.abilityLearningRate * surprise
  newAbility = Math.max(CONFIG.minAbility, Math.min(CONFIG.maxAbility, newAbility))

  // 4. Calculate new target difficulty
  let newTargetDifficulty = state.target_difficulty

  // Adjust based on accuracy thresholds
  if (newAccuracy > CONFIG.accuracyHighThreshold) {
    newTargetDifficulty += CONFIG.adjustmentStep
  } else if (newAccuracy < CONFIG.accuracyLowThreshold) {
    newTargetDifficulty -= CONFIG.adjustmentStep
  }

  // Adjust based on streaks
  if (newCorrectStreak >= CONFIG.streakThreshold && isCorrect) {
    newTargetDifficulty += CONFIG.streakBonus
  } else if (newWrongStreak >= CONFIG.streakThreshold && !isCorrect) {
    newTargetDifficulty -= CONFIG.streakBonus
  }

  // Clamp target difficulty
  newTargetDifficulty = Math.max(CONFIG.minDifficulty, Math.min(CONFIG.maxDifficulty, newTargetDifficulty))

  // 5. Update session difficulty (more conservative, adjusts slower)
  let newSessionDifficulty = state.session_difficulty_level
  if (newCorrectStreak >= CONFIG.streakThreshold && isCorrect) {
    newSessionDifficulty = Math.min(CONFIG.maxDifficulty, newSessionDifficulty + 0.1)
  } else if (newWrongStreak >= CONFIG.streakThreshold && !isCorrect) {
    newSessionDifficulty = Math.max(CONFIG.minDifficulty, newSessionDifficulty - 0.1)
  }

  // 6. Update response time average
  let newAvgResponseTime = state.rolling_response_time_ms
  if (responseTimeMs !== undefined) {
    if (newAvgResponseTime === 0) {
      newAvgResponseTime = responseTimeMs
    } else {
      newAvgResponseTime = Math.round(newAvgResponseTime * 0.9 + responseTimeMs * 0.1)
    }
  }

  return {
    rolling_accuracy: newAccuracy,
    estimated_ability: newAbility,
    correct_streak: newCorrectStreak,
    wrong_streak: newWrongStreak,
    target_difficulty: newTargetDifficulty,
    session_difficulty_level: newSessionDifficulty,
    rolling_response_time_ms: newAvgResponseTime,
    questions_answered: state.questions_answered + 1,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Update question difficulty based on answer outcome
 */
async function updateQuestionDifficulty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionSource: QuestionSource,
  questionId: string,
  isCorrect: boolean,
  responseTimeMs?: number
): Promise<void> {
  // Get or create difficulty record
  const { data: existing } = await supabase
    .from('question_difficulty')
    .select('*')
    .eq('question_source', questionSource)
    .eq('question_id', questionId)
    .single()

  if (existing) {
    // Update existing record
    const timesShown = existing.times_shown + 1
    const timesCorrect = existing.times_correct + (isCorrect ? 1 : 0)
    const empiricalDifficulty = 1 - (timesCorrect / timesShown)

    let avgTime = existing.avg_response_time_ms
    if (responseTimeMs !== undefined) {
      if (!avgTime) {
        avgTime = responseTimeMs
      } else {
        avgTime = Math.round((avgTime * existing.times_shown + responseTimeMs) / timesShown)
      }
    }

    await supabase
      .from('question_difficulty')
      .update({
        times_shown: timesShown,
        times_correct: timesCorrect,
        empirical_difficulty: empiricalDifficulty,
        avg_response_time_ms: avgTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    // Create new record
    await supabase
      .from('question_difficulty')
      .insert({
        question_source: questionSource,
        question_id: questionId,
        times_shown: 1,
        times_correct: isCorrect ? 1 : 0,
        empirical_difficulty: isCorrect ? 0 : 1,
        avg_response_time_ms: responseTimeMs || null,
      })
  }
}

/**
 * Generate feedback message based on performance change
 */
function generateFeedback(
  oldState: UserPerformanceState,
  newState: UserPerformanceState,
  isCorrect: boolean
): PerformanceUpdateResult['feedback'] {
  // Streak messages
  if (newState.correct_streak >= 5) {
    return {
      message: "You're on fire! 5+ correct in a row!",
      type: 'encouragement',
    }
  }

  if (newState.correct_streak === 3) {
    return {
      message: 'Great streak! Keep it up!',
      type: 'encouragement',
    }
  }

  // Difficulty adjustment messages
  if (newState.target_difficulty > oldState.target_difficulty) {
    return {
      message: "Increasing challenge - you're ready for harder questions!",
      type: 'challenge',
    }
  }

  if (newState.target_difficulty < oldState.target_difficulty) {
    return {
      message: "Let's practice the fundamentals a bit more.",
      type: 'neutral',
    }
  }

  // Default messages
  if (isCorrect) {
    return {
      message: 'Correct!',
      type: 'encouragement',
    }
  }

  return {
    message: "Let's review this concept.",
    type: 'neutral',
  }
}

// =============================================================================
// Performance Analysis
// =============================================================================

/**
 * Get performance summary for display
 */
export async function getPerformanceSummary(
  userId: string,
  courseId?: string
): Promise<{
  accuracy: number
  ability: number
  difficulty: number
  streak: number
  streakType: 'correct' | 'wrong' | 'none'
  questionsAnswered: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from('user_performance_state')
    .select('*')
    .eq('user_id', userId)

  if (courseId) {
    query = query.eq('course_id', courseId)
  } else {
    query = query.is('course_id', null)
  }

  const { data: state } = await query.single()

  if (!state) {
    return {
      accuracy: 0.5,
      ability: 2.5,
      difficulty: 3.0,
      streak: 0,
      streakType: 'none',
      questionsAnswered: 0,
    }
  }

  return {
    accuracy: state.rolling_accuracy,
    ability: state.estimated_ability,
    difficulty: state.target_difficulty,
    streak: Math.max(state.correct_streak, state.wrong_streak),
    streakType: state.correct_streak > 0 ? 'correct' : state.wrong_streak > 0 ? 'wrong' : 'none',
    questionsAnswered: state.questions_answered,
  }
}

/**
 * Reset session performance state
 */
export async function resetSessionState(
  userId: string,
  courseId?: string
): Promise<void> {
  const supabase = await createClient()

  let query = supabase
    .from('user_performance_state')
    .update({
      session_difficulty_level: 2.5,
      correct_streak: 0,
      wrong_streak: 0,
      session_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (courseId) {
    query = query.eq('course_id', courseId)
  } else {
    query = query.is('course_id', null)
  }

  await query
}

/**
 * Save performance history snapshot
 */
export async function savePerformanceSnapshot(
  userId: string,
  courseId?: string
): Promise<void> {
  const supabase = await createClient()

  // Get current state
  let query = supabase
    .from('user_performance_state')
    .select('*')
    .eq('user_id', userId)

  if (courseId) {
    query = query.eq('course_id', courseId)
  } else {
    query = query.is('course_id', null)
  }

  const { data: state } = await query.single()

  if (!state || state.questions_answered === 0) {
    return
  }

  // Save snapshot
  await supabase
    .from('user_performance_history')
    .insert({
      user_id: userId,
      course_id: courseId || null,
      accuracy: state.rolling_accuracy,
      estimated_ability: state.estimated_ability,
      questions_answered: state.questions_answered,
    })
}

// =============================================================================
// Profile Refinement Integration
// =============================================================================

/**
 * Emit a question signal to the profile refinement engine
 * This enables RLPA-style dynamic profile adaptation based on learning signals
 */
async function emitProfileRefinementSignal(record: AnswerRecord): Promise<void> {
  const signal: QuestionSignal = {
    wasCorrect: record.isCorrect,
    timeMs: record.responseTimeMs || 0,
    usedHint: record.usedHint || false,
    questionDifficulty: record.questionDifficulty || 3,
    conceptId: record.conceptId,
  }

  await processLearningSignal(record.userId, {
    type: 'question_answered',
    data: signal,
  })
}

// =============================================================================
// Export
// =============================================================================

const realtimeAdjuster = {
  recordAnswer,
  getPerformanceSummary,
  resetSessionState,
  savePerformanceSnapshot,
}

export default realtimeAdjuster
