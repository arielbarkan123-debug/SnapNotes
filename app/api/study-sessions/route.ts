import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: StartSessionRequest = await request.json()
    const { sessionType, courseId, lessonIndex } = body

    if (!sessionType) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Session type is required')
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
      // Don't log error if table doesn't exist - feature is optional
      if (error.code !== 'PGRST205') {
        console.error('[Study Sessions API] Start error:', error)
      }
      return createErrorResponse(ErrorCodes.ANLYT_SESSION_CREATE_FAILED)
    }

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('[Study Sessions API] Error:', error)
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: EndSessionRequest = await request.json()
    const { sessionId, cardsReviewed, questionsAnswered, questionsCorrect } = body

    if (!sessionId) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Session ID is required')
    }

    // Verify ownership - include user_id in query to prevent timing attacks
    const { data: existingSession } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!existingSession) {
      return createErrorResponse(ErrorCodes.ANLYT_SESSION_NOT_FOUND)
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
      // Don't log error if table doesn't exist - feature is optional
      if (error.code !== 'PGRST205') {
        console.error('[Study Sessions API] End error:', error)
      }
      return createErrorResponse(ErrorCodes.ANLYT_SESSION_END_FAILED)
    }

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('[Study Sessions API] Error:', error)
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
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
      // Don't log error if table doesn't exist - feature is optional
      if (error.code !== 'PGRST205') {
        console.error('[Study Sessions API] Fetch error:', error)
      }
      // Return empty stats if table doesn't exist
      return NextResponse.json({
        success: true,
        stats: {
          totalSessions: 0,
          totalTimeSeconds: 0,
          totalTimeMinutes: 0,
          cardsReviewed: 0,
          questionsAnswered: 0,
          questionsCorrect: 0,
          accuracy: 0,
        },
        recentSessions: [],
      })
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
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}
