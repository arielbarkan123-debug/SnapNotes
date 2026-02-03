'use client'

// =============================================================================
// Practice Widget for Dashboard
// Shows quick practice options and recent activity
// =============================================================================

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { SWRErrorState } from '@/components/ui/SWRErrorState'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PracticeWidgetData {
  stats: {
    totalSessions: number
    totalQuestions: number
    overallAccuracy: number
    lastPracticeDate: string | null
  } | null
  activeSessions: {
    id: string
    session_type: string
    questions_answered: number
    question_count: number
  }[]
  gapsCount: number
  questionsAvailable: number
}

// -----------------------------------------------------------------------------
// Fetcher
// -----------------------------------------------------------------------------

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function PracticeWidget() {
  const router = useRouter()
  const t = useTranslations('dashboard')

  const { data, isLoading, error, mutate } = useSWR<PracticeWidgetData>(
    '/api/practice/widget',
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-6 border border-gray-200 dark:border-gray-700 shadow-card mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card mb-6">
        <SWRErrorState onRetry={() => mutate()} />
      </div>
    )
  }

  // No data
  if (!data) {
    return null
  }

  const { stats, activeSessions, gapsCount, questionsAvailable } = data

  // Don't show if no questions available
  if (questionsAvailable === 0) {
    return null
  }

  // Check if there's an active session to continue
  const activeSession = activeSessions?.[0]

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-[22px] p-6 border border-violet-200 dark:border-violet-800/50 shadow-card mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-xl">🎯</span>
          {t('practiceMode')}
        </h2>
        <Link
          href="/practice"
          className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
        >
          {t('viewAll')}
        </Link>
      </div>

      {/* Continue Active Session */}
      {activeSession && (
        <button
          onClick={() => router.push(`/practice/${activeSession.id}`)}
          className="w-full mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-violet-200 dark:border-violet-700 hover:border-violet-400 dark:hover:border-violet-500 transition-colors text-start"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t('continueSession')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('questionsProgress', { answered: activeSession.questions_answered, total: activeSession.question_count })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 transition-all"
                  style={{
                    width: `${(activeSession.questions_answered / activeSession.question_count) * 100}%`,
                  }}
                />
              </div>
              <span className="text-violet-600 dark:text-violet-400">→</span>
            </div>
          </div>
        </button>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fix Gaps */}
        <button
          onClick={() => router.push('/practice?type=targeted')}
          disabled={gapsCount === 0}
          className={`
            p-4 rounded-lg text-start transition-all
            ${gapsCount > 0
              ? 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800'
              : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
            }
          `}
        >
          <div className="text-2xl mb-2">🩹</div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">
            {t('fixGaps')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {gapsCount > 0 ? t('gapsToFix', { count: gapsCount }) : t('noGapsFound')}
          </p>
        </button>

        {/* Quick Practice */}
        <button
          onClick={() => router.push('/practice?type=quick')}
          className="p-4 rounded-lg bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 text-start transition-all"
        >
          <div className="text-2xl mb-2">⚡</div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">
            {t('quickPractice')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('fiveQuestions')}
          </p>
        </button>
      </div>

      {/* Stats (if available) */}
      {stats && stats.totalSessions > 0 && (
        <div className="mt-4 pt-4 border-t border-violet-200 dark:border-violet-800/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t('questionsPracticed', { count: stats.totalQuestions })}
            </span>
            <span
              className={`font-medium ${
                stats.overallAccuracy >= 70
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {t('accuracyPercent', { percent: stats.overallAccuracy })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PracticeWidget
