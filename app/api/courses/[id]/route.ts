import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'

// ============================================================================
// DELETE - Delete a course and all associated data
// ============================================================================

export async function DELETE(
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to delete courses')
    }

    // Verify the course belongs to the user
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, user_id, original_image_url')
      .eq('id', courseId)
      .maybeSingle()

    if (fetchError) {
      logError('DeleteCourse:fetch', fetchError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    if (course.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'You do not have permission to delete this course')
    }

    // Use service client to bypass RLS for deletions
    // We already verified ownership above
    const serviceClient = await createServiceClient()

    // Delete associated data - use service client to bypass RLS
    // Wrap each in try-catch since some tables might not exist

    try {
      // 1. First get all card IDs for this course to delete their logs
      const { data: cards } = await serviceClient
        .from('review_cards')
        .select('id')
        .eq('course_id', courseId)

      // 2. Delete review logs for those cards (if any cards exist)
      if (cards && cards.length > 0) {
        const cardIds = cards.map(c => c.id)
        await serviceClient
          .from('review_logs')
          .delete()
          .in('card_id', cardIds)
      }

      // 3. Delete review cards for this course
      await serviceClient
        .from('review_cards')
        .delete()
        .eq('course_id', courseId)
    } catch {
      // Tables might not exist, continue
    }

    try {
      // 4. Delete user progress for this course
      await serviceClient
        .from('user_progress')
        .delete()
        .eq('course_id', courseId)
    } catch {
      // Table might not exist, continue
    }

    try {
      // 5. Delete self-assessments for this course
      await serviceClient
        .from('lesson_self_assessment')
        .delete()
        .eq('course_id', courseId)
    } catch {
      // Table might not exist, continue
    }

    try {
      // 6. Delete step performance data
      await serviceClient
        .from('step_performance')
        .delete()
        .eq('course_id', courseId)
    } catch {
      // Table might not exist, continue
    }

    try {
      // 7. Delete user mastery data
      await serviceClient
        .from('user_mastery')
        .delete()
        .eq('course_id', courseId)
    } catch {
      // Table might not exist, continue
    }

    // 8. Delete the course itself using service client
    const { error: deleteError } = await serviceClient
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (deleteError) {
      logError('DeleteCourse:course', deleteError)
      console.error('Delete course error details:', JSON.stringify(deleteError, null, 2))
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to delete course: ' + deleteError.message)
    }

    // 9. Optionally delete the image from storage
    if (course.original_image_url) {
      try {
        // Extract the storage path from the URL
        const url = new URL(course.original_image_url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)

        if (pathMatch) {
          const bucket = pathMatch[1]
          const filePath = pathMatch[2]

          await serviceClient.storage
            .from(bucket)
            .remove([filePath])
        }
      } catch (storageError) {
        // Log but don't fail - image deletion is not critical
        logError('DeleteCourse:storage', storageError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
    })
  } catch (error) {
    logError('DeleteCourse:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete course')
  }
}

// ============================================================================
// GET - Fetch a single course by ID
// ============================================================================

export async function GET(
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view courses')
    }

    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle()

    if (error) {
      logError('GetCourse:fetch', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // Check if user owns this course
    if (course.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'You do not have permission to view this course')
    }

    return NextResponse.json({
      success: true,
      course,
    })
  } catch (error) {
    logError('GetCourse:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch course')
  }
}
