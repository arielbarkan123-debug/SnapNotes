import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import type { AcademicEventUpdate } from '@/types'

const log = createLogger('api:academic-events:[id]')

// ============================================================================
// GET /api/academic-events/[id]
// Fetch a single academic event with its associated study plan tasks.
// ============================================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: event, error } = await supabase
      .from('academic_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !event) {
      return createErrorResponse(ErrorCodes.RECORD_NOT_FOUND, 'Event not found')
    }

    // Also fetch associated study plan tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('study_plan_tasks')
      .select('*')
      .eq('event_id', id)
      .order('scheduled_date', { ascending: true })

    if (tasksError) {
      log.error({ err: tasksError, eventId: id }, 'Failed to fetch tasks for event')
      // Non-fatal: return event without tasks
    }

    return NextResponse.json({
      success: true,
      event,
      tasks: tasks || [],
    })
  } catch (error) {
    log.error({ err: error }, 'Unexpected error fetching academic event')
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}

// ============================================================================
// PATCH /api/academic-events/[id]
// Update an existing academic event.
// ============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body: AcademicEventUpdate = await request.json()

    // Validate event_date format if provided
    if (body.event_date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.event_date)) {
        return createErrorResponse(
          ErrorCodes.FIELD_INVALID_FORMAT,
          'event_date must be in YYYY-MM-DD format'
        )
      }
      const parsedDate = new Date(body.event_date)
      if (isNaN(parsedDate.getTime())) {
        return createErrorResponse(
          ErrorCodes.FIELD_INVALID_FORMAT,
          'event_date is not a valid date'
        )
      }
    }

    // Validate event_type if provided
    const validTypes = ['test', 'quiz', 'homework', 'project', 'presentation', 'other']
    if (body.event_type !== undefined && !validTypes.includes(body.event_type)) {
      return createErrorResponse(
        ErrorCodes.FIELD_INVALID_FORMAT,
        `event_type must be one of: ${validTypes.join(', ')}`
      )
    }

    // Trim title if provided
    const updates = { ...body }
    if (updates.title !== undefined) {
      updates.title = updates.title.trim()
      if (updates.title.length === 0) {
        return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Title cannot be empty')
      }
    }

    const { data: event, error } = await supabase
      .from('academic_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !event) {
      if (error?.code === 'PGRST116') {
        return createErrorResponse(ErrorCodes.RECORD_NOT_FOUND, 'Event not found')
      }
      log.error({ err: error, eventId: id }, 'Failed to update academic event')
      return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to update event')
    }

    log.info({ eventId: id }, 'Academic event updated')

    return NextResponse.json({ success: true, event })
  } catch (error) {
    log.error({ err: error }, 'Unexpected error updating academic event')
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}

// ============================================================================
// DELETE /api/academic-events/[id]
// Delete an academic event.
// ============================================================================

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { error } = await supabase
      .from('academic_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      log.error({ err: error, eventId: id }, 'Failed to delete academic event')
      return createErrorResponse(ErrorCodes.DELETE_FAILED, 'Failed to delete event')
    }

    log.info({ eventId: id }, 'Academic event deleted')

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ err: error }, 'Unexpected error deleting academic event')
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}
