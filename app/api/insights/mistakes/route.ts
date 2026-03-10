import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { analyzeMistakePatterns } from '@/lib/insights/mistake-analyzer'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:insights-mistakes')

export const maxDuration = 60

// GET: Fetch cached or generate patterns
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const result = await analyzeMistakePatterns(user.id)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    log.error({ err: error }, 'GET error')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to analyze mistakes')
  }
}

// POST: Force regeneration
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const result = await analyzeMistakePatterns(user.id, true)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    log.error({ err: error }, 'POST error')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to regenerate analysis')
  }
}
