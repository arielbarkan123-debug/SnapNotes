'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Course } from '@/types'
import { useDebounce } from './useDebounce'

// ============================================================================
// Types
// ============================================================================

export type SortOrder = 'newest' | 'oldest'

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

  // Actions
  refetch: () => Promise<void>
}

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

  // State
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, debounceDelay)

  // Fetch courses from API
  const fetchCourses = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/courses')

      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.courses)) {
        setCourses(data.courses)
      } else {
        throw new Error(data.error || 'Invalid response')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update courses when initialCourses changes (from server)
  useEffect(() => {
    if (initialCourses.length > 0) {
      setCourses(initialCourses)
    }
  }, [initialCourses])

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

    // Actions
    refetch: fetchCourses,
  }
}

export default useCourses
