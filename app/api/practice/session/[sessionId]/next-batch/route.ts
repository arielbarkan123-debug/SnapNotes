import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { getSession } from '@/lib/practice'
import { selectExistingQuestions, generateAndStoreQuestions } from '@/lib/practice/question-generator'
import type { DifficultyLevel } from '@/lib/adaptive/types'

export const maxDuration = 90

const BATCH_SIZE = 3

interface NextBatchRequest {
  currentDifficulty: number   // 1-5 float
  recentAccuracy: number      // 0-1 float (last 5 questions)
  questionsAnswered: number   // total answered so far
  weakConceptIds?: string[]   // concepts to focus on
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Verify session ownership and type
    const session = await getSession(sessionId)
    if (!session) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Session not found')
    }
    if (session.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }
    if (session.session_type !== 'infinite') {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Not an infinite session')
    }
    if (session.status !== 'active') {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Session is not active')
    }

    // Parse body
    let body: NextBatchRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid request body')
    }
    const { currentDifficulty, recentAccuracy, questionsAnswered, weakConceptIds } = body

    // Calibrate difficulty
    let newDifficulty = currentDifficulty
    if (questionsAnswered > 0 && questionsAnswered % 5 === 0) {
      if (recentAccuracy > 0.85) {
        newDifficulty = Math.min(5, currentDifficulty + 0.1)
      } else if (recentAccuracy < 0.50) {
        newDifficulty = Math.max(1, currentDifficulty - 0.1)
      }
    }

    // Round to nearest integer for DB query (DifficultyLevel is 1-5 int)
    const queryDifficulty = Math.max(1, Math.min(5, Math.round(newDifficulty))) as DifficultyLevel

    // Determine target concepts: rotate to weakest every 10 questions
    const targetConceptIds = (questionsAnswered > 0 && questionsAnswered % 10 === 0 && weakConceptIds?.length)
      ? weakConceptIds.slice(0, 3)
      : undefined

    // Exclude already-used question IDs to avoid repeats
    const usedIds = session.question_order || []

    // Try to select existing questions first
    let questionIds = await selectExistingQuestions({
      courseId: session.course_id || undefined,
      conceptIds: targetConceptIds,
      difficulty: queryDifficulty,
      count: BATCH_SIZE,
      excludeQuestionIds: usedIds,
    })

    // If not enough, generate via AI
    if (questionIds.length < BATCH_SIZE && session.course_id) {
      const shortfall = BATCH_SIZE - questionIds.length
      try {
        const { questionIds: newIds } = await generateAndStoreQuestions({
          courseId: session.course_id,
          count: shortfall,
        })
        questionIds = [...questionIds, ...newIds]
      } catch (err) {
        logError('InfiniteBatch:generate', err)
      }
    }

    if (questionIds.length === 0) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'No more questions available')
    }

    // Fetch the actual question data
    const { data: questions } = await supabase
      .from('practice_questions')
      .select('*')
      .in('id', questionIds)

    // Append new question IDs to session's question_order
    const updatedOrder = [...usedIds, ...questionIds]
    await supabase
      .from('practice_sessions')
      .update({
        question_order: updatedOrder,
        question_count: updatedOrder.length,
      })
      .eq('id', sessionId)

    return NextResponse.json({
      questions: questions || [],
      newDifficulty,
      batchStartIndex: usedIds.length,
    })
  } catch (error) {
    logError('InfiniteBatch:fetch', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch next batch')
  }
}
