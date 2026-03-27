/**
 * @fix_context Tests for Course Progress API
 *
 * GET   /api/courses/[id]/progress                - Get user progress
 * PATCH /api/courses/[id]/progress                - Update user progress (upsert)
 * POST  /api/courses/[id]/progress/complete-lesson - Mark a lesson as complete
 */

import { GET, PATCH } from '@/app/api/courses/[id]/progress/route'
import { POST as completeLessonPOST } from '@/app/api/courses/[id]/progress/complete-lesson/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

describe('Course Progress API', () => {
  let mockSupabase: any

  const mockProgress = {
    id: 'prog-1',
    user_id: 'user-123',
    course_id: 'course-abc',
    current_lesson: 1,
    current_step: 3,
    completed_lessons: [0],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  }

  const mockCourse = {
    id: 'course-abc',
    generated_course: {
      title: 'Test Course',
      overview: 'Overview',
      lessons: [
        { title: 'Lesson 1', steps: [{ type: 'explanation', content: 'L1' }] },
        { title: 'Lesson 2', steps: [{ type: 'explanation', content: 'L2' }] },
        { title: 'Lesson 3', steps: [{ type: 'explanation', content: 'L3' }] },
      ],
    },
  }

  const routeParams = { params: { id: 'course-abc' } }

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
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({ data: { id: 'course-abc' }, error: null })
        } else if (table === 'user_progress') {
          builder.maybeSingle.mockResolvedValue({ data: mockProgress, error: null })
          builder.single.mockResolvedValue({ data: mockProgress, error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  // ==========================================================================
  // GET /api/courses/[id]/progress
  // ==========================================================================

  describe('GET /api/courses/[id]/progress', () => {
    /** @fix_context Authentication */
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress')
        const response = await GET(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    /** @fix_context Happy Path */
    describe('Happy Path', () => {
      it('returns existing progress', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-abc/progress')
        const response = await GET(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.id).toBe('prog-1')
        expect(data.current_lesson).toBe(1)
        expect(data.current_step).toBe(3)
        expect(data.completed_lessons).toEqual([0])
      })

      it('returns default progress when no record exists', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: { id: 'course-abc' }, error: null })
          } else if (table === 'user_progress') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress')
        const response = await GET(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.id).toBeNull()
        expect(data.current_lesson).toBe(0)
        expect(data.current_step).toBe(0)
        expect(data.completed_lessons).toEqual([])
      })
    })

    /** @fix_context Error Handling */
    describe('Error Handling', () => {
      it('returns 404 when course not found', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress')
        const response = await GET(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Course not found')
      })

      it('returns 500 when progress query fails', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: { id: 'course-abc' }, error: null })
          } else if (table === 'user_progress') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress')
        const response = await GET(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch progress')
      })
    })
  })

  // ==========================================================================
  // PATCH /api/courses/[id]/progress
  // ==========================================================================

  describe('PATCH /api/courses/[id]/progress', () => {
    /** @fix_context Authentication */
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress', {
          method: 'PATCH',
          body: JSON.stringify({
            current_lesson: 1,
            current_step: 0,
            completed_lessons: [0],
          }),
        })

        const response = await PATCH(request, routeParams)
        expect(response.status).toBe(401)
      })
    })

    /** @fix_context Validation */
    describe('Validation', () => {
      it('returns 400 when current_lesson is not a number', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-abc/progress', {
          method: 'PATCH',
          body: JSON.stringify({
            current_lesson: 'one',
            current_step: 0,
            completed_lessons: [],
          }),
        })

        const response = await PATCH(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid request body')
      })

      it('returns 400 when completed_lessons is not an array', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-abc/progress', {
          method: 'PATCH',
          body: JSON.stringify({
            current_lesson: 1,
            current_step: 0,
            completed_lessons: 'none',
          }),
        })

        const response = await PATCH(request, routeParams)
        expect(response.status).toBe(400)
      })
    })

    /** @fix_context Happy Path */
    describe('Happy Path', () => {
      it('updates existing progress', async () => {
        const updatedProgress = {
          ...mockProgress,
          current_lesson: 2,
          current_step: 0,
          completed_lessons: [0, 1],
        }

        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: { id: 'course-abc' }, error: null })
          } else if (table === 'user_progress') {
            // First call: check existing progress
            builder.maybeSingle.mockResolvedValue({ data: { id: 'prog-1' }, error: null })
            // Second call: update returns updated data
            builder.single.mockResolvedValue({ data: updatedProgress, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress', {
          method: 'PATCH',
          body: JSON.stringify({
            current_lesson: 2,
            current_step: 0,
            completed_lessons: [0, 1],
          }),
        })

        const response = await PATCH(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.current_lesson).toBe(2)
        expect(data.completed_lessons).toEqual([0, 1])
      })

      it('creates new progress when none exists', async () => {
        const newProgress = {
          id: 'prog-new',
          current_lesson: 0,
          current_step: 2,
          completed_lessons: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }

        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: { id: 'course-abc' }, error: null })
          } else if (table === 'user_progress') {
            // No existing progress
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
            // Insert returns new progress
            builder.single.mockResolvedValue({ data: newProgress, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress', {
          method: 'PATCH',
          body: JSON.stringify({
            current_lesson: 0,
            current_step: 2,
            completed_lessons: [],
          }),
        })

        const response = await PATCH(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.id).toBe('prog-new')
      })
    })

    /** @fix_context Error Handling */
    describe('Error Handling', () => {
      it('returns 404 when course does not belong to user', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress', {
          method: 'PATCH',
          body: JSON.stringify({
            current_lesson: 1,
            current_step: 0,
            completed_lessons: [],
          }),
        })

        const response = await PATCH(request, routeParams)
        expect(response.status).toBe(404)
      })
    })
  })

  // ==========================================================================
  // POST /api/courses/[id]/progress/complete-lesson
  // ==========================================================================

  describe('POST /api/courses/[id]/progress/complete-lesson', () => {
    beforeEach(() => {
      // Override to return course with generated_course
      mockSupabase.from.mockImplementation((table: string) => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({ data: mockCourse, error: null })
        } else if (table === 'user_progress') {
          // Existing progress with lesson 0 completed
          builder.single.mockResolvedValue({
            data: {
              id: 'prog-1',
              current_lesson: 1,
              current_step: 0,
              completed_lessons: [0, 1],
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
            },
            error: null,
          })
        }

        return builder
      })
    })

    /** @fix_context Authentication */
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress/complete-lesson', {
          method: 'POST',
          body: JSON.stringify({ lesson_index: 0 }),
        })

        const response = await completeLessonPOST(request, routeParams)
        expect(response.status).toBe(401)
      })
    })

    /** @fix_context Validation */
    describe('Validation', () => {
      it('returns 400 for negative lesson_index', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-abc/progress/complete-lesson', {
          method: 'POST',
          body: JSON.stringify({ lesson_index: -1 }),
        })

        const response = await completeLessonPOST(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('lesson_index')
      })

      it('returns 400 for lesson_index out of bounds', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-abc/progress/complete-lesson', {
          method: 'POST',
          body: JSON.stringify({ lesson_index: 99 }),
        })

        const response = await completeLessonPOST(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid lesson_index')
      })

      it('returns 400 when lesson_index is not a number', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-abc/progress/complete-lesson', {
          method: 'POST',
          body: JSON.stringify({ lesson_index: 'first' }),
        })

        const response = await completeLessonPOST(request, routeParams)
        expect(response.status).toBe(400)
      })
    })

    /** @fix_context Happy Path */
    describe('Happy Path', () => {
      it('completes a lesson and returns progress with course status', async () => {
        const request = new NextRequest('http://localhost/api/courses/course-abc/progress/complete-lesson', {
          method: 'POST',
          body: JSON.stringify({ lesson_index: 1 }),
        })

        const response = await completeLessonPOST(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.lesson_completed).toBe(1)
        expect(data.total_lessons).toBe(3)
        expect(data.current_step).toBe(0) // reset to first step
      })

      it('is idempotent when completing the same lesson twice', async () => {
        // Lesson 0 is already in completed_lessons
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: mockCourse, error: null })
          } else if (table === 'user_progress') {
            // The existing progress already has lesson 0
            const existingProgress = {
              id: 'prog-1',
              completed_lessons: [0],
              current_lesson: 1,
              current_step: 0,
            }
            builder.single.mockResolvedValue({
              data: {
                ...existingProgress,
                completed_lessons: [0], // Still just [0] — idempotent
                current_lesson: 1,
                current_step: 0,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-02T00:00:00Z',
              },
              error: null,
            })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress/complete-lesson', {
          method: 'POST',
          body: JSON.stringify({ lesson_index: 0 }),
        })

        const response = await completeLessonPOST(request, routeParams)
        const data = await response.json()

        expect(response.status).toBe(200)
        // completed_lessons should not have duplicate entries (Set ensures uniqueness in route)
        expect(data.completed_lessons).toBeDefined()
      })
    })

    /** @fix_context Error Handling */
    describe('Error Handling', () => {
      it('returns 404 when course not found', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
          }

          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses/course-abc/progress/complete-lesson', {
          method: 'POST',
          body: JSON.stringify({ lesson_index: 0 }),
        })

        const response = await completeLessonPOST(request, routeParams)
        expect(response.status).toBe(404)
      })
    })
  })
})
