'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { Course } from '@/types'
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

  // Extract courses from response
  const courses = useMemo(() => {
    return data?.courses || initialCourses
  }, [data?.courses, initialCourses])

  // Sort courses
  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()

      if (sortOrder === 'newest') {
        return dateB - dateA
      } else {
        return dateA - dateB
      }
    })
  }, [courses, sortOrder])

  // Filter courses by search query
  const filteredCourses = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return sortedCourses
    }

    const query = debouncedSearchQuery.toLowerCase().trim()

    return sortedCourses.filter((course) => {
      // Search in title
      if (course.title.toLowerCase().includes(query)) {
        return true
      }

      // Optionally search in generated course content
      const generatedCourse = course.generated_course
      if (generatedCourse) {
        // Search in overview
        if (generatedCourse.overview?.toLowerCase().includes(query)) {
          return true
        }
        // Search in lessons and steps
        if (generatedCourse.lessons?.some(lesson =>
          lesson.title?.toLowerCase().includes(query) ||
          lesson.steps?.some(step =>
            step.content?.toLowerCase().includes(query)
          )
        )) {
          return true
        }
      }

      return false
    })
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
