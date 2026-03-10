import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:auth-me')

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    return NextResponse.json({ userId: user.id })
  } catch (error) {
    log.error({ err: error }, 'Auth check error')
    return createErrorResponse(ErrorCodes.AUTH_UNKNOWN)
  }
}
