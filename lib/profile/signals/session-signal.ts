/**
 * Session Signal Processor
 *
 * Processes signals from completed learning sessions to update
 * optimal session length and peak performance hour.
 */

import {
  type RefinementState,
  type SessionSignal,
  applyEMA,
  calculateConfidence,
  EMA_ALPHA,
} from '../refinement-engine'

export interface SessionSignalResult {
  updates: Partial<RefinementState>
  shouldUpdateProfile: boolean
  significantChanges: string[]
}

/**
 * Minimum questions to consider a session meaningful
 */
const MIN_QUESTIONS_FOR_SESSION = 3

/**
 * Minimum accuracy to consider for peak hour detection
 */
const MIN_ACCURACY_FOR_PEAK = 0.7

/**
 * Minimum questions for peak hour consideration
 */
const MIN_QUESTIONS_FOR_PEAK = 5

/**
 * Process a session ended signal
 *
 * Updates:
 * - inferredOptimalSessionMinutes: Based on productive session lengths
 * - inferredPeakHour: Based on high-accuracy session times
 */
export function processSessionSignal(
  currentState: RefinementState,
  signal: SessionSignal
): SessionSignalResult {
  const updates: Partial<RefinementState> = {}
  const significantChanges: string[] = []

  // 1. Update optimal session length
  const sessionLengthUpdate = calculateOptimalSessionLength(currentState, signal)
  if (sessionLengthUpdate.shouldUpdate) {
    updates.inferredOptimalSessionMinutes = sessionLengthUpdate.newLength
    updates.sessionLengthConfidence = sessionLengthUpdate.newConfidence

    if (
      Math.abs(sessionLengthUpdate.newLength - currentState.inferredOptimalSessionMinutes) >= 2
    ) {
      significantChanges.push(
        `Optimal session length updated to ${sessionLengthUpdate.newLength} minutes`
      )
    }
  }

  // 2. Update peak performance hour
  const peakHourUpdate = calculatePeakHour(currentState, signal)
  if (peakHourUpdate.shouldUpdate) {
    updates.inferredPeakHour = peakHourUpdate.newHour
    updates.peakHourConfidence = peakHourUpdate.newConfidence

    if (currentState.inferredPeakHour !== peakHourUpdate.newHour && peakHourUpdate.newHour !== null) {
      significantChanges.push(
        `Peak performance hour updated to ${formatHour(peakHourUpdate.newHour)}`
      )
    }
  }

  // 3. Update counters
  updates.totalSessionsAnalyzed = currentState.totalSessionsAnalyzed + 1

  // 4. Update timestamps
  updates.lastSessionUpdate = new Date()
  updates.updatedAt = new Date()

  return {
    updates,
    shouldUpdateProfile: significantChanges.length > 0,
    significantChanges,
  }
}

/**
 * Calculate optimal session length based on productive sessions
 */
function calculateOptimalSessionLength(
  currentState: RefinementState,
  signal: SessionSignal
): {
  shouldUpdate: boolean
  newLength: number
  newConfidence: number
} {
  // Only consider sessions with meaningful activity
  if (signal.questionsAnswered < MIN_QUESTIONS_FOR_SESSION) {
    return {
      shouldUpdate: false,
      newLength: currentState.inferredOptimalSessionMinutes,
      newConfidence: currentState.sessionLengthConfidence,
    }
  }

  // Weight longer sessions more if they're productive
  const productivityScore = signal.accuracy * signal.questionsAnswered

  // Only update from productive sessions (>50% accuracy)
  if (signal.accuracy < 0.5) {
    return {
      shouldUpdate: false,
      newLength: currentState.inferredOptimalSessionMinutes,
      newConfidence: currentState.sessionLengthConfidence,
    }
  }

  const currentOptimal = currentState.inferredOptimalSessionMinutes || 15

  // Apply EMA with weight based on productivity
  const alpha = EMA_ALPHA.session * Math.min(2, productivityScore / 5) // Boost alpha for very productive sessions
  const newLength = applyEMA(currentOptimal, signal.durationMinutes, alpha)

  // Bound between 5 and 60 minutes
  const boundedLength = Math.round(Math.max(5, Math.min(60, newLength)))

  // Calculate new confidence
  const newConfidence = calculateConfidence(currentState.totalSessionsAnalyzed + 1, 5)

  return {
    shouldUpdate: true,
    newLength: boundedLength,
    newConfidence: Number(newConfidence.toFixed(2)),
  }
}

/**
 * Calculate peak performance hour based on high-accuracy sessions
 */
function calculatePeakHour(
  currentState: RefinementState,
  signal: SessionSignal
): {
  shouldUpdate: boolean
  newHour: number | null
  newConfidence: number
} {
  // Only track peak hour from good sessions
  if (
    signal.accuracy < MIN_ACCURACY_FOR_PEAK ||
    signal.questionsAnswered < MIN_QUESTIONS_FOR_PEAK
  ) {
    return {
      shouldUpdate: false,
      newHour: currentState.inferredPeakHour,
      newConfidence: currentState.peakHourConfidence,
    }
  }

  // If no peak hour yet, set it directly
  if (currentState.inferredPeakHour === null) {
    return {
      shouldUpdate: true,
      newHour: signal.startHour,
      newConfidence: 0.3, // Low confidence for first observation
    }
  }

  // Calculate weighted average of hours
  // This is a simplified approach - could use circular statistics for better accuracy
  const currentHour = currentState.inferredPeakHour
  const newHour = signal.startHour

  // Handle hour wraparound (23 -> 0)
  let hourDiff = newHour - currentHour
  if (hourDiff > 12) hourDiff -= 24
  if (hourDiff < -12) hourDiff += 24

  const weightedDiff = hourDiff * EMA_ALPHA.session
  let updatedHour = currentHour + weightedDiff

  // Normalize to 0-23
  if (updatedHour < 0) updatedHour += 24
  if (updatedHour >= 24) updatedHour -= 24

  const roundedHour = Math.round(updatedHour) % 24

  // Calculate confidence
  const newConfidence = calculateConfidence(currentState.totalSessionsAnalyzed + 1, 10)

  return {
    shouldUpdate: true,
    newHour: roundedHour,
    newConfidence: Number(newConfidence.toFixed(2)),
  }
}

/**
 * Format hour for display (e.g., "2 PM", "10 AM")
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

/**
 * Get time of day category from hour
 */
export function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export default processSessionSignal
