import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'

// =============================================================================
// Types
// =============================================================================

interface SRSStats {
  total_cards: number
  cards_due_today: number
  cards_reviewed_today: number
  streak: number
  retention_rate: number
  cards_by_state: {
    new: number
    learning: number
    review: number
    relearning: number
  }
}

// =============================================================================
// GET /api/srs/stats - Get user's SRS statistics
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view stats')
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get total cards
    const { count: totalCards } = await supabase
      .from('review_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Get cards due today (due_date <= now, state != 'new')
    const { count: cardsDueToday } = await supabase
      .from('review_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('state', 'new')
      .lte('due_date', now.toISOString())

    // Get cards reviewed today
    const { count: reviewedToday } = await supabase
      .from('review_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('reviewed_at', todayStart.toISOString())

    // Get cards by state
    const { data: cardsByState } = await supabase
      .from('review_cards')
      .select('state')
      .eq('user_id', user.id)

    const stateCount = {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
    }

    if (cardsByState) {
      for (const card of cardsByState) {
        if (card.state in stateCount) {
          stateCount[card.state as keyof typeof stateCount]++
        }
      }
    }

    // Calculate retention rate (last 30 days)
    // Retention = reviews with rating >= 3 / total reviews
    const { data: recentReviews } = await supabase
      .from('review_logs')
      .select('rating')
      .eq('user_id', user.id)
      .gte('reviewed_at', thirtyDaysAgo.toISOString())

    let retentionRate = 0
    if (recentReviews && recentReviews.length > 0) {
      const successfulReviews = recentReviews.filter(r => r.rating >= 3).length
      retentionRate = Math.round((successfulReviews / recentReviews.length) * 100)
    }

    // Calculate streak (consecutive days with at least one review)
    const streak = await calculateStreak(supabase, user.id)

    const response: SRSStats = {
      total_cards: totalCards || 0,
      cards_due_today: cardsDueToday || 0,
      cards_reviewed_today: reviewedToday || 0,
      streak,
      retention_rate: retentionRate,
      cards_by_state: stateCount,
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('SRS:stats:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch stats')
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function calculateStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  // Get reviews from last 365 days grouped by date
  const yearAgo = new Date()
  yearAgo.setDate(yearAgo.getDate() - 365)

  const { data: reviews } = await supabase
    .from('review_logs')
    .select('reviewed_at')
    .eq('user_id', userId)
    .gte('reviewed_at', yearAgo.toISOString())
    .order('reviewed_at', { ascending: false })

  if (!reviews || reviews.length === 0) return 0

  // Get unique dates (in local timezone)
  const reviewDates = new Set<string>()
  for (const review of reviews) {
    const date = new Date(review.reviewed_at)
    reviewDates.add(date.toISOString().split('T')[0])
  }

  // Count consecutive days starting from today/yesterday
  const today = new Date()
  let currentDate = new Date(today)
  currentDate.setHours(0, 0, 0, 0)

  // Check if reviewed today, if not start from yesterday
  const todayStr = currentDate.toISOString().split('T')[0]
  if (!reviewDates.has(todayStr)) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0]
    if (reviewDates.has(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
