import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

interface WorkedExampleStep {
  text: string
  math?: string // LaTeX string for KaTeX rendering
}

interface WorkedExampleResponse {
  steps: WorkedExampleStep[]
  tryAnother: { question: string; correctAnswer: string }
  errorDiagnosis: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonIndex: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId, lessonIndex: lessonIndexStr } = await params
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(
      getIdentifier(user.id, request),
      RATE_LIMITS.generateCourse
    )
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(ErrorCodes.RATE_LIMITED)
      const headers = getRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Parse body - wrap in try/catch for malformed JSON
    let body: { question: string; studentAnswer: string; correctAnswer: string; attemptNumber?: number }
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid request body')
    }
    const { question, studentAnswer, correctAnswer, attemptNumber = 1 } = body

    if (!question || !studentAnswer || !correctAnswer) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: question, studentAnswer, correctAnswer')
    }

    if (typeof attemptNumber !== 'number' || !Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 2) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum 2 worked examples per problem')
    }

    const lessonIndex = parseInt(lessonIndexStr, 10)

    // Get course for subject/grade context
    const { data: course } = await supabase
      .from('courses')
      .select('title, generated_course')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle()

    const generatedCourse = course?.generated_course as { subject?: string; gradeLevel?: string } | null
    const subject = generatedCourse?.subject || course?.title || 'General'
    const gradeLevel = generatedCourse?.gradeLevel || 'Not specified'

    const anthropic = new Anthropic()

    const angleInstruction = attemptNumber === 2
      ? '\nThis is the SECOND attempt. Use a COMPLETELY DIFFERENT approach or analogy than the first worked example. Start from a different angle.'
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `The student attempted this problem and got it wrong.

Problem: ${question.slice(0, 2000)}
Student's answer: ${studentAnswer.slice(0, 500)}
Correct answer: ${correctAnswer.slice(0, 500)}
Subject: ${subject}, Grade: ${gradeLevel}
Lesson index: ${lessonIndex}
${angleInstruction}

Generate a worked example that:
1. STARTS by acknowledging what the student wrote (use their exact numbers/text)
2. Identifies the specific mistake
3. Walks through correct solution using SAME numbers
4. Ends with verification step (plug answer back in)
5. Provides ONE similar problem for student to try

Use LaTeX notation (wrapped in $ delimiters) for any math expressions.

Return ONLY valid JSON, no markdown fences:
{
  "steps": [{ "text": "string", "math": "string or null" }],
  "tryAnother": { "question": "string", "correctAnswer": "string" },
  "errorDiagnosis": "string (one sentence describing the student's mistake pattern)"
}`
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    let parsed: WorkedExampleResponse
    try {
      const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      logError('WorkedExample:parse', new Error(`Failed to parse: ${responseText.slice(0, 200)}`))
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to parse AI response')
    }

    if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'AI returned invalid worked example')
    }

    return NextResponse.json(parsed)
  } catch (error) {
    logError('WorkedExample:generate', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate worked example')
  }
}
