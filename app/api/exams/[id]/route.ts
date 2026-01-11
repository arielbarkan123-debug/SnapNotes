import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, courses(title)')
      .eq('id', id)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
    }

    if (exam.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', id)
      .order('question_index', { ascending: true })

    if (questionsError) {
      console.error('[Exam API] Questions fetch error:', questionsError)
      return NextResponse.json({ success: false, error: 'Failed to load questions' }, { status: 500 })
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
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
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
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
    }

    if (exam.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    if (action === 'start') {
      if (exam.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Exam already started' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('exams')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ success: false, error: 'Failed to start exam' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Exam started' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('[Exam API] Error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
