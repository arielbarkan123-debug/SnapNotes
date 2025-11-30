'use client'

import { useCallback } from 'react'
import useSWR from 'swr'

// ============================================================================
// Types
// ============================================================================

export interface ProgressOverview {
  studyTime: {
    week: number
    month: number
  }
  cardsReviewed: {
    count: number
    trend: number
  }
  accuracy: {
    percent: number
    trend: number
  }
  mastery: {
    percent: number
    totalLessons: number
  }
}

export interface AccuracyChartPoint {
  date: string
  accuracy: number
  count: number
}

export interface TimeChartPoint {
  date: string
  minutes: number
  dayLabel: string
}

export interface LessonMastery {
  id: string
  title: string
  order: number
  mastery: number
  completed: boolean
}

export interface CourseMastery {
  id: string
  title: string
  coverImage: string | null
  mastery: number
  lessons: LessonMastery[]
  lessonCount: number
  completedCount: number
}

export interface LessonArea {
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  mastery: number
  completed: boolean
}

export interface Insight {
  icon: string
  text: string
  type: 'positive' | 'neutral' | 'suggestion'
}

export interface ProgressData {
  overview: ProgressOverview
  accuracyChart: AccuracyChartPoint[]
  timeChart: TimeChartPoint[]
  masteryMap: CourseMastery[]
  weakAreas: LessonArea[]
  strongAreas: LessonArea[]
  insights: Insight[]
}

export interface UseProgressReturn {
  data: ProgressData | null
  isLoading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: () => Promise<void>
}

// ============================================================================
// SWR Cache Key
// ============================================================================

export const PROGRESS_CACHE_KEY = '/api/progress'

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProgress(): UseProgressReturn {
  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ProgressData>(PROGRESS_CACHE_KEY)

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Mutate function for cache invalidation
  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Convert SWR error to string
  const error = swrError ? (swrError.message || 'Failed to load progress') : null

  return {
    data: data || null,
    isLoading,
    isValidating,
    error,
    refetch,
    mutate: handleMutate,
  }
}

export default useProgress
