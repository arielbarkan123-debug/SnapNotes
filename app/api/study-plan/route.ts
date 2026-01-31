import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'
import { generateStudyPlan } from '@/lib/study-plan/scheduler'
import type { GeneratePlanInput, StudyPlanTask } from '@/lib/study-plan/types'

// ============================================================================
// GET - Fetch user's study plans with tasks for the active plan
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Get user's study plans
    const { data: plans, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logError('StudyPlan:fetch', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch study plans')
    }

    // For the active plan, also fetch tasks
    const activePlan = plans?.find(p => p.status === 'active')
    let tasks: StudyPlanTask[] = []

    if (activePlan) {
      const { data: taskData, error: taskError } = await supabase
        .from('study_plan_tasks')
        .select('*')
        .eq('plan_id', activePlan.id)
        .order('scheduled_date', { ascending: true })
        .order('sort_order', { ascending: true })

      if (taskError) {
        logError('StudyPlan:fetchTasks', taskError)
      } else {
        tasks = taskData || []
      }
    }

    // Attach tasks to active plan
    const plansWithTasks = (plans || []).map(p => ({
      ...p,
      tasks: p.id === activePlan?.id ? tasks : [],
    }))

    return NextResponse.json({
      success: true,
      plans: plansWithTasks,
    })
  } catch (error) {
    logError('StudyPlan:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch study plans')
  }
}

// ============================================================================
// POST - Create a new study plan
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    const body = await request.json()
    const {
      title,
      examDate,
      courseIds,
      dailyTimeMinutes,
      skipDays,
      skippedLessons,
      lessons,
      masteryData,
    } = body as GeneratePlanInput

    // Validate required fields
    if (!title || !examDate || !courseIds?.length) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing required fields')
    }

    // Abandon any existing active plans
    await supabase
      .from('study_plans')
      .update({ status: 'abandoned', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active')

    // Generate tasks using the scheduler
    const generatedTasks = generateStudyPlan({
      title,
      examDate,
      courseIds,
      dailyTimeMinutes: dailyTimeMinutes || 30,
      skipDays: skipDays || [],
      skippedLessons: skippedLessons || [],
      lessons: lessons || [],
      masteryData: masteryData || [],
    })

    // Create the plan
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        title,
        exam_date: examDate,
        course_ids: courseIds,
        status: 'active',
        config: {
          daily_time_minutes: dailyTimeMinutes || 30,
          skip_days: skipDays || [],
          skipped_lessons: skippedLessons || [],
        },
      })
      .select()
      .single()

    if (planError || !plan) {
      logError('StudyPlan:create', planError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to create study plan')
    }

    // Insert tasks
    if (generatedTasks.length > 0) {
      const taskRows = generatedTasks.map(t => ({
        plan_id: plan.id,
        scheduled_date: t.scheduled_date,
        task_type: t.task_type,
        course_id: t.course_id || null,
        lesson_index: t.lesson_index ?? null,
        lesson_title: t.lesson_title || null,
        description: t.description || null,
        estimated_minutes: t.estimated_minutes,
        status: t.status,
        sort_order: t.sort_order,
        metadata: t.metadata || {},
      }))

      const { error: tasksError } = await supabase
        .from('study_plan_tasks')
        .insert(taskRows)

      if (tasksError) {
        logError('StudyPlan:createTasks', tasksError)
        // Don't fail the whole request - plan was created
      }
    }

    return NextResponse.json({
      success: true,
      plan: { ...plan, tasks: [] },
      taskCount: generatedTasks.length,
    })
  } catch (error) {
    logError('StudyPlan:createUnhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create study plan')
  }
}
