'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { ErrorCodes } from '@/lib/api/errors'

// ============================================================================
// Types & Constants
// ============================================================================

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UploadError {
  message: string
  code?: string
  isRetryable?: boolean
}

interface UploadProgress {
  current: number
  total: number
  status: 'uploading' | 'processing' | 'complete'
}

interface UploadFileError {
  index: number
  filename: string
  error: string
}

type FileCategory = 'image' | 'pdf' | 'pptx' | 'docx'

type InputMode = 'files' | 'text'

interface SelectedFile {
  file: File
  preview: string
  id: string
  category: FileCategory
}

// Accepted MIME types mapped to file categories
const ACCEPTED_TYPES: Record<string, FileCategory> = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  // Documents
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
}

const ACCEPTED_EXTENSIONS = 'image/*,.pdf,.pptx,.ppt,.docx,.doc'

// File size limits per category
const MAX_FILE_SIZES: Record<FileCategory, number> = {
  image: 10 * 1024 * 1024, // 10MB
  pdf: 20 * 1024 * 1024,   // 20MB
  pptx: 20 * 1024 * 1024,  // 20MB
  docx: 20 * 1024 * 1024,  // 20MB
}

const MAX_FILES = 10

// Icons for each file type
const FILE_ICONS: Record<FileCategory, string> = {
  image: '🖼️',
  pdf: '📄',
  pptx: '📊',
  docx: '📝',
}

// Labels for button text
const FILE_TYPE_LABELS: Record<FileCategory, string> = {
  image: 'Images',
  pdf: 'PDF',
  pptx: 'Presentation',
  docx: 'Document',
}

// ============================================================================
// Helpers
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileCategory(file: File): FileCategory | null {
  // Check MIME type first
  if (ACCEPTED_TYPES[file.type]) {
    return ACCEPTED_TYPES[file.type]
  }

  // Fallback to extension check for edge cases
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'heic':
      return 'image'
    case 'pdf':
      return 'pdf'
    case 'pptx':
    case 'ppt':
      return 'pptx'
    case 'docx':
    case 'doc':
      return 'docx'
    default:
      return null
  }
}

function getMaxSizeForCategory(category: FileCategory): number {
  return MAX_FILE_SIZES[category]
}

function getButtonText(files: SelectedFile[]): string {
  if (files.length === 0) return 'Generate Course'

  // Get unique categories
  const categories = new Set(files.map(f => f.category))

  // If all files are the same type
  if (categories.size === 1) {
    const category = files[0].category
    return `Generate from ${FILE_TYPE_LABELS[category]}`
  }

  // Mixed file types
  return 'Generate Course'
}

function getUploadingText(files: SelectedFile[]): string {
  if (files.length === 0) return 'Uploading...'

  const categories = new Set(files.map(f => f.category))
  if (categories.size === 1) {
    const category = files[0].category
    const label = FILE_TYPE_LABELS[category].toLowerCase()
    return `Uploading ${files.length} ${label} file${files.length !== 1 ? 's' : ''}...`
  }

  return `Uploading ${files.length} file${files.length !== 1 ? 's' : ''}...`
}

function getErrorMessage(error: unknown, code?: string): UploadError {
  // Network errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: ErrorCodes.NETWORK_ERROR,
      isRetryable: true,
    }
  }

  // API error responses
  if (code) {
    switch (code) {
      case ErrorCodes.FILE_TOO_LARGE:
        return {
          message: 'File is too large. Maximum size is 10MB for images, 20MB for documents.',
          code,
          isRetryable: false,
        }
      case ErrorCodes.INVALID_FILE_TYPE:
        return {
          message: 'Invalid file type. Please upload images (JPG, PNG, WebP, HEIC), PDF, PowerPoint, or Word files.',
          code,
          isRetryable: false,
        }
      case ErrorCodes.STORAGE_QUOTA_EXCEEDED:
        return {
          message: 'Storage quota exceeded. Please delete some courses and try again.',
          code,
          isRetryable: false,
        }
      case ErrorCodes.UNAUTHORIZED:
        return {
          message: 'Please log in to upload files.',
          code,
          isRetryable: false,
        }
      case ErrorCodes.RATE_LIMITED:
        return {
          message: 'Too many uploads. Please wait a moment and try again.',
          code,
          isRetryable: true,
        }
      default:
        return {
          message: 'Upload failed. Please try again.',
          code,
          isRetryable: true,
        }
    }
  }

  // Generic error
  if (error instanceof Error) {
    return {
      message: error.message,
      isRetryable: true,
    }
  }

  return {
    message: 'An unexpected error occurred. Please try again.',
    isRetryable: true,
  }
}

// ============================================================================
// Component
// ============================================================================

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const router = useRouter()
  const { error: showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const [inputMode, setInputMode] = useState<InputMode>('files')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [textContent, setTextContent] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<UploadError | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [failedFiles, setFailedFiles] = useState<UploadFileError[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Revoke object URLs to prevent memory leaks (only for images)
      selectedFiles.forEach(sf => sf.preview && URL.revokeObjectURL(sf.preview))
      setInputMode('files')
      setSelectedFiles([])
      setTextContent('')
      setTitle('')
      setError(null)
      setIsDragging(false)
      setIsUploading(false)
      setUploadProgress(null)
      setFailedFiles([])
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const validateFile = useCallback((file: File): { error: UploadError | null; category: FileCategory | null } => {
    const category = getFileCategory(file)

    if (!category) {
      return {
        error: {
          message: `Invalid file type. Please upload images (JPG, PNG, WebP, HEIC), PDF, PowerPoint, or Word files.`,
          code: ErrorCodes.INVALID_FILE_TYPE,
          isRetryable: false,
        },
        category: null,
      }
    }

    const maxSize = getMaxSizeForCategory(category)
    if (file.size > maxSize) {
      return {
        error: {
          message: `File too large. Maximum size is ${formatFileSize(maxSize)} for ${FILE_TYPE_LABELS[category]} files.`,
          code: ErrorCodes.FILE_TOO_LARGE,
          isRetryable: false,
        },
        category: null,
      }
    }

    return { error: null, category }
  }, [])

  const handleFilesSelect = useCallback((files: File[]) => {
    // Check if adding these files would exceed the limit
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
      // Only process files that fit
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

      // Create preview - use object URL for images, empty for documents
      const preview = category === 'image' ? URL.createObjectURL(file) : ''
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

      validFiles.push({ file, preview, id, category })
    }

    if (errors.length > 0 && validFiles.length === 0) {
      setError({
        message: errors[0],
        isRetryable: false,
      })
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

    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [validateFile, selectedFiles.length])

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
    // Reset input value so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFilesSelect])

  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(sf => sf.id === id)
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(sf => sf.id !== id)
    })
    setError(null)
  }, [])

  const handleClearAllFiles = useCallback(() => {
    // Show confirmation if more than 3 files
    if (selectedFiles.length > 3) {
      setShowClearConfirm(true)
      return
    }
    selectedFiles.forEach(sf => sf.preview && URL.revokeObjectURL(sf.preview))
    setSelectedFiles([])
    setError(null)
  }, [selectedFiles])

  const confirmClearAll = useCallback(() => {
    selectedFiles.forEach(sf => sf.preview && URL.revokeObjectURL(sf.preview))
    setSelectedFiles([])
    setError(null)
    setShowClearConfirm(false)
  }, [selectedFiles])

  const cancelClearAll = useCallback(() => {
    setShowClearConfirm(false)
  }, [])

  // Reorder handlers
  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      const temp = newFiles[index - 1]
      newFiles[index - 1] = newFiles[index]
      newFiles[index] = temp
      return newFiles
    })
  }, [])

  const handleMoveDown = useCallback((index: number) => {
    setSelectedFiles(prev => {
      if (index >= prev.length - 1) return prev
      const newFiles = [...prev]
      const temp = newFiles[index + 1]
      newFiles[index + 1] = newFiles[index]
      newFiles[index] = temp
      return newFiles
    })
  }, [])

  // Drag and drop reorder handlers
  const handleThumbnailDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      const target = e.target as HTMLElement
      target.style.opacity = '0.5'
    }, 0)
  }, [])

  const handleThumbnailDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleThumbnailDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  const handleThumbnailDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleThumbnailDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    setSelectedFiles(prev => {
      const newFiles = [...prev]
      const [draggedItem] = newFiles.splice(draggedIndex, 1)
      newFiles.splice(targetIndex, 0, draggedItem)
      return newFiles
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex])

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

      try {
        // Close modal and redirect to processing page with text content
        onClose()

        const params = new URLSearchParams()
        params.set('textContent', textContent.trim())
        params.set('sourceType', 'text')

        if (title.trim()) {
          params.set('title', title.trim())
        }

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

    try {
      // Separate image files from document files
      const imageFiles = selectedFiles.filter((sf) => sf.category === 'image')
      const documentFiles = selectedFiles.filter((sf) => sf.category !== 'image')

      // Currently, we only support one document at a time
      // If there are documents, handle them separately
      if (documentFiles.length > 0) {
        // For now, only process the first document
        const docFile = documentFiles[0]

        const formData = new FormData()
        formData.append('file', docFile.file)

        const uploadResponse = await fetch('/api/upload-document', {
          method: 'POST',
          body: formData,
        })

        let uploadData
        try {
          uploadData = await uploadResponse.json()
        } catch {
          throw new Error('Invalid server response. Please try again.')
        }

        if (!uploadResponse.ok) {
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

        // Update progress
        setUploadProgress({
          current: 1,
          total: 1,
          status: 'complete',
        })

        // Close modal and redirect to processing page with document content
        onClose()

        // Store document content in sessionStorage to avoid URL length limits
        const docId = `doc_${Date.now()}`
        sessionStorage.setItem(docId, JSON.stringify(uploadData.extractedContent))

        const params = new URLSearchParams()
        params.set('documentId', docId)
        params.set('documentUrl', uploadData.storagePath || '')
        params.set('sourceType', uploadData.documentType)

        if (title.trim()) {
          params.set('title', title.trim())
        }

        router.push(`/processing?${params.toString()}`)
        return
      }

      // Handle image uploads (existing flow)
      const formData = new FormData()
      imageFiles.forEach((sf) => {
        formData.append('files', sf.file)
      })

      // Update progress to show uploading
      setUploadProgress({ current: 0, total: imageFiles.length, status: 'uploading' })

      const uploadResponse = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      let uploadData
      try {
        uploadData = await uploadResponse.json()
      } catch {
        throw new Error('Invalid server response. Please try again.')
      }

      // Handle complete failure
      if (!uploadResponse.ok && !uploadData.images?.length) {
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

      // Handle partial failure - some files uploaded, some failed
      if (uploadData.errors && uploadData.errors.length > 0) {
        setFailedFiles(
          uploadData.errors.map((e: { index: number; filename: string; error: string }) => ({
            index: e.index,
            filename: e.filename,
            error: e.error,
          }))
        )
      }

      // If no images were successfully uploaded
      if (!uploadData.images || uploadData.images.length === 0) {
        setError({
          message: 'All files failed to upload. Please try again.',
          isRetryable: true,
        })
        setIsUploading(false)
        setUploadProgress(null)
        return
      }

      // Update progress to processing
      setUploadProgress({
        current: uploadData.images.length,
        total: imageFiles.length,
        status: 'complete',
      })

      // Extract image URLs in order
      const imageUrls = uploadData.images
        .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
        .map((img: { url: string }) => img.url)

      // Close modal and redirect to processing page
      onClose()

      // Build query params for processing page with multiple images
      const params = new URLSearchParams()

      // Pass image URLs as JSON array
      params.set('imageUrls', JSON.stringify(imageUrls))

      // Also pass courseId from upload response for consistency
      if (uploadData.courseId) {
        params.set('courseId', uploadData.courseId)
      }

      if (title.trim()) {
        params.set('title', title.trim())
      }

      router.push(`/processing?${params.toString()}`)
    } catch (err) {
      const errorInfo = getErrorMessage(err)
      setError(errorInfo)
      setIsUploading(false)
      setUploadProgress(null)

      // Also show toast for network errors
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
        className="relative w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Create Course
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
              Upload Files
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
              Enter Text
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-700 dark:text-red-400 text-sm">{error.message}</p>
                  {error.isRetryable && !isUploading && selectedFiles.length > 0 && (
                    <button
                      onClick={handleRetry}
                      className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Failed Files Warning */}
          {failedFiles.length > 0 && !error && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                    {failedFiles.length} file{failedFiles.length !== 1 ? 's' : ''} failed to upload
                  </p>
                  <ul className="mt-1 text-xs text-amber-600 dark:text-amber-500 space-y-0.5">
                    {failedFiles.map((f, i) => (
                      <li key={i} className="truncate">
                        <span className="font-medium">{f.filename}:</span> {f.error}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setFailedFiles([])}
                    className="mt-2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input - always present */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Text Input Mode */}
          {inputMode === 'text' ? (
            <div className="space-y-4">
              {/* Text Input Area */}
              <div>
                <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your topics, notes, or outline
                </label>
                <textarea
                  id="text-content"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Example:
The exam will include the following topics:

Number Systems: Rounding, Standard Form, Indices (laws & solving for exponents), Surds (operations & rationalizing).

Algebra: Factorization (grouping), Algebraic Fractions (solving linear equations with denominators), Substitution.

Functions: Composite functions, Domain & Range concepts.

Statistics: Mean, Median, Mode, Range."
                  disabled={isUploading}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:opacity-50 text-sm resize-none"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Enter topics, subject outlines, or study notes. AI will expand them into a comprehensive course with lessons and questions.
                </p>
              </div>

              {/* Character count */}
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {textContent.length < 20 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      Minimum 20 characters required ({20 - textContent.length} more needed)
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      Ready to generate
                    </span>
                  )}
                </span>
                <span>{textContent.length} characters</span>
              </div>

              {/* Title Input */}
              <div>
                <label htmlFor="text-course-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Title
                </label>
                <input
                  id="text-course-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Course title (optional)"
                  disabled={isUploading}
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:opacity-50 text-base"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank to auto-generate from your content
                </p>
              </div>
            </div>
          ) : selectedFiles.length === 0 ? (
            /* Drop Zone - No files selected */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all min-h-[200px] sm:min-h-[240px] flex items-center justify-center
                ${isDragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 active:border-indigo-500 hover:bg-gray-50 active:bg-indigo-50 dark:hover:bg-gray-700/50 dark:active:bg-indigo-900/20'
                }
              `}
            >
              <div className="flex flex-col items-center">
                <div className={`
                  w-14 h-14 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-full flex items-center justify-center transition-colors
                  ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-100 dark:bg-gray-700'}
                `}>
                  <svg
                    className={`w-7 h-7 sm:w-8 sm:h-8 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>

                <p className="text-gray-700 dark:text-gray-300 font-medium mb-1 text-base">
                  {isDragging ? 'Drop your files here' : 'Tap to select files'}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 sm:mb-3 hidden sm:block">
                  or drag & drop your notebook pages
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs text-center">
                  Images (10MB), PDF, PowerPoint, Word (20MB)
                  <br />
                  <span className="text-gray-400/80">Up to {MAX_FILES} files</span>
                </p>
              </div>
            </div>
          ) : (
            /* Files Selected - Thumbnail Grid */
            <div className="space-y-4">
              {/* Header with count and clear button */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  {selectedFiles.length >= MAX_FILES && (
                    <span className="text-gray-500 dark:text-gray-400 font-normal"> (maximum reached)</span>
                  )}
                </p>
                <button
                  onClick={handleClearAllFiles}
                  disabled={isUploading}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>

              {/* Clear Confirmation Dialog */}
              {showClearConfirm && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">Clear all {selectedFiles.length} files?</p>
                      <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">This action cannot be undone.</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={confirmClearAll}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={cancelClearAll}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reorder hint */}
              {selectedFiles.length > 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Drag to reorder or use arrows. Order determines page sequence.
                </p>
              )}

              {/* Thumbnail Grid */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl border-2 border-dashed transition-colors
                  ${isDragging
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                  }
                `}
              >
                {selectedFiles.map((sf, index) => (
                  <div
                    key={sf.id}
                    draggable={!isUploading && selectedFiles.length > 1}
                    onDragStart={(e) => handleThumbnailDragStart(e, index)}
                    onDragEnd={handleThumbnailDragEnd}
                    onDragOver={(e) => handleThumbnailDragOver(e, index)}
                    onDragLeave={handleThumbnailDragLeave}
                    onDrop={(e) => handleThumbnailDrop(e, index)}
                    className={`
                      relative group bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm transition-all
                      ${selectedFiles.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}
                      ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                      ${dragOverIndex === index ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800' : ''}
                    `}
                  >
                    {/* Page Number Badge */}
                    <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-black/70 text-white text-xs font-medium rounded flex items-center gap-1">
                      <span>{FILE_ICONS[sf.category]}</span>
                      <span>{index + 1}</span>
                    </div>

                    {/* Thumbnail - Image or Document Icon */}
                    <div className="relative aspect-square">
                      {sf.category === 'image' && sf.preview ? (
                        <Image
                          src={sf.preview}
                          alt={sf.file.name}
                          fill
                          className="object-cover pointer-events-none"
                        />
                      ) : (
                        /* Document preview - icon + filename */
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 p-2">
                          <span className="text-4xl mb-1">{FILE_ICONS[sf.category]}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {sf.category}
                          </span>
                        </div>
                      )}

                      {/* Overlay controls - visible on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                        {/* Drag handle indicator */}
                        {selectedFiles.length > 1 && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                            </svg>
                          </div>
                        )}

                        {/* Remove button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFile(sf.id); }}
                          disabled={isUploading}
                          className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                          aria-label={`Remove ${sf.file.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Reorder arrows */}
                        {selectedFiles.length > 1 && (
                          <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Move left/up */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                              disabled={isUploading || index === 0}
                              className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="Move earlier"
                              title="Move earlier"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            {/* Move right/down */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                              disabled={isUploading || index === selectedFiles.length - 1}
                              className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="Move later"
                              title="Move later"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File info */}
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {sf.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(sf.file.size)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Add More Images Button */}
                {selectedFiles.length < MAX_FILES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square flex flex-col items-center justify-center bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Add more</span>
                  </button>
                )}
              </div>

              {/* Title Input */}
              <div>
                <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Title
                </label>
                <input
                  id="course-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Course title (optional)"
                  disabled={isUploading}
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:opacity-50 text-base"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank to auto-generate from your notes
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress Overlay */}
        {isUploading && uploadProgress && (
          <div className="px-4 sm:px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-t border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-indigo-200 dark:border-indigo-700 rounded-full" />
                <div className="absolute top-0 left-0 w-8 h-8 border-2 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {uploadProgress.status === 'uploading' && (
                    <>{getUploadingText(selectedFiles)}</>
                  )}
                  {uploadProgress.status === 'complete' && (
                    <>Upload complete! Redirecting...</>
                  )}
                </p>
                {uploadProgress.status === 'uploading' && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    Please wait while your files are being uploaded
                  </p>
                )}
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500 ${
                  uploadProgress.status === 'uploading' ? 'animate-pulse' : ''
                }`}
                style={{
                  width: uploadProgress.status === 'complete' ? '100%' : '60%'
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 sm:bg-transparent">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isUploading}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
          >
            Cancel
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
                ? 'Processing...'
                : uploadProgress?.status === 'uploading'
                  ? getUploadingText(selectedFiles)
                  : 'Processing...'
            }
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
          >
            {inputMode === 'text' ? 'Generate from Text' : getButtonText(selectedFiles)}
          </Button>
        </div>
      </div>
    </div>
  )
}
