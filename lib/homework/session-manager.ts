/**
 * Session Manager
 * Handles creation, updates, and retrieval of homework help sessions
 */

import { createClient } from '@/lib/supabase/server'
import type {
  HomeworkSession,
  CreateSessionRequest,
  UpdateSessionRequest,
  ConversationMessage,
  SessionStatus,
  SessionSummary,
  QuestionAnalysis,
  ReferenceAnalysis,
} from './types'

// ============================================================================
// Session CRUD Operations
// ============================================================================

/**
 * Create a new homework help session
 */
export async function createSession(
  userId: string,
  request: CreateSessionRequest,
  questionAnalysis: QuestionAnalysis,
  referenceAnalysis?: ReferenceAnalysis
): Promise<HomeworkSession> {
  const supabase = await createClient()

  const sessionData = {
    user_id: userId,
    question_image_url: request.questionImageUrl,
    question_text: questionAnalysis.questionText,
    question_type: questionAnalysis.questionType,
    detected_subject: questionAnalysis.subject,
    detected_topic: questionAnalysis.topic,
    detected_concepts: questionAnalysis.requiredConcepts,
    difficulty_estimate: questionAnalysis.difficultyEstimate,
    reference_image_urls: request.referenceImageUrls || [],
    reference_extracted_content: referenceAnalysis?.extractedContent || null,
    reference_relevant_sections: referenceAnalysis?.relevantSections || null,
    initial_attempt: request.initialAttempt || null,
    total_estimated_steps: questionAnalysis.estimatedSteps,
    status: 'active' as SessionStatus,
    conversation: [] as ConversationMessage[],
  }

  const { data, error } = await supabase
    .from('homework_sessions')
    .insert(sessionData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return data as HomeworkSession
}

/**
 * Get a session by ID (with user ownership check)
 */
export async function getSession(
  sessionId: string,
  userId: string
): Promise<HomeworkSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('homework_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to get session: ${error.message}`)
  }

  return data as HomeworkSession
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(
  userId: string,
  options?: {
    status?: SessionStatus
    limit?: number
    offset?: number
  }
): Promise<HomeworkSession[]> {
  const supabase = await createClient()

  let query = supabase
    .from('homework_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get sessions: ${error.message}`)
  }

  return (data || []) as HomeworkSession[]
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  userId: string,
  updates: UpdateSessionRequest
): Promise<HomeworkSession> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}

  if (updates.comfortLevel !== undefined) {
    updateData.comfort_level = updates.comfortLevel
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status
    if (updates.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
  }
  if (updates.studentFinalAnswer !== undefined) {
    updateData.student_final_answer = updates.studentFinalAnswer
  }

  const { data, error } = await supabase
    .from('homework_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`)
  }

  return data as HomeworkSession
}

/**
 * Delete/abandon a session
 */
export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('homework_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`)
  }
}

// ============================================================================
// Conversation Management
// ============================================================================

/**
 * Add a message to the conversation
 */
export async function addMessage(
  sessionId: string,
  userId: string,
  message: ConversationMessage
): Promise<HomeworkSession> {
  const supabase = await createClient()

  // Get current session
  const session = await getSession(sessionId, userId)
  if (!session) {
    throw new Error('Session not found')
  }

  // Add message to conversation array
  const updatedConversation = [...session.conversation, message]

  // Update progress if tutor message has progress estimate
  const updateData: Record<string, unknown> = {
    conversation: updatedConversation,
  }

  // Also save to homework_turns for detailed tracking
  const turnNumber = updatedConversation.length

  const { error: turnError } = await supabase.from('homework_turns').insert({
    session_id: sessionId,
    turn_number: turnNumber,
    role: message.role,
    content: message.content,
    hint_level: message.hintLevel || null,
    pedagogical_intent: message.pedagogicalIntent || null,
    referenced_concept: message.referencedConcept || null,
    shows_understanding: message.showsUnderstanding || null,
    misconception_detected: message.misconceptionDetected || null,
  })

  if (turnError) {
    console.error('Failed to save turn:', turnError)
    // Continue anyway - main conversation is in session
  }

  const { data, error } = await supabase
    .from('homework_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add message: ${error.message}`)
  }

  return data as HomeworkSession
}

/**
 * Update session progress
 */
export async function updateProgress(
  sessionId: string,
  userId: string,
  progress: {
    currentStep?: number
    hintsUsed?: number
    usedShowAnswer?: boolean
    breakthroughMoment?: string
  }
): Promise<void> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}

  if (progress.currentStep !== undefined) {
    updateData.current_step = progress.currentStep
  }
  if (progress.hintsUsed !== undefined) {
    updateData.hints_used = progress.hintsUsed
  }
  if (progress.usedShowAnswer !== undefined) {
    updateData.used_show_answer = progress.usedShowAnswer
  }
  if (progress.breakthroughMoment !== undefined) {
    updateData.breakthrough_moment = progress.breakthroughMoment
  }

  const { error } = await supabase
    .from('homework_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to update progress: ${error.message}`)
  }
}

// ============================================================================
// Session Completion
// ============================================================================

/**
 * Complete a session and generate summary
 */
export async function completeSession(
  sessionId: string,
  userId: string,
  studentFinalAnswer?: string
): Promise<{ session: HomeworkSession; summary: SessionSummary }> {
  const supabase = await createClient()

  // Get the session
  const session = await getSession(sessionId, userId)
  if (!session) {
    throw new Error('Session not found')
  }

  // Calculate time spent
  const startTime = new Date(session.created_at).getTime()
  const endTime = Date.now()
  const timeSpentSeconds = Math.round((endTime - startTime) / 1000)

  // Update session as completed
  const { data, error } = await supabase
    .from('homework_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      solution_reached: true,
      student_final_answer: studentFinalAnswer || null,
      time_spent_seconds: timeSpentSeconds,
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to complete session: ${error.message}`)
  }

  const completedSession = data as HomeworkSession

  // Generate summary
  const summary = generateSessionSummary(completedSession)

  return { session: completedSession, summary }
}

/**
 * Generate a summary of the completed session
 */
function generateSessionSummary(session: HomeworkSession): SessionSummary {
  const timeSpent = formatDuration(session.time_spent_seconds || 0)

  // Count hints used
  const hintsUsed = session.hints_used

  // Determine approach feedback based on hints and show answer usage
  let approachFeedback: string
  if (session.used_show_answer) {
    approachFeedback =
      "You chose to see the answer this time. That's okay - reviewing solutions is a valid way to learn! Try solving similar problems independently next time."
  } else if (hintsUsed === 0) {
    approachFeedback =
      'Outstanding! You worked through this problem entirely on your own. Your independent problem-solving skills are strong!'
  } else if (hintsUsed <= 2) {
    approachFeedback =
      'Great work! You used hints strategically when needed and figured out most of it yourself.'
  } else {
    approachFeedback =
      'Good persistence! You kept working through the problem even when it was challenging. Each problem you complete builds your skills.'
  }

  // Generate what they learned
  const whatYouLearned = [
    `Topic: ${session.detected_topic || 'General problem-solving'}`,
  ]

  if (session.detected_concepts && session.detected_concepts.length > 0) {
    whatYouLearned.push(
      `Key concepts practiced: ${session.detected_concepts.slice(0, 3).join(', ')}`
    )
  }

  if (session.breakthrough_moment) {
    whatYouLearned.push(`Key insight: ${session.breakthrough_moment}`)
  }

  // Encouragement message
  const encouragements = [
    'Keep up the great work! Every problem you tackle makes you stronger.',
    "You're building solid problem-solving skills. Keep practicing!",
    'Great job completing this! Your persistence will pay off.',
    "Remember: struggle is how we learn. You're doing great!",
  ]
  const encouragement =
    encouragements[Math.floor(Math.random() * encouragements.length)]

  return {
    timeSpent,
    hintsUsed,
    usedShowAnswer: session.used_show_answer,
    conceptsPracticed: session.detected_concepts || [],
    approachFeedback,
    whatYouLearned,
    encouragement,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds} sec`
      : `${minutes} minutes`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Get recent conversation messages for context
 */
export function getRecentMessages(
  session: HomeworkSession,
  count: number = 10
): ConversationMessage[] {
  const conversation = session.conversation || []
  return conversation.slice(-count)
}
