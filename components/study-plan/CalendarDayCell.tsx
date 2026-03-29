'use client'

import type { AcademicEvent } from '@/types'
import { EVENT_TYPE_COLORS } from '@/types'

// ============================================================================
// Props
// ============================================================================

interface CalendarDayCellProps {
  date: string            // YYYY-MM-DD
  events: AcademicEvent[]
  isToday: boolean
  isCurrentMonth: boolean
  isPast: boolean
  isSelected: boolean
  onClick: (date: string) => void
}

// ============================================================================
// Component
// ============================================================================

export default function CalendarDayCell({
  date,
  events,
  isToday,
  isCurrentMonth,
  isPast,
  isSelected,
  onClick,
}: CalendarDayCellProps) {
  const dayNumber = parseInt(date.split('-')[2], 10)
  const visibleEvents = events.slice(0, 2)
  const overflowCount = events.length - 2

  return (
    <button
      onClick={() => onClick(date)}
      className={`
        relative flex flex-col items-start p-1.5 md:p-2 rounded-xl
        min-h-[52px] md:min-h-[80px] w-full text-left
        transition-all duration-150
        ${isSelected
          ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500'
          : isToday
            ? 'bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-400 dark:ring-violet-500'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
        }
        ${!isCurrentMonth ? 'opacity-40' : ''}
        ${isPast && isCurrentMonth && !isToday ? 'opacity-70' : ''}
      `}
      aria-label={`${date}${events.length > 0 ? `, ${events.length} events` : ''}`}
    >
      {/* Day number */}
      <span
        className={`
          text-xs md:text-sm font-semibold leading-none mb-1
          ${isToday
            ? 'text-violet-700 dark:text-violet-300'
            : isSelected
              ? 'text-violet-800 dark:text-violet-200'
              : isCurrentMonth
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-gray-500'
          }
        `}
      >
        {dayNumber}
      </span>

      {/* Event pills */}
      <div className="flex flex-col gap-0.5 w-full overflow-hidden">
        {visibleEvents.map((event) => {
          const colors = EVENT_TYPE_COLORS[event.event_type]
          return (
            <div
              key={event.id}
              className={`
                flex items-center gap-1 px-1 md:px-1.5 py-0.5 rounded-md
                text-[10px] md:text-xs leading-tight truncate w-full
                ${colors.bg} ${colors.text}
              `}
              title={event.title}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
              <span className="truncate">{event.title}</span>
            </div>
          )
        })}

        {overflowCount > 0 && (
          <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
            +{overflowCount} more
          </span>
        )}
      </div>
    </button>
  )
}
