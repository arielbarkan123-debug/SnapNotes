import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CreateSessionRequest,
  ConversationMessage,
  HomeworkSession,
  QuestionAnalysis,
  ReferenceAnalysis,
} from '@/lib/homework/types'
import { analyzeQuestion, analyzeQuestionText } from '@/lib/homework/question-analyzer'
import { analyzeReferences } from '@/lib/homework/reference-analyzer'
import { generateInitialGreeting } from '@/lib/homework/tutor-engine'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

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

// Allow 90 seconds for session creation (includes AI analysis)
export const maxDuration = 90

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

    // Step 1: Analyze the question (image or text)
    let questionAnalysis: QuestionAnalysis
    try {
      if (inputMode === 'text') {
        // Text mode: analyze the text directly
        questionAnalysis = await analyzeQuestionText(body.questionText!)
      } else {
        // Image mode: use vision to analyze the image
        questionAnalysis = await analyzeQuestion(body.questionImageUrl!)
      }
    } catch (error) {
      console.error(`[API/HomeworkSessions/Analysis] Question analysis error (${inputMode} mode):`, error)
      // Fall back to minimal analysis if analysis fails
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
        console.error('Reference analysis error:', error)
        // Continue without reference analysis
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
      })
      .select()
      .single()

    if (insertError) {
      console.error(`[API/HomeworkSessions/DB] Insert error (${inputMode} mode):`, insertError)
      // Return error with detailed code
      return NextResponse.json(
        { error: formatApiError(API_ERROR_CODES.API_SES_DB_001, 'Failed to create session', `API/HomeworkSessions/DB/Insert/${inputMode}Mode/Code:${insertError.code}`) },
        { status: 500 }
      )
    }

    const createdSession = session as HomeworkSession

    // Step 4: Generate warm initial greeting from tutor
    let greetingMessage: ConversationMessage
    try {
      const greeting = await generateInitialGreeting({
        session: createdSession,
        questionAnalysis,
        referenceAnalysis,
        recentMessages: [],
        hintsUsed: 0,
        currentProgress: 0,
      })

      greetingMessage = {
        role: 'tutor',
        content: greeting.message,
        timestamp: new Date().toISOString(),
        pedagogicalIntent: 'probe_understanding',
      }
    } catch (error) {
      console.error('Greeting generation error:', error)
      // Fall back to a default greeting
      greetingMessage = {
        role: 'tutor',
        content: getDefaultGreeting(questionAnalysis, body.comfortLevel),
        timestamp: new Date().toISOString(),
        pedagogicalIntent: 'probe_understanding',
      }
    }

    // Step 5: Add greeting to conversation
    const { data: updatedSession, error: updateError } = await supabase
      .from('homework_sessions')
      .update({
        conversation: [greetingMessage],
      })
      .eq('id', createdSession.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      // Return session without greeting in conversation
      return NextResponse.json({
        session: { ...createdSession, conversation: [greetingMessage] },
        questionAnalysis,
        referenceAnalysis,
      })
    }

    return NextResponse.json({
      session: updatedSession,
      questionAnalysis,
      referenceAnalysis,
    })
  } catch (error) {
    console.error('Homework session error:', error)
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}

/**
 * Generate a default greeting if AI fails
 */
function getDefaultGreeting(
  questionAnalysis: QuestionAnalysis,
  comfortLevel?: string
): string {
  const subject = questionAnalysis.subject || 'this problem'
  const topic = questionAnalysis.topic || 'the topic'

  if (comfortLevel === 'new') {
    return `Welcome! I see you're working on a ${subject} problem about ${topic}. Don't worry if this feels new - that's totally normal! Let's start with the basics. What's the first thing you notice about this problem?`
  } else if (comfortLevel === 'just_stuck') {
    return `I see you're working on a ${subject} problem about ${topic}. It sounds like you've got some good thinking going - you're just stuck on something specific. What part is tripping you up?`
  }

  return `Great question you have here about ${topic}! This looks like an interesting ${subject} problem. Let me help you work through it. What's your first instinct about how to approach this?`
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
      console.error('Fetch error:', error)
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch sessions')
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Get sessions error:', error)
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}
