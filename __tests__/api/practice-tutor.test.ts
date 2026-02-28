/**
 * Integration tests for /api/practice/tutor route
 */

import { POST } from '@/app/api/practice/tutor/route'
import { NextRequest } from 'next/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  }),
}))

// Mock Anthropic SDK
const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }))
})

// Mock diagram-engine integration to avoid ESM import chain (e2b → chalk)
jest.mock('@/lib/diagram-engine/integration', () => ({
  tryEngineDiagram: jest.fn().mockResolvedValue(null),
  shouldUseEngine: jest.fn().mockReturnValue(false),
  tieredRoute: jest.fn().mockResolvedValue(null),
}))

describe('POST /api/practice/tutor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Let me help you with that!',
            pedagogicalIntent: 'guide_next_step',
          }),
        },
      ],
    })
  })

  const createRequest = (body: object): NextRequest => {
    return new NextRequest('http://localhost/api/practice/tutor', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      })

      const request = createRequest({
        sessionId: 'test-session',
        message: 'Help me',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Input Validation', () => {
    it('returns 400 when question is missing', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'Help me',
        correctAnswer: '4',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('returns 400 when correctAnswer is missing', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'Help me',
        question: 'What is 2 + 2?',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('returns 400 when neither message nor hintLevel is provided', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('returns 400 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/practice/tutor', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Message Handling', () => {
    it('successfully processes a message request', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'I need help understanding this',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
        language: 'en',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toBeDefined()
      expect(data.response.message).toBe('Let me help you with that!')
    })

    it('includes conversation history in API call', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'What about this step?',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [
          { role: 'student', content: 'I think it might be 3' },
          { role: 'tutor', content: 'Let me help you think about this.' },
        ],
        language: 'en',
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'assistant' }),
          ]),
        })
      )
    })
  })

  describe('Hint Levels', () => {
    it('processes hint level 1 (Concept) request', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        hintLevel: 1,
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
        language: 'en',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('processes hint level 5 (Answer) request', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        hintLevel: 5,
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
        language: 'en',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Language Support', () => {
    it('uses Hebrew for he language', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'עזור לי',
        question: 'מה זה 2 + 2?',
        correctAnswer: '4',
        conversation: [],
        language: 'he',
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Hebrew'),
        })
      )
    })

    it('defaults to English when no language specified', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'Help me',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.not.stringContaining('Hebrew'),
        })
      )
    })
  })

  describe('Response Parsing', () => {
    it('handles valid JSON response from AI', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Here is my response',
              pedagogicalIntent: 'celebrate',
              diagram: {
                type: 'equation',
                visibleStep: 0,
                totalSteps: 3,
                data: {},
              },
            }),
          },
        ],
      })

      const request = createRequest({
        sessionId: 'test-session',
        message: 'I got it!',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
      })

      const response = await POST(request)
      const data = await response.json()

      // Diagram engine is mocked to return false for shouldUseEngine,
      // and the route always deletes AI-returned diagrams (only uses engine).
      // So diagram should be undefined when engine is not active.
      expect(data.response.diagram).toBeUndefined()
    })

    it('handles non-JSON response from AI gracefully', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'This is just plain text without JSON',
          },
        ],
      })

      const request = createRequest({
        sessionId: 'test-session',
        message: 'Help',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response.message).toBe('This is just plain text without JSON')
      expect(data.response.pedagogicalIntent).toBe('guide_next_step')
    })

    it('extracts JSON from mixed text response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Here is the response:\n{"message": "Extracted JSON", "pedagogicalIntent": "clarify"}',
          },
        ],
      })

      const request = createRequest({
        sessionId: 'test-session',
        message: 'Help',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.response.message).toBe('Extracted JSON')
      expect(data.response.pedagogicalIntent).toBe('clarify')
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when AI API fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'))

      const request = createRequest({
        sessionId: 'test-session',
        message: 'Help',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        conversation: [],
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Context Building', () => {
    it('includes user answer when provided', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'Why is my answer wrong?',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        userAnswer: '3',
        wasCorrect: false,
        conversation: [],
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Student's Answer"),
            }),
          ]),
        })
      )
    })

    it('includes explanation when provided', async () => {
      const request = createRequest({
        sessionId: 'test-session',
        message: 'I need more explanation',
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        explanation: 'Basic addition of integers',
        conversation: [],
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Explanation'),
            }),
          ]),
        })
      )
    })
  })
})
