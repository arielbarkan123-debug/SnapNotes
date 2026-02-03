'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  BookOpen,
  RotateCcw,
  ClipboardCheck,
  AlertTriangle,
  Feather,
  FileText,
  Check,
  Clock,
  Loader2,
} from 'lucide-react'
import type { StudyPlanTask } from '@/lib/study-plan/types'
import { useXP } from '@/contexts/XPContext'

// ============================================================================
// Props
// ============================================================================

interface DailyChecklistProps {
  tasks: StudyPlanTask[]
  onComplete: (taskId: string) => Promise<{ xpAwarded?: number; dailyComplete?: boolean }>
}

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

const taskTypeColors: Record<string, string> = {
  learn_lesson: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  review_lesson: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  practice_test: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  review_weak: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  light_review: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
  mock_exam: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
}

// ============================================================================
// Component
// ============================================================================

export default function DailyChecklist({ tasks, onComplete }: DailyChecklistProps) {
  const t = useTranslations('studyPlan')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const { showXP } = useXP()

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {t('noTasksToday')}
        </p>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          {t('allCaughtUp')}
        </p>
      </div>
    )
  }

  const handleComplete = async (taskId: string) => {
    setCompletingId(taskId)
    try {
      const result = await onComplete(taskId)
      if (result?.xpAwarded && result.xpAwarded > 0) {
        showXP(result.xpAwarded)
      }
    } finally {
      setCompletingId(null)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card overflow-hidden">
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {tasks.map(task => {
          const Icon = taskTypeIcons[task.task_type] || BookOpen
          const colorClass = taskTypeColors[task.task_type] || 'text-gray-600 bg-gray-100'
          const isCompleted = task.status === 'completed'
          const isCompleting = completingId === task.id

          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-4 transition ${
                isCompleted ? 'opacity-60' : ''
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => !isCompleted && !isCompleting && handleComplete(task.id)}
                disabled={isCompleted || isCompleting}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  isCompleted
                    ? 'bg-green-500 border-green-500'
                    : isCompleting
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-violet-500'
                }`}
              >
                {isCompleted && <Check className="w-4 h-4 text-white" />}
                {isCompleting && <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />}
              </button>

              {/* Task type icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isCompleted
                    ? 'line-through text-gray-400 dark:text-gray-500'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {task.description || task.lesson_title || t(`taskTypes.${task.task_type}`)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                    {t(`taskTypes.${task.task_type}`)}
                  </span>
                </div>
              </div>

              {/* Estimated time */}
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                <Clock className="w-3 h-3" />
                {t('minutes', { count: task.estimated_minutes })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
