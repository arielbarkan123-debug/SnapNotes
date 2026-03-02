import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyRecommendation, getSessionSuggestion, getRecommendations } from '@/lib/profile/recommendations'
import { type UserLearningProfile } from '@/lib/profile/analysis'

/**
 * GET /api/recommendations
 *
 * Returns personalized recommendations for the current user.
 * Also inserts tracking records into recommendation_tracking
 * and includes tracking IDs in the response so the client can
 * report when the user acts on a recommendation.
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

      // Track the session suggestion (non-blocking, non-critical)
      const trackingId = await trackRecommendation(supabase, user.id, 'session', suggestion)

      return NextResponse.json({ suggestion, trackingId })
    }

    if (type === 'all') {
      // Return multiple recommendations
      const recommendations = await getRecommendations(user.id, limit)
      const suggestion = getSessionSuggestion(
        profile as UserLearningProfile | null,
        cardsDue || 0
      )

      // Track all recommendations in parallel
      const trackingIds = await Promise.all([
        ...recommendations.map((_rec, i: number) =>
          trackRecommendation(supabase, user.id, `recommendation_${i}`, _rec)
        ),
        trackRecommendation(supabase, user.id, 'session', suggestion),
      ])

      return NextResponse.json({
        recommendations: recommendations.map((rec, i: number) => ({
          ...JSON.parse(JSON.stringify(rec)),
          trackingId: trackingIds[i],
        })),
        session: {
          ...JSON.parse(JSON.stringify(suggestion)),
          trackingId: trackingIds[trackingIds.length - 1],
        },
      })
    }

    // Default: return daily recommendation
    const recommendation = await getDailyRecommendation(user.id)
    const suggestion = getSessionSuggestion(
      profile as UserLearningProfile | null,
      cardsDue || 0
    )

    // Track both recommendations (non-blocking, non-critical)
    const [recTrackingId, sessionTrackingId] = await Promise.all([
      trackRecommendation(supabase, user.id, 'daily', recommendation),
      trackRecommendation(supabase, user.id, 'session', suggestion),
    ])

    return NextResponse.json({
      recommendation: {
        ...JSON.parse(JSON.stringify(recommendation)),
        trackingId: recTrackingId,
      },
      session: {
        ...JSON.parse(JSON.stringify(suggestion)),
        trackingId: sessionTrackingId,
      },
    })
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}

/**
 * Insert a tracking record for a recommendation shown to the user.
 * Returns the tracking ID, or null if the insert fails (non-critical).
 */
async function trackRecommendation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  recommendationType: string,
  recommendationData: unknown
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('recommendation_tracking')
      .insert({
        user_id: userId,
        recommendation_type: recommendationType,
        recommendation_data: recommendationData ?? {},
        shown_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      // Non-critical: don't block the recommendation response
      console.warn('[Recommendations] Tracking insert error:', error.message)
      return null
    }

    return data?.id ?? null
  } catch {
    return null
  }
}
