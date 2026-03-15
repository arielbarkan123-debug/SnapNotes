/**
 * Tests for Courses [id] API
 * GET /api/courses/[id] - Fetch a single course by ID
 * DELETE /api/courses/[id] - Delete a course and all associated data
 * PATCH /api/courses/[id] - Add material to an existing course
 */

import { GET, DELETE, PATCH } from '@/app/api/courses/[id]/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}))

jest.mock('@/lib/ai', () => ({
  generateCourseFromImage: jest.fn(),
  generateCourseFromMultipleImagesProgressive: jest.fn(),
  generateCourseFromText: jest.fn(),
  generateInitialCourse: jest.fn(),
}))

jest.mock('@/lib/srs', () => ({
  generateCardsFromCourse: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: { generateCourse: { maxRequests: 10, windowMs: 60000 } },
  getIdentifier: jest.fn().mockReturnValue('user-123-rate-id'),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-VAL-002': 400,
      'NS-DB-003': 500,
      'NS-DB-099': 500,
      'NS-REC-001': 404,
      'NS-AUTH-006': 403,
      'NS-AI-007': 429,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-001',
    MISSING_FIELD: 'NS-VAL-002',
    NOT_FOUND: 'NS-REC-001',
    FORBIDDEN: 'NS-AUTH-006',
    DATABASE_ERROR: 'NS-DB-003',
    INTERNAL_ERROR: 'NS-DB-099',
    RATE_LIMITED: 'NS-AI-007',
  },
  logError: jest.fn(),
}))

describe('Courses [id] API', () => {
  let mockSupabase: any
  let mockServiceClient: any

  const mockCourse = {
    id: 'course-123',
    user_id: 'user-123',
    title: 'Biology 101',
    original_image_url: 'https://example.com/img.png',
    source_type: 'image',
    generated_course: {
      lessons: [
        { title: 'Cell Biology', content: 'Cells are building blocks...' },
      ],
    },
    extracted_content: 'Original extracted content',
    intensity_mode: 'standard',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  const mockParams = { params: Promise.resolve({ id: 'course-123' }) }

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
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'courses') {
          builder.maybeSingle.mockResolvedValue({ data: mockCourse, error: null })
          builder.single.mockResolvedValue({ data: mockCourse, error: null })
        } else if (table === 'user_learning_profile') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
        } else if (table === 'review_cards') {
          // For DELETE: select card ids
          builder.eq.mockReturnThis()
          builder.select.mockReturnThis()
        }

        return builder
      }),
    }

    mockServiceClient = {
      from: jest.fn().mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
        }

        if (table === 'review_cards') {
          builder.eq.mockResolvedValue({ data: [], error: null })
          builder.select.mockReturnThis()
        }
        if (table === 'courses') {
          builder.eq.mockResolvedValue({ data: null, error: null })
        }

        return builder
      }),
      storage: {
        from: jest.fn().mockReturnValue({
          remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      },
    }

    const { createClient, createServiceClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
    createServiceClient.mockResolvedValue(mockServiceClient)

    const { checkRateLimit } = require('@/lib/rate-limit')
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 })

    const { generateCourseFromText } = require('@/lib/ai')
    generateCourseFromText.mockResolvedValue({
      generatedCourse: {
        lessons: [{ title: 'New Lesson', content: 'New content...' }],
      },
      extractionRawText: 'New text content',
    })

    const { generateCardsFromCourse } = require('@/lib/srs')
    generateCardsFromCourse.mockResolvedValue([])
  })

  // ==========================================================================
  // GET /api/courses/[id]
  // ==========================================================================

  describe('GET /api/courses/[id]', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/courses/course-123')

        const response = await GET(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('returns course by ID', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-123')

        const response = await GET(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.course.id).toBe('course-123')
        expect(data.course.title).toBe('Biology 101')
      })
    })

    describe('Error Handling', () => {
      it('returns NOT_FOUND when course does not exist', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/nonexistent')

        const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
      })

      it('returns FORBIDDEN when course belongs to different user', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.maybeSingle.mockResolvedValue({
              data: { ...mockCourse, user_id: 'other-user-456' },
              error: null,
            })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-123')

        const response = await GET(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.success).toBe(false)
      })
    })
  })

  // ==========================================================================
  // DELETE /api/courses/[id]
  // ==========================================================================

  describe('DELETE /api/courses/[id]', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'DELETE',
        })

        const response = await DELETE(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('deletes course and associated data', async () => {
        // Mock the ownership check (regular client)
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.maybeSingle.mockResolvedValue({
              data: { id: 'course-123', user_id: 'user-123', original_image_url: null },
              error: null,
            })
          }

          return builder
        })

        // Mock service client for actual deletions
        mockServiceClient.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
          }

          if (table === 'review_cards') {
            // select returns cards list
            builder.eq.mockResolvedValue({ data: [{ id: 'card-1' }], error: null })
          } else {
            // delete operations
            builder.eq.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'DELETE',
        })

        const response = await DELETE(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('Error Handling', () => {
      it('returns NOT_FOUND when course does not exist', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/nonexistent', {
          method: 'DELETE',
        })

        const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) })
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
      })

      it('returns FORBIDDEN when course.user_id !== user.id', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.maybeSingle.mockResolvedValue({
              data: { id: 'course-123', user_id: 'other-user-456', original_image_url: null },
              error: null,
            })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'DELETE',
        })

        const response = await DELETE(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.success).toBe(false)
      })
    })
  })

  // ==========================================================================
  // PATCH /api/courses/[id]
  // ==========================================================================

  describe('PATCH /api/courses/[id]', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'PATCH',
          body: JSON.stringify({ textContent: 'Some new content for the course' }),
        })

        const response = await PATCH(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Rate Limiting', () => {
      it('returns RATE_LIMITED when rate limit exceeded', async () => {
        const { checkRateLimit } = require('@/lib/rate-limit')
        checkRateLimit.mockReturnValue({ allowed: false, remaining: 0 })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'PATCH',
          body: JSON.stringify({ textContent: 'Some new content for the course' }),
        })

        const response = await PATCH(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(429)
        expect(data.success).toBe(false)
      })
    })

    describe('Validation', () => {
      it('returns error when no content provided', async () => {
        // Must mock the course fetch to succeed first (PATCH fetches course before validating content)
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.maybeSingle.mockResolvedValue({ data: mockCourse, error: null })
          } else if (table === 'user_learning_profile') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'PATCH',
          body: JSON.stringify({}),
        })

        const response = await PATCH(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('adds text content to existing course', async () => {
        const { generateCourseFromText } = require('@/lib/ai')
        generateCourseFromText.mockResolvedValue({
          generatedCourse: {
            lessons: [{ title: 'New Lesson', content: 'New lesson content' }],
          },
        })

        const { generateCardsFromCourse } = require('@/lib/srs')
        generateCardsFromCourse.mockResolvedValue([])

        // Track which call to 'courses' table we're on
        let coursesCallCount = 0

        // Mock the full flow: fetch course, fetch profile, update course
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            coursesCallCount++
            if (coursesCallCount <= 1) {
              // First call: SELECT for ownership check → .maybeSingle() is terminal
              builder.maybeSingle.mockResolvedValue({ data: mockCourse, error: null })
            } else {
              // Second call: UPDATE → .update({}).eq() is terminal
              builder.eq.mockResolvedValue({ error: null })
            }
          } else if (table === 'user_learning_profile') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          } else if (table === 'review_cards') {
            builder.insert.mockResolvedValue({ error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'PATCH',
          body: JSON.stringify({ textContent: 'Here is some new material about genetics and DNA replication' }),
        })

        const response = await PATCH(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.newLessonsCount).toBe(1)
        expect(data.totalLessons).toBe(2) // 1 existing + 1 new
        expect(generateCourseFromText).toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      it('returns NOT_FOUND when course does not exist', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/nonexistent', {
          method: 'PATCH',
          body: JSON.stringify({ textContent: 'New content for the course' }),
        })

        const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) })
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
      })

      it('returns DATABASE_ERROR when update fails', async () => {
        const { generateCourseFromText } = require('@/lib/ai')
        generateCourseFromText.mockResolvedValue({
          generatedCourse: {
            lessons: [{ title: 'New Lesson', content: 'Content' }],
          },
        })

        let callCount = 0
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            callCount++
            if (callCount === 1) {
              // First call: fetch course for ownership check
              builder.maybeSingle.mockResolvedValue({ data: mockCourse, error: null })
            } else {
              // Second call: update fails
              builder.eq.mockResolvedValue({ data: null, error: { message: 'Update failed' } })
            }
          } else if (table === 'user_learning_profile') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-123', {
          method: 'PATCH',
          body: JSON.stringify({ textContent: 'New text content for the course to process' }),
        })

        const response = await PATCH(request, mockParams)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
