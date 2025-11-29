'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Course, UserProgress, GeneratedCourse, Lesson } from '@/types'

interface CourseViewProps {
  course: Course
  progress: UserProgress
}

type LessonStatus = 'completed' | 'current' | 'locked'

export default function CourseView({ course, progress }: CourseViewProps) {
  const generatedCourse = course.generated_course as GeneratedCourse & { sections?: Lesson[] }
  // Handle both "lessons" and legacy "sections" from AI response
  const lessons = generatedCourse.lessons || generatedCourse.sections || []

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
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {generatedCourse.title || course.title}
          </h1>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Course Progress</span>
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
              {progress.completed_lessons.length} of {lessons.length} lessons completed
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Overview card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Overview
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {generatedCourse.overview}
          </p>
        </div>

        {/* Lessons list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Lessons
          </h2>

          {lessons.map((lesson, index) => {
            const status = getLessonStatus(index)
            const stepCount = getLessonStepCount(index)
            const isClickable = status !== 'locked'

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
              />
            )
          })}

          {lessons.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No lessons available yet.</p>
            </div>
          )}
        </div>
      </main>
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
}

function LessonCard({
  lessonNumber,
  title,
  stepCount,
  status,
  courseId,
  lessonIndex,
  isClickable,
}: LessonCardProps) {
  const content = (
    <div
      className={`
        relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
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
          flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
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
              ${status === 'completed'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                : status === 'current'
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }
            `}
          >
            Lesson {lessonNumber}
          </span>
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
        <p
          className={`
            text-sm mt-1
            ${status === 'locked'
              ? 'text-gray-400 dark:text-gray-600'
              : 'text-gray-500 dark:text-gray-400'
            }
          `}
        >
          {stepCount} steps
        </p>
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
