/**
 * useProfileRefinement Hook
 *
 * React hook for accessing and interacting with the dynamic profile
 * refinement system (RLPA-style).
 *
 * Features:
 * - Fetch effective profile (merged profile + refinement)
 * - Report learning signals
 * - Lock/unlock attributes
 * - Access profile history for rollback
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type RefinementState,
  type EffectiveProfile,
  type QuestionSignal,
  type SessionSignal,
  type SelfAssessmentSignal,
  getRefinementState,
  processLearningSignal,
  getProfileHistory,
  rollbackProfile as rollbackProfileFn,
  lockAttribute as lockAttributeFn,
  unlockAttribute as unlockAttributeFn,
} from '@/lib/profile'
import {
  getUserProfile,
  calculateEffectiveProfile,
} from '@/lib/profile/profile-sync'

// =============================================================================
// Types
// =============================================================================

export interface ProfileRefinementState {
  /** Merged effective profile (profile + refinement) */
  effectiveProfile: EffectiveProfile | null

  /** Raw refinement state */
  refinementState: RefinementState | null

  /** Loading state */
  isLoading: boolean

  /** Error message if any */
  error: string | null

  /** Whether refinement is enabled for this user */
  isRefinementEnabled: boolean
}

export interface ProfileRefinementActions {
  /** Report a question was answered */
  reportQuestionAnswered: (signal: QuestionSignal) => Promise<void>

  /** Report a session ended */
  reportSessionEnded: (signal: SessionSignal) => Promise<void>

  /** Report a self-assessment was completed */
  reportSelfAssessment: (signal: SelfAssessmentSignal) => Promise<void>

  /** Lock an attribute to prevent automatic updates */
  lockAttribute: (attribute: string) => Promise<boolean>

  /** Unlock an attribute to allow automatic updates */
  unlockAttribute: (attribute: string) => Promise<boolean>

  /** Rollback profile to a previous snapshot */
  rollbackProfile: (snapshotId: string) => Promise<boolean>

  /** Refresh the profile data */
  refresh: () => Promise<void>
}

export interface ProfileHistory {
  id: string
  snapshotType: string
  triggerReason: string
  createdAt: Date
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useProfileRefinement(): ProfileRefinementState & ProfileRefinementActions & {
  history: ProfileHistory[]
  historyLoading: boolean
} {
  const [effectiveProfile, setEffectiveProfile] = useState<EffectiveProfile | null>(null)
  const [refinementState, setRefinementState] = useState<RefinementState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [history, setHistory] = useState<ProfileHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch user ID on mount
  useEffect(() => {
    async function fetchUserId() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    fetchUserId()
  }, [])

  // Fetch profile and refinement state
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch profile and refinement state in parallel
      const [profile, refState] = await Promise.all([
        getUserProfile(userId),
        getRefinementState(userId),
      ])

      if (!profile) {
        setError('Profile not found')
        setEffectiveProfile(null)
        setRefinementState(null)
        setIsLoading(false)
        return
      }

      // Calculate effective profile
      const effective = calculateEffectiveProfile(profile, refState)
      setEffectiveProfile(effective)
      setRefinementState(refState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!userId) return

    setHistoryLoading(true)
    try {
      const historyData = await getProfileHistory(userId, 10)
      setHistory(historyData)
    } catch {
      // History is optional, don't set error
    } finally {
      setHistoryLoading(false)
    }
  }, [userId])

  // Fetch history when userId is available
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Report question answered
  const reportQuestionAnswered = useCallback(
    async (signal: QuestionSignal) => {
      if (!userId) return

      try {
        await processLearningSignal(userId, {
          type: 'question_answered',
          data: signal,
        })

        // Refresh state after signal
        // Use a small delay to allow DB to update
        setTimeout(fetchProfile, 100)
      } catch (err) {
        console.error('Failed to report question signal:', err)
      }
    },
    [userId, fetchProfile]
  )

  // Report session ended
  const reportSessionEnded = useCallback(
    async (signal: SessionSignal) => {
      if (!userId) return

      try {
        await processLearningSignal(userId, {
          type: 'session_ended',
          data: signal,
        })

        // Refresh state after signal
        setTimeout(fetchProfile, 100)
      } catch (err) {
        console.error('Failed to report session signal:', err)
      }
    },
    [userId, fetchProfile]
  )

  // Report self-assessment
  const reportSelfAssessment = useCallback(
    async (signal: SelfAssessmentSignal) => {
      if (!userId) return

      try {
        await processLearningSignal(userId, {
          type: 'self_assessment',
          data: signal,
        })

        // Refresh state after signal
        setTimeout(fetchProfile, 100)
      } catch (err) {
        console.error('Failed to report self-assessment signal:', err)
      }
    },
    [userId, fetchProfile]
  )

  // Lock attribute
  const lockAttribute = useCallback(
    async (attribute: string): Promise<boolean> => {
      if (!userId) return false

      try {
        const success = await lockAttributeFn(userId, attribute)
        if (success) {
          await fetchProfile()
        }
        return success
      } catch {
        return false
      }
    },
    [userId, fetchProfile]
  )

  // Unlock attribute
  const unlockAttribute = useCallback(
    async (attribute: string): Promise<boolean> => {
      if (!userId) return false

      try {
        const success = await unlockAttributeFn(userId, attribute)
        if (success) {
          await fetchProfile()
        }
        return success
      } catch {
        return false
      }
    },
    [userId, fetchProfile]
  )

  // Rollback profile
  const rollbackProfile = useCallback(
    async (snapshotId: string): Promise<boolean> => {
      if (!userId) return false

      try {
        const success = await rollbackProfileFn(userId, snapshotId)
        if (success) {
          await Promise.all([fetchProfile(), fetchHistory()])
        }
        return success
      } catch {
        return false
      }
    },
    [userId, fetchProfile, fetchHistory]
  )

  // Refresh function
  const refresh = useCallback(async () => {
    await Promise.all([fetchProfile(), fetchHistory()])
  }, [fetchProfile, fetchHistory])

  // Determine if refinement is enabled
  const isRefinementEnabled = useMemo(() => {
    return refinementState !== null && refinementState.totalQuestionsAnalyzed > 0
  }, [refinementState])

  return {
    // State
    effectiveProfile,
    refinementState,
    isLoading,
    error,
    isRefinementEnabled,

    // History
    history,
    historyLoading,

    // Actions
    reportQuestionAnswered,
    reportSessionEnded,
    reportSelfAssessment,
    lockAttribute,
    unlockAttribute,
    rollbackProfile,
    refresh,
  }
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Hook to get just the effective profile
 */
export function useEffectiveProfile(): EffectiveProfile | null {
  const { effectiveProfile } = useProfileRefinement()
  return effectiveProfile
}

/**
 * Hook to get difficulty target from refinement
 */
export function useDifficultyTarget(): {
  target: number
  confidence: number
  isLoading: boolean
} {
  const { effectiveProfile, isLoading } = useProfileRefinement()

  return useMemo(
    () => ({
      target: effectiveProfile?.currentDifficultyTarget ?? 3.0,
      confidence: effectiveProfile?.difficultyConfidence ?? 0,
      isLoading,
    }),
    [effectiveProfile, isLoading]
  )
}

/**
 * Hook to get estimated ability from refinement
 */
export function useEstimatedAbility(): {
  ability: number
  isLoading: boolean
} {
  const { effectiveProfile, isLoading } = useProfileRefinement()

  return useMemo(
    () => ({
      ability: effectiveProfile?.estimatedAbility ?? 2.5,
      isLoading,
    }),
    [effectiveProfile, isLoading]
  )
}

export default useProfileRefinement
