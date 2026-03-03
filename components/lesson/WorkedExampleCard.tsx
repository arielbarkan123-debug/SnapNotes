'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { MathRenderer, MathText } from '@/components/ui/MathRenderer'

interface WorkedExampleStep {
  text: string
  math?: string | null
}

interface TryAnother {
  question: string
  correctAnswer: string
}

interface WorkedExampleCardProps {
  steps: WorkedExampleStep[]
  tryAnother: TryAnother
  errorDiagnosis: string
  attemptNumber: number // 1 or 2
  onTryAnotherResult: (correct: boolean) => void
  onDismiss: () => void
}

export default function WorkedExampleCard({
  steps,
  tryAnother,
  errorDiagnosis,
  attemptNumber,
  onTryAnotherResult,
  onDismiss,
}: WorkedExampleCardProps) {
  const t = useTranslations('lesson.workedExample')
  const [tryAnswer, setTryAnswer] = useState('')
  const [tryChecked, setTryChecked] = useState(false)
  const [tryCorrect, setTryCorrect] = useState(false)

  const handleCheckTry = useCallback(() => {
    const normalized = tryAnswer.trim().toLowerCase()
    const expected = tryAnother.correctAnswer.trim().toLowerCase()
    const correct = normalized === expected
    setTryCorrect(correct)
    setTryChecked(true)
    onTryAnotherResult(correct)
  }, [tryAnswer, tryAnother.correctAnswer, onTryAnotherResult])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mt-4 bg-white dark:bg-gray-800 border-s-4 border-amber-400 rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <span className="text-xl" role="img" aria-label="pencil">&#x1F4DD;</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {attemptNumber === 2 ? t('secondExample') : t('title')}
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {errorDiagnosis}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 pb-4 space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.3 }}
            className="flex gap-3"
          >
            <span className="flex-shrink-0 w-7 h-7 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                <MathText>{step.text}</MathText>
              </p>
              {step.math && (
                <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-x-auto">
                  <MathRenderer math={step.math} block={false} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Try a Similar One */}
      <div className="px-5 pb-5 pt-2 border-t border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
          {t('tryASimilarOne')}
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
          <MathText>{tryAnother.question}</MathText>
        </p>

        {!tryChecked ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={tryAnswer}
              onChange={(e) => setTryAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && tryAnswer.trim()) handleCheckTry() }}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              placeholder="..."
              aria-label={tryAnother.question}
            />
            <button
              type="button"
              onClick={handleCheckTry}
              disabled={!tryAnswer.trim()}
              className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('checkSimilar')}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-3 rounded-lg text-sm font-medium ${
              tryCorrect
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {tryCorrect ? t('similarCorrect') : t('similarIncorrect')}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export type { WorkedExampleStep, TryAnother }
