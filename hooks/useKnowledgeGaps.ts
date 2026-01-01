import useSWR from 'swr'
import type { UserGapsResponse } from '@/lib/concepts/types'

const fetcher = async (url: string): Promise<UserGapsResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch knowledge gaps')
  }
  return res.json()
}

export const GAPS_CACHE_KEY = '/api/user/gaps'

export interface UseKnowledgeGapsOptions {
  courseId?: string
  enabled?: boolean
}

export interface UseKnowledgeGapsReturn {
  gaps: UserGapsResponse['gaps']
  totalGaps: number
  criticalGaps: number
  resolvedRecently: number
  isLoading: boolean
  error: Error | undefined
  refetch: () => Promise<void>
}

export function useKnowledgeGaps(options?: UseKnowledgeGapsOptions): UseKnowledgeGapsReturn {
  const { courseId, enabled = true } = options || {}

  // Build URL with optional courseId filter
  let url = GAPS_CACHE_KEY
  if (courseId) {
    url += `?courseId=${courseId}`
  }

  const { data, error, isLoading, mutate } = useSWR<UserGapsResponse>(
    enabled ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  const refetch = async () => {
    await mutate()
  }

  return {
    gaps: data?.gaps || [],
    totalGaps: data?.totalGaps || 0,
    criticalGaps: data?.criticalGaps || 0,
    resolvedRecently: data?.resolvedRecently || 0,
    isLoading,
    error,
    refetch,
  }
}
