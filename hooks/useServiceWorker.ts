'use client'

import { useEffect, useState, useCallback } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isInstalled: boolean
  isOnline: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

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

    // Check support
    const isSupported = 'serviceWorker' in navigator
    setState(prev => ({ ...prev, isSupported, isOnline: navigator.onLine }))

    if (!isSupported) return

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        console.log('[PWA] Service worker registered:', registration.scope)

        setState(prev => ({
          ...prev,
          isInstalled: true,
          registration,
        }))

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, updateAvailable: true }))
              }
            })
          }
        })
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error)
      }
    }

    registerSW()

    // Periodic update check - with proper cleanup
    const intervalId = setInterval(() => {
      navigator.serviceWorker.ready.then(registration => {
        registration.update()
      })
    }, 60 * 60 * 1000) // Check every hour

    return () => {
      clearInterval(intervalId)
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
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }, [state.registration])

  // Cache course for offline access
  const cacheForOffline = useCallback((courseId: string, courseData: unknown) => {
    if (state.registration?.active) {
      state.registration.active.postMessage({
        type: 'CACHE_COURSE',
        courseId,
        courseData,
      })
    }
  }, [state.registration])

  return {
    ...state,
    applyUpdate,
    cacheForOffline,
  }
}

export default useServiceWorker
