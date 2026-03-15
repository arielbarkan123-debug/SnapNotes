/**
 * Tests for Chat API
 * POST /api/chat - AI Chat Tutor
 */

import { POST } from '@/app/api/chat/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn(() => ({
    messages: { create: mockCreate },
  }))
})

jest.mock('@/lib/ai/claude', () => ({
  AI_MODEL: 'claude-3-haiku-20240307',
}))

jest.mock('@/lib/env', () => ({
  getAnthropicApiKey: jest.fn().mockReturnValue('test-api-key'),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-AI-003': 429,
      'NS-VAL-002': 400,
      'NS-AI-099': 500,
      'NS-API-001': 503,
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
    AI_PROCESSING_FAILED: 'NS-AI-099',
    AI_SERVICE_UNAVAILABLE: 'NS-API-001',
  },
  mapClaudeAPIError: jest.fn().mockReturnValue({ code: 'NS-AI-099', message: 'AI error' }),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { chat: { windowMs: 60000, maxRequests: 20 } },
  getIdentifier: jest.fn().mockReturnValue('user-123'),
  getRateLimitHeaders: jest.fn().mockReturnValue({ 'X-RateLimit-Remaining': '10' }),
}))

jest.mock('@/lib/curriculum/context-builder', () => ({
  buildChatContext: jest.fn().mockResolvedValue({ curriculum: 'test' }),
  formatContextForPrompt: jest.fn().mockReturnValue('Curriculum context here'),
}))

jest.mock('@/lib/student-context', () => ({
  getStudentContext: jest.fn().mockResolvedValue(null),
  generateDirectives: jest.fn().mockReturnValue({
    homework: {
      studentAbilitySummary: 'Average student',
      explanationDepth: 'medium',
      preferredExplanationStyle: 'visual',
      scaffoldingLevel: 3,
      anticipatedMisconceptions: [],
      knownPrerequisiteGaps: [],
    },
  }),
}))

describe('Chat API', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Set ANTHROPIC_API_KEY for the route's internal check
    process.env.ANTHROPIC_API_KEY = 'test-api-key'

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
        }

        if (table === 'courses') {
          builder.maybeSingle.mockResolvedValue({
            data: {
              title: 'Biology 101',
              generated_course: {
                lessons: [
                  { title: 'Cell Biology', steps: [{ type: 'explanation', content: 'Cells are building blocks' }] },
                ],
              },
            },
            error: null,
          })
        } else if (table === 'user_learning_profile') {
          builder.maybeSingle.mockResolvedValue({
            data: null,
            error: null,
          })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    // Default Claude response
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AI response about biology' }],
    })
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  describe('Authentication', () => {
    it('returns 401 when user is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('returns error when rate limit exceeded', async () => {
      const { checkRateLimit } = require('@/lib/rate-limit')
      checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 })

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
    })
  })

  describe('Validation', () => {
    it('returns error when message is missing', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('returns error when message exceeds 4000 chars', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'a'.repeat(4001) }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Happy Path', () => {
    it('returns AI response text from Claude', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ courseId: 'course-1', message: 'What is a cell?' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('AI response about biology')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          system: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'What is a cell?' }),
          ]),
        })
      )
    })

    it('works without courseId (general chat)', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Explain photosynthesis' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('AI response about biology')
    })
  })

  describe('Error Handling', () => {
    it('returns AI_PROCESSING_FAILED when AI response content is empty', async () => {
      mockCreate.mockResolvedValue({
        content: [],
      })

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('catches and maps Claude API errors', async () => {
      mockCreate.mockRejectedValue(new Error('Claude API overloaded'))

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      const { mapClaudeAPIError } = require('@/lib/api/errors')
      expect(mapClaudeAPIError).toHaveBeenCalled()
    })
  })
})
