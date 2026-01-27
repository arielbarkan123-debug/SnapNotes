import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ConversationMessage,
  HomeworkSession,
  HintLevel,
  HintContext,
  HintResponse,
  QuestionAnalysis,
  ReferenceAnalysis,
} from '@/lib/homework/types'
import {
  generateHint,
  shouldEncourageAttempt,
  getHintLevelInfo,
} from '@/lib/homework/hint-generator'
import { ensureDiagramInResponse } from '@/lib/homework/diagram-generator'
import { addMessage, updateProgress } from '@/lib/homework/session-manager'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

// Allow 60 seconds for hint generation
export const maxDuration = 60

// ============================================================================
// POST - Request a hint at a specific level
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request
    let body: { hintLevel: HintLevel }
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.BODY_INVALID_JSON)
    }

    const hintLevel = body.hintLevel
    if (!hintLevel || hintLevel < 1 || hintLevel > 5) {
      return createErrorResponse(ErrorCodes.FIELD_INVALID_FORMAT, 'Hint level must be 1-5')
    }

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('homework_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return createErrorResponse(ErrorCodes.HW_SESSION_NOT_FOUND)
    }

    const homeworkSession = session as HomeworkSession

    // Step 1: Check if we should encourage them to try independently first
    const timeSinceLastHint = getTimeSinceLastHint(homeworkSession)
    const encourageCheck = shouldEncourageAttempt(
      homeworkSession.hints_used || 0,
      timeSinceLastHint
    )

    // Step 2: Build hint context
    const questionAnalysis = buildQuestionAnalysis(homeworkSession)
    const referenceAnalysis = buildReferenceAnalysis(homeworkSession)
    const previousHints = extractPreviousHints(homeworkSession.conversation || [])

    const hintContext: HintContext = {
      session: homeworkSession,
      questionAnalysis,
      referenceAnalysis,
      requestedLevel: hintLevel,
      previousHints,
    }

    // Step 3: Generate the hint
    let hint: HintResponse
    try {
      hint = await generateHint(hintContext)
    } catch (error) {
      console.error('Hint generation error:', error)
      // Fallback hint
      hint = {
        hintLevel,
        content: getDefaultHintMessage(hintLevel),
        isShowAnswer: hintLevel === 5,
      }
    }

    // Step 4: Generate diagram for this hint (if appropriate)
    // Get existing diagram from conversation to continue building on it
    const existingDiagram = (homeworkSession.conversation || [])
      .filter((msg): msg is ConversationMessage & { diagram: NonNullable<ConversationMessage['diagram']> } =>
        msg.role === 'tutor' && !!msg.diagram
      )
      .pop()?.diagram

    // Generate or continue diagram based on question analysis
    const diagram = ensureDiagramInResponse(questionAnalysis, existingDiagram)

    // Step 5: Add hint to conversation
    const hintMessage: ConversationMessage = {
      role: 'tutor',
      content: hint.content,
      timestamp: new Date().toISOString(),
      hintLevel: hint.hintLevel,
      pedagogicalIntent: hint.isShowAnswer ? 'show_answer' : 'give_hint',
      referencedConcept: hint.relatedConcept,
      diagram,
    }

    let updatedSession: HomeworkSession
    try {
      updatedSession = await addMessage(sessionId, user.id, hintMessage)
    } catch {
      // Fallback
      const updatedConversation = [
        ...(homeworkSession.conversation || []),
        hintMessage,
      ]
      const { data: updated, error: updateError } = await supabase
        .from('homework_sessions')
        .update({
          conversation: updatedConversation,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to save hint')
      }
      updatedSession = updated as HomeworkSession
    }

    // Step 6: Update hint counters
    const newHintsUsed = (homeworkSession.hints_used || 0) + 1
    const usedShowAnswer = hint.isShowAnswer || homeworkSession.used_show_answer

    try {
      await updateProgress(sessionId, user.id, {
        hintsUsed: newHintsUsed,
        usedShowAnswer,
      })
    } catch {
      // Also update directly as fallback
      await supabase
        .from('homework_sessions')
        .update({
          hints_used: newHintsUsed,
          used_show_answer: usedShowAnswer,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
    }

    // Refresh session to get updated state
    const { data: finalSession } = await supabase
      .from('homework_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    return NextResponse.json({
      hint,
      hintInfo: getHintLevelInfo(hint.hintLevel),
      session: finalSession || updatedSession,
      encouragement: encourageCheck.shouldEncourage ? encourageCheck.message : null,
      hintsUsed: newHintsUsed,
      hintsRemaining: Math.max(0, 4 - newHintsUsed),
    })
  } catch (error) {
    console.error('Hint error:', error)
    return createErrorResponse(ErrorCodes.HINT_GENERATION_FAILED)
  }
}

// ============================================================================
// GET - Get hint level information
// ============================================================================

export async function GET() {
  const levels = [1, 2, 3, 4, 5].map((level) => ({
    level,
    ...getHintLevelInfo(level as HintLevel),
  }))

  return NextResponse.json({ levels })
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildQuestionAnalysis(session: HomeworkSession): QuestionAnalysis {
  return {
    questionText: session.question_text || 'Unknown question',
    subject: session.detected_subject || 'other',
    topic: session.detected_topic || 'Unknown',
    questionType: session.question_type || 'unknown',
    difficultyEstimate: session.difficulty_estimate || 3,
    requiredConcepts: session.detected_concepts || [],
    commonMistakes: [],
    solutionApproach: '',
    estimatedSteps: session.total_estimated_steps || 5,
  }
}

function buildReferenceAnalysis(
  session: HomeworkSession
): ReferenceAnalysis | undefined {
  if (!session.reference_extracted_content) {
    return undefined
  }

  return {
    extractedContent: session.reference_extracted_content,
    relevantSections: session.reference_relevant_sections || [],
    keyFormulas: [],
    keyDefinitions: [],
    helpfulExamples: [],
  }
}

function extractPreviousHints(conversation: ConversationMessage[]): HintResponse[] {
  return conversation
    .filter((msg) => msg.hintLevel !== undefined)
    .map((msg) => ({
      hintLevel: msg.hintLevel as HintLevel,
      content: msg.content,
      isShowAnswer: msg.hintLevel === 5,
      relatedConcept: msg.referencedConcept,
    }))
}

function getTimeSinceLastHint(session: HomeworkSession): number {
  const conversation = session.conversation || []

  // Find the last hint message
  for (let i = conversation.length - 1; i >= 0; i--) {
    if (conversation[i].hintLevel !== undefined) {
      const hintTime = new Date(conversation[i].timestamp).getTime()
      return Math.round((Date.now() - hintTime) / 1000)
    }
  }

  // No hints yet, return a large number
  return 999999
}

function getDefaultHintMessage(level: HintLevel): string {
  const messages: Record<HintLevel, string> = {
    1: "Think about what concept or formula might apply here. What does this problem remind you of from your studies?",
    2: "Let's focus on the first step. What information do you have, and what are you trying to find?",
    3: "Here's a similar problem to help you see the pattern: [similar example]. Now try applying the same approach to your problem.",
    4: "Let's work through this together. Start by identifying the key variables or elements in the problem.",
    5: "Here's the full solution. Study it carefully and try a similar problem on your own next time.",
  }
  return messages[level]
}
