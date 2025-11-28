'use client'

import { useState, useMemo } from 'react'

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  // Shuffle options on mount (preserving original indices)
  const shuffledOptions = useMemo<ShuffledOption[]>(() => {
    const indexed = options.map((text, originalIndex) => ({ text, originalIndex }))
    // Fisher-Yates shuffle
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indexed[i], indexed[j]] = [indexed[j], indexed[i]]
    }
    return indexed
  }, [options])

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
    onAnswer(correct)
  }

  const getOptionStyle = (index: number) => {
    const isSelected = selectedIndex === index
    const isCorrectOption = index === correctShuffledIndex

    let baseClass =
      'w-full p-4 text-left rounded-xl border-2 transition-all duration-200 font-medium min-h-[56px] '

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
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          <p
            className={`font-bold text-lg ${
              isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}
          >
            {isCorrect ? 'Correct! 🎉' : 'Not quite right'}
          </p>
          {!isCorrect && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              The correct answer was:{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {options[correctIndex]}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Explanation */}
      {hasChecked && explanation && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
          <p className="text-gray-700 dark:text-gray-300">{explanation}</p>
        </div>
      )}

      {/* Action Button */}
      {!hasChecked ? (
        <button
          onClick={handleCheck}
          disabled={selectedIndex === null}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            selectedIndex === null
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={() => {
            // Reset state handled by parent via onAnswer callback
            // This button is for UI flow - parent should advance to next card
          }}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Continue
        </button>
      )}
    </div>
  )
}
