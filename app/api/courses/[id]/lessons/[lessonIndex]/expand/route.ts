import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

// Allow 60 seconds for AI generation
export const maxDuration = 60

interface SubStep {
  title: string
  content: string
  hasExample: boolean
  quickCheck?: { question: string; answer: string }
}

interface ExpandResponse {
  subSteps: SubStep[]
  depth: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonIndex: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId, lessonIndex: lessonIndexStr } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(
      getIdentifier(user.id, request),
      RATE_LIMITS.generateCourse // Reuse course generation rate limit
    )
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(ErrorCodes.RATE_LIMITED)
      const headers = getRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Parse body
    let body: { stepIndex: number; currentDepth?: number }
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid request body')
    }
    const { stepIndex, currentDepth = 0 } = body

    // Validate stepIndex and currentDepth
    if (typeof stepIndex !== 'number' || !Number.isInteger(stepIndex) || stepIndex < 0) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid step index')
    }
    if (typeof currentDepth !== 'number' || !Number.isInteger(currentDepth) || currentDepth < 0) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid depth')
    }

    // Validate depth limit
    if (currentDepth >= 2) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum depth reached (2 levels)')
    }

    const lessonIndex = parseInt(lessonIndexStr, 10)
    if (isNaN(lessonIndex) || lessonIndex < 0) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid lesson index')
    }

    // Fetch course
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, user_id, generated_course, title')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    const generatedCourse = course.generated_course as { title?: string; subject?: string; gradeLevel?: string; lessons?: Array<{ title?: string; steps?: Array<{ type?: string; content?: string; expandedContent?: SubStep[][] }> }> } | null
    const lessons = generatedCourse?.lessons || []
    const lesson = lessons[lessonIndex]
    if (!lesson) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Lesson not found')
    }

    const steps = lesson.steps || []
    const step = steps[stepIndex]
    if (!step) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Step not found')
    }

    // Check cache: if expandedContent already exists for this depth, return it
    const cachedExpansions = step.expandedContent || []
    if (cachedExpansions[currentDepth]) {
      return NextResponse.json({
        subSteps: cachedExpansions[currentDepth],
        depth: currentDepth + 1,
      } satisfies ExpandResponse)
    }

    // Generate sub-steps via Claude
    const anthropic = new Anthropic()
    const subject = generatedCourse?.subject || course.title || 'General'
    const gradeLevel = generatedCourse?.gradeLevel || 'Not specified'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `The student wants deeper explanation of this lesson step.

Step content: ${step.content}
Subject: ${subject}
Grade level: ${gradeLevel}
Current depth: ${currentDepth} (0 = first expansion, 1 = second expansion)

Generate 2-3 sub-steps that:
1. Explain the underlying reasoning
2. Include ONE worked example
3. Optionally include a quick-check question (one per expansion max)

If the step is already thorough, offer a related extension instead.
Cap each sub-step at 200 words max.

Return ONLY valid JSON, no markdown fences:
{ "subSteps": [{ "title": "string", "content": "string", "hasExample": boolean, "quickCheck": { "question": "string", "answer": "string" } | null }] }`
      }],
    })

    // Parse response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    let parsed: { subSteps: SubStep[] }
    try {
      // Strip potential markdown code fences
      const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      logError('Expand:parse', new Error(`Failed to parse AI response: ${responseText.slice(0, 200)}`))
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to parse AI response')
    }

    if (!parsed.subSteps || !Array.isArray(parsed.subSteps) || parsed.subSteps.length === 0) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'AI returned invalid sub-steps')
    }

    // Cache the expansion in the course JSONB (fire and forget)
    try {
      const updatedSteps = [...steps]
      const updatedStep = { ...updatedSteps[stepIndex] }
      const updatedExpanded = [...(updatedStep.expandedContent || [])]
      updatedExpanded[currentDepth] = parsed.subSteps
      updatedStep.expandedContent = updatedExpanded
      updatedSteps[stepIndex] = updatedStep

      const updatedLessons = [...lessons]
      updatedLessons[lessonIndex] = { ...lesson, steps: updatedSteps }
      const updatedCourse = { ...generatedCourse, lessons: updatedLessons }

      await supabase
        .from('courses')
        .update({ generated_course: updatedCourse })
        .eq('id', courseId)
    } catch (cacheErr) {
      // Non-critical: cache save failed, sub-steps still returned to client
      logError('Expand:cache', cacheErr)
    }

    return NextResponse.json({
      subSteps: parsed.subSteps,
      depth: currentDepth + 1,
    } satisfies ExpandResponse)
  } catch (error) {
    logError('Expand:generate', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate deeper explanation')
  }
}
