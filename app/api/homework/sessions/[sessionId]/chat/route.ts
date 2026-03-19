import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ConversationMessage,
  HomeworkSession,
  QuestionAnalysis,
  ReferenceAnalysis,
  TutorContext,
} from '@/lib/homework/types'
import { generateTutorResponse, checkForSolution, type DeferredDiagramResponse } from '@/lib/homework/tutor-engine'
import { searchYouTubeVideos } from '@/lib/prepare/youtube-search'
import type { ExplanationStyleId } from '@/lib/homework/explanation-styles'
import { addMessage, updateProgress, getRecentMessages } from '@/lib/homework/session-manager'
import { createErrorResponse, ErrorCodes, mapClaudeAPIError } from '@/lib/errors'
import { loadUserProfile } from '@/lib/user-profile'
import { getStudentContext, generateDirectives } from '@/lib/student-context'
import { recordHomeworkMisconception } from '@/lib/homework/misconception-recorder'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:homework-chat')

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
    // Client preference (body.diagramMode) takes priority — it reflects the user's
    // current VisualsContext setting. Falls back to session's stored diagram_mode
    // (set during session creation), then to backward-compat default.
    type DiagramMode = 'off' | 'quick' | 'accurate'
    const diagramMode: DiagramMode =
      (body.diagramMode as DiagramMode) ||
      (homeworkSession.diagram_mode as DiagramMode) ||
      (homeworkSession.enable_diagrams !== false ? 'quick' : 'off')
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

    // Step 3: For auto-start, use streaming response so greeting text arrives fast
    // and the engine diagram arrives when ready (not blocked for 45-60s)
    if (isAutoStart) {
      return handleAutoStartStreaming(
        supabase, context, sessionId, user.id,
        enableDiagrams, diagramMode as 'off' | 'quick' | 'accurate',
        explanationStyle as ExplanationStyleId | undefined,
      )
    }

    // Step 3b: Generate Socratic tutor response (non-auto-start path)
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
        log.error({ err: error }, 'Solution check error')
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
      log.error({ err: error }, 'Progress update error')
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
      diagramStatus: tutorResponse.diagramStatus,  // Transient — not persisted in conversation DB
      session: finalSession,
      solved: solutionCheck.solved,
      relatedVideos,
    })
  } catch (error) {
    log.error({ err: error }, 'Chat error')
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
// Streaming Auto-Start Handler
// ============================================================================

/**
 * Streaming response for auto-start requests.
 * Sends the greeting text immediately (~5s), then sends the engine diagram
 * when it's ready (~30-60s). The client processes NDJSON stream events.
 *
 * Events:
 * - { type: 'greeting', tutorResponse, session, diagramStatus? }
 * - { type: 'heartbeat', timestamp }
 * - { type: 'diagram', diagram, diagramStatus }
 * - { type: 'done' }
 * - { type: 'error', error }
 */
async function handleAutoStartStreaming(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: TutorContext,
  sessionId: string,
  userId: string,
  enableDiagrams: boolean,
  diagramMode: 'off' | 'quick' | 'accurate',
  explanationStyle?: ExplanationStyleId,
): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        } catch {
          // Stream may have been closed by client abort
        }
      }
      const heartbeat = setInterval(() => send({ type: 'heartbeat', timestamp: Date.now() }), 2000)

      try {
        // Phase 1: Generate greeting text with deferred diagram
        const tutorResponse = await generateTutorResponse(
          context, '__auto_start__', enableDiagrams,
          explanationStyle, diagramMode,
          { deferDiagram: true },
        ) as DeferredDiagramResponse

        // Save greeting to DB
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

        let savedSession: HomeworkSession
        try {
          savedSession = await addMessage(sessionId, userId, tutorMessage)
        } catch {
          // Fallback: manual update
          const { data: currentSession } = await supabase
            .from('homework_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()
          const conv = [...((currentSession as HomeworkSession)?.conversation || []), tutorMessage]
          const { data: updated } = await supabase
            .from('homework_sessions')
            .update({ conversation: conv })
            .eq('id', sessionId)
            .eq('user_id', userId)
            .select()
            .single()
          savedSession = updated as HomeworkSession
        }

        // Send greeting immediately — client can render the text now
        send({
          type: 'greeting',
          tutorResponse: {
            message: tutorResponse.message,
            pedagogicalIntent: tutorResponse.pedagogicalIntent,
            detectedUnderstanding: tutorResponse.detectedUnderstanding,
            detectedMisconception: tutorResponse.detectedMisconception,
            suggestedNextAction: tutorResponse.suggestedNextAction,
            estimatedProgress: tutorResponse.estimatedProgress,
            shouldEndSession: tutorResponse.shouldEndSession,
            celebrationMessage: tutorResponse.celebrationMessage,
            diagram: tutorResponse.diagram,
            visualUpdate: tutorResponse.visualUpdate,
            diagramStatus: tutorResponse.diagramStatus,
          },
          session: savedSession,
          diagramStatus: tutorResponse.diagramStatus,
        })

        // Phase 2: Wait for engine diagram if one is pending.
        // Wrapped in its own try-catch so diagram failures don't cause a stream error
        // (the greeting is already delivered — a diagram failure is non-fatal).
        const diagramPromise = tutorResponse._diagramPromise
        if (diagramPromise) {
          try {
            log.info('[streaming] Waiting for engine diagram...')
            const resolved = await diagramPromise

            if (resolved.diagram) {
              log.info('[streaming] Engine diagram resolved, updating conversation')

              // Update the conversation in DB — add diagram to the last tutor message
              const { data: freshSession } = await supabase
                .from('homework_sessions')
                .select('*')
                .eq('id', sessionId)
                .single()

              if (freshSession) {
                const conv = [...((freshSession as HomeworkSession).conversation || [])]
                // Find the last tutor message and add the diagram
                for (let i = conv.length - 1; i >= 0; i--) {
                  if (conv[i].role === 'tutor') {
                    conv[i] = { ...conv[i], diagram: resolved.diagram }
                    break
                  }
                }
                await supabase
                  .from('homework_sessions')
                  .update({ conversation: conv })
                  .eq('id', sessionId)
                  .eq('user_id', userId)
              }

              send({ type: 'diagram', diagram: resolved.diagram, diagramStatus: resolved.diagramStatus })
            } else if (resolved.diagramStatus) {
              send({ type: 'diagram_status', diagramStatus: resolved.diagramStatus })
            }
          } catch (diagramErr) {
            log.error({ err: diagramErr }, '[streaming] Diagram phase failed (non-fatal, greeting already sent)')
            send({ type: 'diagram_status', diagramStatus: { status: 'failed', reason: 'Engine error' } })
          }
        }

        send({ type: 'done' })
      } catch (error) {
        log.error({ err: error }, '[streaming] Auto-start streaming error')
        send({ type: 'error', error: error instanceof Error ? error.message : String(error) })
      } finally {
        clearInterval(heartbeat)
        try { controller.close() } catch { /* already closed */ }
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
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
