'use client'

import { useEffect, useRef } from 'react'

/**
 * Client-side hook for tracking feature affinity.
 *
 * On mount: records start time.
 * On unmount: sends time spent via navigator.sendBeacon.
 * Only tracks if more than 2 seconds were spent on the feature.
 *
 * @param featureName  Identifier for the feature (e.g., 'practice', 'homework', 'dashboard')
 * @param isVoluntary  Whether the user navigated here voluntarily (true) or was nudged/redirected (false)
 */
export function useFeatureTracker(featureName: string, isVoluntary: boolean = true) {
  const startTimeRef = useRef<number>(Date.now())
  const featureRef = useRef(featureName)
  const voluntaryRef = useRef(isVoluntary)

  // Keep refs up to date if props change
  featureRef.current = featureName
  voluntaryRef.current = isVoluntary

  useEffect(() => {
    startTimeRef.current = Date.now()

    return () => {
      const timeSpentMs = Date.now() - startTimeRef.current

      // Only track if user spent more than 2 seconds
      if (timeSpentMs < 2000) return

      const payload = JSON.stringify({
        featureName: featureRef.current,
        timeSpentMs,
        isVoluntary: voluntaryRef.current,
      })

      // Use sendBeacon for reliability (works on page unload)
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/tracking/feature-affinity', payload)
      } else {
        fetch('/api/tracking/feature-affinity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Silently fail — tracking is non-critical
        })
      }
    }
  }, []) // Empty deps: track entire component lifecycle
}
