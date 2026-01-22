/**
 * Practice Session Hooks
 *
 * Client-side state management for practice sessions including question
 * navigation, answer submission, and session lifecycle management.
 * Features localStorage persistence to prevent progress loss on refresh.
 *
 * @example
 * ```tsx
 * // Start and manage a practice session
 * const {
 *   session,
 *   currentQuestion,
 *   submitAnswer,
 *   nextQuestion,
 *   completeSession
 * } = usePracticeSession(sessionId)
 *
 * // Get practice statistics
 * const { stats, activeSessions } = usePracticeStats()
 * ```
 */

'use client'

// =============================================================================
// Practice Session Hook
// Client-side state management for practice sessions
// =============================================================================

import { useState, useCallback, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import type {
  PracticeSession,
  PracticeQuestion,
  SessionProgress,
  SessionResult,
  SessionType,
  AnswerQuestionResponse,
} from '@/lib/practice/types'
import type { DifficultyLevel } from '@/lib/adaptive/types'

// -----------------------------------------------------------------------------
// Cache Keys
// -----------------------------------------------------------------------------

export const PRACTICE_SESSION_KEY = (id: string) => `/api/practice/session/${id}`
export const PRACTICE_STATS_KEY = '/api/practice/session?include=stats,active,recent'

// -----------------------------------------------------------------------------
// LocalStorage Persistence (prevents progress loss on refresh)
// -----------------------------------------------------------------------------

const PRACTICE_STATE_KEY_PREFIX = 'notesnap_practice_state_'

interface PracticeStateStorage {
  questionIndex: number
  savedAt: number
}

function isPracticeStateStorage(value: unknown): value is PracticeStateStorage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'questionIndex' in value &&
    'savedAt' in value &&
    typeof (value as PracticeStateStorage).questionIndex === 'number' &&
    typeof (value as PracticeStateStorage).savedAt === 'number' &&
    Number.isInteger((value as PracticeStateStorage).questionIndex) &&
    (value as PracticeStateStorage).questionIndex >= 0
  )
}

function getPracticeStateKey(sessionId: string): string {
  return `${PRACTICE_STATE_KEY_PREFIX}${sessionId}`
}

function savePracticeState(sessionId: string, questionIndex: number): void {
  if (typeof window === 'undefined') return
  try {
    const state: PracticeStateStorage = {
      questionIndex,
      savedAt: Date.now(),
    }
    localStorage.setItem(getPracticeStateKey(sessionId), JSON.stringify(state))
  } catch {
    // localStorage might be full or unavailable - silently continue
  }
}

function loadPracticeState(sessionId: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(getPracticeStateKey(sessionId))
    if (!stored) return null

    const parsed: unknown = JSON.parse(stored)

    // Validate the structure with type guard
    if (!isPracticeStateStorage(parsed)) {
      localStorage.removeItem(getPracticeStateKey(sessionId))
      return null
    }

    // Only use state if saved within last 24 hours
    const maxAge = 24 * 60 * 60 * 1000
    if (Date.now() - parsed.savedAt > maxAge) {
      localStorage.removeItem(getPracticeStateKey(sessionId))
      return null
    }
    return parsed.questionIndex
  } catch {
    return null
  }
}

function clearPracticeState(sessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(getPracticeStateKey(sessionId))
  } catch {
    // Ignore errors
  }
}

// -----------------------------------------------------------------------------
// Fetcher
// -----------------------------------------------------------------------------

const fetcher = async (url: string) => {
  const res = await fetch(url)
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Server response error')
  }
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to fetch')
  }
  return data
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CreateSessionOptions {
  sessionType: SessionType
  courseId?: string
  targetConceptIds?: string[]
  targetDifficulty?: DifficultyLevel
  questionCount?: number
  timeLimitMinutes?: number
}

export interface UsePracticeSessionReturn {
  // Session data
  session: PracticeSession | null
  currentQuestion: PracticeQuestion | null
  progress: SessionProgress | null
  result: SessionResult | null

  // State
  isLoading: boolean
  isSubmitting: boolean
  error: Error | null

  // Actions
  startSession: (options: CreateSessionOptions) => Promise<string>
  submitAnswer: (
    questionId: string,
    questionIndex: number,
    answer: string,
    responseTimeMs?: number
  ) => Promise<AnswerQuestionResponse>
  nextQuestion: () => void
  previousQuestion: () => void
  completeSession: () => Promise<SessionResult>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  abandonSession: () => Promise<void>
  refresh: () => void
}

export interface UsePracticeStatsReturn {
  stats: {
    totalSessions: number
    totalQuestions: number
    totalCorrect: number
    overallAccuracy: number
    lastPracticeDate: string | null
  } | null
  activeSessions: PracticeSession[]
  recentSessions: PracticeSession[]
  isLoading: boolean
  error: Error | null
  refresh: () => void
}

// -----------------------------------------------------------------------------
// usePracticeSession Hook
// -----------------------------------------------------------------------------

/**
 * Hook for managing a practice session
 *
 * Handles session data fetching, question navigation, answer submission,
 * and session lifecycle (pause, resume, complete, abandon).
 * Automatically persists question index to localStorage.
 *
 * @param sessionId - The practice session ID to manage
 * @returns Object containing session state and control functions
 */
export function usePracticeSession(sessionId?: string): UsePracticeSessionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Fetch session data
  const {
    data,
    error,
    isLoading,
    mutate: mutateSession,
  } = useSWR(
    sessionId
      ? `${PRACTICE_SESSION_KEY(sessionId)}?include=progress,currentQuestion,questions`
      : null,
    fetcher,
    {
      refreshInterval: 0, // Don't auto-refresh
      revalidateOnFocus: false,
    }
  )

  const session = data?.session as PracticeSession | null
  const questions = (data?.questions as PracticeQuestion[]) || []
  const progress = data?.progress as SessionProgress | null

  // Get current question
  const currentQuestion = questions[currentQuestionIndex] || null

  // Sync current question index with session and localStorage
  useEffect(() => {
    if (session && sessionId) {
      // Try to restore from localStorage first (in case of page refresh)
      const savedIndex = loadPracticeState(sessionId)
      if (savedIndex !== null && savedIndex >= 0 && savedIndex < questions.length) {
        setCurrentQuestionIndex(savedIndex)
      } else {
        setCurrentQuestionIndex(session.current_question_index)
      }
    }
  }, [session?.id, sessionId, questions.length]) // Re-run when session or questions change

  // Save question index to localStorage whenever it changes
  useEffect(() => {
    if (sessionId && currentQuestionIndex >= 0) {
      savePracticeState(sessionId, currentQuestionIndex)
    }
  }, [sessionId, currentQuestionIndex])

  // Start a new session
  const startSession = useCallback(
    async (options: CreateSessionOptions): Promise<string> => {
      setIsSubmitting(true)
      try {
        const res = await fetch('/api/practice/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        })

        let data
        try {
          data = await res.json()
        } catch {
          throw new Error('Server response error')
        }

        if (!res.ok) {
          throw new Error(data?.message || 'Failed to create session')
        }

        return data.sessionId
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  // Submit an answer
  const submitAnswer = useCallback(
    async (
      questionId: string,
      questionIndex: number,
      answer: string,
      responseTimeMs?: number
    ): Promise<AnswerQuestionResponse> => {
      if (!sessionId) throw new Error('No session')

      setIsSubmitting(true)
      try {
        const res = await fetch(`/api/practice/session/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            questionIndex,
            userAnswer: answer,
            responseTimeMs,
          }),
        })

        let result
        try {
          result = await res.json()
        } catch {
          throw new Error('Server response error')
        }

        if (!res.ok) {
          throw new Error(result?.message || 'Failed to submit answer')
        }

        // Refresh session data
        mutateSession()

        return result
      } finally {
        setIsSubmitting(false)
      }
    },
    [sessionId, mutateSession]
  )

  // Navigation
  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))
  }, [questions.length])

  const previousQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  // Complete session
  const completeSession = useCallback(async (): Promise<SessionResult> => {
    if (!sessionId) throw new Error('No session')

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/practice/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })

      let sessionResult
      try {
        sessionResult = await res.json()
      } catch {
        throw new Error('Server response error')
      }

      if (!res.ok) {
        throw new Error(sessionResult?.message || 'Failed to complete session')
      }

      setResult(sessionResult)

      // Clear localStorage since session is complete
      clearPracticeState(sessionId)

      // Invalidate stats cache
      mutate(PRACTICE_STATS_KEY)

      return sessionResult
    } finally {
      setIsSubmitting(false)
    }
  }, [sessionId])

  // Pause session
  const pauseSession = useCallback(async (): Promise<void> => {
    if (!sessionId) throw new Error('No session')

    const res = await fetch(`/api/practice/session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    })

    if (!res.ok) {
      let data
      try {
        data = await res.json()
      } catch {
        throw new Error('Server response error')
      }
      throw new Error(data?.message || 'Failed to pause session')
    }

    mutateSession()
  }, [sessionId, mutateSession])

  // Resume session
  const resumeSession = useCallback(async (): Promise<void> => {
    if (!sessionId) throw new Error('No session')

    const res = await fetch(`/api/practice/session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    })

    if (!res.ok) {
      let data
      try {
        data = await res.json()
      } catch {
        throw new Error('Server response error')
      }
      throw new Error(data?.message || 'Failed to resume session')
    }

    mutateSession()
  }, [sessionId, mutateSession])

  // Abandon session
  const abandonSession = useCallback(async (): Promise<void> => {
    if (!sessionId) throw new Error('No session')

    const res = await fetch(`/api/practice/session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'abandon' }),
    })

    if (!res.ok) {
      let data
      try {
        data = await res.json()
      } catch {
        throw new Error('Server response error')
      }
      throw new Error(data?.message || 'Failed to abandon session')
    }

    // Clear localStorage since session is abandoned
    clearPracticeState(sessionId)

    // Invalidate stats cache
    mutate(PRACTICE_STATS_KEY)
  }, [sessionId])

  // Refresh
  const refresh = useCallback(() => {
    mutateSession()
  }, [mutateSession])

  return {
    session,
    currentQuestion,
    progress,
    result,
    isLoading,
    isSubmitting,
    error,
    startSession,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    completeSession,
    pauseSession,
    resumeSession,
    abandonSession,
    refresh,
  }
}

// -----------------------------------------------------------------------------
// usePracticeStats Hook
// -----------------------------------------------------------------------------

/**
 * Hook for fetching practice statistics and session history
 *
 * Provides aggregate statistics, active sessions, and recent session history.
 * Auto-refreshes every minute and on focus.
 *
 * @returns Object containing stats, sessions lists, and loading state
 */
export function usePracticeStats(): UsePracticeStatsReturn {
  const { data, error, isLoading, mutate: mutateStats } = useSWR(
    PRACTICE_STATS_KEY,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  )

  const refresh = useCallback(() => {
    mutateStats()
  }, [mutateStats])

  return {
    stats: data?.stats || null,
    activeSessions: data?.activeSessions || [],
    recentSessions: data?.recentSessions || [],
    isLoading,
    error,
    refresh,
  }
}

// -----------------------------------------------------------------------------
// useResponseTimer Hook (re-export from adaptive)
// -----------------------------------------------------------------------------

export { useResponseTimer } from './useAdaptiveDifficulty'
