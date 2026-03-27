'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCourses } from '@/hooks'
import { type Course } from '@/types'
import CourseCard, { CourseCardSkeleton } from '@/components/course/CourseCard'
import CreateCourseModal from '@/components/course/CreateCourseModal'
import EditCourseModal from '@/components/course/EditCourseModal'
import BulkDeleteBar from '@/components/course/BulkDeleteBar'
import { Search, ArrowUpDown, ChevronLeft, Plus, CheckSquare } from 'lucide-react'

// Lazy load UploadModal
const UploadModal = dynamic(
  () => import('@/components/upload/UploadModal'),
  { ssr: false }
)

export default function CoursesPage() {
  const t = useTranslations('courses')
  const tDash = useTranslations('dashboard')
  const {
    filteredCourses,
    totalCount,
    filteredCount,
    searchQuery,
    setSearchQuery,
    sortOrder,
    toggleSortOrder,
    isLoading,
    error,
    mutate,
  } = useCourses()

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [uploadForCourse, setUploadForCourse] = useState<{ id: string; title: string } | null>(null)

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const visibleCourses = filteredCourses.filter(c => !deletedIds.has(c.id))

  const handleDelete = (courseId: string) => {
    setDeletedIds(prev => new Set(prev).add(courseId))
    mutate()
  }

  const handleEdit = useCallback((course: Course) => {
    setEditCourse(course)
  }, [])

  const handleEditUpdated = useCallback(() => {
    mutate()
  }, [mutate])

  const handleOpenUploadForCreate = useCallback(() => {
    setShowUploadModal(true)
  }, [])

  const handleOpenUploadForCourse = useCallback((courseId: string, courseTitle: string) => {
    setUploadForCourse({ id: courseId, title: courseTitle })
  }, [])

  // Selection handlers
  const handleToggleSelect = useCallback((courseId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(visibleCourses.map(c => c.id)))
  }, [visibleCourses])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkDeleteComplete = useCallback((ids: string[]) => {
    setDeletedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
    setSelectedIds(new Set())
    setSelectionMode(false)
    mutate()
  }, [mutate])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        setSelectedIds(new Set())
      }
      return !prev
    })
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('errorTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('errorDesc')}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          {t('backToDashboard')}
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {t('pageTitle')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('pageSubtitle', { count: totalCount })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Select Toggle */}
          {visibleCourses.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectionMode
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{selectionMode ? t('cancelSelect') : t('select')}</span>
            </button>
          )}
          {/* Create Course Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('createCourse')}</span>
          </button>
        </div>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tDash('searchCourses')}
            className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort Toggle */}
        <button
          onClick={toggleSortOrder}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortOrder === 'newest' ? tDash('sortNewest') : tDash('sortOldest')}
        </button>
      </div>

      {/* Search Results Count */}
      {searchQuery && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('searchResults', { count: filteredCount, query: searchQuery })}
        </p>
      )}

      {/* Course Grid */}
      {visibleCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onDelete={handleDelete}
              onEdit={handleEdit}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(course.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('noSearchResults')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('noSearchResultsDesc')}
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-violet-600 dark:text-violet-400 font-medium underline hover:underline"
          >
            {t('clearSearch')}
          </button>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {tDash('noCourses')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {tDash('noCoursesDescription')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('createCourse')}
          </button>
        </div>
      )}

      {/* Bulk Delete Bar */}
      {selectionMode && (
        <BulkDeleteBar
          selectedIds={selectedIds}
          totalCount={visibleCourses.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDeleteComplete={handleBulkDeleteComplete}
        />
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOpenUpload={handleOpenUploadForCreate}
      />

      {/* Edit Course Modal */}
      <EditCourseModal
        isOpen={!!editCourse}
        onClose={() => setEditCourse(null)}
        course={editCourse}
        onUpdated={handleEditUpdated}
        onOpenUpload={handleOpenUploadForCourse}
      />

      {/* Upload Modal (for new AI course) */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Upload Modal (for adding material to existing course) */}
      {uploadForCourse && (
        <UploadModal
          isOpen={!!uploadForCourse}
          onClose={() => setUploadForCourse(null)}
          mode="addToCourse"
          courseId={uploadForCourse.id}
          courseTitle={uploadForCourse.title}
          onMaterialAdded={() => {
            setUploadForCourse(null)
            mutate()
          }}
        />
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2 skeleton-shimmer-item" />
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6 skeleton-shimmer-item" />

      <div className="flex gap-3 mb-6">
        <div className="flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton-shimmer-item" />
        <div className="w-28 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton-shimmer-item" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
