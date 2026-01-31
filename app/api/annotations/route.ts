import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch annotations for a course/lesson
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const lessonIndex = searchParams.get('lessonIndex')

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    let query = supabase
      .from('user_annotations')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (lessonIndex !== null && lessonIndex !== undefined) {
      query = query.eq('lesson_index', parseInt(lessonIndex, 10))
    }

    const { data, error } = await query.order('step_index', { ascending: true })

    if (error) {
      console.error('[Annotations API] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
    }

    return NextResponse.json({ success: true, annotations: data || [] })
  } catch (err) {
    console.error('[Annotations API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update an annotation
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, lessonIndex, stepIndex, noteText, flagType } = body

    if (!courseId || lessonIndex === undefined) {
      return NextResponse.json({ error: 'courseId and lessonIndex are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_annotations')
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          lesson_index: lessonIndex,
          step_index: stepIndex ?? null,
          note_text: noteText || null,
          flag_type: flagType || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,course_id,lesson_index,step_index',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[Annotations API] Upsert error:', error)
      return NextResponse.json({ error: 'Failed to save annotation' }, { status: 500 })
    }

    return NextResponse.json({ success: true, annotation: data })
  } catch (err) {
    console.error('[Annotations API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove an annotation
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_annotations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Annotations API] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete annotation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Annotations API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
