import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'
import { evaluateAnswer } from '@/lib/evaluation/answer-checker'

// Allow 90 seconds for AI evaluation (Claude API call)
// Increased to handle slower mobile network connections
export const maxDuration = 90

// =============================================================================
// Types
// =============================================================================

interface EvaluateAnswerRequest {
  question: string
  expectedAnswer: string
  userAnswer: string
  acceptableAnswers?: string[]
  context?: string // Optional lesson/topic context for better evaluation
  courseId?: string // Optional course ID for curriculum detection
  conceptIds?: string[] // Optional concept IDs for gap detection
  lessonIndex?: number // Optional lesson index for context
  responseTimeMs?: number // Optional response time for mastery calculation
}

// =============================================================================
// Main Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const body: EvaluateAnswerRequest = await request.json()
    const {
      question,
      expectedAnswer,
      userAnswer,
      acceptableAnswers = [],
      context,
      courseId,
      conceptIds = [],
      lessonIndex,
      responseTimeMs
    } = body

    // Validate input
    if (!question || !expectedAnswer) {
      return NextResponse.json(
        { error: 'Question and expected answer are required' },
        { status: 400 }
      )
    }

    // Get user for curriculum context and gap detection
    let curriculumContextString = ''
    let userId: string | null = null
    let userLanguage = 'en'

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null

      if (user) {
        // Fetch user learning profile
        const { data: userProfile } = await supabase
          .from('user_learning_profile')
          .select('study_system, grade, subjects, subject_levels, exam_format, language')
          .eq('user_id', user.id)
          .single()

        // Get user's language preference for AI feedback
        userLanguage = userProfile?.language || 'en'

        if (userProfile?.study_system && userProfile.study_system !== 'general' && userProfile.study_system !== 'other') {
          // Build curriculum context for evaluation
          const curriculumContext = await buildCurriculumContext({
            userProfile: {
              studySystem: userProfile.study_system as StudySystem,
              subjects: userProfile.subjects || [],
              subjectLevels: userProfile.subject_levels || {},
              examFormat: userProfile.exam_format as 'match_real' | 'inspired_by' | undefined,
              grade: userProfile.grade || undefined,
            },
            contentSample: context || question, // Use question/context to detect subject
            purpose: 'evaluation',
          })

          curriculumContextString = formatContextForPrompt(curriculumContext)
        }
      }
    } catch {
      // Silently continue without curriculum context if auth fails
    }

    // Use the shared evaluation utility
    const result = await evaluateAnswer({
      question,
      expectedAnswer,
      userAnswer,
      acceptableAnswers,
      context,
      curriculumContext: curriculumContextString,
      language: userLanguage,
    })

    // Record performance for gap detection (fire and forget, but log errors)
    if (userId && conceptIds.length > 0) {
      recordPerformanceForGapDetection(
        userId,
        conceptIds,
        result.isCorrect,
        result.score,
        courseId,
        lessonIndex,
        responseTimeMs
      ).catch(err => {
        console.error('[Evaluate Answer] Gap detection recording failed:', err)
      })
    }

    return NextResponse.json({
      ...result,
      evaluationTimeMs: Date.now() - startTime,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to evaluate answer' },
      { status: 500 }
    )
  }
}

/**
 * Record performance data for gap detection (fire and forget)
 * This updates user_concept_mastery and potentially detects gaps
 */
async function recordPerformanceForGapDetection(
  userId: string,
  conceptIds: string[],
  isCorrect: boolean,
  score: number,
  courseId?: string,
  lessonIndex?: number,
  responseTimeMs?: number
): Promise<void> {
  if (conceptIds.length === 0) return

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    for (const conceptId of conceptIds) {
      // Get current mastery
      const { data: existing } = await supabase
        .from('user_concept_mastery')
        .select('mastery_level, total_exposures, successful_recalls, failed_recalls, stability')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .single()

      const currentMastery = existing?.mastery_level ?? 0
      const totalExposures = (existing?.total_exposures ?? 0) + 1
      const successfulRecalls = (existing?.successful_recalls ?? 0) + (isCorrect ? 1 : 0)
      const failedRecalls = (existing?.failed_recalls ?? 0) + (isCorrect ? 0 : 1)

      // Calculate mastery delta based on score (0-100)
      const scoreRatio = score / 100
      let masteryDelta = 0
      if (isCorrect) {
        // Good answer: increase mastery based on score
        masteryDelta = 0.05 + scoreRatio * 0.1
        // Bonus for fast response (if provided)
        if (responseTimeMs && responseTimeMs < 10000) {
          masteryDelta += 0.02
        }
      } else {
        // Wrong answer: decrease mastery
        masteryDelta = -0.1 - (1 - scoreRatio) * 0.1
      }

      const newMastery = Math.max(0, Math.min(1, currentMastery + masteryDelta))

      // Update stability for SRS
      const baseStability = existing?.stability ?? 1
      const newStability = isCorrect ? baseStability * 1.3 : Math.max(1, baseStability * 0.7)

      // Calculate next review date
      const daysUntilReview = Math.round(newStability)
      const nextReviewDate = new Date()
      nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview)

      // Upsert mastery record
      await supabase
        .from('user_concept_mastery')
        .upsert({
          user_id: userId,
          concept_id: conceptId,
          mastery_level: newMastery,
          total_exposures: totalExposures,
          successful_recalls: successfulRecalls,
          failed_recalls: failedRecalls,
          stability: newStability,
          next_review_date: nextReviewDate.toISOString(),
          last_reviewed_at: now,
        }, {
          onConflict: 'user_id,concept_id'
        })

      // Check for weak foundation gap (consecutive failures)
      if (failedRecalls >= 2 && newMastery < 0.4) {
        // Insert or update gap record
        await supabase
          .from('user_knowledge_gaps')
          .upsert({
            user_id: userId,
            concept_id: conceptId,
            gap_type: 'weak_foundation',
            severity: newMastery < 0.2 ? 'critical' : 'moderate',
            confidence: Math.min(0.9, 0.5 + failedRecalls * 0.1),
            detected_from_course_id: courseId,
            detected_from_lesson_index: lessonIndex,
            resolved: false,
          }, {
            onConflict: 'user_id,concept_id,gap_type'
          })
      }
    }
  } catch {
    // Gap detection is optional - silently continue
  }
}
