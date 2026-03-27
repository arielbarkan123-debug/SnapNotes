/**
 * Tests for Prepare API
 * GET /api/prepare - Fetch user's prepare guides with cursor-based pagination
 */

import { GET } from '@/app/api/prepare/route'
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
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

describe('Prepare API', () => {
  let mockSupabase: any

  const mockGuides = [
    {
      id: 'guide-1',
      user_id: 'user-123',
      title: 'Biology Study Guide',
      subtitle: 'Cell Biology',
      subject: 'Biology',
      source_type: 'image',
      generation_status: 'complete',
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    },
    {
      id: 'guide-2',
      user_id: 'user-123',
      title: 'Physics Study Guide',
      subtitle: 'Mechanics',
      subject: 'Physics',
      source_type: 'text',
      generation_status: 'complete',
      created_at: '2026-03-15T00:00:00Z',
      updated_at: '2026-03-15T00:00:00Z',
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
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
        }

        if (table === 'prepare_guides') {
          // Default: returns 2 guides (no extra row, so hasMore=false)
          builder.lt.mockResolvedValue({ data: mockGuides, error: null })
          // When lt is not called (no cursor), limit is the terminal
          builder.limit.mockResolvedValue({ data: mockGuides, error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('GET /api/prepare', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/prepare')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns guides for authenticated user', async () => {
      const request = new NextRequest('http://localhost/api/prepare')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.guides).toHaveLength(2)
      expect(data.count).toBe(2)
      expect(data.hasMore).toBe(false)
      expect(data.nextCursor).toBeNull()
    })

    it('returns empty array when no guides exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
        }

        if (table === 'prepare_guides') {
          builder.limit.mockResolvedValue({ data: [], error: null })
          builder.lt.mockResolvedValue({ data: [], error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/prepare')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.guides).toEqual([])
      expect(data.count).toBe(0)
      expect(data.hasMore).toBe(false)
    })

    it('supports cursor-based pagination', async () => {
      const olderGuides = [
        {
          id: 'guide-3',
          user_id: 'user-123',
          title: 'Chemistry Guide',
          created_at: '2026-03-10T00:00:00Z',
        },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
        }

        if (table === 'prepare_guides') {
          builder.lt.mockResolvedValue({ data: olderGuides, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/prepare?cursor=2026-03-15T00:00:00Z')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.guides).toHaveLength(1)
    })

    it('hasMore=true when more results exist', async () => {
      // Simulate fetching limit+1 rows: for limit=2 it asks for 3
      const threeGuidesForLimitTwo = [
        { id: 'guide-1', user_id: 'user-123', title: 'Bio', created_at: '2026-03-20T00:00:00Z' },
        { id: 'guide-2', user_id: 'user-123', title: 'Phys', created_at: '2026-03-15T00:00:00Z' },
        { id: 'guide-3', user_id: 'user-123', title: 'Chem', created_at: '2026-03-10T00:00:00Z' },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
        }

        if (table === 'prepare_guides') {
          builder.limit.mockResolvedValue({ data: threeGuidesForLimitTwo, error: null })
          builder.lt.mockResolvedValue({ data: threeGuidesForLimitTwo, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/prepare?limit=2')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.guides).toHaveLength(2)
      expect(data.hasMore).toBe(true)
      expect(data.nextCursor).toBe('2026-03-15T00:00:00Z')
    })

    it('returns 500 on database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
        }

        if (table === 'prepare_guides') {
          builder.limit.mockResolvedValue({ data: null, error: { message: 'DB error' } })
          builder.lt.mockResolvedValue({ data: null, error: { message: 'DB error' } })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/prepare')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('returns 500 on unexpected error', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected'))

      const request = new NextRequest('http://localhost/api/prepare')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
