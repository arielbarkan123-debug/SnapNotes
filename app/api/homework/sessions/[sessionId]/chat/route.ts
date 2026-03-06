import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ConversationMessage,
  HomeworkSession,
  QuestionAnalysis,
  ReferenceAnalysis,
  TutorContext,
} from '@/lib/homework/types'
import { generateTutorResponse, checkForSolution } from '@/lib/homework/tutor-engine'
import { searchYouTubeVideos } from '@/lib/prepare/youtube-search'
import type { ExplanationStyleId } from '@/lib/homework/explanation-styles'
import { addMessage, updateProgress, getRecentMessages } from '@/lib/homework/session-manager'
import { createErrorResponse, ErrorCodes, mapClaudeAPIError } from '@/lib/errors'
import { loadUserProfile } from '@/lib/user-profile'
import { getStudentContext, generateDirectives } from '@/lib/student-context'
import { recordHomeworkMisconception } from '@/lib/homework/misconception-recorder'

// Allow 120 seconds — engine diagram generation can take 10-60s on top of AI response
export const maxDuration = 120

// ============================================================================
// Escalation ladder — maps action to AI instruction
// ============================================================================

function getEscalationInstruction(action: string): string {
  switch (action) {
    case 'REPHRASE':
      return 'Rephrase your previous explanation using simpler words and shorter sentences.'
    case 'ANALOGY':
      return 'Explain using a real-world analogy from everyday life.'
    case 'CONCRETE':
      return 'Show a fully worked numerical example with actual numbers.'
    case 'VIDEO':
      return 'The student wants a video explanation. Search YouTube for a relevant tutorial.'
    case 'EASIER':
      return 'Create a simpler version of the same problem type and walk through it.'
    default:
      return 'Try a different explanation approach.'
  }
}

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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request
    let body: { message: string; enableDiagrams?: boolean; diagramMode?: string; explanationStyle?: string }
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.BODY_INVALID_JSON)
    }

    if (!body.message || typeof body.message !== 'string') {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Message is required')
    }

    const isAutoStart = body.message === '__auto_start__'
    const explanationStyle = body.explanationStyle

    // Detect escalation prefix (e.g. "[ESCALATION:REPHRASE] Please explain differently.")
    let escalationAction: string | null = null
    let cleanMessage = body.message
    const escalationMatch = body.message.match(/^\[ESCALATION:(\w+)\]\s*/)
    if (escalationMatch) {
      escalationAction = escalationMatch[1]
      cleanMessage = body.message.replace(escalationMatch[0], '').trim()
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

    // Derive diagram mode: 'off' | 'quick' | 'accurate'
    // For auto-start: use session's enable_diagrams preference (backward compat → 'quick')
    // For follow-up messages: use client-sent diagramMode (falls back to enableDiagrams boolean)
    type DiagramMode = 'off' | 'quick' | 'accurate'
    const diagramMode: DiagramMode = isAutoStart
      ? (homeworkSession.enable_diagrams !== false ? 'quick' : 'off')
      : ((body.diagramMode as DiagramMode) || (body.enableDiagrams !== false ? 'quick' : 'off'))
    const enableDiagrams = diagramMode !== 'off'

    // Step 1: Add student message to conversation (skip for auto-start sentinel)
    let sessionAfterStudentMsg: HomeworkSession

    if (isAutoStart) {
      // Don't store __auto_start__ in conversation — it's an internal sentinel
      sessionAfterStudentMsg = homeworkSession
    } else {
      const studentMessage: ConversationMessage = {
        role: 'student',
        content: cleanMessage || body.message,
        timestamp: new Date().toISOString(),
      }

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
          return createErrorResponse(ErrorCodes.CHAT_FAILED, 'Failed to save message')
        }
        sessionAfterStudentMsg = updated as HomeworkSession
      }
    }

    // Step 2: Build tutor context
    const questionAnalysis = buildQuestionAnalysis(homeworkSession)
    const referenceAnalysis = buildReferenceAnalysis(homeworkSession)

    // Load user profile for language/grade/studySystem
    let userLanguage: 'en' | 'he' | undefined
    let userGrade: string | undefined
    let userStudySystem: string | undefined
    try {
      const profile = await loadUserProfile(supabase, user.id)
      if (profile) {
        userLanguage = profile.language as 'en' | 'he'
        userGrade = profile.grade || undefined
        userStudySystem = profile.studySystem
      }
    } catch {
      // Continue without profile data
    }

    // Load student intelligence from Learning Intelligence Engine
    let studentIntelligence: TutorContext['studentIntelligence'] | undefined
    try {
      const studentCtx = await getStudentContext(supabase, user.id)
      if (studentCtx) {
        const directives = generateDirectives(studentCtx)
        studentIntelligence = {
          studentAbilitySummary: directives.homework.studentAbilitySummary,
          explanationDepth: directives.homework.explanationDepth,
          preferredExplanationStyle: directives.homework.preferredExplanationStyle,
          scaffoldingLevel: directives.homework.scaffoldingLevel,
          anticipatedMisconceptions: directives.homework.anticipatedMisconceptions,
          knownPrerequisiteGaps: directives.homework.knownPrerequisiteGaps,
        }
      }
    } catch {
      // Continue without student intelligence
    }

    const context: TutorContext = {
      session: sessionAfterStudentMsg,
      questionAnalysis,
      referenceAnalysis,
      recentMessages: getRecentMessages(sessionAfterStudentMsg, 10),
      hintsUsed: sessionAfterStudentMsg.hints_used || 0,
      currentProgress: calculateProgress(sessionAfterStudentMsg),
      language: userLanguage,
      grade: userGrade,
      studySystem: userStudySystem,
      studentIntelligence,
    }

    // Step 3: Generate Socratic tutor response
    // If escalation is active, prepend the escalation instruction to the student message
    const messageForTutor = escalationAction
      ? `${getEscalationInstruction(escalationAction)}\n\nStudent says: ${cleanMessage}`
      : body.message
    const tutorResponse = await generateTutorResponse(context, messageForTutor, enableDiagrams, explanationStyle as ExplanationStyleId | undefined, diagramMode as 'off' | 'quick' | 'accurate')

    // Step 4: Check if student solved the problem (if high progress)
    let solutionCheck = { solved: false, feedback: '' }
    if (tutorResponse.estimatedProgress >= 75) {
      try {
        solutionCheck = await checkForSolution(context, cleanMessage)
        if (solutionCheck.solved) {
          tutorResponse.celebrationMessage = solutionCheck.feedback
          tutorResponse.shouldEndSession = true
        }
      } catch (error) {
        console.error('Solution check error:', error)
      }
    }

    // Search for relevant YouTube videos for explanatory responses (non-blocking)
    let relatedVideos: Array<{ videoId: string; title: string; channelTitle: string; thumbnailUrl: string }> = []
    if (
      escalationAction === 'VIDEO' ||
      tutorResponse.pedagogicalIntent === 'give_hint' ||
      tutorResponse.pedagogicalIntent === 'clarify'
    ) {
      try {
        const searchQuery = `${homeworkSession.detected_subject || ''} ${homeworkSession.detected_topic || ''} explained simply`
        relatedVideos = await searchYouTubeVideos(searchQuery.trim(), 2)
      } catch { /* silent - videos are optional */ }
    }

    // Step 5: Add tutor response to conversation
    const tutorMessage: ConversationMessage = {
      role: 'tutor',
      content: tutorResponse.message,
      timestamp: new Date().toISOString(),
      pedagogicalIntent: tutorResponse.pedagogicalIntent,
      showsUnderstanding: tutorResponse.detectedUnderstanding,
      misconceptionDetected: tutorResponse.detectedMisconception || undefined,
      diagram: tutorResponse.diagram,
      visualUpdate: tutorResponse.visualUpdate,
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

    // Record misconception back to intelligence (non-blocking)
    if (tutorResponse.detectedMisconception) {
      recordHomeworkMisconception(supabase, {
        userId: user.id,
        misconceptionType: tutorResponse.detectedMisconception,
        detectedSubject: homeworkSession.detected_subject,
        detectedTopic: homeworkSession.detected_topic,
        sessionId,
      }).catch(() => {})
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
      relatedVideos,
    })
  } catch (error) {
    console.error('Chat error:', error)
    // Map Claude API errors (credits exhausted, rate limited, etc.) to specific codes
    // so the client shows a helpful message instead of a generic "chat failed"
    const mapped = mapClaudeAPIError(error)
    if (mapped.code !== ErrorCodes.AI_UNKNOWN) {
      return createErrorResponse(mapped.code, mapped.message)
    }
    return createErrorResponse(ErrorCodes.CHAT_FAILED)
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
