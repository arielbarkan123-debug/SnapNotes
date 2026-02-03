'use client'

import { useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import type { StudyPlanTask } from '@/lib/study-plan/types'

// ============================================================================
// Props
// ============================================================================

interface PlanCalendarProps {
  tasks: StudyPlanTask[]
  currentDate: Date
}

// ============================================================================
// Helpers
// ============================================================================

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// ============================================================================
// Component
// ============================================================================

export default function PlanCalendar({ tasks, currentDate }: PlanCalendarProps) {
  const t = useTranslations('studyPlan.calendar')
  const tPlan = useTranslations('studyPlan')
  const locale = useLocale()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const todayStr = currentDate.toISOString().split('T')[0]

  // Build a map of date -> task statuses
  const dateMap = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; hasPending: boolean }>()
    for (const task of tasks) {
      const date = task.scheduled_date
      if (!map.has(date)) {
        map.set(date, { total: 0, completed: 0, hasPending: false })
      }
      const entry = map.get(date)!
      entry.total++
      if (task.status === 'completed') entry.completed++
      if (task.status === 'pending') entry.hasPending = true
    }
    return map
  }, [tasks])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const dayNames = [
    t('dayNames.sun'), t('dayNames.mon'), t('dayNames.tue'), t('dayNames.wed'),
    t('dayNames.thu'), t('dayNames.fri'), t('dayNames.sat'),
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      {/* Month header */}
      <div className="text-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {currentDate.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}
        </h3>
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsCollapsed(prev => !prev)}
        className="md:hidden w-full flex items-center justify-center gap-2 py-2 mb-3 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition"
      >
        <Calendar className="w-4 h-4" />
        {isCollapsed ? tPlan('showCalendar') : tPlan('hideCalendar')}
        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Day names */}
      <div className={`grid grid-cols-7 gap-1 mb-2 ${isCollapsed ? 'hidden md:grid' : ''}`}>
        {dayNames.map((name, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-500 dark:text-gray-300 py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 gap-1 ${isCollapsed ? 'hidden md:grid' : ''}`}>
        {/* Empty cells for padding */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square min-h-[44px] min-w-[44px]" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const entry = dateMap.get(dateStr)
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr

          // Determine color
          let bgColor = ''
          let textColor = 'text-gray-700 dark:text-gray-200'

          if (entry) {
            if (entry.total === entry.completed && entry.total > 0) {
              // All done
              bgColor = 'bg-green-100 dark:bg-green-900/30'
              textColor = 'text-green-700 dark:text-green-300'
            } else if (isPast && entry.hasPending) {
              // Overdue
              bgColor = 'bg-red-100 dark:bg-red-900/30'
              textColor = 'text-red-700 dark:text-red-300'
            } else if (isToday) {
              // Today with tasks
              bgColor = 'bg-violet-100 dark:bg-violet-900/30'
              textColor = 'text-violet-700 dark:text-violet-300'
            } else {
              // Future with tasks
              bgColor = 'bg-blue-50 dark:bg-blue-900/20'
              textColor = 'text-blue-700 dark:text-blue-300'
            }
          }

          return (
            <div
              key={day}
              className={`aspect-square min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-sm font-medium transition ${bgColor} ${textColor} ${
                isToday ? 'ring-2 ring-violet-500' : ''
              }`}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className={`flex items-center gap-4 mt-4 justify-center text-xs text-gray-500 dark:text-gray-300 ${isCollapsed ? 'hidden md:flex' : ''}`}>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
          <span>{t('legend.done')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-violet-100 dark:bg-violet-900/30 ring-1 ring-violet-500" />
          <span>{t('legend.today')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-50 dark:bg-blue-900/20" />
          <span>{t('legend.upcoming')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
          <span>{t('legend.overdue')}</span>
        </div>
      </div>
    </div>
  )
}
