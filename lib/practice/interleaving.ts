/**
 * Interleaved Practice Generator
 *
 * Creates mixed practice sessions from multiple courses/lessons.
 * Based on research showing that interleaved practice (mixing topics)
 * leads to better long-term retention than blocked practice.
 */

import { type ReviewCard } from '@/types/srs'

// ============================================
// TYPES
// ============================================

export interface CardWithMeta extends ReviewCard {
  /** Mastery score for the lesson this card belongs to (0-1) */
  lessonMastery: number
  /** Priority score calculated from multiple factors */
  priorityScore: number
  /** Unique identifier for grouping (course_id:lesson_index) */
  topicKey: string
}

export interface PracticeSessionConfig {
  /** Maximum cards to include in session */
  cardCount: number
  /** Maximum cards from same lesson in a row */
  maxConsecutiveSameTopic: number
  /** Include cards from courses with low mastery */
  prioritizeLowMastery: boolean
  /** New card limit per session */
  maxNewCards: number
}

export interface MasteryData {
  courseId: string
  lessonIndex: number
  masteryScore: number
}

export interface PracticeSession {
  cards: CardWithMeta[]
  stats: {
    totalCards: number
    dueToday: number
    newCards: number
    fromLowMastery: number
    courseBreakdown: Record<string, number>
  }
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CONFIG: PracticeSessionConfig = {
  cardCount: 20,
  maxConsecutiveSameTopic: 2,
  prioritizeLowMastery: true,
  maxNewCards: 5,
}

/** Priority weights for card selection */
const PRIORITY_WEIGHTS = {
  dueToday: 100,
  overdue: 150,
  lowMastery: 80,
  newCard: 40,
  recentlyReviewed: 10,
}

/** Mastery threshold below which lessons are considered "weak" */
const LOW_MASTERY_THRESHOLD = 0.4

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Generate a mixed practice session from multiple courses
 *
 * Creates an interleaved practice session by:
 * 1. Gathering all available cards from provided courses
 * 2. Calculating priority scores based on due date, mastery, etc.
 * 3. Selecting top cards by priority
 * 4. Shuffling with constraints to ensure topic mixing
 *
 * @param userId - The user's ID
 * @param cards - All available review cards for the user
 * @param masteryData - Mastery scores per lesson
 * @param config - Session configuration options
 * @returns A practice session with interleaved cards
 */
export function generateMixedPractice(
  userId: string,
  cards: ReviewCard[],
  masteryData: MasteryData[],
  config: Partial<PracticeSessionConfig> = {}
): PracticeSession {
  const sessionConfig = { ...DEFAULT_CONFIG, ...config }

  // Create mastery lookup map
  const masteryMap = createMasteryMap(masteryData)

  // Add metadata and calculate priorities
  const cardsWithMeta = cards.map((card) => enrichCardWithMeta(card, masteryMap))

  // Apply weighted selection
  const selectedCards = selectCardsByPriority(cardsWithMeta, sessionConfig)

  // Shuffle with interleaving constraints
  const interleavedCards = shuffleWithConstraints(
    selectedCards,
    sessionConfig.maxConsecutiveSameTopic
  )

  // Calculate session stats
  const stats = calculateSessionStats(interleavedCards)

  return {
    cards: interleavedCards,
    stats,
  }
}

/**
 * Shuffle cards while ensuring no topic appears more than N times consecutively
 *
 * Algorithm:
 * 1. Fisher-Yates shuffle the cards
 * 2. Scan for constraint violations
 * 3. When violation found, swap with next different topic card
 * 4. Repeat until no violations or max iterations reached
 *
 * @param cards - Cards to shuffle
 * @param maxConsecutive - Maximum allowed consecutive same-topic cards
 * @returns Shuffled cards with constraints applied
 */
export function shuffleWithConstraints(
  cards: CardWithMeta[],
  maxConsecutive: number = 2
): CardWithMeta[] {
  if (cards.length <= maxConsecutive) {
    return fisherYatesShuffle([...cards])
  }

  // Initial shuffle
  const result = fisherYatesShuffle([...cards])

  // Apply constraints with max iterations to prevent infinite loops
  const maxIterations = cards.length * 3
  let iterations = 0

  while (iterations < maxIterations) {
    const violationIndex = findConstraintViolation(result, maxConsecutive)

    if (violationIndex === -1) {
      // No violations found
      break
    }

    // Find a card with different topic to swap with
    const swapIndex = findSwapCandidate(result, violationIndex, maxConsecutive)

    if (swapIndex !== -1) {
      // Swap the cards
      ;[result[violationIndex], result[swapIndex]] = [
        result[swapIndex],
        result[violationIndex],
      ]
    } else {
      // No valid swap found, try reshuffling a portion
      const start = Math.max(0, violationIndex - maxConsecutive)
      const end = Math.min(result.length, violationIndex + maxConsecutive + 1)
      const portion = result.slice(start, end)
      const shuffledPortion = fisherYatesShuffle(portion)
      result.splice(start, end - start, ...shuffledPortion)
    }

    iterations++
  }

  return result
}

// ============================================
// PRIORITY & SELECTION
// ============================================

/**
 * Select cards based on weighted priority scoring
 *
 * Priority order:
 * 1. Cards due today (highest)
 * 2. Cards from low-mastery lessons
 * 3. New cards (limited by maxNewCards, but relaxed if needed to hit target)
 * 4. Recently reviewed (lowest)
 */
export function selectCardsByPriority(
  cards: CardWithMeta[],
  config: PracticeSessionConfig
): CardWithMeta[] {
  // Sort by priority score descending
  const sorted = [...cards].sort((a, b) => b.priorityScore - a.priorityScore)

  // First pass: Apply new card limit strictly
  let newCardCount = 0
  const selected: CardWithMeta[] = []
  const skippedNewCards: CardWithMeta[] = []

  for (const card of sorted) {
    if (selected.length >= config.cardCount) {
      break
    }

    // Check new card limit
    if (card.state === 'new') {
      if (newCardCount >= config.maxNewCards) {
        skippedNewCards.push(card) // Save for potential use later
        continue // Skip this new card for now
      }
      newCardCount++
    }

    selected.push(card)
  }

  // Second pass: If we didn't reach the target count, add skipped new cards
  if (selected.length < config.cardCount && skippedNewCards.length > 0) {
    const needed = config.cardCount - selected.length
    const extras = skippedNewCards.slice(0, needed)
    selected.push(...extras)
  }

  return selected
}

/**
 * Calculate priority score for a card
 *
 * Higher score = higher priority for inclusion
 */
export function calculatePriorityScore(
  card: ReviewCard,
  lessonMastery: number,
  now: Date = new Date()
): number {
  let score = 0
  const dueDate = new Date(card.due_date)
  const daysDiff = Math.floor(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Due today or overdue
  if (daysDiff <= 0) {
    score += daysDiff < 0 ? PRIORITY_WEIGHTS.overdue : PRIORITY_WEIGHTS.dueToday
    // Add extra weight for more overdue cards
    score += Math.min(Math.abs(daysDiff) * 5, 50)
  }

  // Low mastery bonus
  if (lessonMastery < LOW_MASTERY_THRESHOLD) {
    score += PRIORITY_WEIGHTS.lowMastery * (1 - lessonMastery)
  }

  // New card handling
  if (card.state === 'new') {
    score += PRIORITY_WEIGHTS.newCard
  }

  // Penalty for recently reviewed (not due)
  if (daysDiff > 0 && card.last_review) {
    score += PRIORITY_WEIGHTS.recentlyReviewed
  }

  // Bonus for cards with high lapses (struggling)
  if (card.lapses > 2) {
    score += Math.min(card.lapses * 10, 30)
  }

  return score
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Enrich a card with metadata for interleaving
 */
function enrichCardWithMeta(
  card: ReviewCard,
  masteryMap: Map<string, number>
): CardWithMeta {
  const topicKey = `${card.course_id}:${card.lesson_index}`
  const lessonMastery = masteryMap.get(topicKey) ?? 0.5 // Default to 50% if unknown

  return {
    ...card,
    topicKey,
    lessonMastery,
    priorityScore: calculatePriorityScore(card, lessonMastery),
  }
}

/**
 * Create a lookup map for mastery scores
 */
function createMasteryMap(masteryData: MasteryData[]): Map<string, number> {
  const map = new Map<string, number>()

  for (const data of masteryData) {
    const key = `${data.courseId}:${data.lessonIndex}`
    map.set(key, data.masteryScore)
  }

  return map
}

/**
 * Fisher-Yates shuffle algorithm
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/**
 * Find the first index where constraint is violated
 * Returns -1 if no violation
 */
function findConstraintViolation(
  cards: CardWithMeta[],
  maxConsecutive: number
): number {
  let consecutiveCount = 1
  let currentTopic = cards[0]?.topicKey

  for (let i = 1; i < cards.length; i++) {
    if (cards[i].topicKey === currentTopic) {
      consecutiveCount++
      if (consecutiveCount > maxConsecutive) {
        return i
      }
    } else {
      currentTopic = cards[i].topicKey
      consecutiveCount = 1
    }
  }

  return -1
}

/**
 * Find a card to swap with that has a different topic
 * Looks forward from the violation index
 */
function findSwapCandidate(
  cards: CardWithMeta[],
  violationIndex: number,
  maxConsecutive: number
): number {
  const violationTopic = cards[violationIndex].topicKey

  // Look forward for a different topic
  for (let i = violationIndex + 1; i < cards.length; i++) {
    if (cards[i].topicKey !== violationTopic) {
      // Check if swapping would create a new violation at the swap location
      const wouldViolate = checkSwapViolation(
        cards,
        violationIndex,
        i,
        maxConsecutive
      )
      if (!wouldViolate) {
        return i
      }
    }
  }

  // Look backward as fallback
  for (let i = violationIndex - maxConsecutive - 1; i >= 0; i--) {
    if (cards[i].topicKey !== violationTopic) {
      const wouldViolate = checkSwapViolation(
        cards,
        violationIndex,
        i,
        maxConsecutive
      )
      if (!wouldViolate) {
        return i
      }
    }
  }

  return -1
}

/**
 * Check if swapping two cards would create a new constraint violation
 */
function checkSwapViolation(
  cards: CardWithMeta[],
  index1: number,
  index2: number,
  maxConsecutive: number
): boolean {
  // Simulate the swap
  const topic1 = cards[index1].topicKey
  const topic2 = cards[index2].topicKey

  // Check neighborhood of index2 after swap (card1 moves there)
  const neighborsBefore2 = getNeighborTopics(cards, index2, maxConsecutive)
  const sameTopicCount2 = neighborsBefore2.filter((t) => t === topic1).length

  if (sameTopicCount2 >= maxConsecutive) {
    return true
  }

  // Check neighborhood of index1 after swap (card2 moves there)
  const neighborsBefore1 = getNeighborTopics(cards, index1, maxConsecutive)
  const sameTopicCount1 = neighborsBefore1.filter((t) => t === topic2).length

  if (sameTopicCount1 >= maxConsecutive) {
    return true
  }

  return false
}

/**
 * Get topic keys of neighboring cards
 */
function getNeighborTopics(
  cards: CardWithMeta[],
  index: number,
  range: number
): string[] {
  const topics: string[] = []

  for (let i = Math.max(0, index - range); i <= Math.min(cards.length - 1, index + range); i++) {
    if (i !== index) {
      topics.push(cards[i].topicKey)
    }
  }

  return topics
}

/**
 * Calculate statistics for the practice session
 */
function calculateSessionStats(cards: CardWithMeta[]): PracticeSession['stats'] {
  const now = new Date()
  const courseBreakdown: Record<string, number> = {}

  let dueToday = 0
  let newCards = 0
  let fromLowMastery = 0

  for (const card of cards) {
    // Count by course
    courseBreakdown[card.course_id] = (courseBreakdown[card.course_id] || 0) + 1

    // Due today
    const dueDate = new Date(card.due_date)
    if (dueDate <= now) {
      dueToday++
    }

    // New cards
    if (card.state === 'new') {
      newCards++
    }

    // Low mastery
    if (card.lessonMastery < LOW_MASTERY_THRESHOLD) {
      fromLowMastery++
    }
  }

  return {
    totalCards: cards.length,
    dueToday,
    newCards,
    fromLowMastery,
    courseBreakdown,
  }
}

// ============================================
// ADVANCED INTERLEAVING STRATEGIES
// ============================================

/**
 * Generate a practice session optimized for spaced interleaving
 *
 * Uses a "ABCBACBCA" pattern instead of "AAABBBCCC"
 * This creates maximum spacing between same-topic cards
 */
export function generateSpacedInterleaving(
  cards: CardWithMeta[],
  config: PracticeSessionConfig
): CardWithMeta[] {
  // Group cards by topic
  const topicGroups = groupCardsByTopic(cards)
  const topics = Object.keys(topicGroups)

  if (topics.length <= 1) {
    // Can't interleave with single topic
    return cards.slice(0, config.cardCount)
  }

  // Calculate cards per topic (balanced distribution)
  const cardsPerTopic = Math.ceil(config.cardCount / topics.length)

  // Take top cards from each topic
  const selectedPerTopic: Record<string, CardWithMeta[]> = {}
  for (const topic of topics) {
    selectedPerTopic[topic] = topicGroups[topic]
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, cardsPerTopic)
  }

  // Interleave: round-robin through topics
  const result: CardWithMeta[] = []
  let topicIndex = 0
  const topicIndices: Record<string, number> = {}

  topics.forEach((topic) => (topicIndices[topic] = 0))

  while (result.length < config.cardCount) {
    const topic = topics[topicIndex % topics.length]
    const cardIndex = topicIndices[topic]

    if (cardIndex < selectedPerTopic[topic].length) {
      result.push(selectedPerTopic[topic][cardIndex])
      topicIndices[topic]++
    }

    topicIndex++

    // Break if we've exhausted all topics
    const allExhausted = topics.every(
      (t) => topicIndices[t] >= selectedPerTopic[t].length
    )
    if (allExhausted) break
  }

  return result
}

/**
 * Group cards by their topic key
 */
function groupCardsByTopic(
  cards: CardWithMeta[]
): Record<string, CardWithMeta[]> {
  const groups: Record<string, CardWithMeta[]> = {}

  for (const card of cards) {
    if (!groups[card.topicKey]) {
      groups[card.topicKey] = []
    }
    groups[card.topicKey].push(card)
  }

  return groups
}

/**
 * Get cards due for review today across all courses
 */
export function getDueCards(
  cards: ReviewCard[],
  now: Date = new Date()
): ReviewCard[] {
  return cards.filter((card) => {
    const dueDate = new Date(card.due_date)
    return dueDate <= now
  })
}

/**
 * Get cards from weak/low-mastery areas
 */
export function getWeakAreaCards(
  cards: CardWithMeta[],
  threshold: number = LOW_MASTERY_THRESHOLD
): CardWithMeta[] {
  return cards.filter((card) => card.lessonMastery < threshold)
}

/**
 * Balance card selection across courses
 *
 * Ensures no single course dominates the practice session
 */
export function balanceAcrossCourses(
  cards: CardWithMeta[],
  maxPerCourse: number
): CardWithMeta[] {
  const byCourse: Record<string, CardWithMeta[]> = {}

  // Group by course
  for (const card of cards) {
    if (!byCourse[card.course_id]) {
      byCourse[card.course_id] = []
    }
    byCourse[card.course_id].push(card)
  }

  // Take up to maxPerCourse from each
  const balanced: CardWithMeta[] = []

  for (const courseCards of Object.values(byCourse)) {
    const sorted = courseCards.sort((a, b) => b.priorityScore - a.priorityScore)
    balanced.push(...sorted.slice(0, maxPerCourse))
  }

  return balanced
}
