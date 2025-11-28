// =============================================================================
// Spaced Repetition System (SRS) Types
// Based on FSRS (Free Spaced Repetition Scheduler) algorithm
// =============================================================================

// -----------------------------------------------------------------------------
// Enums & Constants
// -----------------------------------------------------------------------------

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

export type CardType =
  | 'flashcard'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'matching'
  | 'sequence'
  // Legacy types (for backwards compatibility)
  | 'key_point'
  | 'formula'
  | 'question'
  | 'explanation'

export type Rating = 1 | 2 | 3 | 4 // 1=Again, 2=Hard, 3=Good, 4=Easy

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
}

// -----------------------------------------------------------------------------
// Question Type Data Structures
// -----------------------------------------------------------------------------

/**
 * Data for multiple choice questions
 */
export interface MultipleChoiceData {
  options: string[]
  correctIndex: number
  explanation?: string
}

/**
 * Data for true/false questions
 */
export interface TrueFalseData {
  correct: boolean
  explanation?: string
}

/**
 * Data for fill-in-the-blank questions
 */
export interface FillBlankData {
  answer: string
  acceptableAnswers?: string[]
}

/**
 * Data for matching questions
 * Each term[i] matches to definitions[correctPairs[i]]
 */
export interface MatchingData {
  terms: string[]
  definitions: string[]
  correctPairs: number[]
}

/**
 * Data for sequence/ordering questions
 * Items should be arranged in the order specified by correctOrder
 */
export interface SequenceData {
  items: string[]
  correctOrder: number[]
}

/**
 * Union type for all question data types
 */
export type QuestionData =
  | MultipleChoiceData
  | TrueFalseData
  | FillBlankData
  | MatchingData
  | SequenceData
  | string // For simple flashcard/explanation types

// -----------------------------------------------------------------------------
// Database Models
// -----------------------------------------------------------------------------

/**
 * A review card generated from course content
 * The `back` field can be a plain string or a JSON string containing question data
 */
export interface ReviewCard {
  id: string
  user_id: string
  course_id: string
  lesson_index: number
  step_index: number
  card_type: CardType
  front: string
  /**
   * For simple types (flashcard, key_point, explanation): plain text answer
   * For interactive types (multiple_choice, true_false, etc.): JSON string of QuestionData
   */
  back: string
  // FSRS parameters
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: CardState
  // Scheduling
  due_date: string
  last_review: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Data required to create a new review card
 */
export interface ReviewCardInsert {
  course_id: string
  lesson_index: number
  step_index: number
  card_type: CardType
  front: string
  back: string
}

/**
 * Log of a single review event
 */
export interface ReviewLog {
  id: string
  card_id: string
  user_id: string
  rating: Rating
  review_duration_ms: number | null
  reviewed_at: string
}

/**
 * User-specific SRS settings
 */
export interface UserSRSSettings {
  id: string
  user_id: string
  target_retention: number // 0.0 to 1.0, default 0.9
  max_new_cards_per_day: number
  max_reviews_per_day: number
  interleave_reviews: boolean // Whether to mix cards from different courses/lessons
}

// -----------------------------------------------------------------------------
// Algorithm Types
// -----------------------------------------------------------------------------

/**
 * Output from FSRS algorithm after processing a review
 */
export interface FSRSOutput {
  stability: number
  difficulty: number
  due_date: Date
  scheduled_days: number
  state: CardState
}

/**
 * FSRS algorithm parameters (for advanced customization)
 */
export interface FSRSParameters {
  w: number[] // Weight parameters (17 values)
  requestRetention: number
  maximumInterval: number
  enableFuzz: boolean
}

// -----------------------------------------------------------------------------
// Session Types
// -----------------------------------------------------------------------------

/**
 * A review session containing cards due for review
 */
export interface ReviewSession {
  cards_due: number
  new_cards: number
  review_cards: number
  cards: ReviewCard[]
}

/**
 * Statistics for a review session
 */
export interface ReviewSessionStats {
  total_reviewed: number
  correct: number // Rating >= 3
  incorrect: number // Rating < 3
  average_time_ms: number
  started_at: string
  completed_at: string | null
}

// -----------------------------------------------------------------------------
// API Types
// -----------------------------------------------------------------------------

/**
 * Request to submit a card review
 */
export interface SubmitReviewRequest {
  card_id: string
  rating: Rating
  duration_ms?: number
}

/**
 * Response after submitting a review
 */
export interface SubmitReviewResponse {
  success: boolean
  next_due: string
  scheduled_days: number
  new_state: CardState
}

/**
 * Request to generate cards from a course
 */
export interface GenerateCardsRequest {
  course_id: string
  lesson_indices?: number[] // Generate for specific lessons, or all if empty
}

/**
 * Summary of due cards for dashboard
 */
export interface DueCardsSummary {
  total_due: number
  new: number
  learning: number
  review: number
  relearning: number
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parse the back field of a review card based on its type
 * Returns the appropriate data structure or plain string
 */
export function parseCardBack(card: ReviewCard): QuestionData {
  // Simple types return plain text
  if (
    card.card_type === 'flashcard' ||
    card.card_type === 'key_point' ||
    card.card_type === 'formula' ||
    card.card_type === 'explanation' ||
    card.card_type === 'short_answer'
  ) {
    return card.back
  }

  // Interactive types have JSON data
  try {
    return JSON.parse(card.back) as QuestionData
  } catch {
    // Fallback to plain string if JSON parsing fails
    return card.back
  }
}

/**
 * Type guard to check if parsed data is MultipleChoiceData
 */
export function isMultipleChoice(data: QuestionData): data is MultipleChoiceData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'options' in data &&
    'correctIndex' in data &&
    Array.isArray((data as MultipleChoiceData).options)
  )
}

/**
 * Type guard to check if parsed data is TrueFalseData
 */
export function isTrueFalse(data: QuestionData): data is TrueFalseData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'correct' in data &&
    typeof (data as TrueFalseData).correct === 'boolean'
  )
}

/**
 * Type guard to check if parsed data is FillBlankData
 */
export function isFillBlank(data: QuestionData): data is FillBlankData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'answer' in data &&
    typeof (data as FillBlankData).answer === 'string'
  )
}

/**
 * Type guard to check if parsed data is MatchingData
 */
export function isMatching(data: QuestionData): data is MatchingData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'terms' in data &&
    'definitions' in data &&
    'correctPairs' in data &&
    Array.isArray((data as MatchingData).terms)
  )
}

/**
 * Type guard to check if parsed data is SequenceData
 */
export function isSequence(data: QuestionData): data is SequenceData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    'correctOrder' in data &&
    Array.isArray((data as SequenceData).items)
  )
}

/**
 * Create JSON string for multiple choice back field
 */
export function createMultipleChoiceBack(data: MultipleChoiceData): string {
  return JSON.stringify(data)
}

/**
 * Create JSON string for true/false back field
 */
export function createTrueFalseBack(data: TrueFalseData): string {
  return JSON.stringify(data)
}

/**
 * Create JSON string for fill-blank back field
 */
export function createFillBlankBack(data: FillBlankData): string {
  return JSON.stringify(data)
}

/**
 * Create JSON string for matching back field
 */
export function createMatchingBack(data: MatchingData): string {
  return JSON.stringify(data)
}

/**
 * Create JSON string for sequence back field
 */
export function createSequenceBack(data: SequenceData): string {
  return JSON.stringify(data)
}
