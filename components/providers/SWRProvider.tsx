'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'
import { fetcher } from '@/lib/fetcher'

interface SWRProviderProps {
  children: ReactNode
}

/**
 * SWR Configuration Provider
 * Wraps the app with default SWR settings for optimal caching behavior
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Default fetcher for all useSWR calls
        fetcher,

        // Don't refetch when window regains focus
        // Users can manually refresh if needed
        revalidateOnFocus: false,

        // Don't refetch when network reconnects
        revalidateOnReconnect: false,

        // Deduplicate requests within 5 seconds
        // Prevents duplicate API calls from multiple components
        dedupingInterval: 5000,

        // Keep previous data while revalidating
        // Shows stale data immediately, then updates when fresh data arrives
        keepPreviousData: true,

        // Retry failed requests up to 3 times
        errorRetryCount: 3,

        // Error retry interval (exponential backoff)
        errorRetryInterval: 5000,

        // Refresh interval (0 = no automatic refresh)
        refreshInterval: 0,

        // Loading timeout (show loading state after this delay)
        loadingTimeout: 3000,

        // Enable suspense mode (optional, can be overridden per-hook)
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}

export default SWRProvider
