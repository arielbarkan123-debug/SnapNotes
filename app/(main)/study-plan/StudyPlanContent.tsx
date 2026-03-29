'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getDateLocale } from '@/lib/utils'
import { CalendarProvider, useCalendar } from '@/contexts/CalendarContext'
import { useAcademicEvents } from '@/hooks/useAcademicEvents'
import { useStudyPlan } from '@/hooks/useStudyPlan'
import { CalendarPlus, RefreshCw } from 'lucide-react'
import InteractiveCalendar from '@/components/study-plan/InteractiveCalendar'
import StudyPlanChat from '@/components/study-plan/StudyPlanChat'
import AddEventModal from '@/components/study-plan/AddEventModal'
import EventDetailPanel from '@/components/study-plan/EventDetailPanel'
import DailyChecklist from '@/components/study-plan/DailyChecklist'
import PlanProgress from '@/components/study-plan/PlanProgress'
import CalendarChatLayout from '@/components/study-plan/CalendarChatLayout'
import type { AcademicEvent, AcademicEventUpdate } from '@/types'

// =============================================================================
// Inner component (needs CalendarProvider above it)
// =============================================================================

function StudyPlanInner() {
  const t = useTranslations('studyPlan')
  const locale = useLocale()

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  // ---------------------------------------------------------------------------
  // Calendar context
  // ---------------------------------------------------------------------------
  const {
    selectedDate,
    setSelectedDate,
    setSelectedEventId,
    currentMonth,
  } = useCalendar()

  // ---------------------------------------------------------------------------
  // Data: academic events (compute date range from currentMonth)
  // ---------------------------------------------------------------------------
  const from = useMemo(() => {
    const d = new Date(currentMonth)
    d.setDate(d.getDate() - 7) // include prev-month overflow days
    return d.toISOString().split('T')[0]
  }, [currentMonth])

  const to = useMemo(() => {
    const d = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      7, // include next-month overflow days
    )
    return d.toISOString().split('T')[0]
  }, [currentMonth])

  const {
    events,
    mutate: mutateEvents,
    updateEvent,
    deleteEvent,
  } = useAcademicEvents(from, to)

  // ---------------------------------------------------------------------------
  // Data: study plan + today tasks
  // ---------------------------------------------------------------------------
  const {
    plan,
    tasks,
    todayTasks,
    isLoading,
    completeTask,
    mutate: mutatePlan,
  } = useStudyPlan()

  // Progress stats
  const { totalTasks, completedTasks, overdueTasks, daysLeft, progressPercent } =
    useMemo(() => {
      const today = new Date().toISOString().split('T')[0]
      const total = tasks.length
      const completed = tasks.filter((t) => t.status === 'completed').length
      const overdue = tasks.filter(
        (t) => t.status === 'pending' && t.scheduled_date < today,
      ).length

      let days = 0
      if (plan) {
        const exam = new Date(plan.exam_date)
        const now = new Date()
        days = Math.max(
          0,
          Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        )
      }

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0

      return {
        totalTasks: total,
        completedTasks: completed,
        overdueTasks: overdue,
        daysLeft: days,
        progressPercent: pct,
      }
    }, [tasks, plan])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleDateClick = useCallback(
    (date: string) => {
      setSelectedDate(date)
      setShowAddEvent(true)
    },
    [setSelectedDate],
  )

  const handleEventClick = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId)
      if (event) {
        setSelectedEvent(event)
        setSelectedEventId(eventId)
      }
    },
    [events, setSelectedEventId],
  )

  const handleEventCreated = useCallback(() => {
    mutateEvents()
    setShowAddEvent(false)
  }, [mutateEvents])

  const handleEventUpdate = useCallback(
    async (updates: AcademicEventUpdate) => {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, updates)
        setSelectedEvent((prev) => (prev ? { ...prev, ...updates } : null))
      }
    },
    [selectedEvent, updateEvent],
  )

  const handleEventDelete = useCallback(async () => {
    if (selectedEvent) {
      await deleteEvent(selectedEvent.id)
      setSelectedEvent(null)
      setSelectedEventId(null)
    }
  }, [selectedEvent, deleteEvent, setSelectedEventId])

  const handleChatActions = useCallback(() => {
    mutateEvents() // refresh calendar when chat creates/modifies events
  }, [mutateEvents])

  const handleRecalculate = useCallback(async () => {
    if (!plan || recalculating) return
    setRecalculating(true)
    try {
      const res = await fetch(`/api/study-plan/${plan.id}/recalculate`, {
        method: 'POST',
      })
      if (res.ok) {
        await mutatePlan()
      }
    } catch {
      // silently handle
    } finally {
      setRecalculating(false)
    }
  }, [plan, recalculating, mutatePlan])

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-6 w-full max-w-3xl p-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // No active plan CTA
  // ---------------------------------------------------------------------------
  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('title')}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarPlus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('noPlanYet')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {t('noPlanDescription')}
          </p>
          <Link
            href="/study-plan/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
          >
            <CalendarPlus className="w-5 h-5" />
            {t('createFirstPlan')}
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Active plan — two-panel layout
  // ---------------------------------------------------------------------------
  return (
    <div className="h-full flex flex-col">
      {/* ── Plan header (always visible) ── */}
      <div className="shrink-0 px-4 md:px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {plan.title}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {t('examDate')}:{' '}
                {new Date(plan.exam_date).toLocaleDateString(
                  getDateLocale(locale),
                )}
              </span>
              <span className="font-medium text-violet-600 dark:text-violet-400">
                {daysLeft === 0
                  ? t('today')
                  : daysLeft === 1
                    ? t('dayLeft')
                    : t('daysLeft', { count: daysLeft })}
              </span>
              <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                {progressPercent}%
              </span>
            </div>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="shrink-0 p-2 text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
            title={recalculating ? t('recalculating') : t('recalculate')}
          >
            <RefreshCw
              className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* ── Two-panel layout (calendar left, chat right) ── */}
      <CalendarChatLayout
        calendarPanel={
          <div className="p-4 md:p-6 space-y-6">
            {/* Progress bar */}
            <PlanProgress
              totalTasks={totalTasks}
              completedTasks={completedTasks}
              overdueTasks={overdueTasks}
            />

            {/* Interactive calendar */}
            <InteractiveCalendar
              events={events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
            />

            {/* Today's tasks */}
            {todayTasks && todayTasks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('todaysTasks')}
                </h3>
                <DailyChecklist tasks={todayTasks} onComplete={completeTask} />
              </div>
            )}
          </div>
        }
        chatPanel={
          <StudyPlanChat onActionApplied={handleChatActions} />
        }
      />

      {/* ── Modals ── */}
      <AddEventModal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        defaultDate={selectedDate || undefined}
        onEventCreated={handleEventCreated}
      />

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null)
            setSelectedEventId(null)
          }}
          onUpdate={handleEventUpdate}
          onDelete={handleEventDelete}
        />
      )}
    </div>
  )
}

// =============================================================================
// Exported wrapper (provides CalendarProvider)
// =============================================================================

export default function StudyPlanContent() {
  return (
    <CalendarProvider>
      <StudyPlanInner />
    </CalendarProvider>
  )
}
