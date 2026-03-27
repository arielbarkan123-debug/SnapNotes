/**
 * Tests for Help API
 * POST /api/help - AI-powered help for students
 */

import { NextResponse } from 'next/server'

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
      'NS-VAL-002': 400,
      'NS-VAL-010': 400,
      'NS-VAL-014': 400,
      'NS-CRS-001': 404,
      'NS-HELP-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    FORBIDDEN: 'NS-AUTH-091',
    BODY_INVALID_JSON: 'NS-VAL-002',
    FIELD_REQUIRED: 'NS-VAL-010',
    FIELD_INVALID_FORMAT: 'NS-VAL-014',
    COURSE_NOT_FOUND: 'NS-CRS-001',
    HELP_UNKNOWN: 'NS-HELP-099',
  },
}))

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'This concept means X.\n\n📍 From: Lesson 1',
          },
        ],
      }),
    },
  }))
})

jest.mock('@/lib/ai/claude', () => ({
  AI_MODEL: 'claude-sonnet-4-6',
}))

jest.mock('@/lib/ai/language', () => ({
  getContentLanguage: jest.fn().mockResolvedValue('en'),
  buildLanguageInstruction: jest.fn().mockReturnValue('Respond in English.'),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('Help API', () => {
  let mockSupabase: any
  let POST: typeof import('@/app/api/help/route').POST

  beforeEach(async () => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'courses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'course-1',
                title: 'Biology 101',
                user_id: 'user-123',
                content_language: 'en',
                generated_course: {
                  lessons: [
                    {
                      title: 'Cell Structure',
                      steps: [
                        { type: 'explanation', content: 'Cells are the basic units of life.' },
                      ],
                    },
                  ],
                },
              },
              error: null,
            }),
          }
        }
        if (table === 'help_requests') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const mod = await import('@/app/api/help/route')
    POST = mod.POST
  })

  it('returns 401 for unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    })

    const request = new Request('http://localhost/api/help', {
      method: 'POST',
      body: JSON.stringify({
        questionType: 'explain',
        context: { courseId: 'course-1', stepContent: 'test' },
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns error for missing required fields', async () => {
    const request = new Request('http://localhost/api/help', {
      method: 'POST',
      body: JSON.stringify({ questionType: 'explain' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('returns error for invalid question type', async () => {
    const request = new Request('http://localhost/api/help', {
      method: 'POST',
      body: JSON.stringify({
        questionType: 'invalid_type',
        context: { courseId: 'course-1', stepContent: 'some content' },
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('returns error for custom question without text', async () => {
    const request = new Request('http://localhost/api/help', {
      method: 'POST',
      body: JSON.stringify({
        questionType: 'custom',
        context: { courseId: 'course-1', stepContent: 'some content' },
        customQuestion: '',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('returns 403 when course belongs to different user', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'courses') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'course-1',
              title: 'Biology',
              user_id: 'other-user',
              content_language: 'en',
              generated_course: {},
            },
            error: null,
          }),
        }
      }
      return { insert: jest.fn().mockResolvedValue({ error: null }) }
    })

    const request = new Request('http://localhost/api/help', {
      method: 'POST',
      body: JSON.stringify({
        questionType: 'explain',
        context: { courseId: 'course-1', stepContent: 'some content' },
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('returns success with AI response for explain request', async () => {
    const request = new Request('http://localhost/api/help', {
      method: 'POST',
      body: JSON.stringify({
        questionType: 'explain',
        context: {
          courseId: 'course-1',
          stepContent: 'Cells are the basic units of life.',
          lessonIndex: 0,
          stepIndex: 0,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.response).toBeDefined()
    expect(typeof data.response).toBe('string')
  })
})
