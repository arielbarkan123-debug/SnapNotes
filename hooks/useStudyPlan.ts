'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import type { StudyPlanWithTasks, StudyPlanTask } from '@/lib/study-plan/types'

// ============================================================================
// Types
// ============================================================================

interface StudyPlanApiResponse {
  success: boolean
  plans: StudyPlanWithTasks[]
}

export interface UseStudyPlanReturn {
  plan: StudyPlanWithTasks | null
  tasks: StudyPlanTask[]
  todayTasks: StudyPlanTask[]
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
  completeTask: (taskId: string) => Promise<void>
}

// ============================================================================
// Cache Key
// ============================================================================

export const STUDY_PLAN_CACHE_KEY = '/api/study-plan'

// ============================================================================
// Hook
// ============================================================================

export function useStudyPlan(): UseStudyPlanReturn {
  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<StudyPlanApiResponse>(STUDY_PLAN_CACHE_KEY, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      if (retryCount >= 3) return
      setTimeout(() => revalidate({ retryCount }), 5000)
    },
  })

  // Get the active plan (first one returned)
  const plan = useMemo(() => {
    if (!data?.plans || data.plans.length === 0) return null
    return data.plans.find(p => p.status === 'active') || null
  }, [data])

  // All tasks for the active plan
  const tasks = useMemo(() => {
    return plan?.tasks || []
  }, [plan])

  // Today's tasks
  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return tasks
      .filter(t => t.scheduled_date === today)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [tasks])

  // Complete a task
  const completeTask = useCallback(async (taskId: string) => {
    if (!plan) return

    // Optimistic update
    await mutate(
      async (current) => {
        const res = await fetch(`/api/study-plan/${plan.id}/complete-task`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId }),
        })

        if (!res.ok) {
          throw new Error('Failed to complete task')
        }

        // Update the local data
        if (!current) return current
        return {
          ...current,
          plans: current.plans.map(p => {
            if (p.id !== plan.id) return p
            return {
              ...p,
              tasks: p.tasks.map(t =>
                t.id === taskId
                  ? { ...t, status: 'completed' as const, completed_at: new Date().toISOString() }
                  : t
              ),
            }
          }),
        }
      },
      { revalidate: false }
    )
  }, [plan, mutate])

  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  const error = swrError ? (swrError.message || 'Failed to load study plan') : null

  return {
    plan,
    tasks,
    todayTasks,
    isLoading,
    error,
    mutate: handleMutate,
    completeTask,
  }
}

export default useStudyPlan
