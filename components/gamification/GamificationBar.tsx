'use client'

import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { getLevelBadge, getLevelTitle, getLevelGradient, getXPProgress, formatXP } from '@/lib/gamification/xp'

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : null)

export default function GamificationBar() {
  const t = useTranslations('dashboard')
  const { data } = useSWR('/api/gamification/stats', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    errorRetryCount: 1,
  })

  if (!data) return null

  const totalXP = data.totalXP || 0
  const streak = data.streak?.current || 0
  const progress = getXPProgress(totalXP)
  const badge = getLevelBadge(progress.level)
  const gradient = getLevelGradient(progress.level)

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-3 sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Level badge */}
        <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
          <span className="text-lg sm:text-xl">{badge}</span>
        </div>

        {/* Level info + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {t('gamificationBar.level', { level: progress.level })} {getLevelTitle(progress.level)}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatXP(progress.currentXP)} XP
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
              style={{ width: `${progress.isMaxLevel ? 100 : progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {progress.isMaxLevel ? 'MAX' : `${progress.percent}%`}
            </span>
            {!progress.isMaxLevel && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatXP(progress.xpNeeded - progress.xpInLevel)} to next
              </span>
            )}
          </div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-2.5 py-1.5 rounded-full">
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
          </div>
        )}
      </div>
    </div>
  )
}
