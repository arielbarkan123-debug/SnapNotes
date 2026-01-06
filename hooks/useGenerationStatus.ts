'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GenerationStatus, Course } from '@/types'

interface UseGenerationStatusOptions {
  /** If true, automatically triggers background continuation when status is 'partial' */
  autoTriggerContinuation?: boolean
  /** Callback when generation completes */
  onComplete?: () => void
}

interface UseGenerationStatusReturn {
  /** Current generation status */
  status: GenerationStatus
  /** Number of lessons ready */
  lessonsReady: number
  /** Total expected lessons */
  totalLessons: number
  /** Whether generation is still in progress */
  isGenerating: boolean
  /** Error message if generation failed */
  error: string | null
  /** Manually trigger continuation */
  triggerContinuation: () => Promise<void>
  /** Whether continuation is currently running */
  isContinuing: boolean
}

/**
 * Hook to track progressive course generation status.
 * Uses Supabase Realtime to get live updates as lessons are generated.
 *
 * @param courseId - The course ID to track
 * @param options - Configuration options
 * @returns Generation status and control functions
 */
export function useGenerationStatus(
  courseId: string | undefined,
  options: UseGenerationStatusOptions = {}
): UseGenerationStatusReturn {
  const { autoTriggerContinuation = true, onComplete } = options

  const [status, setStatus] = useState<GenerationStatus>('complete')
  const [lessonsReady, setLessonsReady] = useState(0)
  const [totalLessons, setTotalLessons] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isContinuing, setIsContinuing] = useState(false)

  const isGenerating = status !== 'complete' && status !== 'failed'

  // Trigger background continuation
  const triggerContinuation = useCallback(async () => {
    if (!courseId || isContinuing || status === 'complete') return

    setIsContinuing(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-course/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to continue generation')
        return
      }

      // Update local state from response
      setStatus(data.status)
      setLessonsReady(data.lessonsReady)

      // If not complete, trigger again
      if (data.continue) {
        // Small delay before next batch
        setTimeout(() => {
          triggerContinuation()
        }, 1000)
      } else if (data.status === 'complete') {
        onComplete?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue generation')
    } finally {
      setIsContinuing(false)
    }
  }, [courseId, isContinuing, status, onComplete])

  // Fetch initial status and subscribe to updates
  useEffect(() => {
    if (!courseId) return

    const supabase = createClient()

    // Fetch initial status
    const fetchStatus = async () => {
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('generation_status, lessons_ready, total_lessons')
        .eq('id', courseId)
        .single()

      if (fetchError) {
        console.error('[useGenerationStatus] Fetch error:', fetchError)
        return
      }

      if (data) {
        setStatus((data.generation_status as GenerationStatus) || 'complete')
        setLessonsReady(data.lessons_ready || 0)
        setTotalLessons(data.total_lessons || 0)

        // Auto-trigger continuation if partial and enabled
        if (autoTriggerContinuation && data.generation_status === 'partial') {
          triggerContinuation()
        }
      }
    }

    fetchStatus()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`course-${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courses',
          filter: `id=eq.${courseId}`,
        },
        (payload) => {
          const newData = payload.new as Partial<Course>

          if (newData.generation_status) {
            setStatus(newData.generation_status)
          }
          if (typeof newData.lessons_ready === 'number') {
            setLessonsReady(newData.lessons_ready)
          }
          if (typeof newData.total_lessons === 'number') {
            setTotalLessons(newData.total_lessons)
          }

          // Check for completion
          if (newData.generation_status === 'complete') {
            onComplete?.()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [courseId, autoTriggerContinuation, triggerContinuation, onComplete])

  return {
    status,
    lessonsReady,
    totalLessons,
    isGenerating,
    error,
    triggerContinuation,
    isContinuing,
  }
}
