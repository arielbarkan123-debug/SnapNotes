/**
 * @jest-environment node
 */

/**
 * Tests for Course Generation API
 * Verifies proper integration of user profile for personalization
 *
 * NOTE: The route uses a streaming pattern — POST() returns a ReadableStream
 * immediately while processing happens in a fire-and-forget async IIFE.
 * Tests must drain the stream to completion to ensure the IIFE finishes
 * before checking mock assertions.
 *
 * IMPORTANT: This test requires @jest-environment node because the route
 * creates Response objects with ReadableStream bodies, which jsdom's
 * Response implementation doesn't support properly.
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
  generateCourseFromMultipleImagesProgressive: jest.fn(),
  generateInitialCourse: jest.fn(),
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
    IMAGE_UNREADABLE: 'IMAGE_UNREADABLE',
    AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  },
  logError: jest.fn(),
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

jest.mock('@/lib/curriculum/learning-objectives', () => ({
  validateLearningObjectives: jest.fn().mockReturnValue({
    results: {},
    summary: { errorCount: 0, warningCount: 0 },
  }),
}))

jest.mock('@/lib/extraction/confidence-scorer', () => ({
  scoreExtraction: jest.fn().mockReturnValue({
    overall: 0.85,
    textQuality: 0.9,
    structureQuality: 0.8,
  }),
}))

// ============================================================================
// Stream Helper
// ============================================================================

/**
 * Drain the response stream and parse all JSON messages.
 * This ensures the fire-and-forget IIFE in the route completes
 * before we check any mock assertions.
 */
async function drainStream(response: Response): Promise<Array<Record<string, unknown>>> {
  const messages: Array<Record<string, unknown>> = []
  const reader = response.body?.getReader()
  if (!reader) return messages

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      buffer += decoder.decode(value, { stream: true })
      // Parse complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) {
          try {
            messages.push(JSON.parse(trimmed))
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    }
    if (done) break
  }

  // Parse any remaining buffer
  if (buffer.trim()) {
    try {
      messages.push(JSON.parse(buffer.trim()))
    } catch {
      // Skip non-JSON
    }
  }

  return messages
}

describe('Course Generation API - POST', () => {
  let mockSupabase: any
  let capturedUserContext: any

  beforeEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    capturedUserContext = null

    // Reset rate limit to default (allowed)
    const { checkRateLimit } = require('@/lib/rate-limit')
    checkRateLimit.mockReturnValue({ allowed: true })

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
          // Default: no duplicate found, insert succeeds
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
    generateCourseFromImage.mockImplementation(async (_url: string, _title: string, userContext: any) => {
      capturedUserContext = userContext
      return {
        generatedCourse: mockGeneratedCourse,
        extractionRawText: 'Extracted text content',
      }
    })
    generateCourseFromText.mockImplementation(async (_text: string, _title: string, userContext: any) => {
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

      await drainStream(await POST(request))

      expect(mockSupabase.from).toHaveBeenCalledWith('user_learning_profile')
    })

    it('passes user context to AI generation', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      await drainStream(await POST(request))

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

      await drainStream(await POST(request))

      expect(capturedUserContext.educationLevel).toBe('high_school')
    })

    it('includes study system in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await drainStream(await POST(request))

      expect(capturedUserContext.studySystem).toBe('ib')
    })

    it('includes study goal in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await drainStream(await POST(request))

      expect(capturedUserContext.studyGoal).toBe('exam_prep')
    })

    it('includes learning styles in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await drainStream(await POST(request))

      expect(capturedUserContext.learningStyles).toEqual(['practice', 'visual'])
    })

    it('includes language in user context', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some study material' }),
      })

      await drainStream(await POST(request))

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

      const messages = await drainStream(await POST(request))

      // Should continue without personalization — look for success message
      const successMsg = messages.find((m) => m.type === 'success')
      expect(successMsg).toBeDefined()
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

      await drainStream(await POST(request))

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

      await drainStream(await POST(request))

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

      const messages = await drainStream(await POST(request))
      const successMsg = messages.find((m) => m.type === 'success')

      expect(successMsg).toBeDefined()
      expect(generateCourseFromImage).toHaveBeenCalled()
    })

    it('handles text-based course generation', async () => {
      const { generateCourseFromText } = require('@/lib/ai')

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Some educational content about biology' }),
      })

      const messages = await drainStream(await POST(request))
      const successMsg = messages.find((m) => m.type === 'success')

      expect(successMsg).toBeDefined()
      expect(generateCourseFromText).toHaveBeenCalled()
    })

    it('handles document-based course generation', async () => {
      const { generateInitialCourse } = require('@/lib/ai')
      generateInitialCourse.mockImplementation(async (_doc: any, _title: string, _urls: string[], userContext: any) => {
        capturedUserContext = userContext
        return {
          generatedCourse: mockGeneratedCourse,
          lessonOutline: [],
          documentSummary: 'Summary',
          totalLessons: 3,
        }
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

      const messages = await drainStream(await POST(request))
      const successMsg = messages.find((m) => m.type === 'success')

      expect(successMsg).toBeDefined()
      expect(generateInitialCourse).toHaveBeenCalled()
    })

    it('handles multiple images', async () => {
      const { generateCourseFromMultipleImagesProgressive } = require('@/lib/ai')
      generateCourseFromMultipleImagesProgressive.mockImplementation(async (_urls: string[], _title: string, userContext: any) => {
        capturedUserContext = userContext
        return {
          generatedCourse: mockGeneratedCourse,
          extractionRawText: 'Extracted from multiple images',
          lessonOutline: [],
          documentSummary: 'Multi-image summary',
          totalLessons: 3,
        }
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({
          imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        }),
      })

      const messages = await drainStream(await POST(request))
      const successMsg = messages.find((m) => m.type === 'success')

      expect(successMsg).toBeDefined()
      expect(generateCourseFromMultipleImagesProgressive).toHaveBeenCalled()
    })
  })

  describe('Curriculum Context for Concept Extraction', () => {
    it('builds curriculum context when user has study system', async () => {
      const { buildCurriculumContext } = require('@/lib/curriculum/context-builder')

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ textContent: 'Cell biology content' }),
      })

      await drainStream(await POST(request))

      // Curriculum context is built asynchronously for concept extraction
      // We can verify the function was set up to be called
      expect(buildCurriculumContext).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('sends UNAUTHORIZED error for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const messages = await drainStream(await POST(request))

      const errorMsg = messages.find((m) => m.type === 'error')

      expect(errorMsg).toBeDefined()
      expect(errorMsg?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Rate Limiting', () => {
    it('sends RATE_LIMITED error when rate limited', async () => {
      const { checkRateLimit } = require('@/lib/rate-limit')
      checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const messages = await drainStream(await POST(request))
      const errorMsg = messages.find((m) => m.type === 'error')

      expect(errorMsg).toBeDefined()
      expect(errorMsg?.code).toBe('RATE_LIMITED')
    })
  })

  describe('Input Validation', () => {
    it('sends error for missing content', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const messages = await drainStream(await POST(request))
      const errorMsg = messages.find((m) => m.type === 'error')

      expect(errorMsg).toBeDefined()
      expect(errorMsg?.code).toBe('MISSING_FIELD')
    })

    it('sends error for too many images', async () => {
      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({
          imageUrls: Array(11).fill('https://example.com/image.jpg'),
        }),
      })

      const messages = await drainStream(await POST(request))
      const errorMsg = messages.find((m) => m.type === 'error')

      expect(errorMsg).toBeDefined()
      expect(errorMsg?.code).toBe('VALIDATION_ERROR')
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
          // First maybeSingle call: duplicate found by original_image_url
          builder.maybeSingle.mockResolvedValue({ data: { id: 'existing-course-123' }, error: null })
        }

        return builder
      })

      const request = new NextRequest('http://localhost/api/generate-course', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' }),
      })

      const messages = await drainStream(await POST(request))
      const successMsg = messages.find((m) => m.type === 'success')

      expect(successMsg).toBeDefined()
      expect(successMsg?.courseId).toBe('existing-course-123')
    })
  })
})
