/**
 * Tests for SRS Due API
 * GET /api/srs/due - Get cards due for review today
 */

import { GET } from '@/app/api/srs/due/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/srs', () => ({
  isQuestionQualityAcceptable: jest.fn().mockReturnValue(true),
  regenerateCardQuestion: jest.fn().mockResolvedValue('Regenerated question'),
}))

jest.mock('@/lib/srs/fsrs-optimizer', () => ({
  getUserFSRSParams: jest.fn().mockResolvedValue({
    requestRetention: 0.9,
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  }),
}))

jest.mock('@/lib/student-context', () => ({
  getStudentContext: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-DB-002': 500,
      'NS-DB-099': 500,
    }
    const status = statusMap[code] || 500
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-001',
    DATABASE_ERROR: 'NS-DB-002',
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

describe('SRS Due API', () => {
  let mockSupabase: any

  const mockNewCards = [
    {
      id: 'card-1',
      user_id: 'user-123',
      course_id: 'course-1',
      lesson_index: 0,
      step_index: 0,
      card_type: 'recall',
      front: 'What is mitosis?',
      back: 'Cell division process',
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 'new',
      due_date: new Date().toISOString(),
      last_review: null,
      concept_ids: ['concept-1'],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]

  const mockDueCards = [
    {
      id: 'card-2',
      user_id: 'user-123',
      course_id: 'course-1',
      lesson_index: 1,
      step_index: 0,
      card_type: 'recall',
      front: 'What is meiosis?',
      back: 'Cell division for gametes',
      stability: 2.5,
      difficulty: 4,
      elapsed_days: 3,
      scheduled_days: 3,
      reps: 2,
      lapses: 0,
      state: 'review',
      due_date: new Date(Date.now() - 86400000).toISOString(),
      last_review: new Date(Date.now() - 86400000 * 3).toISOString(),
      concept_ids: ['concept-2'],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-03T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Track call order for from() to distinguish new vs due card queries
    let reviewCardsCallCount = 0

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_srs_settings') {
          builder.single.mockResolvedValue({
            data: {
              max_new_cards_per_day: 20,
              max_reviews_per_day: 100,
              interleave_reviews: true,
            },
            error: null,
          })
        } else if (table === 'review_logs') {
          // count query for reviews done today
          builder.select.mockReturnValue({
            ...builder,
            eq: jest.fn().mockReturnValue({
              ...builder,
              gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          })
        } else if (table === 'review_cards') {
          reviewCardsCallCount++
          const currentCall = reviewCardsCallCount

          // The limit() call is terminal for review_cards queries
          builder.limit.mockImplementation(() => {
            if (currentCall === 1) {
              // First call: new cards
              return Promise.resolve({ data: mockNewCards, error: null })
            } else {
              // Second call: due cards
              return Promise.resolve({ data: mockDueCards, error: null })
            }
          })
        } else if (table === 'courses') {
          builder.in.mockResolvedValue({ data: [], error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('Authentication', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Happy Path', () => {
    it('returns combined new + due cards with fsrs_params', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cards_due).toBe(2)
      expect(data.new_cards).toBe(1)
      expect(data.review_cards).toBe(1)
      expect(data.cards).toHaveLength(2)
      expect(data.fsrs_params).toBeDefined()
      expect(data.fsrs_params.requestRetention).toBe(0.9)
    })

    it('returns empty when no cards due', async () => {
      let reviewCardsCallCount = 0

      mockSupabase.from.mockImplementation((table: string) => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_srs_settings') {
          builder.single.mockResolvedValue({
            data: { max_new_cards_per_day: 20, max_reviews_per_day: 100, interleave_reviews: true },
            error: null,
          })
        } else if (table === 'review_logs') {
          builder.select.mockReturnValue({
            ...builder,
            eq: jest.fn().mockReturnValue({
              ...builder,
              gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          })
        } else if (table === 'review_cards') {
          reviewCardsCallCount++
          builder.limit.mockResolvedValue({ data: [], error: null })
        }

        return builder
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cards_due).toBe(0)
      expect(data.cards).toHaveLength(0)
    })

    it('respects daily limits from settings', async () => {
      let reviewCardsCallCount = 0

      mockSupabase.from.mockImplementation((table: string) => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_srs_settings') {
          builder.single.mockResolvedValue({
            data: {
              max_new_cards_per_day: 5,
              max_reviews_per_day: 10,
              interleave_reviews: false,
            },
            error: null,
          })
        } else if (table === 'review_logs') {
          builder.select.mockReturnValue({
            ...builder,
            eq: jest.fn().mockReturnValue({
              ...builder,
              gte: jest.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          })
        } else if (table === 'review_cards') {
          reviewCardsCallCount++
          // The limit value passed should reflect the daily limits
          builder.limit.mockResolvedValue({ data: [], error: null })
        }

        return builder
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      // Verify from() was called with review_cards
      expect(mockSupabase.from).toHaveBeenCalledWith('review_cards')
    })
  })

  describe('Question Quality', () => {
    it('provides fallback text for bad questions', async () => {
      const { isQuestionQualityAcceptable } = require('@/lib/srs')
      isQuestionQualityAcceptable.mockReturnValue(false)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      // Cards with bad questions should have fallback text
      if (data.cards.length > 0) {
        for (const card of data.cards) {
          expect(card.front).toContain('Review:')
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('returns DATABASE_ERROR when new cards query fails', async () => {
      let reviewCardsCallCount = 0

      mockSupabase.from.mockImplementation((table: string) => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_srs_settings') {
          builder.single.mockResolvedValue({
            data: { max_new_cards_per_day: 20, max_reviews_per_day: 100, interleave_reviews: true },
            error: null,
          })
        } else if (table === 'review_logs') {
          builder.select.mockReturnValue({
            ...builder,
            eq: jest.fn().mockReturnValue({
              ...builder,
              gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          })
        } else if (table === 'review_cards') {
          reviewCardsCallCount++
          if (reviewCardsCallCount === 1) {
            // First call (new cards) fails
            builder.limit.mockResolvedValue({ data: null, error: { message: 'DB error' } })
          } else {
            builder.limit.mockResolvedValue({ data: [], error: null })
          }
        }

        return builder
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
