import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CreateSessionRequest,
  HomeworkSession,
  QuestionAnalysis,
  ReferenceAnalysis,
} from '@/lib/homework/types'
import { analyzeQuestion, analyzeQuestionText } from '@/lib/homework/question-analyzer'
import { analyzeReferences } from '@/lib/homework/reference-analyzer'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:homework-sessions')

// ============================================================================
// Error Codes for Homework Sessions API
// ============================================================================

const API_ERROR_CODES = {
  // Validation errors
  API_SES_VAL_001: 'API_SES_VAL_001', // Question text required (text mode)
  API_SES_VAL_002: 'API_SES_VAL_002', // Question image required (image mode)

  // Analysis errors
  API_SES_AI_001: 'API_SES_AI_001', // Question analysis failed

  // Database errors
  API_SES_DB_001: 'API_SES_DB_001', // Failed to create session
} as const

/**
 * Format error message with code for debugging
 */
function formatApiError(code: string, message: string, details?: string): string {
  const detailSuffix = details ? ` (${details})` : ''
  return `[${code}] ${message}${detailSuffix}`
}

// Session creation: analyze question, create record, return empty conversation
// First AI message generated on-demand by session page via /chat endpoint
export const maxDuration = 60

// ============================================================================
// POST - Create a new homework help session with AI analysis
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request
    let body: CreateSessionRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.BODY_INVALID_JSON)
    }

    // Validate based on input mode
    const inputMode = body.inputMode || 'image'

    if (inputMode === 'text') {
      // Text mode: require questionText
      if (!body.questionText || body.questionText.trim().length < 10) {
        return createErrorResponse(ErrorCodes.FIELD_REQUIRED, formatApiError(API_ERROR_CODES.API_SES_VAL_001, 'Question text is required (minimum 10 characters)', 'API/HomeworkSessions/TextMode/Validation'))
      }
    } else {
      // Image mode: require questionImageUrl
      if (!body.questionImageUrl) {
        return createErrorResponse(ErrorCodes.FIELD_REQUIRED, formatApiError(API_ERROR_CODES.API_SES_VAL_002, 'Question image is required', 'API/HomeworkSessions/ImageMode/Validation'))
      }
    }

    // Step 1: Analyze question
    let questionAnalysis: QuestionAnalysis
    try {
      if (inputMode === 'text') {
        questionAnalysis = await analyzeQuestionText(body.questionText!)
      } else {
        questionAnalysis = await analyzeQuestion(body.questionImageUrl!)
      }
    } catch (error) {
      log.error({ err: error, inputMode }, 'Question analysis error')
      questionAnalysis = {
        questionText: inputMode === 'text' ? body.questionText! : 'Could not extract question text',
        subject: 'other',
        topic: 'Unknown',
        questionType: 'unknown',
        difficultyEstimate: 3,
        requiredConcepts: [],
        commonMistakes: [],
        solutionApproach: '',
        estimatedSteps: 5,
      }
    }

    // Step 2: Analyze reference materials if provided
    let referenceAnalysis: ReferenceAnalysis | undefined
    if (body.referenceImageUrls && body.referenceImageUrls.length > 0) {
      try {
        referenceAnalysis = await analyzeReferences(
          body.referenceImageUrls,
          questionAnalysis
        )
      } catch (error) {
        log.error({ err: error }, 'Reference analysis error')
      }
    }

    // Step 3: Create the session with analysis data
    const { data: session, error: insertError } = await supabase
      .from('homework_sessions')
      .insert({
        user_id: user.id,
        // For text mode, question_image_url is null and question_text comes from user input
        question_image_url: inputMode === 'image' ? body.questionImageUrl : null,
        question_text: questionAnalysis.questionText,
        question_type: questionAnalysis.questionType,
        detected_subject: questionAnalysis.subject,
        detected_topic: questionAnalysis.topic,
        detected_concepts: questionAnalysis.requiredConcepts,
        difficulty_estimate: questionAnalysis.difficultyEstimate,
        reference_image_urls: body.referenceImageUrls || [],
        reference_extracted_content: referenceAnalysis?.extractedContent || null,
        reference_relevant_sections: referenceAnalysis?.relevantSections || null,
        comfort_level: body.comfortLevel || 'some_idea',
        initial_attempt: body.initialAttempt || null,
        total_estimated_steps: questionAnalysis.estimatedSteps,
        status: 'active',
        conversation: [],
        hints_used: 0,
        hints_available: 4,
        current_step: 0,
        used_show_answer: false,
        solution_reached: false,
        enable_diagrams: body.enableDiagrams ?? true,
        diagram_mode: body.diagramMode || 'quick',
      })
      .select()
      .single()

    if (insertError) {
      log.error({ err: insertError, inputMode }, 'Insert error')
      // Return error with detailed code
      return NextResponse.json(
        { error: formatApiError(API_ERROR_CODES.API_SES_DB_001, 'Failed to create session', `API/HomeworkSessions/DB/Insert/${inputMode}Mode/Code:${insertError.code}`) },
        { status: 500 }
      )
    }

    const createdSession = session as HomeworkSession

    // Step 4: Return session with empty conversation
    // The first AI message will be generated on-demand by the session page
    // via the existing /chat endpoint (avoids 504 timeout on session creation)
    return NextResponse.json({
      session: createdSession,
      questionAnalysis,
      referenceAnalysis,
    })
  } catch (error) {
    log.error({ err: error }, 'Homework session error')
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}

// ============================================================================
// GET - Get user's homework help sessions
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // 'active', 'completed', 'abandoned'

    let query = supabase
      .from('homework_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: sessions, error } = await query

    if (error) {
      log.error({ err: error }, 'Fetch sessions error')
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch sessions')
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    log.error({ err: error }, 'Get sessions error')
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}
