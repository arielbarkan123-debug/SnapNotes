/**
 * Homework Checker Engine
 * AI-powered homework analysis and feedback generation
 *
 * ACCURACY ARCHITECTURE:
 * - Two-phase analysis: analyze items separately, then calculate grade
 * - Grade calculation: computed from actual correct/incorrect items, NOT from Claude's estimate
 * - Consistency validation: ensures grade matches feedback items before returning
 *
 * PERFORMANCE NOTE:
 * - Images are fetched and converted to base64 before sending to Claude
 * - The API route uses streaming with heartbeats to keep mobile connections alive
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  HomeworkFeedback,
  GradeLevel,
  AnnotatedFeedbackPoint,
  AnnotationRegion,
  AnnotationData,
  InputMode,
  SolutionSet,
  VerifiedProblem,
  StudentAnswerSet,
  FeedbackPoint,
} from './types'
import { verifyAnswer, answersMatch } from './math-verifier'
import { readStudentWork } from './student-work-reader'
import { validateFeedbackQuality, regenerateWeakFeedback } from './feedback-quality'
import {
  normalizeText,
  similarityRatio,
} from '@/lib/evaluation/answer-checker'

// ============================================================================
// Error Codes for Homework Checker Engine
// ============================================================================

const ENGINE_ERROR_CODES = {
  // Text mode errors
  ENG_TXT_001: 'ENG_TXT_001', // Text analysis failed
  ENG_TXT_002: 'ENG_TXT_002', // Text analysis timeout
  ENG_TXT_003: 'ENG_TXT_003', // Text analysis rate limit

  // Image mode errors
  ENG_IMG_001: 'ENG_IMG_001', // Image fetch failed
  ENG_IMG_002: 'ENG_IMG_002', // Image analysis failed
  ENG_IMG_003: 'ENG_IMG_003', // Image analysis timeout
  ENG_IMG_004: 'ENG_IMG_004', // Task image URL required
  ENG_IMG_005: 'ENG_IMG_005', // HEIC/HEIF format not supported

  // Common errors
  ENG_API_001: 'ENG_API_001', // API key not set
  ENG_API_002: 'ENG_API_002', // API overloaded
} as const

/**
 * Format error message with code for debugging
 */
function formatEngineError(code: string, message: string, details?: string): string {
  const detailSuffix = details ? ` (${details})` : ''
  return `[${code}] ${message}${detailSuffix}`
}

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-6-20250227'
const MAX_TOKENS = 4096
const IMAGE_FETCH_TIMEOUT_MS = 30000 // 30 second timeout for fetching images
const API_TIMEOUT_MS = 180000 // 3 minutes - increased for Safari compatibility

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

/**
 * Check if an error is retryable (transient server issues)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Retry on server errors, overload, rate limits
    const retryableStatuses = [429, 500, 502, 503, 504, 529]
    return retryableStatuses.includes(error.status)
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('overloaded') ||
           message.includes('529') ||
           message.includes('rate') ||
           message.includes('timeout') ||
           error.name === 'AbortError'
  }
  return false
}

// ============================================================================
// Image Fetching
// ============================================================================

// Claude Vision API supports these media types including PDF
type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'

interface FetchedImage {
  base64: string
  mediaType: MediaType
}

/**
 * Fetch an image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<FetchedImage> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  const startTime = Date.now()

  try {
    console.log('[Checker] Fetching image:', url.substring(0, 100) + '...')

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Accept images and PDFs for document analysis
        'Accept': 'image/*, application/pdf',
      },
    })

    const fetchTime = Date.now() - startTime
    console.log('[Checker] Fetch response received in', fetchTime, 'ms, status:', response.status)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const bufferTime = Date.now() - startTime

    // Determine media type and handle HEIC detection
    let mediaType: MediaType = 'image/jpeg'
    const finalImageData: Buffer = Buffer.from(arrayBuffer)

    if (contentType.includes('heic') || contentType.includes('heif')) {
      // HEIC/HEIF not supported by Claude
      // Client-side conversion should have handled this, but if it got through:
      console.error('[CheckerEngine/ImageFetch] HEIC/HEIF image received - client conversion may have failed')
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_005, 'This image format is not supported. Please try uploading again or use a JPEG/PNG image.', 'CheckerEngine/ImageFetch/HEIC'))
    } else if (contentType.includes('pdf')) {
      // PDF is supported by Claude Vision API
      mediaType = 'application/pdf'
    } else if (contentType.includes('png')) {
      mediaType = 'image/png'
    } else if (contentType.includes('gif')) {
      mediaType = 'image/gif'
    } else if (contentType.includes('webp')) {
      mediaType = 'image/webp'
    }

    const base64 = finalImageData.toString('base64')
    const totalTime = Date.now() - startTime

    console.log('[Checker] Image processed:', {
      size: finalImageData.byteLength,
      type: mediaType,
      fetchTime: fetchTime + 'ms',
      bufferTime: bufferTime + 'ms',
      totalTime: totalTime + 'ms',
    })

    return { base64, mediaType }
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('[Checker] Image fetch failed after', elapsed, 'ms:', {
      url: url.substring(0, 100) + '...',
      error: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      isAbort: error instanceof Error && error.name === 'AbortError',
    })
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================================================
// Grade Calculation & Consistency Validation
// ============================================================================

/**
 * Parse a grade string like "60/100", "85%", "B+" into a numeric value (0-100)
 */
function parseGradeToNumber(gradeEstimate: string): number {
  if (!gradeEstimate) return 0

  // Handle "X/100" format
  const slashMatch = gradeEstimate.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/)
  if (slashMatch) {
    const [, num, denom] = slashMatch
    return Math.round((parseFloat(num) / parseFloat(denom)) * 100)
  }

  // Handle "X%" format
  const percentMatch = gradeEstimate.match(/(\d+(?:\.\d+)?)\s*%/)
  if (percentMatch) {
    return Math.round(parseFloat(percentMatch[1]))
  }

  // Handle letter grades
  const letterGrades: Record<string, number> = {
    'A+': 97, 'A': 94, 'A-': 90,
    'B+': 87, 'B': 84, 'B-': 80,
    'C+': 77, 'C': 74, 'C-': 70,
    'D+': 67, 'D': 64, 'D-': 60,
    'F': 50
  }
  const letterMatch = gradeEstimate.toUpperCase().match(/[A-F][+-]?/)
  if (letterMatch && letterGrades[letterMatch[0]]) {
    return letterGrades[letterMatch[0]]
  }

  // Try to extract any number
  const numMatch = gradeEstimate.match(/(\d+(?:\.\d+)?)/)
  if (numMatch) {
    const num = parseFloat(numMatch[1])
    // If it looks like a percentage (<=100), use it directly
    if (num <= 100) return Math.round(num)
    // If larger, might be points - assume out of 100
    return Math.min(100, Math.round(num))
  }

  return 70 // Default fallback
}

/**
 * Calculate what the grade SHOULD be based on correctPoints vs improvementPoints
 * This is the source of truth - NOT Claude's gradeEstimate
 */
function calculateGradeFromFeedback(
  correctPoints: AnnotatedFeedbackPoint[],
  improvementPoints: AnnotatedFeedbackPoint[]
): { grade: number; level: GradeLevel } {
  // Safety checks
  const safeCorrectPoints = Array.isArray(correctPoints) ? correctPoints : []
  const safeImprovementPoints = Array.isArray(improvementPoints) ? improvementPoints : []

  const correctCount = safeCorrectPoints.length
  const errorCount = safeImprovementPoints.length
  const totalItems = correctCount + errorCount

  // If no items analyzed, return moderate grade
  if (totalItems === 0) {
    return { grade: 70, level: 'needs_improvement' }
  }

  // Count severity of errors (with safety checks)
  const majorErrors = safeImprovementPoints.filter(p => p?.severity === 'major').length
  const moderateErrors = safeImprovementPoints.filter(p => p?.severity === 'moderate').length

  // Base grade from correct ratio
  let grade = (correctCount / totalItems) * 100

  // Adjust for error severity (errors already counted in ratio, but severity matters)
  // Moderate errors: -2 points each
  // Major errors: -5 points each
  const severityPenalty = (majorErrors * 5) + (moderateErrors * 2)
  grade = grade - severityPenalty

  // Ensure grade stays in valid range
  grade = Math.max(0, Math.min(100, Math.round(grade)))

  // Determine grade level
  let level: GradeLevel
  if (grade >= 90) {
    level = 'excellent'
  } else if (grade >= 75) {
    level = 'good'
  } else if (grade >= 50) {
    level = 'needs_improvement'
  } else {
    level = 'incomplete'
  }

  return { grade, level }
}

/**
 * Ensure consistency between the declared grade and the actual feedback items
 * If there's a significant mismatch, recalculate the grade
 */
function ensureGradeConsistency(output: CheckerOutput): CheckerOutput {
  try {
    // Safety check - ensure we have valid output
    if (!output?.feedback) {
      console.error('[Homework Checker] Invalid output in ensureGradeConsistency')
      return output
    }

    const correctPoints = output.feedback.correctPoints || []
    const improvementPoints = output.feedback.improvementPoints || []

    const declaredGrade = parseGradeToNumber(output.feedback.gradeEstimate || '')
    const { grade: calculatedGrade, level: calculatedLevel } = calculateGradeFromFeedback(
      correctPoints,
      improvementPoints
    )

    // Log for debugging
    console.log('[Homework Checker] Grade consistency check:', {
      declaredGrade,
      calculatedGrade,
      correctPoints: correctPoints.length,
      improvementPoints: improvementPoints.length,
      majorErrors: improvementPoints.filter(p => p.severity === 'major').length
    })

    // If the grades differ by more than 15 points, use the calculated grade
    // This catches cases where Claude says "60%" but all items are correct
    const discrepancy = Math.abs(declaredGrade - calculatedGrade)
    if (discrepancy > 15) {
      console.log(`[Homework Checker] Grade discrepancy detected! Declared: ${declaredGrade}, Calculated: ${calculatedGrade}. Using calculated grade.`)
      output.feedback.gradeEstimate = `${calculatedGrade}/100`
      output.feedback.gradeLevel = calculatedLevel
    }

    // Special case: If there are no major errors and grade is below 75, bump it up
    const majorErrors = improvementPoints.filter(p => p.severity === 'major').length
    if (majorErrors === 0 && correctPoints.length > 0) {
      const currentGrade = parseGradeToNumber(output.feedback.gradeEstimate)
      if (currentGrade < 75) {
        const adjustedGrade = Math.max(currentGrade, 80)
        console.log(`[Homework Checker] No major errors but low grade. Adjusting ${currentGrade} -> ${adjustedGrade}`)
        output.feedback.gradeEstimate = `${adjustedGrade}/100`
        output.feedback.gradeLevel = 'good'
      }
    }

    // Special case: All correct points, no improvement points = excellent
    if (correctPoints.length > 0 && improvementPoints.length === 0) {
      const currentGrade = parseGradeToNumber(output.feedback.gradeEstimate)
      if (currentGrade < 90) {
        console.log(`[Homework Checker] All items correct but grade was ${currentGrade}. Setting to 95.`)
        output.feedback.gradeEstimate = '95/100'
        output.feedback.gradeLevel = 'excellent'
      }
    }

    return output
  } catch (error) {
    // If consistency check fails, return original output rather than crashing
    console.error('[Homework Checker] Error in ensureGradeConsistency:', error)
    return output
  }
}

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_API_001, 'ANTHROPIC_API_KEY environment variable is not set', 'CheckerEngine/Config'))
    }
    anthropicClient = new Anthropic({
      apiKey,
      timeout: API_TIMEOUT_MS, // Prevent indefinite blocking on mobile
    })
  }
  return anthropicClient
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export interface CheckerInput {
  // Input mode indicator
  inputMode: InputMode

  // Image-based (optional if text provided)
  taskImageUrl?: string
  answerImageUrl?: string  // Optional - if not provided, will analyze task only
  referenceImageUrls?: string[]
  teacherReviewUrls?: string[]

  // Text-based (optional if image provided)
  taskText?: string
  answerText?: string

  // Extracted text from DOCX files (DOCX not supported by Claude Vision directly)
  taskDocumentText?: string
  answerDocumentText?: string
}

export interface CheckerOutput {
  feedback: HomeworkFeedback
  subject: string
  topic: string
  taskText: string
  answerText: string
}

export async function analyzeHomework(input: CheckerInput): Promise<CheckerOutput> {
  try {
    const client = getAnthropicClient()

    // ============================================================================
    // TEXT MODE: Skip image fetching, use text directly
    // ============================================================================
    if (input.inputMode === 'text') {
      console.log('[Checker] Text mode - skipping image fetch, analyzing text directly...')
      return analyzeHomeworkText(client, input)
    }

    // ============================================================================
    // IMAGE MODE: Three-Phase Pipeline (with legacy fallback)
    // ============================================================================
    if (!input.taskImageUrl) {
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_004, 'Task image URL is required for image mode', 'CheckerEngine/ImageMode/Validation'))
    }

    try {
      console.log('[Checker] Starting three-phase grading pipeline...')
      return await analyzeHomeworkThreePhase(client, input)
    } catch (pipelineError) {
      // Fallback: if the three-phase pipeline fails, use legacy single-pass
      console.warn('[Checker] Three-phase pipeline failed, falling back to legacy single-pass:', pipelineError instanceof Error ? pipelineError.message : String(pipelineError))
      return await analyzeHomeworkLegacy(client, input)
    }
  } catch (error) {
    // Detailed error logging for debugging mobile vs desktop issues
    console.error('[Homework Checker] analyzeHomework error:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined,
    })

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
    const errorName = error instanceof Error ? error.name : ''

    if (errorMessage.includes('timeout') || errorName === 'AbortError' || errorMessage.includes('timed out')) {
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_003, 'Analysis took too long. Please try again with clearer images.', 'CheckerEngine/ImageMode/Timeout'))
    }

    if (errorMessage.includes('overloaded') || errorMessage.includes('529')) {
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_API_002, 'Our AI is busy right now. Please try again in a moment.', 'CheckerEngine/API/Overloaded'))
    }

    if (error instanceof Error && error.message.startsWith('[')) {
      throw error
    }
    throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_002, error instanceof Error ? error.message : 'Analysis failed', 'CheckerEngine/ImageMode/Unknown'))
  }
}

// ============================================================================
// Three-Phase Grading Pipeline
// ============================================================================

async function analyzeHomeworkThreePhase(client: Anthropic, input: CheckerInput): Promise<CheckerOutput> {
  const isSeparateImages = !!input.answerImageUrl
  console.log(`[Checker/3Phase] Mode: ${isSeparateImages ? 'separate' : 'combined'} images`)

  // Fetch all images upfront
  const taskImage = await fetchImageAsBase64(input.taskImageUrl!)
  const answerImage = input.answerImageUrl ? await fetchImageAsBase64(input.answerImageUrl) : null

  // PDF documents can't go through the three-phase pipeline (need legacy)
  if (taskImage.mediaType === 'application/pdf' || input.taskDocumentText || input.answerDocumentText) {
    console.log('[Checker/3Phase] PDF/DOCX detected, falling back to legacy pipeline')
    throw new Error('PDF/DOCX not supported in three-phase pipeline')
  }

  const taskMediaType = taskImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  // Fetch reference images (used in Phase 1 for solving context)
  let referenceImages: FetchedImage[] = []
  if (input.referenceImageUrls && input.referenceImageUrls.length > 0) {
    referenceImages = await Promise.all(
      input.referenceImageUrls.map(url => fetchImageAsBase64(url))
    )
  }

  // Fetch teacher review images (used in Phase 3 for feedback style)
  let teacherImages: FetchedImage[] = []
  if (input.teacherReviewUrls && input.teacherReviewUrls.length > 0) {
    teacherImages = await Promise.all(
      input.teacherReviewUrls.map(url => fetchImageAsBase64(url))
    )
  }

  // ============================================================================
  // Phase 1 + Phase 2 (truly parallel in separate-image mode)
  // ============================================================================
  let solutionSet: SolutionSet
  let studentAnswerSet: StudentAnswerSet | null = null

  if (isSeparateImages && answerImage) {
    const answerMediaType = answerImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    console.log('[Checker/3Phase] Running Phase 1 + Phase 2 in parallel...')

    // Phase 1 and Phase 2 run truly in parallel — they look at different images.
    // Phase 2 runs without a problem list; it transcribes all answers in visual
    // order with sequential IDs (q1, q2, ...). Phase 3 matches by index.
    const [phase1Result, phase2Result] = await Promise.all([
      extractAndSolveProblems(client, taskImage.base64, taskMediaType, false, referenceImages),
      readStudentWork(client, answerImage.base64, answerMediaType),
    ])

    solutionSet = phase1Result
    studentAnswerSet = phase2Result

    // Remap Phase 2 sequential IDs (q1, q2, ...) to Phase 1 problem IDs by index
    if (studentAnswerSet.answers.length > 0 && solutionSet.problems.length > 0) {
      const answerCount = studentAnswerSet.answers.length
      const problemCount = solutionSet.problems.length

      if (answerCount !== problemCount) {
        console.warn(`[Checker/3Phase] Phase 1/2 count mismatch: ${problemCount} problems vs ${answerCount} student answers`)
      }

      // Map by index up to the minimum of both arrays
      const mapCount = Math.min(answerCount, problemCount)
      for (let i = 0; i < mapCount; i++) {
        studentAnswerSet.answers[i].problemId = solutionSet.problems[i].id
      }

      // Drop excess answers that don't map to any problem (likely scratch work)
      if (answerCount > problemCount) {
        console.warn(`[Checker/3Phase] Dropping ${answerCount - problemCount} excess student answers (no matching problems)`)
        studentAnswerSet.answers = studentAnswerSet.answers.slice(0, problemCount)
      }
    }
  } else {
    // Combined image mode: Phase 1 extracts problems AND reads student answers
    console.log('[Checker/3Phase] Running Phase 1 (combined mode — extract + solve + read)...')
    solutionSet = await extractAndSolveProblems(client, taskImage.base64, taskMediaType, true, referenceImages)
  }

  // ============================================================================
  // mathjs Verification + Retry on Disagreement
  // ============================================================================
  console.log('[Checker/3Phase] Running mathjs verification...')
  const disagreements: VerifiedProblem[] = []

  for (const problem of solutionSet.problems) {
    const verification = verifyAnswer(problem.correctAnswer, problem.subject, problem.questionText)
    problem.mathjsVerified = verification.verified
    problem.mathjsResult = verification.result
    problem.verificationStatus = verification.status

    if (verification.status === 'disagreement') {
      console.warn(`[Checker/3Phase] mathjs disagrees on problem ${problem.id}: Claude="${problem.correctAnswer}", mathjs="${verification.result}"`)
      disagreements.push(problem)
    }
  }

  // Retry Phase 1 for disagreements
  if (disagreements.length > 0) {
    console.log(`[Checker/3Phase] Retrying ${disagreements.length} problems with mathjs disagreement...`)
    for (const problem of disagreements) {
      try {
        const corrected = await recheckProblem(client, problem)
        if (corrected) {
          problem.correctAnswer = corrected.correctAnswer
          problem.solutionSteps = corrected.solutionSteps
          // Re-verify with mathjs
          const recheck = verifyAnswer(corrected.correctAnswer, problem.subject, problem.questionText)
          problem.mathjsVerified = recheck.verified
          problem.mathjsResult = recheck.result
          problem.verificationStatus = recheck.status
          if (recheck.status === 'disagreement') {
            console.warn(`[Checker/3Phase] Problem ${problem.id} STILL disagrees after recheck: Claude="${corrected.correctAnswer}", mathjs="${recheck.result}". Using Claude's answer — mathjs may not handle this expression.`)
          } else {
            console.log(`[Checker/3Phase] Problem ${problem.id} rechecked: status=${recheck.status}`)
          }
        }
      } catch (retryErr) {
        console.warn(`[Checker/3Phase] Retry failed for problem ${problem.id}:`, retryErr instanceof Error ? retryErr.message : String(retryErr))
      }
    }
  }

  // ============================================================================
  // Phase 3 — Compare & Generate Feedback
  // ============================================================================
  console.log('[Checker/3Phase] Running Phase 3 (compare & generate feedback)...')
  const result = await compareAndGenerateFeedback(
    client,
    solutionSet,
    studentAnswerSet,
    answerImage?.base64,
    answerImage ? (answerImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') : undefined,
    teacherImages
  )

  // ============================================================================
  // Feedback Quality Floor
  // ============================================================================
  console.log('[Checker/3Phase] Checking feedback quality...')
  const qualityResult = validateFeedbackQuality(
    result.feedback.correctPoints,
    result.feedback.improvementPoints
  )

  if (!qualityResult.passed) {
    console.log('[Checker/3Phase] Feedback quality below floor, regenerating weak items...')
    const failingItems: { type: 'correct' | 'improvement'; index: number; point: FeedbackPoint }[] = []
    const contexts: { correctAnswer: string; studentAnswer: string; questionText: string }[] = []

    for (const idx of qualityResult.failingImprovementIndices) {
      const point = result.feedback.improvementPoints[idx]
      if (point) {
        failingItems.push({ type: 'improvement', index: idx, point })
        const matchedProblem = findProblemForFeedback(point, solutionSet.problems)
        contexts.push({
          correctAnswer: matchedProblem?.correctAnswer || '',
          studentAnswer: matchedProblem?.studentAnswer || '',
          questionText: matchedProblem?.questionText || '',
        })
      }
    }

    for (const idx of qualityResult.failingCorrectIndices) {
      const point = result.feedback.correctPoints[idx]
      if (point) {
        failingItems.push({ type: 'correct', index: idx, point })
        const matchedProblem = findProblemForFeedback(point, solutionSet.problems)
        contexts.push({
          correctAnswer: matchedProblem?.correctAnswer || '',
          studentAnswer: matchedProblem?.studentAnswer || '',
          questionText: matchedProblem?.questionText || '',
        })
      }
    }

    if (failingItems.length > 0) {
      const regenerated = await regenerateWeakFeedback(
        client, failingItems, contexts, solutionSet.detectedLanguage
      )

      // Replace failing items with regenerated ones (only if they have content)
      let regenIdx = 0
      for (const idx of qualityResult.failingImprovementIndices) {
        if (regenerated[regenIdx]?.description) {
          result.feedback.improvementPoints[idx] = {
            ...result.feedback.improvementPoints[idx],
            ...regenerated[regenIdx],
          }
        }
        regenIdx++
      }
      for (const idx of qualityResult.failingCorrectIndices) {
        if (regenerated[regenIdx]?.description) {
          result.feedback.correctPoints[idx] = {
            ...result.feedback.correctPoints[idx],
            ...regenerated[regenIdx],
          }
        }
        regenIdx++
      }

      // Re-validate after regeneration (one check, no infinite loop)
      const recheck = validateFeedbackQuality(
        result.feedback.correctPoints,
        result.feedback.improvementPoints
      )
      if (!recheck.passed) {
        console.warn(`[Checker/3Phase] Feedback still below quality floor after regeneration (${recheck.reasons.length} issues remain). Accepting as-is.`)
      }
    }
  }

  // Final safety net
  return ensureGradeConsistency(result)
}

/**
 * Match a feedback point to its source problem by searching for problem IDs
 * or question text in the feedback title/description.
 */
function findProblemForFeedback(
  point: FeedbackPoint,
  problems: VerifiedProblem[]
): VerifiedProblem | undefined {
  const text = `${point.title} ${point.description}`.toLowerCase()

  // First try: match by problem ID in title (e.g., "Problem q1", "q2 — Error")
  for (const problem of problems) {
    if (text.includes(problem.id.toLowerCase())) {
      return problem
    }
  }

  // Second try: match by problem number (e.g., "Problem 1", "Problem 2")
  const numMatch = text.match(/problem\s*(\d+)/i)
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1
    if (idx >= 0 && idx < problems.length) {
      return problems[idx]
    }
  }

  // Third try: match by question text overlap (need at least 8 chars for meaningful match)
  for (const problem of problems) {
    const snippet = (problem.questionText || '').toLowerCase().slice(0, 30)
    if (snippet.length >= 8 && text.includes(snippet)) {
      return problem
    }
  }

  return undefined
}

/**
 * Re-check a single problem where mathjs disagreed with Claude's answer.
 * Sends a focused prompt with the discrepancy details.
 */
async function recheckProblem(
  client: Anthropic,
  problem: VerifiedProblem
): Promise<{ correctAnswer: string; solutionSteps: string[] } | null> {
  const prompt = `Recheck this calculation. There is a discrepancy between two solution methods.

Problem: ${problem.questionText}

Your previous answer: ${problem.correctAnswer}
Your previous steps: ${problem.solutionSteps.join(' → ')}

Independent calculator result: ${problem.mathjsResult}

Please carefully re-solve this problem step by step and provide the correct answer.
If your previous answer was wrong, provide the corrected answer.
If the calculator couldn't properly parse the problem, confirm your original answer.

Respond with ONLY JSON:
{ "correctAnswer": "the verified correct answer", "solutionSteps": ["step1", "step2", ...] }`

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') return null

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  const parsed = JSON.parse(jsonMatch[0])
  return {
    correctAnswer: String(parsed.correctAnswer || problem.correctAnswer),
    solutionSteps: Array.isArray(parsed.solutionSteps) ? parsed.solutionSteps.map(String) : problem.solutionSteps,
  }
}

// ============================================================================
// Phase 1 — Extract & Solve Problems
// ============================================================================

async function extractAndSolveProblems(
  client: Anthropic,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  includeStudentAnswers: boolean,
  referenceImages: FetchedImage[] = []
): Promise<SolutionSet> {
  const studentAnswerInstruction = includeStudentAnswers
    ? `
6. Also READ the student's answers from the same image:
   - For each problem, transcribe what the student wrote as their answer
   - Include a "studentAnswer" field with their answer text
   - Include a "studentAnswerConfidence" field: "high", "medium", or "low"
   - If handwriting is ambiguous, favor the interpretation that makes the answer correct`
    : ''

  const studentAnswerFields = includeStudentAnswers
    ? `
      "studentAnswer": "what the student wrote (only in combined-image mode)",
      "studentAnswerConfidence": "high" | "medium" | "low"`
    : ''

  const prompt = `You are a problem-solving specialist. Your job is to:
1. READ all problems/questions from this image
2. SOLVE each one step-by-step showing your work
3. Provide the correct answer for each
4. Identify the subject area for each problem
5. Be especially careful with Hebrew content: read Hebrew labels RTL, math expressions LTR
${studentAnswerInstruction}

## IMPORTANT RULES:
- SHOW YOUR WORK for every calculation
- For multi-line solutions in the image, read ALL lines as ONE solution
- For Hebrew+math: Hebrew labels are RTL, equations are LTR
- Double-check every calculation before finalizing
- Detect the language used in the homework (Hebrew or English)

## Response format (JSON only):
{
  "detectedLanguage": "he" or "en",
  "problems": [
    {
      "id": "q1",
      "questionText": "exact transcription of the problem",
      "subject": "Math" | "Science" | "Physics" | etc,
      "solutionSteps": ["step 1: ...", "step 2: ...", "step 3: ..."],
      "correctAnswer": "the final correct answer"${studentAnswerFields}
    }
  ]
}

Respond with ONLY the JSON, no other text.`

  const content: Anthropic.MessageParam['content'] = [
    { type: 'text', text: prompt },
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: imageBase64 },
    },
  ]

  // Add reference images if provided (for solving context)
  if (referenceImages.length > 0) {
    content.push({
      type: 'text',
      text: '\n## REFERENCE MATERIALS (use these to help solve the problems):',
    })
    for (const img of referenceImages) {
      if (img.mediaType === 'application/pdf') {
        content.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: img.base64 },
        } as Anthropic.DocumentBlockParam)
      } else {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: img.base64,
          },
        })
      }
    }
  }

  const response = await streamWithRetry(client, content)
  return parseSolutionSetResponse(response, includeStudentAnswers)
}

function parseSolutionSetResponse(response: Anthropic.Message, includeStudentAnswers: boolean): SolutionSet {
  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Phase 1: No text in response')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Phase 1: No JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed.problems) || parsed.problems.length === 0) {
    throw new Error('Phase 1: No problems extracted')
  }

  const detectedLanguage = parsed.detectedLanguage === 'he' ? 'he' : 'en'

  const problems: VerifiedProblem[] = parsed.problems.map((p: Record<string, unknown>, i: number) => ({
    id: String(p.id || `q${i + 1}`),
    questionText: String(p.questionText || ''),
    subject: String(p.subject || 'General'),
    solutionSteps: Array.isArray(p.solutionSteps) ? p.solutionSteps.map(String) : [],
    correctAnswer: String(p.correctAnswer || ''),
    mathjsVerified: false,
    verificationStatus: 'unverifiable' as const,
    ...(includeStudentAnswers ? {
      studentAnswer: p.studentAnswer != null ? String(p.studentAnswer) : undefined,
      studentAnswerConfidence: validateConfidenceLevel(p.studentAnswerConfidence),
    } : {}),
  }))

  console.log(`[Checker/Phase1] Extracted ${problems.length} problems, language: ${detectedLanguage}`)

  return {
    problems,
    inputMode: includeStudentAnswers ? 'combined' : 'separate',
    detectedLanguage,
  }
}

function validateConfidenceLevel(value: unknown): 'high' | 'medium' | 'low' | undefined {
  if (typeof value === 'string' && ['high', 'medium', 'low'].includes(value)) {
    return value as 'high' | 'medium' | 'low'
  }
  return undefined
}

// ============================================================================
// Phase 3 — Compare & Generate Feedback
// ============================================================================

async function compareAndGenerateFeedback(
  client: Anthropic,
  solutionSet: SolutionSet,
  studentAnswerSet: StudentAnswerSet | null,
  answerImageBase64?: string,
  answerMediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  teacherImages: FetchedImage[] = []
): Promise<CheckerOutput> {
  // Build student answers map
  const studentAnswers = new Map<string, string>()
  if (studentAnswerSet) {
    for (const answer of studentAnswerSet.answers) {
      studentAnswers.set(answer.problemId, answer.interpretation || answer.rawReading)
    }
  }

  // For combined mode, student answers are on the problems themselves
  for (const problem of solutionSet.problems) {
    if (problem.studentAnswer && !studentAnswers.has(problem.id)) {
      studentAnswers.set(problem.id, problem.studentAnswer)
    }
  }

  // ============================================================================
  // Layer 1: Deterministic comparison (no AI needed)
  // ============================================================================
  const deterministicResults: Map<string, { matched: boolean; method: string }> = new Map()

  for (const problem of solutionSet.problems) {
    const studentAnswer = studentAnswers.get(problem.id)
    if (!studentAnswer) continue

    // Numeric match (within 0.1% tolerance)
    if (answersMatch(problem.correctAnswer, studentAnswer)) {
      deterministicResults.set(problem.id, { matched: true, method: 'numeric' })
      continue
    }

    // Exact text match (normalized)
    if (normalizeText(problem.correctAnswer) === normalizeText(studentAnswer)) {
      deterministicResults.set(problem.id, { matched: true, method: 'exact' })
      continue
    }

    // Fuzzy text match (Levenshtein >= 85%)
    const similarity = similarityRatio(problem.correctAnswer, studentAnswer)
    if (similarity >= 0.85) {
      deterministicResults.set(problem.id, { matched: true, method: 'fuzzy' })
      continue
    }

    // Didn't match deterministically — need AI comparison
  }

  console.log(`[Checker/Phase3] Deterministic matches: ${deterministicResults.size}/${solutionSet.problems.length}`)

  // ============================================================================
  // Layer 2 + 3: AI comparison + feedback generation
  // Build a prompt that only asks AI to judge problems that didn't match
  // deterministically, and generate all feedback
  // ============================================================================

  const problemSummaries = solutionSet.problems.map(problem => {
    const studentAnswer = studentAnswers.get(problem.id) || '(no answer found)'
    const deterministicMatch = deterministicResults.get(problem.id)

    return {
      id: problem.id,
      question: problem.questionText,
      correctAnswer: problem.correctAnswer,
      mathjsVerified: problem.mathjsVerified,
      mathjsResult: problem.mathjsResult,
      studentAnswer,
      deterministicMatch: deterministicMatch ? deterministicMatch.method : null,
      needsAIJudgment: !deterministicMatch,
    }
  })

  const content: Anthropic.MessageParam['content'] = []

  // Add answer image for annotation purposes if available
  if (answerImageBase64 && answerMediaType) {
    content.push({
      type: 'text',
      text: '## Student\'s answer sheet (for annotation region placement):',
    })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: answerMediaType, data: answerImageBase64 },
    })
  }

  // Add teacher review images for feedback style matching
  let teacherStyleInstruction = ''
  if (teacherImages.length > 0) {
    content.push({
      type: 'text',
      text: '\n## PREVIOUS TEACHER REVIEWS (match this grading style):',
    })
    for (const img of teacherImages) {
      if (img.mediaType === 'application/pdf') {
        content.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: img.base64 },
        } as Anthropic.DocumentBlockParam)
      } else {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: img.base64,
          },
        })
      }
    }
    teacherStyleInstruction = `
4. Mirror the teacher's feedback style from the reviews above:
   - Match their tone, focus areas, and grading standards
   - Fill in "teacherStyleNotes" and "expectationComparison" fields`
  }

  content.push({
    type: 'text',
    text: `## GRADING TASK — Compare answers and generate feedback

You are given pre-solved problems with verified correct answers and the student's transcribed answers.

### Problem data:
${JSON.stringify(problemSummaries, null, 2)}

### Your tasks:
1. For problems where "deterministicMatch" is not null → the student is CORRECT. Generate positive feedback.
2. For problems where "needsAIJudgment" is true → judge if the student's answer is correct/equivalent to the correct answer:
   - Consider alternative notations (e.g., "1/2" vs "0.5")
   - Consider equivalent expressions
   - Consider conceptual equivalence for non-numeric answers
   - If ambiguous, favor the student
3. Generate specific, detailed feedback for every problem.${teacherStyleInstruction}

### Feedback quality requirements:
- For WRONG answers: state the correct answer, what the student wrote, explain the specific error, show the correction. Minimum 20 words.
- For CORRECT answers: acknowledge what technique/method the student used correctly. Minimum 10 words.
- NO generic phrases like "good job", "try again", "needs work".

### Response format (JSON):
{
  "subject": "primary subject",
  "topic": "specific topic",
  "taskText": "summary of all problems",
  "answerText": "summary of student's work",
  "feedback": {
    "gradeLevel": "excellent" | "good" | "needs_improvement" | "incomplete",
    "gradeEstimate": "X/100 — MUST equal (correct_count / total) * 100",
    "summary": "X out of Y problems correct. Brief overall assessment.",
    "correctPoints": [
      {
        "title": "Problem X — Correct",
        "description": "Specific acknowledgment of what the student did right (20+ words for wrong, 10+ words for correct)",
        "region": { "x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100 }
      }
    ],
    "improvementPoints": [
      {
        "title": "Problem X — Error",
        "description": "The correct answer is [X]. The student wrote [Y]. [Specific error explanation]. [Correct solution steps].",
        "severity": "major" | "moderate",
        "region": { "x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100 }
      }
    ],
    "suggestions": ["specific actionable suggestions"],
    "teacherStyleNotes": null,
    "expectationComparison": null,
    "encouragement": "encouraging message"
  }
}

Respond with ONLY JSON.`,
  })

  const response = await streamWithRetry(client, content)
  return parseCheckerResponse(response)
}

// ============================================================================
// Shared Stream Helper with Retry
// ============================================================================

async function streamWithRetry(
  client: Anthropic,
  content: Anthropic.MessageParam['content']
): Promise<Anthropic.Message> {
  let response: Anthropic.Message | null = null
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = client.messages.stream({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content }],
      })

      for await (const event of stream) {
        void event
      }

      response = await stream.finalMessage()
      console.log(`[Checker] Response received (attempt ${attempt}), tokens:`, response.usage?.output_tokens)
      break
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        console.error(`[Checker] Attempt ${attempt}/${MAX_RETRIES} failed (not retrying):`, lastError.message)
        throw error
      }

      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.warn(`[Checker] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  if (!response) {
    throw lastError || new Error('Failed to get response from AI')
  }

  return response
}

// ============================================================================
// Legacy Single-Pass Analysis (Fallback)
// ============================================================================

async function analyzeHomeworkLegacy(client: Anthropic, input: CheckerInput): Promise<CheckerOutput> {
  console.log('[Checker/Legacy] Running legacy single-pass analysis...')

  // Fetch images
  const taskImage = await fetchImageAsBase64(input.taskImageUrl!)
  const answerImage = input.answerImageUrl
    ? await fetchImageAsBase64(input.answerImageUrl)
    : null

  // Fetch reference images if provided
  let referenceImages: FetchedImage[] = []
  if (input.referenceImageUrls && input.referenceImageUrls.length > 0) {
    referenceImages = await Promise.all(
      input.referenceImageUrls.map(url => fetchImageAsBase64(url))
    )
  }

  // Fetch teacher review images if provided
  let teacherImages: FetchedImage[] = []
  if (input.teacherReviewUrls && input.teacherReviewUrls.length > 0) {
    teacherImages = await Promise.all(
      input.teacherReviewUrls.map(url => fetchImageAsBase64(url))
    )
  }

  // Build message content
  const content: Anthropic.MessageParam['content'] = []

  content.push({
    type: 'text',
    text: '## HOMEWORK TASK:\nAnalyze this homework assignment/task:',
  })

  if (input.taskDocumentText) {
    content.push({ type: 'text', text: `\n[Document Content]:\n${input.taskDocumentText}` })
  } else if (taskImage.mediaType === 'application/pdf') {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: taskImage.base64 },
    } as Anthropic.DocumentBlockParam)
  } else {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: taskImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: taskImage.base64,
      },
    })
  }

  if (input.answerDocumentText) {
    content.push({ type: 'text', text: '\n## STUDENT\'S ANSWER:\nHere is the student\'s submitted work:' })
    content.push({ type: 'text', text: `\n[Document Content]:\n${input.answerDocumentText}` })
  } else if (answerImage) {
    content.push({ type: 'text', text: '\n## STUDENT\'S ANSWER:\nHere is the student\'s submitted work:' })
    if (answerImage.mediaType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: answerImage.base64 },
      } as Anthropic.DocumentBlockParam)
    } else {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: answerImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: answerImage.base64,
        },
      })
    }
  } else {
    content.push({ type: 'text', text: '\n## NOTE: No student answer was provided. Please analyze the task/question and provide guidance on how to approach and solve it.' })
  }

  if (referenceImages.length > 0) {
    content.push({ type: 'text', text: '\n## REFERENCE MATERIALS:\nThe student provided these reference materials:' })
    for (const img of referenceImages) {
      if (img.mediaType === 'application/pdf') {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: img.base64 } } as Anthropic.DocumentBlockParam)
      } else {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: img.base64 } })
      }
    }
  }

  let teacherStyleContext = ''
  if (teacherImages.length > 0) {
    content.push({ type: 'text', text: '\n## PREVIOUS TEACHER REVIEWS:\nAnalyze these past graded assignments to understand the teacher\'s expectations and grading style:' })
    for (const img of teacherImages) {
      if (img.mediaType === 'application/pdf') {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: img.base64 } } as Anthropic.DocumentBlockParam)
      } else {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: img.base64 } })
      }
    }
    teacherStyleContext = `
IMPORTANT: Based on the previous teacher reviews provided, pay attention to:
- What the teacher typically focuses on when grading
- The teacher's tone and communication style
- Common feedback patterns and phrases the teacher uses
- The grading standards and expectations evident in past reviews
- Mirror the teacher's feedback style when generating your assessment
`
  }

  content.push({
    type: 'text',
    text: buildLegacyAnalysisPrompt(teacherStyleContext),
  })

  const response = await streamWithRetry(client, content)
  const result = parseCheckerResponse(response)
  return ensureGradeConsistency(result)
}

function buildLegacyAnalysisPrompt(teacherStyleContext: string): string {
  return `
${teacherStyleContext}

## YOUR TASK: ACCURATE HOMEWORK GRADING
Analyze the homework submission with EXTREME attention to accuracy. Follow these steps carefully:

### STEP 0: VISUAL PAGE READING (DO THIS FIRST!)
Before analyzing ANY content, you must properly READ the page:

**LANGUAGE DETECTION:**
- Scan for Hebrew letters (א-ת) → If found, this is Hebrew homework (RTL text)
- Hebrew labels to recognize: נתון/נתונים (Given), מצא/דרוש (Find), פתרון (Solution), תשובה (Answer), חישוב (Calculation)
- If only English letters → Standard LTR text

**SPATIAL READING RULES:**
1. **READ COMPLETE LINES**: Always read from LEFT edge to RIGHT edge of each line
2. **EQUATION COMPLETENESS**: Before judging ANY equation, find BOTH sides
3. **MULTI-LINE SOLUTIONS**: Read ALL lines as ONE solution before judging
4. **VARIABLE TRACKING**: Create a mental dictionary of defined variables
5. **HEBREW + MATH**: Hebrew text RTL, math expressions LTR

### CRITICAL ACCURACY RULES:
1. **VERIFY BEFORE JUDGING**: COMPUTE THE ANSWER YOURSELF before deciding if the student is correct
2. **DOUBLE-CHECK HANDWRITING**: Common confusions: 4↔9, 1↔7, 6↔0, 5↔S, 2↔Z
3. **ANSWER IS KING**: If the final answer matches, the problem is CORRECT
4. **STYLE ≠ ERRORS**: Presentation issues should NEVER reduce the grade
5. **ASSUME COMPETENCE**: When in doubt, favor the student
6. **NO FALSE NEGATIVES**: Better to miss an error than mark correct as wrong

### ANALYSIS STEPS:
**STEP 1**: Extract ALL problems/questions. List them.
**STEP 2**: For EACH problem: (a) question, (b) student answer, (c) YOUR calculation, (d) compare, (e/f) classify correct/incorrect
**STEP 3**: Count X/Y correct, calculate grade
**STEP 4**: Generate feedback JSON

### SEVERITY GUIDE:
- "moderate": Wrong answer but correct approach
- "major": Completely wrong, fundamental misunderstanding

Return analysis as JSON:
{
  "subject": "subject",
  "topic": "topic",
  "taskText": "task text",
  "answerText": "student answer summary",
  "feedback": {
    "gradeLevel": "excellent" | "good" | "needs_improvement" | "incomplete",
    "gradeEstimate": "X/100",
    "summary": "X/Y correct. Assessment.",
    "correctPoints": [{ "title": "...", "description": "...", "region": { "x": 0, "y": 0, "width": 0, "height": 0 } }],
    "improvementPoints": [{ "title": "...", "description": "...", "severity": "major", "region": { "x": 0, "y": 0, "width": 0, "height": 0 } }],
    "suggestions": ["..."],
    "teacherStyleNotes": null,
    "expectationComparison": null,
    "encouragement": "..."
  }
}
`
}

// ============================================================================
// Text-Based Analysis (No Vision API)
// ============================================================================

/**
 * Analyze homework from text input (cheaper - no Vision API)
 */
async function analyzeHomeworkText(client: Anthropic, input: CheckerInput): Promise<CheckerOutput> {
  const taskText = input.taskText || ''
  const answerText = input.answerText || ''

  // Build the prompt for text-based analysis
  const promptContent = `
## HOMEWORK TASK:
${taskText}

${answerText ? `## STUDENT'S ANSWER:\n${answerText}` : '## NOTE: No student answer was provided. Please analyze the task/question and provide guidance on how to approach and solve it.'}

## YOUR TASK: ACCURATE HOMEWORK GRADING
Analyze the homework submission with EXTREME attention to accuracy.

### CRITICAL ACCURACY RULES:
1. **VERIFY BEFORE JUDGING**: For ANY math/calculation problem, COMPUTE THE ANSWER YOURSELF before deciding if the student is correct.
2. **NEVER CONTRADICT YOURSELF**: Do NOT say "incorrect" and then change your mind. Verify FIRST, then state your conclusion ONCE.
3. **ANSWER IS KING**: If the student's final answer matches the correct answer, the problem is 100% CORRECT.
4. **STYLE ≠ ERRORS**: Feedback about work organization or presentation should NEVER reduce the grade.

### ANALYSIS STEPS:
**STEP 1**: Extract ALL problems/questions from the task. List them.

**STEP 2**: For EACH problem:
  a) What is the question asking?
  b) What answer did the student provide?
  c) COMPUTE the correct answer yourself (show your calculation)
  d) Does student's answer = correct answer?
  e) If CORRECT → goes in correctPoints
  f) If WRONG → goes in improvementPoints with appropriate severity

**STEP 3**: Count results
  - X problems correct out of Y total
  - Calculate: gradeEstimate = (X / Y) × 100

**STEP 4**: Generate feedback JSON

### SEVERITY GUIDE:
- "moderate": Wrong answer but showed correct approach
- "major": Completely wrong answer, fundamental misunderstanding

Return your analysis as JSON in this exact format:
{
  "subject": "The academic subject (e.g., Math, Science, History)",
  "topic": "The specific topic within the subject",
  "taskText": "The homework task/question",
  "answerText": "Summary of what the student answered",
  "feedback": {
    "gradeLevel": "excellent" | "good" | "needs_improvement" | "incomplete",
    "gradeEstimate": "A grade like 85/100 - MUST match your correctPoints/improvementPoints ratio!",
    "summary": "2-3 sentence overall assessment. State X/Y problems correct.",
    "correctPoints": [
      {
        "title": "Problem X - Correct",
        "description": "The student correctly solved [problem]. Their answer of [X] is correct because [reason]."
      }
    ],
    "improvementPoints": [
      {
        "title": "Problem X - Error",
        "description": "The correct answer is [X], but the student wrote [Y]. Here's how to solve it: [explanation]",
        "severity": "major"
      }
    ],
    "suggestions": [
      "Specific actionable suggestions for improvement"
    ],
    "teacherStyleNotes": null,
    "expectationComparison": null,
    "encouragement": "A positive, encouraging message for the student"
  }
}

### FINAL CHECK:
□ Did I verify each calculation myself?
□ Does my gradeEstimate match the ratio of correctPoints to total problems?
□ Are improvementPoints ONLY for wrong answers (not style issues)?
□ If all answers are correct, is my grade 95-100%?
`

  console.log('[CheckerEngine/TextMode] Sending text-based request to Claude...')

  // Use text-only API (cheaper than Vision)
  let response: Anthropic.Message | null = null
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = client.messages.stream({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: promptContent }],
      })

      for await (const event of stream) {
        void event
      }

      response = await stream.finalMessage()
      console.log('[CheckerEngine/TextMode] Response received, tokens used:', response.usage?.output_tokens)
      break
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check for specific error types
      const errorMessage = lastError.message.toLowerCase()
      if (errorMessage.includes('timeout') || lastError.name === 'AbortError') {
        throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_TXT_002, 'Analysis took too long. Please try again.', 'CheckerEngine/TextMode/Timeout'))
      }
      if (errorMessage.includes('overloaded') || errorMessage.includes('529')) {
        throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_API_002, 'Our AI is busy right now. Please try again in a moment.', 'CheckerEngine/TextMode/Overloaded'))
      }
      if (errorMessage.includes('rate') && errorMessage.includes('limit')) {
        throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_TXT_003, 'Rate limit exceeded. Please try again in a moment.', 'CheckerEngine/TextMode/RateLimit'))
      }

      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        console.error(`[CheckerEngine/TextMode] Attempt ${attempt}/${MAX_RETRIES} failed (not retrying):`, lastError.message)
        throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_TXT_001, lastError.message, `CheckerEngine/TextMode/Attempt:${attempt}`))
      }

      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.warn(`[CheckerEngine/TextMode] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  if (!response) {
    throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_TXT_001, lastError?.message || 'Failed to get response from AI', 'CheckerEngine/TextMode/NoResponse'))
  }

  // Parse response and apply consistency validation
  const result = parseCheckerResponse(response)

  // For text mode, we don't have annotations (no image to annotate)
  if (result.feedback.annotations) {
    result.feedback.annotations.hasAnnotations = false
    result.feedback.annotations.correctAnnotations = []
    result.feedback.annotations.errorAnnotations = []
  }

  return ensureGradeConsistency(result)
}

// ============================================================================
// Response Parsing
// ============================================================================

function parseCheckerResponse(response: Anthropic.Message): CheckerOutput {
  const textContent = response.content.find((b) => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return getDefaultOutput()
  }

  const text = textContent.text

  try {
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Parse points with annotations
      const annotatedCorrectPoints = parseAnnotatedCorrectPoints(
        parsed.feedback?.correctPoints || []
      )
      const annotatedImprovementPoints = parseAnnotatedImprovementPoints(
        parsed.feedback?.improvementPoints || []
      )

      // Build annotation data
      const annotations = buildAnnotationData(annotatedCorrectPoints, annotatedImprovementPoints)

      return {
        subject: String(parsed.subject || 'General'),
        topic: String(parsed.topic || 'Homework'),
        taskText: String(parsed.taskText || ''),
        answerText: String(parsed.answerText || ''),
        feedback: {
          gradeLevel: validateGradeLevel(parsed.feedback?.gradeLevel),
          gradeEstimate: String(parsed.feedback?.gradeEstimate || 'Not graded'),
          summary: String(parsed.feedback?.summary || 'Analysis complete.'),
          correctPoints: annotatedCorrectPoints,
          improvementPoints: annotatedImprovementPoints,
          suggestions: (parsed.feedback?.suggestions || []).map(String),
          teacherStyleNotes: parsed.feedback?.teacherStyleNotes || null,
          expectationComparison: parsed.feedback?.expectationComparison || null,
          encouragement: String(parsed.feedback?.encouragement || 'Keep up the good work!'),
          annotations,
        },
      }
    }
  } catch (error) {
    console.error('Failed to parse checker response:', error)
  }

  return getDefaultOutput()
}

function validateGradeLevel(level: unknown): GradeLevel {
  const valid: GradeLevel[] = ['excellent', 'good', 'needs_improvement', 'incomplete']
  if (typeof level === 'string' && valid.includes(level as GradeLevel)) {
    return level as GradeLevel
  }
  return 'needs_improvement'
}

/**
 * Clamp a value to valid percentage range (0-100)
 */
function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * Parse region coordinates from AI response
 */
function parseRegion(region: unknown): AnnotationRegion | undefined {
  if (!region || typeof region !== 'object') return undefined

  const r = region as Record<string, unknown>
  const x = Number(r.x)
  const y = Number(r.y)

  // Must have valid x and y
  if (isNaN(x) || isNaN(y)) return undefined

  return {
    x: clampPercent(x),
    y: clampPercent(y),
    width: r.width !== undefined ? clampPercent(Number(r.width)) : undefined,
    height: r.height !== undefined ? clampPercent(Number(r.height)) : undefined,
  }
}

/**
 * Parse correct points with region annotations
 */
function parseAnnotatedCorrectPoints(points: unknown[]): AnnotatedFeedbackPoint[] {
  if (!Array.isArray(points)) return []
  return points.map((p, index) => {
    const point = p as Record<string, unknown>
    return {
      title: String(point.title || 'Point'),
      description: String(point.description || ''),
      region: parseRegion(point.region),
      annotationId: `correct-${index}`,
    }
  })
}

/**
 * Parse improvement points with region annotations
 */
function parseAnnotatedImprovementPoints(points: unknown[]): AnnotatedFeedbackPoint[] {
  if (!Array.isArray(points)) return []
  return points.map((p, index) => {
    const point = p as Record<string, unknown>
    const severity = point.severity as string
    return {
      title: String(point.title || 'Improvement'),
      description: String(point.description || ''),
      severity: ['minor', 'moderate', 'major'].includes(severity)
        ? (severity as 'minor' | 'moderate' | 'major')
        : 'moderate',
      region: parseRegion(point.region),
      annotationId: `error-${index}`,
    }
  })
}

/**
 * Build annotation data from parsed points
 */
function buildAnnotationData(
  correctPoints: AnnotatedFeedbackPoint[],
  improvementPoints: AnnotatedFeedbackPoint[]
): AnnotationData {
  const correctAnnotations = correctPoints.filter((p) => p.region !== undefined)
  const errorAnnotations = improvementPoints.filter((p) => p.region !== undefined)

  return {
    correctAnnotations,
    errorAnnotations,
    hasAnnotations: correctAnnotations.length > 0 || errorAnnotations.length > 0,
  }
}

function getDefaultOutput(): CheckerOutput {
  return {
    subject: 'Unknown',
    topic: 'Homework',
    taskText: '',
    answerText: '',
    feedback: {
      gradeLevel: 'needs_improvement',
      gradeEstimate: 'Unable to grade',
      summary: 'We encountered an issue analyzing your homework. Please try again.',
      correctPoints: [],
      improvementPoints: [],
      suggestions: ['Try uploading clearer images of your work'],
      teacherStyleNotes: null,
      expectationComparison: null,
      encouragement: 'Keep trying! Every attempt is a step toward improvement.',
      annotations: {
        correctAnnotations: [],
        errorAnnotations: [],
        hasAnnotations: false,
      },
    },
  }
}

// ============================================================================
// Grade Level Helpers
// ============================================================================

export function getGradeLevelColor(level: GradeLevel): string {
  switch (level) {
    case 'excellent':
      return 'green'
    case 'good':
      return 'blue'
    case 'needs_improvement':
      return 'amber'
    case 'incomplete':
      return 'red'
    default:
      return 'gray'
  }
}

export function getGradeLevelLabel(level: GradeLevel): string {
  switch (level) {
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'needs_improvement':
      return 'Needs Improvement'
    case 'incomplete':
      return 'Incomplete'
    default:
      return 'Unknown'
  }
}

export function getGradeLevelEmoji(level: GradeLevel): string {
  switch (level) {
    case 'excellent':
      return '🌟'
    case 'good':
      return '👍'
    case 'needs_improvement':
      return '📝'
    case 'incomplete':
      return '⚠️'
    default:
      return '❓'
  }
}
