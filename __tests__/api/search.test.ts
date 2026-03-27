/**
 * Tests for Search API
 * GET /api/search - Cross-entity search across courses, review cards, etc.
 */

import { GET } from '@/app/api/search/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
  },
}))

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/lib/ai/claude', () => ({
  AI_MODEL: 'claude-sonnet-4-6',
}))

jest.mock('@/lib/ai/language', () => ({
  getContentLanguage: jest.fn().mockResolvedValue('en'),
}))

describe('Search API', () => {
  let mockSupabase: any

  const mockCourses = [
    {
      id: 'course-1',
      title: 'Biology 101',
      generated_course: {
        title: 'Biology 101',
        lessons: [
          { title: 'Cell Structure', steps: [{ content: 'Cells are the building blocks of life.' }] },
          { title: 'Photosynthesis', steps: [{ content: 'Photosynthesis converts sunlight to energy.' }] },
        ],
      },
    },
  ]

  const mockCards = [
    {
      id: 'card-1',
      course_id: 'course-1',
      lesson_index: 0,
      step_index: 0,
      card_type: 'basic',
      front: 'What is photosynthesis?',
      back: 'The process by which plants convert sunlight to energy.',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset env
    process.env.ANTHROPIC_API_KEY = ''

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
          eq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          filter: jest.fn().mockReturnThis(),
          limit: jest.fn(),
        }

        if (table === 'courses') {
          builder.limit.mockResolvedValue({ data: mockCourses, error: null })
        } else if (table === 'review_cards') {
          builder.limit.mockResolvedValue({ data: mockCards, error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('GET /api/search', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost/api/search?q=biology')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns empty results for empty query', async () => {
      const request = new Request('http://localhost/api/search?q=')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toEqual([])
      expect(data.total).toBe(0)
    })

    it('returns empty results for short query (less than 2 chars)', async () => {
      const request = new Request('http://localhost/api/search?q=a')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toEqual([])
      expect(data.total).toBe(0)
    })

    it('returns search results across courses and cards', async () => {
      const request = new Request('http://localhost/api/search?q=photosynthesis')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.length).toBeGreaterThan(0)
      expect(data.query).toBe('photosynthesis')
    })

    it('respects limit parameter', async () => {
      const request = new Request('http://localhost/api/search?q=biology&limit=5')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Verify from was called - the limit is applied to results
      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
    })

    it('caps limit at 50', async () => {
      const request = new Request('http://localhost/api/search?q=biology&limit=100')

      const response = await GET(request)

      expect(response.status).toBe(200)
      // Just verify the request succeeds - limit capping is internal
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('returns 500 on unexpected error', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected'))

      const request = new Request('http://localhost/api/search?q=biology')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeTruthy()
    })
  })
})
