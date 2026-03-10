import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:practice-complete')

// =============================================================================
// POST - Record practice completion for a homework mistake
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ checkId: string }> }
) {
  try {
    const { checkId } = await params
    const supabase = await createClient()

    // Authenticate
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse and validate body
    const body = await request.json()
    const { problemIndex, practiceSessionId } = body

    if (typeof problemIndex !== 'number' || problemIndex < 0) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_UNKNOWN,
        'problemIndex must be a non-negative number'
      )
    }

    if (typeof practiceSessionId !== 'string' || !practiceSessionId.trim()) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_UNKNOWN,
        'practiceSessionId must be a non-empty string'
      )
    }

    // Fetch the check (ensuring user owns it)
    const { data: check, error: fetchError } = await supabase
      .from('homework_checks')
      .select('id, practiced_items')
      .eq('id', checkId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.CHECK_NOT_FOUND)
      }
      log.error({ err: fetchError }, 'Fetch error')
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch homework check')
    }

    // Check for duplicates
    const currentItems: Array<{ problemIndex: number; practiceSessionId: string }> =
      check.practiced_items || []
    const alreadyPracticed = currentItems.some((item) => item.problemIndex === problemIndex)

    if (alreadyPracticed) {
      return NextResponse.json({
        success: true,
        practicedItems: currentItems,
        message: 'Already practiced',
      })
    }

    // Append to practiced_items
    const updatedItems = [
      ...currentItems,
      { problemIndex, practiceSessionId },
    ]

    const { error: updateError } = await supabase
      .from('homework_checks')
      .update({ practiced_items: updatedItems })
      .eq('id', checkId)
      .eq('user_id', user.id)

    if (updateError) {
      log.error({ err: updateError }, 'Update error')
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to update practiced items')
    }

    return NextResponse.json({
      success: true,
      practicedItems: updatedItems,
    })
  } catch (error) {
    log.error({ err: error }, 'Practice complete error')
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}
