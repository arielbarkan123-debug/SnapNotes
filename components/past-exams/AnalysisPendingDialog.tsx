'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'

interface AnalysisPendingDialogProps {
  isOpen: boolean
  onClose: () => void
  onWait: () => void
  onSkip: () => void
  templateTitle: string
}

export default function AnalysisPendingDialog({
  isOpen,
  onClose,
  onWait,
  onSkip,
  templateTitle,
}: AnalysisPendingDialogProps) {
  const t = useTranslations('pastExams')
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  // Prevent body scroll when modal is open (only register cleanup when lock is applied)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Focus dialog on open
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-pending-title"
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 end-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Spinner */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin" />
        </div>

        {/* Title */}
        <h3
          id="analysis-pending-title"
          className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2"
        >
          {t('analysisPending.title')}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          {t('analysisPending.message', { title: templateTitle })}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onWait}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            {t('analysisPending.waitButton')}
          </button>
          <button
            onClick={onSkip}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('analysisPending.skipButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
