import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'
import type { GeneratedCourse } from '@/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId } = await params

    if (!courseId) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'Course ID is required')
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to rename courses')
    }

    const body = await request.json()
    const { title } = body as { title?: string }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Title is required')
    }

    if (title.trim().length > 200) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Title must be 200 characters or less')
    }

    const trimmedTitle = title.trim()

    // Fetch existing course and verify ownership
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, user_id, generated_course')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      logError('RenameCourse:fetch', fetchError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // Update title in both the column and the JSONB
    const updatedGeneratedCourse = {
      ...(course.generated_course as GeneratedCourse),
      title: trimmedTitle,
    }

    const { error: updateError } = await supabase
      .from('courses')
      .update({
        title: trimmedTitle,
        generated_course: updatedGeneratedCourse,
      })
      .eq('id', courseId)

    if (updateError) {
      logError('RenameCourse:update', updateError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to rename course')
    }

    return NextResponse.json({
      success: true,
      title: trimmedTitle,
    })
  } catch (error) {
    logError('RenameCourse:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to rename course')
  }
}
