import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import {
  getSession,
  getSessionProgress,
  getCurrentQuestion,
  getSessionQuestions,
  completeSession,
  pauseSession,
  resumeSession,
  abandonSession,
} from '@/lib/practice'

// =============================================================================
// GET /api/practice/session/[sessionId] - Get session details
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Get session
    const session = await getSession(sessionId)
    if (!session) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Session not found')
    }

    // Verify ownership
    if (session.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const include = searchParams.get('include')?.split(',') || []

    const response: Record<string, unknown> = { session }

    // Include progress
    if (include.includes('progress')) {
      response.progress = await getSessionProgress(sessionId)
    }

    // Include current question
    if (include.includes('currentQuestion')) {
      response.currentQuestion = await getCurrentQuestion(sessionId)
    }

    // Include all questions
    if (include.includes('questions')) {
      response.questions = await getSessionQuestions(sessionId)
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Practice:session:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch session')
  }
}

// =============================================================================
// PATCH /api/practice/session/[sessionId] - Update session status
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Get session to verify ownership
    const session = await getSession(sessionId)
    if (!session) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Session not found')
    }
    if (session.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }

    // Parse request body
    const body = await request.json()
    const { action } = body as { action: 'complete' | 'pause' | 'resume' | 'abandon' }

    let result: unknown

    switch (action) {
      case 'complete':
        result = await completeSession(sessionId)
        break
      case 'pause':
        await pauseSession(sessionId)
        result = { status: 'paused' }
        break
      case 'resume':
        await resumeSession(sessionId)
        result = { status: 'active' }
        break
      case 'abandon':
        await abandonSession(sessionId)
        result = { status: 'abandoned' }
        break
      default:
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid action. Must be: complete, pause, resume, or abandon'
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    logError('Practice:session:update', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update session')
  }
}
