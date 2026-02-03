'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false'
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

interface PracticeMoreProps {
  courseId: string
  lessonIndex?: number
  wrongQuestion?: string
  onClose: () => void
}

export function PracticeMore({ courseId, lessonIndex, wrongQuestion, onClose }: PracticeMoreProps) {
  const t = useTranslations('practice')
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [completed, setCompleted] = useState(false)

  const generateQuestions = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonIndex,
          wrongQuestion,
          count: 3,
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        throw new Error('Server response error')
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Request failed')
      }

      if (data.success && data.questions.length > 0) {
        setQuestions(data.questions)
        setStarted(true)
      } else {
        setError(data.error || t('failedToGenerate'))
      }
    } catch {
      setError(t('failedToGenerate'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (index: number) => {
    if (hasChecked) return
    setSelectedAnswer(index)
  }

  const handleCheck = () => {
    if (selectedAnswer === null) return

    const question = questions[currentIndex]
    const correct = selectedAnswer === question.correct_answer
    setIsCorrect(correct)
    setHasChecked(true)
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setHasChecked(false)
      setIsCorrect(false)
    } else {
      setCompleted(true)
    }
  }

  // Initial state - prompt to start practice
  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('letPracticeMoreTitle')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {wrongQuestion
                ? t('letPracticeMoreDescription')
                : t('generatePracticeDescription')}
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('skipQuestion')}
            </button>
            <button
              onClick={generateQuestions}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('generating')}
                </>
              ) : (
                t('letsPractice')
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Completed state
  if (completed) {
    const percentage = Math.round((score.correct / score.total) * 100)
    const isGood = percentage >= 70

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 ${isGood ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {isGood ? (
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {isGood ? t('greatJob') : t('keepPracticing')}
            </h3>
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400 mb-2">
              {score.correct}/{score.total}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {isGood
                ? t('gettingHangOfThis')
                : t('reviewAndTryAgain')}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
          >
            {t('continue')}
          </button>
        </div>
      </div>
    )
  }

  // Question display
  const question = questions[currentIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('questionOf', { current: currentIndex + 1, total: questions.length })}
          </span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${((currentIndex + (hasChecked ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {question.question}
        </h3>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index
            const isCorrectAnswer = index === question.correct_answer
            const showCorrect = hasChecked && isCorrectAnswer
            const showWrong = hasChecked && isSelected && !isCorrectAnswer

            return (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                disabled={hasChecked}
                className={`
                  w-full p-4 rounded-xl border-2 text-start transition-all
                  ${hasChecked
                    ? showCorrect
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-500'
                      : showWrong
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-50'
                    : isSelected
                      ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-500'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${hasChecked
                      ? showCorrect
                        ? 'bg-green-500 text-white'
                        : showWrong
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      : isSelected
                        ? 'bg-violet-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }
                  `}>
                    {hasChecked ? (showCorrect ? '✓' : showWrong ? '✗' : String.fromCharCode(65 + index)) : String.fromCharCode(65 + index)}
                  </span>
                  <span className={`flex-1 ${hasChecked && !isSelected && !isCorrectAnswer ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {option}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Explanation (after checking) */}
        {hasChecked && (
          <div className={`p-4 rounded-xl mb-4 ${isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <p className={`text-sm ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Action button */}
        {!hasChecked ? (
          <button
            onClick={handleCheck}
            disabled={selectedAnswer === null}
            className={`
              w-full py-3 rounded-xl font-semibold transition-all
              ${selectedAnswer !== null
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {t('checkAnswer')}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`
              w-full py-3 rounded-xl font-semibold transition-all
              ${isCorrect
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
              }
            `}
          >
            {currentIndex < questions.length - 1 ? t('nextQuestion') : t('finish')}
          </button>
        )}
      </div>
    </div>
  )
}

export default PracticeMore
