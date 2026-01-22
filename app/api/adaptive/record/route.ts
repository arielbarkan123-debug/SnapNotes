import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { recordAnswer } from '@/lib/adaptive'
import type { QuestionSource } from '@/lib/adaptive'

// =============================================================================
// Types
// =============================================================================

interface RecordAnswerBody {
  question_id: string
  question_source: QuestionSource
  is_correct: boolean
  response_time_ms?: number
  question_difficulty?: number
  concept_id?: string
  course_id?: string
}

// =============================================================================
// POST /api/adaptive/record - Record an answer
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Parse request body
    let body: RecordAnswerBody
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const {
      question_id,
      question_source,
      is_correct,
      response_time_ms,
      question_difficulty,
      concept_id,
      course_id,
    } = body

    // Validate required fields
    if (!question_id) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'question_id is required')
    }

    if (!question_source) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'question_source is required')
    }

    if (typeof is_correct !== 'boolean') {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'is_correct is required')
    }

    // Record the answer
    const result = await recordAnswer({
      userId: user.id,
      courseId: course_id,
      questionId: question_id,
      questionSource: question_source,
      isCorrect: is_correct,
      responseTimeMs: response_time_ms,
      questionDifficulty: question_difficulty,
      conceptId: concept_id,
    })

    return NextResponse.json({
      success: true,
      new_difficulty: result.newDifficulty,
      estimated_ability: result.newState.estimated_ability,
      accuracy: result.newState.rolling_accuracy,
      streak: Math.max(result.newState.correct_streak, result.newState.wrong_streak),
      feedback: result.feedback.message,
      difficulty_changed: result.difficultyChanged,
    })

  } catch (error) {
    logError('Adaptive:record:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to record answer')
  }
}
