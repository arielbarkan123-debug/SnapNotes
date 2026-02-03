'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useAgeAdaptiveSettings } from '@/hooks/useAgeAdaptiveSettings'
import type { AnswerFeedback } from '@/lib/feedback/age-adaptive-feedback'
import type { StructuredWorkedSolution, MistakeExplanation, MathVisual } from '@/types'
import { MathSolutionRenderer, isStructuredMathSolution } from './MathSolutionRenderer'
import { MathText } from '@/components/ui/MathRenderer'
import { MistakeVisualizer } from './MistakeVisualizer'

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
  /** Optional structured worked solution (for math problems) */
  workedSolution?: StructuredWorkedSolution | string
  /** Optional visual explanation of the mistake (for wrong answers) */
  mistakeExplanation?: MistakeExplanation
  /** Optional visual showing the wrong approach */
  wrongVisual?: MathVisual
  /** Optional visual showing the correct approach */
  correctVisual?: MathVisual
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
  workedSolution,
  mistakeExplanation,
  wrongVisual,
  correctVisual,
  onContinue,
  onAnswer,
}: QuestionFeedbackProps) {
  const t = useTranslations('lesson')
  const [isVisible, setIsVisible] = useState(false)

  // Get age-adaptive feedback settings
  const { getAnswerFeedback, feedbackSettings } = useAgeAdaptiveSettings()

  // Generate age-appropriate feedback
  const adaptiveFeedback = useMemo(
    () => getAnswerFeedback(isCorrect, explanation),
    [isCorrect, explanation, getAnswerFeedback]
  )

  // Trigger entrance animation on mount (with age-appropriate delay)
  useEffect(() => {
    // Use age-appropriate feedback delay
    const delay = Math.max(50, feedbackSettings.feedbackDelay)
    const timer = setTimeout(() => setIsVisible(true), delay)

    // Call onAnswer callback if provided
    if (onAnswer) {
      onAnswer(isCorrect)
    }

    return () => clearTimeout(timer)
  }, [isCorrect, onAnswer, feedbackSettings.feedbackDelay])

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
              workedSolution={workedSolution}
              correctAnswer={correctAnswer}
              onContinue={handleContinue}
              t={t}
              adaptiveFeedback={adaptiveFeedback}
              showAnimation={feedbackSettings.showAnimations}
            />
          ) : (
            <IncorrectFeedback
              userAnswer={userAnswer}
              correctAnswer={correctAnswer}
              explanation={explanation}
              workedSolution={workedSolution}
              mistakeExplanation={mistakeExplanation}
              wrongVisual={wrongVisual}
              correctVisual={correctVisual}
              onContinue={handleContinue}
              t={t}
              adaptiveFeedback={adaptiveFeedback}
              showExplanation={feedbackSettings.showExplanations}
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
  workedSolution?: StructuredWorkedSolution | string
  correctAnswer: string
  onContinue: () => void
  t: ReturnType<typeof useTranslations<'lesson'>>
  adaptiveFeedback: AnswerFeedback
  showAnimation: boolean
}

function CorrectFeedback({
  explanation,
  workedSolution,
  correctAnswer,
  onContinue,
  t,
  adaptiveFeedback,
  showAnimation,
}: CorrectFeedbackProps) {
  return (
    <div className="space-y-4">
      {/* Header - uses age-adaptive message */}
      <div className="flex items-center gap-3">
        <div
          className={`
            w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0
            ${showAnimation ? 'animate-bounce' : ''}
          `}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
            {/* Use age-adaptive message with emoji if present */}
            {adaptiveFeedback.message}
            {adaptiveFeedback.emoji && (
              <span className="ms-2">{adaptiveFeedback.emoji.slice(0, 2)}</span>
            )}
          </h3>
          {adaptiveFeedback.tone === 'enthusiastic' && (
            <p className="text-sm text-green-600 dark:text-green-500">
              {t('greatJob')}
            </p>
          )}
        </div>
      </div>

      {/* Explanation - only show if age-appropriate */}
      {adaptiveFeedback.showExplanation && (
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
          {/* Check if we have a structured math solution */}
          {workedSolution && isStructuredMathSolution(workedSolution) ? (
            <MathSolutionRenderer solution={workedSolution} />
          ) : typeof workedSolution === 'string' ? (
            <MathText className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {workedSolution}
            </MathText>
          ) : (
            <MathText className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {explanation}
            </MathText>
          )}
        </div>
      )}

      {/* Remember box */}
      <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
              {t('remember')}
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
        {t('continue')}
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
  workedSolution?: StructuredWorkedSolution | string
  mistakeExplanation?: MistakeExplanation
  wrongVisual?: MathVisual
  correctVisual?: MathVisual
  onContinue: () => void
  t: ReturnType<typeof useTranslations<'lesson'>>
  adaptiveFeedback: AnswerFeedback
  showExplanation: boolean
}

function IncorrectFeedback({
  userAnswer,
  correctAnswer,
  explanation,
  workedSolution,
  mistakeExplanation,
  wrongVisual,
  correctVisual,
  onContinue,
  t,
  adaptiveFeedback,
  showExplanation,
}: IncorrectFeedbackProps) {
  return (
    <div className="space-y-4">
      {/* Header - uses age-adaptive message */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">
            {adaptiveFeedback.message}
            {adaptiveFeedback.emoji && (
              <span className="ms-2">{adaptiveFeedback.emoji.slice(0, 2)}</span>
            )}
          </h3>
          {adaptiveFeedback.encouragement && (
            <p className="text-sm text-orange-600 dark:text-orange-500">
              {adaptiveFeedback.encouragement}
            </p>
          )}
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
                {t('yourAnswer')}
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
                {t('correctAnswer')}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                {correctAnswer}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual mistake explanation (if available) */}
      {mistakeExplanation && (
        <MistakeVisualizer
          explanation={mistakeExplanation}
          wrongVisual={wrongVisual}
          correctVisual={correctVisual}
        />
      )}

      {/* Explanation - controlled by age setting */}
      {showExplanation && (
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">📚</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                {t('why')}
              </p>
              {/* Check if we have a structured math solution */}
              {workedSolution && isStructuredMathSolution(workedSolution) ? (
                <MathSolutionRenderer solution={workedSolution} />
              ) : typeof workedSolution === 'string' ? (
                <MathText className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {workedSolution}
                </MathText>
              ) : (
                <MathText className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {explanation}
                </MathText>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Got it button */}
      <button
        onClick={onContinue}
        className="w-full py-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold rounded-xl transition-colors text-lg shadow-lg shadow-orange-500/20"
      >
        {t('gotIt')}
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
  workedSolution?: StructuredWorkedSolution | string
}

export function QuestionFeedbackCompact({
  isCorrect,
  correctAnswer,
  explanation,
  workedSolution,
}: QuestionFeedbackCompactProps) {
  const t = useTranslations('lesson')
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
            {isCorrect ? t('correct') : t('notQuite')}
          </p>
          {!isCorrect && (
            <p className="text-sm text-green-700 dark:text-green-400 mb-2">
              <span className="font-medium">{t('answer')}</span> {correctAnswer}
            </p>
          )}
          {/* Check if we have a structured math solution */}
          {workedSolution && isStructuredMathSolution(workedSolution) ? (
            <MathSolutionRenderer solution={workedSolution} />
          ) : typeof workedSolution === 'string' ? (
            <MathText className="text-sm text-gray-600 dark:text-gray-400">
              {workedSolution}
            </MathText>
          ) : (
            <MathText className="text-sm text-gray-600 dark:text-gray-400">
              {explanation}
            </MathText>
          )}
        </div>
      </div>
    </div>
  )
}
