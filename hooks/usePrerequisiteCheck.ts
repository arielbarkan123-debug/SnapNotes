/**
 * usePrerequisiteCheck Hook
 *
 * Checks for prerequisite knowledge gaps before starting a lesson.
 * Identifies missing concepts that may hinder understanding of new material.
 *
 * @example
 * ```tsx
 * const { gaps, hasBlockingGaps, shouldShowCheck, dismissCheck } = usePrerequisiteCheck({
 *   courseId: 'course-123',
 *   lessonIndex: 2
 * })
 *
 * if (shouldShowCheck) {
 *   // Show prerequisite gap modal
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import type { DetectedGap, GapDetectionResult } from '@/lib/concepts/types'

interface UsePrerequisiteCheckOptions {
  courseId: string
  lessonIndex: number
  enabled?: boolean
}

interface UsePrerequisiteCheckResult {
  gaps: DetectedGap[]
  hasBlockingGaps: boolean
  isLoading: boolean
  error: string | null
  shouldShowCheck: boolean
  dismissCheck: () => void
  refetch: () => void
}

/**
 * Hook for checking prerequisite knowledge gaps before a lesson
 *
 * @param options - Configuration options
 * @param options.courseId - The course ID
 * @param options.lessonIndex - The lesson index to check prerequisites for
 * @param options.enabled - Whether to run the check (default: true)
 * @returns Object containing gaps data, blocking status, and control functions
 */
export function usePrerequisiteCheck({
  courseId,
  lessonIndex,
  enabled = true,
}: UsePrerequisiteCheckOptions): UsePrerequisiteCheckResult {
  const [gaps, setGaps] = useState<DetectedGap[]>([])
  const [hasBlockingGaps, setHasBlockingGaps] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const fetchGaps = useCallback(async () => {
    if (!enabled || !courseId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/user/gaps?courseId=${courseId}&lessonIndex=${lessonIndex}&detect=true`
      )

      if (!response.ok) {
        throw new Error('Failed to check prerequisites')
      }

      const data = await response.json()

      // Filter to only gaps relevant to this lesson's prerequisites
      // The API returns all gaps, but we check with detect=true which runs checkPrerequisitesForLesson
      // The returned gaps should already be filtered, but let's be safe
      setGaps(data.gaps || [])
      setHasBlockingGaps(
        (data.gaps || []).some(
          (g: DetectedGap) =>
            g.severity === 'critical' &&
            (g.gapType === 'missing_prerequisite' || g.gapType === 'never_learned')
        )
      )
    } catch (err) {
      console.error('Prerequisite check failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to check prerequisites')
      // Don't block lesson on error - let them continue
      setGaps([])
      setHasBlockingGaps(false)
    } finally {
      setIsLoading(false)
    }
  }, [courseId, lessonIndex, enabled])

  useEffect(() => {
    fetchGaps()
  }, [fetchGaps])

  const dismissCheck = useCallback(() => {
    setDismissed(true)
  }, [])

  const refetch = useCallback(() => {
    setDismissed(false)
    fetchGaps()
  }, [fetchGaps])

  // Show check modal if there are gaps and user hasn't dismissed
  const shouldShowCheck = !isLoading && !dismissed && gaps.length > 0

  return {
    gaps,
    hasBlockingGaps,
    isLoading,
    error,
    shouldShowCheck,
    dismissCheck,
    refetch,
  }
}
