import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface UpdateLessonProgressRequest {
  courseId: string
  lessonIndex: number
  lessonTitle?: string
  questionsAnswered?: number
  questionsCorrect?: number
  timeSeconds?: number
  completed?: boolean
}

/**
 * POST /api/lesson-progress
 * Update lesson progress after completing a lesson or step
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body: UpdateLessonProgressRequest = await request.json()
    const {
      courseId,
      lessonIndex,
      lessonTitle,
      questionsAnswered = 0,
      questionsCorrect = 0,
      timeSeconds = 0,
      completed = false,
    } = body

    if (!courseId || lessonIndex === undefined) {
      return NextResponse.json(
        { success: false, error: 'Course ID and lesson index are required' },
        { status: 400 }
      )
    }

    // Calculate mastery from step_performance (returns 0 if table doesn't exist)
    const mastery = await calculateLessonMastery(supabase, user.id, courseId, lessonIndex)

    // Upsert lesson progress
    const { data: existing, error: selectError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('lesson_index', lessonIndex)
      .single()

    // If table doesn't exist, return success without tracking
    if (selectError && selectError.code === 'PGRST205') {
      return NextResponse.json({ success: true, progress: null })
    }

    let progress
    if (existing) {
      const { data, error } = await supabase
        .from('lesson_progress')
        .update({
          lesson_title: lessonTitle || existing.lesson_title,
          completed: existing.completed || completed,
          completed_at: (existing.completed || completed) ? (existing.completed_at || new Date().toISOString()) : null,
          mastery_level: mastery,
          total_attempts: existing.total_attempts + questionsAnswered,
          total_correct: existing.total_correct + questionsCorrect,
          total_time_seconds: existing.total_time_seconds + timeSeconds,
          last_studied_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        // Don't throw if table doesn't exist
        if (error.code === 'PGRST205') {
          return NextResponse.json({ success: true, progress: null })
        }
        throw error
      }
      progress = data
    } else {
      const { data, error } = await supabase
        .from('lesson_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          lesson_index: lessonIndex,
          lesson_title: lessonTitle,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          mastery_level: mastery,
          total_attempts: questionsAnswered,
          total_correct: questionsCorrect,
          total_time_seconds: timeSeconds,
          last_studied_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        // Don't throw if table doesn't exist
        if (error.code === 'PGRST205') {
          return NextResponse.json({ success: true, progress: null })
        }
        throw error
      }
      progress = data
    }

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error('[Lesson Progress API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/lesson-progress
 * Get lesson progress for a course
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    let query = supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('lesson_index', { ascending: true })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: progress, error } = await query

    if (error) {
      // Don't log error if table doesn't exist - feature is optional
      if (error.code !== 'PGRST205') {
        console.error('[Lesson Progress API] Fetch error:', error)
      }
      // Return empty progress if table doesn't exist
      return NextResponse.json({ success: true, progress: [] })
    }

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error('[Lesson Progress API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate lesson mastery from step_performance data
 */
async function calculateLessonMastery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  courseId: string,
  lessonIndex: number
): Promise<number> {
  // Get all step performance for this lesson
  const { data: steps, error } = await supabase
    .from('step_performance')
    .select('was_correct, created_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('lesson_index', lessonIndex)
    .in('step_type', ['multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'sequence', 'question'])
    .order('created_at', { ascending: false })

  // Return 0 if table doesn't exist or no data
  if (error || !steps || steps.length === 0) {
    return 0
  }

  // Calculate accuracy from questions with correct/incorrect results
  const questionsWithResults = steps.filter(s => s.was_correct !== null)
  if (questionsWithResults.length === 0) {
    return 0
  }

  const correctCount = questionsWithResults.filter(s => s.was_correct).length
  const baseAccuracy = correctCount / questionsWithResults.length

  // Apply recency weight
  const mostRecentDate = new Date(steps[0].created_at)
  const daysSinceStudied = (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)

  let recencyWeight = 1.0
  if (daysSinceStudied > 14) recencyWeight = 0.6
  else if (daysSinceStudied > 7) recencyWeight = 0.7
  else if (daysSinceStudied > 3) recencyWeight = 0.85
  else if (daysSinceStudied > 1) recencyWeight = 0.95

  // Final mastery
  return Math.min(baseAccuracy * recencyWeight, 1.0)
}
