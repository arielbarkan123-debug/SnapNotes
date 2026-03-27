/**
 * Tests for Interleaved Practice Generator
 * lib/practice/interleaving.ts
 */

import {
  shuffleWithConstraints,
  calculatePriorityScore,
  selectCardsByPriority,
  generateMixedPractice,
  generateSpacedInterleaving,
  getDueCards,
  getWeakAreaCards,
  balanceAcrossCourses,
  type CardWithMeta,
  type PracticeSessionConfig,
  type MasteryData,
} from '@/lib/practice/interleaving'
import type { ReviewCard } from '@/types/srs'

// ============================================================================
// Helpers
// ============================================================================

function createMockCard(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    id: `card-${Math.random().toString(36).substring(2, 8)}`,
    user_id: 'user-123',
    course_id: 'course-1',
    lesson_index: 0,
    step_index: 0,
    card_type: 'flashcard',
    front: 'What is X?',
    back: 'X is Y',
    stability: 1,
    difficulty: 0.5,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 0,
    lapses: 0,
    state: 'new' as const,
    due_date: new Date().toISOString(),
    last_review: null,
    concept_ids: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockCardWithMeta(overrides: Partial<CardWithMeta> = {}): CardWithMeta {
  const base = createMockCard(overrides)
  return {
    ...base,
    lessonMastery: overrides.lessonMastery ?? 0.5,
    priorityScore: overrides.priorityScore ?? 50,
    topicKey: overrides.topicKey ?? `${base.course_id}:${base.lesson_index}`,
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Interleaving Practice Generator', () => {
  describe('shuffleWithConstraints', () => {
    it('returns shuffled cards with same length', () => {
      const cards = [
        createMockCardWithMeta({ topicKey: 'A' }),
        createMockCardWithMeta({ topicKey: 'B' }),
        createMockCardWithMeta({ topicKey: 'C' }),
      ]

      const result = shuffleWithConstraints(cards, 2)
      expect(result).toHaveLength(3)
    })

    it('returns array as-is when <= maxConsecutive cards', () => {
      const cards = [
        createMockCardWithMeta({ topicKey: 'A' }),
        createMockCardWithMeta({ topicKey: 'A' }),
      ]

      const result = shuffleWithConstraints(cards, 2)
      expect(result).toHaveLength(2)
    })

    it('prevents more than maxConsecutive same-topic cards in a row', () => {
      // Create 10 cards from 2 topics
      const cards: CardWithMeta[] = []
      for (let i = 0; i < 5; i++) {
        cards.push(createMockCardWithMeta({ topicKey: 'topic-A' }))
        cards.push(createMockCardWithMeta({ topicKey: 'topic-B' }))
      }

      const result = shuffleWithConstraints(cards, 2)

      // Check no more than 2 consecutive same-topic cards
      let consecutiveCount = 1
      for (let i = 1; i < result.length; i++) {
        if (result[i].topicKey === result[i - 1].topicKey) {
          consecutiveCount++
          // Allow up to maxConsecutive
          expect(consecutiveCount).toBeLessThanOrEqual(2)
        } else {
          consecutiveCount = 1
        }
      }
    })

    it('handles single topic gracefully', () => {
      const cards = Array.from({ length: 5 }, () =>
        createMockCardWithMeta({ topicKey: 'only-topic' })
      )

      const result = shuffleWithConstraints(cards, 2)
      expect(result).toHaveLength(5)
    })

    it('handles empty array', () => {
      const result = shuffleWithConstraints([], 2)
      expect(result).toEqual([])
    })
  })

  describe('calculatePriorityScore', () => {
    it('gives highest priority to overdue cards', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 3)

      const overdueCard = createMockCard({
        due_date: yesterday.toISOString(),
        state: 'review',
      })

      const score = calculatePriorityScore(overdueCard, 0.5)
      expect(score).toBeGreaterThan(100)
    })

    it('gives high priority to cards due today', () => {
      const card = createMockCard({
        due_date: new Date().toISOString(),
        state: 'review',
      })

      const score = calculatePriorityScore(card, 0.5)
      expect(score).toBeGreaterThanOrEqual(100)
    })

    it('gives bonus for low mastery', () => {
      const card = createMockCard({
        due_date: new Date().toISOString(),
        state: 'review',
      })

      const lowMasteryScore = calculatePriorityScore(card, 0.2)
      const highMasteryScore = calculatePriorityScore(card, 0.8)

      expect(lowMasteryScore).toBeGreaterThan(highMasteryScore)
    })

    it('gives priority to new cards', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      const newCard = createMockCard({ state: 'new', due_date: futureDate.toISOString() })
      const reviewCard = createMockCard({
        state: 'review',
        due_date: futureDate.toISOString(),
        last_review: new Date().toISOString(),
      })

      const newScore = calculatePriorityScore(newCard, 0.8)
      const reviewScore = calculatePriorityScore(reviewCard, 0.8)

      expect(newScore).toBeGreaterThan(reviewScore)
    })

    it('gives bonus for high lapses', () => {
      const card = createMockCard({
        due_date: new Date().toISOString(),
        lapses: 5,
        state: 'review',
      })

      const scoreWithLapses = calculatePriorityScore(card, 0.5)

      const cardNoLapses = createMockCard({
        due_date: new Date().toISOString(),
        lapses: 0,
        state: 'review',
      })
      const scoreNoLapses = calculatePriorityScore(cardNoLapses, 0.5)

      expect(scoreWithLapses).toBeGreaterThan(scoreNoLapses)
    })

    it('adds recently reviewed bonus when future and reviewed', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)

      const card = createMockCard({
        due_date: futureDate.toISOString(),
        state: 'review',
        last_review: new Date().toISOString(),
      })

      const score = calculatePriorityScore(card, 0.8)
      expect(score).toBeGreaterThan(0)
    })
  })

  describe('selectCardsByPriority', () => {
    it('selects top N cards by priority score', () => {
      const cards: CardWithMeta[] = [
        createMockCardWithMeta({ priorityScore: 100, state: 'review' }),
        createMockCardWithMeta({ priorityScore: 200, state: 'review' }),
        createMockCardWithMeta({ priorityScore: 50, state: 'review' }),
        createMockCardWithMeta({ priorityScore: 150, state: 'review' }),
      ]

      const config: PracticeSessionConfig = {
        cardCount: 2,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: 5,
      }

      const selected = selectCardsByPriority(cards, config)
      expect(selected).toHaveLength(2)
      expect(selected[0].priorityScore).toBe(200)
      expect(selected[1].priorityScore).toBe(150)
    })

    it('respects maxNewCards limit', () => {
      const cards: CardWithMeta[] = Array.from({ length: 10 }, (_, i) =>
        createMockCardWithMeta({ state: 'new', priorityScore: 100 - i })
      )

      const config: PracticeSessionConfig = {
        cardCount: 10,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: 3,
      }

      const selected = selectCardsByPriority(cards, config)
      // First pass: 3 new cards. Second pass: fills remaining with skipped new cards.
      expect(selected).toHaveLength(10)
    })

    it('fills remaining slots with skipped new cards if needed', () => {
      // 3 new cards + 2 review cards, limit 4, maxNew 2
      const cards: CardWithMeta[] = [
        createMockCardWithMeta({ state: 'new', priorityScore: 100 }),
        createMockCardWithMeta({ state: 'new', priorityScore: 90 }),
        createMockCardWithMeta({ state: 'new', priorityScore: 80 }),
        createMockCardWithMeta({ state: 'review', priorityScore: 50 }),
        createMockCardWithMeta({ state: 'review', priorityScore: 40 }),
      ]

      const config: PracticeSessionConfig = {
        cardCount: 4,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: 2,
      }

      const selected = selectCardsByPriority(cards, config)
      expect(selected).toHaveLength(4)
    })

    it('returns empty array when given no cards', () => {
      const config: PracticeSessionConfig = {
        cardCount: 10,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: 5,
      }

      const selected = selectCardsByPriority([], config)
      expect(selected).toEqual([])
    })
  })

  describe('generateMixedPractice', () => {
    it('generates a practice session from cards', () => {
      const cards: ReviewCard[] = Array.from({ length: 10 }, (_, i) =>
        createMockCard({
          course_id: `course-${i % 3}`,
          lesson_index: i % 2,
          due_date: new Date().toISOString(),
          state: 'review',
        })
      )

      const masteryData: MasteryData[] = [
        { courseId: 'course-0', lessonIndex: 0, masteryScore: 0.3 },
        { courseId: 'course-1', lessonIndex: 1, masteryScore: 0.8 },
        { courseId: 'course-2', lessonIndex: 0, masteryScore: 0.5 },
      ]

      const session = generateMixedPractice('user-123', cards, masteryData, {
        cardCount: 5,
      })

      expect(session.cards).toHaveLength(5)
      expect(session.stats.totalCards).toBe(5)
      expect(session.stats.courseBreakdown).toBeDefined()
    })

    it('uses default config when none provided', () => {
      const cards: ReviewCard[] = Array.from({ length: 3 }, () =>
        createMockCard({ due_date: new Date().toISOString() })
      )

      const session = generateMixedPractice('user-123', cards, [])
      expect(session.cards.length).toBeLessThanOrEqual(20)
      expect(session.stats).toBeDefined()
    })

    it('handles empty cards array', () => {
      const session = generateMixedPractice('user-123', [], [])
      expect(session.cards).toHaveLength(0)
      expect(session.stats.totalCards).toBe(0)
    })

    it('calculates correct session stats', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 86400000)

      const cards: ReviewCard[] = [
        createMockCard({ state: 'new', due_date: now.toISOString(), course_id: 'c1', lesson_index: 0 }),
        createMockCard({ state: 'review', due_date: yesterday.toISOString(), course_id: 'c1', lesson_index: 0 }),
        createMockCard({ state: 'review', due_date: now.toISOString(), course_id: 'c2', lesson_index: 0 }),
      ]

      const masteryData: MasteryData[] = [
        { courseId: 'c1', lessonIndex: 0, masteryScore: 0.2 },
        { courseId: 'c2', lessonIndex: 0, masteryScore: 0.8 },
      ]

      const session = generateMixedPractice('user-123', cards, masteryData, { cardCount: 3 })

      expect(session.stats.newCards).toBe(1)
      expect(session.stats.dueToday).toBeGreaterThanOrEqual(2)
      expect(session.stats.fromLowMastery).toBeGreaterThanOrEqual(1)
    })
  })

  describe('generateSpacedInterleaving', () => {
    it('returns cards interleaved by topic (round-robin)', () => {
      const cards: CardWithMeta[] = [
        createMockCardWithMeta({ topicKey: 'A', priorityScore: 100 }),
        createMockCardWithMeta({ topicKey: 'A', priorityScore: 90 }),
        createMockCardWithMeta({ topicKey: 'B', priorityScore: 80 }),
        createMockCardWithMeta({ topicKey: 'B', priorityScore: 70 }),
      ]

      const config: PracticeSessionConfig = {
        cardCount: 4,
        maxConsecutiveSameTopic: 1,
        prioritizeLowMastery: true,
        maxNewCards: 5,
      }

      const result = generateSpacedInterleaving(cards, config)
      expect(result).toHaveLength(4)

      // Verify round-robin: A, B, A, B
      expect(result[0].topicKey).not.toBe(result[1].topicKey)
    })

    it('returns single topic cards without interleaving', () => {
      const cards: CardWithMeta[] = Array.from({ length: 5 }, () =>
        createMockCardWithMeta({ topicKey: 'only' })
      )

      const config: PracticeSessionConfig = {
        cardCount: 3,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: 5,
      }

      const result = generateSpacedInterleaving(cards, config)
      expect(result).toHaveLength(3)
    })

    it('limits to cardCount', () => {
      const cards: CardWithMeta[] = Array.from({ length: 20 }, (_, i) =>
        createMockCardWithMeta({ topicKey: `topic-${i % 4}`, priorityScore: 100 - i })
      )

      const config: PracticeSessionConfig = {
        cardCount: 8,
        maxConsecutiveSameTopic: 2,
        prioritizeLowMastery: true,
        maxNewCards: 5,
      }

      const result = generateSpacedInterleaving(cards, config)
      expect(result.length).toBeLessThanOrEqual(8)
    })
  })

  describe('getDueCards', () => {
    it('returns cards due today or before', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 86400000)
      const tomorrow = new Date(now.getTime() + 86400000)

      const cards: ReviewCard[] = [
        createMockCard({ due_date: yesterday.toISOString() }),
        createMockCard({ due_date: now.toISOString() }),
        createMockCard({ due_date: tomorrow.toISOString() }),
      ]

      const due = getDueCards(cards, now)
      expect(due).toHaveLength(2)
    })

    it('returns empty when no cards are due', () => {
      const tomorrow = new Date(Date.now() + 86400000)
      const cards: ReviewCard[] = [
        createMockCard({ due_date: tomorrow.toISOString() }),
      ]

      const due = getDueCards(cards)
      expect(due).toHaveLength(0)
    })
  })

  describe('getWeakAreaCards', () => {
    it('returns cards from weak areas (mastery < threshold)', () => {
      const cards: CardWithMeta[] = [
        createMockCardWithMeta({ lessonMastery: 0.2 }),
        createMockCardWithMeta({ lessonMastery: 0.8 }),
        createMockCardWithMeta({ lessonMastery: 0.3 }),
      ]

      const weak = getWeakAreaCards(cards) // default threshold 0.4
      expect(weak).toHaveLength(2)
    })

    it('respects custom threshold', () => {
      const cards: CardWithMeta[] = [
        createMockCardWithMeta({ lessonMastery: 0.5 }),
        createMockCardWithMeta({ lessonMastery: 0.6 }),
        createMockCardWithMeta({ lessonMastery: 0.7 }),
      ]

      const weak = getWeakAreaCards(cards, 0.65)
      expect(weak).toHaveLength(2)
    })
  })

  describe('balanceAcrossCourses', () => {
    it('limits cards per course to maxPerCourse', () => {
      const cards: CardWithMeta[] = [
        createMockCardWithMeta({ course_id: 'c1', priorityScore: 100 }),
        createMockCardWithMeta({ course_id: 'c1', priorityScore: 90 }),
        createMockCardWithMeta({ course_id: 'c1', priorityScore: 80 }),
        createMockCardWithMeta({ course_id: 'c2', priorityScore: 70 }),
        createMockCardWithMeta({ course_id: 'c2', priorityScore: 60 }),
      ]

      const balanced = balanceAcrossCourses(cards, 2)
      const c1Cards = balanced.filter(c => c.course_id === 'c1')
      const c2Cards = balanced.filter(c => c.course_id === 'c2')

      expect(c1Cards).toHaveLength(2)
      expect(c2Cards).toHaveLength(2)
    })

    it('selects highest priority cards per course', () => {
      const cards: CardWithMeta[] = [
        createMockCardWithMeta({ course_id: 'c1', priorityScore: 50 }),
        createMockCardWithMeta({ course_id: 'c1', priorityScore: 100 }),
        createMockCardWithMeta({ course_id: 'c1', priorityScore: 75 }),
      ]

      const balanced = balanceAcrossCourses(cards, 2)
      expect(balanced[0].priorityScore).toBe(100)
      expect(balanced[1].priorityScore).toBe(75)
    })

    it('handles empty input', () => {
      const balanced = balanceAcrossCourses([], 5)
      expect(balanced).toEqual([])
    })
  })
})
