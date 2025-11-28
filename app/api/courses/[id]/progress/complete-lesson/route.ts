import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GeneratedCourse } from '@/types'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/courses/[id]/progress/complete-lesson
 * Mark a lesson as completed and advance to next lesson
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const courseId = params.id

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { lesson_index } = body

    // Validate input
    if (typeof lesson_index !== 'number' || lesson_index < 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Required: lesson_index (non-negative number)' },
        { status: 400 }
      )
    }

    // Get course to verify ownership and get total lessons
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, generated_course')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const generatedCourse = course.generated_course as GeneratedCourse
    const totalLessons = generatedCourse.lessons?.length || 0

    // Validate lesson_index is within bounds
    if (lesson_index >= totalLessons) {
      return NextResponse.json(
        { error: `Invalid lesson_index. Course has ${totalLessons} lessons (0-${totalLessons - 1})` },
        { status: 400 }
      )
    }

    // Get existing progress
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    // Calculate new progress values
    const currentCompletedLessons = existingProgress?.completed_lessons || []
    const newCompletedLessons = [...new Set([...currentCompletedLessons, lesson_index])].sort((a, b) => a - b)

    // Determine next lesson (next uncompleted or stay on last)
    let nextLesson = lesson_index
    for (let i = 0; i < totalLessons; i++) {
      if (!newCompletedLessons.includes(i)) {
        nextLesson = i
        break
      }
      // If all lessons completed, stay on last lesson
      if (i === totalLessons - 1) {
        nextLesson = totalLessons - 1
      }
    }

    let progress

    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabase
        .from('user_progress')
        .update({
          current_lesson: nextLesson,
          current_step: 0, // Reset to first step of new lesson
          completed_lessons: newCompletedLessons,
        })
        .eq('id', existingProgress.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating progress:', error)
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        )
      }

      progress = data
    } else {
      // Create new progress with this lesson completed
      const { data, error } = await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          current_lesson: nextLesson,
          current_step: 0,
          completed_lessons: newCompletedLessons,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating progress:', error)
        return NextResponse.json(
          { error: 'Failed to create progress' },
          { status: 500 }
        )
      }

      progress = data
    }

    // Calculate completion status
    const isAllComplete = newCompletedLessons.length >= totalLessons

    return NextResponse.json({
      id: progress.id,
      current_lesson: progress.current_lesson,
      current_step: progress.current_step,
      completed_lessons: progress.completed_lessons || [],
      created_at: progress.created_at,
      updated_at: progress.updated_at,
      // Additional helpful info
      lesson_completed: lesson_index,
      total_lessons: totalLessons,
      is_course_complete: isAllComplete,
      next_lesson: isAllComplete ? null : nextLesson,
    })

  } catch (error) {
    console.error('Complete lesson error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
