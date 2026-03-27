/**
 * @fix_context Tests for Adaptive API routes
 *
 * POST /api/adaptive/feedback  - Adjust difficulty based on user feedback
 * POST /api/adaptive/record    - Record an answer for adaptive difficulty
 * POST /api/adaptive/reset     - Reset session state
 * GET  /api/adaptive/state     - Get user's performance state
 */

import { POST as feedbackPOST } from '@/app/api/adaptive/feedback/route'
import { POST as recordPOST } from '@/app/api/adaptive/record/route'
import { POST as resetPOST } from '@/app/api/adaptive/reset/route'
import { GET as stateGET } from '@/app/api/adaptive/state/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-001': 401,
      'NS-VAL-001': 400,
      'NS-VAL-003': 400,
      'NS-RES-001': 404,
      'NS-DB-001': 500,
      'NS-DB-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-001',
    INVALID_INPUT: 'NS-VAL-001',
    MISSING_FIELD: 'NS-VAL-003',
    NOT_FOUND: 'NS-RES-001',
    DATABASE_ERROR: 'NS-DB-001',
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

jest.mock('@/lib/adaptive', () => ({
  recordAnswer: jest.fn(),
  resetSessionState: jest.fn(),
  savePerformanceSnapshot: jest.fn(),
  getPerformanceSummary: jest.fn(),
}))

describe('Adaptive API', () => {
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
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
        }

        if (table === 'practice_sessions') {
          builder.single.mockResolvedValue({
            data: { course_id: 'course-abc' },
            error: null,
          })
        } else if (table === 'user_performance_state') {
          builder.maybeSingle.mockResolvedValue({
            data: { target_difficulty: 2.0, difficulty_floor: 1.0 },
            error: null,
          })
          // update chain resolves successfully
          builder.eq.mockResolvedValue({ error: null })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  // ==========================================================================
  // POST /api/adaptive/feedback
  // ==========================================================================

  describe('POST /api/adaptive/feedback', () => {
    /** @fix_context Authentication */
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_easy',
            session_id: 'sess-1',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        expect(response.status).toBe(401)
      })
    })

    /** @fix_context Validation */
    describe('Validation', () => {
      it('returns 400 for invalid feedback value', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'invalid_value',
            session_id: 'sess-1',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        expect(response.status).toBe(400)
      })

      it('returns 400 when session_id is missing', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_easy',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        expect(response.status).toBe(400)
      })

      it('returns 400 when question_id is missing', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_easy',
            session_id: 'sess-1',
          }),
        })

        const response = await feedbackPOST(request)
        expect(response.status).toBe(400)
      })

      it('returns 400 for malformed JSON body', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: 'not-json{{{',
        })

        const response = await feedbackPOST(request)
        expect(response.status).toBe(400)
      })
    })

    /** @fix_context Happy Path */
    describe('Happy Path', () => {
      it('adjusts difficulty up for too_easy feedback', async () => {
        // Need separate mocks for the 3 from() calls:
        // 1) practice_sessions SELECT
        // 2) user_performance_state SELECT (maybeSingle)
        // 3) user_performance_state UPDATE (.update().eq().eq())
        let fromCallCount = 0
        mockSupabase.from.mockImplementation((table: string) => {
          fromCallCount++

          if (table === 'practice_sessions') {
            const builder: any = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { course_id: 'course-abc' },
                error: null,
              }),
            }
            return builder
          }

          if (table === 'user_performance_state' && fromCallCount <= 2) {
            // First call: SELECT for current state
            const builder: any = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { target_difficulty: 2.0, difficulty_floor: 1.0 },
                error: null,
              }),
            }
            return builder
          }

          // Second call to user_performance_state: UPDATE
          const updateBuilder: any = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => {
              // Make the chain awaitable — the last .eq() is the terminal call
              const thenable = Object.assign(jest.fn().mockReturnThis(), {
                then: (resolve: any) => resolve({ error: null }),
              }) as any
              thenable.eq = jest.fn().mockReturnValue({
                then: (resolve: any) => resolve({ error: null }),
              })
              return thenable
            }),
          }
          return updateBuilder
        })

        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_easy',
            session_id: 'sess-1',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.adjusted).toBe(true)
        expect(data.new_target_difficulty).toBe(2.5)
        expect(data.new_difficulty_floor).toBe(1.25)
      })

      it('adjusts difficulty down for too_hard feedback', async () => {
        let fromCallCount = 0
        mockSupabase.from.mockImplementation((table: string) => {
          fromCallCount++

          if (table === 'practice_sessions') {
            const builder: any = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { course_id: 'course-abc' },
                error: null,
              }),
            }
            return builder
          }

          if (table === 'user_performance_state' && fromCallCount <= 2) {
            const builder: any = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { target_difficulty: 2.0, difficulty_floor: 1.0 },
                error: null,
              }),
            }
            return builder
          }

          const updateBuilder: any = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => {
              const thenable = Object.assign(jest.fn().mockReturnThis(), {
                then: (resolve: any) => resolve({ error: null }),
              }) as any
              thenable.eq = jest.fn().mockReturnValue({
                then: (resolve: any) => resolve({ error: null }),
              })
              return thenable
            }),
          }
          return updateBuilder
        })

        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_hard',
            session_id: 'sess-1',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.adjusted).toBe(true)
        expect(data.new_target_difficulty).toBe(1.5)
        expect(data.new_difficulty_floor).toBe(1.0) // floored at 1.0
      })

      it('returns adjusted:false when no performance state exists', async () => {
        // Override to return null for performance state
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'practice_sessions') {
            builder.single.mockResolvedValue({
              data: { course_id: 'course-abc' },
              error: null,
            })
          } else if (table === 'user_performance_state') {
            builder.maybeSingle.mockResolvedValue({ data: null, error: null })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_easy',
            session_id: 'sess-1',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.adjusted).toBe(false)
      })
    })

    /** @fix_context Error Handling */
    describe('Error Handling', () => {
      it('returns 404 when session is not found', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'practice_sessions') {
            builder.single.mockResolvedValue({
              data: null,
              error: { message: 'not found' },
            })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_easy',
            session_id: 'nonexistent',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        expect(response.status).toBe(404)
      })

      it('returns 500 when update fails', async () => {
        // Override so update returns an error
        mockSupabase.from.mockImplementation((table: string) => {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
          }

          if (table === 'practice_sessions') {
            builder.single.mockResolvedValue({
              data: { course_id: 'course-abc' },
              error: null,
            })
          } else if (table === 'user_performance_state') {
            builder.maybeSingle.mockResolvedValue({
              data: { target_difficulty: 2.0, difficulty_floor: 1.0 },
              error: null,
            })
            // The update chain: update().eq().eq() — the last eq resolves with error
            builder.eq.mockResolvedValue({ error: { message: 'DB write failed' } })
          }

          return builder
        })

        const request = new NextRequest('http://localhost/api/adaptive/feedback', {
          method: 'POST',
          body: JSON.stringify({
            feedback: 'too_easy',
            session_id: 'sess-1',
            question_id: 'q-1',
          }),
        })

        const response = await feedbackPOST(request)
        expect(response.status).toBe(500)
      })
    })
  })

  // ==========================================================================
  // POST /api/adaptive/record
  // ==========================================================================

  describe('POST /api/adaptive/record', () => {
    const mockRecordResult = {
      newDifficulty: 2.3,
      newState: {
        estimated_ability: 2.1,
        rolling_accuracy: 0.75,
        correct_streak: 3,
        wrong_streak: 0,
      },
      feedback: { message: 'Good job!' },
      difficultyChanged: true,
    }

    beforeEach(() => {
      const { recordAnswer } = require('@/lib/adaptive')
      recordAnswer.mockResolvedValue(mockRecordResult)
    })

    /** @fix_context Authentication */
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: JSON.stringify({
            question_id: 'q-1',
            question_source: 'practice',
            is_correct: true,
          }),
        })

        const response = await recordPOST(request)
        expect(response.status).toBe(401)
      })
    })

    /** @fix_context Validation */
    describe('Validation', () => {
      it('returns 400 when question_id is missing', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: JSON.stringify({
            question_source: 'practice',
            is_correct: true,
          }),
        })

        const response = await recordPOST(request)
        expect(response.status).toBe(400)
      })

      it('returns 400 when question_source is missing', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: JSON.stringify({
            question_id: 'q-1',
            is_correct: true,
          }),
        })

        const response = await recordPOST(request)
        expect(response.status).toBe(400)
      })

      it('returns 400 when is_correct is not boolean', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: JSON.stringify({
            question_id: 'q-1',
            question_source: 'practice',
            is_correct: 'yes',
          }),
        })

        const response = await recordPOST(request)
        expect(response.status).toBe(400)
      })

      it('returns 400 for malformed JSON body', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: 'broken-json',
        })

        const response = await recordPOST(request)
        expect(response.status).toBe(400)
      })
    })

    /** @fix_context Happy Path */
    describe('Happy Path', () => {
      it('records answer and returns new difficulty', async () => {
        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: JSON.stringify({
            question_id: 'q-1',
            question_source: 'practice',
            is_correct: true,
            response_time_ms: 5000,
            question_difficulty: 2.0,
            concept_id: 'concept-1',
            course_id: 'course-abc',
          }),
        })

        const response = await recordPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.new_difficulty).toBe(2.3)
        expect(data.estimated_ability).toBe(2.1)
        expect(data.accuracy).toBe(0.75)
        expect(data.streak).toBe(3)
        expect(data.feedback).toBe('Good job!')
        expect(data.difficulty_changed).toBe(true)
      })

      it('passes correct parameters to recordAnswer', async () => {
        const { recordAnswer } = require('@/lib/adaptive')

        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: JSON.stringify({
            question_id: 'q-2',
            question_source: 'exam',
            is_correct: false,
            course_id: 'course-xyz',
          }),
        })

        await recordPOST(request)

        expect(recordAnswer).toHaveBeenCalledWith({
          userId: 'user-123',
          courseId: 'course-xyz',
          questionId: 'q-2',
          questionSource: 'exam',
          isCorrect: false,
          responseTimeMs: undefined,
          questionDifficulty: undefined,
          conceptId: undefined,
        })
      })
    })

    /** @fix_context Error Handling */
    describe('Error Handling', () => {
      it('returns 500 when recordAnswer throws', async () => {
        const { recordAnswer } = require('@/lib/adaptive')
        recordAnswer.mockRejectedValue(new Error('DB connection lost'))

        const request = new NextRequest('http://localhost/api/adaptive/record', {
          method: 'POST',
          body: JSON.stringify({
            question_id: 'q-1',
            question_source: 'practice',
            is_correct: true,
          }),
        })

        const response = await recordPOST(request)
        expect(response.status).toBe(500)
      })
    })
  })

  // ==========================================================================
  // POST /api/adaptive/reset
  // ==========================================================================

  describe('POST /api/adaptive/reset', () => {
    /** @fix_context Authentication */
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/adaptive/reset', {
          method: 'POST',
        })

        const response = await resetPOST(request)
        expect(response.status).toBe(401)
      })
    })

    /** @fix_context Happy Path */
    describe('Happy Path', () => {
      it('resets session state without courseId', async () => {
        const { resetSessionState, savePerformanceSnapshot } = require('@/lib/adaptive')

        const request = new NextRequest('http://localhost/api/adaptive/reset', {
          method: 'POST',
        })

        const response = await resetPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('Session state reset successfully')
        expect(savePerformanceSnapshot).toHaveBeenCalledWith('user-123', undefined)
        expect(resetSessionState).toHaveBeenCalledWith('user-123', undefined)
      })

      it('resets session state with courseId', async () => {
        const { resetSessionState, savePerformanceSnapshot } = require('@/lib/adaptive')

        const request = new NextRequest('http://localhost/api/adaptive/reset?courseId=course-abc', {
          method: 'POST',
        })

        const response = await resetPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(savePerformanceSnapshot).toHaveBeenCalledWith('user-123', 'course-abc')
        expect(resetSessionState).toHaveBeenCalledWith('user-123', 'course-abc')
      })
    })

    /** @fix_context Error Handling */
    describe('Error Handling', () => {
      it('returns 500 when resetSessionState throws', async () => {
        const { resetSessionState } = require('@/lib/adaptive')
        resetSessionState.mockRejectedValue(new Error('DB error'))

        const request = new NextRequest('http://localhost/api/adaptive/reset', {
          method: 'POST',
        })

        const response = await resetPOST(request)
        expect(response.status).toBe(500)
      })
    })
  })

  // ==========================================================================
  // GET /api/adaptive/state
  // ==========================================================================

  describe('GET /api/adaptive/state', () => {
    const mockSummary = {
      accuracy: 0.82,
      ability: 2.3,
      difficulty: 2.0,
      streak: 4,
      streakType: 'correct',
      questionsAnswered: 25,
    }

    beforeEach(() => {
      const { getPerformanceSummary } = require('@/lib/adaptive')
      getPerformanceSummary.mockResolvedValue(mockSummary)
    })

    /** @fix_context Authentication */
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/adaptive/state')

        const response = await stateGET(request)
        expect(response.status).toBe(401)
      })
    })

    /** @fix_context Happy Path */
    describe('Happy Path', () => {
      it('returns performance summary without courseId', async () => {
        const { getPerformanceSummary } = require('@/lib/adaptive')

        const request = new NextRequest('http://localhost/api/adaptive/state')

        const response = await stateGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.accuracy).toBe(0.82)
        expect(data.estimatedAbility).toBe(2.3)
        expect(data.currentDifficulty).toBe(2.0)
        expect(data.streak).toBe(4)
        expect(data.streakType).toBe('correct')
        expect(data.questionsAnswered).toBe(25)
        expect(getPerformanceSummary).toHaveBeenCalledWith('user-123', undefined)
      })

      it('passes courseId to getPerformanceSummary', async () => {
        const { getPerformanceSummary } = require('@/lib/adaptive')

        const request = new NextRequest('http://localhost/api/adaptive/state?courseId=course-xyz')

        await stateGET(request)

        expect(getPerformanceSummary).toHaveBeenCalledWith('user-123', 'course-xyz')
      })
    })

    /** @fix_context Error Handling */
    describe('Error Handling', () => {
      it('returns 500 when getPerformanceSummary throws', async () => {
        const { getPerformanceSummary } = require('@/lib/adaptive')
        getPerformanceSummary.mockRejectedValue(new Error('DB error'))

        const request = new NextRequest('http://localhost/api/adaptive/state')

        const response = await stateGET(request)
        expect(response.status).toBe(500)
      })
    })
  })
})
