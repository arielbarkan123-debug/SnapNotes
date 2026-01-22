import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

// ============================================================================
// GET - Get a single homework help session
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: session, error } = await supabase
      .from('homework_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.HW_SESSION_NOT_FOUND)
      }
      console.error('Fetch error:', error)
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch session')
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Get session error:', error)
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}

// ============================================================================
// PATCH - Update a homework help session
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    let updates: Record<string, unknown>
    try {
      updates = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.BODY_INVALID_JSON)
    }

    // Only allow certain fields to be updated
    const allowedFields = [
      'status',
      'comfort_level',
      'conversation',
      'hints_used',
      'used_show_answer',
      'solution_reached',
      'student_final_answer',
      'time_spent_seconds',
      'breakthrough_moment',
      'completed_at',
    ]

    const filteredUpdates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'No valid updates provided')
    }

    const { data: session, error } = await supabase
      .from('homework_sessions')
      .update(filteredUpdates)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.HW_SESSION_NOT_FOUND)
      }
      console.error('Update error:', error)
      return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to update session')
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Update session error:', error)
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}
