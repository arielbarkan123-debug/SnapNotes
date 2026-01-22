import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Allow 60 seconds for database operations
export const maxDuration = 60

/**
 * Deep Practice Progress API
 *
 * Tracks mastery progress for deep practice mode lessons.
 * Stores mastery level, attempts, and completion status.
 */

interface DeepPracticeRequest {
  courseId: string
  lessonIndex: number
  conceptId: string
  mastery: number
  problemsAttempted: number
  problemsCorrect: number
  completed: boolean
}

// POST: Create or update deep practice progress
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: DeepPracticeRequest = await request.json()
    const {
      courseId,
      lessonIndex,
      conceptId,
      mastery,
      problemsAttempted,
      problemsCorrect,
      completed,
    } = body

    // Validate required fields
    if (!courseId || lessonIndex === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Upsert deep practice progress
    const { data, error } = await supabase
      .from('deep_practice_progress')
      .upsert({
        user_id: user.id,
        course_id: courseId,
        lesson_index: lessonIndex,
        concept_id: conceptId || `lesson_${lessonIndex}`,
        current_mastery: mastery,
        problems_attempted: problemsAttempted,
        problems_correct: problemsCorrect,
        current_difficulty: 1,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      }, {
        onConflict: 'user_id,course_id,lesson_index',
      })
      .select()
      .single()

    if (error) {
      console.error('[DeepPractice API] Error saving progress:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      progress: data,
    })
  } catch (error) {
    console.error('[DeepPractice API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Fetch deep practice progress for a course/lesson
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const lessonIndex = searchParams.get('lessonIndex')

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'courseId is required' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('deep_practice_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (lessonIndex !== null) {
      query = query.eq('lesson_index', parseInt(lessonIndex, 10))
    }

    const { data, error } = await query

    if (error) {
      console.error('[DeepPractice API] Error fetching progress:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      progress: lessonIndex !== null ? data?.[0] || null : data,
    })
  } catch (error) {
    console.error('[DeepPractice API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
