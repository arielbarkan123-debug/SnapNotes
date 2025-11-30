'use client'

import { useCallback } from 'react'
import useSWR from 'swr'

// ============================================================================
// Types
// ============================================================================

export interface StreakData {
  streak: {
    current: number
    longest: number
    isAtRisk: boolean
    activeToday: boolean
    hoursRemaining: number
  }
  streakExtended: boolean
  streakBroken: boolean
  previousStreak?: number
}

export interface UseStreakReturn {
  streak: StreakData['streak'] | null
  streakExtended: boolean
  streakBroken: boolean
  previousStreak: number | undefined
  isLoading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: () => Promise<void>
}

// ============================================================================
// SWR Cache Key
// ============================================================================

export const STREAK_CACHE_KEY = '/api/gamification/streak'

// ============================================================================
// Hook Implementation
// ============================================================================

export function useStreak(): UseStreakReturn {
  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<StreakData>(STREAK_CACHE_KEY)

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Mutate function for cache invalidation
  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Convert SWR error to string
  const error = swrError ? (swrError.message || 'Failed to load streak') : null

  return {
    streak: data?.streak || null,
    streakExtended: data?.streakExtended || false,
    streakBroken: data?.streakBroken || false,
    previousStreak: data?.previousStreak,
    isLoading,
    isValidating,
    error,
    refetch,
    mutate: handleMutate,
  }
}

export default useStreak
