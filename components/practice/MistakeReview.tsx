'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MistakeCard from './MistakeCard'

// =============================================================================
// Types
// =============================================================================

export interface MistakeItem {
  question: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
  courseId?: string
  lessonIndex?: number
  lessonTitle?: string
  cardType?: string
}

// =============================================================================
// Props
// =============================================================================

interface MistakeReviewProps {
  mistakes: MistakeItem[]
  onPracticeWeak?: (conceptIds: string[]) => void
  namespace?: string
}

// =============================================================================
// Component
// =============================================================================

export default function MistakeReview({ mistakes, onPracticeWeak, namespace = 'practice' }: MistakeReviewProps) {
  const t = useTranslations(namespace)
  const [isExpanded, setIsExpanded] = useState(mistakes.length <= 5)

  // Perfect session
  if (mistakes.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800/50 text-center">
        <p className="text-green-700 dark:text-green-300 text-sm font-medium">
          {t('noMistakes')}
        </p>
      </div>
    )
  }

  // Group mistakes by course if multi-course
  const courseGroups = new Map<string, MistakeItem[]>()
  for (const mistake of mistakes) {
    const key = mistake.courseId || 'unknown'
    if (!courseGroups.has(key)) {
      courseGroups.set(key, [])
    }
    courseGroups.get(key)!.push(mistake)
  }
  const hasMultipleCourses = courseGroups.size > 1

  // Get unique course IDs for "Practice Weak Areas"
  const weakCourseIds = [...new Set(mistakes.filter(m => m.courseId).map(m => m.courseId!))]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('reviewMistakes')}
          </span>
          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
            {t('mistakeCount', { count: mistakes.length })}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Mistake Cards */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {hasMultipleCourses ? (
            // Group by course
            [...courseGroups.entries()].map(([courseId, courseMistakes]) => (
              <div key={courseId}>
                {courseMistakes[0]?.courseId && (
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 mt-2">
                    {/* Use lesson title's course context or courseId as fallback */}
                    {courseMistakes[0].lessonTitle ? courseMistakes[0].lessonTitle.split(' — ')[0] : courseId}
                  </h3>
                )}
                <div className="space-y-3">
                  {courseMistakes.map((mistake, idx) => (
                    <MistakeCard key={`${courseId}-${idx}`} mistake={mistake} namespace={namespace} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Flat list
            mistakes.map((mistake, idx) => (
              <MistakeCard key={idx} mistake={mistake} namespace={namespace} />
            ))
          )}

          {/* Practice Weak Areas Button */}
          {onPracticeWeak && weakCourseIds.length > 0 && (
            <button
              onClick={() => onPracticeWeak(weakCourseIds)}
              className="w-full mt-2 py-3 px-4 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium rounded-xl transition-colors text-sm border border-indigo-200 dark:border-indigo-800/50"
            >
              {t('practiceWeakAreas')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
