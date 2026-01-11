'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// =============================================================================
// Types
// =============================================================================

interface MultipleChoiceProps {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
  onAnswer: (correct: boolean) => void
}

interface ShuffledOption {
  text: string
  originalIndex: number
}

// =============================================================================
// Component
// =============================================================================

export default function MultipleChoice({
  question,
  options,
  correctIndex,
  explanation,
  onAnswer,
}: MultipleChoiceProps) {
  const t = useTranslations('practice')

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [showFinalFeedback, setShowFinalFeedback] = useState(false)

  // Reset state when question changes to prevent showing stale answers
  useEffect(() => {
    setSelectedIndex(null)
    setHasChecked(false)
    setIsCorrect(false)
    setAttemptCount(0)
    setShowFinalFeedback(false)
  }, [question])

  // Get random encouraging message and tip (stable per render)
  const encouragementIndex = useMemo(() =>
    Math.floor(Math.random() * 5) + 1,
    []
  )
  const learningTipIndex = useMemo(() =>
    Math.floor(Math.random() * 4) + 1,
    []
  )

  // Shuffle options once per question - intentionally only depends on question
  const shuffledOptions = useMemo<ShuffledOption[]>(() => {
    const indexed = options.map((text, originalIndex) => ({ text, originalIndex }))
    // Fisher-Yates shuffle
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indexed[i], indexed[j]] = [indexed[j], indexed[i]]
    }
    return indexed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]) // Use question as key - options should stay fixed for same question

  // Find the shuffled index of the correct answer
  const correctShuffledIndex = useMemo(() => {
    return shuffledOptions.findIndex((opt) => opt.originalIndex === correctIndex)
  }, [shuffledOptions, correctIndex])

  const handleSelect = (index: number) => {
    if (hasChecked) return
    setSelectedIndex(index)
  }

  const handleCheck = () => {
    if (selectedIndex === null) return

    const correct = selectedIndex === correctShuffledIndex
    setIsCorrect(correct)
    setHasChecked(true)
    setAttemptCount(prev => prev + 1)

    if (correct) {
      // Correct answer - show final feedback and notify parent
      setShowFinalFeedback(true)
      onAnswer(true)
    } else if (attemptCount === 0) {
      // First wrong attempt - allow retry
      // Don't notify parent yet, wait for second attempt or continue
    } else {
      // Second+ wrong attempt - show final feedback
      setShowFinalFeedback(true)
      onAnswer(false)
    }
  }

  const handleTryAgain = () => {
    // Reset for another attempt
    setSelectedIndex(null)
    setHasChecked(false)
    setIsCorrect(false)
  }

  const handleShowAnswer = () => {
    // User chose to see answer instead of trying again
    setShowFinalFeedback(true)
    onAnswer(false)
  }

  const getOptionStyle = (index: number) => {
    const isSelected = selectedIndex === index
    const isCorrectOption = index === correctShuffledIndex

    let baseClass =
      'w-full p-4 text-start rounded-xl border-2 transition-all duration-200 font-medium min-h-[56px] '

    if (hasChecked) {
      if (isCorrectOption) {
        // Always highlight correct answer in green after checking
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (isSelected && !isCorrectOption) {
        // Wrong selection in red
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        // Other options dimmed
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
      }
    } else {
      if (isSelected) {
        // Selected but not yet checked
        baseClass +=
          'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
      } else {
        // Unselected, hoverable
        baseClass +=
          'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300'
      }
    }

    return baseClass
  }

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index) // A, B, C, D...
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Question */}
      <div className="mb-6">
        <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed">
          {question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {shuffledOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={hasChecked}
            className={getOptionStyle(index)}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  hasChecked
                    ? index === correctShuffledIndex
                      ? 'bg-green-500 text-white'
                      : selectedIndex === index
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    : selectedIndex === index
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {getOptionLabel(index)}
              </span>
              <span className="flex-1">{option.text}</span>
              {hasChecked && index === correctShuffledIndex && (
                <span className="text-green-500 text-xl">✓</span>
              )}
              {hasChecked && selectedIndex === index && index !== correctShuffledIndex && (
                <span className="text-red-500 text-xl">✗</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Result Message */}
      {hasChecked && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : showFinalFeedback
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}
        >
          {isCorrect ? (
            // Correct answer feedback
            <>
              <div className="flex items-center gap-2 mb-2">
                <p className="font-bold text-lg text-green-700 dark:text-green-400">
                  {attemptCount === 1 ? t('correctFirstTry') : t('correctGreatPerseverance')}
                </p>
              </div>
              {attemptCount > 1 && (
                <p className="text-sm text-green-600 dark:text-green-500">
                  {t('gotItOnAttempt', { attempt: attemptCount })}
                </p>
              )}
            </>
          ) : showFinalFeedback ? (
            // Final wrong answer feedback (after all attempts)
            <>
              <div className="flex items-center gap-2 mb-2">
                <p className="font-bold text-lg text-red-700 dark:text-red-400">
                  {t('letsLearnFromThis')}
                </p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {t(`encouragement.${encouragementIndex}`)}
              </p>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mt-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('theCorrectAnswer')}
                </p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {options[correctIndex]}
                </p>
              </div>
              {/* Learning tip */}
              <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                <p className="italic">{t(`learningTips.${learningTipIndex}`)}</p>
              </div>
            </>
          ) : (
            // First wrong attempt - encourage retry
            <>
              <div className="flex items-center gap-2 mb-2">
                <p className="font-bold text-lg text-amber-700 dark:text-amber-400">
                  {t('notQuiteTryAgain')}
                </p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                {t('takeAnotherLook')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleTryAgain}
                  className="flex-1 py-2.5 px-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition flex items-center justify-center gap-2"
                >
                  <span>{t('tryAgain')}</span>
                </button>
                <button
                  onClick={handleShowAnswer}
                  className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
                >
                  <span>{t('showAnswer')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Explanation - only show after final feedback */}
      {showFinalFeedback && explanation && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('whyCorrect')}</p>
          <p className="text-gray-700 dark:text-gray-300">{explanation}</p>
        </div>
      )}

      {/* Action Button - only show Check Answer before checking */}
      {/* After answer is checked, parent component shows the navigation button */}
      {!hasChecked && (
        <button
          onClick={handleCheck}
          disabled={selectedIndex === null}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            selectedIndex === null
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {t('checkAnswer')}
        </button>
      )}
    </div>
  )
}
