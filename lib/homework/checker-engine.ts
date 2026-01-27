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
} from './types'

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

const AI_MODEL = 'claude-sonnet-4-5-20250929'
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
    // IMAGE MODE: Fetch images and analyze with vision
    // ============================================================================
    // Validate that taskImageUrl exists for image mode
    if (!input.taskImageUrl) {
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_004, 'Task image URL is required for image mode', 'CheckerEngine/ImageMode/Validation'))
    }

    // Fetch images and convert to base64
    // Note: The API route uses streaming with heartbeats to keep mobile connections alive
    // while this fetch is happening
    console.log('[Checker] Fetching images for analysis...')

    // Fetch task image (required) and answer image (optional)
    const taskImage = await fetchImageAsBase64(input.taskImageUrl)
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

    console.log('[Checker] All images fetched, building prompt...')

    // Build message content with base64 images
    const content: Anthropic.MessageParam['content'] = []

    // Add task content (DOCX text, PDF document, or image)
    content.push({
      type: 'text',
      text: '## HOMEWORK TASK:\nAnalyze this homework assignment/task:',
    })

    // Check if we have extracted DOCX text (DOCX not supported by Claude Vision)
    if (input.taskDocumentText) {
      content.push({
        type: 'text',
        text: `\n[Document Content]:\n${input.taskDocumentText}`,
      })
    } else if (taskImage.mediaType === 'application/pdf') {
      // Use document block for PDFs (Claude Vision API supports this)
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: taskImage.base64,
        },
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

    // Add answer content (if provided)
    if (input.answerDocumentText) {
      // DOCX text was extracted
      content.push({
        type: 'text',
        text: '\n## STUDENT\'S ANSWER:\nHere is the student\'s submitted work:',
      })
      content.push({
        type: 'text',
        text: `\n[Document Content]:\n${input.answerDocumentText}`,
      })
    } else if (answerImage) {
      content.push({
        type: 'text',
        text: '\n## STUDENT\'S ANSWER:\nHere is the student\'s submitted work:',
      })
      if (answerImage.mediaType === 'application/pdf') {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: answerImage.base64,
          },
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
      content.push({
        type: 'text',
        text: '\n## NOTE: No student answer was provided. Please analyze the task/question and provide guidance on how to approach and solve it.',
      })
    }

    // Add reference images if provided
    if (referenceImages.length > 0) {
      content.push({
        type: 'text',
        text: '\n## REFERENCE MATERIALS:\nThe student provided these reference materials:',
      })
      for (const img of referenceImages) {
        if (img.mediaType === 'application/pdf') {
          content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: img.base64,
            },
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

    // Add teacher review images if provided
    let teacherStyleContext = ''
    if (teacherImages.length > 0) {
      content.push({
        type: 'text',
        text: '\n## PREVIOUS TEACHER REVIEWS:\nAnalyze these past graded assignments to understand the teacher\'s expectations and grading style:',
      })
      for (const img of teacherImages) {
        if (img.mediaType === 'application/pdf') {
          content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: img.base64,
            },
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
      teacherStyleContext = `
IMPORTANT: Based on the previous teacher reviews provided, pay attention to:
- What the teacher typically focuses on when grading
- The teacher's tone and communication style
- Common feedback patterns and phrases the teacher uses
- The grading standards and expectations evident in past reviews
- Mirror the teacher's feedback style when generating your assessment
`
    }

    // Add the analysis prompt with accuracy-focused instructions
    content.push({
      type: 'text',
      text: `
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
   - If you see "= 15", STOP and look LEFT to find what equals 15
   - If you see "5 + x", STOP and look RIGHT to find what it equals
   - NEVER evaluate a partial/fragment expression

2. **EQUATION COMPLETENESS**: Before judging ANY equation:
   - Find the LEFT side (before =)
   - Find the RIGHT side (after =)
   - Find ALL terms on each side
   - Only THEN evaluate correctness

3. **MULTI-LINE SOLUTIONS**: Physics/math work often spans multiple lines:
   - Line 1: Formula or setup (e.g., F = ma)
   - Line 2: Substitution (e.g., F = 10 × 5)
   - Line 3: Answer (e.g., F = 50N)
   - READ ALL LINES as ONE solution before judging

4. **VARIABLE TRACKING**: Create a mental dictionary:
   - When you see "m = 10kg", record: m → 10kg
   - When you see "F = 50N", record: F → 50N
   - When variables appear later, CONNECT them to definitions

5. **HEBREW + MATH (Mixed Content)**:
   - Hebrew TEXT reads RIGHT-TO-LEFT
   - BUT mathematical equations ALWAYS read LEFT-TO-RIGHT
   - Example: "כוח: F = 50N" → Hebrew label "כוח" (force) + LTR math "F = 50N"
   - The label is RTL, the equation is LTR - both are correct together

**FRAGMENT DETECTION - CRITICAL:**
If you're about to judge something that looks incomplete, STOP:
- "= 50" alone → INCOMPLETE, find what equals 50
- "× 5 × 10" alone → INCOMPLETE, find the full expression
- "F =" alone → INCOMPLETE, find the value
- Single number "42" → What is this answering?

NEVER mark something wrong based on a fragment. Find the COMPLETE expression first.

### CRITICAL ACCURACY RULES (READ CAREFULLY):
1. **VERIFY BEFORE JUDGING**: For ANY math/calculation problem, COMPUTE THE ANSWER YOURSELF before deciding if the student is correct. Show your calculation explicitly.
2. **DOUBLE-CHECK HANDWRITING**: Handwritten math is hard to read. If an answer LOOKS wrong, re-read it carefully - you may have misread a digit or symbol. Common confusions: 4↔9, 1↔7, 6↔0, 5↔S, 2↔Z, y²↔y⁴, +↔×, ÷↔+, -↔=
3. **NEVER CONTRADICT YOURSELF**: Do NOT say "incorrect" and then change my mind. Verify FIRST, then state your conclusion ONCE.
4. **ANSWER IS KING**: If the student's final answer matches the correct answer, the problem is 100% CORRECT. Do NOT penalize for messy work, unclear steps, or presentation style when the answer is right.
5. **STYLE ≠ ERRORS**: Feedback about work organization, notation clarity, or presentation should NEVER reduce the grade. Only actual WRONG ANSWERS reduce the grade.
6. **ONE PROBLEM AT A TIME**: Analyze each problem separately before making any overall judgment
7. **ASSUME COMPETENCE**: When in doubt, interpret ambiguous handwriting in the way that makes the answer correct. Students usually get problems right.
8. **NO FALSE NEGATIVES**: It's worse to mark a correct answer as wrong than to miss an error. If uncertain, favor the student.

### MATH VERIFICATION EXAMPLES:
**Example 1 - Simple Arithmetic:**
- Question: 24 + 38 = ?
- Student wrote: 62
- MY CALCULATION: 24 + 38 = 62 ✓
- Result: CORRECT (student answer matches my calculation)

**Example 2 - Misread Handwriting:**
- Question: 7 × 8 = ?
- Student wrote: what looks like "54" but could be "56"
- MY CALCULATION: 7 × 8 = 56
- Result: Check if "54" might actually be "56" (4 and 6 look similar in handwriting). Give benefit of doubt → CORRECT

**Example 3 - Algebra:**
- Question: Solve 2x + 5 = 13
- Student wrote: x = 4
- MY CALCULATION: 2x = 13 - 5 = 8, x = 8/2 = 4 ✓
- Result: CORRECT

**Example 4 - Multi-step with error:**
- Question: Find the area of a rectangle 5cm × 8cm
- Student wrote: 5 + 8 = 13 cm²
- MY CALCULATION: Area = length × width = 5 × 8 = 40 cm²
- Result: INCORRECT (student added instead of multiplied, fundamental error, severity: major)

**Example 5 - Physics Multi-Line Solution (CORRECT READING):**
- Question: Find friction force. Given: m=5kg, μ=0.3, g=10m/s²
- Student wrote across 3 lines:
  Line 1: Ff = μ × N = μ × mg
  Line 2: Ff = 0.3 × 5 × 10
  Line 3: Ff = 15N
- MY READING: This is ONE complete solution spanning 3 lines
- MY CALCULATION: Ff = μmg = 0.3 × 5 × 10 = 15N ✓
- Result: CORRECT (all three lines form one complete, correct solution)
- WRONG approach: Looking at "× 5 × 10" alone and thinking it's incomplete

**Example 6 - Hebrew Physics Problem:**
- Student wrote:
  נתון: m=10kg, a=5m/s²
  פתרון: F = ma = 10 × 5 = 50N
  תשובה: 50 ניוטון
- MY READING:
  - "נתון" (Given) section defines variables
  - "פתרון" (Solution) shows complete calculation
  - "תשובה" (Answer) confirms 50 Newton
- MY CALCULATION: F = 10 × 5 = 50N ✓
- Result: CORRECT (Hebrew labels + LTR math, all correct)

### ANALYSIS STEPS:
**STEP 1**: Extract ALL problems/questions from the task image. List them.

**STEP 2**: For EACH problem:
  a) What is the question asking?
  b) What answer did the student provide? (Read handwriting VERY carefully - if unclear, consider multiple interpretations)
  c) COMPUTE the correct answer yourself (show your calculation)
  d) Does student's answer = correct answer?
     - If handwriting is ambiguous, assume the interpretation that makes it correct
     - Only mark wrong if you're CERTAIN the answer is wrong after re-checking
  e) If CORRECT → goes in correctPoints (full marks for this problem)
  f) If WRONG → goes in improvementPoints with "major" severity

**STEP 3**: Count results
  - X problems correct out of Y total
  - Calculate: gradeEstimate = (X / Y) × 100

**STEP 4**: Generate feedback JSON

### SEVERITY GUIDE FOR improvementPoints:
- **ONLY include problems with WRONG ANSWERS in improvementPoints**
- "moderate": Wrong answer but showed correct approach/method
- "major": Completely wrong answer, fundamental misunderstanding, missing problems

**DO NOT include in improvementPoints:**
- Style feedback (messy work, unclear notation) when answer is correct
- Presentation issues when answer is correct
- "Could be clearer" type feedback when answer is correct
These can go in "suggestions" instead, but should NOT affect the grade.

Return your analysis as JSON in this exact format:
{
  "subject": "The academic subject (e.g., Math, Science, History)",
  "topic": "The specific topic within the subject",
  "taskText": "The extracted text of the homework task/question",
  "answerText": "Summary of what the student wrote/answered",
  "feedback": {
    "gradeLevel": "excellent" | "good" | "needs_improvement" | "incomplete",
    "gradeEstimate": "A grade like 85/100 - MUST match your correctPoints/improvementPoints ratio!",
    "summary": "2-3 sentence overall assessment. State X/Y problems correct.",
    "correctPoints": [
      {
        "title": "Problem X - Correct",
        "description": "The student correctly solved [problem]. Their answer of [X] is correct because [reason].",
        "region": { "x": 25, "y": 30, "width": 20, "height": 15 }
      }
    ],
    "improvementPoints": [
      {
        "title": "Problem X - Calculation Error",
        "description": "The correct answer is [X], but the student wrote [Y]. Here's how to solve it: [explanation]",
        "severity": "major",
        "region": { "x": 60, "y": 45, "width": 25, "height": 20 }
      }
    ],
    "suggestions": [
      "Specific actionable suggestions for improvement"
    ],
    "teacherStyleNotes": "If teacher reviews were provided, notes on how this matches/differs from teacher expectations. Null if no reviews provided.",
    "expectationComparison": "If teacher reviews were provided, how this work compares to what the teacher typically expects. Null if no reviews provided.",
    "encouragement": "A positive, encouraging message for the student"
  }
}

### IMPORTANT - VISUAL ANNOTATIONS (region field):
- The "region" field identifies WHERE on the STUDENT'S ANSWER IMAGE this feedback point applies
- Use percentage-based coordinates (0-100): x=0 is left edge, x=100 is right edge; y=0 is top, y=100 is bottom
- Width and height define a bounding box around the relevant area
- Provide a region for EVERY correctPoint and improvementPoint where you can identify the specific location

### FINAL CHECK BEFORE RESPONDING:
□ Did I read each line COMPLETELY from edge to edge (not fragments)?
□ Did I detect Hebrew content and read labels RTL but math LTR?
□ Did I track variable definitions across the page?
□ Did I read multi-line solutions as ONE complete calculation?
□ Did I verify each calculation myself before marking correct/incorrect?
□ Did I double-check handwriting for any answer I'm marking as wrong?
□ Does my gradeEstimate match the ratio of correctPoints to total problems?
□ Are improvementPoints ONLY for wrong answers (not style issues)?
□ Did I NOT say "incorrect" and then change my mind in the same response?
□ Are ALL problems accounted for (either in correctPoints or improvementPoints)?
□ If all answers are correct, is my grade 95-100%?
□ Am I NOT marking something wrong based on a fragment I misread?
`,
    })

    console.log('[Checker] Sending request to Claude (streaming with retry)...')

    // Use streaming with retry to handle transient Safari/network issues
    let response: Anthropic.Message | null = null
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Use streaming to prevent connection timeouts on mobile
        // The stream keeps data flowing, preventing TCP/browser timeouts
        const stream = client.messages.stream({
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: 'user', content }],
        })

        // Consume the stream to keep data flowing (prevents connection timeouts)
        // We don't need to collect the text since finalMessage() gives us everything
        for await (const event of stream) {
          // Just iterate to consume the stream - this keeps the connection alive
          void event
        }

        // Get the final message for metadata
        response = await stream.finalMessage()
        console.log('[Checker] Response received, tokens used:', response.usage?.output_tokens)
        break // Success - exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if we should retry
        if (!isRetryableError(error) || attempt === MAX_RETRIES) {
          console.error(`[Checker] Attempt ${attempt}/${MAX_RETRIES} failed (not retrying):`, lastError.message)
          throw error
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        console.warn(`[Checker] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to get response from AI')
    }

    // Parse response and apply consistency validation
    const result = parseCheckerResponse(response)

    // Ensure grade matches feedback items (fixes discrepancy issues)
    return ensureGradeConsistency(result)
  } catch (error) {
    // Detailed error logging for debugging mobile vs desktop issues
    console.error('[Homework Checker] analyzeHomework error:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined,
    })

    // Check for timeout errors and provide specific messages
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
    const errorName = error instanceof Error ? error.name : ''

    if (errorMessage.includes('timeout') || errorName === 'AbortError' || errorMessage.includes('timed out')) {
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_003, 'Analysis took too long. Please try again with clearer images.', 'CheckerEngine/ImageMode/Timeout'))
    }

    if (errorMessage.includes('overloaded') || errorMessage.includes('529')) {
      throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_API_002, 'Our AI is busy right now. Please try again in a moment.', 'CheckerEngine/API/Overloaded'))
    }

    // Re-throw the original error for the route to handle
    // If it already has a code, keep it; otherwise wrap it
    if (error instanceof Error && error.message.startsWith('[')) {
      throw error
    }
    throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_002, error instanceof Error ? error.message : 'Analysis failed', 'CheckerEngine/ImageMode/Unknown'))
  }
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
