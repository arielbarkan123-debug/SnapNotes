/**
 * Tests for Insights Mistakes API
 * GET /api/insights/mistakes - Fetch cached or generate patterns
 * POST /api/insights/mistakes - Force regeneration
 */

import { GET, POST } from '@/app/api/insights/mistakes/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/insights/mistake-analyzer', () => ({
  analyzeMistakePatterns: jest.fn(),
}))

describe('Insights Mistakes API', () => {
  let mockSupabase: any

  const mockResult = {
    patterns: [
      {
        patternName: 'Sign errors in algebra',
        patternNameHe: 'שגיאות סימן באלגברה',
        description: 'Frequently mishandles negative signs',
        descriptionHe: 'טיפול שגוי בסימנים שליליים',
        severity: 'high',
        frequency: 12,
        examples: [],
        remediation: { lessonTitle: 'Algebra Basics', lessonTitleHe: 'יסודות אלגברה', practiceQuestions: [] },
      },
    ],
    insufficientData: false,
    analyzedCount: 45,
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
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { analyzeMistakePatterns } = require('@/lib/insights/mistake-analyzer')
    analyzeMistakePatterns.mockResolvedValue(mockResult)
  })

  describe('GET /api/insights/mistakes', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
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
      it('returns mistake analysis result', async () => {
        const { analyzeMistakePatterns } = require('@/lib/insights/mistake-analyzer')

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.patterns).toHaveLength(1)
        expect(data.insufficientData).toBe(false)
        expect(data.analyzedCount).toBe(45)
        expect(analyzeMistakePatterns).toHaveBeenCalledWith('user-123')
      })
    })

    describe('Error Handling', () => {
      it('returns 500 when analyzer throws', async () => {
        const { analyzeMistakePatterns } = require('@/lib/insights/mistake-analyzer')
        analyzeMistakePatterns.mockRejectedValue(new Error('Analysis failed'))

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })

  describe('POST /api/insights/mistakes', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('forces regeneration and returns result', async () => {
        const { analyzeMistakePatterns } = require('@/lib/insights/mistake-analyzer')

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.patterns).toHaveLength(1)
        expect(analyzeMistakePatterns).toHaveBeenCalledWith('user-123', true)
      })
    })

    describe('Error Handling', () => {
      it('returns 500 when regeneration fails', async () => {
        const { analyzeMistakePatterns } = require('@/lib/insights/mistake-analyzer')
        analyzeMistakePatterns.mockRejectedValue(new Error('Regeneration failed'))

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
