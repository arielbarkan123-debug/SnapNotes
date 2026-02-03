'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * Shows a banner when user goes offline or comes back online
 */
export function OfflineIndicator() {
  const t = useTranslations('errors')
  const { isOnline, wasOffline, clearReconnectionFlag } = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch - only render after client mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show "reconnected" message briefly when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
        clearReconnectionFlag()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [wasOffline, isOnline, clearReconnectionFlag])

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          {t('offline')} {t('offlineDescription')}
        </span>
      </div>
    )
  }

  // Show "reconnected" message
  if (showReconnected) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-fade-in">
        <Wifi className="w-4 h-4" />
        <span className="text-sm font-medium">
          {t('backOnline')}
        </span>
      </div>
    )
  }

  return null
}

export default OfflineIndicator
