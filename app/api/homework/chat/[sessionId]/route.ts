/**
 * Homework Chat API
 * POST - Send a message and get tutor response
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getSession,
  addMessage,
  updateProgress,
  getRecentMessages,
  generateTutorResponse,
  checkForSolution,
  type TutorContext,
  type QuestionAnalysis,
  type ReferenceAnalysis,
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

    // Fetch user's language preference
    const { data: userProfile } = await supabase
      .from('user_learning_profile')
      .select('language')
      .eq('user_id', user.id)
      .single()

    const userLanguage = (userProfile?.language || 'en') as 'en' | 'he'

    // Parse request body
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Add student message to conversation
    const studentMessage: ConversationMessage = {
      role: 'student',
      content: message,
      timestamp: new Date().toISOString(),
    }

    let updatedSession = await addMessage(sessionId, user.id, studentMessage)

    // Build context for tutor response
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

    const tutorContext: TutorContext = {
      session: updatedSession,
      questionAnalysis,
      referenceAnalysis,
      recentMessages: getRecentMessages(updatedSession, 10),
      hintsUsed: updatedSession.hints_used,
      currentProgress: calculateProgress(updatedSession),
      language: userLanguage,
    }

    // Generate tutor response
    const tutorResponse = await generateTutorResponse(tutorContext, message)

    // Check if student might have solved the problem
    if (
      tutorResponse.estimatedProgress >= 80 ||
      tutorResponse.detectedUnderstanding
    ) {
      const solutionCheck = await checkForSolution(tutorContext, message)
      if (solutionCheck.solved) {
        tutorResponse.shouldEndSession = true
        tutorResponse.celebrationMessage =
          solutionCheck.feedback || "Excellent work! You've solved it!"
      }
    }

    // Add tutor message to conversation
    const tutorMessage: ConversationMessage = {
      role: 'tutor',
      content: tutorResponse.celebrationMessage
        ? `${tutorResponse.message}\n\n${tutorResponse.celebrationMessage}`
        : tutorResponse.message,
      timestamp: new Date().toISOString(),
      pedagogicalIntent: tutorResponse.pedagogicalIntent,
    }

    updatedSession = await addMessage(sessionId, user.id, tutorMessage)

    // Update progress
    await updateProgress(sessionId, user.id, {
      currentStep: Math.round(
        (tutorResponse.estimatedProgress / 100) *
          (session.total_estimated_steps || 5)
      ),
    })

    // If breakthrough detected, save it
    if (tutorResponse.celebrationMessage) {
      await updateProgress(sessionId, user.id, {
        breakthroughMoment: tutorResponse.celebrationMessage,
      })
    }

    return NextResponse.json({
      tutorResponse,
      updatedSession,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

/**
 * Calculate current progress as percentage
 */
function calculateProgress(session: {
  current_step: number
  total_estimated_steps: number | null
  conversation: ConversationMessage[]
}): number {
  const totalSteps = session.total_estimated_steps || 5
  const currentStep = session.current_step

  // Base progress on steps
  const stepProgress = (currentStep / totalSteps) * 100

  // Also consider conversation length as a factor
  const conversationProgress = Math.min(
    50,
    (session.conversation.length / 10) * 50
  )

  return Math.min(100, Math.max(stepProgress, conversationProgress))
}
