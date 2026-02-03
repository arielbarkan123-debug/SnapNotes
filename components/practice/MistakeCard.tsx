'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { MistakeItem } from './MistakeReview'

// =============================================================================
// Props
// =============================================================================

interface MistakeCardProps {
  mistake: MistakeItem
  namespace?: string
}

// =============================================================================
// Component
// =============================================================================

export default function MistakeCard({ mistake, namespace = 'practice' }: MistakeCardProps) {
  const t = useTranslations(namespace)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Question */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
          {mistake.question}
        </p>
        {mistake.cardType && (
          <span className="mt-1 inline-block text-xs text-gray-400 dark:text-gray-400 uppercase tracking-wide">
            {mistake.cardType.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Answers */}
      <div className="px-4 py-3 space-y-2">
        {/* User's wrong answer - only show if userAnswer is not empty */}
        {mistake.userAnswer && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-300">{t('yourAnswerLabel')}</span>
              <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1 mt-0.5">
                {mistake.userAnswer}
              </p>
            </div>
          </div>
        )}

        {/* Correct answer */}
        <div className="flex items-start gap-2">
          <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-300">{t('correctAnswerLabel')}</span>
            <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1 mt-0.5">
              {mistake.correctAnswer}
            </p>
          </div>
        </div>
      </div>

      {/* Explanation & Lesson Link */}
      {(mistake.explanation || mistake.courseId) && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {mistake.explanation && (
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-300">{t('explanationLabel')}</span>
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-0.5">
                {mistake.explanation}
              </p>
            </div>
          )}
          {mistake.courseId && mistake.lessonIndex !== undefined && (
            <Link
              href={`/course/${mistake.courseId}/lesson/${mistake.lessonIndex}`}
              className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              {t('goToLesson')}
              {mistake.lessonTitle && (
                <span className="text-gray-400 dark:text-gray-400">
                  — {mistake.lessonTitle}
                </span>
              )}
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
