/**
 * Spaced Repetition System (SRS) Module
 *
 * Exports the FSRS algorithm and related utilities for
 * scheduling flashcard reviews.
 */

// FSRS Algorithm
export {
  // Constants
  FSRS_PARAMS,
  // Core calculation functions
  calculateInitialDifficulty,
  calculateInitialStability,
  calculateNextDifficulty,
  calculateNextStability,
  calculateNextInterval,
  // Date utilities
  getDueDate,
  getLearningDueDate,
  // Main review processing
  processReview,
  // Utility functions
  getIntervalPreview,
  calculateRetrievability,
  isCardDue,
  // Default export
  default as fsrs,
} from './fsrs'

// Card Generator
export {
  generateCardsFromCourse,
  generateQuestionFromContent,
  estimateCardCount,
  getCardTypeSummary,
  default as cardGenerator,
} from './card-generator'
