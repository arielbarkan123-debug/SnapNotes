'use client'

import { useMemo } from 'react'
import type { AcademicEvent } from '@/types'
import { useCalendar } from '@/contexts/CalendarContext'
import CalendarDayCell from './CalendarDayCell'

// ============================================================================
// Props
// ============================================================================

interface MonthViewProps {
  events: AcademicEvent[]
  onDateClick: (date: string) => void
}

// ============================================================================
// Helpers
// ============================================================================

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTodayStr(): string {
  const now = new Date()
  return formatDateStr(now.getFullYear(), now.getMonth(), now.getDate())
}

// ============================================================================
// Component
// ============================================================================

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthView({ events, onDateClick }: MonthViewProps) {
  const { currentMonth, selectedDate } = useCalendar()

  const todayStr = getTodayStr()
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Build the 6-row x 7-column grid of date strings
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun

    // Previous month fill
    const prevMonthDays = new Date(year, month, 0).getDate()
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year

    const days: string[] = []

    // Fill leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(formatDateStr(prevYear, prevMonth, prevMonthDays - i))
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(formatDateStr(year, month, d))
    }

    // Fill trailing days from next month to reach 42 cells (6 rows)
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    let nextDay = 1
    while (days.length < 42) {
      days.push(formatDateStr(nextYear, nextMonth, nextDay++))
    }

    return days
  }, [year, month])

  // Build event lookup: date string -> events[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, AcademicEvent[]>()
    for (const event of events) {
      const dateKey = event.event_date
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(event)
    }
    return map
  }, [events])

  // Current month string prefix for isCurrentMonth check
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1.5 select-none"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid: 6 rows x 7 columns */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dateStr) => {
          const isCurrentMonth = dateStr.startsWith(currentMonthPrefix)
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          const isSelected = dateStr === selectedDate
          const dayEvents = eventsByDate.get(dateStr) || []

          return (
            <CalendarDayCell
              key={dateStr}
              date={dateStr}
              events={dayEvents}
              isToday={isToday}
              isCurrentMonth={isCurrentMonth}
              isPast={isPast}
              isSelected={isSelected}
              onClick={onDateClick}
            />
          )
        })}
      </div>
    </div>
  )
}
