/**
 * Homework Checker Engine
 * AI-powered homework analysis and feedback generation
 *
 * ACCURACY ARCHITECTURE:
 * - Two-phase analysis: analyze items separately, then calculate grade
 * - Grade calculation: computed from actual correct/incorrect items, NOT from Claude's estimate
 * - Consistency validation: ensures grade matches feedback items before returning
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  HomeworkFeedback,
  GradeLevel,
  AnnotatedFeedbackPoint,
  AnnotationRegion,
  AnnotationData,
} from './types'

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096

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
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export interface CheckerInput {
  taskImageUrl: string
  answerImageUrl: string
  referenceImageUrls?: string[]
  teacherReviewUrls?: string[]
}

export interface CheckerOutput {
  feedback: HomeworkFeedback
  subject: string
  topic: string
  taskText: string
  answerText: string
}

export async function analyzeHomework(input: CheckerInput): Promise<CheckerOutput> {
  const client = getAnthropicClient()

  // Build message content with images
  const content: Anthropic.MessageParam['content'] = []

  // Add task image
  content.push({
    type: 'text',
    text: '## HOMEWORK TASK:\nAnalyze this homework assignment/task:',
  })
  content.push({
    type: 'image',
    source: { type: 'url', url: input.taskImageUrl },
  })

  // Add answer image
  content.push({
    type: 'text',
    text: '\n## STUDENT\'S ANSWER:\nHere is the student\'s submitted work:',
  })
  content.push({
    type: 'image',
    source: { type: 'url', url: input.answerImageUrl },
  })

  // Add reference images if provided
  if (input.referenceImageUrls && input.referenceImageUrls.length > 0) {
    content.push({
      type: 'text',
      text: '\n## REFERENCE MATERIALS:\nThe student provided these reference materials:',
    })
    for (const url of input.referenceImageUrls) {
      content.push({
        type: 'image',
        source: { type: 'url', url },
      })
    }
  }

  // Add teacher review images if provided
  let teacherStyleContext = ''
  if (input.teacherReviewUrls && input.teacherReviewUrls.length > 0) {
    content.push({
      type: 'text',
      text: '\n## PREVIOUS TEACHER REVIEWS:\nAnalyze these past graded assignments to understand the teacher\'s expectations and grading style:',
    })
    for (const url of input.teacherReviewUrls) {
      content.push({
        type: 'image',
        source: { type: 'url', url },
      })
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

### CRITICAL ACCURACY RULES (READ CAREFULLY):
1. **VERIFY BEFORE JUDGING**: For ANY math/calculation problem, COMPUTE THE ANSWER YOURSELF before deciding if the student is correct
2. **NEVER CONTRADICT YOURSELF**: Do NOT say "incorrect" and then change your mind. Verify FIRST, then state your conclusion ONCE.
3. **ANSWER IS KING**: If the student's final answer matches the correct answer, mark it as CORRECT - even if the work shown has minor issues
4. **ONE PROBLEM AT A TIME**: Analyze each problem separately before making any overall judgment

### ANALYSIS STEPS:
**STEP 1**: Extract ALL problems/questions from the task image. List them.

**STEP 2**: For EACH problem:
  a) What is the question asking?
  b) What answer did the student provide?
  c) COMPUTE the correct answer yourself (show your calculation)
  d) Does student's answer = correct answer? YES or NO
  e) If YES → goes in correctPoints
  f) If NO → goes in improvementPoints with severity based on how wrong

**STEP 3**: Count results
  - X problems correct out of Y total
  - Calculate: gradeEstimate = (X / Y) × 100

**STEP 4**: Generate feedback JSON

### SEVERITY GUIDE FOR improvementPoints:
- "minor": Small mistakes that don't affect the answer (e.g., messy handwriting, skipped steps but correct answer)
- "moderate": Partial credit situations, wrong answer but right approach
- "major": Completely wrong answer, fundamental misunderstanding, missing problems

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
□ Did I verify each calculation myself before marking correct/incorrect?
□ Does my gradeEstimate match the ratio of correctPoints to total items?
□ Did I NOT say "incorrect" and then change my mind in the same response?
□ Are ALL problems accounted for (either in correctPoints or improvementPoints)?
`,
  })

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  })

  // Parse response and apply consistency validation
  const result = parseCheckerResponse(response)

  // Ensure grade matches feedback items (fixes discrepancy issues)
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
