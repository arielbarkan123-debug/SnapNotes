/**
 * Tests for Study Plan API
 * GET /api/study-plan - Fetch user's study plans with tasks
 * POST /api/study-plan - Create a new study plan
 */

import { GET, POST } from '@/app/api/study-plan/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
      'NS-DB-001': 500,
      'NS-VAL-099': 400,
      'NS-DB-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    DATABASE_ERROR: 'NS-DB-001',
    VALIDATION_ERROR: 'NS-VAL-099',
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

jest.mock('@/lib/study-plan/scheduler', () => ({
  generateStudyPlan: jest.fn().mockReturnValue([
    {
      scheduled_date: '2026-04-01',
      task_type: 'learn',
      course_id: 'course-1',
      lesson_index: 0,
      lesson_title: 'Introduction',
      description: 'Learn Introduction',
      estimated_minutes: 15,
      status: 'pending',
      sort_order: 0,
      metadata: {},
    },
    {
      scheduled_date: '2026-04-01',
      task_type: 'review',
      course_id: 'course-1',
      lesson_index: 1,
      lesson_title: 'Chapter 1',
      description: 'Review Chapter 1',
      estimated_minutes: 10,
      status: 'pending',
      sort_order: 1,
      metadata: {},
    },
  ]),
}))

describe('Study Plan API', () => {
  let mockSupabase: any

  const mockPlans = [
    {
      id: 'plan-1',
      user_id: 'user-123',
      title: 'Biology Final',
      exam_date: '2026-04-15',
      course_ids: ['course-1'],
      status: 'active',
      config: { daily_time_minutes: 30 },
      created_at: '2026-03-01T00:00:00Z',
    },
    {
      id: 'plan-2',
      user_id: 'user-123',
      title: 'Old Plan',
      exam_date: '2026-02-01',
      course_ids: ['course-2'],
      status: 'completed',
      config: { daily_time_minutes: 20 },
      created_at: '2026-01-15T00:00:00Z',
    },
  ]

  const mockTasks = [
    {
      id: 'task-1',
      plan_id: 'plan-1',
      scheduled_date: '2026-04-01',
      task_type: 'learn',
      status: 'pending',
      sort_order: 0,
    },
    {
      id: 'task-2',
      plan_id: 'plan-1',
      scheduled_date: '2026-04-01',
      task_type: 'review',
      status: 'pending',
      sort_order: 1,
    },
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
        if (table === 'study_plans') {
          const builder = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockPlans, error: null }),
            single: jest.fn().mockResolvedValue({
              data: { id: 'plan-new', user_id: 'user-123', title: 'New Plan', status: 'active' },
              error: null,
            }),
          }
          return builder
        } else if (table === 'study_plan_tasks') {
          // Tasks query uses .order().order() (two chained order calls)
          let orderCallCount = 0
          const builder = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ error: null }),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => {
              orderCallCount++
              if (orderCallCount >= 2) {
                // Second .order() is terminal
                return Promise.resolve({ data: mockTasks, error: null })
              }
              return builder // First .order() returns builder for chaining
            }),
          }
          return builder
        }

        // Default builder for other tables
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  // =========================================================================
  // GET /api/study-plan
  // =========================================================================

  describe('GET /api/study-plan', () => {
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

    it('returns plans with tasks for active plan', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.plans).toHaveLength(2)
      // Active plan should have tasks attached
      const activePlan = data.plans.find((p: any) => p.status === 'active')
      expect(activePlan).toBeTruthy()
      expect(activePlan.tasks).toHaveLength(2)
    })

    it('returns empty plans when no plans exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
        return builder
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.plans).toEqual([])
    })

    it('returns 500 on database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }
        return builder
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('handles task fetch error gracefully', async () => {
      // Plans succeed but tasks fail
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'study_plans') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockPlans, error: null }),
          }
        } else if (table === 'study_plan_tasks') {
          let orderCallCount = 0
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => {
              orderCallCount++
              if (orderCallCount >= 2) {
                return Promise.resolve({ data: null, error: { message: 'Task error' } })
              }
              return builder
            }),
          }
          return builder
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const response = await GET()
      const data = await response.json()

      // Plans should still be returned, tasks empty due to error
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.plans).toHaveLength(2)
    })
  })

  // =========================================================================
  // POST /api/study-plan
  // =========================================================================

  describe('POST /api/study-plan', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/study-plan', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Biology Final',
          examDate: '2026-04-15',
          courseIds: ['course-1'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns 400 for missing required fields (no title)', async () => {
      const request = new NextRequest('http://localhost/api/study-plan', {
        method: 'POST',
        body: JSON.stringify({
          examDate: '2026-04-15',
          courseIds: ['course-1'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('returns 400 for missing required fields (no examDate)', async () => {
      const request = new NextRequest('http://localhost/api/study-plan', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Biology Final',
          courseIds: ['course-1'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('returns 400 for missing required fields (no courseIds)', async () => {
      const request = new NextRequest('http://localhost/api/study-plan', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Biology Final',
          examDate: '2026-04-15',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('creates a study plan successfully', async () => {
      const request = new NextRequest('http://localhost/api/study-plan', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Biology Final',
          examDate: '2026-04-15',
          courseIds: ['course-1'],
          dailyTimeMinutes: 30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.plan).toBeTruthy()
      expect(data.taskCount).toBe(2)
    })

    it('returns 500 on plan creation database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'study_plans') {
          builder.single.mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' },
          })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/study-plan', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Biology Final',
          examDate: '2026-04-15',
          courseIds: ['course-1'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
