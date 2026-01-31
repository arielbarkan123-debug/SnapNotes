import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'
import { recalculatePlan } from '@/lib/study-plan/scheduler'
import type { StudyPlanTask, CourseLesson, MasteryData } from '@/lib/study-plan/types'

// ============================================================================
// POST - Recalculate remaining tasks from today
// ============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    const { id: planId } = await params

    // Fetch the plan
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (planError || !plan) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Study plan not found')
    }

    // Fetch all tasks for the plan
    const { data: allTasks, error: tasksError } = await supabase
      .from('study_plan_tasks')
      .select('*')
      .eq('plan_id', planId)

    if (tasksError) {
      logError('StudyPlan:recalcFetchTasks', tasksError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch tasks')
    }

    const tasks = (allTasks || []) as StudyPlanTask[]
    const completedTasks = tasks.filter(t => t.status === 'completed')

    // Fetch courses to get lesson info
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, generated_course')
      .in('id', plan.course_ids)

    // Build lessons array from courses
    const lessons: CourseLesson[] = []
    for (const course of courses || []) {
      const gc = course.generated_course as { lessons?: { title: string }[] } | null
      if (gc?.lessons) {
        gc.lessons.forEach((lesson: { title: string }, idx: number) => {
          lessons.push({
            courseId: course.id,
            courseTitle: course.title,
            lessonIndex: idx,
            lessonTitle: lesson.title,
          })
        })
      }
    }

    // Build mastery data from lesson progress
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('course_id, lesson_index, mastery_level')
      .eq('user_id', user.id)
      .in('course_id', plan.course_ids)

    const masteryData: MasteryData[] = (progressData || []).map(p => ({
      courseId: p.course_id,
      lessonIndex: p.lesson_index,
      mastery: (p.mastery_level || 0) / 100,
    }))

    // Recalculate
    const newTasks = recalculatePlan(completedTasks, {
      title: plan.title,
      examDate: plan.exam_date,
      courseIds: plan.course_ids,
      dailyTimeMinutes: plan.config?.daily_time_minutes || 30,
      skipDays: plan.config?.skip_days || [],
      skippedLessons: plan.config?.skipped_lessons || [],
      lessons,
      masteryData,
    })

    // Delete non-completed tasks
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('study_plan_tasks')
      .delete()
      .eq('plan_id', planId)
      .neq('status', 'completed')
      .gte('scheduled_date', today)

    // Insert new tasks
    if (newTasks.length > 0) {
      const taskRows = newTasks.map(t => ({
        plan_id: planId,
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

      const { error: insertError } = await supabase
        .from('study_plan_tasks')
        .insert(taskRows)

      if (insertError) {
        logError('StudyPlan:recalcInsert', insertError)
      }
    }

    // Update plan timestamp
    await supabase
      .from('study_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', planId)

    return NextResponse.json({
      success: true,
      taskCount: newTasks.length,
    })
  } catch (error) {
    logError('StudyPlan:recalcUnhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to recalculate plan')
  }
}
