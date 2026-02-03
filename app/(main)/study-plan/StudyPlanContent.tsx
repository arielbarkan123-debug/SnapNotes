'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useStudyPlan } from '@/hooks/useStudyPlan'
import { CalendarPlus, RefreshCw, ArrowLeft } from 'lucide-react'
import DailyChecklist from '@/components/study-plan/DailyChecklist'
import PlanCalendar from '@/components/study-plan/PlanCalendar'
import PlanProgress from '@/components/study-plan/PlanProgress'

export default function StudyPlanContent() {
  const t = useTranslations('studyPlan')
  const { plan, tasks, todayTasks, isLoading, completeTask, mutate } = useStudyPlan()
  const [recalculating, setRecalculating] = useState(false)

  // Compute progress stats
  const { totalTasks, completedTasks, overdueTasks, daysLeft } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'completed').length
    const overdue = tasks.filter(
      t => t.status === 'pending' && t.scheduled_date < today
    ).length

    let days = 0
    if (plan) {
      const exam = new Date(plan.exam_date)
      const now = new Date()
      days = Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    }

    return { totalTasks: total, completedTasks: completed, overdueTasks: overdue, daysLeft: days }
  }, [tasks, plan])

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleRecalculate = async () => {
    if (!plan || recalculating) return
    setRecalculating(true)
    try {
      const res = await fetch(`/api/study-plan/${plan.id}/recalculate`, {
        method: 'POST',
      })
      if (res.ok) {
        await mutate()
      }
    } catch {
      // Silently handle
    } finally {
      setRecalculating(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    )
  }

  // No active plan - show CTA
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

  // Active plan dashboard
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {plan.title}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>
              {t('examDate')}: {new Date(plan.exam_date).toLocaleDateString()}
            </span>
            <span className="font-medium text-violet-600 dark:text-violet-400">
              {daysLeft === 0
                ? t('today')
                : daysLeft === 1
                  ? t('dayLeft')
                  : t('daysLeft', { count: daysLeft })}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
            {progressPercent}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('progress')}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <PlanProgress
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        overdueTasks={overdueTasks}
      />

      {/* Today's tasks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('todaysTasks')}
        </h2>
        <DailyChecklist
          tasks={todayTasks}
          onComplete={completeTask}
        />
      </div>

      {/* Calendar */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('calendarTitle')}
        </h2>
        <PlanCalendar
          tasks={tasks}
          currentDate={new Date()}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? t('recalculating') : t('recalculate')}
        </button>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  )
}
