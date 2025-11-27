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

const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const ACCEPTED_EXTENSIONS = '.jpg, .jpeg, .png, .pdf'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ============================================================================
// Helpers
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
          message: 'File is too large. Maximum size is 10MB.',
          code,
          isRetryable: false,
        }
      case ErrorCodes.INVALID_FILE_TYPE:
        return {
          message: 'Invalid file type. Please upload a JPG, PNG, or PDF file.',
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

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<UploadError | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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
      setFile(null)
      setPreview(null)
      setTitle('')
      setError(null)
      setIsDragging(false)
      setIsUploading(false)
    }
  }, [isOpen])

  const validateFile = useCallback((file: File): UploadError | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return {
        message: `Invalid file type. Please upload ${ACCEPTED_EXTENSIONS}`,
        code: ErrorCodes.INVALID_FILE_TYPE,
        isRetryable: false,
      }
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        message: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`,
        code: ErrorCodes.FILE_TOO_LARGE,
        isRetryable: false,
      }
    }
    return null
  }, [])

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.onerror = () => {
        setError({
          message: 'Failed to read file. Please try again.',
          isRetryable: true,
        })
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }, [validateFile])

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

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }, [handleFileSelect])

  const handleRemoveFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node) && !isUploading) {
      onClose()
    }
  }, [onClose, isUploading])

  const handleSubmit = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      // Upload image to storage
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
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
        return
      }

      // Close modal and redirect to processing page
      onClose()

      // Build query params for processing page
      const params = new URLSearchParams({
        imageUrl: uploadData.imageUrl,
      })

      if (title.trim()) {
        params.set('title', title.trim())
      }

      router.push(`/processing?${params.toString()}`)
    } catch (err) {
      const errorInfo = getErrorMessage(err)
      setError(errorInfo)
      setIsUploading(false)

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
            Upload Notebook Page
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
                  {error.isRetryable && !isUploading && file && (
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

          {!file ? (
            /* Drop Zone */
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
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleInputChange}
                className="hidden"
                capture="environment"
              />

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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <p className="text-gray-700 dark:text-gray-300 font-medium mb-1 text-base">
                  {isDragging ? 'Drop your file here' : 'Tap to select or take a photo'}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 sm:mb-3 hidden sm:block">
                  or drag & drop your notebook image
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs">
                  JPG, PNG, PDF (max 10MB)
                </p>
              </div>
            </div>
          ) : (
            /* File Selected */
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative bg-gray-100 dark:bg-gray-700 rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-white dark:bg-gray-600 rounded-lg overflow-hidden">
                    {preview ? (
                      <Image
                        src={preview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9 13h6v2H9v-2zm0 4h6v2H9v-2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0 py-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                    className="p-2 text-gray-400 hover:text-red-500 active:text-red-600 rounded-lg hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-600 dark:active:bg-gray-500 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1"
                    aria-label="Remove file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
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
            disabled={!file || isUploading}
            isLoading={isUploading}
            loadingText="Uploading..."
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
          >
            Generate Course
          </Button>
        </div>
      </div>
    </div>
  )
}
