/**
 * usePastExamTemplates Hook
 *
 * Fetches user's uploaded past exam templates with per-subject upload limit tracking.
 * Templates are used to generate practice exams in a familiar format.
 *
 * @example
 * ```tsx
 * // All templates
 * const { templates, canUpload, count, limit } = usePastExamTemplates()
 *
 * // Filter by subject
 * const { templates, canUpload, subjectCount } = usePastExamTemplates('biology-hl')
 *
 * if (canUpload) {
 *   // Show upload button
 * } else {
 *   console.log(`Upload limit reached for this subject`)
 * }
 * ```
 */

'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import type { PastExamTemplate, PastExamTemplatesResponse } from '@/types/past-exam'

export const PAST_EXAMS_CACHE_KEY = '/api/past-exams'

export interface UsePastExamTemplatesReturn {
  templates: PastExamTemplate[]
  count: number
  limit: number
  /** Count for the filtered subject (only set when subjectId is provided) */
  subjectCount: number | undefined
  /** The subject being filtered (only set when subjectId is provided) */
  filteredSubject: string | undefined
  /** Whether the user can upload more templates for this subject */
  canUpload: boolean
  isLoading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: () => Promise<void>
}

async function fetcher(url: string): Promise<PastExamTemplatesResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch templates')
  }
  return response.json()
}

/**
 * Hook for fetching past exam templates
 *
 * @param subjectId - Optional subject ID to filter templates by (e.g., "biology-hl")
 * @returns Object containing templates, upload status, and control functions
 */
export function usePastExamTemplates(subjectId?: string): UsePastExamTemplatesReturn {
  // Build cache key with subject filter
  const cacheKey = subjectId
    ? `${PAST_EXAMS_CACHE_KEY}?subjectId=${encodeURIComponent(subjectId)}`
    : PAST_EXAMS_CACHE_KEY

  const { data, error: swrError, isLoading, isValidating, mutate } = useSWR<PastExamTemplatesResponse>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const templates = data?.templates || []
  const count = data?.count || 0
  const limit = data?.limit || 3
  const subjectCount = data?.subjectCount
  const filteredSubject = data?.filteredSubject ?? undefined

  // canUpload is based on subject count when filtering, otherwise total count
  const currentCount = subjectId ? (subjectCount ?? count) : count
  const canUpload = currentCount < limit

  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  const error = swrError ? (swrError.message || 'Failed to load templates') : null

  return {
    templates,
    count,
    limit,
    subjectCount,
    filteredSubject,
    canUpload,
    isLoading,
    isValidating,
    error,
    refetch,
    mutate: handleMutate,
  }
}
