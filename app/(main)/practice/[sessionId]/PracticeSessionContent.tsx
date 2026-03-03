'use client'

// =============================================================================
// Practice Session Content
// Interactive practice session with questions
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useToast } from '@/contexts/ToastContext'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import DifficultyFeedback from '@/components/shared/DifficultyFeedback'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useExplanationTracker } from '@/lib/student-context/explanation-tracker'
import type {
  PracticeSession,
  PracticeQuestion,
  PracticeSessionQuestion,
  AnswerQuestionResponse,
  DeepDiveAnalysis,
} from '@/lib/practice/types'
import DeepDiveCard from '@/components/practice/DeepDiveCard'

// Lazy load InfiniteHeader - only loaded for infinite sessions
const InfiniteHeader = dynamic(() => import('@/components/practice/InfiniteHeader'), { ssr: false })

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
          className="h-full bg-violet-600 transition-all duration-300"
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
  const tp = useTranslations('practice')
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
    <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card p-6 border border-gray-200 dark:border-gray-700">
      {/* Question Type Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded">
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
                w-full p-4 rounded-lg border text-start transition-all
                ${
                  selectedAnswer === choice.label
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
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
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.question_type === 'fill_blank' && (
        <div className="mb-6">
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder={tp('fillInTheBlank')}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSubmitting) {
                handleSubmit()
              }
            }}
          />
        </div>
      )}

      {question.question_type === 'short_answer' && (
        <div className="mb-6">
          <textarea
            rows={4}
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder={tp('typeYourAnswer')}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
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
        className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {isSubmitting
          ? (question.question_type === 'short_answer' || question.question_type === 'fill_blank')
            ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                {tp('aiCheckingAnswer')}
              </span>
            )
            : tp('checking')
          : tp('submitAnswer')}
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
  evaluationFeedback?: string
  evaluationMethod?: string
  evaluationScore?: number
  deepDive?: DeepDiveAnalysis
  onNext: () => void
  onDifficultyFeedback?: (feedback: 'too_easy' | 'too_hard') => void
  questionIndex?: number
}

function ResultCard({ question, isCorrect, userAnswer, evaluationFeedback, evaluationMethod, evaluationScore, deepDive, onNext, onDifficultyFeedback, questionIndex = 0 }: ResultCardProps) {
  const tp = useTranslations('practice')
  const [deepDiveDismissed, setDeepDiveDismissed] = useState(false)
  // Determine display state: correct, partial credit, or incorrect
  const isPartialCredit = !isCorrect && evaluationScore !== undefined && evaluationScore >= 30
  const badgeConfig = isCorrect
    ? { bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: '\u2713', label: tp('correct') }
    : isPartialCredit
      ? { bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: '~', label: tp('partiallyCorrect') }
      : { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: '\u2717', label: tp('incorrect') }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card p-6 border border-gray-200 dark:border-gray-700">
      {/* Result Badge */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${badgeConfig.bg}`}
      >
        <span className="text-xl">{badgeConfig.icon}</span>
        <span className="font-medium">{badgeConfig.label}</span>
        {evaluationScore !== undefined && evaluationScore > 0 && evaluationScore < 100 && (
          <span className="text-sm opacity-75">({evaluationScore}%)</span>
        )}
      </div>

      {/* Question */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {question.question_text}
      </h2>

      {/* Evaluation Feedback — show for AI, fuzzy, and fuzzy_fallback */}
      {evaluationFeedback && (evaluationMethod === 'fuzzy' || evaluationMethod === 'ai' || evaluationMethod === 'fuzzy_fallback') && (
        <div className={`p-3 rounded-lg mb-4 ${
          evaluationMethod === 'ai'
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
        }`}>
          <p className={`text-sm ${
            evaluationMethod === 'ai'
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-amber-700 dark:text-amber-300'
          }`}>{evaluationFeedback}</p>
          {evaluationMethod === 'ai' && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 opacity-60">{tp('aiGraded')}</p>
          )}
        </div>
      )}

      {/* Answer Comparison */}
      <div className="space-y-3 mb-6">
        {!isCorrect && (
          <div className={`p-3 rounded-lg ${
            isPartialCredit
              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <p className={`text-sm mb-1 ${
              isPartialCredit
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}>{tp('yourAnswer')}</p>
            <p className={`font-medium ${
              isPartialCredit
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-red-800 dark:text-red-200'
            }`}>{userAnswer}</p>
          </div>
        )}
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">
            {isPartialCredit ? tp('referenceAnswer') : tp('correctAnswerIs')}
          </p>
          <p className="font-medium text-green-800 dark:text-green-200">
            {question.correct_answer}
          </p>
        </div>
      </div>

      {/* Explanation */}
      {question.explanation && (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {tp('explanationLabel')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{question.explanation}</p>
        </div>
      )}

      {/* Deep Dive Analysis (Feature #5: "Why Was I Wrong?") */}
      {!isCorrect && deepDive && !deepDiveDismissed && (
        <DeepDiveCard deepDive={deepDive} onDismiss={() => setDeepDiveDismissed(true)} />
      )}

      {/* Difficulty Feedback - only show after first 2 questions */}
      {onDifficultyFeedback && questionIndex >= 2 && (
        <DifficultyFeedback onFeedback={onDifficultyFeedback} namespace="practice" />
      )}

      {/* Next Button */}
      <button
        onClick={onNext}
        className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
      >
        {tp('nextQuestion')}
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
  infiniteData?: {
    longestStreak: number
    recentResults: boolean[]
  }
  onKeepGoing?: () => void
}

function SessionComplete({ session, answeredCount, correctCount, infiniteData, onKeepGoing }: SessionCompleteProps) {
  const tp = useTranslations('practice')
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
  const isInfinite = session.session_type === 'infinite'

  const getGrade = (acc: number) => {
    if (acc >= 90) return { label: tp('greatJob'), color: 'text-green-600 dark:text-green-400' }
    if (acc >= 75) return { label: tp('keepPracticing'), color: 'text-blue-600 dark:text-blue-400' }
    if (acc >= 60) return { label: tp('gettingHangOfThis'), color: 'text-amber-600 dark:text-amber-400' }
    return { label: tp('reviewAndTryAgain'), color: 'text-red-600 dark:text-red-400' }
  }

  const grade = getGrade(accuracy)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card p-8 border border-gray-200 dark:border-gray-700 text-center">
      <div className="text-6xl mb-4" aria-hidden="true">{isInfinite ? '\u267E\uFE0F' : '\uD83C\uDF89'}</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {isInfinite ? tp('infinite.sessionSummary') : tp('sessionComplete')}
      </h2>
      <p className={`text-xl font-semibold ${grade.color} mb-6`}>{grade.label}</p>

      {/* Stats */}
      <div className={`grid ${isInfinite && infiniteData ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-4 mb-8`}>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{answeredCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tp('questionsAnswered')}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{correctCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tp('correctAnswers')}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className={`text-3xl font-bold ${grade.color}`}>{accuracy}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tp('page.accuracy')}</p>
        </div>
        {isInfinite && infiniteData && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{infiniteData.longestStreak}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{tp('infinite.streak')}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Keep Going button (infinite mode or any session) */}
        {onKeepGoing && (
          <button
            type="button"
            onClick={onKeepGoing}
            className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
          >
            {tp('infinite.keepGoing')}
          </button>
        )}
        <div className="flex gap-4">
          <Link
            href="/practice"
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors text-center"
          >
            {tp('page.backToDashboard')}
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-medium rounded-lg transition-colors text-center"
          >
            {tp('page.goToDashboard')}
          </Link>
        </div>
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
  answers: _answers,
}: PracticeSessionContentProps) {
  const router = useRouter()
  const { error: showError } = useToast()
  const tp = useTranslations('practice')
  const startTimeRef = useRef<number>(Date.now())

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('adaptive_practice')

  // Explanation engagement tracking
  const { startTracking: startExplanationTracking, stopTracking: stopExplanationTracking } =
    useExplanationTracker('practice', session.id)

  // Infinite mode detection
  const isInfinite = session.session_type === 'infinite'

  // State
  const [currentIndex, setCurrentIndex] = useState(session.current_question_index)
  const [view, setView] = useState<SessionView>('question')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<AnswerQuestionResponse | null>(null)
  const [lastUserAnswer, setLastUserAnswer] = useState<string>('')
  const [answeredCount, setAnsweredCount] = useState(session.questions_answered)
  const [correctCount, setCorrectCount] = useState(session.questions_correct)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [_submitError, setSubmitError] = useState<{ answer: string; error: string } | null>(null)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)

  // Infinite mode state
  const [infiniteStreak, setInfiniteStreak] = useState(0)
  const [infiniteLongestStreak, setInfiniteLongestStreak] = useState(0)
  const [infiniteRecentResults, setInfiniteRecentResults] = useState<boolean[]>([])
  const [currentDifficulty, setCurrentDifficulty] = useState(session.target_difficulty || 3)
  const [isFetchingBatch, setIsFetchingBatch] = useState(false)
  const [allQuestions, setAllQuestions] = useState<PracticeQuestion[]>(questions)
  const [showStopConfirm, setShowStopConfirm] = useState(false)

  // Use allQuestions for infinite mode, original questions for normal mode
  const activeQuestions = isInfinite ? allQuestions : questions

  // Current question
  const currentQuestion = activeQuestions[currentIndex]

  // Track session view on mount
  useEffect(() => {
    if (!hasTrackedView) {
      trackFeature('practice_session_view', {
        sessionId: session.id,
        sessionType: session.session_type,
        questionCount: activeQuestions.length,
        currentIndex: session.current_question_index,
        isResume: session.current_question_index > 0,
      })
      setHasTrackedView(true)
    }
  }, [trackFeature, session, activeQuestions.length, hasTrackedView])

  // Check if session is already complete (skip for infinite mode)
  useEffect(() => {
    if (!isInfinite && (session.status === 'completed' || currentIndex >= activeQuestions.length)) {
      setView('complete')
    }
  }, [session.status, currentIndex, activeQuestions.length, isInfinite])

  // Infinite: pre-fetch next batch when buffer runs low
  const fetchNextBatch = useCallback(async () => {
    if (isFetchingBatch || !isInfinite) return
    setIsFetchingBatch(true)
    try {
      const last5 = infiniteRecentResults.slice(-5)
      const recentAccuracy = last5.length > 0 ? last5.filter(Boolean).length / last5.length : 0.5
      const weakConceptIds: string[] = []

      const res = await fetch(`/api/practice/session/${session.id}/next-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentDifficulty,
          recentAccuracy,
          questionsAnswered: answeredCount,
          weakConceptIds: weakConceptIds.length ? weakConceptIds : undefined,
        }),
      })

      if (!res.ok) throw new Error('Batch fetch failed')
      const data = await res.json()

      if (data.questions?.length > 0) {
        setAllQuestions(prev => [...prev, ...data.questions])
      }
      if (data.newDifficulty !== undefined) {
        setCurrentDifficulty(data.newDifficulty)
      }
    } catch {
      // Non-critical: will try again before next question
    } finally {
      setIsFetchingBatch(false)
    }
  }, [isFetchingBatch, isInfinite, infiniteRecentResults, currentDifficulty, answeredCount, session.id])

  const handleDifficultyFeedback = useCallback(async (feedback: 'too_easy' | 'too_hard') => {
    try {
      await fetch('/api/adaptive/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          session_id: session.id,
          question_id: currentQuestion?.id,
        }),
      })
    } catch {
      // Non-critical
    }
  }, [session.id, currentQuestion?.id])

  // Handle answer submission
  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!currentQuestion || isSubmitting) return

      setIsSubmitting(true)
      setLastUserAnswer(answer)
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

        // Check if response is JSON before parsing
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.error('[PracticeSession] Non-JSON response:', res.status)
          if (res.status === 504 || res.status === 503 || res.status === 502) {
            throw new Error('Server timeout. Please try again.')
          }
          throw new Error('Server error. Please try again.')
        }

        let data
        try {
          data = await res.json()
        } catch (parseError) {
          console.error('[PracticeSession] JSON parse error:', parseError)
          throw new Error('Server error. Please try again.')
        }

        if (!res.ok) {
          throw new Error(data.message || 'Failed to submit answer')
        }

        const result: AnswerQuestionResponse = data
        setSubmitError(null) // Clear any previous error
        setLastResult(result)
        setAnsweredCount(result.sessionProgress.questionsAnswered)
        setCorrectCount(result.sessionProgress.questionsCorrect)
        setView('result')

        // Infinite mode: track streak and recent results
        if (isInfinite) {
          const correct = result.isCorrect
          setInfiniteRecentResults(prev => [...prev.slice(-19), correct])
          if (correct) {
            setInfiniteStreak(prev => {
              const newStreak = prev + 1
              setInfiniteLongestStreak(longest => Math.max(longest, newStreak))
              return newStreak
            })
          } else {
            setInfiniteStreak(0)
          }
        }

        // Start explanation engagement tracking when result/explanation is shown
        if (currentQuestion?.explanation) {
          startExplanationTracking(currentQuestion.id)
        }

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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer'
        setSubmitError({ answer, error: errorMessage })
        showError('Failed to submit answer. Click "Retry" below to try again.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentQuestion, currentIndex, session.id, isSubmitting, isInfinite, trackFeature, showError, startExplanationTracking]
  )

  // Handle next question
  const handleNext = useCallback(async () => {
    // Stop explanation tracking when moving to next question
    stopExplanationTracking()

    const nextIndex = currentIndex + 1

    if (isInfinite) {
      // Infinite mode: pre-fetch when buffer is low (2 or fewer questions left)
      const remaining = allQuestions.length - nextIndex
      if (remaining <= 2) {
        fetchNextBatch()
      }

      // If we still have questions, continue
      if (nextIndex < allQuestions.length) {
        setCurrentIndex(nextIndex)
        setView('question')
        setLastResult(null)
        startTimeRef.current = Date.now()
      } else {
        // No more questions available, try to fetch and show loading
        if (!isFetchingBatch) {
          fetchNextBatch()
        }
        // Still no questions? Show waiting state briefly, then try again
        // If the fetch adds questions, the user will see the next one
        setCurrentIndex(nextIndex)
        setView('question')
        setLastResult(null)
        startTimeRef.current = Date.now()
      }
    } else {
      // Normal mode
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
    }
  }, [currentIndex, questions.length, allQuestions.length, session.id, session.session_type, answeredCount, correctCount, trackStep, trackFeature, stopExplanationTracking, isInfinite, fetchNextBatch, isFetchingBatch])

  // Handle stop (infinite mode)
  const handleStopInfinite = useCallback(async () => {
    setShowStopConfirm(false)
    try {
      await fetch(`/api/practice/session/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })

      trackFeature('practice_session_completed', {
        sessionId: session.id,
        sessionType: 'infinite',
        questionsAnswered: answeredCount,
        questionsCorrect: correctCount,
        accuracy: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
        longestStreak: infiniteLongestStreak,
      })
    } catch {
      // Non-critical
    }
    setView('complete')
  }, [session.id, answeredCount, correctCount, infiniteLongestStreak, trackFeature])

  // Handle abandon
  const handleAbandon = useCallback(async () => {
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
        totalQuestions: activeQuestions.length,
      })

      router.push('/practice')
    } catch {
      // Abandon failed - redirect anyway
      router.push('/practice')
    }
  }, [session.id, session.session_type, router, answeredCount, correctCount, currentIndex, activeQuestions.length, trackFeature])

  // Handle "Keep Going" — create a new infinite session
  const handleKeepGoing = useCallback(async () => {
    try {
      const res = await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'infinite',
          courseId: session.course_id || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create session')
      const data = await res.json()
      router.push(`/practice/${data.sessionId}`)
    } catch {
      showError(tp('page.failedToStartPractice'))
    }
  }, [session.course_id, router, showError, tp])

  // Render complete view
  if (view === 'complete') {
    return (
      <div className="min-h-screen bg-transparent py-8">
        <div className="max-w-2xl mx-auto px-4">
          <SessionComplete
            session={session}
            answeredCount={answeredCount}
            correctCount={correctCount}
            infiniteData={isInfinite ? {
              longestStreak: infiniteLongestStreak,
              recentResults: infiniteRecentResults,
            } : undefined}
            onKeepGoing={handleKeepGoing}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/practice"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {'\u2190'} Back
          </Link>
          {!isInfinite && (
            <button
              type="button"
              onClick={() => setShowQuitConfirm(true)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              {tp('endSession')}
            </button>
          )}
        </div>

        {/* Homework Error Context Banner */}
        {session.source_type === 'homework_error' && session.error_context && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3 mb-4">
            <p className="text-sm text-violet-700 dark:text-violet-300">
              {tp('homeworkErrorBanner', { topic: session.error_context.topic })}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/homework/${session.error_context!.checkId}`)}
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1"
            >
              {tp('backToHomework')}
            </button>
          </div>
        )}

        {/* Progress: InfiniteHeader for infinite mode, ProgressBar for normal mode */}
        {isInfinite ? (
          <InfiniteHeader
            streak={infiniteStreak}
            totalAnswered={answeredCount}
            recentResults={infiniteRecentResults}
            currentDifficulty={currentDifficulty}
            onStop={() => setShowStopConfirm(true)}
          />
        ) : (
          <ProgressBar current={answeredCount} total={questions.length} correct={correctCount} />
        )}

        {/* Loading state when infinite mode has no current question */}
        {isInfinite && !currentQuestion && view === 'question' && (
          <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card p-8 border border-gray-200 dark:border-gray-700 text-center">
            <span className="animate-spin inline-block h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full mb-4" />
            <p className="text-gray-600 dark:text-gray-400">{tp('infinite.generatingNext')}</p>
          </div>
        )}

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
            userAnswer={lastUserAnswer}
            evaluationFeedback={lastResult.evaluationFeedback}
            evaluationMethod={lastResult.evaluationMethod}
            evaluationScore={lastResult.evaluationScore}
            deepDive={lastResult.deepDive}
            onNext={handleNext}
            onDifficultyFeedback={handleDifficultyFeedback}
            questionIndex={currentIndex}
          />
        )}
      </div>

      {/* Quit Session Confirm Modal (normal mode) */}
      <ConfirmModal
        isOpen={showQuitConfirm}
        onClose={() => setShowQuitConfirm(false)}
        onConfirm={() => {
          setShowQuitConfirm(false)
          handleAbandon()
        }}
        title={tp('endSession')}
        message={tp('quitSessionConfirm')}
        variant="warning"
      />

      {/* Stop Infinite Session Confirm Modal */}
      <ConfirmModal
        isOpen={showStopConfirm}
        onClose={() => setShowStopConfirm(false)}
        onConfirm={handleStopInfinite}
        title={tp('infinite.stop')}
        message={tp('infinite.stopConfirm')}
        variant="warning"
      />
    </div>
  )
}
