'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'

// ============================================================================
// Types
// ============================================================================

interface QuestionUploaderProps {
  onImageSelected: (file: File, previewUrl: string) => void
  selectedImage?: { file: File; previewUrl: string } | null
  onClear?: () => void
  disabled?: boolean
}

// Accepted image types only for homework questions
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS = 'image/jpeg,image/png,image/webp'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ============================================================================
// Component
// ============================================================================

export default function QuestionUploader({
  onImageSelected,
  selectedImage,
  onClear,
  disabled = false,
}: QuestionUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload an image file (JPEG, PNG, or WebP)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 10MB'
    }
    return null
  }, [])

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setError(null)
      // Wrap in try-catch for iOS Safari compatibility
      let previewUrl = ''
      try {
        previewUrl = URL.createObjectURL(file)
      } catch {
        // iOS Safari may fail - continue without preview but still process the file
      }
      onImageSelected(file, previewUrl)
    },
    [validateFile, onImageSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) inputRef.current.click()
  }, [disabled])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl)
      }
      onClear?.()
      setError(null)
    },
    [selectedImage, onClear]
  )

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-white">
        Your Question <span className="text-red-500">*</span>
      </label>

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer
          ${disabled
            ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60'
            : isDragging
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : selectedImage
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        {selectedImage ? (
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
              <Image
                src={selectedImage.previewUrl}
                alt="Question preview"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {selectedImage.file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedImage.file.size / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                Ready to analyze
              </p>
            </div>
            {!disabled && (
              <button
                onClick={handleClear}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Remove image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {isDragging ? 'Drop your image here' : 'Upload your homework question'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              JPEG, PNG, or WebP up to 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
