import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import type { AcademicEventInsert, AcademicEventType } from '@/types'

const log = createLogger('api:academic-events')

const VALID_EVENT_TYPES: AcademicEventType[] = [
  'test', 'quiz', 'homework', 'project', 'presentation', 'other',
]

// ============================================================================
// GET /api/academic-events
// Fetch academic events for the authenticated user, with optional date range
// and status filters.
// ============================================================================

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')

    let query = supabase
      .from('academic_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true })

    if (from) {
      query = query.gte('event_date', from)
    }
    if (to) {
      query = query.lte('event_date', to)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: events, error } = await query

    if (error) {
      log.error({ err: error }, 'Failed to fetch academic events')
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch events')
    }

    return NextResponse.json({ success: true, events })
  } catch (error) {
    log.error({ err: error }, 'Unexpected error fetching academic events')
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}

// ============================================================================
// POST /api/academic-events
// Create a new academic event.
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: AcademicEventInsert = await request.json()

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Title is required')
    }

    if (!body.event_type || !VALID_EVENT_TYPES.includes(body.event_type)) {
      return createErrorResponse(
        ErrorCodes.FIELD_INVALID_FORMAT,
        `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`
      )
    }

    if (!body.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.event_date)) {
      return createErrorResponse(
        ErrorCodes.FIELD_INVALID_FORMAT,
        'event_date must be a valid date in YYYY-MM-DD format'
      )
    }

    // Verify the date is parseable
    const parsedDate = new Date(body.event_date)
    if (isNaN(parsedDate.getTime())) {
      return createErrorResponse(
        ErrorCodes.FIELD_INVALID_FORMAT,
        'event_date is not a valid date'
      )
    }

    const { data: event, error } = await supabase
      .from('academic_events')
      .insert({
        ...body,
        title: body.title.trim(),
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      log.error({ err: error }, 'Failed to insert academic event')
      return createErrorResponse(ErrorCodes.INSERT_FAILED, 'Failed to create event')
    }

    log.info({ eventId: event.id, eventType: body.event_type }, 'Academic event created')

    return NextResponse.json({ success: true, event }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, 'Unexpected error creating academic event')
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}
