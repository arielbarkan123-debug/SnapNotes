/**
 * useStats Hook
 *
 * Fetches gamification statistics including XP, level, streak, and achievements.
 * Uses SWR for caching and automatic revalidation.
 *
 * @example
 * ```tsx
 * const { stats, isLoading } = useStats()
 *
 * if (stats) {
 *   console.log(`Level ${stats.level}: ${stats.totalXP} XP`)
 *   console.log(`Streak: ${stats.streak.current} days`)
 * }
 * ```
 */

'use client'

import { useCallback } from 'react'
import useSWR from 'swr'

// ============================================================================
// Types
// ============================================================================

export interface GamificationStats {
  totalXP: number
  level: number
  levelTitle: string
  levelBadge: string
  levelProgress: {
    current: number
    target: number
    percent: number
    xpToNextLevel: number
  }
  streak: {
    current: number
    longest: number
    isAtRisk: boolean
    activeToday: boolean
    hoursRemaining: number
  }
  stats: {
    lessonsCompleted: number
    coursesCompleted: number
    cardsReviewed: number
    perfectLessons: number
  }
  achievements: {
    total: number
    earned: number
    recentlyEarned: string[]
    nextUp: Array<{
      code: string
      name: string
      emoji: string
      percent: number
    }>
  }
}

export interface UseStatsReturn {
  stats: GamificationStats | null
  isLoading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: () => Promise<void>
}

// ============================================================================
// SWR Cache Key
// ============================================================================

export const STATS_CACHE_KEY = '/api/gamification/stats'

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching gamification statistics
 *
 * @returns Object containing stats data, loading state, and control functions
 */
export function useStats(): UseStatsReturn {
  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<GamificationStats>(STATS_CACHE_KEY)

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Mutate function for cache invalidation
  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Convert SWR error to string
  const error = swrError ? (swrError.message || 'Failed to load stats') : null

  return {
    stats: data || null,
    isLoading,
    isValidating,
    error,
    refetch,
    mutate: handleMutate,
  }
}

export default useStats
