/**
 * Homework Hint API
 * POST - Request a hint at a specific level
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getSession,
  addMessage,
  updateProgress,
  generateHint,
  shouldEncourageAttempt,
  type HintContext,
  type HintLevel,
  type QuestionAnalysis,
  type ReferenceAnalysis,
  type HintResponse,
  type ConversationMessage,
} from '@/lib/homework'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { hintLevel } = body

    // Validate hint level
    if (!hintLevel || ![1, 2, 3, 4, 5].includes(hintLevel)) {
      return NextResponse.json(
        { error: 'Invalid hint level (must be 1-5)' },
        { status: 400 }
      )
    }

    // Get session
    const session = await getSession(sessionId, user.id)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      )
    }

    // Check if they should be encouraged to try on their own first
    const lastTurn = session.conversation[session.conversation.length - 1]
    const lastTurnTime = lastTurn
      ? new Date(lastTurn.timestamp).getTime()
      : session.created_at
        ? new Date(session.created_at).getTime()
        : 0
    const timeSinceLastTurn = (Date.now() - lastTurnTime) / 1000

    const encouragement = shouldEncourageAttempt(
      session.hints_used,
      timeSinceLastTurn
    )

    // Build context for hint generation
    const questionAnalysis: QuestionAnalysis = {
      questionText: session.question_text || '',
      subject: (session.detected_subject as QuestionAnalysis['subject']) || 'other',
      topic: session.detected_topic || '',
      questionType: session.question_type || 'unknown',
      difficultyEstimate: session.difficulty_estimate || 3,
      requiredConcepts: session.detected_concepts || [],
      commonMistakes: [],
      solutionApproach: '',
      estimatedSteps: session.total_estimated_steps || 5,
    }

    const referenceAnalysis: ReferenceAnalysis | undefined =
      session.reference_extracted_content
        ? {
            extractedContent: session.reference_extracted_content,
            relevantSections: (session.reference_relevant_sections as ReferenceAnalysis['relevantSections']) || [],
            keyFormulas: [],
            keyDefinitions: [],
            helpfulExamples: [],
          }
        : undefined

    // Get previous hints from conversation
    const previousHints: HintResponse[] = session.conversation
      .filter((m) => m.hintLevel)
      .map((m) => ({
        hintLevel: m.hintLevel as HintLevel,
        content: m.content,
        isShowAnswer: m.hintLevel === 5,
      }))

    const hintContext: HintContext = {
      session,
      questionAnalysis,
      referenceAnalysis,
      requestedLevel: hintLevel as HintLevel,
      previousHints,
    }

    // Generate the hint
    const hint = await generateHint(hintContext)

    // Add hint message to conversation
    const hintMessage: ConversationMessage = {
      role: 'tutor',
      content: encouragement.shouldEncourage
        ? `${encouragement.message}\n\n${hint.content}`
        : hint.content,
      timestamp: new Date().toISOString(),
      hintLevel: hint.hintLevel,
      pedagogicalIntent: hint.isShowAnswer ? 'show_answer' : 'give_hint',
      referencedConcept: hint.relatedConcept,
    }

    const updatedSession = await addMessage(sessionId, user.id, hintMessage)

    // Update hints used count and show answer flag
    await updateProgress(sessionId, user.id, {
      hintsUsed: session.hints_used + 1,
      usedShowAnswer: hint.isShowAnswer ? true : session.used_show_answer,
    })

    return NextResponse.json({
      hint,
      updatedSession: {
        ...updatedSession,
        hints_used: session.hints_used + 1,
        used_show_answer: hint.isShowAnswer ? true : session.used_show_answer,
      },
      encouragement: encouragement.shouldEncourage
        ? encouragement.message
        : null,
    })
  } catch (error) {
    console.error('Hint error:', error)
    return NextResponse.json(
      { error: 'Failed to generate hint' },
      { status: 500 }
    )
  }
}
