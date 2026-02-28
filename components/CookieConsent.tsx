'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

const CONSENT_KEY = 'cookie-consent-accepted'

export default function CookieConsent() {
  const t = useTranslations('legal.cookie')
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Only show banner if consent hasn't been given yet
    try {
      const consent = localStorage.getItem(CONSENT_KEY)
      if (!consent) {
        setShowBanner(true)
      }
    } catch {
      // localStorage not available — don't show banner
    }
  }, [])

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'true')
    } catch {
      // localStorage not available — accept silently
    }
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center sm:text-start flex-1">
          {t('message')}{' '}
          <Link
            href="/privacy"
            className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
          >
            {t('learnMore')}
          </Link>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-full transition-colors min-h-[40px]"
        >
          {t('accept')}
        </button>
      </div>
    </div>
  )
}
