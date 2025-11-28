/**
 * Adaptive Learning - Mastery Calculation
 *
 * Calculates user mastery levels based on performance metrics
 * to enable adaptive difficulty and personalized learning paths.
 */

// ============================================
// TYPES
// ============================================

export interface UserPerformance {
  /** Total number of questions attempted */
  attempts: number
  /** Number of correct answers */
  correct: number
  /** Timestamp of last practice session (ISO string) */
  lastPracticed: string | null
  /** Array of recent scores (0-1) for consistency calculation */
  recentScores: number[]
  /** Array of response times in ms for speed calculation */
  responseTimes: number[]
}

export type MasteryLevel = 'beginner' | 'developing' | 'intermediate' | 'advanced' | 'mastered'

export interface MasteryResult {
  score: number
  level: MasteryLevel
  label: string
  color: string
  factors: {
    accuracy: number
    recency: number
    consistency: number
    speed: number
  }
}

// ============================================
// WEIGHTS
// ============================================

const WEIGHTS = {
  accuracy: 0.4,    // 40% - most important factor
  recency: 0.2,     // 20% - recent practice matters
  consistency: 0.2, // 20% - stable performance
  speed: 0.2,       // 20% - improvement over time
}

// ============================================
// MASTERY CALCULATION
// ============================================

/**
 * Calculate overall mastery score from user performance
 *
 * @param performance - User's performance data
 * @returns Mastery score from 0 to 1
 */
export function calculateMastery(performance: UserPerformance): number {
  const factors = calculateMasteryFactors(performance)

  const score =
    factors.accuracy * WEIGHTS.accuracy +
    factors.recency * WEIGHTS.recency +
    factors.consistency * WEIGHTS.consistency +
    factors.speed * WEIGHTS.speed

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, score))
}

/**
 * Calculate individual mastery factors
 */
export function calculateMasteryFactors(performance: UserPerformance): MasteryResult['factors'] {
  return {
    accuracy: calculateAccuracy(performance),
    recency: calculateRecency(performance),
    consistency: calculateConsistency(performance),
    speed: calculateSpeed(performance),
  }
}

/**
 * Get complete mastery result with all details
 */
export function getMasteryResult(performance: UserPerformance): MasteryResult {
  const score = calculateMastery(performance)
  const level = getMasteryLevel(score)
  const label = getMasteryLabel(score)
  const color = getMasteryColor(score)
  const factors = calculateMasteryFactors(performance)

  return { score, level, label, color, factors }
}

// ============================================
// FACTOR CALCULATIONS
// ============================================

/**
 * Calculate accuracy factor (0-1)
 * Simple ratio of correct answers to attempts
 */
function calculateAccuracy(performance: UserPerformance): number {
  if (performance.attempts === 0) return 0
  return performance.correct / performance.attempts
}

/**
 * Calculate recency factor (0-1)
 * Higher score for more recent practice
 *
 * Decay curve:
 * - Same day: 1.0
 * - 1 day ago: 0.9
 * - 3 days ago: 0.7
 * - 7 days ago: 0.5
 * - 14 days ago: 0.3
 * - 30+ days ago: 0.1
 */
function calculateRecency(performance: UserPerformance): number {
  if (!performance.lastPracticed) return 0

  const lastPracticed = new Date(performance.lastPracticed)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSince === 0) return 1.0
  if (daysSince === 1) return 0.9
  if (daysSince <= 3) return 0.7
  if (daysSince <= 7) return 0.5
  if (daysSince <= 14) return 0.3
  if (daysSince <= 30) return 0.1
  return 0.05
}

/**
 * Calculate consistency factor (0-1)
 * Lower variance in recent scores = higher consistency
 *
 * Uses coefficient of variation (standard deviation / mean)
 */
function calculateConsistency(performance: UserPerformance): number {
  const scores = performance.recentScores

  if (scores.length < 2) {
    // Not enough data, assume moderate consistency
    return 0.5
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length

  if (mean === 0) return 0

  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = stdDev / mean

  // Convert to 0-1 where lower variation = higher score
  // CV of 0 = perfect consistency (1.0)
  // CV of 0.5 = moderate consistency (0.5)
  // CV of 1.0+ = poor consistency (0.0)
  return Math.max(0, 1 - coefficientOfVariation)
}

/**
 * Calculate speed factor (0-1)
 * Measures improvement in response time
 *
 * Compares average of recent responses to earlier responses
 */
function calculateSpeed(performance: UserPerformance): number {
  const times = performance.responseTimes

  if (times.length < 4) {
    // Not enough data, assume moderate speed
    return 0.5
  }

  const midpoint = Math.floor(times.length / 2)
  const earlierTimes = times.slice(0, midpoint)
  const recentTimes = times.slice(midpoint)

  const earlierAvg = earlierTimes.reduce((a, b) => a + b, 0) / earlierTimes.length
  const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length

  if (earlierAvg === 0) return 0.5

  // Calculate improvement ratio
  // If recent is faster (lower), ratio > 1
  const improvementRatio = earlierAvg / recentAvg

  // Convert to 0-1 score
  // ratio of 0.5 (got slower) = 0.25
  // ratio of 1.0 (same speed) = 0.5
  // ratio of 2.0 (twice as fast) = 1.0
  const speedScore = Math.min(1, improvementRatio / 2)

  return Math.max(0, speedScore)
}

// ============================================
// MASTERY LEVELS & LABELS
// ============================================

/**
 * Get mastery level from score
 */
export function getMasteryLevel(score: number): MasteryLevel {
  if (score >= 0.8) return 'mastered'
  if (score >= 0.6) return 'advanced'
  if (score >= 0.4) return 'intermediate'
  if (score >= 0.2) return 'developing'
  return 'beginner'
}

/**
 * Get human-readable mastery label
 *
 * @param level - Mastery score (0-1) or MasteryLevel string
 * @returns Human-readable label
 */
export function getMasteryLabel(level: number | MasteryLevel): string {
  const masteryLevel = typeof level === 'number' ? getMasteryLevel(level) : level

  switch (masteryLevel) {
    case 'mastered':
      return 'Mastered'
    case 'advanced':
      return 'Advanced'
    case 'intermediate':
      return 'Intermediate'
    case 'developing':
      return 'Developing'
    case 'beginner':
    default:
      return 'Beginner'
  }
}

/**
 * Get Tailwind color class for mastery level
 *
 * @param level - Mastery score (0-1) or MasteryLevel string
 * @returns Tailwind color class (text color)
 */
export function getMasteryColor(level: number | MasteryLevel): string {
  const masteryLevel = typeof level === 'number' ? getMasteryLevel(level) : level

  switch (masteryLevel) {
    case 'mastered':
      return 'text-emerald-500'
    case 'advanced':
      return 'text-green-500'
    case 'intermediate':
      return 'text-yellow-500'
    case 'developing':
      return 'text-orange-500'
    case 'beginner':
    default:
      return 'text-red-500'
  }
}

/**
 * Get Tailwind background color class for mastery level
 */
export function getMasteryBgColor(level: number | MasteryLevel): string {
  const masteryLevel = typeof level === 'number' ? getMasteryLevel(level) : level

  switch (masteryLevel) {
    case 'mastered':
      return 'bg-emerald-500'
    case 'advanced':
      return 'bg-green-500'
    case 'intermediate':
      return 'bg-yellow-500'
    case 'developing':
      return 'bg-orange-500'
    case 'beginner':
    default:
      return 'bg-red-500'
  }
}

// ============================================
// ADAPTIVE HELPERS
// ============================================

/**
 * Determine if user needs extra help
 * Returns true if struggling (low mastery with some attempts)
 *
 * @param performance - User's performance data
 * @returns True if extra help should be shown
 */
export function shouldShowExtraHelp(performance: UserPerformance): boolean {
  if (performance.attempts < 2) {
    // Not enough data yet
    return false
  }

  const mastery = calculateMastery(performance)
  return mastery < 0.3 && performance.attempts > 2
}

/**
 * Determine suggested difficulty adjustment
 *
 * @param performance - User's performance data
 * @returns -1 (easier), 0 (same), or 1 (harder)
 */
export function suggestDifficultyAdjustment(performance: UserPerformance): -1 | 0 | 1 {
  if (performance.attempts < 3) {
    return 0 // Not enough data
  }

  const mastery = calculateMastery(performance)
  const accuracy = performance.correct / performance.attempts

  // If mastery is very high, increase difficulty
  if (mastery >= 0.8 && accuracy >= 0.9) {
    return 1
  }

  // If struggling, decrease difficulty
  if (mastery < 0.3 || accuracy < 0.4) {
    return -1
  }

  return 0
}

/**
 * Calculate recommended review interval in days
 * Based on spaced repetition principles
 *
 * @param mastery - Current mastery score (0-1)
 * @param previousInterval - Previous review interval in days
 * @returns Recommended days until next review
 */
export function calculateReviewInterval(mastery: number, previousInterval: number = 1): number {
  // Base multiplier based on mastery
  let multiplier: number

  if (mastery >= 0.9) {
    multiplier = 2.5 // Strong memory, longer interval
  } else if (mastery >= 0.7) {
    multiplier = 2.0
  } else if (mastery >= 0.5) {
    multiplier = 1.5
  } else if (mastery >= 0.3) {
    multiplier = 1.0 // Same interval
  } else {
    multiplier = 0.5 // Needs more practice, shorter interval
  }

  const newInterval = Math.max(1, Math.round(previousInterval * multiplier))

  // Cap at 30 days for now
  return Math.min(30, newInterval)
}

/**
 * Get encouragement message based on performance
 */
export function getEncouragementMessage(performance: UserPerformance): string {
  const mastery = calculateMastery(performance)
  const level = getMasteryLevel(mastery)
  const accuracy = performance.attempts > 0 ? performance.correct / performance.attempts : 0

  // First few attempts
  if (performance.attempts <= 2) {
    return "Great start! Keep practicing to build mastery."
  }

  switch (level) {
    case 'mastered':
      return "Excellent! You've mastered this topic!"
    case 'advanced':
      return "Great progress! You're almost there!"
    case 'intermediate':
      return "Good job! Keep practicing to improve."
    case 'developing':
      if (accuracy < 0.5) {
        return "Take your time. Review the explanations carefully."
      }
      return "You're making progress! Practice makes perfect."
    case 'beginner':
    default:
      if (performance.attempts > 5) {
        return "Don't give up! Try reviewing the lesson material."
      }
      return "Everyone starts somewhere. Keep at it!"
  }
}
