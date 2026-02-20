'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePastExamTemplates, PAST_EXAMS_CACHE_KEY } from '@/hooks'
import { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { PastExamTemplate, AnalysisStatus } from '@/types/past-exam'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { ToastContainer, type Toast } from '@/components/ui/Toast'

// =============================================================================
// Types
// =============================================================================

interface UserSubject {
  id: string
  label: string
}

// =============================================================================
// Icons
// =============================================================================

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Convert subject ID to display label */
function formatSubjectLabel(subjectId: string): string {
  // Convert "biology-hl" to "Biology HL", "math-5" to "Math 5"
  return subjectId
    .split('-')
    .map((part, i) => {
      if (i === 0) {
        return part.charAt(0).toUpperCase() + part.slice(1)
      }
      // Keep HL/SL uppercase, numbers as-is
      if (part.match(/^(hl|sl)$/i)) return part.toUpperCase()
      return part
    })
    .join(' ')
}

// =============================================================================
// Components
// =============================================================================

function StatusBadge({ status, t }: { status: AnalysisStatus; t: ReturnType<typeof useTranslations<'pastExams'>> }) {
  const config = {
    pending: { icon: ClockIcon, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: t('statusPending') },
    analyzing: { icon: SpinnerIcon, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: t('statusAnalyzing') },
    completed: { icon: CheckCircleIcon, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: t('statusCompleted') },
    failed: { icon: XCircleIcon, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: t('statusFailed') },
  }

  const { icon: Icon, color, label } = config[status]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  )
}

function TemplateCard({
  template,
  t,
  onDelete,
  onAnalyze,
  isDeleting,
  isAnalyzing,
}: {
  template: PastExamTemplate
  t: ReturnType<typeof useTranslations<'pastExams'>>
  onDelete: (id: string) => void
  onAnalyze: (id: string) => void
  isDeleting: boolean
  isAnalyzing: boolean
}) {
  const analysis = template.extracted_analysis

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 p-5 shadow-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex-shrink-0">
            <DocumentIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">{template.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{template.original_filename}</p>
          </div>
        </div>
        <StatusBadge status={template.analysis_status} t={t} />
      </div>

      {/* Subject Badge */}
      {template.subject_id && (
        <div className="mb-3">
          <span className="inline-flex px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
            {formatSubjectLabel(template.subject_id)}
          </span>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && template.analysis_status === 'completed' && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('questionsFound', { count: analysis.total_questions })}</span>
            <span className="text-gray-600 dark:text-gray-400">{t('totalPoints', { points: analysis.total_points })}</span>
          </div>

          {/* Question Types */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(analysis.question_types).map(([type, data]) => (
              <span
                key={type}
                className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs"
              >
                {type.replace('_', ' ')}: {data.percentage}%
              </span>
            ))}
          </div>

          {/* Difficulty Distribution */}
          <div className="flex gap-2 text-xs">
            <span className="text-green-600 dark:text-green-400">{t('easy')}: {analysis.difficulty_distribution.easy}%</span>
            <span className="text-yellow-600 dark:text-yellow-400">{t('medium')}: {analysis.difficulty_distribution.medium}%</span>
            <span className="text-red-600 dark:text-red-400">{t('hard')}: {analysis.difficulty_distribution.hard}%</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {template.analysis_status === 'failed' && template.analysis_error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{template.analysis_error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {(template.analysis_status === 'pending' || template.analysis_status === 'failed') && (
          <button
            onClick={() => onAnalyze(template.id)}
            disabled={isAnalyzing}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isAnalyzing ? (
              <>
                <SpinnerIcon className="w-4 h-4" />
                {t('statusAnalyzing')}
              </>
            ) : (
              <>
                <RefreshIcon className="w-4 h-4" />
                {template.analysis_status === 'failed' ? t('retryAnalysis') : t('analyze')}
              </>
            )}
          </button>
        )}

        <button
          onClick={() => onDelete(template.id)}
          disabled={isDeleting}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isDeleting ? <SpinnerIcon className="w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
          {t('deleteTemplate')}
        </button>
      </div>
    </div>
  )
}

function SubjectTabs({
  subjects,
  selectedSubject,
  onSelect,
  templateCounts,
  limit,
}: {
  subjects: UserSubject[]
  selectedSubject: string | null
  onSelect: (subjectId: string | null) => void
  templateCounts: Record<string, number>
  limit: number
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedSubject === null
            ? 'bg-violet-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        All
      </button>
      {subjects.map((subject) => {
        const count = templateCounts[subject.id] || 0
        return (
          <button
            key={subject.id}
            onClick={() => onSelect(subject.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedSubject === subject.id
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {subject.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selectedSubject === subject.id
                ? 'bg-violet-500 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
            }`}>
              {count}/{limit}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function UploadModal({
  isOpen,
  onClose,
  onUpload,
  subjects,
  selectedSubject,
  t,
}: {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File, title: string, description: string, subjectId: string) => Promise<void>
  subjects: UserSubject[]
  selectedSubject: string | null
  t: ReturnType<typeof useTranslations<'pastExams'>>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState(selectedSubject || '')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update subject when modal opens with a selected subject
  useEffect(() => {
    if (isOpen && selectedSubject) {
      setSubjectId(selectedSubject)
    }
  }, [isOpen, selectedSubject])

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
      await onUpload(file, title || file.name, description, subjectId)
      onClose()
      setFile(null)
      setTitle('')
      setDescription('')
      setSubjectId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setFile(null)
    setTitle('')
    setDescription('')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('uploadModal.title')}
        </h2>

        <form onSubmit={handleSubmit}>
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
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

// =============================================================================
// Main Page Component
// =============================================================================

export default function PastExamsPage() {
  const t = useTranslations('pastExams')
  const supabase = createClient()

  // User subjects state
  const [userSubjects, setUserSubjects] = useState<UserSubject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  // Template counts per subject
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({})

  // Fetch templates (filtered by selected subject)
  const { templates, count: _count, limit, canUpload, isLoading, error } = usePastExamTemplates(
    selectedSubject || undefined
  )

  // UI state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Load user subjects
  useEffect(() => {
    async function loadSubjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('user_learning_profile')
          .select('subjects')
          .eq('user_id', user.id)
          .single()

        const subjectIds = (profile?.subjects || []) as string[]
        const subjects: UserSubject[] = subjectIds.map(id => ({
          id,
          label: formatSubjectLabel(id),
        }))

        setUserSubjects(subjects)
      } catch (err) {
        console.error('Failed to load subjects:', err)
      } finally {
        setLoadingSubjects(false)
      }
    }

    loadSubjects()
  }, [supabase])

  // Load template counts per subject
  useEffect(() => {
    async function loadCounts() {
      if (userSubjects.length === 0) return

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get all templates and count by subject
        const { data: allTemplates } = await supabase
          .from('past_exam_templates')
          .select('subject_id')
          .eq('user_id', user.id)

        if (allTemplates) {
          const counts: Record<string, number> = {}
          allTemplates.forEach(t => {
            if (t.subject_id) {
              counts[t.subject_id] = (counts[t.subject_id] || 0) + 1
            }
          })
          setTemplateCounts(counts)
        }
      } catch (err) {
        console.error('Failed to load counts:', err)
      }
    }

    loadCounts()
  }, [supabase, userSubjects, templates])

  // Toast helpers
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleUpload = async (file: File, title: string, description: string, subjectId: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
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

    // Refresh the list (all templates and filtered)
    await mutate(PAST_EXAMS_CACHE_KEY)
    if (selectedSubject) {
      await mutate(`${PAST_EXAMS_CACHE_KEY}?subjectId=${encodeURIComponent(selectedSubject)}`)
    }

    // Update counts
    setTemplateCounts(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || 0) + 1,
    }))

    addToast('success', t('uploadSuccess'))

    // Start analysis automatically
    if (data.template?.id) {
      handleAnalyze(data.template.id)
    }
  }

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return

    const id = confirmDeleteId
    const templateToDelete = templates.find(t => t.id === id)
    setConfirmDeleteId(null)
    setDeletingId(id)

    try {
      const response = await fetch(`/api/past-exams/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t('errors.deleteFailed'))
      }

      await mutate(PAST_EXAMS_CACHE_KEY)
      if (selectedSubject) {
        await mutate(`${PAST_EXAMS_CACHE_KEY}?subjectId=${encodeURIComponent(selectedSubject)}`)
      }

      // Update counts
      if (templateToDelete?.subject_id) {
        setTemplateCounts(prev => ({
          ...prev,
          [templateToDelete.subject_id!]: Math.max(0, (prev[templateToDelete.subject_id!] || 0) - 1),
        }))
      }

      addToast('success', t('deleteSuccess'))
    } catch (err) {
      console.error('Delete error:', err)
      addToast('error', t('errors.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id)
    try {
      const response = await fetch(`/api/past-exams/${id}/analyze`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errors.analysisFailed'))
      }

      await mutate(PAST_EXAMS_CACHE_KEY)
      if (selectedSubject) {
        await mutate(`${PAST_EXAMS_CACHE_KEY}?subjectId=${encodeURIComponent(selectedSubject)}`)
      }
    } catch (err) {
      console.error('Analysis error:', err)
      await mutate(PAST_EXAMS_CACHE_KEY)
    } finally {
      setAnalyzingId(null)
    }
  }

  const pageLoading = loadingSubjects || isLoading

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>{t('backToSettings')}</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              disabled={!canUpload || userSubjects.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              {t('uploadButton')}
            </button>
          </div>

          {/* Per-subject limit info */}
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t('perSubjectLimit', { limit })}
          </div>
        </div>

        {/* Subject Tabs */}
        {!loadingSubjects && userSubjects.length > 0 && (
          <SubjectTabs
            subjects={userSubjects}
            selectedSubject={selectedSubject}
            onSelect={setSelectedSubject}
            templateCounts={templateCounts}
            limit={limit}
          />
        )}

        {/* No subjects warning */}
        {!loadingSubjects && userSubjects.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              {t('noSubjectsWarning')}{' '}
              <Link href="/settings" className="underline hover:no-underline">
                {t('goToSettings')}
              </Link>
            </p>
          </div>
        )}

        {/* Loading State */}
        {pageLoading && (
          <div className="flex items-center justify-center py-12">
            <SpinnerIcon className="w-8 h-8 text-violet-600" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!pageLoading && !error && templates.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700">
            <DocumentIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {selectedSubject ? t('noTemplatesForSubject') : t('noTemplates')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {t('noTemplatesDescription')}
            </p>
            {userSubjects.length > 0 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                {t('uploadFirst')}
              </button>
            )}
          </div>
        )}

        {/* Templates Grid */}
        {!pageLoading && !error && templates.length > 0 && (
          <div className="space-y-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                t={t}
                onDelete={handleDeleteClick}
                onAnalyze={handleAnalyze}
                isDeleting={deletingId === template.id}
                isAnalyzing={analyzingId === template.id}
              />
            ))}
          </div>
        )}

        {/* Upload Modal */}
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          subjects={userSubjects}
          selectedSubject={selectedSubject}
          t={t}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={confirmDeleteId !== null}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title={t('deleteConfirm.title')}
          message={t('deleteConfirm.message')}
          confirmText={t('deleteConfirm.confirm')}
          cancelText={t('deleteConfirm.cancel')}
          variant="danger"
        />

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </div>
  )
}
