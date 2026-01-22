import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyRecommendation, getSessionSuggestion, getRecommendations } from '@/lib/profile/recommendations'
import { type UserLearningProfile } from '@/lib/profile/analysis'

/**
 * GET /api/recommendations
 *
 * Returns personalized recommendations for the current user
 *
 * Query params:
 * - type: 'daily' | 'session' | 'all' (default: 'daily')
 * - limit: number (for 'all', default: 3)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily'
    const limit = parseInt(searchParams.get('limit') || '3')

    // Get user profile for session suggestions - select only needed fields
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('preferred_study_time, optimal_session_length, peak_performance_hour')
      .eq('user_id', user.id)
      .single()

    // Get cards due count for session suggestions
    const { count: cardsDue } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review', new Date().toISOString())

    if (type === 'session') {
      // Return session suggestion only
      const suggestion = getSessionSuggestion(
        profile as UserLearningProfile | null,
        cardsDue || 0
      )

      return NextResponse.json({ suggestion })
    }

    if (type === 'all') {
      // Return multiple recommendations
      const recommendations = await getRecommendations(user.id, limit)
      const suggestion = getSessionSuggestion(
        profile as UserLearningProfile | null,
        cardsDue || 0
      )

      return NextResponse.json({
        recommendations,
        session: suggestion,
      })
    }

    // Default: return daily recommendation
    const recommendation = await getDailyRecommendation(user.id)
    const suggestion = getSessionSuggestion(
      profile as UserLearningProfile | null,
      cardsDue || 0
    )

    return NextResponse.json({
      recommendation,
      session: suggestion,
    })
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
