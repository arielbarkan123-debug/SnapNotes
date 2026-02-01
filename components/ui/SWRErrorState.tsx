'use client'

import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface SWRErrorStateProps {
  onRetry: () => void
  message?: string
}

export function SWRErrorState({ onRetry, message }: SWRErrorStateProps) {
  const t = useTranslations('common')

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 px-4">
      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        {message || t('error.failedToLoad')}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors"
      >
        {t('error.retry')}
      </button>
    </div>
  )
}

export default SWRErrorState
