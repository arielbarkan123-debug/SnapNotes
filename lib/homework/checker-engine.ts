/**
 * Homework Checker Engine
 * AI-powered homework analysis and feedback generation
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

  // Add the analysis prompt
  content.push({
    type: 'text',
    text: `
${teacherStyleContext}

## YOUR TASK:
Analyze the homework submission and provide detailed feedback. You must:

1. First, extract and understand the homework task/question
2. Analyze the student's answer for correctness and completeness
3. Compare the answer against the task requirements
4. If reference materials are provided, use them to validate the answer
5. If previous teacher reviews are provided, match the teacher's grading style and expectations

Return your analysis as JSON in this exact format:
{
  "subject": "The academic subject (e.g., Math, Science, History)",
  "topic": "The specific topic within the subject",
  "taskText": "The extracted text of the homework task/question",
  "answerText": "Summary of what the student wrote/answered",
  "feedback": {
    "gradeLevel": "excellent" | "good" | "needs_improvement" | "incomplete",
    "gradeEstimate": "A grade like 85/100, B+, 4/5, etc.",
    "summary": "2-3 sentence overall assessment",
    "correctPoints": [
      {
        "title": "What was done well",
        "description": "Detailed explanation",
        "region": { "x": 25, "y": 30, "width": 20, "height": 15 }
      }
    ],
    "improvementPoints": [
      {
        "title": "What needs improvement",
        "description": "Detailed explanation with how to fix it",
        "severity": "minor" | "moderate" | "major",
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

IMPORTANT - VISUAL ANNOTATIONS (region field):
- The "region" field identifies WHERE on the STUDENT'S ANSWER IMAGE this feedback point applies
- Use percentage-based coordinates (0-100): x=0 is left edge, x=100 is right edge; y=0 is top, y=100 is bottom
- Width and height define a bounding box around the relevant area
- Provide a region for EVERY correctPoint and improvementPoint where you can identify the specific location
- Only omit the region field if the feedback applies to the entire answer or cannot be localized to a specific area
- Be as precise as possible - these coordinates will be used to show visual markers on the image

Be thorough but fair. Focus on being helpful and educational in your feedback.
`,
  })

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  })

  return parseCheckerResponse(response)
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
