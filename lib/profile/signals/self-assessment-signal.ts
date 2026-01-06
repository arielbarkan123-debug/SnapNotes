/**
 * Self-Assessment Signal Processor
 *
 * Processes self-assessment signals to calculate confidence calibration
 * and adjust difficulty targets based on perceived vs actual difficulty.
 */

import {
  type RefinementState,
  type SelfAssessmentSignal,
  applyEMA,
  EMA_ALPHA,
} from '../refinement-engine'

export interface SelfAssessmentSignalResult {
  updates: Partial<RefinementState>
  calibrationInsight: CalibrationInsight
  significantChanges: string[]
}

export interface CalibrationInsight {
  isCalibrated: boolean
  tendencyDescription: string
  recommendation: string
}

/**
 * Thresholds for calibration assessment
 */
const CALIBRATION_THRESHOLDS = {
  wellCalibrated: 0.15, // Within 15% of actual
  slightlyOff: 0.3, // Within 30%
}

/**
 * Process a self-assessment signal
 *
 * Updates:
 * - confidenceCalibration: How well self-confidence matches actual performance
 * - currentDifficultyTarget: Adjusted based on perceived vs actual difficulty
 */
export function processSelfAssessmentSignal(
  currentState: RefinementState,
  signal: SelfAssessmentSignal
): SelfAssessmentSignalResult {
  const updates: Partial<RefinementState> = {}
  const significantChanges: string[] = []

  // 1. Calculate confidence calibration
  const calibrationResult = calculateCalibration(currentState, signal)
  updates.confidenceCalibration = calibrationResult.newCalibration

  if (
    Math.abs(calibrationResult.newCalibration - currentState.confidenceCalibration) > 0.1
  ) {
    significantChanges.push(
      `Confidence calibration updated: ${calibrationResult.insight.tendencyDescription}`
    )
  }

  // 2. Adjust difficulty based on perceived vs actual
  const difficultyResult = adjustDifficultyFromAssessment(currentState, signal)
  if (difficultyResult.shouldUpdate) {
    updates.currentDifficultyTarget = difficultyResult.newTarget
    significantChanges.push(
      `Difficulty target ${difficultyResult.newTarget > currentState.currentDifficultyTarget ? 'increased' : 'decreased'} based on self-assessment`
    )
  }

  // 3. Update counters
  updates.totalSelfAssessments = currentState.totalSelfAssessments + 1

  // 4. Update timestamp
  updates.updatedAt = new Date()

  return {
    updates,
    calibrationInsight: calibrationResult.insight,
    significantChanges,
  }
}

/**
 * Calculate confidence calibration
 *
 * Compares self-reported confidence with actual accuracy to determine
 * if the user tends to be overconfident or underconfident.
 *
 * Returns a value between -1 (severely underconfident) and 1 (severely overconfident)
 */
function calculateCalibration(
  currentState: RefinementState,
  signal: SelfAssessmentSignal
): {
  newCalibration: number
  insight: CalibrationInsight
} {
  // Normalize self-confidence (1-4) to 0-1 scale
  // 1 = not confident at all (0.25)
  // 2 = somewhat confident (0.5)
  // 3 = confident (0.75)
  // 4 = very confident (1.0)
  const normalizedConfidence = signal.selfConfidence / 4

  // Normalize actual accuracy (0-100) to 0-1 scale
  const normalizedAccuracy = signal.actualAccuracy / 100

  // Calculate calibration delta
  // Positive = overconfident (thinks they know more than they do)
  // Negative = underconfident (thinks they know less than they do)
  const calibrationDelta = normalizedConfidence - normalizedAccuracy

  // Apply EMA for smooth updates
  const newCalibration = applyEMA(
    currentState.confidenceCalibration,
    calibrationDelta,
    EMA_ALPHA.preference
  )

  // Bound between -1 and 1
  const boundedCalibration = Math.max(-1, Math.min(1, newCalibration))

  // Generate insight
  const insight = generateCalibrationInsight(boundedCalibration)

  return {
    newCalibration: Number(boundedCalibration.toFixed(3)),
    insight,
  }
}

/**
 * Generate human-readable insight from calibration score
 */
function generateCalibrationInsight(calibration: number): CalibrationInsight {
  const absCalibration = Math.abs(calibration)

  if (absCalibration <= CALIBRATION_THRESHOLDS.wellCalibrated) {
    return {
      isCalibrated: true,
      tendencyDescription: 'Well-calibrated',
      recommendation: 'Your self-assessment accurately reflects your understanding. Keep it up!',
    }
  }

  if (calibration > 0) {
    // Overconfident
    if (absCalibration <= CALIBRATION_THRESHOLDS.slightlyOff) {
      return {
        isCalibrated: false,
        tendencyDescription: 'Slightly overconfident',
        recommendation:
          'You sometimes overestimate your understanding. Try reviewing explanations even when you feel confident.',
      }
    }
    return {
      isCalibrated: false,
      tendencyDescription: 'Overconfident',
      recommendation:
        'You tend to feel more confident than your results suggest. Consider spending more time on each topic and testing yourself more thoroughly.',
    }
  } else {
    // Underconfident
    if (absCalibration <= CALIBRATION_THRESHOLDS.slightlyOff) {
      return {
        isCalibrated: false,
        tendencyDescription: 'Slightly underconfident',
        recommendation:
          "You know more than you think! Trust your understanding when you've studied the material.",
      }
    }
    return {
      isCalibrated: false,
      tendencyDescription: 'Underconfident',
      recommendation:
        "You're performing better than you expect! Build confidence by celebrating your correct answers and reviewing your progress.",
    }
  }
}

/**
 * Adjust difficulty target based on perceived vs actual difficulty
 */
function adjustDifficultyFromAssessment(
  currentState: RefinementState,
  signal: SelfAssessmentSignal
): {
  shouldUpdate: boolean
  newTarget: number
} {
  const currentTarget = currentState.currentDifficultyTarget
  const accuracy = signal.actualAccuracy

  // Matrix of perceived difficulty vs actual accuracy
  // Perceived: too_easy, just_right, too_hard
  // Actual: high (>80), medium (50-80), low (<50)

  if (signal.perceivedDifficulty === 'too_easy') {
    if (accuracy > 80) {
      // User found it easy AND performed well - increase difficulty
      const newTarget = Math.min(5, currentTarget + 0.2)
      return { shouldUpdate: true, newTarget: Number(newTarget.toFixed(2)) }
    }
    if (accuracy < 50) {
      // User thought it was easy but performed poorly - overconfidence signal
      // Don't change difficulty, but this affects calibration
      return { shouldUpdate: false, newTarget: currentTarget }
    }
  }

  if (signal.perceivedDifficulty === 'too_hard') {
    if (accuracy < 60) {
      // User found it hard AND struggled - decrease difficulty
      const newTarget = Math.max(1, currentTarget - 0.2)
      return { shouldUpdate: true, newTarget: Number(newTarget.toFixed(2)) }
    }
    if (accuracy > 80) {
      // User thought it was hard but performed well - underconfidence signal
      // Slight increase in difficulty
      const newTarget = Math.min(5, currentTarget + 0.1)
      return { shouldUpdate: true, newTarget: Number(newTarget.toFixed(2)) }
    }
  }

  if (signal.perceivedDifficulty === 'just_right') {
    // User felt it was appropriate - maintain current difficulty
    // Small adjustment based on actual performance
    if (accuracy > 85) {
      // Doing very well - slight increase
      const newTarget = Math.min(5, currentTarget + 0.05)
      return { shouldUpdate: true, newTarget: Number(newTarget.toFixed(2)) }
    }
    if (accuracy < 50) {
      // Struggling - slight decrease
      const newTarget = Math.max(1, currentTarget - 0.05)
      return { shouldUpdate: true, newTarget: Number(newTarget.toFixed(2)) }
    }
  }

  return { shouldUpdate: false, newTarget: currentTarget }
}

export default processSelfAssessmentSignal
