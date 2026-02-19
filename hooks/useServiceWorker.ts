'use client'

import { useEffect, useState } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isOnline: boolean
}

/**
 * Simplified SW hook — only unregisters old service workers and tracks online status.
 * The actual service worker (sw.js) is now a self-destructing no-op that clears all caches.
 * We register it once to trigger the browser to fetch the new version, which will
 * replace the old caching SW and nuke all stale content.
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isOnline: true,
  })

  // Register the self-destructing SW to replace any old one
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const isSupported = true
    setState(prev => ({ ...prev, isSupported, isOnline: navigator.onLine }))

    // Register sw.js — the browser will byte-compare with the old one.
    // Since sw.js is now different, the browser will install the new version.
    // The new SW does skipWaiting() + clears all caches + stops intercepting fetches.
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
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

  return {
    ...state,
    // Keep these for backwards compat with PWAProvider
    isInstalled: false,
    updateAvailable: false,
    registration: null,
    applyUpdate: () => {},
    cacheForOffline: () => {},
  }
}

export default useServiceWorker
