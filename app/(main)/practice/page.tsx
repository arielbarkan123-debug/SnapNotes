'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import type { Course } from '@/types'
import type { ReviewCard as ReviewCardType } from '@/types/srs'
import { parseCardBack, isMultipleChoice, isTrueFalse, isFillBlank, isMatching, isSequence } from '@/types/srs'
import MultipleChoice from '@/components/practice/MultipleChoice'
import TrueFalse from '@/components/practice/TrueFalse'
import FillBlank from '@/components/practice/FillBlank'
import ShortAnswer from '@/components/practice/ShortAnswer'
import Matching from '@/components/practice/Matching'
import Sequence from '@/components/practice/Sequence'

// =============================================================================
// Types
// =============================================================================

type SessionState = 'loading' | 'setup' | 'practicing' | 'complete'

type CardCount = 10 | 20 | 50

interface PracticeCard extends ReviewCardType {
  courseName: string
  lessonTitle: string
}

interface CourseStats {
  courseId: string
  courseName: string
  total: number
  correct: number
}

interface PracticeStats {
  cardsCompleted: number
  totalCards: number
  correctCount: number
  startTime: number
  byCourse: Record<string, CourseStats>
}

interface Answer {
  cardId: string
  courseId: string
  wasCorrect: boolean
}

// =============================================================================
// Main Component
// =============================================================================

export default function PracticePage() {
  // Setup state
  const [sessionState, setSessionState] = useState<SessionState>('loading')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [cardCount, setCardCount] = useState<CardCount>(20)
  const [error, setError] = useState<string | null>(null)

  // Practice session state
  const [cards, setCards] = useState<PracticeCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnswerShown, setIsAnswerShown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [_answers, setAnswers] = useState<Answer[]>([])
  const [interactiveResult, setInteractiveResult] = useState<boolean | null>(null) // Track if interactive card was answered correctly

  // Stats
  const [stats, setStats] = useState<PracticeStats>({
    cardsCompleted: 0,
    totalCards: 0,
    correctCount: 0,
    startTime: 0,
    byCourse: {},
  })

  // Timing
  const cardStartTimeRef = useRef<number>(0)

  // ==========================================================================
  // Load courses
  // ==========================================================================

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch('/api/courses')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load courses')
        }

        setCourses(data.courses || [])
        setSessionState('setup')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load courses')
        setSessionState('setup')
      }
    }

    loadCourses()
  }, [])

  // ==========================================================================
  // Generate practice session
  // ==========================================================================

  const startPractice = useCallback(async () => {
    if (courses.length === 0) return

    setError(null)

    try {
      // Build course filter (empty = all courses)
      const courseFilter = selectedCourseIds.length > 0 ? selectedCourseIds : courses.map(c => c.id)

      // Fetch cards for practice
      const response = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_ids: courseFilter,
          card_count: cardCount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate practice session')
      }

      if (!data.cards || data.cards.length === 0) {
        setError('No cards available for practice. Complete some lessons first!')
        return
      }

      // Map course info to cards
      const courseMap = new Map(courses.map(c => [c.id, c]))
      const practiceCards: PracticeCard[] = data.cards.map((card: ReviewCardType) => {
        const course = courseMap.get(card.course_id)
        const lessonTitle = course?.generated_course?.lessons?.[card.lesson_index]?.title || `Lesson ${card.lesson_index + 1}`

        return {
          ...card,
          courseName: course?.title || 'Unknown Course',
          lessonTitle,
        }
      })

      // Initialize stats by course
      const byCourse: Record<string, CourseStats> = {}
      for (const card of practiceCards) {
        if (!byCourse[card.course_id]) {
          byCourse[card.course_id] = {
            courseId: card.course_id,
            courseName: card.courseName,
            total: 0,
            correct: 0,
          }
        }
        byCourse[card.course_id].total++
      }

      setCards(practiceCards)
      setStats({
        cardsCompleted: 0,
        totalCards: practiceCards.length,
        correctCount: 0,
        startTime: Date.now(),
        byCourse,
      })
      setCurrentIndex(0)
      setIsAnswerShown(false)
      setAnswers([])
      setInteractiveResult(null)
      setSessionState('practicing')
      cardStartTimeRef.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start practice')
    }
  }, [courses, selectedCourseIds, cardCount])

  // ==========================================================================
  // Toggle course selection
  // ==========================================================================

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const selectAllCourses = () => {
    setSelectedCourseIds([])
  }

  // ==========================================================================
  // Show answer (for flashcard types)
  // ==========================================================================

  const showAnswer = () => {
    setIsAnswerShown(true)
  }

  // ==========================================================================
  // Handle interactive card answer (multiple choice, true/false, etc.)
  // ==========================================================================

  const handleInteractiveAnswer = (wasCorrect: boolean) => {
    setInteractiveResult(wasCorrect)
    setIsAnswerShown(true) // This triggers showing the rating buttons
  }

  // ==========================================================================
  // Submit answer (correct/incorrect)
  // ==========================================================================

  const submitAnswer = async (wasCorrect: boolean) => {
    if (isSubmitting || !cards[currentIndex]) return

    const currentCard = cards[currentIndex]
    setIsSubmitting(true)

    try {
      const durationMs = Date.now() - cardStartTimeRef.current

      // Record the answer
      const answer: Answer = {
        cardId: currentCard.id,
        courseId: currentCard.course_id,
        wasCorrect,
      }
      setAnswers(prev => [...prev, answer])

      // Update stats
      setStats(prev => {
        const newByCourse = { ...prev.byCourse }
        if (newByCourse[currentCard.course_id]) {
          newByCourse[currentCard.course_id] = {
            ...newByCourse[currentCard.course_id],
            correct: wasCorrect
              ? newByCourse[currentCard.course_id].correct + 1
              : newByCourse[currentCard.course_id].correct,
          }
        }

        return {
          ...prev,
          cardsCompleted: prev.cardsCompleted + 1,
          correctCount: wasCorrect ? prev.correctCount + 1 : prev.correctCount,
          byCourse: newByCourse,
        }
      })

      // Save to practice log (fire and forget)
      fetch('/api/practice/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: currentCard.id,
          was_correct: wasCorrect,
          duration_ms: durationMs,
        }),
      }).catch(console.error)

      // Move to next card or complete
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
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
  // Computed values
  // ==========================================================================

  const currentCard = cards[currentIndex]

  // Check if card is an interactive type
  const isInteractiveCard = (card: PracticeCard): boolean => {
    return ['multiple_choice', 'true_false', 'fill_blank', 'matching', 'sequence'].includes(card.card_type)
  }

  const courseStatsArray = useMemo(() => {
    return Object.values(stats.byCourse).sort((a, b) => {
      // Sort by accuracy (ascending, so weakest first)
      const accuracyA = a.total > 0 ? a.correct / a.total : 0
      const accuracyB = b.total > 0 ? b.correct / b.total : 0
      return accuracyA - accuracyB
    })
  }, [stats.byCourse])

  const _weakestCourse = courseStatsArray[0]

  // ==========================================================================
  // Render: Loading
  // ==========================================================================

  if (sessionState === 'loading') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // Render: Complete
  // ==========================================================================

  if (sessionState === 'complete') {
    const timeSpentMs = Date.now() - stats.startTime
    const minutes = Math.floor(timeSpentMs / 60000)
    const seconds = Math.floor((timeSpentMs % 60000) / 1000)
    const accuracy = stats.totalCards > 0
      ? Math.round((stats.correctCount / stats.totalCards) * 100)
      : 0

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-5xl">🧠</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Practice Complete!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Great work on your mixed practice session
            </p>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {stats.totalCards}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cards Practiced
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className={`text-2xl font-bold ${
                accuracy >= 80 ? 'text-green-600 dark:text-green-400' :
                accuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {accuracy}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Accuracy
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Time
              </div>
            </div>
          </div>

          {/* Performance by Course */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Performance by Course</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {courseStatsArray.map((courseStat, index) => {
                const courseAccuracy = courseStat.total > 0
                  ? Math.round((courseStat.correct / courseStat.total) * 100)
                  : 0
                const isWeakest = index === 0 && courseAccuracy < 80 && courseStatsArray.length > 1

                return (
                  <div
                    key={courseStat.courseId}
                    className={`px-4 py-3 ${isWeakest ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
                        {courseStat.courseName}
                        {isWeakest && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-full">
                            Needs Review
                          </span>
                        )}
                      </span>
                      <span className={`text-sm font-semibold ${
                        courseAccuracy >= 80 ? 'text-green-600 dark:text-green-400' :
                        courseAccuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {courseStat.correct}/{courseStat.total} ({courseAccuracy}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          courseAccuracy >= 80 ? 'bg-green-500' :
                          courseAccuracy >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${courseAccuracy}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setSessionState('setup')
                setAnswers([])
              }}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
            >
              Practice Again
            </button>
            <Link
              href="/dashboard"
              className="block w-full py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-xl transition-colors text-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // Render: Setup
  // ==========================================================================

  if (sessionState === 'setup') {
    const hasNoCourses = courses.length === 0

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-4xl">🔀</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mixed Practice
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Interleaved practice from multiple courses
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
              {error}
              {error.includes('No cards available') && (
                <button
                  onClick={async () => {
                    setError(null)
                    try {
                      const res = await fetch('/api/srs/cards/generate-all', { method: 'POST' })
                      const data = await res.json()
                      if (data.success && data.totalCreated > 0) {
                        setError(null)
                        startPractice()
                      } else if (data.totalCreated === 0) {
                        setError('No cards could be generated. Try completing some lessons first.')
                      }
                    } catch {
                      setError('Failed to generate cards. Please try again.')
                    }
                  }}
                  className="mt-3 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Generate Practice Cards
                </button>
              )}
            </div>
          )}

          {hasNoCourses ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You don't have any courses yet. Create a course to start practicing!
              </p>
              <Link
                href="/dashboard"
                className="inline-block py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <>
              {/* Card Count Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Number of Cards
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([10, 20, 50] as CardCount[]).map(count => (
                    <button
                      key={count}
                      onClick={() => setCardCount(count)}
                      className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                        cardCount === count
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      {count} cards
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Selection */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Topics
                  </label>
                  <button
                    onClick={selectAllCourses}
                    className={`text-sm ${
                      selectedCourseIds.length === 0
                        ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    All Courses
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {courses.map(course => {
                    const isSelected = selectedCourseIds.length === 0 || selectedCourseIds.includes(course.id)

                    return (
                      <button
                        key={course.id}
                        onClick={() => toggleCourse(course.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                          isSelected && selectedCourseIds.length > 0
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500'
                            : selectedCourseIds.length === 0
                              ? 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent'
                              : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 opacity-60'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {course.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                      Why Mixed Practice?
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                      Interleaved practice improves long-term retention by forcing your brain to recall information from different contexts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={startPractice}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all text-lg shadow-lg"
              >
                Start Practice
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
            </>
          )}
        </div>
      </div>
    )
  }

  // ==========================================================================
  // Render: Practicing
  // ==========================================================================

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
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => {
              if (confirm('End practice session?')) {
                setSessionState('complete')
              }
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 -ml-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Mixed Practice badge */}
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
            Mixed Practice
          </span>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="w-full max-w-2xl px-4">
          {/* Render appropriate card type */}
          {(() => {
            const cardData = parseCardBack(currentCard)
            const cardType = currentCard.card_type

            // Multiple Choice
            if (cardType === 'multiple_choice' || cardType === 'question') {
              if (isMultipleChoice(cardData)) {
                return (
                  <MultipleChoice
                    question={currentCard.front}
                    options={cardData.options}
                    correctIndex={cardData.correctIndex}
                    explanation={cardData.explanation}
                    onAnswer={handleInteractiveAnswer}
                  />
                )
              }
            }

            // True/False
            if (cardType === 'true_false') {
              if (isTrueFalse(cardData)) {
                return (
                  <TrueFalse
                    statement={currentCard.front}
                    correct={cardData.correct}
                    explanation={cardData.explanation}
                    onAnswer={handleInteractiveAnswer}
                  />
                )
              }
            }

            // Fill in the Blank
            if (cardType === 'fill_blank') {
              if (isFillBlank(cardData)) {
                return (
                  <FillBlank
                    sentence={currentCard.front}
                    answer={cardData.answer}
                    acceptableAnswers={cardData.acceptableAnswers}
                    onAnswer={handleInteractiveAnswer}
                  />
                )
              }
            }

            // Matching
            if (cardType === 'matching') {
              if (isMatching(cardData)) {
                return (
                  <Matching
                    terms={cardData.terms}
                    definitions={cardData.definitions}
                    correctPairs={cardData.correctPairs}
                    onAnswer={handleInteractiveAnswer}
                  />
                )
              }
            }

            // Sequence
            if (cardType === 'sequence') {
              if (isSequence(cardData)) {
                return (
                  <Sequence
                    instruction={currentCard.front}
                    items={cardData.items}
                    correctOrder={cardData.correctOrder}
                    onAnswer={handleInteractiveAnswer}
                  />
                )
              }
            }

            // Short Answer (self-graded)
            if (cardType === 'short_answer') {
              const modelAnswer = typeof cardData === 'string' ? cardData : currentCard.back
              return (
                <ShortAnswer
                  question={currentCard.front}
                  modelAnswer={modelAnswer}
                  onAnswer={handleInteractiveAnswer}
                />
              )
            }

            // Default: Flashcard / Key Point / Explanation / Formula (simple reveal)
            return (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Card Type Badge */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {currentCard.card_type.replace('_', ' ')}
                  </span>
                </div>

                {/* Front (Question) */}
                <div className="p-6">
                  <p className="text-lg text-gray-900 dark:text-white leading-relaxed">
                    {currentCard.front}
                  </p>
                </div>

                {/* Back (Answer) - only shown after reveal */}
                {isAnswerShown && (
                  <>
                    <div className="border-t border-gray-100 dark:border-gray-700" />
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20">
                      <p className="text-lg text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {currentCard.back}
                      </p>

                      {/* Course/Lesson info */}
                      <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/40">
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">
                          <span className="font-medium">From:</span> {currentCard.courseName} — {currentCard.lessonTitle}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pb-4 max-w-2xl mx-auto px-4">
        {(() => {
          // For interactive cards that have been answered
          if (interactiveResult !== null) {
            return (
              <button
                onClick={() => submitAnswer(interactiveResult)}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all text-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Next Card'}
              </button>
            )
          }

          // For flashcard types - show/reveal pattern
          if (!isInteractiveCard(currentCard)) {
            if (!isAnswerShown) {
              return (
                <button
                  onClick={showAnswer}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors text-lg"
                >
                  Show Answer
                </button>
              )
            } else {
              return (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => submitAnswer(false)}
                    disabled={isSubmitting}
                    className="py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Incorrect
                    </span>
                  </button>
                  <button
                    onClick={() => submitAnswer(true)}
                    disabled={isSubmitting}
                    className="py-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Correct
                    </span>
                  </button>
                </div>
              )
            }
          }

          // Interactive card not yet answered - no buttons (component handles it)
          return null
        })()}
      </div>
    </div>
  )
}
