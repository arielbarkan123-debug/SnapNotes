/**
 * Tests for lib/adaptive/mastery.ts
 *
 * Tests calculateMastery, getMasteryLevel, shouldShowExtraHelp,
 * suggestDifficultyAdjustment, calculateReviewInterval, getMasteryResult
 */

import {
  calculateMastery,
  getMasteryLevel,
  getMasteryLabel,
  getMasteryColor,
  getMasteryBgColor,
  shouldShowExtraHelp,
  suggestDifficultyAdjustment,
  calculateReviewInterval,
  getMasteryResult,
  calculateMasteryFactors,
  type UserPerformance,
  type MasteryLevel,
} from '@/lib/adaptive/mastery'

// =============================================================================
// Helpers
// =============================================================================

function makePerformance(overrides: Partial<UserPerformance> = {}): UserPerformance {
  return {
    attempts: 10,
    correct: 8,
    lastPracticed: new Date().toISOString(),
    recentScores: [0.8, 0.8, 0.8, 0.8],
    responseTimes: [5000, 4500, 4000, 3500],
    ...overrides,
  }
}

// =============================================================================
// getMasteryLevel
// =============================================================================

describe('getMasteryLevel', () => {
  it('should return mastered for score >= 0.8', () => {
    expect(getMasteryLevel(0.8)).toBe('mastered')
    expect(getMasteryLevel(1.0)).toBe('mastered')
  })

  it('should return advanced for score >= 0.6 and < 0.8', () => {
    expect(getMasteryLevel(0.6)).toBe('advanced')
    expect(getMasteryLevel(0.79)).toBe('advanced')
  })

  it('should return intermediate for score >= 0.4 and < 0.6', () => {
    expect(getMasteryLevel(0.4)).toBe('intermediate')
    expect(getMasteryLevel(0.59)).toBe('intermediate')
  })

  it('should return developing for score >= 0.2 and < 0.4', () => {
    expect(getMasteryLevel(0.2)).toBe('developing')
    expect(getMasteryLevel(0.39)).toBe('developing')
  })

  it('should return beginner for score < 0.2', () => {
    expect(getMasteryLevel(0.0)).toBe('beginner')
    expect(getMasteryLevel(0.19)).toBe('beginner')
  })
})

// =============================================================================
// getMasteryLabel
// =============================================================================

describe('getMasteryLabel', () => {
  it('should return correct label for numeric score', () => {
    expect(getMasteryLabel(0.9)).toBe('Mastered')
    expect(getMasteryLabel(0.6)).toBe('Advanced')
    expect(getMasteryLabel(0.4)).toBe('Intermediate')
    expect(getMasteryLabel(0.2)).toBe('Developing')
    expect(getMasteryLabel(0.1)).toBe('Beginner')
  })

  it('should return correct label for MasteryLevel string', () => {
    expect(getMasteryLabel('mastered')).toBe('Mastered')
    expect(getMasteryLabel('advanced')).toBe('Advanced')
    expect(getMasteryLabel('beginner')).toBe('Beginner')
  })
})

// =============================================================================
// getMasteryColor
// =============================================================================

describe('getMasteryColor', () => {
  it('should return emerald for mastered', () => {
    expect(getMasteryColor(0.9)).toBe('text-emerald-500')
    expect(getMasteryColor('mastered')).toBe('text-emerald-500')
  })

  it('should return green for advanced', () => {
    expect(getMasteryColor(0.7)).toBe('text-green-500')
  })

  it('should return red for beginner', () => {
    expect(getMasteryColor(0.1)).toBe('text-red-500')
  })
})

// =============================================================================
// getMasteryBgColor
// =============================================================================

describe('getMasteryBgColor', () => {
  it('should return correct bg color for each level', () => {
    expect(getMasteryBgColor('mastered')).toBe('bg-emerald-500')
    expect(getMasteryBgColor('advanced')).toBe('bg-green-500')
    expect(getMasteryBgColor('intermediate')).toBe('bg-yellow-500')
    expect(getMasteryBgColor('developing')).toBe('bg-orange-500')
    expect(getMasteryBgColor('beginner')).toBe('bg-red-500')
  })
})

// =============================================================================
// calculateMastery
// =============================================================================

describe('calculateMastery', () => {
  it('should return low mastery for zero attempts', () => {
    const performance = makePerformance({
      attempts: 0,
      correct: 0,
      lastPracticed: null,
      recentScores: [],
      responseTimes: [],
    })
    const mastery = calculateMastery(performance)
    // accuracy=0, recency=0, consistency=0.5 (<2 scores default), speed=0.5 (<4 times default)
    // mastery = 0*0.4 + 0*0.2 + 0.5*0.2 + 0.5*0.2 = 0.2
    expect(mastery).toBeCloseTo(0.2, 5)
  })

  it('should weight accuracy at 40%, recency at 20%, consistency at 20%, speed at 20%', () => {
    // Perfect accuracy (1.0), practiced today (1.0), perfect consistency (1.0), improving speed
    const performance = makePerformance({
      attempts: 10,
      correct: 10,
      lastPracticed: new Date().toISOString(),
      recentScores: [1.0, 1.0, 1.0, 1.0],
      responseTimes: [6000, 5000, 4000, 3000],
    })
    const factors = calculateMasteryFactors(performance)
    const mastery = calculateMastery(performance)

    // accuracy = 10/10 = 1.0, recency = 1.0 (today), consistency = high (low variance)
    expect(factors.accuracy).toBe(1.0)
    expect(factors.recency).toBe(1.0)
    // Consistency: all 1.0 => CV = 0/1 = 0, consistency = 1.0
    expect(factors.consistency).toBe(1.0)
    // Speed: earlier [6000,5000], recent [4000,3000]
    // earlierAvg=5500, recentAvg=3500, ratio=5500/3500=1.571, speedScore = min(1, 1.571/2)=0.786
    expect(factors.speed).toBeCloseTo(0.786, 2)

    // mastery = 1.0*0.4 + 1.0*0.2 + 1.0*0.2 + 0.786*0.2
    const expected = 1.0 * 0.4 + 1.0 * 0.2 + 1.0 * 0.2 + factors.speed * 0.2
    expect(mastery).toBeCloseTo(expected, 5)
  })

  it('should clamp mastery between 0 and 1', () => {
    const low = makePerformance({ attempts: 10, correct: 0, lastPracticed: null, recentScores: [], responseTimes: [] })
    expect(calculateMastery(low)).toBeGreaterThanOrEqual(0)
    expect(calculateMastery(low)).toBeLessThanOrEqual(1)
  })

  it('should return lower mastery for old lastPracticed', () => {
    const recent = makePerformance({ lastPracticed: new Date().toISOString() })
    const old = makePerformance({
      lastPracticed: new Date(Date.now() - 30 * 86400000).toISOString(),
    })
    expect(calculateMastery(recent)).toBeGreaterThan(calculateMastery(old))
  })
})

// =============================================================================
// calculateMasteryFactors
// =============================================================================

describe('calculateMasteryFactors', () => {
  it('should return 0.5 consistency for less than 2 recent scores', () => {
    const perf = makePerformance({ recentScores: [0.8] })
    const factors = calculateMasteryFactors(perf)
    expect(factors.consistency).toBe(0.5)
  })

  it('should return 0.5 speed for less than 4 response times', () => {
    const perf = makePerformance({ responseTimes: [3000, 2000] })
    const factors = calculateMasteryFactors(perf)
    expect(factors.speed).toBe(0.5)
  })

  it('should return higher speed for improving response times', () => {
    const improving = makePerformance({
      responseTimes: [8000, 7000, 4000, 3000],
    })
    const declining = makePerformance({
      responseTimes: [3000, 4000, 7000, 8000],
    })
    const factorsImproving = calculateMasteryFactors(improving)
    const factorsDeclining = calculateMasteryFactors(declining)
    expect(factorsImproving.speed).toBeGreaterThan(factorsDeclining.speed)
  })

  it('should return 0 consistency when mean of recent scores is 0', () => {
    const perf = makePerformance({ recentScores: [0, 0, 0, 0] })
    const factors = calculateMasteryFactors(perf)
    expect(factors.consistency).toBe(0)
  })
})

// =============================================================================
// shouldShowExtraHelp
// =============================================================================

describe('shouldShowExtraHelp', () => {
  it('should return false for < 2 attempts', () => {
    const perf = makePerformance({ attempts: 1, correct: 0 })
    expect(shouldShowExtraHelp(perf)).toBe(false)
  })

  it('should return false for exactly 2 attempts even if mastery is low', () => {
    // shouldShowExtraHelp requires attempts > 2 (strictly greater)
    const perf = makePerformance({
      attempts: 2,
      correct: 0,
      lastPracticed: null,
      recentScores: [],
      responseTimes: [],
    })
    expect(shouldShowExtraHelp(perf)).toBe(false)
  })

  it('should return true for low mastery with enough attempts', () => {
    const perf = makePerformance({
      attempts: 10,
      correct: 0,
      lastPracticed: null,
      recentScores: [0, 0, 0, 0],
      responseTimes: [5000, 5000, 5000, 5000],
    })
    // accuracy=0, recency=0, consistency=0 (mean is 0), speed=0.5 (same speed)
    // mastery = 0*0.4 + 0*0.2 + 0*0.2 + 0.5*0.2 = 0.1 < 0.3
    expect(shouldShowExtraHelp(perf)).toBe(true)
  })

  it('should return false for high mastery', () => {
    const perf = makePerformance({
      attempts: 10,
      correct: 9,
      lastPracticed: new Date().toISOString(),
      recentScores: [0.9, 0.9, 0.9],
      responseTimes: [3000, 2800, 2500, 2200],
    })
    expect(shouldShowExtraHelp(perf)).toBe(false)
  })
})

// =============================================================================
// suggestDifficultyAdjustment
// =============================================================================

describe('suggestDifficultyAdjustment', () => {
  it('should return 0 for < 3 attempts', () => {
    const perf = makePerformance({ attempts: 2, correct: 2 })
    expect(suggestDifficultyAdjustment(perf)).toBe(0)
  })

  it('should return 1 (harder) for high mastery and high accuracy', () => {
    const perf = makePerformance({
      attempts: 10,
      correct: 10,
      lastPracticed: new Date().toISOString(),
      recentScores: [1.0, 1.0, 1.0, 1.0],
      responseTimes: [5000, 4000, 3000, 2000],
    })
    expect(suggestDifficultyAdjustment(perf)).toBe(1)
  })

  it('should return -1 (easier) for low accuracy', () => {
    const perf = makePerformance({
      attempts: 10,
      correct: 2,
      lastPracticed: null,
      recentScores: [0.2, 0.1],
      responseTimes: [],
    })
    expect(suggestDifficultyAdjustment(perf)).toBe(-1)
  })

  it('should return 0 for moderate performance', () => {
    const perf = makePerformance({
      attempts: 10,
      correct: 6,
      lastPracticed: new Date().toISOString(),
      recentScores: [0.6, 0.6, 0.6, 0.6],
      responseTimes: [4000, 4000, 4000, 4000],
    })
    expect(suggestDifficultyAdjustment(perf)).toBe(0)
  })
})

// =============================================================================
// calculateReviewInterval
// =============================================================================

describe('calculateReviewInterval', () => {
  it('should return 2.5x interval for mastery >= 0.9', () => {
    expect(calculateReviewInterval(0.95, 4)).toBe(10) // round(4 * 2.5) = 10
  })

  it('should return 2x interval for mastery >= 0.7', () => {
    expect(calculateReviewInterval(0.75, 4)).toBe(8) // round(4 * 2.0) = 8
  })

  it('should return 1.5x interval for mastery >= 0.5', () => {
    expect(calculateReviewInterval(0.55, 4)).toBe(6) // round(4 * 1.5) = 6
  })

  it('should return same interval for mastery >= 0.3', () => {
    expect(calculateReviewInterval(0.35, 4)).toBe(4) // round(4 * 1.0) = 4
  })

  it('should return halved interval for mastery < 0.3', () => {
    expect(calculateReviewInterval(0.1, 4)).toBe(2) // round(4 * 0.5) = 2
  })

  it('should cap at 30 days', () => {
    expect(calculateReviewInterval(0.95, 20)).toBe(30) // round(20 * 2.5) = 50, capped at 30
  })

  it('should use minimum of 1 day', () => {
    expect(calculateReviewInterval(0.1, 1)).toBe(1) // round(1 * 0.5) = 1 (max(1, 1))
  })

  it('should default previousInterval to 1', () => {
    expect(calculateReviewInterval(0.95)).toBe(3) // round(1 * 2.5) = 3
  })
})

// =============================================================================
// getMasteryResult
// =============================================================================

describe('getMasteryResult', () => {
  it('should return complete result with all fields', () => {
    const perf = makePerformance({
      attempts: 10,
      correct: 9,
      lastPracticed: new Date().toISOString(),
      recentScores: [0.9, 0.9, 0.9, 0.9],
      responseTimes: [5000, 4000, 3000, 2000],
    })
    const result = getMasteryResult(perf)

    expect(typeof result.score).toBe('number')
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(['beginner', 'developing', 'intermediate', 'advanced', 'mastered']).toContain(result.level)
    expect(typeof result.label).toBe('string')
    expect(typeof result.color).toBe('string')
    expect(result.factors).toHaveProperty('accuracy')
    expect(result.factors).toHaveProperty('recency')
    expect(result.factors).toHaveProperty('consistency')
    expect(result.factors).toHaveProperty('speed')
  })

  it('should have consistent score and level', () => {
    const perf = makePerformance({
      attempts: 10,
      correct: 10,
      lastPracticed: new Date().toISOString(),
      recentScores: [1, 1, 1, 1],
      responseTimes: [5000, 4000, 3000, 2000],
    })
    const result = getMasteryResult(perf)
    expect(result.level).toBe(getMasteryLevel(result.score))
  })
})
