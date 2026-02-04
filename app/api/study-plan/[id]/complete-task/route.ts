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

    // Award XP for completing the task
    let xpAwarded = 0
    let dailyComplete = false

    try {
      // Determine XP based on task type
      const isAssessmentTask = task.task_type === 'practice_test' || task.task_type === 'mock_exam'
      xpAwarded = isAssessmentTask ? 10 : 5

      // Check if all today's tasks are complete
      const today = new Date().toISOString().split('T')[0]
      const { data: todayTasks } = await supabase
        .from('study_plan_tasks')
        .select('id, status')
        .eq('plan_id', planId)
        .eq('scheduled_date', today)

      if (todayTasks) {
        const allComplete = todayTasks.every(t => t.id === taskId || t.status === 'completed')
        if (allComplete && todayTasks.length > 1) {
          xpAwarded += 15 // Daily completion bonus
          dailyComplete = true
        }
      }

      // Award the XP via the gamification system
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.id)
        .single()

      if (profile) {
        const newTotalXP = (profile.total_xp || 0) + xpAwarded
        await supabase
          .from('profiles')
          .update({ total_xp: newTotalXP })
          .eq('id', user.id)
      }
    } catch {
      // XP awarding failed - not critical, still return success
    }

    return NextResponse.json({
      success: true,
      task,
      xpAwarded,
      dailyComplete,
    })
  } catch (error) {
    logError('StudyPlan:completeTaskUnhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to complete task')
  }
}
