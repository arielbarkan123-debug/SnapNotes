import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/self-assessment
 *
 * Save a user's self-assessment after completing a lesson
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      courseId,
      lessonIndex,
      selfConfidence,
      perceivedDifficulty,
      goalAchieved,
      confusionNote,
      actualAccuracy,
      questionsTotal,
      questionsCorrect,
    } = body

    // Validate required fields
    if (!courseId || lessonIndex === undefined || !selfConfidence || !perceivedDifficulty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate confidence (1-4)
    if (selfConfidence < 1 || selfConfidence > 4) {
      return NextResponse.json(
        { error: 'Invalid confidence value' },
        { status: 400 }
      )
    }

    // Validate difficulty
    if (!['too_easy', 'just_right', 'too_hard'].includes(perceivedDifficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty value' },
        { status: 400 }
      )
    }

    // Validate goal_achieved if provided
    if (goalAchieved && !['yes', 'partially', 'no'].includes(goalAchieved)) {
      return NextResponse.json(
        { error: 'Invalid goal_achieved value' },
        { status: 400 }
      )
    }

    // Insert self-assessment
    const { data, error } = await supabase
      .from('lesson_self_assessment')
      .insert({
        user_id: user.id,
        course_id: courseId,
        lesson_index: lessonIndex,
        self_confidence: selfConfidence,
        perceived_difficulty: perceivedDifficulty,
        goal_achieved: goalAchieved || null,
        confusion_note: confusionNote || null,
        actual_accuracy: actualAccuracy || 0,
        questions_total: questionsTotal || 0,
        questions_correct: questionsCorrect || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Self-assessment insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save self-assessment' },
        { status: 500 }
      )
    }

    // Analyze confidence vs performance correlation
    const confidencePerformanceGap = analyzeGap(selfConfidence, actualAccuracy || 0)

    return NextResponse.json({
      success: true,
      assessment: data,
      analysis: {
        confidencePerformanceGap,
        suggestion: getSuggestion(selfConfidence, actualAccuracy || 0, perceivedDifficulty),
      },
    })
  } catch (error) {
    console.error('Self-assessment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/self-assessment
 *
 * Get self-assessment history for analysis
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    let query = supabase
      .from('lesson_self_assessment')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Self-assessment fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch self-assessments' },
        { status: 500 }
      )
    }

    // Calculate aggregate stats
    const stats = calculateStats(data || [])

    return NextResponse.json({
      assessments: data,
      stats,
    })
  } catch (error) {
    console.error('Self-assessment GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Analyze the gap between confidence and actual performance
 * Returns: 'overconfident' | 'underconfident' | 'calibrated'
 */
function analyzeGap(
  confidence: number,
  accuracy: number
): 'overconfident' | 'underconfident' | 'calibrated' {
  // Map confidence (1-4) to expected accuracy range
  const confidenceToAccuracy: Record<number, [number, number]> = {
    1: [0, 40],    // Not confident: expects < 40%
    2: [30, 60],   // Somewhat: expects 30-60%
    3: [50, 80],   // Confident: expects 50-80%
    4: [70, 100],  // Very confident: expects 70-100%
  }

  const [expectedMin, expectedMax] = confidenceToAccuracy[confidence] || [0, 100]

  if (accuracy < expectedMin - 10) {
    return 'overconfident'
  } else if (accuracy > expectedMax + 10) {
    return 'underconfident'
  }
  return 'calibrated'
}

/**
 * Generate a suggestion based on the assessment
 */
function getSuggestion(
  confidence: number,
  accuracy: number,
  difficulty: string
): string | null {
  const gap = analyzeGap(confidence, accuracy)

  if (gap === 'overconfident') {
    return 'Try reviewing the material again. Your confidence was higher than your actual performance, which suggests some concepts may need reinforcement.'
  }

  if (gap === 'underconfident') {
    return 'You did better than you thought! Trust yourself more - you know this material better than you realize.'
  }

  if (difficulty === 'too_hard' && accuracy < 70) {
    return 'This lesson was challenging. Consider breaking it into smaller study sessions or reviewing prerequisite material.'
  }

  if (difficulty === 'too_easy' && accuracy >= 90) {
    return 'Great job! This material seems comfortable for you. Feel free to move on to more challenging content.'
  }

  return null
}

interface Assessment {
  self_confidence: number
  actual_accuracy: number
  perceived_difficulty: string
  goal_achieved: string | null
}

/**
 * Calculate aggregate statistics from assessments
 */
function calculateStats(assessments: Assessment[]) {
  if (assessments.length === 0) {
    return {
      totalAssessments: 0,
      avgConfidence: 0,
      avgAccuracy: 0,
      calibrationScore: 0,
      difficultyBreakdown: { too_easy: 0, just_right: 0, too_hard: 0 },
      goalAchievementRate: 0,
    }
  }

  const totalAssessments = assessments.length
  const avgConfidence = assessments.reduce((sum, a) => sum + a.self_confidence, 0) / totalAssessments
  const avgAccuracy = assessments.reduce((sum, a) => sum + a.actual_accuracy, 0) / totalAssessments

  // Calculate calibration score (how well confidence matches performance)
  let calibratedCount = 0
  for (const a of assessments) {
    if (analyzeGap(a.self_confidence, a.actual_accuracy) === 'calibrated') {
      calibratedCount++
    }
  }
  const calibrationScore = Math.round((calibratedCount / totalAssessments) * 100)

  // Difficulty breakdown
  const difficultyBreakdown = {
    too_easy: assessments.filter(a => a.perceived_difficulty === 'too_easy').length,
    just_right: assessments.filter(a => a.perceived_difficulty === 'just_right').length,
    too_hard: assessments.filter(a => a.perceived_difficulty === 'too_hard').length,
  }

  // Goal achievement rate
  const withGoals = assessments.filter(a => a.goal_achieved)
  const achievedCount = withGoals.filter(a => a.goal_achieved === 'yes').length
  const goalAchievementRate = withGoals.length > 0
    ? Math.round((achievedCount / withGoals.length) * 100)
    : 0

  return {
    totalAssessments,
    avgConfidence: Math.round(avgConfidence * 10) / 10,
    avgAccuracy: Math.round(avgAccuracy),
    calibrationScore,
    difficultyBreakdown,
    goalAchievementRate,
  }
}
