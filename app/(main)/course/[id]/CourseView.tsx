'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Course, GeneratedCourse } from '@/types'
import CourseContent from './CourseContent'
import OriginalImageModal from '@/components/course/OriginalImageModal'
import DeleteConfirmModal from '@/components/course/DeleteConfirmModal'
import { useToast } from '@/contexts/ToastContext'

interface CourseViewProps {
  course: Course
}

export default function CourseView({ course }: CourseViewProps) {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const generatedCourse = course.generated_course as GeneratedCourse

  // State
  const [title, setTitle] = useState(course.title)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const titleInputRef = useRef<HTMLInputElement>(null)
  const originalTitle = useRef(course.title)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Save title
  const handleSaveTitle = useCallback(async () => {
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setTitle(originalTitle.current)
      setIsEditingTitle(false)
      return
    }

    if (trimmedTitle === originalTitle.current) {
      setIsEditingTitle(false)
      return
    }

    setIsSavingTitle(true)
    setError('')

    try {
      const response = await fetch(`/api/course/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update title')
      }

      originalTitle.current = trimmedTitle
      setIsEditingTitle(false)
      showSuccess('Title updated successfully')
      router.refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save'
      setError(errorMessage)
      showError(errorMessage)
      setTitle(originalTitle.current)
    } finally {
      setIsSavingTitle(false)
    }
  }, [title, course.id, router, showSuccess, showError])

  // Handle title key press
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setTitle(originalTitle.current)
      setIsEditingTitle(false)
    }
  }, [handleSaveTitle])

  // Delete course
  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/course/${course.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete course')
      }

      showSuccess('Course deleted successfully')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete'
      setError(errorMessage)
      showError(errorMessage)
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }, [course.id, router, showSuccess, showError])

  return (
    <>
      {/* Mobile Sticky Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[44px] min-w-[44px] -ml-2 pl-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-1">
            {course.original_image_url && (
              <button
                onClick={() => setIsImageModalOpen(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="View original image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Delete course"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-6xl">
        {/* Desktop Breadcrumb - hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link
            href="/dashboard"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white truncate max-w-xs">
            {title}
          </span>
        </nav>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Course Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            {/* Editable Title */}
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="relative">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={handleTitleKeyDown}
                    disabled={isSavingTitle}
                    className="w-full text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-indigo-500 outline-none pb-1 pr-8"
                    maxLength={200}
                  />
                  {isSavingTitle && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2">
                      <svg
                        className="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-left group w-full"
                  title="Click to edit title"
                >
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-active:text-indigo-700 transition-colors break-words">
                    {title}
                    <svg
                      className="inline-block w-4 h-4 sm:w-5 sm:h-5 ml-2 opacity-50 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </h1>
                </button>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Created {new Date(course.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Desktop Action Buttons - hidden on mobile */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              {course.original_image_url && (
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 text-gray-700 dark:text-gray-300 transition-colors min-h-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>View Original</span>
                </button>
              )}
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 text-red-600 dark:text-red-400 transition-colors min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Grid - single column on mobile, sidebar after content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Main Content - Article Style */}
          <article className="lg:col-span-3 space-y-6 sm:space-y-8 order-2 lg:order-1">
            {/* Overview */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Overview
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {generatedCourse.overview}
                </p>
              </div>
            </section>

            {/* Key Concepts */}
            {generatedCourse.keyConcepts && generatedCourse.keyConcepts.length > 0 && (
              <section>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </span>
                  Key Concepts
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {generatedCourse.keyConcepts.map((concept, index) => (
                      <span
                        key={index}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium border border-indigo-100 dark:border-indigo-800"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Course Sections */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </span>
                Course Content
              </h2>
              <CourseContent sections={generatedCourse.sections} />
            </section>

            {/* Connections */}
            {generatedCourse.connections && (
              <section>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </span>
                  How It All Connects
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                  <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {generatedCourse.connections}
                  </p>
                </div>
              </section>
            )}

            {/* Summary */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Summary
              </h2>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 sm:p-6 border border-amber-100 dark:border-amber-800">
                <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {generatedCourse.summary}
                </p>
              </div>
            </section>
          </article>

          {/* Sidebar - shows first on mobile for original image preview */}
          <aside className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* Original Image Preview */}
            {course.original_image_url && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 dark:border-gray-700 lg:sticky lg:top-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 uppercase tracking-wide">
                  Original Notes
                </h3>
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="relative w-full aspect-[4/3] sm:aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 group"
                >
                  <Image
                    src={course.original_image_url}
                    alt="Original notebook page"
                    fill
                    className="object-cover group-hover:scale-105 group-active:scale-100 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-active:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-900 dark:text-white">
                      View Full Size
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Further Study */}
            {generatedCourse.furtherStudy && generatedCourse.furtherStudy.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 uppercase tracking-wide">
                  Further Study
                </h3>
                <ul className="space-y-2 sm:space-y-3">
                  {generatedCourse.furtherStudy.map((topic, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-sm"
                    >
                      <span className="text-indigo-500 mt-0.5 flex-shrink-0">→</span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Actions - hidden on mobile (actions are in sticky header) */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
                Actions
              </h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 transition-colors text-gray-700 dark:text-gray-300 text-sm min-h-[44px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back to Dashboard</span>
                </Link>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 transition-colors text-gray-700 dark:text-gray-300 text-sm min-h-[44px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span>Back to Top</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Modals */}
      <OriginalImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={course.original_image_url || ''}
        title="Original Notebook Page"
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        courseTitle={title}
      />
    </>
  )
}
