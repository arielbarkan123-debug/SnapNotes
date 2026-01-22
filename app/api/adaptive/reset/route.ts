import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { resetSessionState, savePerformanceSnapshot } from '@/lib/adaptive'

// =============================================================================
// POST /api/adaptive/reset - Reset session state
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Save snapshot before resetting
    await savePerformanceSnapshot(user.id, courseId)

    // Reset session state
    await resetSessionState(user.id, courseId)

    return NextResponse.json({
      success: true,
      message: 'Session state reset successfully',
    })

  } catch (error) {
    logError('Adaptive:reset:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to reset state')
  }
}
