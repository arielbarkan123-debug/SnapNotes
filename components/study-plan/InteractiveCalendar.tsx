'use client'

import type { AcademicEvent } from '@/types'
import { useCalendar } from '@/contexts/CalendarContext'
import CalendarHeader from './CalendarHeader'
import MonthView from './MonthView'
import WeekView from './WeekView'

// ============================================================================
// Props
// ============================================================================

interface InteractiveCalendarProps {
  events: AcademicEvent[]
  onDateClick: (date: string) => void
  onEventClick: (eventId: string) => void
}

// ============================================================================
// Component
// ============================================================================

export default function InteractiveCalendar({
  events,
  onDateClick,
  onEventClick,
}: InteractiveCalendarProps) {
  const { viewMode, setSelectedDate, setSelectedEventId } = useCalendar()

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    onDateClick(date)
  }

  const _handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId)
    onEventClick(eventId)
  }

  // Filter out cancelled events for display
  const activeEvents = events.filter(e => e.status !== 'cancelled')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 md:p-5">
      <CalendarHeader />

      {viewMode === 'month' ? (
        <MonthView events={activeEvents} onDateClick={handleDateClick} />
      ) : (
        <WeekView events={activeEvents} onDateClick={handleDateClick} />
      )}

      {/* Event click is handled at the cell/card level via context —
          this prop is available for parent page to open detail modals */}
    </div>
  )
}
