/**
 * Tests for Deep Practice API
 * GET /api/deep-practice - Fetch progress
 * POST /api/deep-practice - Save progress
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/deep-practice/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('Deep Practice API', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation(() => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          upsert: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'dp-1',
              user_id: 'user-123',
              course_id: 'course-1',
              lesson_index: 0,
              concept_id: 'lesson_0',
              current_mastery: 0.6,
              problems_attempted: 5,
              problems_correct: 3,
              completed: false,
            },
            error: null,
          }),
        }
        // For GET queries that resolve as array
        builder.eq.mockImplementation(function (this: any) {
          return this
        })
        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('POST /api/deep-practice', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/deep-practice', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-1',
          lessonIndex: 0,
          conceptId: 'c1',
          mastery: 0.5,
          problemsAttempted: 3,
          problemsCorrect: 2,
          completed: false,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('returns 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/deep-practice', {
        method: 'POST',
        body: JSON.stringify({ mastery: 0.5 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('saves progress successfully', async () => {
      const request = new NextRequest('http://localhost/api/deep-practice', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-1',
          lessonIndex: 0,
          conceptId: 'concept-1',
          mastery: 0.7,
          problemsAttempted: 5,
          problemsCorrect: 4,
          completed: false,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.progress).toBeDefined()
    })

    it('returns 500 when database upsert fails', async () => {
      mockSupabase.from.mockImplementation(() => ({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      }))

      const request = new NextRequest('http://localhost/api/deep-practice', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-1',
          lessonIndex: 0,
          conceptId: 'c1',
          mastery: 0.5,
          problemsAttempted: 3,
          problemsCorrect: 2,
          completed: false,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/deep-practice', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/deep-practice?courseId=course-1')
      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('returns 400 when courseId is missing', async () => {
      const request = new NextRequest('http://localhost/api/deep-practice')
      const response = await GET(request)
      expect(response.status).toBe(400)
    })

    it('returns progress data successfully', async () => {
      const progressData = [
        { id: 'dp-1', course_id: 'course-1', lesson_index: 0, current_mastery: 0.6 },
      ]

      mockSupabase.from.mockImplementation(() => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        }
        // The terminal eq call resolves the query
        let eqCallCount = 0
        builder.eq.mockImplementation(function (this: any) {
          eqCallCount++
          // After 3 eq calls (user_id, course_id, lesson_index), resolve
          if (eqCallCount >= 3) {
            return Promise.resolve({ data: progressData, error: null })
          }
          return this
        })
        return builder
      })

      const request = new NextRequest('http://localhost/api/deep-practice?courseId=course-1&lessonIndex=0')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
