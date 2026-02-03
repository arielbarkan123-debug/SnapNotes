'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : null)

interface AchievementProgress {
  id: string
  name: string
  emoji: string
  description: string
  current: number
  target: number
  percent: number
}

export default function AchievementProgressWidget() {
  const t = useTranslations('dashboard')
  const { data } = useSWR('/api/gamification/achievements', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120000,
    errorRetryCount: 1,
  })

  if (!data?.inProgress || data.inProgress.length === 0) return null

  const achievements: AchievementProgress[] = data.inProgress.slice(0, 3)

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('achievementProgress.title')}
        </h3>
        <Link
          href="/progress"
          className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
        >
          {t('achievementProgress.viewAll')}
        </Link>
      </div>
      <div className="space-y-3">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0">{achievement.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {achievement.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                  {achievement.current}/{achievement.target}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${achievement.percent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
