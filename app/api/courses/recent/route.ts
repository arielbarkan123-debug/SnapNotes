import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/courses/recent
 *
 * Returns the most recently created course for the authenticated user.
 * Used as a fallback mechanism when streaming fails on Safari/iOS.
 * Only returns courses created within the last 5 minutes.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the most recently created course
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, created_at, title')
      .eq('user_id', user.id)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (courseError) {
      console.error('[API:courses/recent] Error fetching course:', courseError)
      return NextResponse.json(
        { error: 'Failed to fetch course' },
        { status: 500 }
      )
    }

    if (!course) {
      return NextResponse.json({ course: null })
    }

    // Count review cards for this course
    const { count: cardsCount } = await supabase
      .from('review_cards')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course.id)

    return NextResponse.json({
      course,
      cardsGenerated: cardsCount || 0,
    })
  } catch (error) {
    console.error('[API:courses/recent] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
