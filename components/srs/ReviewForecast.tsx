'use client'

import { useTranslations } from 'next-intl'
import type { ReviewCard } from '@/types/srs'

// =============================================================================
// Props
// =============================================================================

interface ReviewForecastProps {
  cards: ReviewCard[]
}

// =============================================================================
// Helpers
// =============================================================================

function countCardsByTimeframe(cards: ReviewCard[]): {
  today: number
  tomorrow: number
  thisWeek: number
} {
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000)
  const weekEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000)

  let today = 0
  let tomorrow = 0
  let thisWeek = 0

  for (const card of cards) {
    const due = new Date(card.due_date)
    if (due <= todayEnd) {
      today++
    } else if (due <= tomorrowEnd) {
      tomorrow++
    }
    if (due <= weekEnd) {
      thisWeek++
    }
  }

  return { today, tomorrow, thisWeek }
}

// =============================================================================
// Component
// =============================================================================

export default function ReviewForecast({ cards }: ReviewForecastProps) {
  const t = useTranslations('review.forecast')

  const counts = countCardsByTimeframe(cards)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          {t('title')}
        </h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        <ForecastRow label={t('today')} count={counts.today} color="text-indigo-600 dark:text-indigo-400" />
        <ForecastRow label={t('tomorrow')} count={counts.tomorrow} color="text-blue-600 dark:text-blue-400" />
        <ForecastRow label={t('thisWeek')} count={counts.thisWeek} color="text-gray-600 dark:text-gray-300" />
      </div>
    </div>
  )
}

// =============================================================================
// Sub-component
// =============================================================================

function ForecastRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>
        {count}
      </span>
    </div>
  )
}
