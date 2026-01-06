import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContinuationLessons } from '@/lib/ai'
import type { UserLearningContext } from '@/lib/ai'
import { logError } from '@/lib/api/errors'
import type { LessonOutline, Lesson, GeneratedCourse } from '@/types'

// Allow 3 minutes for continuation (generates 2 lessons at a time)
export const maxDuration = 180

/**
 * POST /api/generate-course/continue
 *
 * Continues generating lessons for a partially-generated course.
 * Called by client after initial fast generation returns.
 * Generates 2 lessons at a time until course is complete.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required', code: 'MISSING_FIELD' },
        { status: 400 }
      )
    }

    // 3. Fetch course with progressive generation metadata
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !course) {
      return NextResponse.json(
        { error: 'Course not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Check if generation is already complete
    if (course.generation_status === 'complete') {
      return NextResponse.json({
        status: 'complete',
        lessonsReady: course.lessons_ready,
        totalLessons: course.total_lessons,
        continue: false,
      })
    }

    // 5. Validate we have the required metadata for continuation
    if (!course.document_summary || !course.lesson_outline) {
      return NextResponse.json(
        { error: 'Course missing continuation metadata', code: 'INVALID_STATE' },
        { status: 400 }
      )
    }

    // 6. Update status to generating
    await supabase
      .from('courses')
      .update({ generation_status: 'generating' })
      .eq('id', courseId)

    // 7. Fetch user context for personalization
    let userContext: UserLearningContext | undefined
    try {
      const { data: profile } = await supabase
        .from('user_learning_profile')
        .select('education_level, study_system, study_goal, learning_styles, language')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        userContext = {
          educationLevel: profile.education_level || 'high_school',
          studySystem: profile.study_system || 'general',
          studyGoal: profile.study_goal || 'general_learning',
          learningStyles: profile.learning_styles || ['practice'],
          language: profile.language || 'en',
        }
      }
    } catch {
      // Continue without personalization
    }

    // 8. Determine which lessons to generate (2 at a time)
    const currentLessons: Lesson[] = (course.generated_course as GeneratedCourse)?.lessons || []
    const lessonOutline: LessonOutline[] = course.lesson_outline as LessonOutline[]
    const startIndex = currentLessons.length
    const endIndex = Math.min(startIndex + 2, course.total_lessons)

    // Generate indices for next batch (0-indexed)
    const targetIndices = Array.from(
      { length: endIndex - startIndex },
      (_, i) => startIndex + i
    )

    if (targetIndices.length === 0) {
      // No more lessons to generate
      await supabase
        .from('courses')
        .update({
          generation_status: 'complete',
          lessons_ready: currentLessons.length,
        })
        .eq('id', courseId)

      return NextResponse.json({
        status: 'complete',
        lessonsReady: currentLessons.length,
        totalLessons: course.total_lessons,
        continue: false,
      })
    }

    console.log(`[continue] Generating lessons ${targetIndices.map(i => i + 1).join(', ')} for course ${courseId}`)

    // 9. Generate next batch of lessons
    const result = await generateContinuationLessons(
      course.document_summary,
      lessonOutline,
      currentLessons,
      targetIndices,
      userContext
    )

    // 10. Merge new lessons into course
    const updatedLessons = [...currentLessons, ...result.newLessons]
    const isComplete = updatedLessons.length >= course.total_lessons

    const updatedCourse: GeneratedCourse = {
      ...(course.generated_course as GeneratedCourse),
      lessons: updatedLessons,
    }

    // 11. Update course in database
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        generated_course: updatedCourse,
        lessons_ready: updatedLessons.length,
        generation_status: isComplete ? 'complete' : 'partial',
      })
      .eq('id', courseId)

    if (updateError) {
      logError('GenerateCourse:continue:update', updateError)
      // Mark as failed
      await supabase
        .from('courses')
        .update({ generation_status: 'failed' })
        .eq('id', courseId)

      return NextResponse.json(
        { error: 'Failed to update course', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    console.log(`[continue] Course ${courseId}: ${updatedLessons.length}/${course.total_lessons} lessons ready`)

    // 12. Return status
    return NextResponse.json({
      status: isComplete ? 'complete' : 'partial',
      lessonsReady: updatedLessons.length,
      totalLessons: course.total_lessons,
      continue: !isComplete, // Client should call again if not complete
    })

  } catch (error) {
    logError('GenerateCourse:continue', error)
    return NextResponse.json(
      { error: 'Failed to continue generation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
