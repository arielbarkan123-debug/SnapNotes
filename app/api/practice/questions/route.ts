import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { generateAndStoreQuestions } from '@/lib/practice'
import type { GenerateQuestionsRequest } from '@/lib/practice/types'

// =============================================================================
// GET /api/practice/questions - Get available practice questions
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const difficulty = searchParams.get('difficulty')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('practice_questions')
      .select('id, question_type, question_text, difficulty_level, subject, topic, primary_concept_id')
      .eq('is_active', true)

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    if (difficulty) {
      query = query.eq('difficulty_level', parseInt(difficulty))
    }

    const { data, error } = await query.limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      questions: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    logError('Practice:questions:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch questions')
  }
}

// =============================================================================
// POST /api/practice/questions - Generate new practice questions
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Parse request body
    const body = await request.json()
    const { courseId, count, conceptIds, difficulty, questionTypes } =
      body as GenerateQuestionsRequest

    // Validate
    if (!courseId) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'courseId is required')
    }

    if (!count || count < 1 || count > 50) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'count must be between 1 and 50'
      )
    }

    // Verify course exists and user has access
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, user_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    if (course.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }

    // Generate questions
    const result = await generateAndStoreQuestions({
      courseId,
      count,
      conceptIds,
      difficulty,
      questionTypes,
    })

    return NextResponse.json(result)
  } catch (error) {
    logError('Practice:questions:generate', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate questions')
  }
}
