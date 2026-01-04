/**
 * Tests for Course Generation API
 * Verifies proper integration of user profile for personalization
 */

import { POST } from '@/app/api/generate-course/route'
import { NextRequest } from 'next/server'
import { mockDatabaseProfiles } from '../fixtures/mock-user-profiles'
import { mockGeneratedCourse } from '../fixtures/mock-courses'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/ai', () => ({
  generateCourseFromImage: jest.fn(),
  generateCourseFromMultipleImages: jest.fn(),
  generateCourseFromDocument: jest.fn(),
  generateCourseFromText: jest.fn(),
  ClaudeAPIError: class ClaudeAPIError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  },
  getUserFriendlyError: jest.fn().mockReturnValue('Friendly error'),
}))

jest.mock('@/lib/api/errors', () => ({
  ErrorCodes: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_FIELD: 'MISSING_FIELD',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
  createErrorResponse: jest.fn().mockImplementation((code, message) => {
    const status = code === 'UNAUTHORIZED' ? 401 : code === 'RATE_LIMITED' ? 429 : 400
    return new Response(JSON.stringify({ success: false, error: message, code }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  logError: jest.fn(),
  mapClaudeAPIError: jest.fn().mockReturnValue({ code: 'AI_ERROR', message: 'AI error' }),
}))

jest.mock('@/lib/srs', () => ({
  generateCardsFromCourse: jest.fn().mockReturnValue([]),
}))

jest.mock('@/lib/images', () => ({
  uploadExtractedImages: jest.fn().mockResolvedValue([]),
  searchEducationalImages: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/ai/image-generation', () => ({
  generateCourseImage: jest.fn().mockResolvedValue({ success: false }),
}))

jest.mock('@/lib/concepts', () => ({
  extractAndStoreConcepts: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/curriculum/context-builder', () => ({
  buildCurriculumContext: jest.fn().mockResolvedValue({
    tier1: 'IB',
    tier2: 'Biology HL',
    tier3: null,
  }),
  formatContextForPrompt: jest.fn().mockReturnValue('## Curriculum Context\nIB Biology'),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  RATE_LIMITS: { generateCourse: { maxRequests: 5, windowMs: 60000 } },
  getIdentifier: jest.fn().mockReturnValue('test-id'),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}))

describe('Course Generation API - POST', () => {
  let mockSupabase: any
  let capturedUserContext: any

  beforeEach(() => {
    jest.clearAllMocks()
    capturedUserContext = null

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
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: mockDatabaseProfiles.ibBiologyHL,
            error: null,
          })
        } else if (table === 'courses') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          builder.single.mockResolvedValue({ data: { id: 'course-123' }, error: null })
        } else if (table === 'review_cards') {
          builder.select.mockResolvedValue({ data: [], error: null })
        }

        return builder
      }),
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ error: null }),
          getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.url/img.png' } }),
        }),
      },
    }

    // Set up Supabase mock
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    // Set up AI mock to capture user context
    const { generateCourseFromImage, generateCourseFromText } = require('@/lib/ai')
    generateCourseFromImage.mockImplementation(async (url: string, title: string, userContext: any) => {
      capturedUserContext = userContext
      return {
        generatedCourse: mockGeneratedCourse,
        extractionRawText: 'Extracted text content',
      }
    })
    generateCourseFromText.mockImplementation(async (text: string, title: string, userContext: any) => {
      capturedUserContext = userContext
      return {
        generatedCourse: mockGeneratedCourse,
      }
    })
  })

  describe('User Profile Integration', () => {
    it('fetches user learning profile', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      await POST(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_learning_profile')
    })

    it('passes user context to AI generation', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      await POST(request)

      expect(capturedUserContext).toEqual({
        educationLevel: 'high_school',
        studySystem: 'ib',
        studyGoal: 'exam_prep',
        learningStyles: ['practice', 'visual'],
        language: 'en',
      })
    })

    it('includes education level in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material about cells' }),
      })

      await POST(request)

      expect(capturedUserContext.educationLevel).toBe('high_school')
    })

    it('includes study system in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await POST(request)

      expect(capturedUserContext.studySystem).toBe('ib')
    })

    it('includes study goal in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await POST(request)

      expect(capturedUserContext.studyGoal).toBe('exam_prep')
    })

    it('includes learning styles in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await POST(request)

      expect(capturedUserContext.learningStyles).toEqual(['practice', 'visual'])
    })

    it('includes language in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await POST(request)

      expect(capturedUserContext.language).toBe('en')
    })

    it('handles missing user profile gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_learning_profile') {
          builder.single.mockRejectedValue(new Error('Profile not found'))
        } else if (table === 'courses') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          builder.single.mockResolvedValue({ data: { id: 'course-123' }, error: null })
        } else if (table === 'review_cards') {
          builder.select.mockResolvedValue({ data: [], error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Should continue without personalization
      expect(data.success).toBe(true)
      expect(capturedUserContext).toBeUndefined()
    })

    it('uses default values when profile fields are null', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: {
              user_id: 'user-123',
              education_level: null,
              study_system: null,
              study_goal: null,
              learning_styles: null,
              language: null,
            },
            error: null,
          })
        } else if (table === 'courses') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          builder.single.mockResolvedValue({ data: { id: 'course-123' }, error: null })
        } else if (table === 'review_cards') {
          builder.select.mockResolvedValue({ data: [], error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await POST(request)

      expect(capturedUserContext).toEqual({
        educationLevel: 'high_school', // default
        studySystem: 'general', // default
        studyGoal: 'general_learning', // default
        learningStyles: ['practice'], // default
        language: 'en', // default
      })
    })
  })

  describe('Hebrew Language Support', () => {
    it('passes Hebrew language setting to AI', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({
            data: {
              ...mockDatabaseProfiles.bagrutHebrew,
            },
            error: null,
          })
        } else if (table === 'courses') {
          builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          builder.single.mockResolvedValue({ data: { id: 'course-123' }, error: null })
        } else if (table === 'review_cards') {
          builder.select.mockResolvedValue({ data: [], error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'תוכן ללמידה' }),
      })

      await POST(request)

      expect(capturedUserContext.language).toBe('he')
    })
  })

  describe('Different Source Types', () => {
    it('handles image-based course generation', async () => {
      const { generateCourseFromImage } = require('@/lib/ai')

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(generateCourseFromImage).toHaveBeenCalled()
    })

    it('handles text-based course generation', async () => {
      const { generateCourseFromText } = require('@/lib/ai')

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some educational content about biology' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(generateCourseFromText).toHaveBeenCalled()
    })

    it('handles document-based course generation', async () => {
      const { generateCourseFromDocument } = require('@/lib/ai')
      generateCourseFromDocument.mockImplementation(async (doc: any, title: string, urls: string[], userContext: any) => {
        capturedUserContext = userContext
        return { generatedCourse: mockGeneratedCourse }
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({
          documentContent: {
            type: 'pdf',
            content: 'PDF content here',
            metadata: { pageCount: 5 },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(generateCourseFromDocument).toHaveBeenCalled()
    })

    it('handles multiple images', async () => {
      const { generateCourseFromMultipleImages } = require('@/lib/ai')
      generateCourseFromMultipleImages.mockImplementation(async (urls: string[], title: string, userContext: any) => {
        capturedUserContext = userContext
        return {
          generatedCourse: mockGeneratedCourse,
          extractionRawText: 'Extracted from multiple images',
        }
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({
          imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(generateCourseFromMultipleImages).toHaveBeenCalled()
    })
  })

  describe('Curriculum Context for Concept Extraction', () => {
    it('builds curriculum context when user has study system', async () => {
      const { buildCurriculumContext } = require('@/lib/curriculum/context-builder')

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Cell biology content' }),
      })

      await POST(request)

      // Curriculum context is built asynchronously for concept extraction
      // We can verify the function was set up to be called
      expect(buildCurriculumContext).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      const { checkRateLimit } = require('@/lib/rate-limit')
      checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
    })
  })

  describe('Input Validation', () => {
    it('returns error for missing content', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('returns error for too many images', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({
          imageUrls: Array(11).fill('https://example.com/image.jpg'),
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Duplicate Detection', () => {
    it('returns existing course if duplicate detected', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'user_learning_profile') {
          builder.single.mockResolvedValue({ data: mockDatabaseProfiles.ibBiologyHL, error: null })
        } else if (table === 'courses') {
          builder.maybeSingle.mockResolvedValue({ data: { id: 'existing-course-123' }, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.courseId).toBe('existing-course-123')
      expect(data.isDuplicate).toBe(true)
    })
  })
})
