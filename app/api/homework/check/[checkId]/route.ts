import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:homework-check-id')

// ============================================================================
// GET - Get a specific homework check
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ checkId: string }> }
) {
  try {
    const { checkId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: check, error } = await supabase
      .from('homework_checks')
      .select('*')
      .eq('id', checkId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.CHECK_NOT_FOUND)
      }
      log.error({ err: error }, 'Fetch error')
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch homework check')
    }

    return NextResponse.json({ check })
  } catch (error) {
    log.error({ err: error }, 'Get check error')
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}

// ============================================================================
// DELETE - Delete a homework check
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ checkId: string }> }
) {
  try {
    const { checkId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { error } = await supabase
      .from('homework_checks')
      .delete()
      .eq('id', checkId)
      .eq('user_id', user.id)

    if (error) {
      log.error({ err: error }, 'Delete error')
      return createErrorResponse(ErrorCodes.DELETE_FAILED, 'Failed to delete homework check')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ err: error }, 'Delete check error')
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}
