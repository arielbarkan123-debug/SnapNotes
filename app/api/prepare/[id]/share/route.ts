import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, createErrorResponse } from '@/lib/api/errors'
import { randomBytes } from 'crypto'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: guideId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Check if guide already has a share token
    const { data: guide, error: fetchError } = await supabase
      .from('prepare_guides')
      .select('id, share_token, is_public')
      .eq('id', guideId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !guide) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Guide not found')
    }

    if (guide.share_token && guide.is_public) {
      return NextResponse.json({
        success: true,
        shareToken: guide.share_token,
      })
    }

    // Generate new share token
    const shareToken = randomBytes(16).toString('hex')

    const { error: updateError } = await supabase
      .from('prepare_guides')
      .update({
        share_token: shareToken,
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', guideId)
      .eq('user_id', user.id)

    if (updateError) {
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to generate share link')
    }

    return NextResponse.json({
      success: true,
      shareToken,
    })
  } catch (error) {
    console.error('[PrepareShare] Error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate share link')
  }
}
