'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { MistakeInsight } from '@/lib/insights/mistake-analyzer'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemediationModalProps {
  pattern: MistakeInsight
  onClose: () => void
  onResolved: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RemediationModal({
  pattern,
  onClose,
  onResolved,
}: RemediationModalProps) {
  const t = useTranslations('insights.remediation')
  const locale = useLocale()
  const isHe = locale === 'he'

  const questions = pattern.remediation.practiceQuestions
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [completed, setCompleted] = useState(false)

  const currentQuestion = questions[currentIndex]
  const questionText = isHe ? currentQuestion?.questionHe : currentQuestion?.question
  const answerText = isHe ? currentQuestion?.answerHe : currentQuestion?.answer
  const patternName = isHe ? pattern.patternNameHe : pattern.patternName

  const handleSubmit = useCallback(() => {
    if (!userAnswer.trim() || !answerText) return
    setSubmitted(true)

    // Fuzzy comparison: check if user answer contains the key term from the expected answer
    // Also handles exact match and numeric matching
    const userNorm = userAnswer.trim().toLowerCase()
    const answerNorm = answerText.trim().toLowerCase()
    const numericMatch = (() => {
      const userNums = userNorm.match(/-?\d+\.?\d*/g)
      const ansNums = answerNorm.match(/-?\d+\.?\d*/g)
      return !!(userNums && ansNums && userNums.some(n => ansNums.includes(n)))
    })()
    const isCorrect = userNorm === answerNorm
      || answerNorm.includes(userNorm)
      || userNorm.includes(answerNorm)
      || numericMatch
    setResults(prev => [...prev, isCorrect])
  }, [userAnswer, answerText])

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setUserAnswer('')
      setSubmitted(false)
    } else {
      setCompleted(true)
    }
  }, [currentIndex, questions.length])

  const handleRetry = useCallback(() => {
    setCurrentIndex(0)
    setUserAnswer('')
    setSubmitted(false)
    setResults([])
    setCompleted(false)
  }, [])

  const score = results.length > 0
    ? Math.round((results.filter(Boolean).length / results.length) * 100)
    : 0

  const isResolved = score >= 80

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
              {t('title', { pattern: patternName })}
            </h3>
            {!completed && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('question', { number: `${currentIndex + 1}/${questions.length}` })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            {!completed ? (
              <motion.div
                key={`question-${currentIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-5">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100}%` }}
                  />
                </div>

                {/* Instructions (first question only) */}
                {currentIndex === 0 && !submitted && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    {t('instructions')}
                  </p>
                )}

                {/* Question */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
                    {questionText}
                  </p>
                </div>

                {/* Answer Input */}
                {!submitted ? (
                  <div className="space-y-3">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={t('yourAnswer')}
                      rows={3}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!userAnswer.trim()}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors"
                    >
                      {t('submit')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Result */}
                    <div className={`rounded-xl p-4 ${
                      results[results.length - 1]
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      <p className={`font-medium text-sm mb-1 ${
                        results[results.length - 1]
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}>
                        {results[results.length - 1] ? `✅ ${t('correct')}` : `❌ ${t('incorrect')}`}
                      </p>
                      {!results[results.length - 1] && (
                        <>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-1">
                            {t('incorrect')}
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {answerText}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Your answer */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your answer:</p>
                      <p className="text-sm text-gray-900 dark:text-white">{userAnswer}</p>
                    </div>

                    {/* Next button */}
                    <button
                      onClick={handleNext}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors"
                    >
                      {currentIndex < questions.length - 1 ? t('next') : t('submit')}
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                {/* Score display */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isResolved
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                  <span className="text-3xl">{isResolved ? '🎉' : '📝'}</span>
                </div>

                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {t('score', { score })}
                </p>

                <p className={`text-sm mb-6 ${
                  isResolved
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {isResolved ? t('resolved') : t('needsWork')}
                </p>

                {/* Action buttons */}
                <div className="flex gap-3 justify-center">
                  {!isResolved && (
                    <button
                      onClick={handleRetry}
                      className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors"
                    >
                      {t('tryAgain')}
                    </button>
                  )}
                  <button
                    onClick={isResolved ? onResolved : onClose}
                    className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      isResolved
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('close')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
