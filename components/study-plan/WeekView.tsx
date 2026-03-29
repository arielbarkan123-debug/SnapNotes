'use client'

import { useMemo } from 'react'
import type { AcademicEvent } from '@/types'
import { EVENT_TYPE_COLORS, EVENT_TYPE_ICONS } from '@/types'
import { useCalendar } from '@/contexts/CalendarContext'
import { Clock } from 'lucide-react'

// ============================================================================
// Props
// ============================================================================

interface WeekViewProps {
  events: AcademicEvent[]
  onDateClick: (date: string) => void
}

// ============================================================================
// Helpers
// ============================================================================

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(dateStr: string | null): Date {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  const day = d.getDay() // 0=Sunday
  const diff = d.getDate() - day
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function getTodayStr(): string {
  const now = new Date()
  return formatDateStr(now)
}

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ============================================================================
// Event Card Sub-component
// ============================================================================

function EventCard({ event }: { event: AcademicEvent }) {
  const colors = EVENT_TYPE_COLORS[event.event_type]
  const icon = EVENT_TYPE_ICONS[event.event_type]

  return (
    <div
      className={`
        rounded-lg px-2.5 py-2 border
        ${colors.bg} ${colors.text} ${colors.border}
        transition-colors hover:opacity-90
      `}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-sm leading-none mt-0.5" role="img" aria-label={event.event_type}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{event.title}</p>
          {event.event_time && (
            <div className="flex items-center gap-1 mt-1 opacity-75">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{event.event_time}</span>
            </div>
          )}
          {event.subject && (
            <span className="text-xs opacity-75 block mt-0.5 truncate">{event.subject}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

export default function WeekView({ events, onDateClick }: WeekViewProps) {
  const { selectedDate } = useCalendar()

  const todayStr = getTodayStr()

  // Get 7 days of the selected week
  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate)
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      days.push(formatDateStr(d))
    }
    return days
  }, [selectedDate])

  // Build event lookup
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

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {weekDays.map((dateStr, i) => {
          const dayNum = parseInt(dateStr.split('-')[2], 10)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <button
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              className={`
                flex flex-col items-center py-2 rounded-xl transition-colors
                ${isSelected
                  ? 'bg-violet-100 dark:bg-violet-900/30'
                  : isToday
                    ? 'bg-violet-50 dark:bg-violet-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                }
              `}
            >
              <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {SHORT_DAY_NAMES[i]}
              </span>
              <span
                className={`
                  text-lg md:text-xl font-bold mt-0.5
                  ${isToday
                    ? 'text-violet-600 dark:text-violet-400'
                    : isSelected
                      ? 'text-violet-700 dark:text-violet-300'
                      : 'text-gray-900 dark:text-white'
                  }
                `}
              >
                {dayNum}
              </span>
              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1" />
              )}
            </button>
          )
        })}
      </div>

      {/* Day columns with event cards */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((dateStr) => {
          const dayEvents = eventsByDate.get(dateStr) || []
          const isToday = dateStr === todayStr

          return (
            <div
              key={dateStr}
              className={`
                min-h-[120px] md:min-h-[200px] rounded-xl p-1.5
                border transition-colors
                ${isToday
                  ? 'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10'
                  : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                }
              `}
            >
              <div className="flex flex-col gap-1.5">
                {dayEvents.length === 0 && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-4 select-none">
                    No events
                  </p>
                )}
                {dayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
