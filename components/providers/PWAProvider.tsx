'use client'

import { ReactNode, createContext, useContext, useState, useEffect } from 'react'
import { useServiceWorker } from '@/hooks'

interface PWAContextType {
  isOnline: boolean
  isInstalled: boolean
  updateAvailable: boolean
  applyUpdate: () => void
  cacheForOffline: (courseId: string, courseData: unknown) => void
  showInstallPrompt: boolean
  installApp: () => void
  dismissInstallPrompt: () => void
}

const PWAContext = createContext<PWAContextType>({
  isOnline: true,
  isInstalled: false,
  updateAvailable: false,
  applyUpdate: () => {},
  cacheForOffline: () => {},
  showInstallPrompt: false,
  installApp: () => {},
  dismissInstallPrompt: () => {},
})

export function usePWA() {
  return useContext(PWAContext)
}

interface PWAProviderProps {
  children: ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const sw = useServiceWorker()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Listen for install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already dismissed
    const dismissedTime = localStorage.getItem('pwa-install-dismissed')
    if (dismissedTime) {
      const daysSince = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) {
        setDismissed(true)
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!dismissed) {
        setShowInstallPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [dismissed])

  const installApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  return (
    <PWAContext.Provider
      value={{
        isOnline: sw.isOnline,
        isInstalled: sw.isInstalled,
        updateAvailable: sw.updateAvailable,
        applyUpdate: sw.applyUpdate,
        cacheForOffline: sw.cacheForOffline,
        showInstallPrompt: showInstallPrompt && !!deferredPrompt,
        installApp,
        dismissInstallPrompt,
      }}
    >
      {children}

      {/* Offline Banner */}
      {!sw.isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 py-2 px-4 text-center text-sm font-medium">
          You&apos;re offline. Some features may be limited.
        </div>
      )}

      {/* Update Available Banner */}
      {sw.updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Update Available</p>
            <p className="text-sm text-indigo-200">A new version of NoteSnap is ready.</p>
          </div>
          <button
            onClick={sw.applyUpdate}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">Install NoteSnap</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add to your home screen for quick access and offline studying.</p>
            </div>
            <button
              onClick={dismissInstallPrompt}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={dismissInstallPrompt}
              className="flex-1 py-2 px-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
            >
              Not Now
            </button>
            <button
              onClick={installApp}
              className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  )
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default PWAProvider
