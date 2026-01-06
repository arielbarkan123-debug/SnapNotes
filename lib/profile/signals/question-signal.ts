/**
 * Question Signal Processor
 *
 * Processes signals from question/answer events to update
 * accuracy, ability, difficulty target, and speed preference.
 */

import {
  type RefinementState,
  type QuestionSignal,
  applyEMA,
  calculateConfidence,
  EMA_ALPHA,
} from '../refinement-engine'

export interface QuestionSignalResult {
  updates: Partial<RefinementState>
  shouldUpdateProfile: boolean
  significantChanges: string[]
}

/**
 * Process a question answer signal
 *
 * Updates:
 * - rollingAccuracy: EMA of correct/incorrect
 * - rollingResponseTimeMs: EMA of response times
 * - estimatedAbility: IRT-inspired ability estimation
 * - currentDifficultyTarget: Adaptive difficulty target
 * - inferredSpeedPreference: Based on response time patterns
 */
export function processQuestionSignal(
  currentState: RefinementState,
  signal: QuestionSignal
): QuestionSignalResult {
  const updates: Partial<RefinementState> = {}
  const significantChanges: string[] = []

  // 1. Update rolling accuracy
  const accuracyValue = signal.wasCorrect ? 1 : 0
  const newAccuracy = applyEMA(
    currentState.rollingAccuracy,
    accuracyValue,
    EMA_ALPHA.rolling
  )
  updates.rollingAccuracy = Number(newAccuracy.toFixed(3))

  // Check for significant accuracy change
  const accuracyDelta = Math.abs(newAccuracy - currentState.rollingAccuracy)
  if (accuracyDelta > 0.05) {
    significantChanges.push(
      `Accuracy ${newAccuracy > currentState.rollingAccuracy ? 'improved' : 'declined'} by ${(accuracyDelta * 100).toFixed(1)}%`
    )
  }

  // 2. Update rolling response time
  const baseResponseTime = currentState.rollingResponseTimeMs || signal.timeMs
  const newResponseTime = Math.round(
    applyEMA(baseResponseTime, signal.timeMs, EMA_ALPHA.rolling)
  )
  updates.rollingResponseTimeMs = newResponseTime

  // 3. Update estimated ability (IRT-inspired)
  const abilityDelta = calculateAbilityDelta(signal)
  const rawAbility = currentState.estimatedAbility + abilityDelta
  const boundedAbility = Math.max(1, Math.min(5, rawAbility))
  const smoothedAbility = applyEMA(
    currentState.estimatedAbility,
    boundedAbility,
    EMA_ALPHA.rolling
  )
  updates.estimatedAbility = Number(smoothedAbility.toFixed(2))

  // 4. Update difficulty target
  const difficultyUpdate = calculateDifficultyUpdate(currentState, signal)
  if (difficultyUpdate !== null) {
    updates.currentDifficultyTarget = Number(difficultyUpdate.toFixed(2))

    if (Math.abs(difficultyUpdate - currentState.currentDifficultyTarget) > 0.1) {
      significantChanges.push(
        `Difficulty target ${difficultyUpdate > currentState.currentDifficultyTarget ? 'increased' : 'decreased'}`
      )
    }
  }

  // 5. Update speed preference based on response time patterns
  const speedUpdate = calculateSpeedPreference(currentState, newResponseTime)
  if (speedUpdate.shouldUpdate) {
    updates.inferredSpeedPreference = speedUpdate.newPreference
    updates.speedConfidence = speedUpdate.newConfidence
    significantChanges.push(`Speed preference updated to ${speedUpdate.newPreference}`)
  } else if (speedUpdate.newConfidence !== currentState.speedConfidence) {
    updates.speedConfidence = speedUpdate.newConfidence
  }

  // 6. Update counters and confidence scores
  const newQuestionCount = currentState.totalQuestionsAnalyzed + 1
  updates.totalQuestionsAnalyzed = newQuestionCount
  updates.accuracyConfidence = Number(calculateConfidence(newQuestionCount).toFixed(2))
  updates.difficultyConfidence = Number(calculateConfidence(newQuestionCount, 20).toFixed(2))

  // 7. Update timestamps
  updates.lastAccuracyUpdate = new Date()
  updates.updatedAt = new Date()

  return {
    updates,
    shouldUpdateProfile: significantChanges.length > 0,
    significantChanges,
  }
}

/**
 * Calculate ability change based on question result
 * Using IRT-inspired logic: harder correct = more gain, easier wrong = more loss
 */
function calculateAbilityDelta(signal: QuestionSignal): number {
  const baseDelta = 0.1
  const difficultyFactor = signal.questionDifficulty / 3 // Normalize to ~0.33-1.67

  if (signal.wasCorrect) {
    // Correct: gain more for harder questions
    let delta = baseDelta * difficultyFactor
    // Reduce gain if hint was used
    if (signal.usedHint) {
      delta *= 0.5
    }
    return delta
  } else {
    // Wrong: lose more for easier questions
    const easenessFactor = (6 - signal.questionDifficulty) / 3
    return -baseDelta * easenessFactor
  }
}

/**
 * Calculate new difficulty target based on performance
 */
function calculateDifficultyUpdate(
  currentState: RefinementState,
  signal: QuestionSignal
): number | null {
  const currentTarget = currentState.currentDifficultyTarget

  if (signal.wasCorrect && !signal.usedHint) {
    // Correct without hint - can handle harder content
    const increase = 0.1
    return Math.min(5, applyEMA(currentTarget, currentTarget + increase, EMA_ALPHA.difficulty))
  } else if (!signal.wasCorrect) {
    // Wrong - decrease difficulty target
    const decrease = 0.1
    return Math.max(1, applyEMA(currentTarget, currentTarget - decrease, EMA_ALPHA.difficulty))
  }

  // Correct with hint - no change
  return null
}

/**
 * Calculate speed preference based on response time patterns
 */
function calculateSpeedPreference(
  currentState: RefinementState,
  newResponseTime: number
): {
  shouldUpdate: boolean
  newPreference: 'fast' | 'moderate' | 'slow'
  newConfidence: number
} {
  // Determine inferred speed from response time
  let inferredSpeed: 'fast' | 'moderate' | 'slow' = 'moderate'
  if (newResponseTime < 5000) {
    inferredSpeed = 'fast'
  } else if (newResponseTime > 15000) {
    inferredSpeed = 'slow'
  }

  // If speed matches current preference, increase confidence
  if (inferredSpeed === currentState.inferredSpeedPreference) {
    return {
      shouldUpdate: false,
      newPreference: inferredSpeed,
      newConfidence: Math.min(1, currentState.speedConfidence + 0.05),
    }
  }

  // Speed is different - track confidence toward change
  const newConfidence = currentState.speedConfidence + 0.1

  // Only update preference when confidence is high enough
  if (newConfidence > 0.7) {
    return {
      shouldUpdate: true,
      newPreference: inferredSpeed,
      newConfidence: 0.5, // Reset confidence after change
    }
  }

  return {
    shouldUpdate: false,
    newPreference: currentState.inferredSpeedPreference,
    newConfidence,
  }
}

export default processQuestionSignal
