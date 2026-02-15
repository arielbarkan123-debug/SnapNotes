import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'
import type { GeneratedCourse } from '@/types'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonIndex: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId, lessonIndex: lessonIndexStr } = await params

    if (!courseId) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'Course ID is required')
    }

    const lessonIndex = parseInt(lessonIndexStr, 10)
    if (isNaN(lessonIndex) || lessonIndex < 0) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid lesson index')
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to modify courses')
    }

    // Fetch existing course and verify ownership
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, user_id, generated_course, total_lessons, lessons_ready')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      logError('DeleteLesson:fetch', fetchError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    const generatedCourse = course.generated_course as GeneratedCourse
    const lessons = generatedCourse?.lessons || []

    if (lessonIndex >= lessons.length) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Lesson not found at this index')
    }

    // Remove the lesson
    const updatedLessons = [...lessons]
    updatedLessons.splice(lessonIndex, 1)

    const updatedCourse: GeneratedCourse = {
      ...generatedCourse,
      lessons: updatedLessons,
    }

    // Update course
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        generated_course: updatedCourse,
        total_lessons: updatedLessons.length,
        lessons_ready: updatedLessons.length,
      })
      .eq('id', courseId)

    if (updateError) {
      logError('DeleteLesson:update', updateError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update course')
    }

    // Adjust user progress — decrement completed_lessons indices > deleted index
    try {
      const { data: progress } = await supabase
        .from('user_progress')
        .select('id, completed_lessons, current_lesson')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (progress) {
        const completedLessons = (progress.completed_lessons || []) as number[]
        const adjustedCompleted = completedLessons
          .filter(idx => idx !== lessonIndex)
          .map(idx => (idx > lessonIndex ? idx - 1 : idx))

        let currentLesson = progress.current_lesson || 0
        if (currentLesson === lessonIndex) {
          currentLesson = Math.min(currentLesson, updatedLessons.length - 1)
        } else if (currentLesson > lessonIndex) {
          currentLesson--
        }
        if (currentLesson < 0) currentLesson = 0

        await supabase
          .from('user_progress')
          .update({
            completed_lessons: adjustedCompleted,
            current_lesson: currentLesson,
          })
          .eq('id', progress.id)
      }
    } catch (progressError) {
      // Non-critical — log but don't fail the request
      logError('DeleteLesson:progress', progressError)
    }

    return NextResponse.json({
      success: true,
      totalLessons: updatedLessons.length,
    })
  } catch (error) {
    logError('DeleteLesson:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete lesson')
  }
}
