'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'

// ============================================================================
// Types
// ============================================================================

export interface Annotation {
  id: string
  user_id: string
  course_id: string
  lesson_index: number
  step_index: number | null
  note_text: string | null
  flag_type: 'confusing' | 'important' | null
  created_at: string
  updated_at: string
}

interface AnnotationsResponse {
  success: boolean
  annotations: Annotation[]
}

export interface UseAnnotationsReturn {
  annotations: Annotation[]
  isLoading: boolean
  error: string | null
  saveAnnotation: (params: {
    stepIndex?: number
    noteText?: string
    flagType?: 'confusing' | 'important' | null
  }) => Promise<Annotation | null>
  deleteAnnotation: (id: string) => Promise<boolean>
  getAnnotationForStep: (stepIndex: number) => Annotation | undefined
  mutate: () => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useAnnotations(courseId: string, lessonIndex: number): UseAnnotationsReturn {
  const cacheKey = courseId ? `/api/annotations?courseId=${courseId}&lessonIndex=${lessonIndex}` : null

  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<AnnotationsResponse>(cacheKey)

  const annotations = data?.annotations || []
  const [mutationError, setMutationError] = useState<string | null>(null)

  const saveAnnotation = useCallback(async (params: {
    stepIndex?: number
    noteText?: string
    flagType?: 'confusing' | 'important' | null
  }): Promise<Annotation | null> => {
    try {
      setMutationError(null)
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonIndex,
          stepIndex: params.stepIndex ?? null,
          noteText: params.noteText,
          flagType: params.flagType,
        }),
      })
      const data = await res.json()
      if (data.success) {
        await mutate()
        return data.annotation
      }
      setMutationError('Failed to save annotation')
      return null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save annotation'
      setMutationError(msg)
      return null
    }
  }, [courseId, lessonIndex, mutate])

  const deleteAnnotation = useCallback(async (id: string): Promise<boolean> => {
    try {
      setMutationError(null)
      const res = await fetch(`/api/annotations?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        await mutate()
        return true
      }
      setMutationError('Failed to delete annotation')
      return false
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete annotation'
      setMutationError(msg)
      return false
    }
  }, [mutate])

  const getAnnotationForStep = useCallback((stepIndex: number): Annotation | undefined => {
    return annotations.find(a => a.step_index === stepIndex)
  }, [annotations])

  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  const error = swrError ? (swrError.message || 'Failed to load annotations') : mutationError

  return {
    annotations,
    isLoading,
    error,
    saveAnnotation,
    deleteAnnotation,
    getAnnotationForStep,
    mutate: handleMutate,
  }
}

export default useAnnotations
