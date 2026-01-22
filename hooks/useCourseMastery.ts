/**
 * useCourseMastery Hook
 *
 * Fetches mastery data for a specific course, including overall mastery
 * percentage and per-lesson mastery breakdown.
 *
 * @example
 * ```tsx
 * const { overallMastery, lessonMastery, isLoading } = useCourseMastery({
 *   courseId: 'course-123'
 * })
 *
 * // Get mastery for a specific lesson
 * const lesson2Mastery = lessonMastery.get(2)
 * ```
 */

import useSWR from 'swr'

interface LessonMastery {
  lessonIndex: number
  conceptCount: number
  masteredCount: number
  averageMastery: number
  hasGaps: boolean
  criticalGaps: number
}

interface CourseMasteryData {
  courseId: string
  overallMastery: number
  lessonMastery: LessonMastery[]
  totalConcepts: number
  masteredConcepts: number
}

const fetcher = async (url: string): Promise<CourseMasteryData> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch course mastery')
  }
  return res.json()
}

export interface UseCourseMasteryOptions {
  courseId: string
  enabled?: boolean
}

export interface UseCourseMasteryReturn {
  data: CourseMasteryData | undefined
  lessonMastery: Map<number, LessonMastery>
  overallMastery: number
  isLoading: boolean
  error: Error | undefined
}

/**
 * Hook for fetching course mastery data
 *
 * @param options - Configuration options
 * @param options.courseId - The course ID to fetch mastery for
 * @param options.enabled - Whether to fetch (default: true)
 * @returns Object containing mastery data, lesson mastery map, and loading state
 */
export function useCourseMastery(options: UseCourseMasteryOptions): UseCourseMasteryReturn {
  const { courseId, enabled = true } = options

  const { data, error, isLoading } = useSWR<CourseMasteryData>(
    enabled && courseId ? `/api/courses/${courseId}/mastery` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  // Build map for easy lookup
  const lessonMastery = new Map<number, LessonMastery>()
  if (data?.lessonMastery) {
    for (const lesson of data.lessonMastery) {
      lessonMastery.set(lesson.lessonIndex, lesson)
    }
  }

  return {
    data,
    lessonMastery,
    overallMastery: data?.overallMastery ?? 0,
    isLoading,
    error,
  }
}
