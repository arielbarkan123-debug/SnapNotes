'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import type { PastExamTemplate, PastExamTemplatesResponse } from '@/types/past-exam'

export const PAST_EXAMS_CACHE_KEY = '/api/past-exams'

export interface UsePastExamTemplatesReturn {
  templates: PastExamTemplate[]
  count: number
  limit: number
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

export function usePastExamTemplates(): UsePastExamTemplatesReturn {
  const { data, error: swrError, isLoading, isValidating, mutate } = useSWR<PastExamTemplatesResponse>(
    PAST_EXAMS_CACHE_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const templates = data?.templates || []
  const count = data?.count || 0
  const limit = data?.limit || 3
  const canUpload = count < limit

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
    canUpload,
    isLoading,
    isValidating,
    error,
    refetch,
    mutate: handleMutate,
  }
}
