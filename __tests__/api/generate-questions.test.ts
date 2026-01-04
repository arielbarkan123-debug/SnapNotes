/**
 * Tests for Practice Questions Generation API
 * Verifies proper integration of user profile and curriculum context
 */

import { POST } from '@/app/api/generate-questions/route'
import { NextRequest } from 'next/server'
import { mockDatabaseProfiles } from '../fixtures/mock-user-profiles'
import { mockCourseFromDB, mockGeneratedCourse } from '../fixtures/mock-courses'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn(),
}))

jest.mock('@/lib/curriculum/context-builder', () => ({
  buildCurriculumContext: jest.fn().mockResolvedValue({
    tier1: 'IB Curriculum',
    tier2: 'Biology HL',
    tier3: 'Cell Biology',
    commandTerms: ['Define', 'Explain', 'Compare', 'Evaluate'],
  }),
  formatContextForPrompt: jest.fn().mockReturnValue('## Curriculum Context\nIB Biology HL\nCommand terms: Define, Explain, Compare, Evaluate'),
}))

jest.mock('@/lib/env', () => ({
  getAnthropicApiKey: jest.fn().mockReturnValue('test-api-key'),
}))

// Set env variable for tests
process.env.ANTHROPIC_API_KEY = 'test-api-key'

describe('Generate Questions API - POST', () => {
  let mockSupabase: any
  let mockAnthropic: any
  let capturedSystemPrompt: string
  let capturedUserMessage: string

  beforeEach(() => {
    jest.clearAllMocks()
    capturedSystemPrompt = ''
    capturedUserMessage = ''

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
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({
            data: {
              title: mockCourseFromDB.title,
              generated_course: mockGeneratedCourse,
            },
            error: null,
          })
        } else if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: mockDatabaseProfiles.ibBiologyHL,
            error: null,
          })
        }

        return builder
      }),
    }

    // Create mock Anthropic client
    mockAnthropic = {
      messages: {
        create: jest.fn().mockImplementation(async (params: any) => {
          capturedSystemPrompt = params.system || ''
          capturedUserMessage = params.messages[0]?.content || ''

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  questions: [
                    {
                      type: 'multiple_choice',
                      question: 'What is the function of mitochondria?',
                      options: [
                        'Energy production',
                        'Protein synthesis',
                        'Cell division',
                        'Waste removal',
                      ],
                      correct_answer: 0,
                      explanation: 'Mitochondria produce ATP through cellular respiration.',
                    },
                    {
                      type: 'multiple_choice',
                      question: 'Which organelle contains genetic material?',
                      options: ['Ribosome', 'Golgi body', 'Nucleus', 'Lysosome'],
                      correct_answer: 2,
                      explanation: 'The nucleus contains DNA.',
                    },
                    {
                      type: 'true_false',
                      question: 'Prokaryotic cells have a nucleus.',
                      options: ['True', 'False'],
                      correct_answer: 1,
                      explanation: 'Prokaryotic cells lack a membrane-bound nucleus.',
                    },
                  ],
                }),
              },
            ],
          }
        }),
      },
    }

    // Set up mocks
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const Anthropic = require('@anthropic-ai/sdk').default
    Anthropic.mockImplementation(() => mockAnthropic)
  })

  describe('User Profile Integration', () => {
    it('fetches user learning profile', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_learning_profile')
    })

    it('uses study_system in curriculum context', async () => {
      const { buildCurriculumContext } = require('@/lib/curriculum/context-builder')

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(buildCurriculumContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userProfile: expect.objectContaining({
            studySystem: 'ib',
          }),
        })
      )
    })

    it('uses subjects and subject_levels from profile', async () => {
      const { buildCurriculumContext } = require('@/lib/curriculum/context-builder')

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(buildCurriculumContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userProfile: expect.objectContaining({
            subjects: ['biology'],
            subjectLevels: { biology: 'HL' },
          }),
        })
      )
    })

    it('uses exam_format from profile', async () => {
      const { buildCurriculumContext } = require('@/lib/curriculum/context-builder')

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(buildCurriculumContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userProfile: expect.objectContaining({
            examFormat: 'match_real',
          }),
        })
      )
    })

    it('includes curriculum context in system prompt', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('Curriculum Context')
      expect(capturedSystemPrompt).toContain('command terms')
    })

    it('skips curriculum context for general study system', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({
            data: { title: mockCourseFromDB.title, generated_course: mockGeneratedCourse },
            error: null,
          })
        } else if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: { ...mockDatabaseProfiles.generalLearner, study_system: 'general' },
            error: null,
          })
        }

        return builder
      })

      const { buildCurriculumContext } = require('@/lib/curriculum/context-builder')
      buildCurriculumContext.mockClear()

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(buildCurriculumContext).not.toHaveBeenCalled()
    })

    it('handles missing user profile gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({
            data: { title: mockCourseFromDB.title, generated_course: mockGeneratedCourse },
            error: null,
          })
        } else if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({ data: null, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.questions).toHaveLength(3)
    })
  })

  describe('Hebrew Language Support', () => {
    it('includes Hebrew instruction when language is he', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({
            data: { title: mockCourseFromDB.title, generated_course: mockGeneratedCourse },
            error: null,
          })
        } else if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: { ...mockDatabaseProfiles.bagrutHebrew },
            error: null,
          })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('Hebrew')
      expect(capturedSystemPrompt).toContain('עברית')
    })

    it('does not include Hebrew instruction when language is en', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      // English is default, no Hebrew instruction
      expect(capturedSystemPrompt).not.toContain('עברית')
    })
  })

  describe('Wrong Answer Reinforcement', () => {
    it('includes wrong question in prompt for reinforcement', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          wrongQuestion: 'What is the function of mitochondria?',
          count: 3,
        }),
      })

      await POST(request)

      expect(capturedUserMessage).toContain('wrong')
      expect(capturedUserMessage).toContain('mitochondria')
      expect(capturedUserMessage).toContain('reinforce')
    })
  })

  describe('Course and Lesson Context', () => {
    it('fetches course data when courseId provided', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
    })

    it('includes course context in system prompt', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('Course:')
      expect(capturedSystemPrompt).toContain(mockCourseFromDB.title)
    })

    it('includes lesson content in system prompt', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('Lesson:')
      expect(capturedSystemPrompt).toContain('Introduction to Cells')
    })

    it('works with topic-only request (no course)', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Cell biology and mitochondria',
          count: 3,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(capturedUserMessage).toContain('Cell biology')
    })
  })

  describe('Question Count Validation', () => {
    it('limits questions to MAX_QUESTIONS (10)', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Cell biology',
          count: 100,
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('Generate 10 questions')
    })

    it('ensures at least MIN_QUESTIONS (1)', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Cell biology',
          count: 0,
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('Generate 1 questions')
    })

    it('defaults to 3 questions when not specified', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Cell biology',
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('Generate 3 questions')
    })
  })

  describe('Authentication', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Cell biology',
          count: 3,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Response Validation', () => {
    it('validates generated questions', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Cell biology',
          count: 3,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.questions).toHaveLength(3)

      // Check question structure
      data.questions.forEach((q: any) => {
        expect(q).toHaveProperty('question')
        expect(q).toHaveProperty('options')
        expect(Array.isArray(q.options)).toBe(true)
        expect(q.options.length).toBeGreaterThanOrEqual(2)
        expect(typeof q.correct_answer).toBe('number')
        expect(q.correct_answer).toBeGreaterThanOrEqual(0)
        expect(q.correct_answer).toBeLessThan(q.options.length)
      })
    })

    it('filters out invalid questions', async () => {
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              questions: [
                {
                  type: 'multiple_choice',
                  question: 'Valid question?',
                  options: ['A', 'B', 'C', 'D'],
                  correct_answer: 0,
                  explanation: 'Valid',
                },
                {
                  // Invalid - no question
                  options: ['A', 'B'],
                  correct_answer: 0,
                },
                {
                  // Invalid - correct_answer out of range
                  question: 'Test?',
                  options: ['A', 'B'],
                  correct_answer: 5,
                },
              ],
            }),
          },
        ],
      })

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Cell biology',
          count: 3,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.questions).toHaveLength(1) // Only the valid one
    })
  })

  describe('Curriculum-Aligned Questions', () => {
    it('includes command terms instruction in prompt', async () => {
      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(capturedSystemPrompt).toContain('command terms')
      expect(capturedSystemPrompt).toContain('assessment objectives')
    })

    it('passes purpose as practice to curriculum context', async () => {
      const { buildCurriculumContext } = require('@/lib/curriculum/context-builder')

      const request = new NextRequest('http://localhost/api/generate-questions', {
        method: 'POST',
        body: JSON.stringify({
          courseId: 'course-123',
          lessonIndex: 0,
          count: 3,
        }),
      })

      await POST(request)

      expect(buildCurriculumContext).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'practice',
        })
      )
    })
  })
})
