/**
 * Tests for Homework Check API
 * POST /api/homework/check - Create and analyze homework check (streaming ndjson)
 * GET /api/homework/check - Get user's homework checks
 */

import { GET, POST } from '@/app/api/homework/check/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
      'NS-DB-001': 500,
      'NS-HW-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    QUERY_FAILED: 'NS-DB-001',
    HOMEWORK_UNKNOWN: 'NS-HW-099',
  },
  logError: jest.fn(),
}))

jest.mock('@/lib/homework/checker-engine', () => ({
  analyzeHomework: jest.fn(),
}))

jest.mock('@/lib/ai/language', () => ({
  getContentLanguage: jest.fn().mockResolvedValue('en'),
  detectSourceLanguage: jest.fn().mockReturnValue(null),
  resolveOutputLanguage: jest.fn().mockReturnValue('en'),
  getExplicitToggleFlag: jest.fn().mockResolvedValue(false),
  clearExplicitToggleFlag: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}))

describe('Homework Check API', () => {
  let mockSupabase: any

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
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn(),
          single: jest.fn(),
        }

        if (table === 'homework_checks') {
          builder.single.mockResolvedValue({
            data: { id: 'check-1', status: 'analyzing' },
            error: null,
          })
          builder.range.mockResolvedValue({
            data: [
              { id: 'check-1', status: 'completed', subject: 'Math' },
              { id: 'check-2', status: 'completed', subject: 'Physics' },
            ],
            error: null,
          })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  // =========================================================================
  // POST /api/homework/check (streaming)
  // =========================================================================

  describe('POST /api/homework/check', () => {
    it('returns streaming response with correct headers', async () => {
      const { analyzeHomework } = require('@/lib/homework/checker-engine')
      analyzeHomework.mockResolvedValue({
        taskText: 'Solve 2+2',
        answerText: '4',
        subject: 'Math',
        topic: 'Arithmetic',
        feedback: { gradeEstimate: 'A' },
      })

      // Override the update+select chain for the completed update
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'homework_checks') {
          builder.single.mockResolvedValue({
            data: { id: 'check-1', status: 'completed', feedback: { gradeEstimate: 'A' } },
            error: null,
          })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/homework/check', {
        method: 'POST',
        body: JSON.stringify({
          taskImageUrl: 'https://example.com/task.png',
          inputMode: 'image',
        }),
      })

      const response = await POST(request)

      expect(response.headers.get('Content-Type')).toBe('application/x-ndjson')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('returns a response body (streaming format)', async () => {
      const { analyzeHomework } = require('@/lib/homework/checker-engine')
      analyzeHomework.mockResolvedValue({
        taskText: 'Solve 2+2',
        answerText: '4',
        subject: 'Math',
        topic: 'Arithmetic',
        feedback: { gradeEstimate: 'A' },
      })

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'homework_checks') {
          builder.single.mockResolvedValue({
            data: { id: 'check-1', status: 'completed', feedback: { gradeEstimate: 'A' } },
            error: null,
          })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/homework/check', {
        method: 'POST',
        body: JSON.stringify({
          taskImageUrl: 'https://example.com/task.png',
          inputMode: 'image',
        }),
      })

      const response = await POST(request)

      // Verify the response is a streaming response (not JSON)
      expect(response.body).toBeTruthy()
      expect(response.status).toBe(200)
    })
  })

  // =========================================================================
  // GET /api/homework/check
  // =========================================================================

  describe('GET /api/homework/check', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/homework/check')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('returns checks for authenticated user', async () => {
      const request = new NextRequest('http://localhost/api/homework/check')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.checks).toHaveLength(2)
      expect(data.checks[0].id).toBe('check-1')
    })

    it('returns 500 on database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }
        return builder
      })

      const request = new NextRequest('http://localhost/api/homework/check')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('uses limit and offset from query params', async () => {
      const request = new NextRequest('http://localhost/api/homework/check?limit=5&offset=10')

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('homework_checks')
    })
  })
})
