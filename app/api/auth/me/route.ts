import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    return NextResponse.json({ userId: user.id })
  } catch (error) {
    console.error('Auth check error:', error)
    return createErrorResponse(ErrorCodes.AUTH_UNKNOWN)
  }
}
