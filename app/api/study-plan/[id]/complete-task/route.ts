import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'

// ============================================================================
// PATCH - Mark a task as completed
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    const { id: planId } = await params
    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'taskId is required')
    }

    // Verify the plan belongs to the user
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (planError || !plan) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Study plan not found')
    }

    // Update the task
    const { data: task, error: taskError } = await supabase
      .from('study_plan_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('plan_id', planId)
      .select()
      .single()

    if (taskError || !task) {
      logError('StudyPlan:completeTask', taskError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to complete task')
    }

    return NextResponse.json({
      success: true,
      task,
    })
  } catch (error) {
    logError('StudyPlan:completeTaskUnhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to complete task')
  }
}
