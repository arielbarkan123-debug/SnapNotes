/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm
 *
 * A simplified but effective implementation of the FSRS algorithm for
 * optimizing flashcard review scheduling. FSRS uses memory research to
 * predict when you'll forget something and schedules reviews accordingly.
 *
 * Key concepts:
 * - Stability: How long a memory will last (in days)
 * - Difficulty: How hard a card is to remember (0-1)
 * - Retention: Target probability of remembering (default 90%)
 */

import type { Rating, ReviewCard, FSRSOutput } from '@/types'

// =============================================================================
// Constants
// =============================================================================

/**
 * FSRS algorithm parameters
 * These are tuned defaults that work well for most users
 */
export const FSRS_PARAMS = {
  // Weight parameters from FSRS research (17 values)
  w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
    0.34, 1.26, 0.29, 2.61,
  ],
  // Target retention rate (90% = remember 9 out of 10 cards)
  requestRetention: 0.9,
  // Maximum interval between reviews (100 years)
  maximumInterval: 36500,
  // Bonus multiplier for "Easy" ratings
  easyBonus: 1.3,
  // Multiplier for "Hard" ratings
  hardInterval: 1.2,
}

/**
 * Initial difficulty values based on first rating
 * Higher = harder to remember
 */
const INITIAL_DIFFICULTY: Record<Rating, number> = {
  1: 0.7, // Again - card is difficult
  2: 0.6, // Hard - card is somewhat difficult
  3: 0.3, // Good - card is moderate
  4: 0.1, // Easy - card is easy
}

/**
 * Initial stability values (in days) based on first rating
 * Higher = memory lasts longer
 */
const INITIAL_STABILITY: Record<Rating, number> = {
  1: 0.5, // Again - review in 12 hours
  2: 1, // Hard - review in 1 day
  3: 3, // Good - review in 3 days
  4: 7, // Easy - review in 1 week
}

/**
 * Learning step intervals (in minutes) for new/relearning cards
 */
const LEARNING_STEPS = {
  again: 1, // 1 minute
  hard: 6, // 6 minutes
  good: 10, // 10 minutes
}

// =============================================================================
// Core Calculation Functions
// =============================================================================

/**
 * Calculate initial difficulty for a new card based on first rating
 *
 * @param rating - User's rating (1-4)
 * @returns Initial difficulty value (0.1 - 0.7)
 */
export function calculateInitialDifficulty(rating: Rating): number {
  return INITIAL_DIFFICULTY[rating]
}

/**
 * Calculate initial stability (memory duration) for a new card
 *
 * @param rating - User's rating (1-4)
 * @returns Initial stability in days
 */
export function calculateInitialStability(rating: Rating): number {
  return INITIAL_STABILITY[rating]
}

/**
 * Calculate new difficulty after a review
 *
 * Difficulty changes based on performance:
 * - Again/Hard: Increases (card becomes harder)
 * - Good: Slight decrease
 * - Easy: Larger decrease
 *
 * @param oldDifficulty - Current difficulty (0-1)
 * @param rating - User's rating (1-4)
 * @returns New difficulty, clamped to [0.1, 1.0]
 */
export function calculateNextDifficulty(
  oldDifficulty: number,
  rating: Rating
): number {
  // Delta values for each rating
  const difficultyDelta: Record<Rating, number> = {
    1: 0.15, // Again - increase difficulty
    2: 0.08, // Hard - slight increase
    3: -0.05, // Good - slight decrease
    4: -0.1, // Easy - decrease
  }

  const newDifficulty = oldDifficulty + difficultyDelta[rating]

  // Clamp between 0.1 (easiest) and 1.0 (hardest)
  return Math.max(0.1, Math.min(1.0, newDifficulty))
}

/**
 * Calculate new stability after a review
 *
 * Stability represents how long the memory will last. It increases with:
 * - Higher ratings (Good/Easy)
 * - Lower difficulty (easier cards grow faster)
 * - Appropriate elapsed time (not too early, not too late)
 *
 * @param oldStability - Current stability in days
 * @param difficulty - Card difficulty (0-1)
 * @param rating - User's rating (1-4)
 * @param elapsedDays - Days since last review
 * @returns New stability in days
 */
export function calculateNextStability(
  oldStability: number,
  difficulty: number,
  rating: Rating,
  elapsedDays: number
): number {
  // If rating is "Again", reset stability significantly
  if (rating === 1) {
    // Stability drops but retains some memory
    return Math.max(0.5, oldStability * 0.2)
  }

  // Growth factor based on rating
  const growthFactors: Record<Rating, number> = {
    1: 0.2, // Again (handled above, but included for completeness)
    2: 1.2, // Hard - minimal growth
    3: 2.5, // Good - normal growth
    4: 3.5, // Easy - accelerated growth
  }

  // Difficulty penalty: harder cards grow slower
  // Range: 0.5 (hardest) to 1.0 (easiest)
  const difficultyPenalty = 1 - difficulty * 0.5

  // Calculate retrievability (how well you remembered based on timing)
  // If reviewed on time, this is ~0.9. Earlier = higher, later = lower
  const retrievability = Math.exp(-elapsedDays / oldStability)

  // Review efficiency: reviewing just before forgetting is optimal
  // This bonus peaks when retrievability is around 0.9
  const reviewBonus = 1 + (1 - retrievability) * 0.5

  // Calculate new stability
  const newStability =
    oldStability * growthFactors[rating] * difficultyPenalty * reviewBonus

  // Apply easy bonus
  const withEasyBonus =
    rating === 4 ? newStability * FSRS_PARAMS.easyBonus : newStability

  // Cap at maximum interval
  return Math.min(withEasyBonus, FSRS_PARAMS.maximumInterval)
}

/**
 * Convert stability to a review interval in days
 *
 * Uses the formula from spaced repetition research:
 * interval = stability * ln(targetRetention) / ln(0.9)
 *
 * This calculates how many days until retention drops to target level
 *
 * @param stability - Current stability in days
 * @param targetRetention - Target retention rate (0-1, default 0.9)
 * @returns Interval in days (minimum 1)
 */
export function calculateNextInterval(
  stability: number,
  targetRetention: number = FSRS_PARAMS.requestRetention
): number {
  // Formula: when will retention reach target?
  // R(t) = e^(-t/S) = targetRetention
  // t = -S * ln(targetRetention)
  const interval = stability * (Math.log(targetRetention) / Math.log(0.9))

  // Round to nearest day, minimum 1, maximum as configured
  const rounded = Math.round(interval)
  return Math.max(1, Math.min(rounded, FSRS_PARAMS.maximumInterval))
}

/**
 * Calculate the due date based on interval
 *
 * @param intervalDays - Number of days until due
 * @returns Due date
 */
export function getDueDate(intervalDays: number): Date {
  const now = new Date()
  const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)
  return dueDate
}

/**
 * Calculate due date for learning cards (uses minutes instead of days)
 *
 * @param intervalMinutes - Number of minutes until due
 * @returns Due date
 */
export function getLearningDueDate(intervalMinutes: number): Date {
  const now = new Date()
  return new Date(now.getTime() + intervalMinutes * 60 * 1000)
}

// =============================================================================
// Main Review Processing
// =============================================================================

/**
 * Process a card review and calculate the next scheduling state
 *
 * This is the main entry point for the FSRS algorithm. It handles all card
 * states and transitions:
 *
 * State transitions:
 * - new → learning (if Again) or review (if Good/Easy)
 * - learning → learning (if Again) or review (if Good/Easy)
 * - review → relearning (if Again) or review (with new interval)
 * - relearning → relearning (if Again) or review (if Good/Easy)
 *
 * @param card - The card being reviewed
 * @param rating - User's rating (1-4)
 * @param targetRetention - Target retention rate (default 0.9)
 * @returns New card state with updated FSRS parameters
 */
export function processReview(
  card: ReviewCard,
  rating: Rating,
  targetRetention: number = FSRS_PARAMS.requestRetention
): FSRSOutput {
  const { state, stability, difficulty, elapsed_days } = card

  // Handle based on current state
  switch (state) {
    case 'new':
      return processNewCard(rating, targetRetention)

    case 'learning':
    case 'relearning':
      return processLearningCard(
        stability,
        difficulty,
        rating,
        targetRetention,
        state
      )

    case 'review':
      return processReviewCard(
        stability,
        difficulty,
        rating,
        elapsed_days,
        targetRetention
      )

    default:
      // Fallback: treat as new card
      return processNewCard(rating, targetRetention)
  }
}

/**
 * Process a new card's first review
 */
function processNewCard(
  rating: Rating,
  targetRetention: number
): FSRSOutput {
  const initialDifficulty = calculateInitialDifficulty(rating)
  const initialStability = calculateInitialStability(rating)

  // Determine next state
  if (rating === 1) {
    // Again: enter learning mode with short interval
    return {
      stability: initialStability,
      difficulty: initialDifficulty,
      due_date: getLearningDueDate(LEARNING_STEPS.again),
      scheduled_days: 0,
      state: 'learning',
    }
  }

  if (rating === 2) {
    // Hard: enter learning mode with slightly longer interval
    return {
      stability: initialStability,
      difficulty: initialDifficulty,
      due_date: getLearningDueDate(LEARNING_STEPS.hard),
      scheduled_days: 0,
      state: 'learning',
    }
  }

  // Good or Easy: graduate directly to review
  const interval = calculateNextInterval(initialStability, targetRetention)

  return {
    stability: initialStability,
    difficulty: initialDifficulty,
    due_date: getDueDate(interval),
    scheduled_days: interval,
    state: 'review',
  }
}

/**
 * Process a card in learning or relearning state
 */
function processLearningCard(
  stability: number,
  difficulty: number,
  rating: Rating,
  targetRetention: number,
  currentState: 'learning' | 'relearning'
): FSRSOutput {
  // Update difficulty based on performance
  const newDifficulty = calculateNextDifficulty(difficulty, rating)

  if (rating === 1) {
    // Again: stay in learning with short interval
    return {
      stability: Math.max(0.5, stability * 0.5),
      difficulty: newDifficulty,
      due_date: getLearningDueDate(LEARNING_STEPS.again),
      scheduled_days: 0,
      state: currentState,
    }
  }

  if (rating === 2) {
    // Hard: stay in learning with medium interval
    return {
      stability: stability,
      difficulty: newDifficulty,
      due_date: getLearningDueDate(LEARNING_STEPS.hard),
      scheduled_days: 0,
      state: currentState,
    }
  }

  // Good or Easy: graduate to review
  const newStability =
    rating === 4 ? stability * FSRS_PARAMS.easyBonus : stability
  const interval = calculateNextInterval(newStability, targetRetention)

  return {
    stability: newStability,
    difficulty: newDifficulty,
    due_date: getDueDate(interval),
    scheduled_days: interval,
    state: 'review',
  }
}

/**
 * Process a card in review state
 */
function processReviewCard(
  stability: number,
  difficulty: number,
  rating: Rating,
  elapsedDays: number,
  targetRetention: number
): FSRSOutput {
  // Calculate new difficulty
  const newDifficulty = calculateNextDifficulty(difficulty, rating)

  if (rating === 1) {
    // Again: card was forgotten, move to relearning
    const newStability = Math.max(0.5, stability * 0.2)

    return {
      stability: newStability,
      difficulty: newDifficulty,
      due_date: getLearningDueDate(LEARNING_STEPS.again),
      scheduled_days: 0,
      state: 'relearning',
    }
  }

  // Calculate new stability based on performance
  const newStability = calculateNextStability(
    stability,
    difficulty,
    rating,
    elapsedDays
  )

  // Calculate next interval
  let interval = calculateNextInterval(newStability, targetRetention)

  // Apply hard penalty
  if (rating === 2) {
    interval = Math.max(1, Math.round(interval / FSRS_PARAMS.hardInterval))
  }

  return {
    stability: newStability,
    difficulty: newDifficulty,
    due_date: getDueDate(interval),
    scheduled_days: interval,
    state: 'review',
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate estimated intervals for all ratings (for UI preview)
 *
 * @param card - The card to calculate intervals for
 * @param targetRetention - Target retention rate
 * @returns Object with intervals for each rating
 */
export function getIntervalPreview(
  card: ReviewCard,
  targetRetention: number = FSRS_PARAMS.requestRetention
): Record<Rating, string> {
  const results: Record<Rating, string> = {
    1: '',
    2: '',
    3: '',
    4: '',
  }

  for (const rating of [1, 2, 3, 4] as Rating[]) {
    const output = processReview(card, rating, targetRetention)

    if (output.scheduled_days === 0) {
      // Learning step (in minutes)
      const minutes =
        rating === 1
          ? LEARNING_STEPS.again
          : rating === 2
            ? LEARNING_STEPS.hard
            : LEARNING_STEPS.good
      results[rating] = `${minutes}m`
    } else if (output.scheduled_days < 30) {
      results[rating] = `${output.scheduled_days}d`
    } else if (output.scheduled_days < 365) {
      results[rating] = `${Math.round(output.scheduled_days / 30)}mo`
    } else {
      results[rating] = `${(output.scheduled_days / 365).toFixed(1)}y`
    }
  }

  return results
}

/**
 * Calculate the current retrievability (probability of recall)
 *
 * @param stability - Card stability in days
 * @param elapsedDays - Days since last review
 * @returns Retrievability as a percentage (0-100)
 */
export function calculateRetrievability(
  stability: number,
  elapsedDays: number
): number {
  const retrievability = Math.exp(-elapsedDays / stability)
  return Math.round(retrievability * 100)
}

/**
 * Check if a card is due for review
 *
 * @param dueDate - Card's due date
 * @returns True if the card is due
 */
export function isCardDue(dueDate: string | Date): boolean {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  return due <= new Date()
}

// =============================================================================
// Export
// =============================================================================

const fsrs = {
  FSRS_PARAMS,
  calculateInitialDifficulty,
  calculateInitialStability,
  calculateNextDifficulty,
  calculateNextStability,
  calculateNextInterval,
  getDueDate,
  getLearningDueDate,
  processReview,
  getIntervalPreview,
  calculateRetrievability,
  isCardDue,
}

export default fsrs
