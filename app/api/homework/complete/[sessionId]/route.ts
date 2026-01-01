/**
 * Complete Homework Session API
 * POST - Mark session as complete and get summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, completeSession } from '@/lib/homework'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Get session first to verify it exists
    const session = await getSession(sessionId, user.id)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session already completed' },
        { status: 400 }
      )
    }

    // Parse request body for optional final answer
    let studentFinalAnswer: string | undefined
    try {
      const body = await request.json()
      studentFinalAnswer = body.studentFinalAnswer
    } catch {
      // No body is fine
    }

    // Complete the session
    const { session: completedSession, summary } = await completeSession(
      sessionId,
      user.id,
      studentFinalAnswer
    )

    return NextResponse.json({
      session: completedSession,
      summary,
    })
  } catch (error) {
    console.error('Complete session error:', error)
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    )
  }
}
