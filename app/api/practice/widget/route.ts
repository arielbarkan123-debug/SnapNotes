import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'

// =============================================================================
// GET /api/practice/widget - Get data for dashboard practice widget
// =============================================================================

export async function GET(): Promise<NextResponse> {
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

    // Run queries in parallel
    const [statsResult, activeResult, gapsResult, questionsResult] = await Promise.all([
      // Get practice stats
      supabase
        .from('practice_sessions')
        .select('questions_answered, questions_correct, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false }),

      // Get active sessions
      supabase
        .from('practice_sessions')
        .select('id, session_type, questions_answered, question_count')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1),

      // Get unresolved gaps count
      supabase
        .from('user_knowledge_gaps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('resolved', false),

      // Get available questions count
      supabase
        .from('practice_questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    // Calculate stats
    const sessions = statsResult.data || []
    const totalSessions = sessions.length
    const totalQuestions = sessions.reduce((sum, s) => sum + s.questions_answered, 0)
    const totalCorrect = sessions.reduce((sum, s) => sum + s.questions_correct, 0)
    const overallAccuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0
    const lastPracticeDate = sessions[0]?.completed_at || null

    return NextResponse.json({
      stats: totalSessions > 0 ? {
        totalSessions,
        totalQuestions,
        overallAccuracy,
        lastPracticeDate,
      } : null,
      activeSessions: activeResult.data || [],
      gapsCount: gapsResult.count || 0,
      questionsAvailable: questionsResult.count || 0,
    })
  } catch (error) {
    logError('Practice:widget:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch widget data')
  }
}
