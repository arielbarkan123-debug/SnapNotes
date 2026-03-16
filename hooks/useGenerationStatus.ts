'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GenerationStatus, Course } from '@/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('hook:useGenerationStatus')

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

  // Reset hasCompleted and continuation count when courseId changes
  useEffect(() => {
    hasCompletedRef.current = false
    continuationCountRef.current = 0
  }, [courseId])

  // Ref-based guard for isContinuing to avoid stale closures in recursive setTimeout
  const isContinuingRef = useRef(false)
  const continuationCountRef = useRef(0)
  const MAX_CONTINUATION_ATTEMPTS = 60

  // Trigger background continuation
  const triggerContinuation = useCallback(async () => {
    if (!courseId || isContinuingRef.current) return

    if (continuationCountRef.current >= MAX_CONTINUATION_ATTEMPTS) {
      setStatus('failed')
      setError('Generation is taking too long. Please refresh and try again.')
      return
    }
    continuationCountRef.current += 1

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
        isContinuingRef.current = false
        setIsContinuing(false)
        setTimeout(() => {
          triggerContinuation()
        }, 1000)
        return
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

  // Fetch initial status and conditionally subscribe to updates
  useEffect(() => {
    if (!courseId) return

    const supabase = createClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollingInterval: ReturnType<typeof setInterval> | null = null

    const cleanup = () => {
      if (channel) {
        try { supabase.removeChannel(channel) } catch { /* ignore */ }
        channel = null
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
    }

    const handleStatusUpdate = (newStatus: GenerationStatus, newLessonsReady?: number, newTotalLessons?: number) => {
      if (cancelled) return

      if (newStatus) setStatus(newStatus)
      if (typeof newLessonsReady === 'number') setLessonsReady(newLessonsReady)
      if (typeof newTotalLessons === 'number') setTotalLessons(newTotalLessons)

      // Only fire onComplete when transitioning TO complete
      if (newStatus === 'complete' && !hasCompletedRef.current) {
        hasCompletedRef.current = true
        onCompleteRef.current?.()
        cleanup()
      }
    }

    function startPolling() {
      if (pollingInterval) return
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
          if (data.generation_status === 'complete' || data.generation_status === 'failed') {
            if (pollingInterval) {
              clearInterval(pollingInterval)
              pollingInterval = null
            }
          }
        }
      }, 3000)
    }

    function subscribeToUpdates() {
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
            if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
              log.warn('Realtime failed, falling back to polling')
              startPolling()
            }
          })
      } catch (err) {
        log.warn({ err }, 'WebSocket not available, falling back to polling')
        startPolling()
      }
    }

    // Fetch initial status, then decide whether to subscribe
    const init = async () => {
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('generation_status, lessons_ready, total_lessons')
        .eq('id', courseId)
        .single()

      if (fetchError || cancelled) {
        if (fetchError) log.error({ err: fetchError }, 'Fetch error')
        return
      }

      if (!data) return

      const currentStatus = (data.generation_status as GenerationStatus) || 'complete'
      setStatus(currentStatus)
      setLessonsReady(data.lessons_ready || 0)
      setTotalLessons(data.total_lessons || 0)

      // CRITICAL: If already complete or failed, do NOT subscribe to anything.
      // No realtime, no polling, no onComplete. Nothing to do.
      if (currentStatus === 'complete' || currentStatus === 'failed') {
        return
      }

      // Only subscribe if generation is still in progress
      subscribeToUpdates()

      // Auto-trigger continuation if partial
      if (autoTriggerContinuation && currentStatus === 'partial') {
        triggerContinuation()
      }
    }

    init()

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
