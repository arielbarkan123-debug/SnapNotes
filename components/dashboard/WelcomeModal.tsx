'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface WelcomeModalProps {
  onUploadClick: () => void
}

export default function WelcomeModal({ onUploadClick }: WelcomeModalProps) {
  const t = useTranslations('dashboard')
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      // Check if welcome param exists and not previously dismissed
      const params = new URLSearchParams(window.location.search)
      const isWelcome = params.get('welcome') === 'true'
      const isDismissed = localStorage.getItem('notesnap_welcome_dismissed')

      if (isWelcome && !isDismissed) {
        setShow(true)
        // Clean up URL param without reload
        const url = new URL(window.location.href)
        url.searchParams.delete('welcome')
        window.history.replaceState({}, '', url.toString())
      }
    } catch {
      // localStorage may throw SecurityError if storage is disabled
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem('notesnap_welcome_dismissed', 'true')
    } catch {
      // localStorage may be unavailable
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('welcome.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* Pathways */}
        <div className="space-y-3">
          <Link
            href="/homework/check"
            onClick={handleDismiss}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-2xl">📸</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {t('welcome.checkHomework')}
            </span>
          </Link>

          <button
            onClick={() => {
              handleDismiss()
              onUploadClick()
            }}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors w-full text-left"
          >
            <span className="text-2xl">📚</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {t('welcome.uploadCourse')}
            </span>
          </button>

          <Link
            href="/practice"
            onClick={handleDismiss}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-2xl">🎯</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {t('welcome.startPractice')}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
