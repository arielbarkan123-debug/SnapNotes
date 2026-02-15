import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to create courses')
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

    const { data: course, error: insertError } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        generated_course: {
          title: trimmedTitle,
          overview: '',
          lessons: [],
        },
        generation_status: 'complete',
        total_lessons: 0,
        lessons_ready: 0,
      })
      .select('id')
      .single()

    if (insertError) {
      logError('ManualCourse:insert', insertError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to create course')
    }

    return NextResponse.json({
      success: true,
      courseId: course.id,
    })
  } catch (error) {
    logError('ManualCourse:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create course')
  }
}
