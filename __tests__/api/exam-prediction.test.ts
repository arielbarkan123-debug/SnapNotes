/**
 * Tests for Exam Prediction API
 * POST /api/exam-prediction - Generate prediction from exam template IDs
 */

import { POST } from '@/app/api/exam-prediction/route'
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

jest.mock('@/lib/exam-prediction/predictor', () => ({
  predictExamTopics: jest.fn(),
}))

describe('Exam Prediction API - POST /api/exam-prediction', () => {
  let mockSupabase: any

  const mockTemplates = [
    { id: 'tpl-1', title: 'Midterm 2025', subject: 'Biology', analysis: { topics: ['Cell Biology', 'Genetics'], difficulty: 'medium', questionTypes: ['multiple_choice'], totalPoints: 100 } },
    { id: 'tpl-2', title: 'Final 2025', subject: 'Biology', analysis: { topics: ['Genetics', 'Evolution'], difficulty: 'hard', questionTypes: ['short_answer'], totalPoints: 120 } },
    { id: 'tpl-3', title: 'Quiz 3', subject: 'Biology', analysis: { topics: ['Cell Biology', 'Ecology'], difficulty: 'easy', questionTypes: ['multiple_choice'], totalPoints: 50 } },
  ]

  const mockPrediction = {
    predictedTopics: [
      { topic: 'Genetics', topicHe: 'גנטיקה', likelihood: 90, avgPoints: 30, difficulty: 'medium', trend: 'stable', appearedIn: 2 },
      { topic: 'Cell Biology', topicHe: 'ביולוגיה תאית', likelihood: 80, avgPoints: 25, difficulty: 'medium', trend: 'stable', appearedIn: 2 },
    ],
    studyPriorities: [
      { topic: 'Genetics', topicHe: 'גנטיקה', priority: 'critical', reason: 'Appears in most exams', reasonHe: 'מופיע ברוב המבחנים', studyMinutes: 60 },
    ],
    confidence: 75,
    basedOn: 3,
    subject: 'Biology',
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
        const builder = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        }

        if (table === 'past_exam_templates') {
          // The in() call is the terminal one before await
          builder.eq.mockResolvedValue({ data: mockTemplates, error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { predictExamTopics } = require('@/lib/exam-prediction/predictor')
    predictExamTopics.mockResolvedValue(mockPrediction)
  })

  describe('Authentication', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({ examTemplateIds: ['tpl-1', 'tpl-2', 'tpl-3'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Validation', () => {
    it('returns 400 if examTemplateIds is missing', async () => {
      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('3')
    })

    it('returns 400 if fewer than 3 IDs provided', async () => {
      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({ examTemplateIds: ['tpl-1', 'tpl-2'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('3')
    })

    it('returns 400 if examTemplateIds is not an array', async () => {
      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({ examTemplateIds: 'not-an-array' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Happy Path', () => {
    it('generates prediction from 3+ exam templates', async () => {
      const { predictExamTopics } = require('@/lib/exam-prediction/predictor')

      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({ examTemplateIds: ['tpl-1', 'tpl-2', 'tpl-3'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.prediction).toEqual(mockPrediction)
      expect(data.prediction.predictedTopics).toHaveLength(2)
      expect(data.prediction.confidence).toBe(75)
      expect(predictExamTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'tpl-1', title: 'Midterm 2025' }),
        ]),
        'en'
      )
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when database fetch fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        }
        if (table === 'past_exam_templates') {
          builder.eq.mockResolvedValue({ data: null, error: { message: 'DB error' } })
        }
        return builder
      })

      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({ examTemplateIds: ['tpl-1', 'tpl-2', 'tpl-3'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('returns 400 when fewer than 3 valid templates found in DB', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        }
        if (table === 'past_exam_templates') {
          builder.eq.mockResolvedValue({
            data: [mockTemplates[0], mockTemplates[1]], // only 2 found
            error: null,
          })
        }
        return builder
      })

      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({ examTemplateIds: ['tpl-1', 'tpl-2', 'tpl-3'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toContain('valid templates found')
    })

    it('returns 500 when predictor throws', async () => {
      const { predictExamTopics } = require('@/lib/exam-prediction/predictor')
      predictExamTopics.mockRejectedValue(new Error('Prediction failed'))

      const request = new NextRequest('http://localhost/api/exam-prediction', {
        method: 'POST',
        body: JSON.stringify({ examTemplateIds: ['tpl-1', 'tpl-2', 'tpl-3'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
