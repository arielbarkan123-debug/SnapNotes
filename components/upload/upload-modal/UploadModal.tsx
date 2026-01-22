'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { ErrorCodes } from '@/lib/api/errors'
import { useFunnelTracking } from '@/lib/analytics'
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateFile as validateDirectUpload,
  type FileType as DirectUploadFileType,
  uploadImagesToStorage,
  deleteImagesFromStorage,
  generateCourseId,
} from '@/lib/upload/direct-upload'
import type { LessonIntensityMode } from '@/types'

// Import sub-components
import IntensityModeSelector from './IntensityModeSelector'
import DropZone from './DropZone'
import FilePreviewGrid from './FilePreviewGrid'
import TextInputArea from './TextInputArea'
import UploadProgressOverlay from './UploadProgressOverlay'
import ErrorDisplay from './ErrorDisplay'

// Import types and helpers
import {
  type UploadModalProps,
  type UploadError,
  type UploadProgress,
  type UploadFileError,
  type InputMode,
  type SelectedFile,
  ACCEPTED_EXTENSIONS,
  MAX_FILES,
} from './types'
import { validateFile, getErrorMessage, generateFileId } from './helpers'

/**
 * Modal for uploading files or text to create a course
 */
export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const router = useRouter()
  const t = useTranslations('upload')
  const { error: showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Course creation funnel tracking
  const { trackStep, resetFunnel } = useFunnelTracking('course_creation')

  // State
  const [inputMode, setInputMode] = useState<InputMode>('files')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [textContent, setTextContent] = useState('')
  const [title, setTitle] = useState('')
  const [intensityMode, setIntensityMode] = useState<LessonIntensityMode>('standard')
  const [error, setError] = useState<UploadError | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [failedFiles, setFailedFiles] = useState<UploadFileError[]>([])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isUploading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isUploading])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Track funnel when modal opens and reset when closes
  useEffect(() => {
    if (isOpen) {
      trackStep('upload_click', 1)
    } else {
      // Revoke object URLs to prevent memory leaks
      selectedFiles.forEach(sf => sf.preview && URL.revokeObjectURL(sf.preview))
      setInputMode('files')
      setSelectedFiles([])
      setTextContent('')
      setTitle('')
      setIntensityMode('standard')
      setError(null)
      setIsDragging(false)
      setIsUploading(false)
      setUploadProgress(null)
      setFailedFiles([])
      resetFunnel()
    }
  }, [isOpen, trackStep, resetFunnel]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilesSelect = useCallback((files: File[]) => {
    const remainingSlots = MAX_FILES - selectedFiles.length

    if (remainingSlots <= 0) {
      setError({
        message: `Maximum ${MAX_FILES} files allowed.`,
        isRetryable: false,
      })
      return
    }

    if (files.length > remainingSlots) {
      setError({
        message: `Can only add ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'}. Maximum ${MAX_FILES} files allowed.`,
        isRetryable: false,
      })
      files = files.slice(0, remainingSlots)
    }

    const validFiles: SelectedFile[] = []
    const errors: string[] = []

    for (const file of files) {
      const { error: validationError, category } = validateFile(file)
      if (validationError || !category) {
        errors.push(`${file.name}: ${validationError?.message || 'Unknown error'}`)
        continue
      }

      let preview = ''
      if (category === 'image') {
        try {
          preview = URL.createObjectURL(file)
        } catch {
          // iOS Safari may fail - continue without preview
        }
      }

      validFiles.push({
        file,
        preview,
        id: generateFileId(),
        category,
      })
    }

    if (errors.length > 0 && validFiles.length === 0) {
      setError({ message: errors[0], isRetryable: false })
      return
    }

    if (errors.length > 0) {
      setError({
        message: `Some files were skipped: ${errors.join('; ')}`,
        isRetryable: false,
      })
    } else {
      setError(null)
    }

    if (validFiles.length > 0) {
      trackStep('file_selected', 2, { fileCount: validFiles.length })
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [selectedFiles.length, trackStep])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFilesSelect(droppedFiles)
    }
  }, [handleFilesSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFilesSelect(Array.from(files))
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFilesSelect])

  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(sf => sf.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(sf => sf.id !== id)
    })
    setError(null)
  }, [])

  const handleClearAllFiles = useCallback(() => {
    selectedFiles.forEach(sf => sf.preview && URL.revokeObjectURL(sf.preview))
    setSelectedFiles([])
    setError(null)
  }, [selectedFiles])

  const handleReorderFiles = useCallback((newFiles: SelectedFile[]) => {
    setSelectedFiles(newFiles)
  }, [])

  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node) && !isUploading) {
      onClose()
    }
  }, [onClose, isUploading])

  const handleSubmit = async () => {
    // Handle text mode submission
    if (inputMode === 'text') {
      if (!textContent.trim() || textContent.trim().length < 20) {
        setError({
          message: 'Please enter at least 20 characters of content to generate a course.',
          isRetryable: false,
        })
        return
      }

      setIsUploading(true)
      setError(null)
      setUploadProgress({ current: 0, total: 1, status: 'processing' })
      trackStep('upload_started', 3, { sourceType: 'text' })

      try {
        trackStep('processing', 4)
        onClose()

        const params = new URLSearchParams()
        params.set('textContent', textContent.trim())
        params.set('sourceType', 'text')
        if (title.trim()) params.set('title', title.trim())
        params.set('intensityMode', intensityMode)

        router.push(`/processing?${params.toString()}`)
        return
      } catch (err) {
        const errorInfo = getErrorMessage(err)
        setError(errorInfo)
        setIsUploading(false)
        setUploadProgress(null)
      }
      return
    }

    // Handle file mode submission
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setError(null)
    setFailedFiles([])
    setUploadProgress({ current: 0, total: selectedFiles.length, status: 'uploading' })

    const categories = [...new Set(selectedFiles.map(f => f.category))]
    trackStep('upload_started', 3, { fileCount: selectedFiles.length, categories })

    try {
      const imageFiles = selectedFiles.filter((sf) => sf.category === 'image')
      const documentFiles = selectedFiles.filter((sf) => sf.category !== 'image')

      // Handle document uploads
      if (documentFiles.length > 0) {
        const docFile = documentFiles[0]
        const validation = validateDirectUpload(docFile.file)
        if (!validation.valid) {
          setError({ message: validation.error || 'Invalid file', isRetryable: false })
          setIsUploading(false)
          setUploadProgress(null)
          return
        }

        // Get user ID
        setUploadProgress({ current: 0, total: 1, status: 'uploading' })
        let userId: string
        try {
          const authRes = await fetch('/api/auth/me')
          if (!authRes.ok) throw new Error('Please sign in to upload files')
          const authData = await authRes.json()
          userId = authData.userId
        } catch (err) {
          setError({
            message: err instanceof Error ? err.message : 'Authentication failed',
            code: ErrorCodes.UNAUTHORIZED,
            isRetryable: false,
          })
          setIsUploading(false)
          setUploadProgress(null)
          return
        }

        // Upload to storage
        let storagePath: string
        let fileType: DirectUploadFileType
        try {
          const uploadResult = await uploadFileToStorage(
            docFile.file,
            userId,
            (progress) => {
              setUploadProgress({ current: progress / 100, total: 1, status: 'uploading' })
            }
          )
          storagePath = uploadResult.storagePath
          fileType = uploadResult.fileType
        } catch (err) {
          setError({
            message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
            isRetryable: true,
          })
          setIsUploading(false)
          setUploadProgress(null)
          return
        }

        // Process document
        setUploadProgress({ current: 0.9, total: 1, status: 'processing' })
        let uploadData
        try {
          const processRes = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePath, fileName: docFile.file.name, fileType }),
          })

          const contentType = processRes.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            await deleteFileFromStorage(storagePath).catch(() => {})
            if (processRes.status === 504 || processRes.status === 503 || processRes.status === 502) {
              throw new Error('Processing timeout. The document is too large. Please try a smaller file.')
            }
            throw new Error('Server error processing document. Please try again.')
          }

          try {
            uploadData = await processRes.json()
          } catch {
            await deleteFileFromStorage(storagePath).catch(() => {})
            throw new Error('Invalid server response. Please try again.')
          }

          if (!processRes.ok) {
            await deleteFileFromStorage(storagePath).catch(() => {})
            const errorInfo = getErrorMessage(null, uploadData.code)
            setError({
              message: uploadData.error || errorInfo.message,
              code: uploadData.code,
              isRetryable: errorInfo.isRetryable,
            })
            setIsUploading(false)
            setUploadProgress(null)
            return
          }
        } catch (err) {
          await deleteFileFromStorage(storagePath).catch(() => {})
          if (err instanceof Error && err.message !== 'Processing failed. Please try again.') {
            throw err
          }
          throw new Error('Processing failed. Please try again.')
        }

        setUploadProgress({ current: 1, total: 1, status: 'complete' })
        trackStep('processing', 4, { sourceType: 'document' })
        onClose()

        // Store content in sessionStorage
        const docId = `doc_${Date.now()}`
        const contentToStore = uploadData.extractedContent || uploadData.content
        try {
          sessionStorage.setItem(docId, JSON.stringify(contentToStore))
        } catch {
          // Clear old entries and retry
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i)
            if (key?.startsWith('doc_')) sessionStorage.removeItem(key)
          }
          try {
            sessionStorage.setItem(docId, JSON.stringify(contentToStore))
          } catch {
            // Continue without session storage
          }
        }

        const params = new URLSearchParams()
        params.set('documentId', docId)
        params.set('documentUrl', uploadData.storagePath || storagePath)
        params.set('sourceType', uploadData.documentType || fileType)
        if (title.trim()) params.set('title', title.trim())
        params.set('intensityMode', intensityMode)

        router.push(`/processing?${params.toString()}`)
        return
      }

      // Handle image uploads
      setUploadProgress({ current: 0, total: imageFiles.length, status: 'uploading' })
      let userId: string
      try {
        const authRes = await fetch('/api/auth/me')
        if (!authRes.ok) throw new Error('Please sign in to upload files')
        const authData = await authRes.json()
        userId = authData.userId
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'Authentication failed',
          code: ErrorCodes.UNAUTHORIZED,
          isRetryable: false,
        })
        setIsUploading(false)
        setUploadProgress(null)
        return
      }

      const courseId = generateCourseId()

      let uploadResults
      try {
        uploadResults = await uploadImagesToStorage(
          imageFiles.map(sf => sf.file),
          userId,
          courseId,
          (current, total) => setUploadProgress({ current, total, status: 'uploading' })
        )
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
          isRetryable: true,
        })
        setIsUploading(false)
        setUploadProgress(null)
        return
      }

      if (!uploadResults || uploadResults.length === 0) {
        setError({ message: 'All files failed to upload. Please try again.', isRetryable: true })
        setIsUploading(false)
        setUploadProgress(null)
        return
      }

      // Get signed URLs
      setUploadProgress({ current: uploadResults.length, total: imageFiles.length, status: 'processing' })
      let signedData
      try {
        const signRes = await fetch('/api/sign-image-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePaths: uploadResults.map(r => r.storagePath), courseId }),
        })

        if (!signRes.ok) {
          await deleteImagesFromStorage(uploadResults.map(r => r.storagePath)).catch(() => {})
          throw new Error('Failed to process uploaded images')
        }

        signedData = await signRes.json()
      } catch (err) {
        await deleteImagesFromStorage(uploadResults.map(r => r.storagePath)).catch(() => {})
        setError({
          message: err instanceof Error ? err.message : 'Failed to process uploaded images',
          isRetryable: true,
        })
        setIsUploading(false)
        setUploadProgress(null)
        return
      }

      setUploadProgress({ current: signedData.images.length, total: imageFiles.length, status: 'complete' })

      const imageUrls = signedData.images
        .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
        .map((img: { url: string }) => img.url)

      trackStep('processing', 4, { sourceType: 'images', imageCount: imageUrls.length })
      onClose()

      const params = new URLSearchParams()
      params.set('imageUrls', JSON.stringify(imageUrls))
      params.set('courseId', courseId)
      if (title.trim()) params.set('title', title.trim())
      params.set('intensityMode', intensityMode)

      router.push(`/processing?${params.toString()}`)
    } catch (err) {
      const errorInfo = getErrorMessage(err)
      setError(errorInfo)
      setIsUploading(false)
      setUploadProgress(null)

      if (errorInfo.code === ErrorCodes.NETWORK_ERROR) {
        showError('Network error. Please check your connection.')
      }
    }
  }

  const handleRetry = () => {
    setError(null)
    handleSubmit()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClickOutside}
    >
      <div
        ref={modalRef}
        className="relative w-full sm:max-w-lg md:max-w-xl bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {t('createCourse')}
          </h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6">
          <button
            onClick={() => { setInputMode('files'); setError(null) }}
            disabled={isUploading}
            className={`
              flex-1 py-3 text-sm font-medium border-b-2 transition-colors
              ${inputMode === 'files'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }
              disabled:opacity-50
            `}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('uploadFiles')}
            </span>
          </button>
          <button
            onClick={() => { setInputMode('text'); setError(null) }}
            disabled={isUploading}
            className={`
              flex-1 py-3 text-sm font-medium border-b-2 transition-colors
              ${inputMode === 'text'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }
              disabled:opacity-50
            `}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('enterText')}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Error Display */}
          <ErrorDisplay
            error={error}
            failedFiles={failedFiles}
            isUploading={isUploading}
            hasFiles={selectedFiles.length > 0}
            onRetry={handleRetry}
            onDismissFailedFiles={() => setFailedFiles([])}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Intensity Mode Selector */}
          <IntensityModeSelector
            value={intensityMode}
            onChange={setIntensityMode}
            disabled={isUploading}
          />

          {/* Content based on input mode */}
          {inputMode === 'text' ? (
            <TextInputArea
              textContent={textContent}
              onTextChange={setTextContent}
              title={title}
              onTitleChange={setTitle}
              disabled={isUploading}
            />
          ) : selectedFiles.length === 0 ? (
            <DropZone
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <>
              <FilePreviewGrid
                files={selectedFiles}
                isUploading={isUploading}
                isDragging={isDragging}
                onRemoveFile={handleRemoveFile}
                onClearAll={handleClearAllFiles}
                onReorderFiles={handleReorderFiles}
                onAddMoreClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />

              {/* Title Input for file mode */}
              <div className="mt-4">
                <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('courseTitle')}
                </label>
                <input
                  id="course-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('courseTitlePlaceholder')}
                  disabled={isUploading}
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:opacity-50 text-base"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {t('courseTitleHintFiles')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Upload Progress Overlay */}
        {isUploading && uploadProgress && (
          <UploadProgressOverlay progress={uploadProgress} files={selectedFiles} />
        )}

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 sm:bg-transparent">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isUploading}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              inputMode === 'text'
                ? textContent.trim().length < 20 || isUploading
                : selectedFiles.length === 0 || isUploading
            }
            isLoading={isUploading}
            loadingText={
              inputMode === 'text'
                ? t('processing')
                : uploadProgress?.status === 'uploading'
                  ? (selectedFiles.length === 1 ? t('uploadingFile', { count: 1 }) : t('uploadingFiles', { count: selectedFiles.length }))
                  : t('processing')
            }
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
          >
            {inputMode === 'text' ? t('generateFromText') : t('generateCourse')}
          </Button>
        </div>
      </div>
    </div>
  )
}
