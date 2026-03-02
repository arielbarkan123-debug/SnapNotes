// =============================================================================
// Practice Session Manager
// Handles creation, progress tracking, and completion of practice sessions
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  PracticeSession,
  PracticeQuestion,
  SessionType,
  SessionStatus,
  SessionProgress,
  SessionResult,
  CreateSessionRequest,
  AnswerQuestionResponse,
} from './types'
import type { DifficultyLevel } from '@/lib/adaptive/types'
import { selectExistingQuestions, generateAndStoreQuestions } from './question-generator'
import { evaluateAnswer } from '@/lib/evaluation/answer-checker'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'
import { getStudentContext, generateDirectives } from '@/lib/student-context'

// -----------------------------------------------------------------------------
// Session Creation
// -----------------------------------------------------------------------------

export async function createPracticeSession(
  userId: string,
  request: CreateSessionRequest
): Promise<{ sessionId: string; questionCount: number }> {
  const supabase = await createClient()

  // ─── Student Intelligence Injection ────────────────────────────────────────
  // Load student context + directives for adaptive session configuration
  let practiceDirectives: Awaited<ReturnType<typeof generateDirectives>>['practice'] | null = null
  try {
    const studentCtx = await getStudentContext(supabase, userId)
    if (studentCtx) {
      practiceDirectives = generateDirectives(studentCtx).practice
    }
  } catch (err) {
    console.warn('[SessionManager] Failed to load student context, continuing with defaults:', err)
  }

  // Determine target concepts based on session type
  let targetConceptIds = request.targetConceptIds || []

  if (request.sessionType === 'targeted' && !targetConceptIds.length) {
    // Auto-select weak concepts from knowledge gaps
    const { data: gaps } = await supabase
      .from('user_knowledge_gaps')
      .select('concept_id')
      .eq('user_id', userId)
      .eq('resolved', false)
      .in('severity', ['critical', 'moderate'])
      .limit(5)

    targetConceptIds = gaps?.map((g) => g.concept_id) || []
  }

  // For mixed sessions without explicit target concepts, use directive recommendations
  if (request.sessionType === 'mixed' && !targetConceptIds.length && practiceDirectives) {
    targetConceptIds = practiceDirectives.recommendedConceptIds.slice(0, 5)
  }

  // If no difficulty specified by the user, use the adaptive target from directives
  const rawDifficulty = request.targetDifficulty ??
    (practiceDirectives ? practiceDirectives.targetDifficulty : undefined)
  // Ensure difficulty is a valid DifficultyLevel (1-5)
  const effectiveDifficulty: DifficultyLevel | undefined = rawDifficulty
    ? (Math.max(1, Math.min(5, Math.round(rawDifficulty))) as DifficultyLevel)
    : undefined

  // Get question count — use directive-based session length if not specified
  const questionCount =
    request.questionCount ||
    (practiceDirectives
      ? Math.max(5, Math.round(practiceDirectives.recommendedSessionLength * 2))
      : null) ||
    {
      targeted: 10,
      mixed: 15,
      exam_prep: 30,
      quick: 5,
      custom: 10,
    }[request.sessionType]

  // Select existing questions first
  let questionIds = await selectExistingQuestions({
    courseId: request.courseId,
    conceptIds: targetConceptIds.length ? targetConceptIds : undefined,
    difficulty: effectiveDifficulty,
    count: questionCount,
  })

  // If not enough questions exist, auto-generate via AI
  if (questionIds.length < questionCount && request.courseId) {
    const shortfall = questionCount - questionIds.length
    console.log(
      `[SessionManager] Only ${questionIds.length}/${questionCount} questions available, generating ${shortfall} more`
    )
    try {
      const { questionIds: newIds } = await generateAndStoreQuestions({
        courseId: request.courseId,
        count: shortfall,
      })
      questionIds = [...questionIds, ...newIds]
    } catch (err) {
      console.error('[SessionManager] Auto-generation failed:', err)
      // Continue with whatever we have
    }
  }

  if (!questionIds.length) {
    throw new Error('No questions available for this practice session')
  }

  // Create session
  const { data: session, error } = await supabase
    .from('practice_sessions')
    .insert({
      user_id: userId,
      session_type: request.sessionType,
      course_id: request.courseId || null,
      target_concept_ids: targetConceptIds.length ? targetConceptIds : null,
      target_difficulty: effectiveDifficulty || null,
      question_count: questionIds.length,
      time_limit_minutes: request.timeLimitMinutes || null,
      question_order: questionIds,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating practice session:', error)
    throw new Error('Failed to create practice session')
  }

  return {
    sessionId: session.id,
    questionCount: questionIds.length,
  }
}

// -----------------------------------------------------------------------------
// Session Retrieval
// -----------------------------------------------------------------------------

export async function getSession(sessionId: string): Promise<PracticeSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    console.error('Error fetching session:', error)
    return null
  }

  return data
}

export async function getSessionProgress(sessionId: string): Promise<SessionProgress | null> {
  const session = await getSession(sessionId)
  if (!session) return null

  const elapsedSeconds = session.started_at
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : 0

  return {
    sessionId: session.id,
    status: session.status as SessionStatus,
    questionsAnswered: session.questions_answered,
    questionsCorrect: session.questions_correct,
    totalQuestions: session.question_count,
    accuracy:
      session.questions_answered > 0
        ? Math.round((session.questions_correct / session.questions_answered) * 100)
        : 0,
    currentQuestionIndex: session.current_question_index,
    elapsedSeconds,
    remainingQuestions: session.question_count - session.questions_answered,
  }
}

export async function getCurrentQuestion(
  sessionId: string
): Promise<PracticeQuestion | null> {
  const supabase = await createClient()

  // Get session to find current question
  const session = await getSession(sessionId)
  if (!session || session.status !== 'active') return null

  const questionId = session.question_order[session.current_question_index]
  if (!questionId) return null

  const { data, error } = await supabase
    .from('practice_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (error) {
    console.error('Error fetching question:', error)
    return null
  }

  return data
}

export async function getSessionQuestions(
  sessionId: string
): Promise<PracticeQuestion[]> {
  const supabase = await createClient()

  const session = await getSession(sessionId)
  if (!session) return []

  const { data, error } = await supabase
    .from('practice_questions')
    .select('*')
    .in('id', session.question_order)

  if (error) {
    console.error('Error fetching session questions:', error)
    return []
  }

  // Return in session order
  const questionMap = new Map(data?.map((q) => [q.id, q]) || [])
  return session.question_order
    .map((id) => questionMap.get(id))
    .filter((q): q is PracticeQuestion => q !== undefined)
}

// -----------------------------------------------------------------------------
// Answer Recording
// -----------------------------------------------------------------------------

export async function recordAnswer(
  sessionId: string,
  questionId: string,
  questionIndex: number,
  userAnswer: string,
  responseTimeMs?: number
): Promise<AnswerQuestionResponse> {
  const supabase = await createClient()

  // Get the question to check answer
  const { data: question } = await supabase
    .from('practice_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (!question) {
    throw new Error('Question not found')
  }

  // Get user once — reused for language detection and concept mastery
  const { data: { user } } = await supabase.auth.getUser()

  // Determine if correct based on question type
  let isCorrect: boolean
  let evaluationScore: number | undefined
  let evaluationFeedback: string | undefined
  let evaluationMethod: string | undefined

  const useFullEvaluation =
    question.question_type === 'short_answer' ||
    question.question_type === 'fill_blank'

  if (useFullEvaluation) {
    // Fetch user profile for language + curriculum context
    let userLanguage = 'en'
    let curriculumContextString = ''
    let courseContext = ''

    if (user) {
      try {
        const { data: profile } = await supabase
          .from('user_learning_profile')
          .select('language, study_system, subjects, subject_levels, education_level, grade')
          .eq('user_id', user.id)
          .single()
        userLanguage = profile?.language || 'en'

        // Build curriculum context if user has a study system set
        if (profile?.study_system && profile.study_system !== 'general') {
          try {
            const currContext = await buildCurriculumContext({
              userProfile: {
                studySystem: profile.study_system as StudySystem,
                subjects: profile.subjects || undefined,
                subjectLevels: profile.subject_levels || undefined,
                educationLevel: profile.education_level || undefined,
                grade: profile.grade || undefined,
              },
              contentSample: question.question_text,
              purpose: 'evaluation',
            })
            curriculumContextString = formatContextForPrompt(currContext)
          } catch {
            // Non-critical: continue without curriculum context
          }
        }
      } catch {
        // Continue with default language
      }
    }

    // Fetch course context if question is linked to a course
    if (question.course_id) {
      try {
        const { data: course } = await supabase
          .from('courses')
          .select('title, description, key_concepts')
          .eq('id', question.course_id)
          .single()
        if (course) {
          courseContext = `Course: ${course.title}${course.description ? `\n${course.description}` : ''}${course.key_concepts?.length ? `\nKey Concepts: ${course.key_concepts.join(', ')}` : ''}`
        }
      } catch {
        // Non-critical: continue without course context
      }
    }

    // Use multi-layer evaluation (numeric → exact → fuzzy → AI)
    const evalResult = await evaluateAnswer({
      question: question.question_text,
      expectedAnswer: question.correct_answer,
      userAnswer,
      context: courseContext || undefined,
      curriculumContext: curriculumContextString || undefined,
      language: userLanguage,
    })
    isCorrect = evalResult.isCorrect
    evaluationScore = evalResult.score
    evaluationFeedback = evalResult.feedback
    evaluationMethod = evalResult.evaluationMethod
  } else {
    // Simple exact match for multiple_choice, true_false, etc.
    isCorrect = checkAnswer(question, userAnswer)
  }

  // ── Answer revision tracking ──────────────────────────────────────────
  // Check if this is a re-submission (revision) by looking for an existing answer
  let answerRevisionCount = 0
  let originalAnswer: string | null = null
  let revisionHelped: boolean | null = null
  let timeToFirstActionMs: number | null = null

  const { data: existingAnswer } = await supabase
    .from('practice_session_questions')
    .select('user_answer, is_correct, answer_revision_count, original_answer, started_at')
    .eq('session_id', sessionId)
    .eq('question_index', questionIndex)
    .maybeSingle()

  if (existingAnswer) {
    // This is a revision — student is changing their answer
    answerRevisionCount = (existingAnswer.answer_revision_count || 0) + 1
    // Preserve the very first answer as original_answer
    originalAnswer = existingAnswer.original_answer || existingAnswer.user_answer
    // Did the revision improve correctness? (was wrong, now correct)
    revisionHelped = !existingAnswer.is_correct && isCorrect
  }

  // time_to_first_action_ms: time from question shown (started_at) to first answer
  if (!existingAnswer && existingAnswer !== null) {
    // First answer, no started_at yet
    timeToFirstActionMs = responseTimeMs || null
  } else if (existingAnswer?.started_at) {
    // Question had a started_at timestamp
    timeToFirstActionMs = Math.round(
      Date.now() - new Date(existingAnswer.started_at).getTime()
    )
  } else {
    // Use responseTimeMs as best approximation for first action
    timeToFirstActionMs = !existingAnswer ? (responseTimeMs || null) : null
  }

  // Record the answer (including evaluation + revision details)
  const { error: answerError } = await supabase
    .from('practice_session_questions')
    .upsert(
      {
        session_id: sessionId,
        question_id: questionId,
        question_index: questionIndex,
        user_answer: userAnswer,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
        response_time_ms: responseTimeMs || null,
        evaluation_score: evaluationScore ?? null,
        evaluation_feedback: evaluationFeedback ?? null,
        evaluation_method: evaluationMethod ?? null,
        // Revision tracking fields
        answer_revision_count: answerRevisionCount,
        original_answer: originalAnswer,
        revision_helped: revisionHelped,
        time_to_first_action_ms: existingAnswer ? existingAnswer.started_at ? timeToFirstActionMs : null : (responseTimeMs || null),
      },
      { onConflict: 'session_id,question_index' }
    )

  if (answerError) {
    console.error('Error recording answer:', answerError)
    throw new Error('Failed to record answer')
  }

  // Update session progress
  const { data: updatedSession, error: updateError } = await supabase
    .from('practice_sessions')
    .update({
      questions_answered: supabase.rpc('increment', { x: 1 }),
      questions_correct: isCorrect
        ? supabase.rpc('increment', { x: 1 })
        : undefined,
      current_question_index: questionIndex + 1,
    })
    .eq('id', sessionId)
    .select('questions_answered, questions_correct, question_count')
    .single()

  if (updateError) {
    console.error('Error updating session:', updateError)
  }

  // Update question stats
  await supabase.rpc('update_question_stats', {
    p_question_id: questionId,
    p_is_correct: isCorrect,
    p_response_time_ms: responseTimeMs || null,
  })

  // Update concept mastery if question has a concept
  if (question.primary_concept_id && user) {
    await updateConceptMasteryFromPractice(
      user.id,
      question.primary_concept_id,
      isCorrect
    )
  }

  // Calculate progress
  const session = updatedSession || {
    questions_answered: questionIndex + 1,
    questions_correct: isCorrect ? 1 : 0,
    question_count: 10,
  }

  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    evaluationScore,
    evaluationFeedback,
    evaluationMethod,
    sessionProgress: {
      questionsAnswered: session.questions_answered,
      questionsCorrect: session.questions_correct,
      totalQuestions: session.question_count,
      accuracy:
        session.questions_answered > 0
          ? Math.round((session.questions_correct / session.questions_answered) * 100)
          : 0,
    },
  }
}

/**
 * Simple exact-match checker for multiple_choice, true_false, matching, sequence.
 * For short_answer and fill_blank, use evaluateAnswer() from the shared utility.
 */
function checkAnswer(question: PracticeQuestion, userAnswer: string): boolean {
  const correctAnswer = question.correct_answer.toLowerCase().trim()
  const answer = userAnswer.toLowerCase().trim()
  return answer === correctAnswer
}

async function updateConceptMasteryFromPractice(
  userId: string,
  conceptId: string,
  isCorrect: boolean
): Promise<void> {
  const supabase = await createClient()

  // Call the database function to update mastery
  await supabase.rpc('update_concept_mastery_from_review', {
    p_user_id: userId,
    p_concept_id: conceptId,
    p_is_correct: isCorrect,
  })
}

// -----------------------------------------------------------------------------
// Session Completion
// -----------------------------------------------------------------------------

export async function completeSession(sessionId: string): Promise<SessionResult> {
  const supabase = await createClient()

  // Get full session data
  const { data: session } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) {
    throw new Error('Session not found')
  }

  // Get all answers for this session
  const { data: answers } = await supabase
    .from('practice_session_questions')
    .select(`
      *,
      question:practice_questions(primary_concept_id)
    `)
    .eq('session_id', sessionId)

  // Calculate stats
  const totalTime = session.started_at
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : 0

  const avgResponseTime =
    answers?.length && answers.some((a) => a.response_time_ms)
      ? Math.round(
          answers.reduce((sum, a) => sum + (a.response_time_ms || 0), 0) /
            answers.filter((a) => a.response_time_ms).length
        )
      : null

  // Identify gaps (concepts with <50% accuracy)
  const conceptPerformance = new Map<string, { correct: number; total: number }>()
  for (const answer of answers || []) {
    const conceptId = answer.question?.primary_concept_id
    if (conceptId) {
      const perf = conceptPerformance.get(conceptId) || { correct: 0, total: 0 }
      perf.total++
      if (answer.is_correct) perf.correct++
      conceptPerformance.set(conceptId, perf)
    }
  }

  const gapsIdentified: string[] = []
  const conceptsPracticed: string[] = []

  for (const [conceptId, perf] of conceptPerformance) {
    conceptsPracticed.push(conceptId)
    if (perf.correct / perf.total < 0.5) {
      gapsIdentified.push(conceptId)
    }
  }

  // Update session
  const accuracy =
    session.questions_answered > 0
      ? session.questions_correct / session.questions_answered
      : 0

  await supabase
    .from('practice_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      accuracy,
      avg_response_time_ms: avgResponseTime,
      total_time_seconds: totalTime,
      concepts_practiced: conceptsPracticed,
      gaps_identified: gapsIdentified.length ? gapsIdentified : null,
    })
    .eq('id', sessionId)

  // Get concept names for result
  let conceptNames: Record<string, string> = {}
  if (conceptsPracticed.length) {
    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, name')
      .in('id', conceptsPracticed)

    conceptNames = Object.fromEntries(concepts?.map((c) => [c.id, c.name]) || [])
  }

  return {
    sessionId,
    sessionType: session.session_type as SessionType,
    totalQuestions: session.question_count,
    questionsCorrect: session.questions_correct,
    accuracy: Math.round(accuracy * 100),
    totalTimeSeconds: totalTime,
    avgResponseTimeMs: avgResponseTime,
    conceptsPracticed: conceptsPracticed.map((id) => conceptNames[id] || id),
    gapsIdentified: gapsIdentified.map((id) => conceptNames[id] || id),
    improvement: [], // Would need before/after mastery tracking
  }
}

// -----------------------------------------------------------------------------
// Session Management
// -----------------------------------------------------------------------------

export async function pauseSession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('practice_sessions')
    .update({ status: 'paused' })
    .eq('id', sessionId)
}

export async function resumeSession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('practice_sessions')
    .update({ status: 'active' })
    .eq('id', sessionId)
}

export async function abandonSession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('practice_sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
}

// -----------------------------------------------------------------------------
// User Stats
// -----------------------------------------------------------------------------

export async function getUserPracticeStats(userId: string): Promise<{
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  overallAccuracy: number
  lastPracticeDate: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('questions_answered, questions_correct, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (error || !data) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      overallAccuracy: 0,
      lastPracticeDate: null,
    }
  }

  const totalSessions = data.length
  const totalQuestions = data.reduce((sum, s) => sum + s.questions_answered, 0)
  const totalCorrect = data.reduce((sum, s) => sum + s.questions_correct, 0)
  const overallAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const lastPracticeDate = data[0]?.completed_at || null

  return {
    totalSessions,
    totalQuestions,
    totalCorrect,
    overallAccuracy,
    lastPracticeDate,
  }
}

export async function getActiveSessions(userId: string): Promise<PracticeSession[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active sessions:', error)
    return []
  }

  return data || []
}

export async function getRecentSessions(
  userId: string,
  limit = 10
): Promise<PracticeSession[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent sessions:', error)
    return []
  }

  return data || []
}
