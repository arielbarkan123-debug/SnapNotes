'use client'

// =============================================================================
// Practice Session Content
// Interactive practice session with questions
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import type {
  PracticeSession,
  PracticeQuestion,
  PracticeSessionQuestion,
  AnswerQuestionResponse,
} from '@/lib/practice/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PracticeSessionContentProps {
  session: PracticeSession
  questions: PracticeQuestion[]
  answers: PracticeSessionQuestion[]
}

type SessionView = 'question' | 'result' | 'complete'

// -----------------------------------------------------------------------------
// Progress Bar Component
// -----------------------------------------------------------------------------

function ProgressBar({
  current,
  total,
  correct,
}: {
  current: number
  total: number
  correct: number
}) {
  const progress = (current / total) * 100
  const accuracy = current > 0 ? Math.round((correct / current) * 100) : 0

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Question {current + 1} of {total}
        </span>
        <span
          className={`text-sm font-medium ${
            accuracy >= 70
              ? 'text-green-600 dark:text-green-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {accuracy}% accuracy
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Question Card Component
// -----------------------------------------------------------------------------

interface QuestionCardProps {
  question: PracticeQuestion
  onAnswer: (answer: string) => void
  isSubmitting: boolean
}

function QuestionCard({ question, onAnswer, isSubmitting }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [textAnswer, setTextAnswer] = useState('')

  const handleSubmit = () => {
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      if (selectedAnswer) {
        onAnswer(selectedAnswer)
      }
    } else {
      if (textAnswer.trim()) {
        onAnswer(textAnswer.trim())
      }
    }
  }

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer('')
    setTextAnswer('')
  }, [question.id])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Question Type Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
          {question.question_type.replace('_', ' ')}
        </span>
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
          Level {question.difficulty_level}
        </span>
      </div>

      {/* Question Text */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {question.question_text}
      </h2>

      {/* Answer Input */}
      {question.question_type === 'multiple_choice' && question.options?.choices && (
        <div className="space-y-3 mb-6">
          {question.options.choices.map((choice) => (
            <button
              key={choice.value}
              onClick={() => setSelectedAnswer(choice.label)}
              className={`
                w-full p-4 rounded-lg border text-left transition-all
                ${
                  selectedAnswer === choice.label
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {choice.label}.{' '}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{choice.value}</span>
            </button>
          ))}
        </div>
      )}

      {question.question_type === 'true_false' && (
        <div className="flex gap-4 mb-6">
          {['True', 'False'].map((option) => (
            <button
              key={option}
              onClick={() => setSelectedAnswer(option.toLowerCase())}
              className={`
                flex-1 py-4 rounded-lg border font-medium transition-all
                ${
                  selectedAnswer === option.toLowerCase()
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {(question.question_type === 'fill_blank' || question.question_type === 'short_answer') && (
        <div className="mb-6">
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder={
              question.question_type === 'fill_blank'
                ? 'Fill in the blank...'
                : 'Type your answer...'
            }
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSubmitting) {
                handleSubmit()
              }
            }}
          />
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={
          isSubmitting ||
          (question.question_type === 'multiple_choice' && !selectedAnswer) ||
          (question.question_type === 'true_false' && !selectedAnswer) ||
          ((question.question_type === 'fill_blank' || question.question_type === 'short_answer') &&
            !textAnswer.trim())
        }
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? 'Checking...' : 'Submit Answer'}
      </button>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Result Card Component
// -----------------------------------------------------------------------------

interface ResultCardProps {
  question: PracticeQuestion
  isCorrect: boolean
  userAnswer: string
  onNext: () => void
}

function ResultCard({ question, isCorrect, userAnswer, onNext }: ResultCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Result Badge */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
          isCorrect
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}
      >
        <span className="text-xl">{isCorrect ? '✓' : '✗'}</span>
        <span className="font-medium">{isCorrect ? 'Correct!' : 'Incorrect'}</span>
      </div>

      {/* Question */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {question.question_text}
      </h2>

      {/* Answer Comparison */}
      <div className="space-y-3 mb-6">
        {!isCorrect && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400 mb-1">Your answer:</p>
            <p className="font-medium text-red-800 dark:text-red-200">{userAnswer}</p>
          </div>
        )}
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Correct answer:</p>
          <p className="font-medium text-green-800 dark:text-green-200">
            {question.correct_answer}
          </p>
        </div>
      </div>

      {/* Explanation */}
      {question.explanation && (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Explanation
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{question.explanation}</p>
        </div>
      )}

      {/* Next Button */}
      <button
        onClick={onNext}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
      >
        Next Question
      </button>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Session Complete Component
// -----------------------------------------------------------------------------

interface SessionCompleteProps {
  session: PracticeSession
  answeredCount: number
  correctCount: number
}

function SessionComplete({ session: _session, answeredCount, correctCount }: SessionCompleteProps) {
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

  const getGrade = (acc: number) => {
    if (acc >= 90) return { label: 'Excellent!', color: 'text-green-600 dark:text-green-400' }
    if (acc >= 75) return { label: 'Good Job!', color: 'text-blue-600 dark:text-blue-400' }
    if (acc >= 60) return { label: 'Keep Practicing', color: 'text-amber-600 dark:text-amber-400' }
    return { label: 'Needs Work', color: 'text-red-600 dark:text-red-400' }
  }

  const grade = getGrade(accuracy)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Session Complete!
      </h2>
      <p className={`text-xl font-semibold ${grade.color} mb-6`}>{grade.label}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{answeredCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Questions</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{correctCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Correct</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className={`text-3xl font-bold ${grade.color}`}>{accuracy}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href="/practice"
          className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
        >
          Back to Practice Hub
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function PracticeSessionContent({
  session,
  questions,
  answers,
}: PracticeSessionContentProps) {
  const router = useRouter()
  const startTimeRef = useRef<number>(Date.now())

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('adaptive_practice')

  // State
  const [currentIndex, setCurrentIndex] = useState(session.current_question_index)
  const [view, setView] = useState<SessionView>('question')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<AnswerQuestionResponse | null>(null)
  const [answeredCount, setAnsweredCount] = useState(session.questions_answered)
  const [correctCount, setCorrectCount] = useState(session.questions_correct)
  const [hasTrackedView, setHasTrackedView] = useState(false)

  // Current question
  const currentQuestion = questions[currentIndex]

  // Track session view on mount
  useEffect(() => {
    if (!hasTrackedView) {
      trackFeature('practice_session_view', {
        sessionId: session.id,
        sessionType: session.session_type,
        questionCount: questions.length,
        currentIndex: session.current_question_index,
        isResume: session.current_question_index > 0,
      })
      setHasTrackedView(true)
    }
  }, [trackFeature, session, questions.length, hasTrackedView])

  // Check if session is already complete
  useEffect(() => {
    if (session.status === 'completed' || currentIndex >= questions.length) {
      setView('complete')
    }
  }, [session.status, currentIndex, questions.length])

  // Handle answer submission
  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!currentQuestion || isSubmitting) return

      setIsSubmitting(true)
      const responseTime = Date.now() - startTimeRef.current

      try {
        const res = await fetch(`/api/practice/session/${session.id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            questionIndex: currentIndex,
            userAnswer: answer,
            responseTimeMs: responseTime,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.message || 'Failed to submit answer')
        }

        const result: AnswerQuestionResponse = await res.json()
        setLastResult(result)
        setAnsweredCount(result.sessionProgress.questionsAnswered)
        setCorrectCount(result.sessionProgress.questionsCorrect)
        setView('result')

        // Track answer submitted
        trackFeature('practice_answer_submitted', {
          sessionId: session.id,
          questionId: currentQuestion.id,
          questionIndex: currentIndex,
          questionType: currentQuestion.question_type,
          difficultyLevel: currentQuestion.difficulty_level,
          isCorrect: result.isCorrect,
          responseTimeMs: responseTime,
        })
      } catch {
        alert('Failed to submit answer. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentQuestion, currentIndex, session.id, isSubmitting, trackFeature]
  )

  // Handle next question
  const handleNext = useCallback(async () => {
    const nextIndex = currentIndex + 1

    if (nextIndex >= questions.length) {
      // Complete session
      try {
        await fetch(`/api/practice/session/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' }),
        })

        // Track session completion
        trackStep('session_completed', 5)
        trackFeature('practice_session_completed', {
          sessionId: session.id,
          sessionType: session.session_type,
          questionsAnswered: answeredCount + 1,
          questionsCorrect: correctCount,
          accuracy: Math.round((correctCount / (answeredCount + 1)) * 100),
        })
      } catch {
        // Session completion failed - continue anyway
      }
      setView('complete')
    } else {
      setCurrentIndex(nextIndex)
      setView('question')
      setLastResult(null)
      startTimeRef.current = Date.now()
    }
  }, [currentIndex, questions.length, session.id, answeredCount, correctCount, trackStep, trackFeature])

  // Handle abandon
  const handleAbandon = useCallback(async () => {
    if (!confirm('Are you sure you want to quit this session?')) return

    try {
      await fetch(`/api/practice/session/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abandon' }),
      })

      // Track session abandonment
      trackFeature('practice_session_abandoned', {
        sessionId: session.id,
        sessionType: session.session_type,
        questionsAnswered: answeredCount,
        questionsCorrect: correctCount,
        currentIndex,
        totalQuestions: questions.length,
      })

      router.push('/practice')
    } catch {
      // Abandon failed - redirect anyway
      router.push('/practice')
    }
  }, [session.id, router, answeredCount, correctCount, currentIndex, questions.length, trackFeature])

  // Render complete view
  if (view === 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <SessionComplete
            session={session}
            answeredCount={answeredCount}
            correctCount={correctCount}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/practice"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <button
            onClick={handleAbandon}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Quit Session
          </button>
        </div>

        {/* Progress */}
        <ProgressBar current={answeredCount} total={questions.length} correct={correctCount} />

        {/* Question or Result */}
        {view === 'question' && currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            isSubmitting={isSubmitting}
          />
        )}

        {view === 'result' && currentQuestion && lastResult && (
          <ResultCard
            question={currentQuestion}
            isCorrect={lastResult.isCorrect}
            userAnswer={
              answers.find((a) => a.question_index === currentIndex)?.user_answer || ''
            }
            onNext={handleNext}
          />
        )}
      </div>
    </div>
  )
}
