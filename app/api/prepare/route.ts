import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, createErrorResponse, logError } from '@/lib/api/errors'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view guides')
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    )

    let query = supabase
      .from('prepare_guides')
      .select('id, user_id, title, subtitle, subject, source_type, generation_status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: guides, error } = await query

    if (error) {
      logError('Prepare:fetch', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch guides')
    }

    const hasMore = (guides?.length || 0) > limit
    const resultGuides = hasMore ? guides?.slice(0, limit) : guides
    const nextCursor = hasMore && resultGuides?.length
      ? resultGuides[resultGuides.length - 1].created_at
      : null

    return NextResponse.json({
      success: true,
      guides: resultGuides || [],
      count: resultGuides?.length || 0,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    logError('Prepare:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch guides')
  }
}
