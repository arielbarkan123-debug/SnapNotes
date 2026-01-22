import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import {
  createPracticeSession,
  getActiveSessions,
  getRecentSessions,
  getUserPracticeStats,
} from '@/lib/practice'
import type { CreateSessionRequest } from '@/lib/practice/types'

// =============================================================================
// GET /api/practice/session - Get user's practice sessions and stats
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const include = searchParams.get('include')?.split(',') || ['stats']

    const response: Record<string, unknown> = {}

    // Get stats
    if (include.includes('stats')) {
      response.stats = await getUserPracticeStats(user.id)
    }

    // Get active sessions
    if (include.includes('active')) {
      response.activeSessions = await getActiveSessions(user.id)
    }

    // Get recent sessions
    if (include.includes('recent')) {
      const limit = parseInt(searchParams.get('limit') || '10')
      response.recentSessions = await getRecentSessions(user.id, limit)
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Practice:session:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch practice data')
  }
}

// =============================================================================
// POST /api/practice/session - Create a new practice session
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Parse request body
    const body = await request.json()
    const {
      sessionType,
      courseId,
      targetConceptIds,
      targetDifficulty,
      questionCount,
      timeLimitMinutes,
    } = body as CreateSessionRequest

    // Validate session type
    const validTypes = ['targeted', 'mixed', 'exam_prep', 'quick', 'custom']
    if (!sessionType || !validTypes.includes(sessionType)) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid session type. Must be one of: ${validTypes.join(', ')}`
      )
    }

    // Create session
    const result = await createPracticeSession(user.id, {
      sessionType,
      courseId,
      targetConceptIds,
      targetDifficulty,
      questionCount,
      timeLimitMinutes,
    })

    return NextResponse.json(result)
  } catch (error) {
    logError('Practice:session:create', error)

    if (error instanceof Error && error.message.includes('No questions available')) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'No questions available for this practice session. Try generating questions first.'
      )
    }

    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create practice session')
  }
}
