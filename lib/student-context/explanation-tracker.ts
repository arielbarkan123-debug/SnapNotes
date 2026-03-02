'use client'

import { useCallback, useRef } from 'react'

/**
 * Client-side hook for tracking explanation engagement.
 *
 * Tracks how long a student spends reading an explanation, scroll depth,
 * and whether they expanded details. Sends data to the tracking API on
 * stopTracking (uses navigator.sendBeacon for reliability on unmount).
 */
export function useExplanationTracker(sourceType: string, sourceId?: string) {
  const startTimeRef = useRef<number | null>(null)
  const scrollDepthRef = useRef<number>(0)
  const didExpandRef = useRef<boolean>(false)
  const questionIdRef = useRef<string | undefined>(undefined)

  const startTracking = useCallback((questionId?: string) => {
    startTimeRef.current = Date.now()
    scrollDepthRef.current = 0
    didExpandRef.current = false
    questionIdRef.current = questionId
  }, [])

  const onScroll = useCallback((depthPercent: number) => {
    scrollDepthRef.current = Math.max(scrollDepthRef.current, Math.min(100, Math.round(depthPercent)))
  }, [])

  const onExpand = useCallback(() => {
    didExpandRef.current = true
  }, [])

  const stopTracking = useCallback(() => {
    if (startTimeRef.current === null) return

    const timeSpentReadingMs = Date.now() - startTimeRef.current
    startTimeRef.current = null

    // Only send if user spent more than 1 second reading
    if (timeSpentReadingMs < 1000) return

    const payload = JSON.stringify({
      sourceType,
      sourceId: sourceId || null,
      questionId: questionIdRef.current || null,
      timeSpentReadingMs,
      scrollDepthPercent: scrollDepthRef.current,
      didExpandDetails: didExpandRef.current,
    })

    // Use sendBeacon for reliability (works on page unload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/tracking/explanation-engagement', payload)
    } else {
      // Fallback to fetch
      fetch('/api/tracking/explanation-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently fail — tracking is non-critical
      })
    }
  }, [sourceType, sourceId])

  return { startTracking, stopTracking, onScroll, onExpand }
}
