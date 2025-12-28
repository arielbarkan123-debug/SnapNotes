import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'

// ============================================================================
// Types
// ============================================================================

interface UpdateCourseRequest {
  title?: string
}

// ============================================================================
// GET - Fetch single course
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view courses')
    }

    // IMPORTANT: Filter by user_id to ensure user can only access their own courses
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
      }
      logError('Course:get', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    return NextResponse.json({
      success: true,
      course
    })
  } catch (error) {
    logError('Course:get:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch course')
  }
}

// ============================================================================
// PATCH - Update course (title, etc.)
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to update courses')
    }

    let body: UpdateCourseRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.title !== undefined) {
      const trimmedTitle = body.title.trim()
      if (trimmedTitle.length === 0) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Title cannot be empty')
      }
      if (trimmedTitle.length > 200) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Title is too long (max 200 characters)')
      }
      updates.title = trimmedTitle
    }

    // IMPORTANT: Filter by user_id to ensure user can only update their own courses
    const { data: course, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found or you do not have permission')
      }
      logError('Course:update', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    return NextResponse.json({
      success: true,
      message: 'Course updated successfully'
    })
  } catch (error) {
    logError('Course:update:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update course')
  }
}

// ============================================================================
// DELETE - Delete course
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to delete courses')
    }

    // First, get the course to find the image path (for cleanup)
    // IMPORTANT: Filter by user_id to ensure user can only delete their own courses
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('original_image_url')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
      }
      logError('Course:delete:fetch', fetchError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to find course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // IMPORTANT: Filter by user_id to ensure user can only delete their own courses
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) {
      logError('Course:delete', deleteError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to delete course')
    }

    // Optionally: Delete the image from storage
    // Note: This is best-effort - we don't fail if image deletion fails
    if (course.original_image_url) {
      try {
        const url = new URL(course.original_image_url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/notebook-images\/(.+)/)
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1].split('?')[0])
          await supabase.storage
            .from('notebook-images')
            .remove([filePath])
        }
      } catch (storageError) {
        // Log but don't fail the request
        logError('Course:delete:storage', storageError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    })
  } catch (error) {
    logError('Course:delete:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete course')
  }
}
