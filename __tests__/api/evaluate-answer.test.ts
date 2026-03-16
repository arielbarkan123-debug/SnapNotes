/**
 * Tests for Evaluate Answer API
 * POST /api/evaluate-answer - Evaluate a student's answer
 */

import { POST } from '@/app/api/evaluate-answer/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/ai/language', () => ({
  getContentLanguage: jest.fn().mockResolvedValue('en'),
  buildLanguageInstruction: jest.fn().mockReturnValue(''),
  detectSourceLanguage: jest.fn().mockReturnValue(undefined),
  resolveOutputLanguage: jest.fn().mockReturnValue('en'),
  getExplicitToggleFlag: jest.fn().mockResolvedValue(false),
  clearExplicitToggleFlag: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/evaluation/answer-checker', () => ({
  evaluateAnswer: jest.fn(),
}))

jest.mock('@/lib/curriculum/context-builder', () => ({
  buildCurriculumContext: jest.fn().mockResolvedValue({ curriculum: 'test-context' }),
  formatContextForPrompt: jest.fn().mockReturnValue('Formatted curriculum context'),
}))

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
    }
    const status = statusMap[code] || 500
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-001',
  },
}))

describe('Evaluate Answer API', () => {
  let mockSupabase: any

  const mockEvaluationResult = {
    isCorrect: true,
    score: 85,
    feedback: 'Good answer!',
    explanation: 'Your answer correctly identified the key concept.',
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

        if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: null,
            error: null,
          })
        } else if (table === 'user_concept_mastery') {
          builder.single.mockResolvedValue({
            data: null,
            error: null,
          })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { evaluateAnswer } = require('@/lib/evaluation/answer-checker')
    evaluateAnswer.mockResolvedValue(mockEvaluationResult)
  })

  describe('Authentication', () => {
    it('returns 401 when user is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What is DNA?',
          expectedAnswer: 'Deoxyribonucleic acid',
          userAnswer: 'DNA stands for deoxyribonucleic acid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns 401 when auth returns error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' },
      })

      const request = new NextRequest('http://localhost/api/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What is DNA?',
          expectedAnswer: 'Deoxyribonucleic acid',
          userAnswer: 'test',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    it('returns 400 when question is missing', async () => {
      const request = new NextRequest('http://localhost/api/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify({
          expectedAnswer: 'Deoxyribonucleic acid',
          userAnswer: 'test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('returns 400 when expectedAnswer is missing', async () => {
      const request = new NextRequest('http://localhost/api/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What is DNA?',
          userAnswer: 'test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })
  })

  describe('Happy Path', () => {
    it('returns evaluation result with evaluationTimeMs', async () => {
      const request = new NextRequest('http://localhost/api/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What is DNA?',
          expectedAnswer: 'Deoxyribonucleic acid',
          userAnswer: 'DNA stands for deoxyribonucleic acid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isCorrect).toBe(true)
      expect(data.score).toBe(85)
      expect(data.feedback).toBe('Good answer!')
      expect(data.evaluationTimeMs).toBeDefined()
      expect(typeof data.evaluationTimeMs).toBe('number')
    })

    it('passes curriculum context when user has study_system', async () => {
      // Override user_learning_profile to return a study system
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
          upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }

        if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: {
              study_system: 'israeli_bagrut',
              grade: '11',
              subjects: ['biology'],
              subject_levels: { biology: '5_units' },
              exam_format: 'match_real',
              language: 'he',
            },
            error: null,
          })
        } else if (table === 'user_concept_mastery') {
          builder.single.mockResolvedValue({ data: null, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What is DNA?',
          expectedAnswer: 'Deoxyribonucleic acid',
          userAnswer: 'DNA stands for deoxyribonucleic acid',
        }),
      })

      const { getContentLanguage } = require('@/lib/ai/language')
      getContentLanguage.mockResolvedValueOnce('he')

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isCorrect).toBe(true)

      const { evaluateAnswer } = require('@/lib/evaluation/answer-checker')
      expect(evaluateAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          curriculumContext: 'Formatted curriculum context',
          language: 'he',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('returns 500 on unexpected error', async () => {
      const request = new NextRequest('http://localhost/api/evaluate-answer', {
        method: 'POST',
        body: 'invalid json{{{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to evaluate answer')
    })
  })
})
