'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Step, HelpContext } from '@/types'
import { generateHint, HintContext as HintCtx, Hint } from '@/lib/adaptive/hints'
import HintBubble, { HintButton } from './HintBubble'
import HelpModal from '@/components/help/HelpModal'
import { useConceptMastery, useAdaptiveDifficulty, useResponseTimer } from '@/hooks'

// Lazy load PracticeMore since it's only shown after wrong answers
const PracticeMore = dynamic(() => import('@/components/practice/PracticeMore').then(mod => ({ default: mod.PracticeMore })), {
  ssr: false,
})

interface QuestionStepProps {
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
  onComplete: (wasCorrect: boolean, usedHint?: boolean) => void
  /** Full step data for hint generation */
  step?: Step
  /** Number of consecutive wrong answers across session */
  consecutiveWrong?: number
  /** Help system context - optional */
  courseId?: string
  courseTitle?: string
  lessonIndex?: number
  lessonTitle?: string
  stepIndex?: number
  /** Concept IDs this question tests (for mastery tracking) */
  conceptIds?: string[]
  /** Question difficulty level (1-5, for adaptive system) */
  difficulty?: number
  /** Unique question ID for adaptive tracking */
  questionId?: string
}

export default function QuestionStep({
  question,
  options,
  correct_answer,
  explanation,
  onComplete,
  step,
  consecutiveWrong = 0,
  courseId,
  courseTitle,
  lessonIndex,
  lessonTitle,
  stepIndex,
  conceptIds,
  difficulty = 3,
  questionId,
}: QuestionStepProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [timeOnStep, setTimeOnStep] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [showPracticeMore, setShowPracticeMore] = useState(false)
  const [adaptiveFeedback, setAdaptiveFeedback] = useState<string | null>(null)

  // Concept mastery tracking
  const { recordPerformance } = useConceptMastery()
  const stepStartTime = useState(() => Date.now())[0]

  // Adaptive difficulty tracking
  const { recordAnswer, state: adaptiveState } = useAdaptiveDifficulty({ courseId })
  const { startTimer, stopTimer } = useResponseTimer()

  // Start timer when component mounts
  useEffect(() => {
    startTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hint state
  const [currentHint, setCurrentHint] = useState<Hint | null>(null)
  const [, setHintRequested] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(false)

  // Help context for HelpModal
  const helpContext: HelpContext = {
    courseId: courseId || '',
    courseTitle: courseTitle || 'Course',
    lessonIndex: lessonIndex ?? 0,
    lessonTitle: lessonTitle || 'Lesson',
    stepIndex: stepIndex ?? 0,
    stepContent: question || '',
    stepType: 'question',
    userAnswer: selectedAnswer !== null ? options[selectedAnswer] : '',
    correctAnswer: options[correct_answer] || '',
    wasCorrect: false,
  }

  // Track time spent on this step
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOnStep((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Check for automatic hint triggers
  useEffect(() => {
    if (hintDismissed || currentHint || !step) return

    const context: HintCtx = {
      step,
      consecutiveWrong: consecutiveWrong + wrongAttempts,
      timeOnStep,
      requested: false,
    }

    const hint = generateHint(context)
    if (hint) {
      setCurrentHint(hint)
      setHintUsed(true)
    }
  }, [wrongAttempts, timeOnStep, step, consecutiveWrong, hintDismissed, currentHint])

  // Handle option selection
  const handleSelect = (index: number) => {
    if (hasChecked) return
    setSelectedAnswer(index)
  }

  // Handle check answer
  const handleCheck = async () => {
    if (selectedAnswer === null) return

    const correct = selectedAnswer === correct_answer
    setIsCorrect(correct)
    setHasChecked(true)

    if (!correct) {
      setWrongAttempts((prev) => prev + 1)
    }

    // Get response time
    const responseTimeMs = stopTimer() ?? (Date.now() - stepStartTime)

    // Record concept mastery (non-blocking)
    if (conceptIds && conceptIds.length > 0) {
      const performances = conceptIds.map(conceptId => ({
        conceptId,
        isCorrect: correct,
        responseTimeMs,
        usedHint: hintUsed,
      }))
      // Fire and forget - don't block the UI
      recordPerformance(performances).catch(() => {
        // Concept performance recording failed - continue anyway
      })
    }

    // Record answer for adaptive difficulty tracking (non-blocking)
    if (questionId) {
      recordAnswer({
        questionId,
        questionSource: 'lesson',
        isCorrect: correct,
        responseTimeMs,
        questionDifficulty: difficulty,
        conceptId: conceptIds?.[0],
      }).then(() => {
        // Show feedback if we got one from adaptive system
        if (adaptiveState.lastFeedback) {
          setAdaptiveFeedback(adaptiveState.lastFeedback)
        }
      }).catch(() => {
        // Adaptive answer recording failed - continue anyway
      })
    }
  }

  // Handle continue to next step
  const handleContinue = () => {
    onComplete(isCorrect, hintUsed)
  }

  // Handle hint request
  const handleRequestHint = () => {
    if (!step) return

    setHintRequested(true)
    setHintUsed(true)

    const context: HintCtx = {
      step,
      consecutiveWrong: consecutiveWrong + wrongAttempts,
      timeOnStep,
      requested: true,
    }

    const hint = generateHint(context)
    if (hint) {
      setCurrentHint(hint)
    }
  }

  // Handle hint dismissal
  const handleDismissHint = () => {
    setCurrentHint(null)
    setHintDismissed(true)
  }

  // Show hint button only after first wrong attempt and before checking
  const showHintButton = !hasChecked && wrongAttempts > 0 && !currentHint && !hintDismissed

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Question badge and text */}
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
          Question
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed">
          {question}
        </h2>
      </div>

      {/* Hint bubble (shows when triggered) */}
      {currentHint && !hasChecked && (
        <HintBubble
          hint={currentHint}
          onDismiss={handleDismissHint}
        />
      )}

      {/* Hint request button */}
      {showHintButton && (
        <div className="flex justify-center animate-fadeIn">
          <HintButton onClick={handleRequestHint} />
        </div>
      )}

      {/* Answer options */}
      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectAnswer = index === correct_answer
          const showCorrect = hasChecked && isCorrectAnswer
          const showWrong = hasChecked && isSelected && !isCorrectAnswer

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={hasChecked}
              className={`
                w-full p-4 rounded-2xl border-2 text-left transition-all duration-200
                ${hasChecked
                  ? showCorrect
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-500'
                    : showWrong
                      ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-500'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50'
                  : isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 scale-[1.02]'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
                }
                ${!hasChecked && 'cursor-pointer active:scale-[0.98]'}
              `}
            >
              <div className="flex items-center gap-4">
                {/* Letter indicator (A, B, C, D) */}
                <div
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all duration-200
                    ${hasChecked
                      ? showCorrect
                        ? 'bg-green-500 text-white'
                        : showWrong
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      : isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}
                >
                  {hasChecked ? (
                    showCorrect ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : showWrong ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      String.fromCharCode(65 + index)
                    )
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>

                {/* Option text */}
                <span
                  className={`
                    flex-1 font-medium text-base
                    ${hasChecked
                      ? showCorrect
                        ? 'text-green-800 dark:text-green-200'
                        : showWrong
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-gray-400 dark:text-gray-500'
                      : isSelected
                        ? 'text-indigo-900 dark:text-indigo-200'
                        : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {option}
                </span>

                {/* Selection indicator */}
                {!hasChecked && isSelected && (
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback box (shows after checking) */}
      {hasChecked && (
        <div
          className={`
            p-5 rounded-2xl animate-fadeIn
            ${isCorrect
              ? 'bg-green-100 dark:bg-green-900/40 border-2 border-green-400 dark:border-green-600'
              : 'bg-red-100 dark:bg-red-900/40 border-2 border-red-400 dark:border-red-600'
            }
          `}
        >
          {/* Feedback header */}
          <div className="flex items-center gap-3 mb-3">
            {isCorrect ? (
              <>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold text-green-800 dark:text-green-200">Correct!</span>
                  <span className="ml-2 text-2xl">🎉</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold text-red-800 dark:text-red-200">Not quite</span>
                </div>
              </>
            )}
          </div>

          {/* Hint used indicator */}
          {hintUsed && (
            <p className={`text-xs mb-2 ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              💡 Hint was used
            </p>
          )}

          {/* Adaptive difficulty feedback */}
          {adaptiveFeedback && (
            <p className={`text-xs mb-2 ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              ⚡ {adaptiveFeedback}
            </p>
          )}

          {/* Streak indicator */}
          {adaptiveState.streak >= 3 && adaptiveState.streakType === 'correct' && (
            <p className="text-xs mb-2 text-amber-600 dark:text-amber-400">
              🔥 {adaptiveState.streak} correct in a row!
            </p>
          )}

          {/* Explanation */}
          {explanation && (
            <p
              className={`
                text-sm leading-relaxed
                ${isCorrect
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
                }
              `}
            >
              {explanation}
            </p>
          )}

          {/* Show correct answer if wrong */}
          {!isCorrect && (
            <p className="mt-3 text-sm font-medium text-red-800 dark:text-red-200">
              The correct answer was: <span className="font-bold">{options[correct_answer]}</span>
            </p>
          )}

          {/* Help and Practice buttons for wrong answers */}
          {!isCorrect && courseId && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Need more practice?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowHelp(true)}
                  type="button"
                  className="flex-1 py-2 px-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition flex items-center justify-center gap-2"
                >
                  <span>🤔</span>
                  <span>Explain</span>
                </button>
                <button
                  onClick={() => setShowPracticeMore(true)}
                  type="button"
                  className="flex-1 py-2 px-4 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition flex items-center justify-center gap-2"
                >
                  <span>📝</span>
                  <span>Practice More</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {!hasChecked ? (
        <button
          onClick={handleCheck}
          disabled={selectedAnswer === null}
          className={`
            w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-200
            ${selectedAnswer !== null
              ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 cursor-pointer'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={handleContinue}
          className={`
            w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-200 animate-fadeIn
            ${isCorrect
              ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
            }
          `}
        >
          Continue
        </button>
      )}

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        context={helpContext}
      />

      {/* Practice More Modal */}
      {showPracticeMore && courseId && (
        <PracticeMore
          courseId={courseId}
          lessonIndex={lessonIndex}
          wrongQuestion={question}
          onClose={() => setShowPracticeMore(false)}
        />
      )}
    </div>
  )
}
