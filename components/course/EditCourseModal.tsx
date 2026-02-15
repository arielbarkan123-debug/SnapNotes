'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/contexts/ToastContext'
import { sanitizeError } from '@/lib/utils/error-sanitizer'
import { type Course, type GeneratedCourse } from '@/types'
import Button from '@/components/ui/Button'
import { Pencil, Trash2, Plus, X } from 'lucide-react'

interface EditCourseModalProps {
  isOpen: boolean
  onClose: () => void
  course: Course | null
  onUpdated: () => void
  onOpenUpload: (courseId: string, courseTitle: string) => void
}

export default function EditCourseModal({ isOpen, onClose, course, onUpdated, onOpenUpload }: EditCourseModalProps) {
  const t = useTranslations('courses.edit')
  const tc = useTranslations('common.buttons')
  const { success, error: showError } = useToast()
  const dialogRef = useRef<HTMLDivElement>(null)

  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null)

  // Sync title from course when modal opens
  useEffect(() => {
    if (isOpen && course) {
      setTitle(course.title)
      setConfirmRemoveIndex(null)
      setRemovingIndex(null)
    }
  }, [isOpen, course])

  // Focus trap
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving && removingIndex === null) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isSaving, removingIndex])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  const handleSaveTitle = useCallback(async () => {
    if (!course || !title.trim() || title.trim() === course.title) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/courses/${course.id}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to rename')
      success(t('saved'))
      onUpdated()
    } catch (err) {
      showError(sanitizeError(err, 'Failed to rename course'))
    } finally {
      setIsSaving(false)
    }
  }, [course, title, success, showError, t, onUpdated])

  const handleRemoveLesson = useCallback(async (index: number) => {
    if (!course) return
    setRemovingIndex(index)
    try {
      const res = await fetch(`/api/courses/${course.id}/lessons/${index}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to remove lesson')
      success(t('lessonRemoved'))
      setConfirmRemoveIndex(null)
      onUpdated()
    } catch (err) {
      showError(sanitizeError(err, 'Failed to remove lesson'))
    } finally {
      setRemovingIndex(null)
    }
  }, [course, success, showError, t, onUpdated])

  const handleAddMaterial = useCallback(() => {
    if (!course) return
    onClose()
    onOpenUpload(course.id, course.title)
  }, [course, onClose, onOpenUpload])

  if (!isOpen || !course) return null

  const generatedCourse = course.generated_course as GeneratedCourse | null
  const lessons = generatedCourse?.lessons || []
  const titleChanged = title.trim() !== course.title && title.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={isSaving || removingIndex !== null ? undefined : onClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-course-title"
        className="relative w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 id="edit-course-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('title')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title Rename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('renameLabel')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && titleChanged) handleSaveTitle()
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveTitle}
                disabled={!titleChanged || isSaving}
                isLoading={isSaving}
                loadingText={t('saving')}
                className="shrink-0"
              >
                <Pencil className="w-4 h-4 me-1" />
                {t('save')}
              </Button>
            </div>
          </div>

          {/* Lessons List */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('lessons')} ({lessons.length})
            </h4>
            {lessons.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {t('noLessons')}
              </p>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {lesson.title || `Lesson ${index + 1}`}
                      </span>
                    </div>
                    {confirmRemoveIndex === index ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleRemoveLesson(index)}
                          disabled={removingIndex !== null}
                          className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                        >
                          {removingIndex === index ? '...' : t('removeLesson')}
                        </button>
                        <button
                          onClick={() => setConfirmRemoveIndex(null)}
                          disabled={removingIndex !== null}
                          className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                        >
                          {tc('cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveIndex(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shrink-0"
                        aria-label={t('removeLesson')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleAddMaterial} className="w-full">
            <Plus className="w-4 h-4 me-1.5" />
            {t('addMaterial')}
          </Button>
        </div>
      </div>
    </div>
  )
}
