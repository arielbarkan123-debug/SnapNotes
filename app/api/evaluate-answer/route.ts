import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'

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

// Note: Interface for documentation purposes; response object follows this structure
interface _EvaluationResult {
  isCorrect: boolean
  score: number // 0-100
  feedback: string
  evaluationMethod: 'exact' | 'fuzzy' | 'ai'
}

// =============================================================================
// Text Similarity Utilities
// =============================================================================

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function similarityRatio(a: string, b: string): number {
  const normalizedA = normalizeText(a)
  const normalizedB = normalizeText(b)

  if (normalizedA === normalizedB) return 1
  if (!normalizedA || !normalizedB) return 0

  const maxLength = Math.max(normalizedA.length, normalizedB.length)
  if (maxLength === 0) return 1

  const distance = levenshteinDistance(normalizedA, normalizedB)
  return 1 - distance / maxLength
}

/**
 * Check if answer matches any acceptable answer with fuzzy matching
 */
function fuzzyMatch(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[] = [],
  threshold: number = 0.85
): { matches: boolean; similarity: number; matchedAnswer?: string } {
  const allAnswers = [correctAnswer, ...acceptableAnswers].filter(Boolean)

  let bestSimilarity = 0
  let matchedAnswer: string | undefined

  for (const answer of allAnswers) {
    const similarity = similarityRatio(userAnswer, answer)
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      matchedAnswer = answer
    }
  }

  return {
    matches: bestSimilarity >= threshold,
    similarity: bestSimilarity,
    matchedAnswer: bestSimilarity >= threshold ? matchedAnswer : undefined
  }
}

// =============================================================================
// AI Evaluation
// =============================================================================

/**
 * Evaluate answer using Claude AI
 */
async function evaluateWithAI(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  context?: string,
  curriculumContext?: string
): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey })

  // Build curriculum-aware grading prompt
  const curriculumInstructions = curriculumContext
    ? `
${curriculumContext}

Use the curriculum context above to:
- Apply appropriate command terms and assessment criteria
- Grade according to the curriculum's standards
- Consider assessment objectives when evaluating depth of understanding
`
    : ''

  // Minimal prompt for speed with optional curriculum context
  const prompt = `You are grading a student's answer.${curriculumContext ? ' Apply curriculum-specific grading criteria.' : ' Be generous with partial credit.'}
${curriculumInstructions}
Question: ${question}
Expected Answer: ${expectedAnswer}
Student's Answer: ${userAnswer}
${context ? `Context: ${context}` : ''}

Evaluate if the student's answer is correct. Consider:
- Same meaning with different words = CORRECT
- Key concepts present = PARTIAL CREDIT
- Minor typos/spelling = IGNORE
- Empty or completely wrong = INCORRECT
${curriculumContext ? '- Apply curriculum command terms and assessment objectives' : ''}

Respond with ONLY valid JSON (no markdown):
{"correct":true/false,"score":0-100,"feedback":"one brief sentence"}`

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-latest', // Fastest model
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse JSON response
    const text = textContent.text.trim()
    // Remove any markdown code blocks if present
    const jsonText = text.replace(/```json\s*|\s*```/g, '').trim()
    const result = JSON.parse(jsonText)

    return {
      isCorrect: result.correct === true,
      score: typeof result.score === 'number' ? Math.max(0, Math.min(100, result.score)) : (result.correct ? 100 : 0),
      feedback: result.feedback || (result.correct ? 'Correct!' : 'Not quite right.')
    }
  } catch (error) {
    // Fallback to fuzzy matching if AI fails
    throw error
  }
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

    // Handle empty user answer
    if (!userAnswer || !userAnswer.trim()) {
      return NextResponse.json({
        isCorrect: false,
        score: 0,
        feedback: 'No answer provided.',
        evaluationMethod: 'exact',
        evaluationTimeMs: Date.now() - startTime
      })
    }

    // Get user for curriculum context and gap detection
    let curriculumContextString = ''
    let userId: string | null = null

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null

      if (user) {
        // Fetch user learning profile
        const { data: userProfile } = await supabase
          .from('user_learning_profile')
          .select('study_system, subjects, subject_levels')
          .eq('user_id', user.id)
          .single()

        if (userProfile?.study_system && userProfile.study_system !== 'general' && userProfile.study_system !== 'other') {
          // Build curriculum context for evaluation
          const curriculumContext = await buildCurriculumContext({
            userProfile: {
              studySystem: userProfile.study_system as StudySystem,
              subjects: userProfile.subjects || [],
              subjectLevels: userProfile.subject_levels || {},
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

    // Layer 1: Exact match (fastest)
    const normalizedUser = normalizeText(userAnswer)
    const normalizedExpected = normalizeText(expectedAnswer)

    if (normalizedUser === normalizedExpected) {
      // Record performance for gap detection (fire and forget)
      if (userId && conceptIds.length > 0) {
        recordPerformanceForGapDetection(userId, conceptIds, true, 100, courseId, lessonIndex, responseTimeMs).catch(() => {})
      }
      return NextResponse.json({
        isCorrect: true,
        score: 100,
        feedback: 'Correct!',
        evaluationMethod: 'exact',
        evaluationTimeMs: Date.now() - startTime
      })
    }

    // Check acceptable answers for exact match
    for (const alt of acceptableAnswers) {
      if (normalizeText(alt) === normalizedUser) {
        // Record performance for gap detection (fire and forget)
        if (userId && conceptIds.length > 0) {
          recordPerformanceForGapDetection(userId, conceptIds, true, 100, courseId, lessonIndex, responseTimeMs).catch(() => {})
        }
        return NextResponse.json({
          isCorrect: true,
          score: 100,
          feedback: 'Correct!',
          evaluationMethod: 'exact',
          evaluationTimeMs: Date.now() - startTime
        })
      }
    }

    // Layer 2: Fuzzy match (catches typos)
    const fuzzyResult = fuzzyMatch(userAnswer, expectedAnswer, acceptableAnswers, 0.85)

    if (fuzzyResult.matches) {
      const fuzzyScore = Math.round(fuzzyResult.similarity * 100)
      // Record performance for gap detection (fire and forget)
      if (userId && conceptIds.length > 0) {
        recordPerformanceForGapDetection(userId, conceptIds, true, fuzzyScore, courseId, lessonIndex, responseTimeMs).catch(() => {})
      }
      return NextResponse.json({
        isCorrect: true,
        score: fuzzyScore,
        feedback: 'Correct! (minor spelling differences accepted)',
        evaluationMethod: 'fuzzy',
        evaluationTimeMs: Date.now() - startTime
      })
    }

    // Layer 3: AI evaluation for semantic matching
    try {
      const aiResult = await evaluateWithAI(question, expectedAnswer, userAnswer, context, curriculumContextString)

      // Record performance for gap detection (fire and forget)
      if (userId && conceptIds.length > 0) {
        recordPerformanceForGapDetection(
          userId,
          conceptIds,
          aiResult.isCorrect,
          aiResult.score,
          courseId,
          lessonIndex,
          responseTimeMs
        ).catch(() => {}) // Ignore errors
      }

      return NextResponse.json({
        isCorrect: aiResult.isCorrect,
        score: aiResult.score,
        feedback: aiResult.feedback,
        evaluationMethod: 'ai',
        evaluationTimeMs: Date.now() - startTime
      })
    } catch {
      // If AI fails, fall back to fuzzy result

      // Use a lower threshold for "partial" credit
      const partialScore = Math.round(fuzzyResult.similarity * 100)
      const isPartial = fuzzyResult.similarity >= 0.6

      // Record performance for gap detection (fire and forget)
      if (userId && conceptIds.length > 0) {
        recordPerformanceForGapDetection(
          userId,
          conceptIds,
          false,
          isPartial ? partialScore : Math.round(fuzzyResult.similarity * 50),
          courseId,
          lessonIndex,
          responseTimeMs
        ).catch(() => {}) // Ignore errors
      }

      if (isPartial) {
        return NextResponse.json({
          isCorrect: false,
          score: partialScore,
          feedback: 'Partially correct. Review the expected answer.',
          evaluationMethod: 'fuzzy',
          evaluationTimeMs: Date.now() - startTime
        })
      }

      return NextResponse.json({
        isCorrect: false,
        score: Math.round(fuzzyResult.similarity * 50), // Lower score for low similarity
        feedback: 'Not quite. Compare with the correct answer.',
        evaluationMethod: 'fuzzy',
        evaluationTimeMs: Date.now() - startTime
      })
    }
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
