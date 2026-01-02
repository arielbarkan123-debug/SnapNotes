'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface WeakArea {
  courseId: string
  courseTitle: string
  lessonIndex: number
  lessonTitle: string
  masteryLevel: number
  totalAttempts: number
  accuracy: number
  lastStudied: string | null
  daysSinceStudy: number
  priority: 'high' | 'medium' | 'low'
  reason: string
}

interface Summary {
  totalWeakAreas: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  averageMastery: number
  lessonsNeedingReview: number
}

interface WeakAreasResponse {
  weakAreas: WeakArea[]
  summary: Summary | null
}

export function WeakAreas() {
  const t = useTranslations('dashboard')
  const [data, setData] = useState<WeakAreasResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchWeakAreas = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/weak-areas?limit=5')
      if (res.ok) {
        const result = await res.json()
        setData(result)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeakAreas()
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('weakAreas.failedToLoad')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('weakAreas.couldNotLoad')}</p>
          </div>
          <button
            onClick={fetchWeakAreas}
            className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          >
            {t('weakAreas.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (!data || !data.weakAreas || data.weakAreas.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('allCaughtUp')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('noWeakAreas')}</p>
          </div>
        </div>
      </div>
    )
  }

  const { weakAreas, summary } = data
  const displayedAreas = expanded ? weakAreas : weakAreas.slice(0, 3)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    }
  }

  const getMasteryColor = (mastery: number) => {
    if (mastery < 0.4) return 'text-red-600 dark:text-red-400'
    if (mastery < 0.6) return 'text-yellow-600 dark:text-yellow-400'
    if (mastery < 0.8) return 'text-blue-600 dark:text-blue-400'
    return 'text-green-600 dark:text-green-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('weakAreas.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('weakAreas.highPrioritySummary', { high: summary?.highPriority || 0, due: summary?.lessonsNeedingReview || 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className={`text-lg font-bold ${getMasteryColor(summary.averageMastery)}`}>
              {Math.round(summary.averageMastery * 100)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('weakAreas.avgMastery')}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{summary.highPriority}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('weakAreas.highPriority')}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{summary.lessonsNeedingReview}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('weakAreas.dueReview')}</p>
          </div>
        </div>
      )}

      {/* Weak Areas List */}
      <div className="space-y-3">
        {displayedAreas.map((area) => (
          <Link
            key={`${area.courseId}-${area.lessonIndex}`}
            href={`/course/${area.courseId}/lesson/${area.lessonIndex}`}
            className="block group"
          >
            <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              {/* Priority Badge */}
              <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(area.priority)}`}>
                {area.priority === 'high' ? '!' : area.priority === 'medium' ? '!!' : '...'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {area.lessonTitle}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {area.courseTitle}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {area.reason}
                </p>
              </div>

              {/* Mastery */}
              <div className="flex-shrink-0 text-right">
                <p className={`text-sm font-semibold ${getMasteryColor(area.masteryLevel)}`}>
                  {Math.round(area.masteryLevel * 100)}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {area.daysSinceStudy === 0 ? t('weakAreas.today') : area.daysSinceStudy === 1 ? t('weakAreas.yesterday') : t('weakAreas.daysAgo', { days: area.daysSinceStudy })}
                </p>
              </div>

              {/* Arrow */}
              <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Show More/Less */}
      {weakAreas.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          {expanded ? t('weakAreas.showLess') : t('weakAreas.showMore', { count: weakAreas.length - 3 })}
        </button>
      )}
    </div>
  )
}

export default WeakAreas
