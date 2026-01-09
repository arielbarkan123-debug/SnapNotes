import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ConversationMessage,
  HomeworkSession,
  QuestionAnalysis,
  ReferenceAnalysis,
  TutorContext,
} from '@/lib/homework/types'
import { generateTutorResponse, checkForSolution } from '@/lib/homework/tutor-engine'
import { addMessage, updateProgress, getRecentMessages } from '@/lib/homework/session-manager'

// Allow 60 seconds for chat response generation
export const maxDuration = 60

// ============================================================================
// POST - Send a message to the tutor
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    let body: { message: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('homework_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const homeworkSession = session as HomeworkSession

    // Step 1: Add student message to conversation
    const studentMessage: ConversationMessage = {
      role: 'student',
      content: body.message,
      timestamp: new Date().toISOString(),
    }

    let sessionAfterStudentMsg: HomeworkSession
    try {
      sessionAfterStudentMsg = await addMessage(sessionId, user.id, studentMessage)
    } catch {
      // Fallback: manually update if addMessage fails
      const updatedConversation = [...(homeworkSession.conversation || []), studentMessage]
      const { data: updated, error: updateError } = await supabase
        .from('homework_sessions')
        .update({ conversation: updatedConversation })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
      }
      sessionAfterStudentMsg = updated as HomeworkSession
    }

    // Step 2: Build tutor context
    const questionAnalysis = buildQuestionAnalysis(homeworkSession)
    const referenceAnalysis = buildReferenceAnalysis(homeworkSession)

    const context: TutorContext = {
      session: sessionAfterStudentMsg,
      questionAnalysis,
      referenceAnalysis,
      recentMessages: getRecentMessages(sessionAfterStudentMsg, 10),
      hintsUsed: sessionAfterStudentMsg.hints_used || 0,
      currentProgress: calculateProgress(sessionAfterStudentMsg),
    }

    // Step 3: Generate Socratic tutor response
    const tutorResponse = await generateTutorResponse(context, body.message)

    // Step 4: Check if student solved the problem (if high progress)
    let solutionCheck = { solved: false, feedback: '' }
    if (tutorResponse.estimatedProgress >= 75) {
      try {
        solutionCheck = await checkForSolution(context, body.message)
        if (solutionCheck.solved) {
          tutorResponse.celebrationMessage = solutionCheck.feedback
          tutorResponse.shouldEndSession = true
        }
      } catch (error) {
        console.error('Solution check error:', error)
      }
    }

    // Step 5: Add tutor response to conversation
    const tutorMessage: ConversationMessage = {
      role: 'tutor',
      content: tutorResponse.message,
      timestamp: new Date().toISOString(),
      pedagogicalIntent: tutorResponse.pedagogicalIntent,
      showsUnderstanding: tutorResponse.detectedUnderstanding,
      misconceptionDetected: tutorResponse.detectedMisconception || undefined,
    }

    let finalSession: HomeworkSession
    try {
      finalSession = await addMessage(sessionId, user.id, tutorMessage)
    } catch {
      // Fallback
      const updatedConversation = [
        ...(sessionAfterStudentMsg.conversation || []),
        tutorMessage,
      ]
      const { data: updated } = await supabase
        .from('homework_sessions')
        .update({ conversation: updatedConversation })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single()
      finalSession = updated as HomeworkSession
    }

    // Step 6: Update progress
    const currentStep = Math.ceil(tutorResponse.estimatedProgress / 20)
    try {
      await updateProgress(sessionId, user.id, {
        currentStep,
        breakthroughMoment: tutorResponse.celebrationMessage,
      })
    } catch (error) {
      console.error('Progress update error:', error)
    }

    // Step 7: If solved, mark session as completed
    if (solutionCheck.solved) {
      await supabase
        .from('homework_sessions')
        .update({
          status: 'completed',
          solution_reached: true,
          breakthrough_moment: solutionCheck.feedback,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)

      // Re-fetch final session state
      const { data: completedSession } = await supabase
        .from('homework_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (completedSession) {
        finalSession = completedSession as HomeworkSession
      }
    }

    return NextResponse.json({
      tutorResponse,
      session: finalSession,
      solved: solutionCheck.solved,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
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
    commonMistakes: [], // Would need to store this in session
    solutionApproach: '', // Would need to store this in session
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
    keyFormulas: [], // Would need to store
    keyDefinitions: [],
    helpfulExamples: [],
  }
}

function calculateProgress(session: HomeworkSession): number {
  const currentStep = session.current_step || 0
  const totalSteps = session.total_estimated_steps || 5
  return Math.min(100, Math.round((currentStep / totalSteps) * 100))
}
