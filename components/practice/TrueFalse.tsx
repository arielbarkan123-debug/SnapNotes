'use client'

import { useState } from 'react'

// =============================================================================
// Types
// =============================================================================

interface TrueFalseProps {
  statement: string
  correct: boolean
  explanation?: string
  onAnswer: (correct: boolean) => void
}

// =============================================================================
// Component
// =============================================================================

export default function TrueFalse({
  statement,
  correct,
  explanation,
  onAnswer,
}: TrueFalseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)

  const handleSelect = (answer: boolean) => {
    if (hasAnswered) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    const isCorrect = answer === correct
    onAnswer(isCorrect)
  }

  const isCorrect = selectedAnswer === correct

  const getTrueButtonStyle = () => {
    let baseClass =
      'flex-1 py-8 px-6 rounded-2xl border-3 font-bold text-2xl transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[120px] '

    if (hasAnswered) {
      if (correct === true) {
        // True is the correct answer
        baseClass +=
          'border-green-500 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 shadow-lg shadow-green-200 dark:shadow-green-900/30'
      } else if (selectedAnswer === true) {
        // User selected True but it was wrong
        baseClass +=
          'border-red-500 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
      } else {
        // Not selected, not correct - dimmed
        baseClass +=
          'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
      }
    } else {
      // Not answered yet - hoverable
      baseClass +=
        'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900/20 active:scale-[0.98]'
    }

    return baseClass
  }

  const getFalseButtonStyle = () => {
    let baseClass =
      'flex-1 py-8 px-6 rounded-2xl border-3 font-bold text-2xl transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[120px] '

    if (hasAnswered) {
      if (correct === false) {
        // False is the correct answer
        baseClass +=
          'border-green-500 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 shadow-lg shadow-green-200 dark:shadow-green-900/30'
      } else if (selectedAnswer === false) {
        // User selected False but it was wrong
        baseClass +=
          'border-red-500 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
      } else {
        // Not selected, not correct - dimmed
        baseClass +=
          'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
      }
    } else {
      // Not answered yet - hoverable
      baseClass +=
        'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:border-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-900/20 active:scale-[0.98]'
    }

    return baseClass
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Statement */}
      <div className="mb-8">
        <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed text-center">
          {statement}
        </p>
      </div>

      {/* True/False Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => handleSelect(true)}
          disabled={hasAnswered}
          className={getTrueButtonStyle()}
        >
          <span className="text-3xl">
            {hasAnswered && correct === true ? '✓' : ''}
            {hasAnswered && selectedAnswer === true && correct !== true ? '✗' : ''}
            {!hasAnswered && '👍'}
          </span>
          <span>TRUE</span>
        </button>

        <button
          onClick={() => handleSelect(false)}
          disabled={hasAnswered}
          className={getFalseButtonStyle()}
        >
          <span className="text-3xl">
            {hasAnswered && correct === false ? '✓' : ''}
            {hasAnswered && selectedAnswer === false && correct !== false ? '✗' : ''}
            {!hasAnswered && '👎'}
          </span>
          <span>FALSE</span>
        </button>
      </div>

      {/* Result Message */}
      {hasAnswered && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          <p
            className={`font-bold text-lg text-center ${
              isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}
          >
            {isCorrect ? 'Correct! 🎉' : 'Not quite right'}
          </p>
          {!isCorrect && (
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-center">
              The statement is{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {correct ? 'TRUE' : 'FALSE'}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Explanation */}
      {hasAnswered && explanation && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
          <p className="text-gray-700 dark:text-gray-300">{explanation}</p>
        </div>
      )}

      {/* Continue Button */}
      {hasAnswered && (
        <button
          onClick={() => {
            // Parent handles navigation via onAnswer callback
          }}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Continue
        </button>
      )}
    </div>
  )
}
