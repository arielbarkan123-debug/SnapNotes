'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

  // Store callbacks in refs to avoid dependency-triggered re-runs
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Track whether we've already fired onComplete to prevent duplicate calls
  const hasCompletedRef = useRef(false)

  // Reset hasCompleted when courseId changes
  useEffect(() => {
    hasCompletedRef.current = false
  }, [courseId])

  // Ref-based guard for isContinuing to avoid stale closures in recursive setTimeout
  const isContinuingRef = useRef(false)

  // Trigger background continuation
  const triggerContinuation = useCallback(async () => {
    if (!courseId || isContinuingRef.current) return

    isContinuingRef.current = true
    setIsContinuing(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-course/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        setError('Server response error. Please try again.')
        return
      }

      if (!response.ok) {
        setError(data?.error || 'Failed to continue generation')
        return
      }

      // Update local state from response
      setStatus(data.status)
      setLessonsReady(data.lessonsReady)

      // If not complete, trigger again
      if (data.continue) {
        // Small delay before next batch — reset continuing flag so recursive call can proceed
        isContinuingRef.current = false
        setIsContinuing(false)
        setTimeout(() => {
          triggerContinuation()
        }, 1000)
        return // skip the finally block's reset
      } else if (data.status === 'complete' && !hasCompletedRef.current) {
        hasCompletedRef.current = true
        onCompleteRef.current?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue generation')
    } finally {
      isContinuingRef.current = false
      setIsContinuing(false)
    }
  }, [courseId])

  // Fetch initial status and subscribe to updates
  useEffect(() => {
    if (!courseId) return

    const supabase = createClient()
    let cancelled = false

    // Fetch initial status
    const fetchStatus = async () => {
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('generation_status, lessons_ready, total_lessons')
        .eq('id', courseId)
        .single()

      if (fetchError || cancelled) {
        if (fetchError) console.error('[useGenerationStatus] Fetch error:', fetchError)
        return
      }

      if (data) {
        const currentStatus = (data.generation_status as GenerationStatus) || 'complete'
        setStatus(currentStatus)
        setLessonsReady(data.lessons_ready || 0)
        setTotalLessons(data.total_lessons || 0)

        // If already complete on first fetch, don't subscribe or trigger anything
        if (currentStatus === 'complete' || currentStatus === 'failed') {
          return
        }

        // Auto-trigger continuation if partial and enabled
        if (autoTriggerContinuation && currentStatus === 'partial') {
          triggerContinuation()
        }
      }
    }

    fetchStatus()

    // Subscribe to realtime updates (with fallback for browsers that block WebSocket)
    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollingInterval: ReturnType<typeof setInterval> | null = null

    // Track previous status to detect transitions to 'complete'
    let lastKnownStatus: GenerationStatus | null = null

    const handleStatusUpdate = (newStatus: GenerationStatus, newLessonsReady?: number, newTotalLessons?: number) => {
      if (cancelled) return

      if (newStatus) {
        setStatus(newStatus)
      }
      if (typeof newLessonsReady === 'number') {
        setLessonsReady(newLessonsReady)
      }
      if (typeof newTotalLessons === 'number') {
        setTotalLessons(newTotalLessons)
      }

      // Only fire onComplete when transitioning TO complete (not when already complete)
      if (newStatus === 'complete' && lastKnownStatus !== 'complete' && !hasCompletedRef.current) {
        hasCompletedRef.current = true
        onCompleteRef.current?.()

        // Stop listening — generation is done
        cleanup()
      }

      lastKnownStatus = newStatus
    }

    const cleanup = () => {
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch {
          // Ignore errors when removing channel
        }
        channel = null
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
    }

    try {
      channel = supabase
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
              handleStatusUpdate(
                newData.generation_status,
                typeof newData.lessons_ready === 'number' ? newData.lessons_ready : undefined,
                typeof newData.total_lessons === 'number' ? newData.total_lessons : undefined
              )
            }
          }
        )
        .subscribe((subStatus) => {
          // If subscription fails, fall back to polling
          if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
            console.warn('[useGenerationStatus] Realtime subscription failed, falling back to polling')
            startPolling()
          }
        })
    } catch (err) {
      // WebSocket not available (e.g., Safari private mode, some mobile browsers)
      console.warn('[useGenerationStatus] WebSocket not available, falling back to polling:', err)
      startPolling()
    }

    // Polling fallback for browsers that don't support WebSocket
    function startPolling() {
      if (pollingInterval) return // Already polling

      pollingInterval = setInterval(async () => {
        const { data } = await supabase
          .from('courses')
          .select('generation_status, lessons_ready, total_lessons')
          .eq('id', courseId)
          .single()

        if (data) {
          handleStatusUpdate(
            data.generation_status as GenerationStatus,
            data.lessons_ready,
            data.total_lessons
          )

          // Stop polling when complete or failed
          if (data.generation_status === 'complete' || data.generation_status === 'failed') {
            if (pollingInterval) {
              clearInterval(pollingInterval)
              pollingInterval = null
            }
          }
        }
      }, 3000) // Poll every 3 seconds
    }

    return () => {
      cancelled = true
      cleanup()
    }
  }, [courseId, autoTriggerContinuation, triggerContinuation])

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
