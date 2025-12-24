'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Button from '@/components/ui/Button'
import CourseCard from '@/components/course/CourseCard'
import { DashboardWidget } from '@/components/srs'
import { LazySection, SRSWidgetSkeleton } from '@/components/ui/LazySection'

// Lazy load UploadModal - only loaded when user opens it
const UploadModal = dynamic(
  () => import('@/components/upload/UploadModal'),
  { ssr: false }
)
import { Course } from '@/types'
import { useCourses } from '@/hooks'
import { useToast } from '@/contexts/ToastContext'

interface DashboardContentProps {
  initialCourses: Course[]
}

export default function DashboardContent({ initialCourses }: DashboardContentProps) {
  const router = useRouter()
  const { error: showError, success: showSuccess } = useToast()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isGeneratingCovers, setIsGeneratingCovers] = useState(false)

  // Check if any courses are missing covers
  const coursesWithoutCovers = initialCourses.filter(c => !c.cover_image_url).length

  // Generate covers for all courses without them
  const handleGenerateCovers = async () => {
    setIsGeneratingCovers(true)
    try {
      const response = await fetch('/api/generate-all-covers', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        showSuccess(`Generated ${data.updated} cover images!`)
        router.refresh()
      } else {
        showError(data.error || 'Failed to generate covers')
      }
    } catch {
      showError('Failed to generate covers')
    } finally {
      setIsGeneratingCovers(false)
    }
  }

  const {
    filteredCourses,
    totalCount,
    filteredCount,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    clearSearch,
    sortOrder,
    toggleSortOrder,
    isLoading,
    error,
    refetch,
  } = useCourses({
    initialCourses,
    debounceDelay: 300,
  })

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
  }

  const handleRefresh = async () => {
    router.refresh()
    try {
      await refetch()
    } catch {
      showError('Failed to refresh courses')
    }
  }

  // Show toast when error occurs
  useEffect(() => {
    if (error) {
      showError(error)
    }
  }, [error, showError])

  const isSearching = searchQuery.trim().length > 0
  const hasNoResults = isSearching && filteredCount === 0
  const hasNoCourses = totalCount === 0

  return (
    <>
      <div className="container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Your Study Courses
              </h1>
              {totalCount > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isSearching
                    ? `${filteredCount} of ${totalCount} courses`
                    : `${totalCount} course${totalCount !== 1 ? 's' : ''}`
                  }
                </p>
              )}
            </div>
            {/* Desktop upload button */}
            <Button
              size="lg"
              onClick={handleOpenUploadModal}
              className="hidden sm:inline-flex"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload Notebook Page
            </Button>
          </div>
        </div>

        {/* Generate Covers Banner - show if courses are missing covers */}
        {coursesWithoutCovers > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  {coursesWithoutCovers} course{coursesWithoutCovers !== 1 ? 's' : ''} missing cover images
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Generate beautiful cover images for your courses
                </p>
              </div>
              <button
                onClick={handleGenerateCovers}
                disabled={isGeneratingCovers}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isGeneratingCovers ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Generate Covers
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SRS Review Widget - Lazy loaded */}
        <LazySection
          skeleton={<SRSWidgetSkeleton />}
          minHeight={150}
          rootMargin="150px"
        >
          <DashboardWidget />
        </LazySection>

        {/* Search and Sort Bar - only show if there are courses */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            {/* Search Input - full width on mobile */}
            <div className="relative flex-1 sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                inputMode="search"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-base"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:text-gray-700 min-w-[44px] justify-center"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort and Refresh Controls */}
            <div className="flex items-center gap-2">
              {/* Sort Toggle */}
              <button
                onClick={toggleSortOrder}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-500 transition-colors text-sm font-medium min-h-[44px]"
                title={`Currently showing ${sortOrder === 'newest' ? 'newest first' : 'oldest first'}`}
              >
                <svg
                  className={`w-5 h-5 sm:w-4 sm:h-4 transition-transform ${sortOrder === 'oldest' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                </span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-500 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px]"
                aria-label="Refresh courses"
              >
                <svg
                  className={`w-5 h-5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Debounce Indicator */}
        {searchQuery && searchQuery !== debouncedSearchQuery && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Searching...
          </div>
        )}

        {/* Courses Grid or Empty State */}
        {isLoading && filteredCourses.length === 0 ? (
          /* Skeleton loading state for courses */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
              >
                <div className="relative aspect-square w-full bg-gray-200 dark:bg-gray-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent skeleton-shimmer" />
                </div>
                <div className="p-4">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item w-4/5 mb-2" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                </div>
              </div>
            ))}
          </div>
        ) : hasNoCourses ? (
          <EmptyState onUploadClick={handleOpenUploadModal} />
        ) : hasNoResults ? (
          <NoSearchResults query={debouncedSearchQuery} onClear={clearSearch} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <button
        onClick={handleOpenUploadModal}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
        aria-label="Upload notebook page"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseUploadModal}
      />
    </>
  )
}

// ============================================================================
// Empty States
// ============================================================================

interface EmptyStateProps {
  onUploadClick: () => void
}

function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 sm:mb-6">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 dark:text-indigo-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
        No courses yet
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm sm:max-w-md text-sm sm:text-base">
        Upload your first notebook page to get started. Our AI will transform your notes into an interactive study course.
      </p>
      <Button size="lg" onClick={onUploadClick} className="w-full sm:w-auto">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Upload Your First Notebook Page
      </Button>
    </div>
  )
}

interface NoSearchResultsProps {
  query: string
  onClear: () => void
}

function NoSearchResults({ query, onClear }: NoSearchResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 sm:mb-6">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
        No courses found
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-2 text-sm sm:text-base">
        No courses match your search
      </p>
      <p className="text-gray-500 dark:text-gray-500 text-sm mb-6 font-medium text-center break-all max-w-xs">
        &ldquo;{query}&rdquo;
      </p>
      <Button variant="secondary" onClick={onClear} className="w-full sm:w-auto min-h-[44px]">
        Clear search
      </Button>
    </div>
  )
}

