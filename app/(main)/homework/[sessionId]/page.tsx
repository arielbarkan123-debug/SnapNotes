'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { AnnotatedImageViewer, TutoringChat } from '@/components/homework'
import { useToast } from '@/contexts/ToastContext'
import { useXP } from '@/contexts/XPContext'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import type { HomeworkCheck, HomeworkFeedback, GradeLevel, AnnotatedFeedbackPoint, HomeworkSession } from '@/lib/homework/types'

// ============================================================================
// Helper Functions
// ============================================================================

function getGradeLevelStyles(level: GradeLevel, t: (key: string) => string) {
  switch (level) {
    case 'excellent':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
        emoji: '🌟',
        label: t('results.gradeExcellent'),
      }
    case 'good':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-400',
        emoji: '👍',
        label: t('results.gradeGood'),
      }
    case 'needs_improvement':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400',
        emoji: '📝',
        label: t('results.gradeNeedsImprovement'),
      }
    case 'incomplete':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        emoji: '⚠️',
        label: t('results.gradeIncomplete'),
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-700 dark:text-gray-400',
        emoji: '❓',
        label: t('results.gradeUnknown'),
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
  const searchParams = useSearchParams()
  const t = useTranslations('homework')
  const sessionId = params.sessionId as string
  const sessionType = searchParams.get('type') // 'help' or null (check)
  const isHelpSession = sessionType === 'help'
  const toast = useToast()
  const { showXP } = useXP()
  const xpAwardedRef = useRef(false)

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking(isHelpSession ? 'homework_helper' : 'homework_checker')

  const [check, setCheck] = useState<HomeworkCheck | null>(null)
  const [helpSession, setHelpSession] = useState<HomeworkSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTask, setShowTask] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  // State for loading during chat/hint operations - moved to top level to fix hooks rule
  const [isChatLoading, setIsChatLoading] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        if (isHelpSession) {
          // Fetch help session
          const res = await fetch(`/api/homework/sessions/${sessionId}`)
          if (!res.ok) {
            if (res.status === 404) {
              toast.error('Help session not found')
              router.push('/homework')
              return
            }
            throw new Error('Failed to load session')
          }
          const { session } = await res.json()
          setHelpSession(session)

          trackFeature('homework_help_session_view', {
            sessionId,
            status: session.status,
          })
        } else {
          // Fetch check
          const res = await fetch(`/api/homework/check/${sessionId}`)
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
            checkId: sessionId,
            subject: fetchedCheck.subject,
            topic: fetchedCheck.topic,
            gradeLevel: fetchedCheck.feedback?.gradeLevel,
            gradeEstimate: fetchedCheck.feedback?.gradeEstimate,
          })
        }
      } catch {
        toast.error('Failed to load')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [sessionId, isHelpSession, router, toast, trackStep, trackFeature])

  // Award XP when check results are loaded
  useEffect(() => {
    if (!check || !check.feedback || xpAwardedRef.current) return
    xpAwardedRef.current = true

    async function awardXP() {
      try {
        const [xpRes] = await Promise.all([
          fetch('/api/gamification/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'practice_complete' }),
          }),
          fetch('/api/gamification/streak', { method: 'POST' }),
          fetch('/api/gamification/check', { method: 'POST' }),
        ])

        if (xpRes.ok) {
          const data = await xpRes.json()
          if (data.xpAwarded) {
            showXP(data.xpAwarded)
          }
        }
      } catch {
        // Silently fail - XP is non-critical
      }
    }

    awardXP()
  }, [check, showXP])

  // Send message to Socratic tutor
  const handleSendMessage = useCallback(async (message: string) => {
    if (isChatLoading) return

    setIsChatLoading(true)

    // Optimistically add student message to UI
    const studentMessage = {
      role: 'student' as const,
      content: message,
      timestamp: new Date().toISOString(),
    }
    setHelpSession((prev) =>
      prev
        ? {
            ...prev,
            conversation: [...(prev.conversation || []), studentMessage],
          }
        : prev
    )

    try {
      const res = await fetch(`/api/homework/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send message')
      }

      const { session: updated, solved } = await res.json()
      setHelpSession(updated)

      if (solved) {
        toast.success('Congratulations! You solved it!')
        trackFeature('homework_help_solved', { sessionId })
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message. Please try again.')
      // Remove optimistic update on error
      setHelpSession((prev) =>
        prev
          ? {
              ...prev,
              conversation: (prev.conversation || []).slice(0, -1),
            }
          : prev
      )
    } finally {
      setIsChatLoading(false)
    }
  }, [isChatLoading, sessionId, toast, trackFeature])

  // Request a progressive hint
  const handleRequestHint = useCallback(async (level: number) => {
    if (isChatLoading) return

    setIsChatLoading(true)
    try {
      const res = await fetch(`/api/homework/sessions/${sessionId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hintLevel: level }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to get hint')
      }

      const { session: updated, encouragement, hintInfo } = await res.json()
      setHelpSession(updated)

      // Show encouragement if tutor suggests trying independently
      if (encouragement) {
        toast.info(encouragement)
      }

      trackFeature('homework_help_hint_requested', {
        sessionId,
        hintLevel: level,
        hintName: hintInfo?.name,
      })
    } catch (error) {
      console.error('Hint error:', error)
      toast.error('Failed to get hint. Please try again.')
    } finally {
      setIsChatLoading(false)
    }
  }, [isChatLoading, sessionId, toast, trackFeature])

  // Complete the session
  const handleComplete = useCallback(async () => {
    try {
      const res = await fetch(`/api/homework/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      })

      if (res.ok) {
        trackFeature('homework_help_completed', {
          sessionId,
          hintsUsed: helpSession?.hints_used,
          usedShowAnswer: helpSession?.used_show_answer,
        })
        toast.success('Session completed!')
        router.push('/homework')
      } else {
        throw new Error('Failed to complete session')
      }
    } catch (error) {
      console.error('Complete error:', error)
      toast.error('Failed to complete session. Please try again.')
    }
  }, [sessionId, helpSession?.hints_used, helpSession?.used_show_answer, toast, trackFeature, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('results.loadingResults')}</p>
        </div>
      </div>
    )
  }

  // Render help session (tutoring interface)
  if (isHelpSession) {
    if (!helpSession) {
      return (
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('results.sessionNotFound')}</p>
            <Link
              href="/homework"
              className="inline-flex items-center justify-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              {t('check.backToHub')}
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="container mx-auto px-4 py-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <Link
                href="/homework"
                className="p-2 -ms-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('homeworkHelper')}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('results.socraticSession')}
                </p>
              </div>
              {helpSession.question_image_url && (
                <button
                  onClick={() => setShowTask(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="View question"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Question Summary Card */}
        {helpSession.question_text && (
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-b border-purple-200 dark:border-purple-800/50">
            <div className="container mx-auto px-4 py-3 max-w-2xl">
              <div className="flex items-start gap-3">
                {/* Question thumbnail - only show for image mode */}
                {helpSession.question_image_url && (
                  <button
                    onClick={() => setShowTask(true)}
                    className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm hover:ring-2 hover:ring-purple-400 transition-all"
                  >
                    <Image
                      src={helpSession.question_image_url}
                      alt="Question"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </button>
                )}

                {/* Question info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {helpSession.detected_subject && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-800/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                        {helpSession.detected_subject}
                      </span>
                    )}
                    {helpSession.detected_topic && (
                      <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-800/30 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full">
                        {helpSession.detected_topic}
                      </span>
                    )}
                    {helpSession.difficulty_estimate && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {'⭐'.repeat(Math.min(5, helpSession.difficulty_estimate))}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {helpSession.question_text}
                  </p>
                </div>
              </div>

              {/* Progress indicator */}
              {(helpSession.current_step ?? 0) > 0 && helpSession.total_estimated_steps && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{t('results.progress')}</span>
                    <span>{t('results.stepOf', { current: helpSession.current_step, total: helpSession.total_estimated_steps })}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((helpSession.current_step ?? 0) / helpSession.total_estimated_steps) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tutoring Chat */}
        <div className="flex-1">
          <TutoringChat
            session={helpSession}
            onSendMessage={handleSendMessage}
            onRequestHint={handleRequestHint}
            onComplete={handleComplete}
            isLoading={isChatLoading}
          />
        </div>

        {/* Question Image Modal */}
        {showTask && helpSession.question_image_url && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowTask(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('results.yourQuestion')}</h3>
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
                    src={helpSession.question_image_url}
                    alt="Question"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render check results (feedback interface)
  if (!check || !check.feedback) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('results.resultsNotFound')}</p>
          <Link
            href="/homework"
            className="inline-flex items-center justify-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            {t('results.checkNewHomework')}
          </Link>
        </div>
      </div>
    )
  }

  const feedback = check.feedback as HomeworkFeedback
  const gradeStyles = getGradeLevelStyles(feedback.gradeLevel, t)

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/homework"
                className="p-2 -ms-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('results.homeworkResults')}
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
                title="View annotated answer"
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
        <div className={`${gradeStyles.bg} ${gradeStyles.border} border rounded-[22px] shadow-card p-6 text-center`}>
          <div className="text-5xl mb-2">{gradeStyles.emoji}</div>
          <div className={`text-3xl font-bold ${gradeStyles.text} mb-1`}>
            {feedback.gradeEstimate}
          </div>
          <div className={`text-sm font-medium ${gradeStyles.text}`}>
            {gradeStyles.label}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('results.summary')}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{feedback.summary}</p>
        </div>

        {/* What You Did Well */}
        {feedback.correctPoints.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
              <span className="text-green-500">✓</span>
              {t('results.whatYouDidWell')}
            </h2>
            <div className="space-y-3">
              {feedback.correctPoints.map((point, idx) => {
                const annotatedPoint = point as AnnotatedFeedbackPoint
                const hasRegion = annotatedPoint.region !== undefined
                const isSelected = selectedAnnotationId === annotatedPoint.annotationId

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasRegion) {
                        setSelectedAnnotationId(annotatedPoint.annotationId || null)
                        setShowAnswer(true)
                      }
                    }}
                    className={`
                      bg-green-50 dark:bg-green-900/20 rounded-lg p-4 transition-all
                      ${hasRegion ? 'cursor-pointer hover:ring-2 hover:ring-green-400' : ''}
                      ${isSelected ? 'ring-2 ring-green-500' : ''}
                    `}
                  >
                    <div className="flex items-start gap-2">
                      {hasRegion && (
                        <span className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                      <div>
                        <h3 className="font-medium text-green-800 dark:text-green-300 mb-1">
                          {point.title}
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          {point.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Areas for Improvement */}
        {feedback.improvementPoints.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
              <span className="text-amber-500">!</span>
              {t('results.areasForImprovement')}
            </h2>
            <div className="space-y-3">
              {feedback.improvementPoints.map((point, idx) => {
                const annotatedPoint = point as AnnotatedFeedbackPoint
                const hasRegion = annotatedPoint.region !== undefined
                const isSelected = selectedAnnotationId === annotatedPoint.annotationId

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasRegion) {
                        setSelectedAnnotationId(annotatedPoint.annotationId || null)
                        setShowAnswer(true)
                      }
                    }}
                    className={`
                      bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 transition-all
                      ${hasRegion ? 'cursor-pointer hover:ring-2 hover:ring-red-400' : ''}
                      ${isSelected ? 'ring-2 ring-red-500' : ''}
                    `}
                  >
                    <div className="flex items-start gap-2">
                      {hasRegion && (
                        <span className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                      <div className="flex-1">
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
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {feedback.suggestions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
              <span className="text-violet-500">💡</span>
              {t('results.suggestions')}
            </h2>
            <ul className="space-y-2">
              {feedback.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Teacher Style Notes */}
        {(feedback.teacherStyleNotes || feedback.expectationComparison) && (
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-[22px] shadow-card p-5 border border-purple-200 dark:border-purple-800/50">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-3">
              <span>👩‍🏫</span>
              {t('results.teacherExpectations')}
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
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-[22px] shadow-card p-5 border border-violet-200 dark:border-violet-800/50 text-center">
          <p className="text-violet-700 dark:text-violet-300 font-medium">
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
            {t('results.checkAnother')}
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            {t('backToDashboard')}
          </Button>
        </div>

        {/* Practice CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-[22px] p-6 text-white shadow-card">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🎯</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">{t('results.practiceMore')}</h3>
              <p className="text-sm text-white/80 mb-4">{t('results.practiceMoreDesc')}</p>
              <Link
                href="/practice"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-purple-700 font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                {t('results.startPractice')}
              </Link>
            </div>
          </div>
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
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('results.homeworkTask')}</h3>
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

      {/* Answer Modal with Annotations */}
      {showAnswer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            setShowAnswer(false)
            setSelectedAnnotationId(null)
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('results.yourAnswerModal')}</h3>
                {feedback.annotations?.hasAnnotations && (
                  <button
                    onClick={() => setShowAnnotations(!showAnnotations)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      showAnnotations
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {showAnnotations ? t('results.hideMarks') : t('results.showMarks')}
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowAnswer(false)
                  setSelectedAnnotationId(null)
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {feedback.annotations?.hasAnnotations ? (
                <AnnotatedImageViewer
                  imageUrl={check.answer_image_url}
                  annotations={feedback.annotations}
                  showAnnotations={showAnnotations}
                  selectedAnnotationId={selectedAnnotationId}
                  onAnnotationClick={(point) => {
                    setSelectedAnnotationId(point.annotationId || null)
                  }}
                />
              ) : (
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <Image
                    src={check.answer_image_url}
                    alt="Answer"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
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
