/**
 * useAdaptiveDifficulty Hook
 *
 * Client-side hook for tracking performance and recording answers
 * with adaptive difficulty adjustment.
 */

import { useState, useCallback, useRef } from 'react'
import type { QuestionSource, PerformanceSummary } from '@/lib/adaptive'

// =============================================================================
// Types
// =============================================================================

interface AdaptiveAnswer {
  questionId: string
  questionSource: QuestionSource
  isCorrect: boolean
  responseTimeMs?: number
  questionDifficulty?: number
  conceptId?: string
}

interface AdaptiveState {
  accuracy: number
  ability: number
  difficulty: number
  streak: number
  streakType: 'correct' | 'wrong' | 'none'
  questionsAnswered: number
  lastFeedback?: string
}

interface UseAdaptiveDifficultyOptions {
  courseId?: string
}

interface UseAdaptiveDifficultyReturn {
  // State
  state: AdaptiveState
  isLoading: boolean
  error: string | null

  // Actions
  recordAnswer: (answer: AdaptiveAnswer) => Promise<void>
  resetSession: () => Promise<void>
  refreshState: () => Promise<void>

  // Computed
  shouldIncreaseDifficulty: boolean
  shouldDecreaseDifficulty: boolean
  performanceLevel: 'struggling' | 'learning' | 'mastering'
}

// =============================================================================
// Hook
// =============================================================================

export function useAdaptiveDifficulty(
  options: UseAdaptiveDifficultyOptions = {}
): UseAdaptiveDifficultyReturn {
  const { courseId } = options

  const [state, setState] = useState<AdaptiveState>({
    accuracy: 0.5,
    ability: 2.5,
    difficulty: 3.0,
    streak: 0,
    streakType: 'none',
    questionsAnswered: 0,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track timing for response time calculation
  const questionStartTime = useRef<number | null>(null)

  /**
   * Record an answer and update state
   */
  const recordAnswer = useCallback(async (answer: AdaptiveAnswer) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/adaptive/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: answer.questionId,
          question_source: answer.questionSource,
          is_correct: answer.isCorrect,
          response_time_ms: answer.responseTimeMs,
          question_difficulty: answer.questionDifficulty,
          concept_id: answer.conceptId,
          course_id: courseId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record answer')
      }

      const data = await response.json()

      setState(prev => ({
        accuracy: data.accuracy,
        ability: data.estimated_ability,
        difficulty: data.new_difficulty,
        streak: data.streak,
        streakType: data.streak > 0 ? (answer.isCorrect ? 'correct' : 'wrong') : 'none',
        questionsAnswered: prev.questionsAnswered + 1,
        lastFeedback: data.feedback,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record answer')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  /**
   * Reset session state
   */
  const resetSession = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = courseId
        ? `/api/adaptive/reset?courseId=${courseId}`
        : '/api/adaptive/reset'

      const response = await fetch(url, { method: 'POST' })

      if (!response.ok) {
        throw new Error('Failed to reset session')
      }

      setState({
        accuracy: 0.5,
        ability: 2.5,
        difficulty: 3.0,
        streak: 0,
        streakType: 'none',
        questionsAnswered: 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset session')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  /**
   * Refresh state from server
   */
  const refreshState = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = courseId
        ? `/api/adaptive/state?courseId=${courseId}`
        : '/api/adaptive/state'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch state')
      }

      const data: PerformanceSummary = await response.json()

      setState({
        accuracy: data.accuracy,
        ability: data.estimatedAbility,
        difficulty: data.currentDifficulty,
        streak: data.streak,
        streakType: data.streakType,
        questionsAnswered: data.questionsAnswered,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch state')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  // Computed values
  const shouldIncreaseDifficulty = state.accuracy > 0.85 || state.streak >= 3 && state.streakType === 'correct'
  const shouldDecreaseDifficulty = state.accuracy < 0.65 || state.streak >= 3 && state.streakType === 'wrong'

  const performanceLevel: 'struggling' | 'learning' | 'mastering' =
    state.accuracy < 0.5 ? 'struggling' :
    state.accuracy > 0.8 ? 'mastering' :
    'learning'

  return {
    state,
    isLoading,
    error,
    recordAnswer,
    resetSession,
    refreshState,
    shouldIncreaseDifficulty,
    shouldDecreaseDifficulty,
    performanceLevel,
  }
}

// =============================================================================
// Timing Helper
// =============================================================================

/**
 * Hook for tracking question response time
 */
export function useResponseTimer() {
  const startTime = useRef<number | null>(null)

  const startTimer = useCallback(() => {
    startTime.current = Date.now()
  }, [])

  const stopTimer = useCallback((): number | undefined => {
    if (startTime.current === null) return undefined
    const elapsed = Date.now() - startTime.current
    startTime.current = null
    return elapsed
  }, [])

  const resetTimer = useCallback(() => {
    startTime.current = null
  }, [])

  return { startTimer, stopTimer, resetTimer }
}

export default useAdaptiveDifficulty
