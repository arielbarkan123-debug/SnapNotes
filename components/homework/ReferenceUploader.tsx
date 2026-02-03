'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'

// ============================================================================
// Types
// ============================================================================

export interface ReferenceImage {
  id: string
  file: File
  previewUrl: string
}

interface ReferenceUploaderProps {
  images: ReferenceImage[]
  onImagesChange: (images: ReferenceImage[]) => void
  maxImages?: number
  disabled?: boolean
}

// Accepted image types
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS = 'image/jpeg,image/png,image/webp'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ============================================================================
// Component
// ============================================================================

export default function ReferenceUploader({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
}: ReferenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload image files only (JPEG, PNG, or WebP)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Each image must be less than 10MB'
    }
    return null
  }, [])

  const handleFiles = useCallback(
    (files: FileList) => {
      const remainingSlots = maxImages - images.length
      if (remainingSlots <= 0) {
        setError(`Maximum ${maxImages} reference images allowed`)
        return
      }

      const newImages: ReferenceImage[] = []
      const errors: string[] = []

      Array.from(files)
        .slice(0, remainingSlots)
        .forEach((file) => {
          const validationError = validateFile(file)
          if (validationError) {
            errors.push(`${file.name}: ${validationError}`)
          } else {
            // Wrap in try-catch for iOS Safari compatibility
            let previewUrl = ''
            try {
              previewUrl = URL.createObjectURL(file)
            } catch {
              // iOS Safari may fail - continue without preview
            }
            newImages.push({
              id: `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              file,
              previewUrl,
            })
          }
        })

      if (errors.length > 0) {
        setError(errors[0])
      } else {
        setError(null)
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages])
      }
    },
    [images, maxImages, validateFile, onImagesChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles]
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
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
      }
      e.target.value = ''
    },
    [handleFiles]
  )

  const handleRemove = useCallback(
    (id: string) => {
      const imageToRemove = images.find((img) => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }
      onImagesChange(images.filter((img) => img.id !== id))
      setError(null)
    },
    [images, onImagesChange]
  )

  const canAddMore = images.length < maxImages

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Reference Material{' '}
          <span className="text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {images.length}/{maxImages}
        </span>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
        Textbook pages, formulas, diagrams, tables, or any helpful context
      </p>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 group"
            >
              <Image
                src={img.previewUrl}
                alt="Reference"
                fill
                className="object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => handleRemove(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md"
                  aria-label="Remove"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* Add More Button */}
          {canAddMore && !disabled && (
            <button
              onClick={handleClick}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Upload Zone (only show if no images yet) */}
      {images.length === 0 && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer flex items-center gap-3
            ${disabled
              ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60'
              : isDragging
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }
          `}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {isDragging ? 'Drop images here' : 'Add reference pages'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag & drop or click to browse
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleChange}
        disabled={disabled}
        multiple
        className="hidden"
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
