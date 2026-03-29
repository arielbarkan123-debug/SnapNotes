'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { CalendarView } from '@/types'

// ============================================================================
// Types
// ============================================================================

interface CalendarContextValue {
  selectedDate: string | null        // YYYY-MM-DD
  viewMode: CalendarView
  selectedEventId: string | null
  currentMonth: Date                 // first day of displayed month
  setSelectedDate: (date: string | null) => void
  setViewMode: (mode: CalendarView) => void
  setSelectedEventId: (id: string | null) => void
  setCurrentMonth: (date: Date) => void
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToToday: () => void
}

// ============================================================================
// Context
// ============================================================================

const CalendarContext = createContext<CalendarContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<CalendarView>('month')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const goToToday = useCallback(() => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    setSelectedDate(`${yyyy}-${mm}-${dd}`)
  }, [])

  return (
    <CalendarContext.Provider value={{
      selectedDate, viewMode, selectedEventId, currentMonth,
      setSelectedDate, setViewMode, setSelectedEventId, setCurrentMonth,
      goToPrevMonth, goToNextMonth, goToToday,
    }}>
      {children}
    </CalendarContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) throw new Error('useCalendar must be used within CalendarProvider')
  return context
}
