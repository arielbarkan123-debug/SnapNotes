'use client'

import { useEffect, useState } from 'react'

// =============================================================================
// Types
// =============================================================================

interface QuestionFeedbackProps {
  /** Whether the user's answer was correct */
  isCorrect: boolean
  /** The answer the user selected */
  userAnswer: string
  /** The correct answer */
  correctAnswer: string
  /** Explanation of why the correct answer is right */
  explanation: string
  /** Callback when user clicks continue/got it */
  onContinue: () => void
  /** Optional callback to track the answer */
  onAnswer?: (isCorrect: boolean) => void
}

// =============================================================================
// Component
// =============================================================================

export default function QuestionFeedback({
  isCorrect,
  userAnswer,
  correctAnswer,
  explanation,
  onContinue,
  onAnswer,
}: QuestionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Trigger entrance animation on mount
  useEffect(() => {
    // Small delay to ensure animation plays
    const timer = setTimeout(() => setIsVisible(true), 50)

    // Call onAnswer callback if provided
    if (onAnswer) {
      onAnswer(isCorrect)
    }

    return () => clearTimeout(timer)
  }, [isCorrect, onAnswer])

  // Handle continue click with exit animation
  const handleContinue = () => {
    setIsVisible(false)
    // Wait for exit animation before calling onContinue
    setTimeout(onContinue, 200)
  }

  return (
    <div
      className={`
        fixed inset-x-0 bottom-0 z-50
        transition-transform duration-300 ease-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 -top-20
          bg-gradient-to-t from-black/20 to-transparent
          pointer-events-none
        `}
      />

      {/* Feedback Card */}
      <div
        className={`
          relative rounded-t-3xl shadow-2xl p-6 pb-8
          ${isCorrect
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40'
            : 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/40 dark:to-red-900/40'
          }
        `}
      >
        {/* Handle bar for visual feedback */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />

        <div className="max-w-2xl mx-auto">
          {isCorrect ? (
            <CorrectFeedback
              explanation={explanation}
              correctAnswer={correctAnswer}
              onContinue={handleContinue}
            />
          ) : (
            <IncorrectFeedback
              userAnswer={userAnswer}
              correctAnswer={correctAnswer}
              explanation={explanation}
              onContinue={handleContinue}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Correct Answer Feedback
// =============================================================================

interface CorrectFeedbackProps {
  explanation: string
  correctAnswer: string
  onContinue: () => void
}

function CorrectFeedback({ explanation, correctAnswer, onContinue }: CorrectFeedbackProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
            Correct!
          </h3>
          <p className="text-sm text-green-600 dark:text-green-500">
            Great job!
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {explanation}
        </p>
      </div>

      {/* Remember box */}
      <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
              Remember
            </p>
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              {correctAnswer}
            </p>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-xl transition-colors text-lg shadow-lg shadow-green-500/20"
      >
        Continue
      </button>
    </div>
  )
}

// =============================================================================
// Incorrect Answer Feedback
// =============================================================================

interface IncorrectFeedbackProps {
  userAnswer: string
  correctAnswer: string
  explanation: string
  onContinue: () => void
}

function IncorrectFeedback({
  userAnswer,
  correctAnswer,
  explanation,
  onContinue,
}: IncorrectFeedbackProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">
            Not quite
          </h3>
          <p className="text-sm text-orange-600 dark:text-orange-500">
            Let&apos;s learn from this
          </p>
        </div>
      </div>

      {/* Answer comparison */}
      <div className="space-y-3">
        {/* User's wrong answer */}
        <div className="bg-red-100/60 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                Your answer
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 line-through opacity-75">
                {userAnswer}
              </p>
            </div>
          </div>
        </div>

        {/* Correct answer */}
        <div className="bg-green-100/60 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">
                Correct answer
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                {correctAnswer}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">📚</span>
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
              Why?
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Got it button */}
      <button
        onClick={onContinue}
        className="w-full py-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold rounded-xl transition-colors text-lg shadow-lg shadow-orange-500/20"
      >
        Got it
      </button>
    </div>
  )
}

// =============================================================================
// Compact Version (for inline use)
// =============================================================================

interface QuestionFeedbackCompactProps {
  isCorrect: boolean
  correctAnswer: string
  explanation: string
}

export function QuestionFeedbackCompact({
  isCorrect,
  correctAnswer,
  explanation,
}: QuestionFeedbackCompactProps) {
  return (
    <div
      className={`
        rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300
        ${isCorrect
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            ${isCorrect ? 'bg-green-500' : 'bg-orange-500'}
          `}
        >
          {isCorrect ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`
              font-semibold mb-1
              ${isCorrect
                ? 'text-green-700 dark:text-green-400'
                : 'text-orange-700 dark:text-orange-400'
              }
            `}
          >
            {isCorrect ? 'Correct!' : 'Not quite'}
          </p>
          {!isCorrect && (
            <p className="text-sm text-green-700 dark:text-green-400 mb-2">
              <span className="font-medium">Answer:</span> {correctAnswer}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {explanation}
          </p>
        </div>
      </div>
    </div>
  )
}
