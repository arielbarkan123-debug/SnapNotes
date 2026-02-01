'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// =============================================================================
// Component
// =============================================================================

export default function SRSExplainer() {
  const t = useTranslations('review')
  const [isOpen, setIsOpen] = useState(false)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div className="relative inline-block">
      {/* Info Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('howItWorks')}
        type="button"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Content */}
          <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
              {t('howItWorks')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('srsExplainer')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
