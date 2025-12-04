'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ReviewCard from '@/components/srs/ReviewCard'
import RatingButtons from '@/components/srs/RatingButtons'
import type { Rating, ReviewSession } from '@/types'

// Dynamic import - only loaded when review session completes
const ReviewComplete = dynamic(() => import('@/components/srs/ReviewComplete'))

// =============================================================================
// Types
// =============================================================================

type SessionState = 'loading' | 'start' | 'reviewing' | 'complete'

interface SessionStats {
  cardsReviewed: number
  correctCount: number
  againCount: number
  startTime: number
}

// =============================================================================
// Component
// =============================================================================

export default function ReviewPage() {
  const router = useRouter()

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('loading')
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Review state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnswerShown, setIsAnswerShown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [interactiveResult, setInteractiveResult] = useState<boolean | null>(null) // Track if interactive card was answered correctly

  // Stats tracking
  const [stats, setStats] = useState<SessionStats>({
    cardsReviewed: 0,
    correctCount: 0,
    againCount: 0,
    startTime: 0,
  })

  // Card start time for duration tracking
  const cardStartTimeRef = useRef<number>(0)

  // ==========================================================================
  // Fetch due cards
  // ==========================================================================

  const fetchDueCards = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/srs/due')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cards')
      }

      setSession(data)
      setSessionState(data.cards_due > 0 ? 'start' : 'start')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review session')
      setSessionState('start')
    }
  }, [])

  useEffect(() => {
    fetchDueCards()
  }, [fetchDueCards])

  // ==========================================================================
  // Start session
  // ==========================================================================

  const startSession = () => {
    if (!session || session.cards.length === 0) return

    setSessionState('reviewing')
    setCurrentIndex(0)
    setIsAnswerShown(false)
    setInteractiveResult(null)
    setStats({
      cardsReviewed: 0,
      correctCount: 0,
      againCount: 0,
      startTime: Date.now(),
    })
    cardStartTimeRef.current = Date.now()
  }

  // ==========================================================================
  // Show answer
  // ==========================================================================

  const showAnswer = () => {
    setIsAnswerShown(true)
  }

  // ==========================================================================
  // Handle interactive card answer
  // ==========================================================================

  const handleInteractiveAnswer = (wasCorrect: boolean) => {
    setInteractiveResult(wasCorrect)
  }

  // ==========================================================================
  // Submit rating
  // ==========================================================================

  const submitRating = async (rating: Rating) => {
    if (!session || isSubmitting) return

    const currentCard = session.cards[currentIndex]
    if (!currentCard) return

    setIsSubmitting(true)

    try {
      const durationMs = Date.now() - cardStartTimeRef.current

      const response = await fetch('/api/srs/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: currentCard.id,
          rating,
          duration_ms: durationMs,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit review')
      }

      // Update stats
      setStats((prev) => ({
        ...prev,
        cardsReviewed: prev.cardsReviewed + 1,
        correctCount: rating >= 3 ? prev.correctCount + 1 : prev.correctCount,
        againCount: rating === 1 ? prev.againCount + 1 : prev.againCount,
      }))

      // Move to next card or complete
      if (currentIndex < session.cards.length - 1) {
        setCurrentIndex((prev) => prev + 1)
        setIsAnswerShown(false)
        setInteractiveResult(null)
        cardStartTimeRef.current = Date.now()
      } else {
        setSessionState('complete')
      }
    } catch (err) {
      console.error('Review error:', err)
      // Still move to next card even on error
      if (currentIndex < session.cards.length - 1) {
        setCurrentIndex((prev) => prev + 1)
        setIsAnswerShown(false)
        setInteractiveResult(null)
        cardStartTimeRef.current = Date.now()
      } else {
        setSessionState('complete')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  // Loading state
  if (sessionState === 'loading') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading review session...</p>
        </div>
      </div>
    )
  }

  // Complete state
  if (sessionState === 'complete') {
    return (
      <ReviewComplete
        cardsReviewed={stats.cardsReviewed}
        timeSpentMs={Date.now() - stats.startTime}
        correctCount={stats.correctCount}
        againCount={stats.againCount}
      />
    )
  }

  // Start state
  if (sessionState === 'start') {
    return (
      <StartScreen
        session={session}
        error={error}
        onStart={startSession}
        onRefresh={fetchDueCards}
      />
    )
  }

  // Reviewing state
  const currentCard = session?.cards[currentIndex]
  if (!currentCard) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No card to display</p>
          <button
            onClick={() => setSessionState('complete')}
            className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-700"
          >
            End Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 -ml-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Card {currentIndex + 1} of {session?.cards.length || 0}
          </span>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / (session?.cards.length || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center py-4 px-4">
        <ReviewCard
          card={currentCard}
          onShowAnswer={showAnswer}
          isAnswerShown={isAnswerShown}
          onAnswer={handleInteractiveAnswer}
        />
      </div>

      {/* Rating buttons (only show when answer is shown) */}
      {isAnswerShown && (
        <div className="mt-4 pb-4 max-w-2xl mx-auto w-full px-4">
          <RatingButtons
            card={currentCard}
            onRate={submitRating}
            isLoading={isSubmitting}
            interactiveResult={interactiveResult}
          />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Start Screen Component
// =============================================================================

interface StartScreenProps {
  session: ReviewSession | null
  error: string | null
  onStart: () => void
  onRefresh: () => void
}

function StartScreen({ session, error, onStart, onRefresh }: StartScreenProps) {
  const totalCards = session?.cards_due || 0
  const newCards = session?.new_cards || 0
  const reviewCards = session?.review_cards || 0
  const estimatedMinutes = Math.ceil(totalCards * 0.5) // 30 seconds per card

  // No cards due
  if (!error && totalCards === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Celebration Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <span className="text-5xl">🎉</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            All Caught Up!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            You&apos;ve reviewed all your cards for today. Come back later for more!
          </p>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-center"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={onRefresh}
              className="w-full py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-xl transition-colors"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Unable to Load Cards
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>

          <button
            onClick={onRefresh}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Ready to start
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Daily Review
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Strengthen your memory with spaced repetition
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {totalCards}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total Cards
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {newCards}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              New
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {reviewCards}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Review
            </div>
          </div>
        </div>

        {/* Estimated time */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-8 flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-400">
            Estimated time: <span className="font-medium text-gray-900 dark:text-white">{estimatedMinutes} min</span>
          </span>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          Start Review
        </button>

        {/* Back link */}
        <div className="text-center mt-4">
          <Link
            href="/dashboard"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
