/**
 * Tests for YouTube Course API
 * POST /api/courses/from-youtube - Generate course from YouTube video
 *
 * Note: The route uses ReadableStream with an async start() for SSE streaming.
 * In the Jest/Node test environment, the async start() runs after the stream
 * reader resolves, so we cannot reliably read stream contents. Instead, we
 * verify the correct behavior through:
 * - Response status and headers for SSE
 * - Mock function call assertions
 * - Error response JSON for validation/auth errors
 */

import { POST } from '@/app/api/courses/from-youtube/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/ai/language', () => ({
  getContentLanguage: jest.fn().mockResolvedValue('en'),
  buildLanguageInstruction: jest.fn().mockReturnValue(''),
  detectSourceLanguage: jest.fn().mockReturnValue(undefined),
  resolveOutputLanguage: jest.fn().mockReturnValue('en'),
  getExplicitToggleFlag: jest.fn().mockResolvedValue(false),
  clearExplicitToggleFlag: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/youtube/transcript', () => ({
  extractYouTubeTranscript: jest.fn(),
  parseVideoId: jest.fn(),
  YouTubeBotDetectionError: class YouTubeBotDetectionError extends Error {
    constructor(message?: string) {
      super(message || 'Bot detection triggered')
      this.name = 'YouTubeBotDetectionError'
    }
  },
}))

jest.mock('@/lib/youtube/course-from-video', () => ({
  generateCourseFromVideo: jest.fn(),
}))

/**
 * Helper: wait a tick for async stream start() to run, then verify mock calls.
 */
async function waitForStreamExecution(): Promise<void> {
  // Give the async start() function time to execute
  await new Promise(resolve => setTimeout(resolve, 50))
}

describe('YouTube Course API - POST /api/courses/from-youtube', () => {
  let mockSupabase: any

  const mockTranscript = {
    videoId: 'dQw4w9WgXcQ',
    title: 'Introduction to Biology',
    transcript: 'Today we will learn about cells...',
    language: 'en',
    duration: 600, // 10 minutes
  }

  const mockCourse = {
    title: 'Introduction to Biology',
    titleHe: 'מבוא לביולוגיה',
    description: 'A comprehensive introduction to biology',
    descriptionHe: 'מבוא מקיף לביולוגיה',
    subject: 'Biology',
    thumbnailEmoji: '🧬',
    lessons: [
      {
        title: 'Cell Structure',
        titleHe: 'מבנה התא',
        content: 'Cells are the basic unit of life...',
        contentHe: 'תאים הם יחידת החיים הבסיסית...',
        summary: 'Overview of cell structure',
        summaryHe: 'סקירה של מבנה התא',
        practiceQuestions: [],
      },
    ],
  }

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
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'courses') {
          builder.single.mockResolvedValue({
            data: { id: 'course-new' },
            error: null,
          })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { extractYouTubeTranscript, parseVideoId } = require('@/lib/youtube/transcript')
    parseVideoId.mockReturnValue('dQw4w9WgXcQ')
    extractYouTubeTranscript.mockResolvedValue(mockTranscript)

    const { generateCourseFromVideo } = require('@/lib/youtube/course-from-video')
    generateCourseFromVideo.mockResolvedValue(mockCourse)
  })

  describe('Authentication', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Validation', () => {
    it('returns 400 if youtubeUrl is missing', async () => {
      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('YouTube URL')
    })

    it('returns 400 for invalid YouTube URL', async () => {
      const { parseVideoId } = require('@/lib/youtube/transcript')
      parseVideoId.mockReturnValue(null)

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://example.com/not-youtube' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Invalid YouTube URL')
    })
  })

  describe('Happy Path', () => {
    it('returns SSE stream with correct content type and headers', async () => {
      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      expect(response.body).toBeTruthy()
    })

    it('extracts transcript from the provided YouTube URL', async () => {
      const { extractYouTubeTranscript } = require('@/lib/youtube/transcript')

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      await POST(request)
      await waitForStreamExecution()

      expect(extractYouTubeTranscript).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    })

    it('generates course from the extracted transcript', async () => {
      const { generateCourseFromVideo } = require('@/lib/youtube/course-from-video')

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      await POST(request)
      await waitForStreamExecution()

      expect(generateCourseFromVideo).toHaveBeenCalledWith(
        mockTranscript.transcript,
        mockTranscript.title,
        mockTranscript.duration,
        'en',
      )
    })

    it('saves the generated course to the database', async () => {
      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      await POST(request)
      await waitForStreamExecution()

      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
    })

    it('parses video ID from URL', async () => {
      const { parseVideoId } = require('@/lib/youtube/transcript')

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      await POST(request)

      expect(parseVideoId).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    })
  })

  describe('Error Handling', () => {
    it('does not call generateCourseFromVideo when transcript extraction fails', async () => {
      const { extractYouTubeTranscript } = require('@/lib/youtube/transcript')
      const { generateCourseFromVideo } = require('@/lib/youtube/course-from-video')
      extractYouTubeTranscript.mockRejectedValue(new Error('No captions available'))

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      await POST(request)
      await waitForStreamExecution()

      expect(extractYouTubeTranscript).toHaveBeenCalled()
      expect(generateCourseFromVideo).not.toHaveBeenCalled()
    })

    it('does not save to DB when course generation fails', async () => {
      const { generateCourseFromVideo } = require('@/lib/youtube/course-from-video')
      generateCourseFromVideo.mockRejectedValue(new Error('Generation failed'))

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      await POST(request)
      await waitForStreamExecution()

      expect(generateCourseFromVideo).toHaveBeenCalled()
      // Should not have tried to save to DB
      expect(mockSupabase.from).not.toHaveBeenCalledWith('courses')
    })

    it('still returns SSE stream response even when errors occur internally', async () => {
      const { extractYouTubeTranscript } = require('@/lib/youtube/transcript')
      extractYouTubeTranscript.mockRejectedValue(new Error('No captions available'))

      const request = new NextRequest('http://localhost/api/courses/from-youtube', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      })

      const response = await POST(request)

      // SSE errors are streamed, not returned as JSON error responses
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })
  })
})
