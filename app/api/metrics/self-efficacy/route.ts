/**
 * Self-Efficacy Survey API
 *
 * POST: Record a self-efficacy survey
 * GET: Get self-efficacy history and analysis
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  recordSelfEfficacySurvey,
  getSelfEfficacyHistory,
  analyzeSelfEfficacy,
  shouldTriggerSurvey,
  SELF_EFFICACY_ITEMS,
  LIKERT_OPTIONS,
} from '@/lib/metrics'

// =============================================================================
// GET: Fetch self-efficacy data
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId') || undefined
    const action = searchParams.get('action') || 'analysis'

    switch (action) {
      case 'history': {
        const limit = parseInt(searchParams.get('limit') || '20', 10)
        const history = await getSelfEfficacyHistory(user.id, courseId, limit)
        return NextResponse.json({ success: true, history })
      }

      case 'analysis': {
        const analysis = await analyzeSelfEfficacy(user.id, courseId)
        return NextResponse.json({ success: true, analysis })
      }

      case 'should_trigger': {
        const lessonsCompleted = parseInt(searchParams.get('lessonsCompleted') || '0', 10)
        const lastSurveyStr = searchParams.get('lastSurveyDate')
        const lastSurveyDate = lastSurveyStr ? new Date(lastSurveyStr) : null
        const surveyCount = parseInt(searchParams.get('surveyCount') || '0', 10)

        const result = shouldTriggerSurvey(lessonsCompleted, lastSurveyDate, surveyCount)
        return NextResponse.json({ success: true, ...result })
      }

      case 'items': {
        return NextResponse.json({
          success: true,
          items: SELF_EFFICACY_ITEMS,
          options: LIKERT_OPTIONS,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in self-efficacy GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch self-efficacy data' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST: Record a self-efficacy survey
// =============================================================================

interface SurveyPayload {
  courseId?: string
  surveyType: 'pre_course' | 'post_lesson' | 'post_course' | 'weekly' | 'periodic'
  triggerContext?: string
  responses: {
    understandMainConcepts?: number
    completeChallengingProblems?: number
    explainToOthers?: number
    applyToNewSituations?: number
  }
  perceivedDifficulty?: 'too_easy' | 'just_right' | 'too_hard'
  confidenceLevel?: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SurveyPayload = await request.json()

    // Validate survey type
    if (!['pre_course', 'post_lesson', 'post_course', 'weekly', 'periodic'].includes(body.surveyType)) {
      return NextResponse.json({ error: 'Invalid survey type' }, { status: 400 })
    }

    // Validate responses (1-5 range)
    const { responses } = body
    for (const [key, value] of Object.entries(responses)) {
      if (value !== undefined && (value < 1 || value > 5)) {
        return NextResponse.json(
          { error: `Invalid response value for ${key}: must be 1-5` },
          { status: 400 }
        )
      }
    }

    const result = await recordSelfEfficacySurvey({
      userId: user.id,
      courseId: body.courseId,
      surveyType: body.surveyType,
      triggerContext: body.triggerContext,
      understandMainConcepts: responses.understandMainConcepts,
      completeChallengingProblems: responses.completeChallengingProblems,
      explainToOthers: responses.explainToOthers,
      applyToNewSituations: responses.applyToNewSituations,
      perceivedDifficulty: body.perceivedDifficulty,
      confidenceLevel: body.confidenceLevel,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Get updated analysis
    const analysis = await analyzeSelfEfficacy(user.id, body.courseId)

    return NextResponse.json({
      success: true,
      surveyId: result.surveyId,
      score: result.score,
      analysis,
    })
  } catch (error) {
    console.error('Error in self-efficacy POST:', error)
    return NextResponse.json(
      { error: 'Failed to record survey' },
      { status: 500 }
    )
  }
}
