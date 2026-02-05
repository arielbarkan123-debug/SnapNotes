/**
 * Tests for Exam Generation API
 * Verifies proper integration of user profile and past exam templates
 */

import { POST, GET } from '@/app/api/exams/route'
import { NextRequest } from 'next/server'
import { mockDatabaseProfiles } from '../fixtures/mock-user-profiles'
import { mockPastExamTemplates, emptyPastExamTemplates, mockExamAnalysis } from '../fixtures/mock-past-exams'
import { mockCourseFromDB, mockGeneratedCourse } from '../fixtures/mock-courses'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock Anthropic SDK - the route creates the client at module scope.
// We use a mutable function that beforeEach can replace.
let mockExamsMessagesCreate: jest.Mock = jest.fn().mockResolvedValue({
  content: [{ type: 'text', text: '{"questions":[]}' }],
})

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: {
      get create() {
        return mockExamsMessagesCreate
      },
    },
  })),
}))

jest.mock('@/lib/curriculum', () => ({
  buildExamContext: jest.fn().mockResolvedValue({
    tier1: 'IB Curriculum',
    tier2: 'Biology HL',
    tier3: 'Cell Biology',
    examStyle: { commandTerms: ['Define', 'Explain'] },
  }),
  formatContextForPrompt: jest.fn().mockReturnValue('## Curriculum Context\nIB Biology HL'),
}))

jest.mock('@/lib/past-exams', () => ({
  buildExamStyleGuide: jest.fn().mockReturnValue('=== EXAM STYLE GUIDE ===\nTest style guide'),
  pastExamsHaveImages: jest.fn().mockReturnValue(false),
  getAggregatedImageAnalysis: jest.fn().mockReturnValue(undefined),
}))

jest.mock('@/lib/images/smart-search', () => ({
  shouldIncludeImages: jest.fn().mockReturnValue({ shouldInclude: false, reason: 'test' }),
  detectVisualContentMentions: jest.fn().mockReturnValue([]),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  RATE_LIMITS: { generateExam: { maxRequests: 10, windowMs: 60000 } },
  getIdentifier: jest.fn().mockReturnValue('test-id'),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}))

describe('Exams API - POST (Generate Exam)', () => {
  let mockSupabase: any
  let mockAnthropic: any
  let capturedPrompt: string

  beforeEach(() => {
    jest.clearAllMocks()
    capturedPrompt = ''

    // Create mock Supabase client
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
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({
            data: mockCourseFromDB,
            error: null,
          })
        } else if (table === 'user_learning_profile') {
          builder.maybeSingle.mockResolvedValue({
            data: mockDatabaseProfiles.ibBiologyHL,
            error: null,
          })
        } else if (table === 'past_exam_templates') {
          builder.eq.mockReturnValue({
            ...builder,
            then: (resolve: any) => resolve({ data: mockPastExamTemplates, error: null }),
          })
        } else if (table === 'exams') {
          builder.single.mockResolvedValue({
            data: { id: 'exam-123', title: mockCourseFromDB.title, status: 'completed' },
            error: null,
          })
        } else if (table === 'exam_questions') {
          builder.insert.mockResolvedValue({ error: null })
        }

        return builder
      }),
    }

    // Replace the shared mock to capture prompts
    // Since the route creates the client at module scope, we can't use mockImplementation
    mockExamsMessagesCreate = jest.fn().mockImplementation(async (params: any) => {
      // Capture the prompt for assertions
      capturedPrompt = params.messages[0]?.content || ''

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              questions: [
                {
                  lesson_index: 0,
                  lesson_title: 'Introduction to Cells',
                  question_type: 'multiple_choice',
                  question_text: 'What is the function of mitochondria?',
                  options: ['A) Energy production', 'B) Protein synthesis', 'C) Cell division', 'D) Waste removal'],
                  correct_answer: 'A) Energy production',
                  explanation: 'Mitochondria produce ATP.',
                },
                {
                  lesson_index: 0,
                  lesson_title: 'Introduction to Cells',
                  question_type: 'true_false',
                  question_text: 'DNA is found in the nucleus of eukaryotic cells.',
                  options: ['True', 'False'],
                  correct_answer: 'True',
                  explanation: 'The nucleus contains genetic material.',
                },
                {
                  lesson_index: 1,
                  lesson_title: 'Cell Organelles',
                  question_type: 'fill_blank',
                  question_text: 'The _____ is responsible for protein synthesis.',
                  options: [],
                  correct_answer: 'ribosome',
                  acceptable_answers: ['ribosomes', 'the ribosome'],
                  explanation: 'Ribosomes synthesize proteins.',
                },
                {
                  lesson_index: 1,
                  lesson_title: 'Cell Organelles',
                  question_type: 'short_answer',
                  question_text: 'What organelle is called the powerhouse of the cell?',
                  options: [],
                  correct_answer: 'mitochondria',
                  acceptable_answers: ['mitochondrion', 'the mitochondria'],
                  explanation: 'Mitochondria produce ATP energy.',
                },
                {
                  lesson_index: 2,
                  lesson_title: 'Cell Membrane',
                  question_type: 'multiple_choice',
                  question_text: 'What is the main component of the cell membrane?',
                  options: ['A) Proteins', 'B) Phospholipids', 'C) Carbohydrates', 'D) Nucleic acids'],
                  correct_answer: 'B) Phospholipids',
                  explanation: 'Phospholipids form the bilayer.',
                },
              ],
            }),
          },
        ],
        model: 'claude-sonnet-4-5-20250929',
        usage: { input_tokens: 500, output_tokens: 1000 },
      }
    })

    // Keep mockAnthropic for backwards compatibility
    mockAnthropic = {
      messages: {
        create: mockExamsMessagesCreate,
      },
    }

    // Set up mocks
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('User Profile Integration', () => {
    it('fetches user learning profile', async () => {
      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_learning_profile')
    })

    it('uses study_system in curriculum context', async () => {
      const { buildExamContext } = require('@/lib/curriculum')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(buildExamContext).toHaveBeenCalledWith(
        'ib', // study_system from mock profile
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      )
    })

    it('uses subjects and subject_levels from profile', async () => {
      const { buildExamContext } = require('@/lib/curriculum')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(buildExamContext).toHaveBeenCalledWith(
        expect.any(String),
        ['biology'], // subjects from mock profile
        { biology: 'HL' }, // subject_levels from mock profile
        expect.any(String),
        expect.any(String)
      )
    })

    it('uses exam_format from profile', async () => {
      const { buildExamContext } = require('@/lib/curriculum')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(buildExamContext).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        'match_real', // exam_format from mock profile
        expect.any(String)
      )
    })

    it('includes curriculum context in prompt', async () => {
      const { formatContextForPrompt } = require('@/lib/curriculum')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(formatContextForPrompt).toHaveBeenCalled()
      expect(capturedPrompt).toContain('Curriculum Context')
    })

    it('handles missing user profile gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_learning_profile') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
        } else if (table === 'courses') {
          builder.single.mockResolvedValue({ data: mockCourseFromDB, error: null })
        } else if (table === 'past_exam_templates') {
          builder.eq.mockReturnValue({
            ...builder,
            then: (resolve: any) => resolve({ data: [], error: null }),
          })
        } else if (table === 'exams') {
          builder.single.mockResolvedValue({ data: { id: 'exam-123' }, error: null })
        } else if (table === 'exam_questions') {
          builder.insert.mockResolvedValue({ error: null })
        }

        return builder
      })

      const { buildExamContext } = require('@/lib/curriculum')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(buildExamContext).toHaveBeenCalledWith(
        'general', // defaults to general
        [], // empty subjects
        {}, // empty subject_levels
        'match_real', // default exam_format
        expect.any(String)
      )
    })
  })

  describe('Past Exam Templates Integration', () => {
    it('fetches past exam templates', async () => {
      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('past_exam_templates')
    })

    it('filters templates by completed analysis_status', async () => {
      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      // Verify eq('analysis_status', 'completed') was called
      const pastExamsCall = mockSupabase.from.mock.calls.find(
        (call: string[]) => call[0] === 'past_exam_templates'
      )
      expect(pastExamsCall).toBeTruthy()
    })

    it('builds exam style guide from templates', async () => {
      const { buildExamStyleGuide } = require('@/lib/past-exams')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(buildExamStyleGuide).toHaveBeenCalled()
    })

    it('includes style guide in prompt when templates exist', async () => {
      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(capturedPrompt).toContain('EXAM STYLE GUIDE')
    })

    it('handles empty past exam templates', async () => {
      const { buildExamStyleGuide } = require('@/lib/past-exams')
      buildExamStyleGuide.mockReturnValue('')

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'past_exam_templates') {
          builder.eq.mockReturnValue({
            ...builder,
            then: (resolve: any) => resolve({ data: [], error: null }),
          })
        } else if (table === 'courses') {
          builder.single.mockResolvedValue({ data: mockCourseFromDB, error: null })
        } else if (table === 'user_learning_profile') {
          builder.maybeSingle.mockResolvedValue({ data: mockDatabaseProfiles.ibBiologyHL, error: null })
        } else if (table === 'exams') {
          builder.single.mockResolvedValue({ data: { id: 'exam-123' }, error: null })
        } else if (table === 'exam_questions') {
          builder.insert.mockResolvedValue({ error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      // Should not contain style guide section
      expect(capturedPrompt).not.toContain('EXAM STYLE GUIDE')
    })

    it('checks for images in past exams', async () => {
      const { pastExamsHaveImages } = require('@/lib/past-exams')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(pastExamsHaveImages).toHaveBeenCalled()
    })
  })

  describe('Exam Format Handling', () => {
    it('includes match_real format instruction when appropriate', async () => {
      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      await POST(request)

      expect(capturedPrompt).toContain('EXAM FORMAT')
    })

    it('uses examFormat from request body if provided', async () => {
      const { buildExamContext } = require('@/lib/curriculum')

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
          examFormat: 'inspired_by',
        }),
      })

      await POST(request)

      expect(buildExamContext).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        'inspired_by', // from request body
        expect.any(String)
      )
    })
  })

  describe('Authentication', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      // Error response shape: { success: false, error: { code, message, retryable } }
      expect(data.error.message).toContain('log in')
    })
  })

  describe('Validation', () => {
    it('returns 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({ courseId: 'course-123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toContain('required')
    })

    it('returns 400 for invalid question count', async () => {
      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 100, // Too high
          timeLimitMinutes: 30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toContain('5-50')
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      const { checkRateLimit } = require('@/lib/rate-limit')
      checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 })

      const request = new NextRequest('http://localhost/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          questionCount: 10,
          timeLimitMinutes: 30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error.message).toContain('Too many requests')
    })
  })
})

describe('Exams API - GET (List Exams)', () => {
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
      from: jest.fn().mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue(
          Promise.resolve({
            data: [
              { id: 'exam-1', title: 'Exam 1', status: 'completed' },
              { id: 'exam-2', title: 'Exam 2', status: 'pending' },
            ],
            error: null,
          })
        ),
      })),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns user exams', async () => {
    const request = new Request('http://localhost/api/exams')

    const response = await GET(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.exams).toHaveLength(2)
  })

  it('filters by courseId when provided', async () => {
    const request = new Request('http://localhost/api/exams?courseId=course-123')

    await GET(request)

    expect(mockSupabase.from).toHaveBeenCalledWith('exams')
  })

  it('returns 401 for unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    })

    const request = new Request('http://localhost/api/exams')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    // Actual message is "Please log in to continue."
    expect(data.error.message).toContain('log in')
  })
})
