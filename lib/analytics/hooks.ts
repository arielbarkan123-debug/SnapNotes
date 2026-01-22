'use client'

// ============================================================================
// Analytics React Hooks
// ============================================================================

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from './client'
import { type EventCategory, type TrackedFeature } from './types'

/**
 * Initialize analytics and track page views automatically
 * Should be used once in the root layout
 */
export function useAnalytics(userId?: string | null): void {
  const pathname = usePathname()
  const prevPathRef = useRef<string>('')
  const isInitializedRef = useRef(false)

  // Initialize analytics on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      analytics.initialize(userId)
      isInitializedRef.current = true
    }
  }, [userId])

  // Update user ID when it changes
  useEffect(() => {
    if (isInitializedRef.current) {
      analytics.setUserId(userId || null)
    }
  }, [userId])

  // Track page views on route change
  useEffect(() => {
    if (pathname && pathname !== prevPathRef.current) {
      // Safe document.title access
      const title = typeof document !== 'undefined' ? document.title : ''
      analytics.trackPageView(pathname, title)
      prevPathRef.current = pathname
    }
  }, [pathname])
}

/**
 * Track page views only (for components that need manual tracking)
 */
export function usePageTracking(): void {
  const pathname = usePathname()
  const prevPathRef = useRef<string>('')

  useEffect(() => {
    if (pathname && pathname !== prevPathRef.current) {
      // Safe document.title access
      const title = typeof document !== 'undefined' ? document.title : ''
      analytics.trackPageView(pathname, title)
      prevPathRef.current = pathname
    }
  }, [pathname])
}

/**
 * Hook for tracking custom events
 */
export function useEventTracking() {
  return useMemo(
    () => ({
      /**
       * Track a generic event
       */
      trackEvent: (
        name: string,
        category: EventCategory,
        properties?: Record<string, unknown>
      ) => {
        analytics.trackEvent({ name, category, properties })
      },

      /**
       * Track a click interaction
       */
      trackClick: (elementName: string, properties?: Record<string, unknown>) => {
        analytics.trackEvent({
          name: 'click',
          category: 'interaction',
          properties: { element: elementName, ...properties },
        })
      },

      /**
       * Track feature usage
       */
      trackFeature: (featureName: TrackedFeature | string, properties?: Record<string, unknown>) => {
        analytics.trackFeature(featureName, properties)
      },

      /**
       * Track navigation
       */
      trackNavigation: (from: string, to: string, properties?: Record<string, unknown>) => {
        analytics.trackEvent({
          name: 'navigation',
          category: 'navigation',
          properties: { from, to, ...properties },
        })
      },

      /**
       * Track search
       */
      trackSearch: (query: string, resultCount: number, properties?: Record<string, unknown>) => {
        analytics.trackEvent({
          name: 'search',
          category: 'feature',
          properties: { query, resultCount, ...properties },
        })
      },
    }),
    []
  )
}

/**
 * Hook for tracking errors
 */
export function useErrorTracking() {
  // Set up global error handlers on mount
  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return

    const getPagePath = () => {
      try {
        return window.location?.pathname || ''
      } catch {
        return ''
      }
    }

    const handleError = (event: ErrorEvent) => {
      analytics.trackError({
        type: 'javascript',
        message: event.message,
        stackTrace: event.error?.stack,
        pagePath: getPagePath(),
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackError({
        type: 'unhandled',
        message: String(event.reason),
        stackTrace: event.reason?.stack,
        pagePath: getPagePath(),
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return useMemo(
    () => {
      // Helper for safe page path access
      const getPagePath = () => {
        if (typeof window === 'undefined') return ''
        try {
          return window.location?.pathname || ''
        } catch {
          return ''
        }
      }

      return {
        /**
         * Track a caught error
         */
        trackError: (error: Error, componentName?: string, context?: Record<string, unknown>) => {
          analytics.trackError({
            type: 'javascript',
            message: error.message,
            stackTrace: error.stack,
            pagePath: getPagePath(),
            componentName,
            context,
          })
        },

        /**
         * Track an API error
         */
        trackApiError: (
          endpoint: string,
          status: number,
          message: string,
          method?: string,
          context?: Record<string, unknown>
        ) => {
          analytics.trackError({
            type: 'api',
            message,
            apiEndpoint: endpoint,
            httpStatus: status,
            httpMethod: method,
            pagePath: getPagePath(),
            context,
          })
        },

        /**
         * Track a network error
         */
        trackNetworkError: (message: string, context?: Record<string, unknown>) => {
          analytics.trackError({
            type: 'network',
            message,
            pagePath: getPagePath(),
            context,
          })
        },
      }
    },
    []
  )
}

/**
 * Hook for tracking funnel progress
 */
export function useFunnelTracking(funnelName: string) {
  const stepTimestamps = useRef<Map<number, number>>(new Map())

  const trackStep = useCallback(
    (stepName: string, stepOrder: number, properties?: Record<string, unknown>) => {
      const now = Date.now()
      let timeFromPrevious: number | undefined

      // Calculate time from previous step
      const prevStepTime = stepTimestamps.current.get(stepOrder - 1)
      if (prevStepTime) {
        timeFromPrevious = now - prevStepTime
      }

      // Store this step's timestamp
      stepTimestamps.current.set(stepOrder, now)

      analytics.trackFunnelStep({
        funnelName,
        stepName,
        stepOrder,
        properties,
        timeFromPreviousStepMs: timeFromPrevious,
      })
    },
    [funnelName]
  )

  const resetFunnel = useCallback(() => {
    stepTimestamps.current.clear()
    analytics.resetFunnel(funnelName)
  }, [funnelName])

  return { trackStep, resetFunnel }
}

/**
 * Hook for tracking time spent on a component/feature
 */
export function useTimeTracking(featureName: string) {
  const startTime = useRef<number>(0)

  useEffect(() => {
    startTime.current = Date.now()

    return () => {
      const duration = Date.now() - startTime.current
      analytics.trackEvent({
        name: `${featureName}_time`,
        category: 'engagement',
        properties: { durationMs: duration },
      })
    }
  }, [featureName])
}

/**
 * Hook for creating tracked click handlers
 */
export function useTrackedClick(
  eventName: string,
  properties?: Record<string, unknown>
) {
  return useCallback(
    (e: React.MouseEvent) => {
      const target = e.currentTarget as HTMLElement
      analytics.trackClick(
        eventName,
        { x: Math.round(e.clientX), y: Math.round(e.clientY) },
        {
          id: target.id || undefined,
          className: target.className || undefined,
          text: target.textContent?.trim().slice(0, 50) || undefined,
        },
        properties
      )
    },
    [eventName, properties]
  )
}

/**
 * Higher-order hook to wrap any action with tracking
 */
export function useTrackedAction<T extends (...args: unknown[]) => unknown>(
  action: T,
  eventName: string,
  category: EventCategory = 'feature'
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: unknown[]) => {
      analytics.trackEvent({
        name: eventName,
        category,
        properties: { args: args.length > 0 ? args : undefined },
      })
      return action(...args)
    }) as T,
    [action, eventName, category]
  )
}
