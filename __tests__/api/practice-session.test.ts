/**
 * Tests for Practice Session API
 * GET /api/practice/session - Get user's practice sessions and stats
 * POST /api/practice/session - Create a new practice session
 */

import { GET, POST } from '@/app/api/practice/session/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/practice', () => ({
  createPracticeSession: jest.fn(),
  getActiveSessions: jest.fn(),
  getRecentSessions: jest.fn(),
  getUserPracticeStats: jest.fn(),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-VAL-099': 400,
      'NS-DB-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-001',
    VALIDATION_ERROR: 'NS-VAL-099',
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

describe('Practice Session API', () => {
  let mockSupabase: any

  const mockStats = {
    totalSessions: 10,
    totalQuestions: 50,
    correctAnswers: 40,
    accuracy: 0.8,
  }

  const mockActiveSessions = [
    { id: 'ps-1', session_type: 'targeted', status: 'active', created_at: '2026-01-01' },
  ]

  const mockRecentSessions = [
    { id: 'ps-2', session_type: 'mixed', status: 'completed', created_at: '2026-01-02' },
    { id: 'ps-3', session_type: 'quick', status: 'completed', created_at: '2026-01-01' },
  ]

  const mockCreatedSession = {
    id: 'ps-new',
    session_type: 'targeted',
    status: 'active',
    questions: [{ id: 'q-1', text: 'What is 2+2?' }],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { createPracticeSession, getActiveSessions, getRecentSessions, getUserPracticeStats } =
      require('@/lib/practice')
    getUserPracticeStats.mockResolvedValue(mockStats)
    getActiveSessions.mockResolvedValue(mockActiveSessions)
    getRecentSessions.mockResolvedValue(mockRecentSessions)
    createPracticeSession.mockResolvedValue(mockCreatedSession)
  })

  // ==========================================================================
  // GET /api/practice/session
  // ==========================================================================

  describe('GET /api/practice/session', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/practice/session')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('returns stats by default', async () => {
        const { getUserPracticeStats } = require('@/lib/practice')

        const request = new NextRequest('http://localhost/api/practice/session')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.stats).toEqual(mockStats)
        expect(getUserPracticeStats).toHaveBeenCalledWith('user-123')
      })

      it('returns active sessions when include=active', async () => {
        const { getActiveSessions } = require('@/lib/practice')

        const request = new NextRequest('http://localhost/api/practice/session?include=active')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.activeSessions).toEqual(mockActiveSessions)
        expect(getActiveSessions).toHaveBeenCalledWith('user-123')
      })

      it('returns recent sessions when include=recent', async () => {
        const { getRecentSessions } = require('@/lib/practice')

        const request = new NextRequest('http://localhost/api/practice/session?include=recent')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.recentSessions).toEqual(mockRecentSessions)
        expect(getRecentSessions).toHaveBeenCalledWith('user-123', 10)
      })
    })
  })

  // ==========================================================================
  // POST /api/practice/session
  // ==========================================================================

  describe('POST /api/practice/session', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/practice/session', {
          method: 'POST',
          body: JSON.stringify({ sessionType: 'targeted', courseId: 'course-1' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Validation', () => {
      it('returns VALIDATION_ERROR for invalid session type', async () => {
        const request = new NextRequest('http://localhost/api/practice/session', {
          method: 'POST',
          body: JSON.stringify({ sessionType: 'invalid_type', courseId: 'course-1' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('creates a targeted session', async () => {
        const { createPracticeSession } = require('@/lib/practice')

        const request = new NextRequest('http://localhost/api/practice/session', {
          method: 'POST',
          body: JSON.stringify({
            sessionType: 'targeted',
            courseId: 'course-1',
            targetConceptIds: ['concept-1'],
            questionCount: 10,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.id).toBe('ps-new')
        expect(createPracticeSession).toHaveBeenCalledWith('user-123', expect.objectContaining({
          sessionType: 'targeted',
          courseId: 'course-1',
          targetConceptIds: ['concept-1'],
          questionCount: 10,
        }))
      })

      it('creates session with homework error context', async () => {
        const { createPracticeSession } = require('@/lib/practice')

        const request = new NextRequest('http://localhost/api/practice/session', {
          method: 'POST',
          body: JSON.stringify({
            sessionType: 'targeted',
            courseId: 'course-1',
            sourceType: 'homework_error',
            errorContext: { topic: 'derivatives', errorType: 'concept_gap' },
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(createPracticeSession).toHaveBeenCalledWith('user-123', expect.objectContaining({
          sessionType: 'targeted',
          sourceType: 'homework_error',
          errorContext: { topic: 'derivatives', errorType: 'concept_gap' },
          targetConceptIds: ['homework_error:derivatives'],
        }))
      })
    })

    describe('Error Handling', () => {
      it('returns VALIDATION_ERROR for "No questions available"', async () => {
        const { createPracticeSession } = require('@/lib/practice')
        createPracticeSession.mockRejectedValue(new Error('No questions available for this session'))

        const request = new NextRequest('http://localhost/api/practice/session', {
          method: 'POST',
          body: JSON.stringify({ sessionType: 'targeted', courseId: 'course-1' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })

      it('returns INTERNAL_ERROR for unexpected errors', async () => {
        const { createPracticeSession } = require('@/lib/practice')
        createPracticeSession.mockRejectedValue(new Error('Something went wrong'))

        const request = new NextRequest('http://localhost/api/practice/session', {
          method: 'POST',
          body: JSON.stringify({ sessionType: 'targeted', courseId: 'course-1' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
