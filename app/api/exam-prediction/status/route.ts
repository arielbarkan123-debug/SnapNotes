import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { data: templates } = await supabase
      .from('past_exam_templates')
      .select('id, analysis_status')
      .eq('user_id', user.id)
      .eq('analysis_status', 'completed')

    return NextResponse.json({
      analyzedCount: templates?.length || 0,
    })
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR)
  }
}
