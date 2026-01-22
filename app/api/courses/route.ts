import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

// ============================================================================
// GET - Fetch courses with cursor-based pagination
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view courses')
    }

    // Parse pagination params from URL
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') // ISO date string of last course's created_at
    const limitParam = searchParams.get('limit')
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    )

    // Build query - only select fields needed for list view (exclude large generated_course JSONB)
    // IMPORTANT: Filter by user_id to only show the current user's courses
    let query = supabase
      .from('courses')
      .select('id, user_id, title, original_image_url, image_urls, source_type, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there are more

    // Apply cursor for pagination (fetch courses older than cursor)
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: courses, error } = await query

    if (error) {
      logError('Courses:fetch', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch courses')
    }

    // Check if there are more results
    const hasMore = (courses?.length || 0) > limit
    const resultCourses = hasMore ? courses?.slice(0, limit) : courses

    // Get next cursor from last item
    const nextCursor = hasMore && resultCourses?.length
      ? resultCourses[resultCourses.length - 1].created_at
      : null

    return NextResponse.json({
      success: true,
      courses: resultCourses || [],
      count: resultCourses?.length || 0,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    logError('Courses:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch courses')
  }
}
