'use client'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useCalendar } from '@/contexts/CalendarContext'

// ============================================================================
// Component
// ============================================================================

export default function CalendarHeader() {
  const { currentMonth, viewMode, setViewMode, goToPrevMonth, goToNextMonth, goToToday } = useCalendar()

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      {/* Left: Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[160px] text-center select-none">
          {monthLabel}
        </h2>

        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Today + View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToToday}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          <span className="hidden sm:inline">Today</span>
        </button>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Week
          </button>
        </div>
      </div>
    </div>
  )
}
