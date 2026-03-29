'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useToast } from '@/contexts/ToastContext'
import { sanitizeError } from '@/lib/utils/error-sanitizer'
import Button from '@/components/ui/Button'
import { PastExamNudgeBanner, PastExamUploadModal } from '@/components/past-exams'

interface CreateCourseModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenUpload: () => void
}

type Tab = 'ai' | 'manual'

export default function CreateCourseModal({ isOpen, onClose, onOpenUpload }: CreateCourseModalProps) {
  const router = useRouter()
  const t = useTranslations('courses.createModal')
  const tc = useTranslations('common.buttons')
  const { error: showError } = useToast()
  const dialogRef = useRef<HTMLDivElement>(null)

  const [tab, setTab] = useState<Tab>('ai')
  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showPastExamUpload, setShowPastExamUpload] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTab('ai')
      setTitle('')
      setIsCreating(false)
    }
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isCreating) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isCreating])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  const handleAIUpload = useCallback(() => {
    onClose()
    onOpenUpload()
  }, [onClose, onOpenUpload])

  const handleManualCreate = async () => {
    if (!title.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/courses/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create course')
      onClose()
      router.push(`/course/${data.courseId}`)
    } catch (err) {
      showError(sanitizeError(err, 'Failed to create course'))
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={isCreating ? undefined : onClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-course-title"
        className="relative w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-6 pb-0">
          <h3 id="create-course-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('title')}
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => setTab('ai')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              tab === 'ai'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('tabAI')}
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              tab === 'manual'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('tabManual')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {tab === 'ai' ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('aiDesc')}
              </p>
              <Button variant="primary" onClick={handleAIUpload} className="w-full mb-4">
                {t('tabAI')}
              </Button>
              <PastExamNudgeBanner
                variant="compact"
                onUploadClick={() => setShowPastExamUpload(true)}
              />
              <PastExamUploadModal
                isOpen={showPastExamUpload}
                onClose={() => setShowPastExamUpload(false)}
              />
            </div>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('manualDesc')}
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('titleLabel')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                maxLength={200}
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim()) handleManualCreate()
                }}
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <Button variant="secondary" onClick={onClose} disabled={isCreating} className="flex-1">
                  {tc('cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleManualCreate}
                  disabled={!title.trim() || isCreating}
                  isLoading={isCreating}
                  loadingText={t('creating')}
                  className="flex-1"
                >
                  {t('create')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
