import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'
import { getSession, recordAnswer } from '@/lib/practice'
import type { AnswerQuestionRequest } from '@/lib/practice/types'

// =============================================================================
// POST /api/practice/session/[sessionId]/answer - Record an answer
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(
      getIdentifier(user.id, request),
      RATE_LIMITS.evaluateAnswer
    )
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(ErrorCodes.RATE_LIMITED)
      const headers = getRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Get session to verify ownership and status
    const session = await getSession(sessionId)
    if (!session) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Session not found')
    }
    if (session.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }
    if (session.status !== 'active') {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Session is not active'
      )
    }

    // Parse request body
    const body = await request.json()
    const { questionId, questionIndex, userAnswer, responseTimeMs } =
      body as AnswerQuestionRequest

    // Validate
    if (!questionId || questionIndex === undefined || userAnswer === undefined) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: questionId, questionIndex, userAnswer'
      )
    }

    // Verify question is in session
    if (!session.question_order.includes(questionId)) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Question not part of this session'
      )
    }

    // Record the answer
    const result = await recordAnswer(
      sessionId,
      questionId,
      questionIndex,
      userAnswer,
      responseTimeMs
    )

    return NextResponse.json(result)
  } catch (error) {
    logError('Practice:answer:record', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to record answer')
  }
}
