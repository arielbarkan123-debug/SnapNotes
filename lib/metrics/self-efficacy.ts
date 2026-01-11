/**
 * Self-Efficacy Measurement System
 *
 * Implements validated Academic Self-Efficacy Scale for measuring learner confidence.
 * Research target: Cohen's d = 0.312 improvement through AI-enabled feedback.
 */

import { createClient } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

export interface SelfEfficacyItem {
  id: string
  text: string
  category: 'understanding' | 'problem_solving' | 'transfer' | 'explanation'
}

export interface SelfEfficacySurvey {
  id?: string
  userId: string
  courseId?: string
  surveyType: 'pre_course' | 'post_lesson' | 'post_course' | 'weekly' | 'periodic'
  triggerContext?: string

  // Individual item scores (1-5 Likert scale)
  understandMainConcepts?: number
  completeChallengingProblems?: number
  explainToOthers?: number
  applyToNewSituations?: number

  // Computed score
  selfEfficacyScore?: number

  // Additional context
  perceivedDifficulty?: 'too_easy' | 'just_right' | 'too_hard'
  confidenceLevel?: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'

  createdAt?: Date
}

export interface SelfEfficacyAnalysis {
  currentScore: number
  previousScore: number | null
  change: number | null
  trend: 'improving' | 'stable' | 'declining'
  cohensD: number | null // Effect size
  percentile: number | null
  interpretation: string
  recommendations: string[]
}

// =============================================================================
// Self-Efficacy Scale Items
// =============================================================================

/**
 * Validated Academic Self-Efficacy Scale items
 * Based on Bandura's Self-Efficacy Theory
 */
export const SELF_EFFICACY_ITEMS: SelfEfficacyItem[] = [
  {
    id: 'understand_main_concepts',
    text: 'I can understand the main concepts in this subject',
    category: 'understanding',
  },
  {
    id: 'complete_challenging_problems',
    text: 'I can complete challenging problems in this subject',
    category: 'problem_solving',
  },
  {
    id: 'explain_to_others',
    text: 'I can explain what I\'ve learned to others',
    category: 'explanation',
  },
  {
    id: 'apply_to_new_situations',
    text: 'I can apply what I\'ve learned to new situations',
    category: 'transfer',
  },
]

/**
 * Likert scale options
 */
export const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree', color: 'red' },
  { value: 2, label: 'Disagree', color: 'orange' },
  { value: 3, label: 'Neutral', color: 'yellow' },
  { value: 4, label: 'Agree', color: 'lime' },
  { value: 5, label: 'Strongly Agree', color: 'green' },
]

// =============================================================================
// Score Calculation
// =============================================================================

/**
 * Calculates self-efficacy score from individual item responses
 */
export function calculateSelfEfficacyScore(
  responses: Partial<{
    understandMainConcepts: number
    completeChallengingProblems: number
    explainToOthers: number
    applyToNewSituations: number
  }>
): number | null {
  const values = [
    responses.understandMainConcepts,
    responses.completeChallengingProblems,
    responses.explainToOthers,
    responses.applyToNewSituations,
  ].filter((v): v is number => v !== undefined && v !== null)

  if (values.length === 0) return null

  const sum = values.reduce((a, b) => a + b, 0)
  return Number((sum / values.length).toFixed(2))
}

/**
 * Calculates Cohen's d effect size between two groups
 */
export function calculateCohensD(
  preMean: number,
  postMean: number,
  preStd: number,
  postStd: number,
  preN: number,
  postN: number
): number {
  // Pooled standard deviation
  const pooledStd = Math.sqrt(
    ((preN - 1) * preStd * preStd + (postN - 1) * postStd * postStd) /
    (preN + postN - 2)
  )

  if (pooledStd === 0) return 0

  return (postMean - preMean) / pooledStd
}

/**
 * Interprets Cohen's d effect size
 */
export function interpretCohensD(d: number): string {
  const absD = Math.abs(d)
  const direction = d >= 0 ? 'improvement' : 'decline'

  if (absD < 0.2) return `Negligible ${direction}`
  if (absD < 0.5) return `Small ${direction}`
  if (absD < 0.8) return `Medium ${direction}`
  return `Large ${direction}`
}

// =============================================================================
// Survey Management
// =============================================================================

/**
 * Records a self-efficacy survey response
 */
export async function recordSelfEfficacySurvey(
  survey: Omit<SelfEfficacySurvey, 'id' | 'selfEfficacyScore' | 'createdAt'>
): Promise<{ success: boolean; surveyId?: string; score?: number; error?: string }> {
  try {
    const supabase = createClient()

    // Calculate score
    const score = calculateSelfEfficacyScore({
      understandMainConcepts: survey.understandMainConcepts,
      completeChallengingProblems: survey.completeChallengingProblems,
      explainToOthers: survey.explainToOthers,
      applyToNewSituations: survey.applyToNewSituations,
    })

    const { data, error } = await supabase
      .from('self_efficacy_surveys')
      .insert({
        user_id: survey.userId,
        course_id: survey.courseId || null,
        survey_type: survey.surveyType,
        trigger_context: survey.triggerContext || null,
        understand_main_concepts: survey.understandMainConcepts,
        complete_challenging_problems: survey.completeChallengingProblems,
        explain_to_others: survey.explainToOthers,
        apply_to_new_situations: survey.applyToNewSituations,
        self_efficacy_score: score,
        perceived_difficulty: survey.perceivedDifficulty || null,
        confidence_level: survey.confidenceLevel || null,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, surveyId: data.id, score: score || undefined }
  } catch (error) {
    console.error('Error recording self-efficacy survey:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Gets self-efficacy history for a user
 */
export async function getSelfEfficacyHistory(
  userId: string,
  courseId?: string,
  limit: number = 20
): Promise<SelfEfficacySurvey[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('self_efficacy_surveys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      surveyType: row.survey_type,
      triggerContext: row.trigger_context,
      understandMainConcepts: row.understand_main_concepts,
      completeChallengingProblems: row.complete_challenging_problems,
      explainToOthers: row.explain_to_others,
      applyToNewSituations: row.apply_to_new_situations,
      selfEfficacyScore: row.self_efficacy_score,
      perceivedDifficulty: row.perceived_difficulty,
      confidenceLevel: row.confidence_level,
      createdAt: new Date(row.created_at),
    }))
  } catch (error) {
    console.error('Error fetching self-efficacy history:', error)
    return []
  }
}

/**
 * Analyzes self-efficacy trends for a user
 */
export async function analyzeSelfEfficacy(
  userId: string,
  courseId?: string
): Promise<SelfEfficacyAnalysis | null> {
  try {
    const history = await getSelfEfficacyHistory(userId, courseId, 50)

    if (history.length === 0) {
      return null
    }

    // Get current and previous scores
    const currentScore = history[0].selfEfficacyScore || 0
    const previousScores = history.slice(1).map(h => h.selfEfficacyScore).filter((s): s is number => s !== null)
    const previousScore = previousScores.length > 0 ? previousScores[0] : null

    // Calculate change
    const change = previousScore !== null ? currentScore - previousScore : null

    // Calculate trend based on last 5 surveys
    const recentScores = history.slice(0, 5).map(h => h.selfEfficacyScore).filter((s): s is number => s !== null)
    let trend: 'improving' | 'stable' | 'declining' = 'stable'

    if (recentScores.length >= 2) {
      const firstHalf = recentScores.slice(Math.floor(recentScores.length / 2))
      const secondHalf = recentScores.slice(0, Math.floor(recentScores.length / 2))

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      if (secondAvg - firstAvg > 0.2) {
        trend = 'improving'
      } else if (firstAvg - secondAvg > 0.2) {
        trend = 'declining'
      }
    }

    // Calculate Cohen's d if we have pre/post data
    let cohensD: number | null = null
    const preCourse = history.filter(h => h.surveyType === 'pre_course')
    const postCourse = history.filter(h => h.surveyType === 'post_course')

    if (preCourse.length > 0 && postCourse.length > 0) {
      const preScores = preCourse.map(h => h.selfEfficacyScore).filter((s): s is number => s !== null)
      const postScores = postCourse.map(h => h.selfEfficacyScore).filter((s): s is number => s !== null)

      if (preScores.length > 0 && postScores.length > 0) {
        const preMean = preScores.reduce((a, b) => a + b, 0) / preScores.length
        const postMean = postScores.reduce((a, b) => a + b, 0) / postScores.length

        const preStd = Math.sqrt(
          preScores.reduce((sum, s) => sum + Math.pow(s - preMean, 2), 0) / preScores.length
        )
        const postStd = Math.sqrt(
          postScores.reduce((sum, s) => sum + Math.pow(s - postMean, 2), 0) / postScores.length
        )

        cohensD = calculateCohensD(preMean, postMean, preStd || 1, postStd || 1, preScores.length, postScores.length)
      }
    }

    // Generate interpretation
    let interpretation: string
    if (currentScore >= 4.5) {
      interpretation = 'Very high self-efficacy. You feel confident in your ability to learn and apply this material.'
    } else if (currentScore >= 3.5) {
      interpretation = 'Good self-efficacy. You generally feel capable of understanding and working with this material.'
    } else if (currentScore >= 2.5) {
      interpretation = 'Moderate self-efficacy. You may benefit from additional practice and support.'
    } else {
      interpretation = 'Lower self-efficacy. Consider breaking material into smaller chunks and celebrating small wins.'
    }

    // Generate recommendations
    const recommendations: string[] = []

    if (currentScore < 3) {
      recommendations.push('Start with easier practice problems to build confidence')
      recommendations.push('Review foundational concepts before advancing')
    }

    if (trend === 'declining') {
      recommendations.push('Consider revisiting recent topics that may need reinforcement')
      recommendations.push('Take breaks to avoid burnout')
    }

    if (trend === 'improving') {
      recommendations.push('Great progress! Consider increasing challenge level')
    }

    // Target Cohen's d = 0.312
    if (cohensD !== null && cohensD < 0.312) {
      recommendations.push('Continue with personalized learning to reach target improvement')
    }

    return {
      currentScore,
      previousScore,
      change,
      trend,
      cohensD,
      percentile: null, // Would need population data
      interpretation,
      recommendations,
    }
  } catch (error) {
    console.error('Error analyzing self-efficacy:', error)
    return null
  }
}

// =============================================================================
// Survey Triggers
// =============================================================================

/**
 * Determines if a self-efficacy survey should be triggered
 */
export function shouldTriggerSurvey(
  lessonsCompleted: number,
  lastSurveyDate: Date | null,
  surveyCount: number
): { shouldTrigger: boolean; surveyType: SelfEfficacySurvey['surveyType']; reason: string } {
  const now = new Date()

  // First lesson - pre-course survey
  if (lessonsCompleted === 0 && surveyCount === 0) {
    return {
      shouldTrigger: true,
      surveyType: 'pre_course',
      reason: 'Initial self-efficacy baseline',
    }
  }

  // Every 5th lesson - post-lesson survey
  if (lessonsCompleted > 0 && lessonsCompleted % 5 === 0) {
    return {
      shouldTrigger: true,
      surveyType: 'post_lesson',
      reason: `Completed ${lessonsCompleted} lessons milestone`,
    }
  }

  // Weekly check (if last survey was more than 7 days ago)
  if (lastSurveyDate) {
    const daysSinceLastSurvey = Math.floor(
      (now.getTime() - lastSurveyDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastSurvey >= 7) {
      return {
        shouldTrigger: true,
        surveyType: 'weekly',
        reason: 'Weekly self-efficacy check',
      }
    }
  }

  return {
    shouldTrigger: false,
    surveyType: 'periodic',
    reason: '',
  }
}

// =============================================================================
// Export
// =============================================================================

const selfEfficacy = {
  SELF_EFFICACY_ITEMS,
  LIKERT_OPTIONS,
  calculateSelfEfficacyScore,
  calculateCohensD,
  interpretCohensD,
  recordSelfEfficacySurvey,
  getSelfEfficacyHistory,
  analyzeSelfEfficacy,
  shouldTriggerSurvey,
}

export default selfEfficacy
