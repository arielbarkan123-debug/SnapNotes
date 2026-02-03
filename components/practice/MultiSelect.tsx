'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// =============================================================================
// Types
// =============================================================================

interface MultiSelectProps {
  question: string
  options: string[]
  correctIndices: number[] // Multiple correct answers
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

export default function MultiSelect({
  question,
  options,
  correctIndices,
  explanation,
  onAnswer,
}: MultiSelectProps) {
  const t = useTranslations('practice')

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [hasChecked, setHasChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [showFinalFeedback, setShowFinalFeedback] = useState(false)

  // Reset state when question changes to prevent showing stale answers
  useEffect(() => {
    setSelectedIndices(new Set())
    setHasChecked(false)
    setIsCorrect(false)
    setAttemptCount(0)
    setShowFinalFeedback(false)
  }, [question])

  // Get random encouraging message and tip (stable per render)
  const encouragementIndex = useMemo(() =>
    Math.floor(Math.random() * 5) + 1,
    [question]
  )
  const learningTipIndex = useMemo(() =>
    Math.floor(Math.random() * 4) + 1,
    [question]
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

  // Find the shuffled indices of all correct answers
  const correctShuffledIndices = useMemo(() => {
    const indices: number[] = []
    shuffledOptions.forEach((opt, shuffledIdx) => {
      if (correctIndices.includes(opt.originalIndex)) {
        indices.push(shuffledIdx)
      }
    })
    return indices
  }, [shuffledOptions, correctIndices])

  // Count how many correct answers were missed
  const missedCount = useMemo(() => {
    if (!hasChecked) return 0
    return correctShuffledIndices.filter((idx) => !selectedIndices.has(idx)).length
  }, [hasChecked, correctShuffledIndices, selectedIndices])

  const handleToggle = (index: number) => {
    if (hasChecked) return
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleCheck = () => {
    if (selectedIndices.size === 0) return

    const selectedSorted = [...selectedIndices].sort((a, b) => a - b)
    const correctSorted = [...correctShuffledIndices].sort((a, b) => a - b)
    const correct =
      selectedSorted.length === correctSorted.length &&
      selectedSorted.every((val, i) => val === correctSorted[i])

    setIsCorrect(correct)
    setHasChecked(true)
    setAttemptCount((prev) => prev + 1)

    if (correct) {
      setShowFinalFeedback(true)
      onAnswer(true)
    } else if (attemptCount === 0) {
      // First wrong attempt - allow retry
    } else {
      // Second+ wrong attempt - show final feedback
      setShowFinalFeedback(true)
      onAnswer(false)
    }
  }

  const handleTryAgain = () => {
    setSelectedIndices(new Set())
    setHasChecked(false)
    setIsCorrect(false)
  }

  const handleShowAnswer = () => {
    setShowFinalFeedback(true)
    onAnswer(false)
  }

  const isCorrectOption = (index: number) => correctShuffledIndices.includes(index)
  const isSelected = (index: number) => selectedIndices.has(index)

  const getOptionStyle = (index: number) => {
    const selected = isSelected(index)
    const correct = isCorrectOption(index)

    let baseClass =
      'w-full p-4 text-start rounded-xl border-2 transition-all duration-200 font-medium min-h-[56px] '

    if (hasChecked) {
      if (correct && selected) {
        // Correctly selected
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (correct && !selected) {
        // Missed correct answer
        baseClass +=
          'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      } else if (!correct && selected) {
        // Wrong selection
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        // Other options dimmed
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
      }
    } else {
      if (selected) {
        baseClass +=
          'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
      } else {
        baseClass +=
          'border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 text-gray-700 dark:text-gray-300'
      }
    }

    return baseClass
  }

  const getCheckboxStyle = (index: number) => {
    const selected = isSelected(index)
    const correct = isCorrectOption(index)

    let baseClass = 'flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all duration-200 '

    if (hasChecked) {
      if (correct && selected) {
        baseClass += 'border-green-500 bg-green-500 text-white'
      } else if (correct && !selected) {
        baseClass += 'border-amber-500 bg-amber-500 text-white'
      } else if (!correct && selected) {
        baseClass += 'border-red-500 bg-red-500 text-white'
      } else {
        baseClass += 'border-gray-300 dark:border-gray-600 bg-transparent'
      }
    } else {
      if (selected) {
        baseClass += 'border-violet-500 bg-violet-500 text-white'
      } else {
        baseClass += 'border-gray-300 dark:border-gray-600 bg-transparent'
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
      <div className="mb-4">
        <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed">
          {question}
        </p>
      </div>

      {/* Header & Hint */}
      <div className="mb-4">
        <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
          {t('selectAllThatApply')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {t('multiSelectHint')}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {shuffledOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => handleToggle(index)}
            disabled={hasChecked}
            className={getOptionStyle(index)}
          >
            <span className="flex items-center gap-3">
              {/* Checkbox (square) */}
              <span className={getCheckboxStyle(index)}>
                {(isSelected(index) || (hasChecked && isCorrectOption(index))) && (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8L6.5 11L12.5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {/* Label */}
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  hasChecked
                    ? isCorrectOption(index) && isSelected(index)
                      ? 'bg-green-500 text-white'
                      : isCorrectOption(index) && !isSelected(index)
                        ? 'bg-amber-500 text-white'
                        : isSelected(index)
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    : isSelected(index)
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {getOptionLabel(index)}
              </span>
              <span className="flex-1">{option.text}</span>
              {/* Status icons after check */}
              {hasChecked && isCorrectOption(index) && isSelected(index) && (
                <span className="text-green-500 text-xl">&#10003;</span>
              )}
              {hasChecked && isCorrectOption(index) && !isSelected(index) && (
                <span className="text-amber-500 text-sm font-medium">{t('missed')}</span>
              )}
              {hasChecked && !isCorrectOption(index) && isSelected(index) && (
                <span className="text-red-500 text-xl">&#10007;</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Selected count */}
      {!hasChecked && selectedIndices.size > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('selectedCount', { count: selectedIndices.size })}
        </p>
      )}

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
                  {t('theCorrectAnswers')}
                </p>
                <ul className="space-y-1">
                  {correctIndices.map((origIdx) => (
                    <li key={origIdx} className="font-semibold text-green-600 dark:text-green-400">
                      {options[origIdx]}
                    </li>
                  ))}
                </ul>
              </div>
              {missedCount > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  {t('missedCorrect', { count: missedCount })}
                </p>
              )}
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
              {missedCount > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                  {t('missedCorrect', { count: missedCount })}
                </p>
              )}
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
      {!hasChecked && (
        <button
          onClick={handleCheck}
          disabled={selectedIndices.size === 0}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            selectedIndices.size === 0
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {t('checkAnswer')}
        </button>
      )}
    </div>
  )
}
