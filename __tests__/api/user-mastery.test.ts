/**
 * Tests for User Mastery API
 * GET /api/user/mastery - Get concept mastery levels
 * POST /api/user/mastery - Update mastery after learning event
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/user/mastery/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
      'NS-CRS-001': 404,
      'NS-DB-001': 500,
      'NS-DB-020': 500,
      'NS-DB-099': 500,
      'NS-VAL-010': 400,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    COURSE_NOT_FOUND: 'NS-CRS-001',
    QUERY_FAILED: 'NS-DB-001',
    UPDATE_FAILED: 'NS-DB-020',
    DATABASE_UNKNOWN: 'NS-DB-099',
    FIELD_REQUIRED: 'NS-VAL-010',
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('User Mastery API', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'user_concept_mastery') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { mastery_level: 0.5, confidence_score: 0.6, total_exposures: 3, successful_recalls: 2, failed_recalls: 1, stability: 1.5 },
              error: null,
            }),
            then: jest.fn(),
          }
        }
        if (table === 'courses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'course-1' },
              error: null,
            }),
          }
        }
        if (table === 'content_concepts') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [{ concept_id: 'concept-1' }],
              error: null,
            }),
          }
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('GET /api/user/mastery', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/user/mastery')
      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('returns mastery data successfully', async () => {
      const masteryRows = [
        {
          concept_id: 'concept-1',
          mastery_level: 0.8,
          next_review_date: new Date(Date.now() - 86400000).toISOString(),
          concepts: { id: 'concept-1', name: 'Algebra', subject: 'Math', topic: 'Equations', difficulty_level: 2 },
        },
        {
          concept_id: 'concept-2',
          mastery_level: 0.3,
          next_review_date: new Date(Date.now() + 86400000).toISOString(),
          concepts: { id: 'concept-2', name: 'Geometry', subject: 'Math', topic: 'Shapes', difficulty_level: 1 },
        },
      ]

      // The GET handler builds a query chain: .from().select().eq()
      // The terminal call must resolve as a promise with { data, error }
      // Since there's no courseId filter, the chain is: .select(...).eq('user_id', ...)
      // which is then awaited (const { data, error } = await query)
      const thenableResult = {
        data: masteryRows,
        error: null,
        // Make the chain thenable so `await query` works
        then: function (resolve: any) { return resolve({ data: masteryRows, error: null }) },
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_concept_mastery') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue(thenableResult),
            }),
          }
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost/api/user/mastery')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mastery).toBeDefined()
      expect(data.totalConcepts).toBe(2)
      expect(data.masteredConcepts).toBe(1)
      expect(data.weakConcepts).toBe(1)
      expect(data.reviewDue).toBe(1)
    })
  })

  describe('POST /api/user/mastery', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/user/mastery', {
        method: 'POST',
        body: JSON.stringify({ conceptId: 'concept-1', isCorrect: true }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('returns error when conceptId is missing', async () => {
      const request = new NextRequest('http://localhost/api/user/mastery', {
        method: 'POST',
        body: JSON.stringify({ isCorrect: true }),
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('updates mastery successfully for correct answer', async () => {
      // Mock the GET for existing mastery
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_concept_mastery') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                mastery_level: 0.5,
                confidence_score: 0.6,
                total_exposures: 5,
                successful_recalls: 3,
                failed_recalls: 2,
                stability: 2,
              },
              error: null,
            }),
            upsert: jest.fn().mockReturnThis(),
          }
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost/api/user/mastery', {
        method: 'POST',
        body: JSON.stringify({
          conceptId: 'concept-1',
          isCorrect: true,
          usedHint: false,
          responseTimeMs: 3000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.newMastery).toBeGreaterThan(0.5)
      expect(data.masteryDelta).toBeGreaterThan(0)
    })
  })
})
