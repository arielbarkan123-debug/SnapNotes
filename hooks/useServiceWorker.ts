'use client'

import { useEffect, useState, useCallback } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isInstalled: boolean
  isOnline: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

function canUseServiceWorker(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator)) return false
  if (typeof window.isSecureContext !== 'undefined' && !window.isSecureContext) {
    return false
  }
  return true
}

// One-time cache purge: wipe old v1 caches and reload so the new SW takes over
async function purgeOldCaches(): Promise<boolean> {
  if (typeof caches === 'undefined') return false

  try {
    const keys = await caches.keys()
    const oldCaches = keys.filter(k => k.includes('-v1'))

    if (oldCaches.length === 0) return false

    // Already purged this session — don't loop
    if (sessionStorage.getItem('sw-cache-purged')) return false

    sessionStorage.setItem('sw-cache-purged', '1')

    await Promise.all(oldCaches.map(k => caches.delete(k)))
    console.log('[SW] Purged old caches:', oldCaches)

    return true // signal that we purged and should reload
  } catch {
    return false
  }
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isInstalled: false,
    isOnline: true,
    updateAvailable: false,
    registration: null,
  })

  // Register service worker + auto-apply updates
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isSupported = canUseServiceWorker()
    setState(prev => ({ ...prev, isSupported, isOnline: navigator.onLine }))

    if (!isSupported) return

    let currentRegistration: ServiceWorkerRegistration | null = null
    let currentWorker: ServiceWorker | null = null
    let updateFoundHandler: (() => void) | null = null
    let stateChangeHandler: (() => void) | null = null

    // Auto-apply: when a new SW is waiting, activate it and reload once
    function autoApplyUpdate(registration: ServiceWorkerRegistration) {
      const waiting = registration.waiting
      if (!waiting) return

      // Guard: only reload once per session for auto-updates
      if (sessionStorage.getItem('sw-auto-updated')) {
        setState(prev => ({ ...prev, updateAvailable: true }))
        return
      }

      sessionStorage.setItem('sw-auto-updated', '1')
      waiting.postMessage({ type: 'SKIP_WAITING' })

      // Listen for the new SW to take control, then reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      }, { once: true })
    }

    const registerSW = async () => {
      try {
        // First: purge old caches if they exist
        const purged = await purgeOldCaches()
        if (purged) {
          // Unregister old SW so the new one installs fresh
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map(r => r.unregister()))
          window.location.reload()
          return
        }

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        currentRegistration = registration

        setState(prev => ({
          ...prev,
          isInstalled: true,
          registration,
        }))

        // If there's already a waiting worker, auto-apply immediately
        if (registration.waiting) {
          autoApplyUpdate(registration)
          return
        }

        // Listen for new workers
        updateFoundHandler = () => {
          const newWorker = registration.installing
          if (newWorker) {
            currentWorker = newWorker
            stateChangeHandler = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Auto-apply instead of just showing banner
                autoApplyUpdate(registration)
              }
            }
            newWorker.addEventListener('statechange', stateChangeHandler)
          }
        }
        registration.addEventListener('updatefound', updateFoundHandler)

        // Force an immediate update check
        registration.update().catch(() => {})
      } catch {
        // Service worker registration failed - silently continue
      }
    }

    registerSW()

    // Check for updates every hour
    const intervalId = setInterval(() => {
      try {
        if (!canUseServiceWorker()) return
        navigator.serviceWorker.ready
          .then(registration => {
            registration.update().catch(() => {})
          })
          .catch(() => {})
      } catch {}
    }, 60 * 60 * 1000)

    return () => {
      clearInterval(intervalId)
      if (currentRegistration && updateFoundHandler) {
        currentRegistration.removeEventListener('updatefound', updateFoundHandler)
      }
      if (currentWorker && stateChangeHandler) {
        currentWorker.removeEventListener('statechange', stateChangeHandler)
      }
    }
  }, [])

  // Online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Manual update apply (fallback if auto didn't work)
  const applyUpdate = useCallback(() => {
    try {
      if (state.registration?.waiting) {
        state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        }, { once: true })
      }
    } catch {
      window.location.reload()
    }
  }, [state.registration])

  const cacheForOffline = useCallback((courseId: string, courseData: unknown) => {
    try {
      if (state.registration?.active) {
        state.registration.active.postMessage({
          type: 'CACHE_COURSE',
          courseId,
          courseData,
        })
      }
    } catch {}
  }, [state.registration])

  return {
    ...state,
    applyUpdate,
    cacheForOffline,
  }
}

export default useServiceWorker
