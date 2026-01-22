'use client'

import { SWRConfig } from 'swr'
import { type ReactNode, useRef } from 'react'
import { fetcher } from '@/lib/fetcher'

interface SWRProviderProps {
  children: ReactNode
}

// Maximum total retry time (60 seconds)
// After this, stop retrying to avoid infinite loops on flaky networks
const MAX_RETRY_TIMEOUT_MS = 60000

/**
 * SWR Configuration Provider
 * Wraps the app with default SWR settings for optimal caching behavior
 */
export function SWRProvider({ children }: SWRProviderProps) {
  // Track retry start times per key to implement timeout cap
  const retryStartTimes = useRef<Map<string, number>>(new Map())

  return (
    <SWRConfig
      value={{
        // Default fetcher for all useSWR calls
        fetcher,

        // Don't refetch when window regains focus
        // Users can manually refresh if needed
        revalidateOnFocus: false,

        // Refetch when network reconnects (works with OfflineIndicator)
        revalidateOnReconnect: true,

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

        // Custom retry logic with timeout cap
        // Prevents infinite retries on persistently failing requests
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) return

          // Track when retries started for this key
          const now = Date.now()
          const startTime = retryStartTimes.current.get(key)

          if (!startTime) {
            // First retry - record start time
            retryStartTimes.current.set(key, now)
          } else if (now - startTime > MAX_RETRY_TIMEOUT_MS) {
            // Exceeded max retry timeout - stop retrying
            retryStartTimes.current.delete(key)
            console.warn(`[SWR] Stopped retrying ${key} after ${MAX_RETRY_TIMEOUT_MS / 1000}s`)
            return
          }

          // Stop after max retries
          if (retryCount >= (config.errorRetryCount ?? 3)) {
            retryStartTimes.current.delete(key)
            return
          }

          // Exponential backoff: 5s, 10s, 20s...
          const delay = Math.min(
            (config.errorRetryInterval ?? 5000) * Math.pow(2, retryCount),
            30000 // Max 30 second delay
          )

          setTimeout(() => revalidate({ retryCount }), delay)
        },

        // Clear retry tracking on successful fetch
        onSuccess: (_data, key) => {
          retryStartTimes.current.delete(key)
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}

export default SWRProvider
