import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cheatsheets')

// GET: Fetch single cheatsheet
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: cheatsheet, error } = await supabase
      .from('cheatsheets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !cheatsheet) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Cheatsheet not found')
    }

    return NextResponse.json({
      success: true,
      cheatsheet,
    })
  } catch (error) {
    log.error({ err: error }, 'Get error')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch cheatsheet')
  }
}

// DELETE: Remove cheatsheet
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { error } = await supabase
      .from('cheatsheets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete cheatsheet')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ err: error }, 'Delete error')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete cheatsheet')
  }
}
