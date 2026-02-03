'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

// =============================================================================
// Types
// =============================================================================

interface SRSStats {
  total_cards: number
  cards_due_today: number
  cards_reviewed_today: number
  streak: number
  retention_rate: number
  cards_by_state: {
    new: number
    learning: number
    review: number
    relearning: number
  }
  // Gap-related stats
  unresolved_gaps: number
  gap_targeted_cards: number
}

// =============================================================================
// Component
// =============================================================================

export default function DashboardWidget() {
  const t = useTranslations('dashboard')
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/srs/stats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats')
      }

      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isLoading) {
    return <WidgetSkeleton />
  }

  // Error state - hide widget silently
  if (error || !stats) {
    return null
  }

  // No cards at all - don't show widget
  if (stats.total_cards === 0) {
    return null
  }

  const cardsDue = stats.cards_due_today
  const newCards = stats.cards_by_state.new
  const totalDue = cardsDue + Math.min(newCards, 20) // Include new cards up to daily limit
  const allDone = totalDue === 0
  const hasGaps = stats.unresolved_gaps > 0

  return (
    <div className={`
      rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border transition-all
      ${allDone
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800'
      }
    `}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left side - Info */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📚</span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('srs.dailyReviewTitle')}
            </h2>
          </div>

          {allDone ? (
            // All done state
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{t('srs.allCaughtUp')}</span>
              </div>
              {stats.streak > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400 ms-2">
                  {t('srs.dayStreak', { days: stats.streak })} 🔥
                </span>
              )}
            </div>
          ) : (
            // Cards due state
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Cards due */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold">
                  {cardsDue > 99 ? '99+' : cardsDue}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('srs.cardsDue')}
                </span>
              </div>

              {/* New cards */}
              {newCards > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                    {newCards > 99 ? '99+' : newCards}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('srs.newCardsLabel')}
                  </span>
                </div>
              )}

              {/* Gap-targeted indicator */}
              {hasGaps && stats.gap_targeted_cards > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                    {stats.unresolved_gaps > 99 ? '99+' : stats.unresolved_gaps}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('srs.gapsToFix')}
                  </span>
                </div>
              )}

              {/* Streak */}
              {stats.streak > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <span>{t('srs.dayStreak', { days: stats.streak })}</span>
                  <span>🔥</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side - Buttons */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
          {/* Fix Gaps button - show when there are gaps and gap-targeted cards */}
          {hasGaps && stats.gap_targeted_cards > 0 && (
            <Link
              href="/review?mode=gaps"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('srs.fixGaps')}
            </Link>
          )}

          {/* Main review button */}
          <Link
            href="/review"
            className={`
              inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors w-full sm:w-auto
              ${allDone
                ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                : 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white'
              }
            `}
          >
            {allDone ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('srs.reviewMore')}
              </>
            ) : (
              <>
                {t('srs.startReview')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Progress bar for today */}
      {stats.cards_reviewed_today > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{t('srs.todaysProgress')}</span>
            <span>{t('srs.reviewed', { count: stats.cards_reviewed_today })}</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (stats.cards_reviewed_today / Math.max(totalDue + stats.cards_reviewed_today, 1)) * 100)}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Skeleton
// =============================================================================

function WidgetSkeleton() {
  return (
    <div className="rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  )
}
