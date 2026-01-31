import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'

// =============================================================================
// Types
// =============================================================================

interface FeedbackBody {
  feedback: 'too_easy' | 'too_hard'
  session_id: string
  question_id: string
}

// =============================================================================
// POST /api/adaptive/feedback - Adjust difficulty based on user feedback
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Parse request body
    let body: FeedbackBody
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { feedback, session_id, question_id } = body

    // Validate required fields
    if (!feedback || !['too_easy', 'too_hard'].includes(feedback)) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'feedback must be "too_easy" or "too_hard"')
    }

    if (!session_id) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'session_id is required')
    }

    if (!question_id) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'question_id is required')
    }

    // Look up the practice session to get the course_id
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .select('course_id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Practice session not found')
    }

    // Get the user's performance state for this course
    const { data: perfState } = await supabase
      .from('user_performance_state')
      .select('target_difficulty, difficulty_floor')
      .eq('user_id', user.id)
      .eq('course_id', session.course_id)
      .maybeSingle()

    if (!perfState) {
      // No performance state yet - nothing to adjust
      return NextResponse.json({ success: true, adjusted: false })
    }

    // Calculate adjustments
    const currentTarget = perfState.target_difficulty ?? 2.0
    const currentFloor = perfState.difficulty_floor ?? 1.0

    let newTarget: number
    let newFloor: number

    if (feedback === 'too_easy') {
      // Raise difficulty: target += 0.5, floor += 0.25 (capped at 3.0)
      newTarget = Math.min(5, currentTarget + 0.5)
      newFloor = Math.min(3.0, currentFloor + 0.25)
    } else {
      // Lower difficulty: target -= 0.5, floor -= 0.25 (floored at 1.0)
      newTarget = Math.max(1.0, currentTarget - 0.5)
      newFloor = Math.max(1.0, currentFloor - 0.25)
    }

    // Ensure target never falls below the floor
    newTarget = Math.max(newFloor, newTarget)

    // Update performance state
    const { error: updateError } = await supabase
      .from('user_performance_state')
      .update({
        target_difficulty: newTarget,
        difficulty_floor: newFloor,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('course_id', session.course_id)

    if (updateError) {
      logError('Adaptive:feedback:update', updateError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update difficulty')
    }

    return NextResponse.json({
      success: true,
      adjusted: true,
      new_target_difficulty: newTarget,
      new_difficulty_floor: newFloor,
    })

  } catch (error) {
    logError('Adaptive:feedback:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to process feedback')
  }
}
