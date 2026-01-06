'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import type { CurriculumSetupStatus } from '@/lib/curriculum/types'

interface CurriculumSetupPromptProps {
  status: CurriculumSetupStatus
  className?: string
  dismissible?: boolean
  storageKey?: string
}

export function CurriculumSetupPrompt({
  status,
  className,
  dismissible = true,
  storageKey = 'curriculum-prompt-dismissed',
}: CurriculumSetupPromptProps) {
  const t = useTranslations('dashboard.curriculumSetup')
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(storageKey) === 'true'
    } catch {
      return false
    }
  })

  // Don't show if complete or dismissed
  if (status.isComplete || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(storageKey, 'true')
    } catch {
      // Storage not available
    }
  }

  // Determine what's missing (translated)
  const getMissingItems = (): string[] => {
    const missing: string[] = []
    if (!status.hasSelectedSystem) missing.push(t('studySystem'))
    if (!status.hasSelectedGrade) missing.push(t('grade'))
    if (!status.hasSelectedSubjects) missing.push(t('subjects'))
    return missing
  }

  const missingItems = getMissingItems()
  const andWord = t('and')
  const missingText = missingItems.length === 1
    ? missingItems[0]
    : missingItems.slice(0, -1).join(', ') + ` ${andWord} ` + missingItems[missingItems.length - 1]

  return (
    <div
      className={cn(
        'relative rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4',
        className
      )}
    >
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('completeProfile')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('selectToPersonalize', { missing: missingText })}
          </p>

          <div className="mt-3">
            <Button href="/settings" size="sm">
              {t('completeSetup')}
              <svg className="w-4 h-4 ms-1 inline rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
