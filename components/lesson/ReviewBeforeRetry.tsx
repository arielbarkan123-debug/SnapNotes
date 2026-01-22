'use client'

import { useTranslations } from 'next-intl'
import { type Step } from '@/types'

interface ReviewBeforeRetryProps {
  questionStep: Step
  lessonSteps: Step[]
  questionIndex: number
  attemptNumber: number
  onReady: () => void
}

/**
 * Shows a review/explanation page before retrying a failed question.
 * Helps the user understand the concept before trying again.
 */
export default function ReviewBeforeRetry({
  questionStep,
  lessonSteps,
  questionIndex,
  attemptNumber,
  onReady,
}: ReviewBeforeRetryProps) {
  const t = useTranslations('lesson')

  // Find related explanation steps near the question
  const relatedSteps = lessonSteps
    .slice(Math.max(0, questionIndex - 3), questionIndex)
    .filter(step =>
      step.type === 'explanation' ||
      step.type === 'key_point' ||
      step.type === 'example'
    )
    .slice(-2) // Take max 2 related steps

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-amber-500 text-white py-4">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">{t('letsReviewThis')}</span>
          </div>
          <p className="text-amber-100 text-sm">
            {attemptNumber === 1
              ? t('noWorriesReview')
              : t('gotThisReview')}
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-3 xs:px-4 py-4 xs:py-6 sm:py-8 max-w-2xl overflow-y-auto">
        {/* The question explanation (if available) */}
        {questionStep.explanation && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('theKeyConcept')}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {questionStep.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Related content from nearby steps */}
        {relatedSteps.length > 0 && (
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('relatedInformation')}
            </h3>
            {relatedSteps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border-s-4 border-indigo-400"
              >
                {step.title && (
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h4>
                )}
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {step.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Encouragement message */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💪</span>
            <div>
              <p className="text-green-800 dark:text-green-300 font-medium">
                {t('youAreLearning')}
              </p>
              <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                {t('mistakesAreLearning')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with ready button */}
      <footer
        className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="container mx-auto px-3 xs:px-4 py-3 xs:py-4 max-w-4xl">
          <button
            onClick={onReady}
            className="w-full py-3 xs:py-4 rounded-xl font-semibold text-base xs:text-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white transition-all duration-200 min-h-[48px]"
          >
            {t('readyToTryAgain')}
          </button>
        </div>
      </footer>
    </div>
  )
}
