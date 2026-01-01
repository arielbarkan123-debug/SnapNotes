'use client'

import { useState, useEffect, useCallback } from 'react'

interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean
  lastOnlineAt: Date | null
}

/**
 * Hook to detect online/offline status with reconnection awareness
 *
 * @returns Object with online status and utility functions
 */
export function useOnlineStatus() {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
  })

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      isOnline: true,
      wasOffline: !prev.isOnline ? true : prev.wasOffline,
      lastOnlineAt: new Date(),
    }))
  }, [])

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
    }))
  }, [])

  // Reset wasOffline flag (call after showing reconnection message)
  const clearReconnectionFlag = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      wasOffline: false,
    }))
  }, [])

  useEffect(() => {
    // Set initial state
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
    }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return {
    ...status,
    clearReconnectionFlag,
  }
}

export default useOnlineStatus
