/**
 * Tests for SRS Review API
 * POST /api/srs/review - Submit a card review
 */

import { POST } from '@/app/api/srs/review/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/srs', () => ({
  processReview: jest.fn().mockReturnValue({
    stability: 5.2,
    difficulty: 4.1,
    due_date: new Date('2026-03-15T00:00:00Z'),
    scheduled_days: 5,
    state: 'review',
  }),
}))

jest.mock('@/lib/srs/fsrs-optimizer', () => ({
  getUserFSRSParams: jest.fn().mockResolvedValue({
    requestRetention: 0.9,
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  }),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { evaluateAnswer: { windowMs: 60000, maxRequests: 60 } },
  getIdentifier: jest.fn().mockReturnValue('user-123'),
  getRateLimitHeaders: jest.fn().mockReturnValue({ 'X-RateLimit-Remaining': '10' }),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-AI-003': 429,
      'NS-VAL-002': 400,
      'NS-VAL-001': 400,
      'NS-DB-003': 404,
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
    RATE_LIMITED: 'NS-AI-003',
    INVALID_INPUT: 'NS-VAL-002',
    MISSING_FIELD: 'NS-VAL-001',
    NOT_FOUND: 'NS-DB-003',
    DATABASE_ERROR: 'NS-DB-002',
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

describe('SRS Review API', () => {
  let mockSupabase: any

  const mockCard = {
    id: 'card-1',
    user_id: 'user-123',
    course_id: 'course-1',
    lesson_index: 0,
    step_index: 0,
    card_type: 'recall',
    front: 'What is mitosis?',
    back: 'Cell division process',
    stability: 2.5,
    difficulty: 5,
    elapsed_days: 3,
    scheduled_days: 3,
    reps: 2,
    lapses: 0,
    state: 'review',
    due_date: new Date().toISOString(),
    last_review: new Date(Date.now() - 86400000 * 3).toISOString(),
    concept_ids: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset rate limiter to allow requests (clearAllMocks doesn't reset mockReturnValue)
    const { checkRateLimit } = require('@/lib/rate-limit')
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 })

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
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }

        if (table === 'review_cards') {
          // For card lookup: select().eq().eq().single()
          builder.single.mockResolvedValue({ data: mockCard, error: null })
          // For card update: update().eq().eq() - returns promise
          builder.update.mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          })
        } else if (table === 'review_logs') {
          // For insert: insert() returns promise
          builder.insert.mockResolvedValue({ error: null })
        } else if (table === 'user_srs_settings') {
          builder.single.mockResolvedValue({
            data: { target_retention: 0.9 },
            error: null,
          })
        } else if (table === 'user_performance_state') {
          builder.maybeSingle.mockResolvedValue({
            data: { target_difficulty: 3.0, difficulty_floor: 1.0 },
            error: null,
          })
          builder.update.mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })
        } else if (table === 'user_concept_mastery') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          builder.upsert.mockResolvedValue({ data: null, error: null })
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

      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ card_id: 'card-1', rating: 3 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('returns RATE_LIMITED when rate limit exceeded', async () => {
      const { checkRateLimit } = require('@/lib/rate-limit')
      checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 })

      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ card_id: 'card-1', rating: 3 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
    })
  })

  describe('Validation', () => {
    it('returns error when card_id is missing', async () => {
      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ rating: 3 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('returns error when rating is invalid (5)', async () => {
      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ card_id: 'card-1', rating: 5 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('returns error when both rating and difficulty_feedback are missing', async () => {
      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ card_id: 'card-1' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('returns error for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: 'not valid json{{{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Happy Path', () => {
    it('processes review with FSRS and returns next_due + scheduled_days + new_state', async () => {
      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ card_id: 'card-1', rating: 3 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.next_due).toBe('2026-03-15T00:00:00.000Z')
      expect(data.scheduled_days).toBe(5)
      expect(data.new_state).toBe('review')

      const { processReview } = require('@/lib/srs')
      expect(processReview).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'card-1' }),
        3,
        0.9,
        expect.any(Object)
      )
    })

    it('handles feedback-only request (no rating, just difficulty_feedback)', async () => {
      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({
          card_id: 'card-1',
          difficulty_feedback: 'too_easy',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.feedback_recorded).toBe(true)

      // processReview should NOT be called for feedback-only
      const { processReview } = require('@/lib/srs')
      expect(processReview).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('returns NOT_FOUND when card does not exist', async () => {
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
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'review_cards') {
          builder.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
        } else if (table === 'review_logs') {
          builder.insert.mockResolvedValue({ error: null })
        } else if (table === 'user_srs_settings') {
          builder.single.mockResolvedValue({ data: null, error: null })
        } else if (table === 'user_performance_state') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ card_id: 'nonexistent', rating: 3 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })

    it('returns DATABASE_ERROR when card update fails', async () => {
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
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'review_cards') {
          // Card lookup succeeds
          builder.single.mockResolvedValue({ data: mockCard, error: null })
          // Card update fails
          builder.update.mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
            }),
          })
        } else if (table === 'user_srs_settings') {
          builder.single.mockResolvedValue({
            data: { target_retention: 0.9 },
            error: null,
          })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ card_id: 'card-1', rating: 3 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
