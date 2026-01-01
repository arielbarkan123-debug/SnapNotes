'use client'

// =============================================================================
// Practice Hub Content
// New practice session interface with gap-targeting and adaptive features
// =============================================================================

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import { usePracticeStats } from '@/hooks/usePracticeSession'
import type { SessionType, PracticeSession } from '@/lib/practice/types'
import type { DifficultyLevel } from '@/lib/adaptive/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Course {
  id: string
  title: string
}

interface PracticeHubContentProps {
  courses: Course[]
  gapsCount: number
  questionsPerCourse: Record<string, number>
}

// -----------------------------------------------------------------------------
// Quick Practice Card Component
// -----------------------------------------------------------------------------

interface QuickPracticeCardProps {
  title: string
  description: string
  icon: string
  count?: number
  countLabel?: string
  available: boolean
  onClick: () => void
  variant?: 'default' | 'primary' | 'warning'
}

function QuickPracticeCard({
  title,
  description,
  icon,
  count,
  countLabel,
  available,
  onClick,
  variant = 'default',
}: QuickPracticeCardProps) {
  const bgClass = {
    default: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750',
    primary: 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
    warning: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30',
  }[variant]

  const iconBgClass = {
    default: 'bg-gray-100 dark:bg-gray-700',
    primary: 'bg-indigo-100 dark:bg-indigo-800/50',
    warning: 'bg-amber-100 dark:bg-amber-800/50',
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={`
        relative p-5 rounded-xl border border-gray-200 dark:border-gray-700
        transition-all duration-200 text-left w-full
        ${bgClass}
        ${!available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${iconBgClass}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
          {count !== undefined && countLabel && (
            <div className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {count} {countLabel}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// -----------------------------------------------------------------------------
// Recent Session Card Component
// -----------------------------------------------------------------------------

interface RecentSessionCardProps {
  session: PracticeSession
  onClick: () => void
}

function RecentSessionCard({ session, onClick }: RecentSessionCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    abandoned: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const typeLabels: Record<SessionType, string> = {
    targeted: 'Gap Practice',
    mixed: 'Mixed Practice',
    exam_prep: 'Exam Prep',
    quick: 'Quick Practice',
    custom: 'Custom',
  }

  const accuracy = session.questions_answered > 0
    ? Math.round((session.questions_correct / session.questions_answered) * 100)
    : 0

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors w-full text-left"
    >
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[session.status]}`}>
          {session.status}
        </span>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {typeLabels[session.session_type]}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {session.questions_answered}/{session.question_count} questions
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${accuracy >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {accuracy}%
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(session.created_at).toLocaleDateString()}
        </p>
      </div>
    </button>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function PracticeHubContent({
  courses,
  gapsCount,
  questionsPerCourse,
}: PracticeHubContentProps) {
  const router = useRouter()
  const { stats, activeSessions, recentSessions, isLoading } = usePracticeStats()

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('adaptive_practice')

  // Track page view on mount
  useEffect(() => {
    trackStep('practice_hub_opened', 1)
    trackFeature('practice_hub_view', {
      coursesCount: courses.length,
      gapsCount,
      totalQuestions: Object.values(questionsPerCourse).reduce((a, b) => a + b, 0),
      hasActiveSessions: activeSessions.length > 0,
    })
  }, [trackStep, trackFeature, courses.length, gapsCount, questionsPerCourse, activeSessions.length])

  // Custom session setup state
  const [showCustomSetup, setShowCustomSetup] = useState(false)
  const [customConfig, setCustomConfig] = useState({
    courseId: '',
    questionCount: 10,
    difficulty: 0 as DifficultyLevel | 0,
  })
  const [isCreating, setIsCreating] = useState(false)

  // Create a practice session
  const createSession = useCallback(
    async (sessionType: SessionType, courseId?: string) => {
      setIsCreating(true)

      // Track session start attempt
      trackStep('session_configured', 2)
      trackFeature('practice_session_create', {
        sessionType,
        courseId,
        questionCount: sessionType === 'quick' ? 5 : sessionType === 'exam_prep' ? 30 : 10,
      })

      try {
        const res = await fetch('/api/practice/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionType,
            courseId,
            questionCount: sessionType === 'quick' ? 5 : sessionType === 'exam_prep' ? 30 : 10,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.message || 'Failed to create session')
        }

        const { sessionId } = await res.json()

        // Track session created successfully
        trackStep('session_started', 3)
        trackFeature('practice_session_started', {
          sessionType,
          sessionId,
          courseId,
        })

        router.push(`/practice/${sessionId}`)
      } catch (error) {
        console.error('Failed to create session:', error)
        trackFeature('practice_session_error', {
          sessionType,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        alert(error instanceof Error ? error.message : 'Failed to create session')
      } finally {
        setIsCreating(false)
      }
    },
    [router, trackStep, trackFeature]
  )

  // Create custom session
  const createCustomSession = useCallback(async () => {
    setIsCreating(true)

    // Track custom session configuration
    trackStep('session_configured', 2)
    trackFeature('practice_custom_session_create', {
      sessionType: 'custom',
      courseId: customConfig.courseId || 'all',
      questionCount: customConfig.questionCount,
      difficulty: customConfig.difficulty,
    })

    try {
      const res = await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'custom',
          courseId: customConfig.courseId || undefined,
          questionCount: customConfig.questionCount,
          targetDifficulty: customConfig.difficulty || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create session')
      }

      const { sessionId } = await res.json()

      // Track session started
      trackStep('session_started', 3)
      trackFeature('practice_session_started', {
        sessionType: 'custom',
        sessionId,
        courseId: customConfig.courseId || 'all',
        questionCount: customConfig.questionCount,
        difficulty: customConfig.difficulty,
      })

      router.push(`/practice/${sessionId}`)
    } catch (error) {
      console.error('Failed to create session:', error)
      trackFeature('practice_session_error', {
        sessionType: 'custom',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      alert(error instanceof Error ? error.message : 'Failed to create session')
    } finally {
      setIsCreating(false)
    }
  }, [router, customConfig, trackStep, trackFeature])

  // Total available questions
  const totalQuestions = Object.values(questionsPerCourse).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Practice Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Practice with targeted questions, fix knowledge gaps, and prepare for exams.
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalSessions}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalQuestions}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Questions Practiced</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className={`text-2xl font-bold ${stats.overallAccuracy >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {stats.overallAccuracy}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {totalQuestions}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available Questions</p>
            </div>
          </div>
        )}

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Continue Session
            </h2>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <RecentSessionCard
                  key={session.id}
                  session={session}
                  onClick={() => router.push(`/practice/${session.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Practice Options */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Practice
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <QuickPracticeCard
              title="Fix My Gaps"
              description="Target your identified knowledge gaps with focused practice"
              icon="🎯"
              count={gapsCount}
              countLabel="gaps to fix"
              available={gapsCount > 0 && totalQuestions > 0}
              onClick={() => createSession('targeted')}
              variant={gapsCount > 0 ? 'warning' : 'default'}
            />
            <QuickPracticeCard
              title="Quick Practice"
              description="5 questions for a fast study break"
              icon="⚡"
              available={totalQuestions >= 5}
              onClick={() => createSession('quick')}
            />
            <QuickPracticeCard
              title="Mixed Practice"
              description="Interleaved questions from all your courses"
              icon="🔀"
              available={totalQuestions >= 10}
              onClick={() => createSession('mixed')}
              variant="primary"
            />
            <QuickPracticeCard
              title="SRS Review"
              description="Review your spaced repetition flashcards"
              icon="🔄"
              available={true}
              onClick={() => router.push('/review')}
            />
          </div>
        </div>

        {/* Course-specific Practice */}
        {courses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Exam Prep by Course
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {courses.map((course) => {
                const qCount = questionsPerCourse[course.id] || 0
                return (
                  <button
                    key={course.id}
                    onClick={() => createSession('exam_prep', course.id)}
                    disabled={qCount < 10 || isCreating}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border
                      transition-colors text-left
                      ${qCount >= 10
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                        : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {course.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {qCount} questions available
                      </p>
                    </div>
                    {qCount >= 10 && (
                      <span className="ml-3 text-indigo-600 dark:text-indigo-400">
                        Start →
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Custom Practice Setup */}
        <div className="mb-8">
          <button
            onClick={() => setShowCustomSetup(!showCustomSetup)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <span>Custom Practice</span>
            <svg
              className={`w-5 h-5 transform transition-transform ${showCustomSetup ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCustomSetup && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course (optional)
                  </label>
                  <select
                    value={customConfig.courseId}
                    onChange={(e) => setCustomConfig((c) => ({ ...c, courseId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({questionsPerCourse[course.id] || 0} questions)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Questions
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={customConfig.questionCount}
                      onChange={(e) =>
                        setCustomConfig((c) => ({ ...c, questionCount: parseInt(e.target.value) }))
                      }
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-medium text-gray-900 dark:text-white">
                      {customConfig.questionCount}
                    </span>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map((d) => (
                      <button
                        key={d}
                        onClick={() => setCustomConfig((c) => ({ ...c, difficulty: d as DifficultyLevel | 0 }))}
                        className={`
                          px-3 py-2 rounded-lg border transition-colors
                          ${customConfig.difficulty === d
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }
                        `}
                      >
                        {d === 0 ? 'Any' : d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={createCustomSession}
                  disabled={isCreating || totalQuestions < 5}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isCreating ? 'Creating Session...' : 'Start Custom Practice'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Sessions
            </h2>
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session) => (
                <RecentSessionCard
                  key={session.id}
                  session={session}
                  onClick={() => router.push(`/practice/${session.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalQuestions === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Practice Questions Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Generate practice questions from your courses to get started.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        )}

        {/* Creating Session Overlay */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Creating practice session...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
