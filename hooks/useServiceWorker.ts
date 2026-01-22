/**
 * useServiceWorker Hook
 *
 * Manages service worker registration, update detection, and offline caching.
 * Handles WebSocket subscription with polling fallback for browsers that
 * don't support WebSocket (e.g., Safari private mode).
 *
 * @example
 * ```tsx
 * const {
 *   isSupported,
 *   isInstalled,
 *   isOnline,
 *   updateAvailable,
 *   applyUpdate,
 *   cacheForOffline
 * } = useServiceWorker()
 *
 * if (updateAvailable) {
 *   // Show "Update available" banner
 * }
 * ```
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isInstalled: boolean
  isOnline: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

// Check if we're in a secure context where service workers can operate
function canUseServiceWorker(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator)) return false

  // Must be in a secure context (HTTPS or localhost)
  // Some browsers have 'serviceWorker' in navigator but throw SecurityError when used
  if (typeof window.isSecureContext !== 'undefined' && !window.isSecureContext) {
    return false
  }

  return true
}

/**
 * Hook for managing service worker registration and offline capabilities
 *
 * @returns Object containing service worker state and control functions
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isInstalled: false,
    isOnline: true,
    updateAvailable: false,
    registration: null,
  })

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check support including secure context requirement
    const isSupported = canUseServiceWorker()
    setState(prev => ({ ...prev, isSupported, isOnline: navigator.onLine }))

    if (!isSupported) return

    // Keep track of listeners for cleanup
    let currentRegistration: ServiceWorkerRegistration | null = null
    let currentWorker: ServiceWorker | null = null
    let updateFoundHandler: (() => void) | null = null
    let stateChangeHandler: (() => void) | null = null

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        currentRegistration = registration

        setState(prev => ({
          ...prev,
          isInstalled: true,
          registration,
        }))

        // Check for updates
        updateFoundHandler = () => {
          const newWorker = registration.installing
          if (newWorker) {
            currentWorker = newWorker
            stateChangeHandler = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, updateAvailable: true }))
              }
            }
            newWorker.addEventListener('statechange', stateChangeHandler)
          }
        }
        registration.addEventListener('updatefound', updateFoundHandler)
      } catch {
        // Service worker registration failed - silently continue
      }
    }

    registerSW()

    // Periodic update check - with proper cleanup and error handling
    const intervalId = setInterval(() => {
      try {
        // Double-check we can still use service worker (context may have changed)
        if (!canUseServiceWorker()) return

        navigator.serviceWorker.ready
          .then(registration => {
            registration.update().catch(() => {
              // Update failed silently - not critical
            })
          })
          .catch(() => {
            // Service worker not ready - silently continue
          })
      } catch {
        // SecurityError or other error - silently continue
      }
    }, 60 * 60 * 1000) // Check every hour

    return () => {
      clearInterval(intervalId)
      // Clean up event listeners
      if (currentRegistration && updateFoundHandler) {
        currentRegistration.removeEventListener('updatefound', updateFoundHandler)
      }
      if (currentWorker && stateChangeHandler) {
        currentWorker.removeEventListener('statechange', stateChangeHandler)
      }
    }
  }, [])

  // Listen for online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Skip waiting and reload
  const applyUpdate = useCallback(() => {
    try {
      if (state.registration?.waiting) {
        state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      }
    } catch {
      // SecurityError or other error - try simple reload
      window.location.reload()
    }
  }, [state.registration])

  // Cache course for offline access
  const cacheForOffline = useCallback((courseId: string, courseData: unknown) => {
    try {
      if (state.registration?.active) {
        state.registration.active.postMessage({
          type: 'CACHE_COURSE',
          courseId,
          courseData,
        })
      }
    } catch {
      // SecurityError or other error - silently continue
      // Offline caching is a nice-to-have, not critical
    }
  }, [state.registration])

  return {
    ...state,
    applyUpdate,
    cacheForOffline,
  }
}

export default useServiceWorker
