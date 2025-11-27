import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'

// ============================================================================
// GET - Fetch all courses for the authenticated user
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view courses')
    }

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logError('Courses:fetch', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch courses')
    }

    return NextResponse.json({
      success: true,
      courses: courses || [],
      count: courses?.length || 0,
    })
  } catch (error) {
    logError('Courses:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch courses')
  }
}
