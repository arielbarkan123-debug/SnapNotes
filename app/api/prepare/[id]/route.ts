import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, createErrorResponse, logError } from '@/lib/api/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Try authenticated access first
    if (!authError && user) {
      const { data: guide, error } = await supabase
        .from('prepare_guides')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!error && guide) {
        return NextResponse.json({ success: true, guide })
      }
    }

    // Try public access via share_token
    const shareToken = new URL(request.url).searchParams.get('token')
    if (shareToken) {
      const { data: guide, error } = await supabase
        .from('prepare_guides')
        .select('*')
        .eq('id', id)
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single()

      if (!error && guide) {
        return NextResponse.json({ success: true, guide })
      }
    }

    return createErrorResponse(ErrorCodes.NOT_FOUND, 'Guide not found')
  } catch (error) {
    logError('Prepare:get', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch guide')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    const { error } = await supabase
      .from('prepare_guides')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logError('Prepare:delete', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to delete guide')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Prepare:delete', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete guide')
  }
}
