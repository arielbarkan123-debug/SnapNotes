/**
 * Tests for Monitoring Errors API
 * POST /api/monitoring/errors - Report an error
 * GET /api/monitoring/errors - Get error logs (admin)
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/monitoring/errors/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
      'NS-AUTH-091': 403,
      'NS-VAL-010': 400,
      'NS-DB-001': 500,
      'NS-DB-030': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    FORBIDDEN: 'NS-AUTH-091',
    FIELD_REQUIRED: 'NS-VAL-010',
    QUERY_FAILED: 'NS-DB-001',
    DELETE_FAILED: 'NS-DB-030',
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

describe('Monitoring Errors API', () => {
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
        if (table === 'error_logs') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            delete: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ error: null, count: 5 }),
          }
        }
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'admin-1' },
              error: null,
            }),
          }
        }
        return {}
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('POST /api/monitoring/errors', () => {
    it('returns error when errorMessage is missing', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/errors', {
        method: 'POST',
        body: JSON.stringify({ errorType: 'javascript' }),
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('logs error successfully with minimal fields', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/errors', {
        method: 'POST',
        body: JSON.stringify({
          errorMessage: 'Something went wrong',
          errorType: 'javascript',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.logged).toBe(true)
    })

    it('returns logged=false when insert fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'error_logs') {
          return {
            insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/monitoring/errors', {
        method: 'POST',
        body: JSON.stringify({
          errorMessage: 'Test error',
          errorType: 'api',
        }),
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.logged).toBe(false)
    })

    it('handles exceptions gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })
      // Re-mock getUser so it runs before from throws
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/monitoring/errors', {
        method: 'POST',
        body: JSON.stringify({
          errorMessage: 'Test error',
        }),
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.logged).toBe(false)
    })
  })

  describe('GET /api/monitoring/errors', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/monitoring/errors')
      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })
})
