'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface DifficultyFeedbackProps {
  onFeedback: (feedback: 'too_easy' | 'too_hard') => void
  namespace?: 'review' | 'practice'
}

export default function DifficultyFeedback({ onFeedback, namespace = 'review' }: DifficultyFeedbackProps) {
  const [given, setGiven] = useState(false)
  const t = useTranslations(namespace)

  const handleFeedback = (feedback: 'too_easy' | 'too_hard') => {
    if (given) return
    setGiven(true)
    onFeedback(feedback)
  }

  if (given) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
        {t('feedbackThanks')}
      </p>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <button
        onClick={() => handleFeedback('too_easy')}
        className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {t('tooEasy')}
      </button>
      <button
        onClick={() => handleFeedback('too_hard')}
        className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {t('tooHard')}
      </button>
    </div>
  )
}
