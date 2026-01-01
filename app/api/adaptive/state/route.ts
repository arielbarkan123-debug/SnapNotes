import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { getPerformanceSummary } from '@/lib/adaptive'

// =============================================================================
// GET /api/adaptive/state - Get user's performance state
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Get course ID from query params
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId') || undefined

    // Get performance summary
    const summary = await getPerformanceSummary(user.id, courseId)

    return NextResponse.json({
      accuracy: summary.accuracy,
      estimatedAbility: summary.ability,
      currentDifficulty: summary.difficulty,
      streak: summary.streak,
      streakType: summary.streakType,
      questionsAnswered: summary.questionsAnswered,
    })

  } catch (error) {
    logError('Adaptive:state:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get state')
  }
}
