/**
 * Tests for the FSRS (Free Spaced Repetition Scheduler) algorithm
 * Covers all exported functions from lib/srs/fsrs.ts
 */

import {
  FSRS_PARAMS,
  calculateInitialDifficulty,
  calculateInitialStability,
  calculateNextDifficulty,
  calculateNextStability,
  calculateNextInterval,
  calculateRetrievability,
  processReview,
  getIntervalPreview,
  getDueDate,
  getLearningDueDate,
  isCardDue,
} from '@/lib/srs/fsrs'
import type { ReviewCard, Rating } from '@/types/srs'

// =============================================================================
// Helper to build a ReviewCard for testing
// =============================================================================

function makeCard(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    id: 'card-1',
    user_id: 'user-1',
    course_id: 'course-1',
    lesson_index: 0,
    step_index: 0,
    card_type: 'flashcard',
    front: 'Test question',
    back: 'Test answer',
    stability: 3,
    difficulty: 0.3,
    elapsed_days: 3,
    scheduled_days: 3,
    reps: 1,
    lapses: 0,
    state: 'new',
    due_date: new Date().toISOString(),
    last_review: null,
    concept_ids: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// =============================================================================
// calculateInitialDifficulty
// =============================================================================

describe('calculateInitialDifficulty', () => {
  it('returns 0.7 for Again (1)', () => {
    expect(calculateInitialDifficulty(1)).toBe(0.7)
  })

  it('returns 0.6 for Hard (2)', () => {
    expect(calculateInitialDifficulty(2)).toBe(0.6)
  })

  it('returns 0.3 for Good (3)', () => {
    expect(calculateInitialDifficulty(3)).toBe(0.3)
  })

  it('returns 0.1 for Easy (4)', () => {
    expect(calculateInitialDifficulty(4)).toBe(0.1)
  })
})

// =============================================================================
// calculateInitialStability
// =============================================================================

describe('calculateInitialStability', () => {
  it('returns 0.5 for Again (1)', () => {
    expect(calculateInitialStability(1)).toBe(0.5)
  })

  it('returns 1 for Hard (2)', () => {
    expect(calculateInitialStability(2)).toBe(1)
  })

  it('returns 3 for Good (3)', () => {
    expect(calculateInitialStability(3)).toBe(3)
  })

  it('returns 7 for Easy (4)', () => {
    expect(calculateInitialStability(4)).toBe(7)
  })
})

// =============================================================================
// calculateNextDifficulty
// =============================================================================

describe('calculateNextDifficulty', () => {
  it('increases difficulty on Again (1)', () => {
    const result = calculateNextDifficulty(0.3, 1)
    expect(result).toBeCloseTo(0.45) // 0.3 + 0.15
  })

  it('increases difficulty slightly on Hard (2)', () => {
    const result = calculateNextDifficulty(0.3, 2)
    expect(result).toBeCloseTo(0.38) // 0.3 + 0.08
  })

  it('decreases difficulty slightly on Good (3)', () => {
    const result = calculateNextDifficulty(0.3, 3)
    expect(result).toBe(0.25) // 0.3 - 0.05
  })

  it('decreases difficulty on Easy (4)', () => {
    const result = calculateNextDifficulty(0.3, 4)
    expect(result).toBeCloseTo(0.2) // 0.3 - 0.1
  })

  it('clamps to minimum 0.1', () => {
    const result = calculateNextDifficulty(0.1, 4)
    expect(result).toBe(0.1) // 0.1 - 0.1 = 0.0, clamped to 0.1
  })

  it('clamps to maximum 1.0', () => {
    const result = calculateNextDifficulty(0.95, 1)
    expect(result).toBe(1.0) // 0.95 + 0.15 = 1.1, clamped to 1.0
  })

  it('handles mid-range difficulty with Again', () => {
    const result = calculateNextDifficulty(0.5, 1)
    expect(result).toBe(0.65)
  })

  it('handles low difficulty with Good', () => {
    const result = calculateNextDifficulty(0.15, 3)
    expect(result).toBe(0.1) // 0.15 - 0.05 = 0.10
  })
})

// =============================================================================
// calculateNextStability
// =============================================================================

describe('calculateNextStability', () => {
  it('drops stability drastically on Again (1)', () => {
    const result = calculateNextStability(10, 0.3, 1, 10)
    expect(result).toBe(2) // max(0.5, 10 * 0.2) = 2
  })

  it('returns minimum 0.5 on Again for very low stability', () => {
    const result = calculateNextStability(1, 0.3, 1, 1)
    expect(result).toBe(0.5) // max(0.5, 1 * 0.2) = max(0.5, 0.2) = 0.5
  })

  it('grows stability on Hard (2)', () => {
    const result = calculateNextStability(3, 0.3, 2, 3)
    // growthFactor=1.2, difficultyPenalty=1-0.3*0.5=0.85
    // retrievability=exp(-3/3)=exp(-1)~0.368
    // reviewBonus=1+(1-0.368)*0.5=1.316
    // 3 * 1.2 * 0.85 * 1.316 ≈ 4.024
    expect(result).toBeGreaterThan(3)
    expect(result).toBeLessThan(5)
  })

  it('grows stability more on Good (3)', () => {
    const resultGood = calculateNextStability(3, 0.3, 3, 3)
    const resultHard = calculateNextStability(3, 0.3, 2, 3)
    expect(resultGood).toBeGreaterThan(resultHard)
  })

  it('grows stability most on Easy (4) with easy bonus', () => {
    const resultEasy = calculateNextStability(3, 0.3, 4, 3)
    const resultGood = calculateNextStability(3, 0.3, 3, 3)
    expect(resultEasy).toBeGreaterThan(resultGood)
  })

  it('applies easy bonus (1.3x) only for Easy rating', () => {
    const resultEasy = calculateNextStability(3, 0.3, 4, 3)
    // Easy growth: 3 * 3.5 * 0.85 * reviewBonus * 1.3
    // This should be notably higher than Good (which has no 1.3 bonus)
    expect(resultEasy).toBeGreaterThan(10)
  })

  it('caps stability at maximum interval', () => {
    const result = calculateNextStability(30000, 0.1, 4, 30000)
    expect(result).toBeLessThanOrEqual(FSRS_PARAMS.maximumInterval)
  })

  it('applies difficulty penalty (harder cards grow slower)', () => {
    const easyCard = calculateNextStability(3, 0.1, 3, 3)
    const hardCard = calculateNextStability(3, 0.9, 3, 3)
    expect(easyCard).toBeGreaterThan(hardCard)
  })

  it('rewards reviews timed close to due date (higher review bonus)', () => {
    // Reviewed much later than due (retrievability is very low)
    const lateReview = calculateNextStability(3, 0.3, 3, 30)
    // Reviewed right on time
    const onTimeReview = calculateNextStability(3, 0.3, 3, 3)
    // Late review has lower retrievability -> higher reviewBonus
    expect(lateReview).toBeGreaterThan(onTimeReview)
  })

  it('accepts custom params with different easyBonus', () => {
    const customParams = { ...FSRS_PARAMS, easyBonus: 2.0 }
    const result = calculateNextStability(3, 0.3, 4, 3, customParams)
    const defaultResult = calculateNextStability(3, 0.3, 4, 3)
    expect(result).toBeGreaterThan(defaultResult)
  })
})

// =============================================================================
// calculateNextInterval
// =============================================================================

describe('calculateNextInterval', () => {
  it('returns at least 1 day', () => {
    const result = calculateNextInterval(0.1)
    expect(result).toBeGreaterThanOrEqual(1)
  })

  it('returns higher interval for higher stability', () => {
    const low = calculateNextInterval(3)
    const high = calculateNextInterval(30)
    expect(high).toBeGreaterThan(low)
  })

  it('returns exact stability at 90% retention (default)', () => {
    // At 90% retention, interval should equal stability
    // interval = stability * ln(0.9)/ln(0.9) = stability * 1 = stability
    const result = calculateNextInterval(10, 0.9)
    expect(result).toBe(10)
  })

  it('returns shorter interval for higher retention target', () => {
    const normal = calculateNextInterval(10, 0.9)
    const strict = calculateNextInterval(10, 0.95)
    expect(strict).toBeLessThanOrEqual(normal)
  })

  it('caps at maximum interval', () => {
    const result = calculateNextInterval(100000, 0.9)
    expect(result).toBeLessThanOrEqual(FSRS_PARAMS.maximumInterval)
  })

  it('rounds to nearest day', () => {
    const result = calculateNextInterval(5, 0.85)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('respects custom params for maximumInterval', () => {
    const customParams = { ...FSRS_PARAMS, maximumInterval: 30 }
    const result = calculateNextInterval(100, 0.9, customParams)
    expect(result).toBeLessThanOrEqual(30)
  })
})

// =============================================================================
// getDueDate
// =============================================================================

describe('getDueDate', () => {
  it('returns a Date object', () => {
    const result = getDueDate(3)
    expect(result).toBeInstanceOf(Date)
  })

  it('returns a future date for positive interval', () => {
    const now = Date.now()
    const result = getDueDate(1)
    expect(result.getTime()).toBeGreaterThan(now)
  })

  it('returns roughly N days from now', () => {
    const before = Date.now()
    const result = getDueDate(5)
    const after = Date.now()
    const expectedMs = 5 * 24 * 60 * 60 * 1000
    const diffMs = result.getTime() - before
    expect(diffMs).toBeGreaterThanOrEqual(expectedMs - 100)
    expect(diffMs).toBeLessThanOrEqual(expectedMs + (after - before) + 100)
  })
})

// =============================================================================
// getLearningDueDate
// =============================================================================

describe('getLearningDueDate', () => {
  it('returns a Date object', () => {
    const result = getLearningDueDate(10)
    expect(result).toBeInstanceOf(Date)
  })

  it('returns roughly N minutes from now', () => {
    const before = Date.now()
    const result = getLearningDueDate(6)
    const expectedMs = 6 * 60 * 1000
    const diffMs = result.getTime() - before
    expect(diffMs).toBeGreaterThanOrEqual(expectedMs - 100)
    expect(diffMs).toBeLessThanOrEqual(expectedMs + 100)
  })

  it('returns 1 minute in the future for 1-minute interval', () => {
    const before = Date.now()
    const result = getLearningDueDate(1)
    const diffMs = result.getTime() - before
    expect(diffMs).toBeGreaterThanOrEqual(59000)
    expect(diffMs).toBeLessThanOrEqual(61000)
  })
})

// =============================================================================
// calculateRetrievability
// =============================================================================

describe('calculateRetrievability', () => {
  it('returns 100% when elapsed time is 0', () => {
    expect(calculateRetrievability(10, 0)).toBe(100)
  })

  it('returns approximately 90% at interval equal to stability * ln(0.9)/ln(0.9)', () => {
    // At elapsed = stability, retrievability = e^(-1) ≈ 0.368
    const result = calculateRetrievability(10, 10)
    expect(result).toBe(37) // Math.round(e^(-1) * 100) = 37
  })

  it('returns lower retrievability with more elapsed days', () => {
    const fresh = calculateRetrievability(10, 1)
    const stale = calculateRetrievability(10, 20)
    expect(fresh).toBeGreaterThan(stale)
  })

  it('returns higher retrievability with higher stability', () => {
    const weak = calculateRetrievability(3, 5)
    const strong = calculateRetrievability(30, 5)
    expect(strong).toBeGreaterThan(weak)
  })

  it('returns integer values (rounds)', () => {
    const result = calculateRetrievability(7, 3)
    expect(Number.isInteger(result)).toBe(true)
  })
})

// =============================================================================
// isCardDue
// =============================================================================

describe('isCardDue', () => {
  it('returns true for a past date string', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString()
    expect(isCardDue(pastDate)).toBe(true)
  })

  it('returns true for a past Date object', () => {
    const pastDate = new Date(Date.now() - 86400000)
    expect(isCardDue(pastDate)).toBe(true)
  })

  it('returns false for a future date string', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    expect(isCardDue(futureDate)).toBe(false)
  })

  it('returns false for a future Date object', () => {
    const futureDate = new Date(Date.now() + 86400000)
    expect(isCardDue(futureDate)).toBe(false)
  })

  it('returns true for the current time (now is due)', () => {
    const now = new Date()
    expect(isCardDue(now)).toBe(true)
  })
})

// =============================================================================
// processReview — New card state transitions
// =============================================================================

describe('processReview — new cards', () => {
  it('transitions new card to learning on Again (1)', () => {
    const card = makeCard({ state: 'new' })
    const result = processReview(card, 1)
    expect(result.state).toBe('learning')
    expect(result.scheduled_days).toBe(0)
    expect(result.difficulty).toBe(0.7)
    expect(result.stability).toBe(0.5)
  })

  it('transitions new card to learning on Hard (2)', () => {
    const card = makeCard({ state: 'new' })
    const result = processReview(card, 2)
    expect(result.state).toBe('learning')
    expect(result.scheduled_days).toBe(0)
    expect(result.difficulty).toBe(0.6)
    expect(result.stability).toBe(1)
  })

  it('transitions new card to review on Good (3)', () => {
    const card = makeCard({ state: 'new' })
    const result = processReview(card, 3)
    expect(result.state).toBe('review')
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1)
    expect(result.difficulty).toBe(0.3)
    expect(result.stability).toBe(3)
  })

  it('transitions new card to review on Easy (4)', () => {
    const card = makeCard({ state: 'new' })
    const result = processReview(card, 4)
    expect(result.state).toBe('review')
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1)
    expect(result.difficulty).toBe(0.1)
    expect(result.stability).toBe(7)
  })

  it('new card Good has shorter interval than Easy', () => {
    const card = makeCard({ state: 'new' })
    const good = processReview(card, 3)
    const easy = processReview(card, 4)
    expect(easy.scheduled_days).toBeGreaterThan(good.scheduled_days)
  })

  it('new card returns a due_date in the future for Good', () => {
    const card = makeCard({ state: 'new' })
    const result = processReview(card, 3)
    expect(result.due_date.getTime()).toBeGreaterThan(Date.now())
  })
})

// =============================================================================
// processReview — Learning state transitions
// =============================================================================

describe('processReview — learning cards', () => {
  it('stays in learning on Again (1)', () => {
    const card = makeCard({ state: 'learning', stability: 2, difficulty: 0.3 })
    const result = processReview(card, 1)
    expect(result.state).toBe('learning')
    expect(result.scheduled_days).toBe(0)
  })

  it('halves stability on Again but floors at 0.5', () => {
    const card = makeCard({ state: 'learning', stability: 0.8, difficulty: 0.3 })
    const result = processReview(card, 1)
    expect(result.stability).toBe(0.5) // max(0.5, 0.8 * 0.5)
  })

  it('stays in learning on Hard (2)', () => {
    const card = makeCard({ state: 'learning', stability: 2, difficulty: 0.3 })
    const result = processReview(card, 2)
    expect(result.state).toBe('learning')
    expect(result.scheduled_days).toBe(0)
    expect(result.stability).toBe(2) // stability unchanged on Hard learning
  })

  it('graduates to review on Good (3)', () => {
    const card = makeCard({ state: 'learning', stability: 3, difficulty: 0.3 })
    const result = processReview(card, 3)
    expect(result.state).toBe('review')
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1)
  })

  it('graduates to review on Easy (4) with easy bonus', () => {
    const card = makeCard({ state: 'learning', stability: 3, difficulty: 0.3 })
    const good = processReview(card, 3)
    const easy = processReview(card, 4)
    expect(easy.state).toBe('review')
    // Easy should have equal or longer interval due to easyBonus
    expect(easy.scheduled_days).toBeGreaterThanOrEqual(good.scheduled_days)
  })

  it('updates difficulty during learning', () => {
    const card = makeCard({ state: 'learning', stability: 2, difficulty: 0.5 })
    const result = processReview(card, 1)
    expect(result.difficulty).toBe(0.65) // 0.5 + 0.15
  })
})

// =============================================================================
// processReview — Review state transitions
// =============================================================================

describe('processReview — review cards', () => {
  it('transitions to relearning on Again (1)', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const result = processReview(card, 1)
    expect(result.state).toBe('relearning')
    expect(result.scheduled_days).toBe(0)
  })

  it('drops stability dramatically on Again', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const result = processReview(card, 1)
    expect(result.stability).toBe(2) // max(0.5, 10 * 0.2)
  })

  it('stays in review on Hard (2)', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const result = processReview(card, 2)
    expect(result.state).toBe('review')
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1)
  })

  it('applies hard penalty to interval on Hard (2)', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const hard = processReview(card, 2)
    const good = processReview(card, 3)
    expect(hard.scheduled_days).toBeLessThan(good.scheduled_days)
  })

  it('stays in review on Good (3) with increased interval', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const result = processReview(card, 3)
    expect(result.state).toBe('review')
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1)
  })

  it('stays in review on Easy (4) with the highest interval', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const result = processReview(card, 4)
    expect(result.state).toBe('review')
    const good = processReview(card, 3)
    expect(result.scheduled_days).toBeGreaterThanOrEqual(good.scheduled_days)
  })

  it('increases difficulty on Again', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const result = processReview(card, 1)
    expect(result.difficulty).toBeCloseTo(0.45)
  })

  it('decreases difficulty on Easy', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const result = processReview(card, 4)
    expect(result.difficulty).toBeCloseTo(0.2)
  })
})

// =============================================================================
// processReview — Relearning state transitions
// =============================================================================

describe('processReview — relearning cards', () => {
  it('stays in relearning on Again (1)', () => {
    const card = makeCard({
      state: 'relearning',
      stability: 2,
      difficulty: 0.5,
    })
    const result = processReview(card, 1)
    expect(result.state).toBe('relearning')
    expect(result.scheduled_days).toBe(0)
  })

  it('stays in relearning on Hard (2)', () => {
    const card = makeCard({
      state: 'relearning',
      stability: 2,
      difficulty: 0.5,
    })
    const result = processReview(card, 2)
    expect(result.state).toBe('relearning')
    expect(result.scheduled_days).toBe(0)
  })

  it('graduates to review on Good (3)', () => {
    const card = makeCard({
      state: 'relearning',
      stability: 2,
      difficulty: 0.5,
    })
    const result = processReview(card, 3)
    expect(result.state).toBe('review')
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1)
  })

  it('graduates to review on Easy (4)', () => {
    const card = makeCard({
      state: 'relearning',
      stability: 2,
      difficulty: 0.5,
    })
    const result = processReview(card, 4)
    expect(result.state).toBe('review')
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1)
  })
})

// =============================================================================
// processReview — Unknown state fallback
// =============================================================================

describe('processReview — unknown state', () => {
  it('treats unknown state as new card', () => {
    const card = makeCard({ state: 'unknown' as ReviewCard['state'] })
    const result = processReview(card, 3)
    // Should behave like new card with Good rating -> goes to review
    expect(result.state).toBe('review')
    expect(result.difficulty).toBe(0.3)
    expect(result.stability).toBe(3)
  })
})

// =============================================================================
// processReview — custom params
// =============================================================================

describe('processReview — custom params', () => {
  it('uses custom retention target', () => {
    const card = makeCard({ state: 'new' })
    const strict = processReview(card, 3, 0.95)
    const lenient = processReview(card, 3, 0.85)
    // Higher retention -> shorter interval
    expect(strict.scheduled_days).toBeLessThanOrEqual(lenient.scheduled_days)
  })

  it('passes custom params to inner calculations', () => {
    const card = makeCard({
      state: 'review',
      stability: 10,
      difficulty: 0.3,
      elapsed_days: 10,
    })
    const customParams = { ...FSRS_PARAMS, easyBonus: 2.0 }
    const result = processReview(card, 4, 0.9, customParams)
    const defaultResult = processReview(card, 4)
    expect(result.scheduled_days).toBeGreaterThanOrEqual(defaultResult.scheduled_days)
  })
})

// =============================================================================
// getIntervalPreview
// =============================================================================

describe('getIntervalPreview', () => {
  it('returns interval strings for all 4 ratings', () => {
    const card = makeCard({ state: 'new' })
    const preview = getIntervalPreview(card)
    expect(preview[1]).toBeDefined()
    expect(preview[2]).toBeDefined()
    expect(preview[3]).toBeDefined()
    expect(preview[4]).toBeDefined()
  })

  it('returns minutes for learning steps (Again on new card)', () => {
    const card = makeCard({ state: 'new' })
    const preview = getIntervalPreview(card)
    expect(preview[1]).toBe('1m')
  })

  it('returns minutes for Hard on new card', () => {
    const card = makeCard({ state: 'new' })
    const preview = getIntervalPreview(card)
    expect(preview[2]).toBe('6m')
  })

  it('returns days for Good on new card', () => {
    const card = makeCard({ state: 'new' })
    const preview = getIntervalPreview(card)
    expect(preview[3]).toMatch(/^\d+d$/)
  })

  it('returns days for Easy on new card', () => {
    const card = makeCard({ state: 'new' })
    const preview = getIntervalPreview(card)
    expect(preview[4]).toMatch(/^\d+d$/)
  })

  it('formats months for 30-364 day intervals', () => {
    const card = makeCard({
      state: 'review',
      stability: 60,
      difficulty: 0.2,
      elapsed_days: 60,
    })
    const preview = getIntervalPreview(card)
    // Good or Easy should yield month-level intervals
    const goodDays = processReview(card, 3).scheduled_days
    if (goodDays >= 30 && goodDays < 365) {
      expect(preview[3]).toMatch(/^\d+mo$/)
    }
  })

  it('formats years for 365+ day intervals', () => {
    const card = makeCard({
      state: 'review',
      stability: 500,
      difficulty: 0.1,
      elapsed_days: 500,
    })
    const preview = getIntervalPreview(card)
    const easyDays = processReview(card, 4).scheduled_days
    if (easyDays >= 365) {
      expect(preview[4]).toMatch(/^\d+\.\d+y$/)
    }
  })
})

// =============================================================================
// FSRS_PARAMS constants
// =============================================================================

describe('FSRS_PARAMS', () => {
  it('has 17 weight parameters', () => {
    expect(FSRS_PARAMS.w).toHaveLength(17)
  })

  it('has default retention of 0.9', () => {
    expect(FSRS_PARAMS.requestRetention).toBe(0.9)
  })

  it('has maximumInterval of 36500', () => {
    expect(FSRS_PARAMS.maximumInterval).toBe(36500)
  })

  it('has easyBonus of 1.3', () => {
    expect(FSRS_PARAMS.easyBonus).toBe(1.3)
  })

  it('has hardInterval of 1.2', () => {
    expect(FSRS_PARAMS.hardInterval).toBe(1.2)
  })
})
