'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { mutate } from 'swr'
import { useUserSubjects } from '@/hooks/useUserSubjects'
import { PAST_EXAMS_CACHE_KEY } from '@/hooks/usePastExamTemplates'
import { createLogger } from '@/lib/logger'

const log = createLogger('component:PastExamUploadModal')

// =============================================================================
// Types
// =============================================================================

export interface PastExamUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: (templateId: string) => void
  defaultSubjectId?: string
}

// =============================================================================
// Icons
// =============================================================================

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function PastExamUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  defaultSubjectId,
}: PastExamUploadModalProps) {
  const t = useTranslations('pastExams')
  const { subjects, isLoading: loadingSubjects } = useUserSubjects()

  // Form state
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Validate and apply defaultSubjectId when subjects load or modal opens
  useEffect(() => {
    if (isOpen && defaultSubjectId && subjects.length > 0) {
      const isValid = subjects.some(s => s.id === defaultSubjectId)
      if (isValid) {
        setSubjectId(defaultSubjectId)
      }
    }
  }, [isOpen, defaultSubjectId, subjects])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Reset form when closing
  const resetForm = useCallback(() => {
    setFile(null)
    setTitle('')
    setDescription('')
    setSubjectId('')
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (isUploading) return
    resetForm()
    onClose()
  }, [isUploading, resetForm, onClose])

  // Click outside to close
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      handleClose()
    }
  }, [handleClose])

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''))
    }
  }, [title])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
    }
  }

  // Upload handler — self-contained
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError(t('errors.noFile'))
      return
    }

    if (!subjectId) {
      setError(t('errors.noSubject'))
      return
    }

    setIsUploading(true)
    try {
      // 1. Upload the file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || file.name)
      formData.append('subjectId', subjectId)
      if (description) formData.append('description', description)

      const response = await fetch('/api/past-exams', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('errors.uploadFailed'))
      }

      const templateId = data.template?.id as string | undefined

      // 2. Mutate SWR caches so lists refresh
      await mutate(PAST_EXAMS_CACHE_KEY)
      if (subjectId) {
        await mutate(`${PAST_EXAMS_CACHE_KEY}?subjectId=${encodeURIComponent(subjectId)}`)
      }

      // 3. Auto-trigger analysis (fire-and-forget)
      if (templateId) {
        fetch(`/api/past-exams/${templateId}/analyze`, { method: 'POST' }).catch(err => {
          log.error({ detail: err }, 'Auto-analyze fire-and-forget failed')
        })
      }

      // 4. Notify parent
      if (templateId && onUploadComplete) {
        onUploadComplete(templateId)
      }

      // 5. Close and reset
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="past-exam-upload-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isUploading}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <h2
          id="past-exam-upload-title"
          className="text-xl font-semibold text-gray-900 dark:text-white mb-4 pr-8"
        >
          {t('uploadModal.title')}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Error alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Subject Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('uploadModal.subjectLabel')}
            </label>
            {loadingSubjects ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                <SpinnerIcon className="w-4 h-4" />
                {t('loading')}
              </div>
            ) : (
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required
              >
                <option value="">{t('uploadModal.selectSubject')}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-violet-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.pptx,.ppt,.docx,.doc"
              onChange={handleFileChange}
            />

            {file ? (
              <div className="flex items-center justify-center gap-2">
                <DocumentIcon className="w-8 h-8 text-violet-600" />
                <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
              </div>
            ) : (
              <>
                <DocumentIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">{t('uploadModal.dragDrop')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('uploadModal.fileTypes')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('uploadModal.maxSize')}</p>
              </>
            )}
          </div>

          {/* Title Input */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('uploadModal.titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('uploadModal.titlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Description Input */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('uploadModal.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('uploadModal.descriptionPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {t('uploadModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={!file || !subjectId || isUploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg transition-colors"
            >
              {isUploading ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  {t('uploadModal.uploading')}
                </>
              ) : (
                t('uploadModal.upload')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
