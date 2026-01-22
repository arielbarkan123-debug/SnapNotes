/**
 * useCourses Hook
 *
 * Comprehensive hook for fetching, searching, sorting, and filtering courses.
 * Features debounced search, sort order toggle, and SWR caching.
 *
 * @example
 * ```tsx
 * const {
 *   filteredCourses,
 *   searchQuery,
 *   setSearchQuery,
 *   sortOrder,
 *   toggleSortOrder,
 *   isLoading
 * } = useCourses()
 *
 * // With initial data (SSR)
 * const { courses } = useCourses({ initialCourses: serverCourses })
 * ```
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { type Course } from '@/types'
import { useDebounce } from './useDebounce'

// ============================================================================
// Types
// ============================================================================

export type SortOrder = 'newest' | 'oldest'

interface CoursesApiResponse {
  success: boolean
  courses: Course[]
  count: number
}

export interface UseCoursesOptions {
  initialCourses?: Course[]
  initialSearchQuery?: string
  initialSortOrder?: SortOrder
  debounceDelay?: number
}

export interface UseCoursesReturn {
  // Data
  courses: Course[]
  filteredCourses: Course[]
  totalCount: number
  filteredCount: number

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  debouncedSearchQuery: string
  clearSearch: () => void

  // Sorting
  sortOrder: SortOrder
  setSortOrder: (order: SortOrder) => void
  toggleSortOrder: () => void

  // Loading/Error states
  isLoading: boolean
  error: string | null
  isValidating: boolean

  // Actions
  refetch: () => Promise<void>
  mutate: () => Promise<void>
}

// ============================================================================
// SWR Cache Key
// ============================================================================

export const COURSES_CACHE_KEY = '/api/courses'

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing courses with search, sort, and filter capabilities
 *
 * @param options - Configuration options
 * @param options.initialCourses - Initial courses data for SSR hydration
 * @param options.initialSearchQuery - Initial search query
 * @param options.initialSortOrder - Initial sort order ('newest' | 'oldest')
 * @param options.debounceDelay - Debounce delay for search in milliseconds (default: 300)
 * @returns Object containing courses data, search/sort controls, and loading state
 */
export function useCourses(options: UseCoursesOptions = {}): UseCoursesReturn {
  const {
    initialCourses = [],
    initialSearchQuery = '',
    initialSortOrder = 'newest',
    debounceDelay = 300,
  } = options

  // Local state for search and sort (not cached)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder)

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, debounceDelay)

  // SWR for data fetching with caching
  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<CoursesApiResponse>(
    COURSES_CACHE_KEY,
    {
      // Use initial data from server if provided
      fallbackData: initialCourses.length > 0
        ? { success: true, courses: initialCourses, count: initialCourses.length }
        : undefined,
      // Revalidate on mount if we have initial data
      revalidateOnMount: initialCourses.length === 0,
    }
  )

  // Extract courses from response with defensive coding
  const courses = useMemo(() => {
    try {
      const rawCourses = data?.courses || initialCourses
      // Ensure it's an array
      if (!Array.isArray(rawCourses)) {
        console.warn('[useCourses] courses is not an array:', rawCourses)
        return []
      }
      // Filter out any invalid course objects
      return rawCourses.filter(course => {
        if (!course || typeof course !== 'object') {
          console.warn('[useCourses] Invalid course object:', course)
          return false
        }
        if (!course.id) {
          console.warn('[useCourses] Course missing id:', course)
          return false
        }
        return true
      })
    } catch (error) {
      console.error('[useCourses] Error extracting courses:', error)
      return []
    }
  }, [data?.courses, initialCourses])

  // Sort courses with error handling
  const sortedCourses = useMemo(() => {
    try {
      return [...courses].sort((a, b) => {
        // Safely parse dates
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0

        // Handle invalid dates
        const validDateA = isNaN(dateA) ? 0 : dateA
        const validDateB = isNaN(dateB) ? 0 : dateB

        if (sortOrder === 'newest') {
          return validDateB - validDateA
        } else {
          return validDateA - validDateB
        }
      })
    } catch (error) {
      console.error('[useCourses] Error sorting courses:', error)
      return courses // Return unsorted if error
    }
  }, [courses, sortOrder])

  // Filter courses by search query with defensive coding
  const filteredCourses = useMemo(() => {
    try {
      if (!debouncedSearchQuery.trim()) {
        return sortedCourses
      }

      const query = debouncedSearchQuery.toLowerCase().trim()

      return sortedCourses.filter((course) => {
        try {
          // Search in title (with null check)
          const title = course.title || ''
          if (typeof title === 'string' && title.toLowerCase().includes(query)) {
            return true
          }

          // Optionally search in generated course content
          const generatedCourse = course.generated_course
          if (generatedCourse && typeof generatedCourse === 'object') {
            // Search in overview
            const overview = generatedCourse.overview
            if (typeof overview === 'string' && overview.toLowerCase().includes(query)) {
              return true
            }
            // Search in lessons and steps
            const lessons = Array.isArray(generatedCourse.lessons) ? generatedCourse.lessons : []
            if (lessons.some(lesson => {
              if (!lesson || typeof lesson !== 'object') return false
              const lessonTitle = lesson.title || ''
              if (typeof lessonTitle === 'string' && lessonTitle.toLowerCase().includes(query)) return true
              const steps = Array.isArray(lesson.steps) ? lesson.steps : []
              return steps.some(step => {
                if (!step || typeof step !== 'object') return false
                const content = step.content
                return typeof content === 'string' && content.toLowerCase().includes(query)
              })
            })) {
              return true
            }
          }

          return false
        } catch (filterError) {
          console.error('[useCourses] Error filtering course:', course?.id, filterError)
          return false // Skip this course on error
        }
      })
    } catch (error) {
      console.error('[useCourses] Error in filteredCourses:', error)
      return sortedCourses // Return unfiltered if error
    }
  }, [sortedCourses, debouncedSearchQuery])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
  }, [])

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Mutate function for cache invalidation
  const handleMutate = useCallback(async () => {
    await mutate()
  }, [mutate])

  // Convert SWR error to string
  const error = swrError ? (swrError.message || 'Failed to load courses') : null

  return {
    // Data
    courses: sortedCourses,
    filteredCourses,
    totalCount: courses.length,
    filteredCount: filteredCourses.length,

    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    clearSearch,

    // Sorting
    sortOrder,
    setSortOrder,
    toggleSortOrder,

    // Loading/Error states
    isLoading,
    error,
    isValidating,

    // Actions
    refetch,
    mutate: handleMutate,
  }
}

export default useCourses
