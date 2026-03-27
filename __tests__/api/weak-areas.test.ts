/**
 * Tests for Weak Areas API
 * GET /api/weak-areas - Identify weak areas based on lesson performance
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/weak-areas/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
      'NS-DB-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    DATABASE_UNKNOWN: 'NS-DB-099',
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('Weak Areas API', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: jest.fn(),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 for unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    })

    const request = new NextRequest('http://localhost/api/weak-areas')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns empty data when no lesson progress exists', async () => {
    // The route builds: .from('lesson_progress').select(...).eq('user_id', ...).eq('completed', true)
    // Then destructures: const { data: lessonProgress, error } = await query
    // We need the final .eq() to be thenable/awaitable
    const thenableEmpty = {
      data: [],
      error: null,
      then: function (resolve: any) { return resolve({ data: [], error: null }) },
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lesson_progress') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue(thenableEmpty),
            }),
          }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
    })

    const request = new NextRequest('http://localhost/api/weak-areas')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.weakAreas).toEqual([])
    expect(data.summary).toBeNull()
  })

  it('returns empty data when table does not exist (PGRST205)', async () => {
    const thenableError = {
      data: null,
      error: { code: 'PGRST205', message: 'Table not found' },
      then: function (resolve: any) { return resolve({ data: null, error: { code: 'PGRST205', message: 'Table not found' } }) },
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lesson_progress') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue(thenableError),
            }),
          }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
    })

    const request = new NextRequest('http://localhost/api/weak-areas')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.weakAreas).toEqual([])
  })

  it('identifies weak areas with priority scoring', async () => {
    const lessonProgressData = [
      {
        id: 'lp-1',
        course_id: 'course-1',
        lesson_index: 0,
        lesson_title: 'Algebra Basics',
        mastery_level: 0.3,
        total_attempts: 5,
        total_correct: 2,
        last_studied_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        completed: true,
      },
      {
        id: 'lp-2',
        course_id: 'course-1',
        lesson_index: 1,
        lesson_title: 'Geometry',
        mastery_level: 0.9,
        total_attempts: 10,
        total_correct: 9,
        last_studied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completed: true,
      },
    ]

    const thenableProgress = {
      data: lessonProgressData,
      error: null,
      then: function (resolve: any) { return resolve({ data: lessonProgressData, error: null }) },
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lesson_progress') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue(thenableProgress),
            }),
          }),
        }
      }
      if (table === 'courses') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'course-1', title: 'Math 101' }],
              error: null,
            }),
          }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
    })

    const request = new NextRequest('http://localhost/api/weak-areas')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.weakAreas.length).toBeGreaterThan(0)
    expect(data.weakAreas[0].priority).toBe('high')
    expect(data.weakAreas[0].lessonTitle).toBe('Algebra Basics')
    expect(data.summary).toBeDefined()
    expect(data.summary.totalWeakAreas).toBeGreaterThan(0)
  })

  it('filters by courseId when provided', async () => {
    const thenableEmpty = {
      data: [],
      error: null,
      then: function (resolve: any) { return resolve({ data: [], error: null }) },
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lesson_progress') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue(thenableEmpty), // 3rd eq for course_id
              }),
            }),
          }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
    })

    const request = new NextRequest('http://localhost/api/weak-areas?courseId=course-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.weakAreas).toEqual([])
  })
})
