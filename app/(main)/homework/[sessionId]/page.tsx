'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import type { HomeworkCheck, HomeworkFeedback, GradeLevel } from '@/lib/homework/types'

// ============================================================================
// Helper Functions
// ============================================================================

function getGradeLevelStyles(level: GradeLevel) {
  switch (level) {
    case 'excellent':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
        emoji: '🌟',
        label: 'Excellent',
      }
    case 'good':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-400',
        emoji: '👍',
        label: 'Good',
      }
    case 'needs_improvement':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400',
        emoji: '📝',
        label: 'Needs Improvement',
      }
    case 'incomplete':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        emoji: '⚠️',
        label: 'Incomplete',
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-700 dark:text-gray-400',
        emoji: '❓',
        label: 'Unknown',
      }
  }
}

function getSeverityStyles(severity?: 'minor' | 'moderate' | 'major') {
  switch (severity) {
    case 'minor':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    case 'moderate':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    case 'major':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default function HomeworkResultsPage() {
  const router = useRouter()
  const params = useParams()
  const checkId = params.sessionId as string
  const toast = useToast()

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('homework_checker')

  const [check, setCheck] = useState<HomeworkCheck | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTask, setShowTask] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    async function fetchCheck() {
      try {
        const res = await fetch(`/api/homework/check/${checkId}`)
        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Homework check not found')
            router.push('/homework')
            return
          }
          throw new Error('Failed to load results')
        }
        const { check: fetchedCheck } = await res.json()
        setCheck(fetchedCheck)

        // Track feedback review
        trackStep('feedback_reviewed', 6)
        trackFeature('homework_results_view', {
          checkId,
          subject: fetchedCheck.subject,
          topic: fetchedCheck.topic,
          gradeLevel: fetchedCheck.feedback?.gradeLevel,
          gradeEstimate: fetchedCheck.feedback?.gradeEstimate,
        })
      } catch (error) {
        console.error('Fetch error:', error)
        toast.error('Failed to load results')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCheck()
  }, [checkId, router, toast, trackStep, trackFeature])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!check || !check.feedback) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Results not found</p>
          <Link
            href="/homework"
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Check new homework
          </Link>
        </div>
      </div>
    )
  }

  const feedback = check.feedback as HomeworkFeedback
  const gradeStyles = getGradeLevelStyles(feedback.gradeLevel)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/homework"
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Homework Results
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {check.subject} • {check.topic}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTask(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="View task"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => setShowAnswer(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="View answer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Grade Card */}
        <div className={`${gradeStyles.bg} ${gradeStyles.border} border rounded-xl p-6 text-center`}>
          <div className="text-5xl mb-2">{gradeStyles.emoji}</div>
          <div className={`text-3xl font-bold ${gradeStyles.text} mb-1`}>
            {feedback.gradeEstimate}
          </div>
          <div className={`text-sm font-medium ${gradeStyles.text}`}>
            {gradeStyles.label}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Summary</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{feedback.summary}</p>
        </div>

        {/* What You Did Well */}
        {feedback.correctPoints.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
              <span className="text-green-500">✓</span>
              What You Did Well
            </h2>
            <div className="space-y-3">
              {feedback.correctPoints.map((point, idx) => (
                <div key={idx} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 dark:text-green-300 mb-1">
                    {point.title}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas for Improvement */}
        {feedback.improvementPoints.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
              <span className="text-amber-500">!</span>
              Areas for Improvement
            </h2>
            <div className="space-y-3">
              {feedback.improvementPoints.map((point, idx) => (
                <div key={idx} className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-amber-800 dark:text-amber-300">
                      {point.title}
                    </h3>
                    {point.severity && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityStyles(point.severity)}`}>
                        {point.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {feedback.suggestions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
              <span className="text-indigo-500">💡</span>
              Suggestions
            </h2>
            <ul className="space-y-2">
              {feedback.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Teacher Style Notes */}
        {(feedback.teacherStyleNotes || feedback.expectationComparison) && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800/50">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-3">
              <span>👩‍🏫</span>
              Teacher Expectations
            </h2>
            {feedback.expectationComparison && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {feedback.expectationComparison}
              </p>
            )}
            {feedback.teacherStyleNotes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {feedback.teacherStyleNotes}
              </p>
            )}
          </div>
        )}

        {/* Encouragement */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800/50 text-center">
          <p className="text-indigo-700 dark:text-indigo-300 font-medium">
            {feedback.encouragement}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => router.push('/homework')}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Check Another Homework
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </div>
      </main>

      {/* Task Modal */}
      {showTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowTask(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Homework Task</h3>
              <button
                onClick={() => setShowTask(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <Image
                  src={check.task_image_url}
                  alt="Task"
                  fill
                  className="object-contain"
                />
              </div>
              {check.task_text && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {check.task_text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Answer Modal */}
      {showAnswer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowAnswer(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Your Answer</h3>
              <button
                onClick={() => setShowAnswer(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <Image
                  src={check.answer_image_url}
                  alt="Answer"
                  fill
                  className="object-contain"
                />
              </div>
              {check.answer_text && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {check.answer_text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
