'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Course, UserProgress, GeneratedCourse, Lesson } from '@/types'
import { ChatTutor } from '@/components/chat/ChatTutor'
import { useCourseMastery } from '@/hooks'
import { useGenerationStatus } from '@/hooks/useGenerationStatus'

interface CourseViewProps {
  course: Course
  progress: UserProgress
}

type LessonStatus = 'completed' | 'current' | 'locked'

export default function CourseView({ course, progress }: CourseViewProps) {
  const t = useTranslations('lesson')
  const tc = useTranslations('course')
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Safely parse generated_course - handle null/undefined cases
  const generatedCourse = (course.generated_course || {}) as GeneratedCourse & { sections?: Lesson[] }
  // Handle both "lessons" and legacy "sections" from AI response
  const lessons = generatedCourse?.lessons || generatedCourse?.sections || []

  // Track progressive generation status
  const onGenerationComplete = useCallback(() => {
    // Refresh the page to get updated lessons
    window.location.reload()
  }, [])

  const {
    status: _generationStatus,
    lessonsReady,
    totalLessons,
    isGenerating,
    isContinuing: _isContinuing,
  } = useGenerationStatus(course.id, {
    autoTriggerContinuation: true,
    onComplete: onGenerationComplete,
  })

  // Fetch course mastery data
  const { lessonMastery, isLoading: isMasteryLoading } = useCourseMastery({
    courseId: course.id,
  })

  // Calculate overall progress percentage
  const progressPercentage = useMemo(() => {
    if (lessons.length === 0) return 0
    return Math.round((progress.completed_lessons.length / lessons.length) * 100)
  }, [lessons.length, progress.completed_lessons.length])

  // Determine lesson status
  const getLessonStatus = (lessonIndex: number): LessonStatus => {
    if (progress.completed_lessons.includes(lessonIndex)) {
      return 'completed'
    }
    // Lesson is current if it's the first incomplete lesson
    // or if the previous lesson is completed
    if (lessonIndex === 0 || progress.completed_lessons.includes(lessonIndex - 1)) {
      return 'current'
    }
    return 'locked'
  }

  // Get total steps for a lesson
  const getLessonStepCount = (lessonIndex: number): number => {
    return lessons[lessonIndex]?.steps?.length || 0
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {tc('backToDashboard')}
          </Link>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {generatedCourse?.title || course.title || tc('untitledCourse')}
          </h1>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{tc('courseProgress')}</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {progressPercentage}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {tc('lessonsCompleted', { completed: progress.completed_lessons.length, total: lessons.length })}
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Overview card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {tc('overview')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {generatedCourse?.overview || tc('noOverviewAvailable')}
          </p>

          {/* Course Mastery Summary */}
          {!isMasteryLoading && lessonMastery.size > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Average Mastery */}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round(
                        Array.from(lessonMastery.values()).reduce(
                          (sum, m) => sum + (m.averageMastery || 0),
                          0
                        ) / lessonMastery.size * 100
                      )}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{tc('conceptMastery')}</p>
                  </div>

                  {/* Gaps Count */}
                  {Array.from(lessonMastery.values()).some(m => m.hasGaps) && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {Array.from(lessonMastery.values()).reduce(
                          (sum, m) => sum + (m.criticalGaps || 0),
                          0
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tc('gaps')}</p>
                    </div>
                  )}
                </div>

                {/* Knowledge Map Link */}
                <Link
                  href="/knowledge-map"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {tc('viewKnowledgeMap')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Generation progress banner */}
        {isGenerating && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                  <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {tc('generatingLessons')}
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {tc('generatingProgress', { ready: lessonsReady, total: totalLessons })}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {Math.round((lessonsReady / totalLessons) * 100)}%
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(lessonsReady / totalLessons) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Lessons list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            {tc('lessons')} {isGenerating && `(${lessonsReady}/${totalLessons})`}
          </h2>

          {lessons.map((lesson, index) => {
            const status = getLessonStatus(index)
            const stepCount = getLessonStepCount(index)
            // Lesson is generating if index >= lessonsReady and we're still generating
            const isLessonGenerating = isGenerating && index >= lessonsReady
            const isClickable = status !== 'locked' && !isLessonGenerating
            const mastery = lessonMastery.get(index)

            return (
              <LessonCard
                key={index}
                lessonNumber={index + 1}
                title={lesson.title}
                stepCount={stepCount}
                status={status}
                courseId={course.id}
                lessonIndex={index}
                isClickable={isClickable}
                masteryLevel={mastery?.averageMastery}
                hasGaps={mastery?.hasGaps}
                criticalGaps={mastery?.criticalGaps}
                isMasteryLoading={isMasteryLoading}
                isGenerating={isLessonGenerating}
                t={tc}
              />
            )
          })}

          {lessons.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>{tc('noLessonsAvailable')}</p>
            </div>
          )}
        </div>
      </main>

      {/* AI Chat Tutor Button - positioned above mobile bottom nav */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-indigo-600 text-white p-3 xs:p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 flex items-center gap-2 min-h-[48px] min-w-[48px]"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          aria-label={t('askAI')}
        >
          <svg className="w-5 h-5 xs:w-6 xs:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="hidden sm:inline font-medium">{t('askAI')}</span>
        </button>
      )}

      {/* Chat Tutor Modal */}
      <ChatTutor
        courseId={course.id}
        courseName={generatedCourse?.title || course.title || ''}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  )
}

interface LessonCardProps {
  lessonNumber: number
  title: string
  stepCount: number
  status: LessonStatus
  courseId: string
  lessonIndex: number
  isClickable: boolean
  masteryLevel?: number
  hasGaps?: boolean
  criticalGaps?: number
  isMasteryLoading?: boolean
  isGenerating?: boolean
  t: ReturnType<typeof useTranslations<'course'>>
}

function LessonCard({
  lessonNumber,
  title,
  stepCount,
  status,
  courseId,
  lessonIndex,
  isClickable,
  masteryLevel,
  hasGaps,
  criticalGaps,
  isMasteryLoading,
  isGenerating,
  t,
}: LessonCardProps) {
  // Get mastery color
  const getMasteryColor = (level: number) => {
    if (level >= 0.7) return 'text-green-600 dark:text-green-400'
    if (level >= 0.4) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getMasteryBgColor = (level: number) => {
    if (level >= 0.7) return 'bg-green-500'
    if (level >= 0.4) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const content = (
    <div
      className={`
        relative flex items-center gap-3 xs:gap-4 p-3 xs:p-4 rounded-xl border transition-all duration-200
        ${status === 'completed'
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : status === 'current'
            ? 'bg-white dark:bg-gray-800 border-indigo-300 dark:border-indigo-600 shadow-md shadow-indigo-100 dark:shadow-indigo-900/30'
            : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
        }
        ${isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-not-allowed'}
      `}
    >
      {/* Status icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 xs:w-12 xs:h-12 rounded-full flex items-center justify-center text-base xs:text-lg font-bold
          ${status === 'completed'
            ? 'bg-green-500 text-white'
            : status === 'current'
              ? 'bg-indigo-500 text-white animate-pulse'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
          }
        `}
      >
        {status === 'completed' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : status === 'current' ? (
          <span>{lessonNumber}</span>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
          </svg>
        )}
      </div>

      {/* Lesson info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`
              text-xs font-medium px-2 py-0.5 rounded-full
              ${isGenerating
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                : status === 'completed'
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : status === 'current'
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }
            `}
          >
            {t('lesson', { number: lessonNumber })}
          </span>
          {isGenerating && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 animate-pulse flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('generating')}
            </span>
          )}
        </div>
        <h3
          className={`
            font-semibold truncate
            ${status === 'locked'
              ? 'text-gray-400 dark:text-gray-500'
              : 'text-gray-900 dark:text-white'
            }
          `}
        >
          {title}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <p
            className={`
              text-sm
              ${status === 'locked'
                ? 'text-gray-400 dark:text-gray-600'
                : 'text-gray-500 dark:text-gray-400'
              }
            `}
          >
            {stepCount === 1 ? t('stepCount', { count: stepCount }) : t('stepsCount', { count: stepCount })}
          </p>

          {/* Mastery indicator */}
          {!isMasteryLoading && masteryLevel !== undefined && masteryLevel > 0 && status !== 'locked' && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getMasteryBgColor(masteryLevel)}`}
                  style={{ width: `${Math.round(masteryLevel * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${getMasteryColor(masteryLevel)}`}>
                {Math.round(masteryLevel * 100)}%
              </span>
            </div>
          )}

          {/* Gap warning badge */}
          {!isMasteryLoading && hasGaps && criticalGaps && criticalGaps > 0 && status !== 'locked' && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('gap')}
            </span>
          )}
        </div>
      </div>

      {/* Arrow indicator for clickable cards */}
      {isClickable && (
        <div
          className={`
            flex-shrink-0
            ${status === 'completed'
              ? 'text-green-500'
              : 'text-indigo-500'
            }
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {/* Current lesson indicator */}
      {status === 'current' && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full" />
      )}
    </div>
  )

  if (isClickable) {
    return (
      <Link href={`/course/${courseId}/lesson/${lessonIndex}`}>
        {content}
      </Link>
    )
  }

  return content
}
