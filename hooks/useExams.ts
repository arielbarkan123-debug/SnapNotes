/**
 * useExams Hook
 *
 * Fetches and manages exam data for the current user with SWR caching.
 *
 * @example
 * ```tsx
 * const { exams, isLoading, refetch } = useExams()
 *
 * // Filter by course
 * const { exams } = useExams({ courseId: 'course-123' })
 * ```
 */

'use client'

import { useCallback } from 'react'
import useSWR from 'swr'

// ============================================================================
// Types
// ============================================================================

export interface Exam {
  id: string
  course_id: string
  title: string
  question_count: number
  time_limit_minutes: number
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  score: number | null
  total_points: number | null
  percentage: number | null
  grade: string | null
  created_at: string
  courses?: {
    title: string
  }
}

interface ExamsApiResponse {
  success: boolean
  exams: Exam[]
}

export interface UseExamsOptions {
  courseId?: string
}

export interface UseExamsReturn {
  exams: Exam[]
  isLoading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: () => Promise<void>
}

// ============================================================================
// SWR Cache Key
// ============================================================================

export const EXAMS_CACHE_KEY = '/api/exams'

export function getExamsCacheKey(courseId?: string) {
  return courseId ? `${EXAMS_CACHE_KEY}?courseId=${courseId}` : EXAMS_CACHE_KEY
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching and managing exam data
 *
 * @param options - Configuration options
 * @param options.courseId - Optional course ID to filter exams
 * @returns Object containing exams data, loading state, and control functions
 */
export function useExams(options: UseExamsOptions = {}): UseExamsReturn {
  const { courseId } = options

  const cacheKey = getExamsCacheKey(courseId)

  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ExamsApiResponse>(cacheKey, {
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      if (retryCount >= 3) return
      setTimeout(() => revalidate({ retryCount }), 5000)
    },
  })

  // Extract exams from response
  const exams = data?.exams || []

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Mutate function for cache invalidation
  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Convert SWR error to string
  const error = swrError ? (swrError.message || 'Failed to load exams') : null

  return {
    exams,
    isLoading,
    isValidating,
    error,
    refetch,
    mutate: handleMutate,
  }
}

export default useExams
