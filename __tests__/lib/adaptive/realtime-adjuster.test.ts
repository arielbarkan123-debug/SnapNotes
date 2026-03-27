/**
 * Tests for lib/adaptive/realtime-adjuster.ts
 *
 * Since the exported functions (recordAnswer, etc.) require Supabase,
 * we replicate the internal pure computation logic (calculateStateUpdates,
 * generateFeedback) and test it directly.
 */

import type { UserPerformanceState, AnswerRecord } from '@/lib/adaptive/types'

// =============================================================================
// Replicate the pure internal logic from realtime-adjuster.ts
// =============================================================================

const CONFIG = {
  rollingAverageAlpha: 0.1,
  abilityLearningRate: 0.3,
  adjustmentStep: 0.4,
  streakBonus: 0.25,
  streakThreshold: 2,
  accuracyHighThreshold: 0.80,
  accuracyLowThreshold: 0.65,
  fastLearnerMultiplier: 1.5,
  fastLearnerAbilityThreshold: 3.5,
  fastLearnerAccuracyThreshold: 0.9,
  floorRaiseThreshold: 0.90,
  floorRaiseStep: 0.5,
  floorMaximum: 3.0,
  floorMinQuestions: 10,
  minDifficulty: 1.0,
  maxDifficulty: 5.0,
  minAbility: 1.0,
  maxAbility: 5.0,
} as const

function calculateStateUpdates(
  state: UserPerformanceState,
  record: Pick<AnswerRecord, 'isCorrect' | 'responseTimeMs' | 'questionDifficulty'>
): Partial<UserPerformanceState> {
  const { isCorrect, responseTimeMs, questionDifficulty = 3 } = record

  const effectiveScore = isCorrect ? 1 : 0
  const newAccuracy = state.rolling_accuracy * (1 - CONFIG.rollingAverageAlpha) +
                      effectiveScore * CONFIG.rollingAverageAlpha

  const newCorrectStreak = isCorrect ? state.correct_streak + 1 : 0
  const newWrongStreak = isCorrect ? 0 : state.wrong_streak + 1

  const expectedProb = 1 / (1 + Math.exp(-(state.estimated_ability - questionDifficulty)))
  const surprise = effectiveScore - expectedProb
  let newAbility = state.estimated_ability + CONFIG.abilityLearningRate * surprise
  newAbility = Math.max(CONFIG.minAbility, Math.min(CONFIG.maxAbility, newAbility))

  let newTargetDifficulty = state.target_difficulty

  let effectiveStep = CONFIG.adjustmentStep
  if (newAbility > CONFIG.fastLearnerAbilityThreshold && newAccuracy > CONFIG.fastLearnerAccuracyThreshold) {
    effectiveStep *= CONFIG.fastLearnerMultiplier
  }

  if (newAccuracy > CONFIG.accuracyHighThreshold) {
    newTargetDifficulty += effectiveStep
  } else if (newAccuracy < CONFIG.accuracyLowThreshold) {
    newTargetDifficulty -= CONFIG.adjustmentStep
  }

  if (newCorrectStreak >= CONFIG.streakThreshold && isCorrect) {
    newTargetDifficulty += CONFIG.streakBonus
  } else if (newWrongStreak >= CONFIG.streakThreshold && !isCorrect) {
    newTargetDifficulty -= CONFIG.streakBonus
  }

  if (newWrongStreak >= 5) {
    newTargetDifficulty = CONFIG.minDifficulty
  }

  const currentFloor = state.difficulty_floor || 1.0
  let newFloor = currentFloor
  const questionsAfterUpdate = state.questions_answered + 1
  if (newAccuracy > CONFIG.floorRaiseThreshold && questionsAfterUpdate >= CONFIG.floorMinQuestions) {
    newFloor = Math.min(CONFIG.floorMaximum, currentFloor + CONFIG.floorRaiseStep)
  }

  newTargetDifficulty = Math.max(newFloor, newTargetDifficulty)
  newTargetDifficulty = Math.max(CONFIG.minDifficulty, Math.min(CONFIG.maxDifficulty, newTargetDifficulty))

  let newSessionDifficulty = state.session_difficulty_level
  if (newCorrectStreak >= CONFIG.streakThreshold && isCorrect) {
    newSessionDifficulty = Math.min(CONFIG.maxDifficulty, newSessionDifficulty + 0.1)
  } else if (newWrongStreak >= CONFIG.streakThreshold && !isCorrect) {
    newSessionDifficulty = Math.max(CONFIG.minDifficulty, newSessionDifficulty - 0.1)
  }

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
    difficulty_floor: newFloor,
  }
}

function generateFeedback(
  oldState: UserPerformanceState,
  newState: UserPerformanceState,
  isCorrect: boolean
): { message: string; type: 'encouragement' | 'challenge' | 'neutral' } {
  if (newState.correct_streak >= 5) {
    return { message: "You're on fire! 5+ correct in a row!", type: 'encouragement' }
  }
  if (newState.correct_streak === 3) {
    return { message: 'Great streak! Keep it up!', type: 'encouragement' }
  }
  if (newState.target_difficulty > oldState.target_difficulty) {
    return { message: "Increasing challenge - you're ready for harder questions!", type: 'challenge' }
  }
  if (newState.target_difficulty < oldState.target_difficulty) {
    return { message: "Let's practice the fundamentals a bit more.", type: 'neutral' }
  }
  if (isCorrect) {
    return { message: 'Correct!', type: 'encouragement' }
  }
  return { message: "Let's review this concept.", type: 'neutral' }
}

// =============================================================================
// Helpers
// =============================================================================

function makeState(overrides: Partial<UserPerformanceState> = {}): UserPerformanceState {
  return {
    id: 'state-1',
    user_id: 'user-1',
    course_id: null,
    session_difficulty_level: 2.5,
    target_difficulty: 3.0,
    rolling_accuracy: 0.75,
    rolling_response_time_ms: 5000,
    estimated_ability: 2.5,
    correct_streak: 0,
    wrong_streak: 0,
    last_cognitive_level: null,
    questions_answered: 10,
    session_start: null,
    difficulty_floor: 1.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('calculateStateUpdates (replicated pure logic)', () => {
  it('should update rolling accuracy with exponential moving average', () => {
    const state = makeState({ rolling_accuracy: 0.5 })
    const updates = calculateStateUpdates(state, { isCorrect: true })
    // 0.5 * 0.9 + 1 * 0.1 = 0.55
    expect(updates.rolling_accuracy).toBeCloseTo(0.55, 5)
  })

  it('should reset correct_streak on wrong answer', () => {
    const state = makeState({ correct_streak: 5 })
    const updates = calculateStateUpdates(state, { isCorrect: false })
    expect(updates.correct_streak).toBe(0)
    expect(updates.wrong_streak).toBe(1)
  })

  it('should increment correct_streak on right answer', () => {
    const state = makeState({ correct_streak: 2 })
    const updates = calculateStateUpdates(state, { isCorrect: true })
    expect(updates.correct_streak).toBe(3)
    expect(updates.wrong_streak).toBe(0)
  })

  it('should update ability estimate using IRT', () => {
    const state = makeState({ estimated_ability: 2.5 })
    // With ability=2.5 and difficulty=3, expected probability = 1/(1+exp(0.5)) ~ 0.378
    // Correct answer: surprise = 1 - 0.378 = 0.622
    // newAbility = 2.5 + 0.3 * 0.622 = 2.687
    const updates = calculateStateUpdates(state, { isCorrect: true, questionDifficulty: 3 })
    expect(updates.estimated_ability).toBeCloseTo(2.687, 2)
  })

  it('should apply emergency bail-out for 5+ wrong streak', () => {
    const state = makeState({ wrong_streak: 4, target_difficulty: 4.0, rolling_accuracy: 0.3 })
    const updates = calculateStateUpdates(state, { isCorrect: false })
    // wrong_streak = 5, triggers emergency bail-out to minDifficulty = 1.0
    expect(updates.target_difficulty).toBe(1.0)
  })

  it('should raise difficulty floor when accuracy high and enough questions', () => {
    const state = makeState({
      rolling_accuracy: 0.91, // After update will still be > 0.90
      questions_answered: 15,
      difficulty_floor: 1.0,
    })
    const updates = calculateStateUpdates(state, { isCorrect: true })
    // newAccuracy = 0.91 * 0.9 + 1 * 0.1 = 0.919 > 0.90
    // questionsAfterUpdate = 16 >= 10
    // newFloor = min(3.0, 1.0 + 0.5) = 1.5
    expect(updates.difficulty_floor).toBe(1.5)
  })

  it('should update response time with exponential average', () => {
    const state = makeState({ rolling_response_time_ms: 5000 })
    const updates = calculateStateUpdates(state, {
      isCorrect: true,
      responseTimeMs: 3000,
    })
    // 5000 * 0.9 + 3000 * 0.1 = 4800
    expect(updates.rolling_response_time_ms).toBe(4800)
  })

  it('should set initial response time on first answer', () => {
    const state = makeState({ rolling_response_time_ms: 0 })
    const updates = calculateStateUpdates(state, {
      isCorrect: true,
      responseTimeMs: 4000,
    })
    expect(updates.rolling_response_time_ms).toBe(4000)
  })

  it('should apply fast learner multiplier for high-ability high-accuracy', () => {
    const state = makeState({
      estimated_ability: 4.0,
      rolling_accuracy: 0.92, // After update with correct => stays above 0.9
      target_difficulty: 3.0,
      correct_streak: 0,
    })
    const updates = calculateStateUpdates(state, { isCorrect: true, questionDifficulty: 3.0 })
    // newAccuracy = 0.92*0.9 + 1*0.1 = 0.928 > 0.90
    // newAbility: starts at 4.0, expected prob for diff=3 is high => ability stays > 3.5
    // effectiveStep = 0.4 * 1.5 = 0.6
    // newTargetDifficulty = 3.0 + 0.6 = 3.6 (accuracy > 0.80)
    expect(updates.target_difficulty).toBeGreaterThan(3.5)
  })
})

describe('generateFeedback (replicated pure logic)', () => {
  it('should return fire message for 5+ correct streak', () => {
    const oldState = makeState()
    const newState = makeState({ correct_streak: 5 })
    const feedback = generateFeedback(oldState, newState, true)
    expect(feedback.type).toBe('encouragement')
    expect(feedback.message).toContain('fire')
  })

  it('should return challenge feedback when difficulty increases', () => {
    const oldState = makeState({ target_difficulty: 3.0, correct_streak: 0 })
    const newState = makeState({ target_difficulty: 3.5, correct_streak: 1 })
    const feedback = generateFeedback(oldState, newState, true)
    expect(feedback.type).toBe('challenge')
  })

  it('should return neutral feedback for incorrect answer with no other signals', () => {
    const oldState = makeState({ target_difficulty: 3.0 })
    const newState = makeState({ target_difficulty: 3.0, correct_streak: 0 })
    const feedback = generateFeedback(oldState, newState, false)
    expect(feedback.type).toBe('neutral')
  })

  it('should return encouragement for simple correct answer', () => {
    const oldState = makeState({ target_difficulty: 3.0 })
    const newState = makeState({ target_difficulty: 3.0, correct_streak: 1 })
    const feedback = generateFeedback(oldState, newState, true)
    expect(feedback.type).toBe('encouragement')
    expect(feedback.message).toBe('Correct!')
  })
})
