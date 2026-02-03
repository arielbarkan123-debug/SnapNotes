'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useStudyPlan } from '@/hooks/useStudyPlan'
import {
  CalendarPlus,
  BookOpen,
  RotateCcw,
  ClipboardCheck,
  AlertTriangle,
  Feather,
  FileText,
  ChevronRight,
  Check,
  Clock,
} from 'lucide-react'
import type { StudyPlanTask } from '@/lib/study-plan/types'
import { SWRErrorState } from '@/components/ui/SWRErrorState'

// ============================================================================
// Helpers
// ============================================================================

const taskTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  learn_lesson: BookOpen,
  review_lesson: RotateCcw,
  practice_test: ClipboardCheck,
  review_weak: AlertTriangle,
  light_review: Feather,
  mock_exam: FileText,
}

// ============================================================================
// Component
// ============================================================================

export default function StudyPlanWidget() {
  const t = useTranslations('studyPlan.widget')
  const tTask = useTranslations('studyPlan.taskTypes')
  const tMin = useTranslations('studyPlan')
  const { plan, todayTasks, isLoading, error, mutate } = useStudyPlan()

  const daysUntilExam = useMemo(() => {
    if (!plan) return 0
    const exam = new Date(plan.exam_date)
    const now = new Date()
    return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }, [plan])

  // Don't render while loading
  if (isLoading) return null

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card mb-6">
        <SWRErrorState onRetry={() => mutate()} />
      </div>
    )
  }

  // No plan - show CTA
  if (!plan) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <CalendarPlus className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {t('createPlan')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('createDescription')}
            </p>
          </div>
          <Link
            href="/study-plan/create"
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {t('start')}
          </Link>
        </div>
      </div>
    )
  }

  // Active plan - show today's tasks
  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {t('title')}
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('daysUntilExam', { count: daysUntilExam })}
        </span>
      </div>

      {/* Today's tasks (compact) */}
      {todayTasks.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('noTasks')}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {todayTasks.slice(0, 3).map((task: StudyPlanTask) => {
            const Icon = taskTypeIcons[task.task_type] || BookOpen
            const isCompleted = task.status === 'completed'
            return (
              <div key={task.id} className={`flex items-center gap-3 px-4 py-2.5 ${isCompleted ? 'opacity-50' : ''}`}>
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <span className={`text-sm flex-1 min-w-0 truncate ${
                  isCompleted
                    ? 'line-through text-gray-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {tTask(task.task_type)}: {task.lesson_title || task.description}
                </span>
                <span className="flex items-center gap-0.5 text-xs text-gray-400 shrink-0">
                  <Clock className="w-3 h-3" />
                  {tMin('minutes', { count: task.estimated_minutes })}
                </span>
              </div>
            )
          })}
          {todayTasks.length > 3 && (
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {t('moreItems', { count: todayTasks.length - 3 })}
            </div>
          )}
        </div>
      )}

      {/* View full plan link */}
      <Link
        href="/study-plan"
        className="flex items-center justify-center gap-1 px-4 py-2.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition border-t border-gray-100 dark:border-gray-700"
      >
        {t('viewPlan')}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
