import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/courses/[id]/progress
 * Get user's progress for this course
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const courseId = params.id

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify course exists and belongs to user
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Get user progress - use maybeSingle() since new users won't have a record
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    if (progressError) {
      console.error('Error fetching progress:', progressError)
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      )
    }

    // Return progress or default values
    if (progress) {
      return NextResponse.json({
        id: progress.id,
        current_lesson: progress.current_lesson,
        current_step: progress.current_step,
        completed_lessons: progress.completed_lessons || [],
        created_at: progress.created_at,
        updated_at: progress.updated_at,
      })
    }

    // Return default progress (no record exists yet)
    return NextResponse.json({
      id: null,
      current_lesson: 0,
      current_step: 0,
      completed_lessons: [],
      created_at: null,
      updated_at: null,
    })

  } catch (error) {
    console.error('Progress GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/courses/[id]/progress
 * Update user's progress for this course (upsert)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const courseId = params.id

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { current_lesson, current_step, completed_lessons } = body

    // Validate input
    if (
      typeof current_lesson !== 'number' ||
      typeof current_step !== 'number' ||
      !Array.isArray(completed_lessons)
    ) {
      return NextResponse.json(
        { error: 'Invalid request body. Required: current_lesson (number), current_step (number), completed_lessons (array)' },
        { status: 400 }
      )
    }

    // Verify course exists and belongs to user
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if progress exists - use maybeSingle() since it might not exist
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    let progress

    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabase
        .from('user_progress')
        .update({
          current_lesson,
          current_step,
          completed_lessons,
        })
        .eq('id', existingProgress.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating progress:', error)
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        )
      }

      progress = data
    } else {
      // Create new progress
      const { data, error } = await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          current_lesson,
          current_step,
          completed_lessons,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating progress:', error)
        return NextResponse.json(
          { error: 'Failed to create progress' },
          { status: 500 }
        )
      }

      progress = data
    }

    return NextResponse.json({
      id: progress.id,
      current_lesson: progress.current_lesson,
      current_step: progress.current_step,
      completed_lessons: progress.completed_lessons || [],
      created_at: progress.created_at,
      updated_at: progress.updated_at,
    })

  } catch (error) {
    console.error('Progress PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
