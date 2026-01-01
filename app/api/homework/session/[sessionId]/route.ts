/**
 * Individual Homework Session API
 * GET - Get session details
 * PATCH - Update session (comfort level, status, etc.)
 * DELETE - Delete/abandon session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getSession,
  updateSession,
  deleteSession,
  type UpdateSessionRequest,
} from '@/lib/homework'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session
    const session = await getSession(sessionId, user.id)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const updates: UpdateSessionRequest = {}

    if (body.comfortLevel) {
      if (!['new', 'some_idea', 'just_stuck'].includes(body.comfortLevel)) {
        return NextResponse.json(
          { error: 'Invalid comfort level' },
          { status: 400 }
        )
      }
      updates.comfortLevel = body.comfortLevel
    }

    if (body.status) {
      if (!['active', 'completed', 'abandoned'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (body.studentFinalAnswer !== undefined) {
      updates.studentFinalAnswer = body.studentFinalAnswer
    }

    // Update session
    const session = await updateSession(sessionId, user.id, updates)

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete session
    await deleteSession(sessionId, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
