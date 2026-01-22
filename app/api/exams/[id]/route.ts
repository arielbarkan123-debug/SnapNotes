import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, courses(title)')
      .eq('id', id)
      .single()

    if (examError || !exam) {
      return createErrorResponse(ErrorCodes.EXAM_NOT_FOUND)
    }

    if (exam.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN)
    }

    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', id)
      .order('question_index', { ascending: true })

    if (questionsError) {
      console.error('[Exam API] Questions fetch error:', questionsError)
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to load questions')
    }

    const safeQuestions = (questions || []).map(q => {
      if (exam.status === 'completed' || exam.status === 'expired') {
        return q
      }
      return {
        ...q,
        correct_answer: undefined,
        explanation: undefined,
        is_correct: undefined,
      }
    })

    return NextResponse.json({
      success: true,
      exam: {
        ...exam,
        course_title: (exam.courses as { title?: string } | null)?.title,
        questions: safeQuestions,
      },
    })

  } catch (error) {
    console.error('[Exam API] Error:', error)
    return createErrorResponse(ErrorCodes.EXAM_UNKNOWN)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const { action } = body

    // Only select fields needed for PATCH authorization and status check
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, user_id, status')
      .eq('id', id)
      .single()

    if (examError || !exam) {
      return createErrorResponse(ErrorCodes.EXAM_NOT_FOUND)
    }

    if (exam.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN)
    }

    if (action === 'start') {
      if (exam.status !== 'pending') {
        return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, 'Exam already started')
      }

      const { error: updateError } = await supabase
        .from('exams')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to start exam')
      }

      return NextResponse.json({ success: true, message: 'Exam started' })
    }

    return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, 'Invalid action')

  } catch (error) {
    console.error('[Exam API] Error:', error)
    return createErrorResponse(ErrorCodes.EXAM_UNKNOWN)
  }
}
