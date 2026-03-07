'use client'

import { ArrowLeft, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface WalkthroughHeaderProps {
  currentStep: number
  totalSteps: number
  onClose: () => void
  isHe?: boolean
}

export default function WalkthroughHeader({
  currentStep,
  totalSteps,
  onClose,
  isHe,
}: WalkthroughHeaderProps) {
  const t = useTranslations('homework')

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-violet-50/50 dark:bg-violet-900/10">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={isHe ? 'חזרה' : 'Back'}
        >
          <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {t('walkthrough.title')}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label={isHe ? 'סגור' : 'Close'}
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  )
}
