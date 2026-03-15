/**
 * Tests for Courses API
 * GET /api/courses - Fetch courses with cursor-based pagination
 */

import { GET } from '@/app/api/courses/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-DB-003': 500,
      'NS-DB-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-001',
    DATABASE_ERROR: 'NS-DB-003',
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

describe('Courses API', () => {
  let mockSupabase: any

  const mockCourses = [
    { id: 'course-1', user_id: 'user-123', title: 'Biology 101', source_type: 'image', created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' },
    { id: 'course-2', user_id: 'user-123', title: 'Physics 201', source_type: 'text', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
    { id: 'course-3', user_id: 'user-123', title: 'Chemistry 301', source_type: 'image', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
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
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
        }

        if (table === 'courses') {
          // Default: returns 3 courses (no extra row, so hasMore=false)
          builder.lt.mockResolvedValue({ data: mockCourses, error: null })
          // When lt is not called (no cursor), the terminal call is limit
          builder.limit.mockResolvedValue({ data: mockCourses, error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('GET /api/courses', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/courses')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('returns courses with default pagination (20)', async () => {
        const request = new NextRequest('http://localhost/api/courses')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.courses).toHaveLength(3)
        expect(data.count).toBe(3)
        expect(data.hasMore).toBe(false)
        expect(data.nextCursor).toBeNull()
      })

      it('returns empty array when no courses exist', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lt: jest.fn().mockReturnThis(),
          }

          if (table === 'courses') {
            builder.limit.mockResolvedValue({ data: [], error: null })
            builder.lt.mockResolvedValue({ data: [], error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.courses).toEqual([])
        expect(data.count).toBe(0)
        expect(data.hasMore).toBe(false)
      })

      it('cursor-based pagination works', async () => {
        const olderCourses = [
          { id: 'course-4', user_id: 'user-123', title: 'History', created_at: '2025-12-31T00:00:00Z' },
        ]

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),  // returns builder so .lt() can chain after
            lt: jest.fn().mockReturnThis(),
          }

          if (table === 'courses') {
            // When cursor is provided, .lt() is the terminal call after .limit()
            builder.lt.mockResolvedValue({ data: olderCourses, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses?cursor=2026-01-01T00:00:00Z')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.courses).toHaveLength(1)
        expect(data.courses[0].id).toBe('course-4')
      })

      it('hasMore=true when more results exist', async () => {
        // Simulate fetching limit+1 rows (e.g., limit=2, returns 3 items = hasMore)
        const threeCoursesForLimitTwo = [
          { id: 'course-1', user_id: 'user-123', title: 'Bio', created_at: '2026-01-03T00:00:00Z' },
          { id: 'course-2', user_id: 'user-123', title: 'Phys', created_at: '2026-01-02T00:00:00Z' },
          { id: 'course-3', user_id: 'user-123', title: 'Chem', created_at: '2026-01-01T00:00:00Z' },
        ]

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lt: jest.fn().mockReturnThis(),
          }

          if (table === 'courses') {
            // The route calls limit(limit+1), so for limit=2 it asks for 3
            // We return 3, meaning hasMore=true and we slice to 2
            builder.limit.mockResolvedValue({ data: threeCoursesForLimitTwo, error: null })
            builder.lt.mockResolvedValue({ data: threeCoursesForLimitTwo, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses?limit=2')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.courses).toHaveLength(2)
        expect(data.hasMore).toBe(true)
        expect(data.nextCursor).toBe('2026-01-02T00:00:00Z')
      })
    })

    describe('Pagination', () => {
      it('respects limit param (max 50)', async () => {
        const request = new NextRequest('http://localhost/api/courses?limit=5')

        const response = await GET(request)

        expect(response.status).toBe(200)
        // Verify from was called
        expect(mockSupabase.from).toHaveBeenCalledWith('courses')
      })

      it('uses cursor to filter older courses', async () => {
        // Override mock so .limit() returns builder (not Promise) since .lt() chains after it
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ data: [], error: null }),
          }
          return builder
        })

        const request = new NextRequest('http://localhost/api/courses?cursor=2026-01-02T00:00:00Z&limit=10')

        const response = await GET(request)

        expect(response.status).toBe(200)
        expect(mockSupabase.from).toHaveBeenCalledWith('courses')
      })
    })

    describe('Error Handling', () => {
      it('returns DATABASE_ERROR when query fails', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lt: jest.fn().mockReturnThis(),
          }

          if (table === 'courses') {
            builder.limit.mockResolvedValue({ data: null, error: { message: 'DB error' } })
            builder.lt.mockResolvedValue({ data: null, error: { message: 'DB error' } })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/courses')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
