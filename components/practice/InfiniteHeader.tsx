'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface InfiniteHeaderProps {
  streak: number
  totalAnswered: number
  recentResults: boolean[] // last 20 results (true = correct)
  currentDifficulty: number // 1-5 float
  onStop: () => void
}

export default function InfiniteHeader({
  streak,
  totalAnswered,
  recentResults,
  currentDifficulty,
  onStop,
}: InfiniteHeaderProps) {
  const tp = useTranslations('practice.infinite')

  // Rolling accuracy from last 20
  const rollingAccuracy = useMemo(() => {
    if (recentResults.length === 0) return 0
    const correct = recentResults.filter(Boolean).length
    return Math.round((correct / recentResults.length) * 100)
  }, [recentResults])

  // Difficulty color: green (1) -> yellow (3) -> red (5)
  const difficultyColor = useMemo(() => {
    if (currentDifficulty <= 2) return 'bg-green-500'
    if (currentDifficulty <= 3.5) return 'bg-amber-500'
    return 'bg-red-500'
  }, [currentDifficulty])

  const difficultyPercent = ((currentDifficulty - 1) / 4) * 100

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm rounded-xl mb-4">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Streak */}
          <div className="flex items-center gap-2">
            <motion.span
              key={streak}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="text-2xl"
              aria-hidden="true"
            >
              {streak > 0 ? '\uD83D\uDD25' : '\uD83D\uDCAA'}
            </motion.span>
            <div className="text-start">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                {streak}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tp('streak')}</p>
            </div>
          </div>

          {/* Accuracy sparkline (mini bar chart of last 20) */}
          <div className="flex-1 max-w-[120px]">
            <div className="flex items-end gap-px h-6">
              {recentResults.slice(-20).map((correct, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all ${
                    correct
                      ? 'bg-green-400 dark:bg-green-500 h-full'
                      : 'bg-red-300 dark:bg-red-500 h-1/2'
                  }`}
                />
              ))}
              {/* Pad empty slots */}
              {Array.from({ length: Math.max(0, 20 - recentResults.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-sm" />
              ))}
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-0.5">
              {rollingAccuracy}%
            </p>
          </div>

          {/* Total & Difficulty */}
          <div className="text-end">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {totalAnswered}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tp('totalAnswered')}</p>
            {/* Difficulty bar */}
            <div className="mt-1 w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${difficultyColor} rounded-full transition-all duration-500`}
                style={{ width: `${difficultyPercent}%` }}
              />
            </div>
          </div>

          {/* Stop button */}
          <button
            type="button"
            onClick={onStop}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {tp('stop')}
          </button>
        </div>
      </div>
    </div>
  )
}
