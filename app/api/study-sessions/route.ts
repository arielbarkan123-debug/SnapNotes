import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface StartSessionRequest {
  sessionType: 'lesson' | 'practice' | 'review' | 'exam'
  courseId?: string
  lessonIndex?: number
}

export interface EndSessionRequest {
  sessionId: string
  cardsReviewed?: number
  questionsAnswered?: number
  questionsCorrect?: number
}

/**
 * POST /api/study-sessions
 * Start a new study session
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body: StartSessionRequest = await request.json()
    const { sessionType, courseId, lessonIndex } = body

    if (!sessionType) {
      return NextResponse.json(
        { success: false, error: 'Session type is required' },
        { status: 400 }
      )
    }

    // Check for any unclosed sessions and close them
    await supabase
      .from('study_sessions')
      .update({
        ended_at: new Date().toISOString(),
        is_completed: false
      })
      .eq('user_id', user.id)
      .is('ended_at', null)

    // Start new session
    const { data: session, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        session_type: sessionType,
        course_id: courseId || null,
        lesson_index: lessonIndex ?? null,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Study Sessions API] Start error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to start session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('[Study Sessions API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/study-sessions
 * End or update a study session
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body: EndSessionRequest = await request.json()
    const { sessionId, cardsReviewed, questionsAnswered, questionsCorrect } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: existingSession } = await supabase
      .from('study_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single()

    if (!existingSession || existingSession.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Update session
    const updateData: Record<string, unknown> = {
      ended_at: new Date().toISOString(),
      is_completed: true,
    }

    if (cardsReviewed !== undefined) {
      updateData.cards_reviewed = cardsReviewed
    }
    if (questionsAnswered !== undefined) {
      updateData.questions_answered = questionsAnswered
    }
    if (questionsCorrect !== undefined) {
      updateData.questions_correct = questionsCorrect
    }

    const { data: session, error } = await supabase
      .from('study_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('[Study Sessions API] End error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to end session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('[Study Sessions API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/study-sessions
 * Get study session stats
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // week, month, all

    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'all':
        startDate = new Date(0)
        break
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false })

    if (error) {
      console.error('[Study Sessions API] Fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // Calculate stats
    const completedSessions = sessions?.filter(s => s.is_completed) || []
    const totalSeconds = completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
    const totalCards = completedSessions.reduce((sum, s) => sum + (s.cards_reviewed || 0), 0)
    const totalQuestions = completedSessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0)
    const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.questions_correct || 0), 0)

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions: completedSessions.length,
        totalTimeSeconds: totalSeconds,
        totalTimeMinutes: Math.round(totalSeconds / 60),
        cardsReviewed: totalCards,
        questionsAnswered: totalQuestions,
        questionsCorrect: totalCorrect,
        accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      },
      recentSessions: sessions?.slice(0, 10) || [],
    })
  } catch (error) {
    console.error('[Study Sessions API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
