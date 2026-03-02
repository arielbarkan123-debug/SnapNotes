import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { optimizeFSRSParams, shouldOptimize } from '@/lib/srs/fsrs-optimizer'

// =============================================================================
// POST /api/srs/optimize - Trigger per-user FSRS parameter optimization
// =============================================================================

const MIN_REVIEWS_REQUIRED = 50

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Check if the user has enough review data
    const { should, reviewCount } = await shouldOptimize(supabase, user.id)

    if (!should) {
      return NextResponse.json({
        optimized: false,
        message: `Need ${MIN_REVIEWS_REQUIRED - reviewCount} more reviews before optimization`,
        reviewCount,
      })
    }

    // Run optimization
    const result = await optimizeFSRSParams(supabase, user.id)
    return NextResponse.json(result)
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR)
  }
}
