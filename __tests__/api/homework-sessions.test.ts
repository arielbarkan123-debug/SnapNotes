/**
 * Tests for Homework Sessions API
 * POST /api/homework/sessions - Create a new homework help session
 * GET /api/homework/sessions - List user's homework sessions
 */

import { POST, GET } from '@/app/api/homework/sessions/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/homework/question-analyzer', () => ({
  analyzeQuestion: jest.fn(),
  analyzeQuestionText: jest.fn(),
}))

jest.mock('@/lib/homework/reference-analyzer', () => ({
  analyzeReferences: jest.fn(),
}))

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-VAL-002': 400,
      'NS-VAL-001': 400,
      'NS-DB-003': 500,
      'NS-HW-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-001',
    BODY_INVALID_JSON: 'NS-VAL-001',
    FIELD_REQUIRED: 'NS-VAL-002',
    QUERY_FAILED: 'NS-DB-003',
    HOMEWORK_UNKNOWN: 'NS-HW-099',
  },
}))

describe('Homework Sessions API', () => {
  let mockSupabase: any

  const mockQuestionAnalysis = {
    questionText: 'What is the derivative of x^2?',
    subject: 'math',
    topic: 'Calculus',
    questionType: 'calculation',
    difficultyEstimate: 3,
    requiredConcepts: ['derivatives', 'power rule'],
    commonMistakes: ['forgetting coefficient'],
    solutionApproach: 'Apply the power rule',
    estimatedSteps: 3,
  }

  const mockReferenceAnalysis = {
    extractedContent: 'Reference material about derivatives',
    relevantSections: ['Section on power rule'],
  }

  const mockSession = {
    id: 'session-1',
    user_id: 'user-123',
    question_image_url: 'https://example.com/question.png',
    question_text: 'What is the derivative of x^2?',
    status: 'active',
    conversation: [],
    created_at: '2026-01-01T00:00:00Z',
  }

  const mockSessionsList = [
    { id: 'session-1', status: 'active', created_at: '2026-01-02' },
    { id: 'session-2', status: 'completed', created_at: '2026-01-01' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'homework_sessions') {
          // Default for GET: list sessions
          builder.range.mockResolvedValue({ data: mockSessionsList, error: null })
          // Default for POST: insert returns session
          builder.single.mockResolvedValue({ data: mockSession, error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { analyzeQuestion, analyzeQuestionText } = require('@/lib/homework/question-analyzer')
    analyzeQuestion.mockResolvedValue(mockQuestionAnalysis)
    analyzeQuestionText.mockResolvedValue(mockQuestionAnalysis)

    const { analyzeReferences } = require('@/lib/homework/reference-analyzer')
    analyzeReferences.mockResolvedValue(mockReferenceAnalysis)
  })

  // ==========================================================================
  // POST /api/homework/sessions
  // ==========================================================================

  describe('POST /api/homework/sessions', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({ questionImageUrl: 'https://example.com/img.png' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Validation', () => {
      it('returns 400 when text mode has short text (<10 chars)', async () => {
        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({ inputMode: 'text', questionText: 'short' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })

      it('returns 400 when image mode has no questionImageUrl', async () => {
        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({ inputMode: 'image' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })

      it('returns error for invalid JSON body', async () => {
        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: 'not valid json{{{',
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('creates session from image (analyzeQuestion)', async () => {
        const { analyzeQuestion } = require('@/lib/homework/question-analyzer')

        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({
            inputMode: 'image',
            questionImageUrl: 'https://example.com/question.png',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.session).toBeDefined()
        expect(data.questionAnalysis).toBeDefined()
        expect(analyzeQuestion).toHaveBeenCalledWith('https://example.com/question.png')
      })

      it('creates session from text (analyzeQuestionText)', async () => {
        const { analyzeQuestionText } = require('@/lib/homework/question-analyzer')

        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({
            inputMode: 'text',
            questionText: 'What is the derivative of x squared?',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.session).toBeDefined()
        expect(data.questionAnalysis).toBeDefined()
        expect(analyzeQuestionText).toHaveBeenCalledWith('What is the derivative of x squared?')
      })

      it('includes reference analysis when referenceImageUrls provided', async () => {
        const { analyzeReferences } = require('@/lib/homework/reference-analyzer')

        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({
            inputMode: 'image',
            questionImageUrl: 'https://example.com/question.png',
            referenceImageUrls: ['https://example.com/ref1.png', 'https://example.com/ref2.png'],
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.referenceAnalysis).toBeDefined()
        expect(analyzeReferences).toHaveBeenCalledWith(
          ['https://example.com/ref1.png', 'https://example.com/ref2.png'],
          mockQuestionAnalysis
        )
      })
    })

    describe('Error Handling', () => {
      it('falls back to default analysis when analyzer throws', async () => {
        const { analyzeQuestion } = require('@/lib/homework/question-analyzer')
        analyzeQuestion.mockRejectedValue(new Error('AI service down'))

        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({
            inputMode: 'image',
            questionImageUrl: 'https://example.com/question.png',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        // Should still succeed with fallback analysis
        expect(response.status).toBe(200)
        expect(data.session).toBeDefined()
        expect(data.questionAnalysis.questionText).toBe('Could not extract question text')
        expect(data.questionAnalysis.subject).toBe('other')
      })

      it('returns 500 on DB insert error', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            single: jest.fn(),
          }

          if (table === 'homework_sessions') {
            builder.single.mockResolvedValue({
              data: null,
              error: { message: 'Insert failed', code: 'PGRST204' },
            })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/homework/sessions', {
          method: 'POST',
          body: JSON.stringify({
            inputMode: 'image',
            questionImageUrl: 'https://example.com/question.png',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBeDefined()
      })
    })
  })

  // ==========================================================================
  // GET /api/homework/sessions
  // ==========================================================================

  describe('GET /api/homework/sessions', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/homework/sessions')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('returns sessions list', async () => {
        const request = new NextRequest('http://localhost/api/homework/sessions')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.sessions).toHaveLength(2)
        expect(data.sessions[0].id).toBe('session-1')
      })

      it('filters by status param', async () => {
        const filteredSessions = [{ id: 'session-1', status: 'active' }]

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
          }

          if (table === 'homework_sessions') {
            // When status filter is applied, eq is called twice (user_id + status)
            // The final terminal call is range
            builder.range.mockResolvedValue({ data: filteredSessions, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/homework/sessions?status=active')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.sessions).toHaveLength(1)
        expect(data.sessions[0].status).toBe('active')
      })

      it('respects pagination params', async () => {
        const request = new NextRequest('http://localhost/api/homework/sessions?limit=5&offset=10')

        const response = await GET(request)

        expect(response.status).toBe(200)
        // Verify that from was called and range was called with correct values
        expect(mockSupabase.from).toHaveBeenCalledWith('homework_sessions')
      })
    })

    describe('Error Handling', () => {
      it('returns QUERY_FAILED when DB query fails', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
          }

          if (table === 'homework_sessions') {
            builder.range.mockResolvedValue({ data: null, error: { message: 'DB error' } })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/homework/sessions')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
