import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateMastery, type UserPerformance } from '@/lib/adaptive/mastery'

interface StepPerformanceInput {
  stepIndex: number
  stepType: string
  timeMs: number
  wasCorrect?: boolean
  usedHint?: boolean
}

interface RequestBody {
  course_id: string
  lesson_index: number
  steps: StepPerformanceInput[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: RequestBody = await request.json()
    const { course_id, lesson_index, steps } = body

    if (!course_id || lesson_index === undefined || !steps || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Prepare step performance records for batch insert
    const records = steps.map((step) => ({
      user_id: user.id,
      course_id,
      lesson_index,
      step_index: step.stepIndex,
      step_type: step.stepType,
      time_ms: step.timeMs,
      was_correct: step.wasCorrect ?? null,
      used_hint: step.usedHint ?? false,
    }))

    // Batch insert step performance data
    const { error: insertError } = await supabase
      .from('step_performance')
      .insert(records)

    if (insertError) {
      // Don't log error if table doesn't exist - feature is optional
      if (insertError.code !== 'PGRST205') {
        console.error('Failed to insert step performance:', insertError)
      }
      // Return success even if table doesn't exist
      return NextResponse.json({ success: true })
    }

    // Calculate and update mastery for this course
    // Get all question performance for this user and course
    const { data: questionSteps } = await supabase
      .from('step_performance')
      .select('was_correct, time_ms, created_at')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .eq('step_type', 'question')
      .not('was_correct', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (questionSteps && questionSteps.length > 0) {
      // Calculate user performance metrics
      const attempts = questionSteps.length
      const correct = questionSteps.filter(s => s.was_correct).length
      const recentScores = questionSteps.slice(0, 10).map(s => s.was_correct ? 1 : 0)
      const responseTimes = questionSteps.slice(0, 10).map(s => s.time_ms)

      const performance: UserPerformance = {
        attempts,
        correct,
        lastPracticed: questionSteps[0]?.created_at || null,
        recentScores,
        responseTimes,
      }

      const masteryScore = calculateMastery(performance)

      // Upsert mastery score to user_mastery table
      await supabase
        .from('user_mastery')
        .upsert({
          user_id: user.id,
          course_id,
          mastery_score: masteryScore,
          total_attempts: attempts,
          total_correct: correct,
          last_practiced: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,course_id',
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in step performance API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve step performance for a course
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')

    if (!courseId) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      )
    }

    // Get step performance data
    const { data: performance, error } = await supabase
      .from('step_performance')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) {
      // Don't log error if table doesn't exist - feature is optional
      if (error.code !== 'PGRST205') {
        console.error('Failed to fetch step performance:', error)
      }
      // Return empty data if table doesn't exist
      return NextResponse.json({
        performance: [],
        mastery: null,
      })
    }

    // Get mastery data
    const { data: mastery } = await supabase
      .from('user_mastery')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    return NextResponse.json({
      performance: performance || [],
      mastery: mastery || null,
    })
  } catch (error) {
    console.error('Error in step performance API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
