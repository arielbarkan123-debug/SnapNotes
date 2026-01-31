'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

// ============================================================================
// Props
// ============================================================================

interface PlanProgressProps {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
}

// ============================================================================
// Component
// ============================================================================

export default function PlanProgress({ totalTasks, completedTasks, overdueTasks }: PlanProgressProps) {
  const t = useTranslations('studyPlan')

  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const statusMessage = useMemo(() => {
    if (overdueTasks > 0) {
      return t('behind', { count: overdueTasks })
    }
    if (percent >= 100) {
      return t('completed')
    }
    return t('onTrack')
  }, [overdueTasks, percent, t])

  const statusColor = useMemo(() => {
    if (overdueTasks > 0) return 'text-red-600 dark:text-red-400'
    if (percent >= 100) return 'text-green-600 dark:text-green-400'
    return 'text-green-600 dark:text-green-400'
  }, [overdueTasks, percent])

  const barColor = useMemo(() => {
    if (overdueTasks > 0) return 'from-orange-500 to-red-500'
    return 'from-indigo-500 to-purple-500'
  }, [overdueTasks])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('tasksCompleted', { completed: completedTasks, total: totalTasks })}
        </span>
        <span className={`text-sm font-medium ${statusColor}`}>
          {statusMessage}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="text-right mt-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('progressPercent', { percent })}
        </span>
      </div>
    </div>
  )
}
