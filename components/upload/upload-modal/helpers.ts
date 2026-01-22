/**
 * Helper functions for UploadModal components
 */

import { ErrorCodes } from '@/lib/api/errors'
import {
  type FileCategory,
  type UploadError,
  ACCEPTED_TYPES,
  MAX_FILE_SIZES,
  FILE_TYPE_LABELS,
  ERROR_MESSAGES,
} from './types'

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Determine file category from File object
 */
export function getFileCategory(file: File): FileCategory | null {
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

/**
 * Get maximum file size for a given category
 */
export function getMaxSizeForCategory(category: FileCategory): number {
  return MAX_FILE_SIZES[category]
}

/**
 * Generate button text based on selected files
 */
export function getButtonText(files: { category: FileCategory }[]): string {
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

/**
 * Parse error into user-friendly UploadError
 */
export function getErrorMessage(error: unknown, code?: string): UploadError {
  // Network errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      message: ERROR_MESSAGES[ErrorCodes.NETWORK_ERROR].message,
      code: ErrorCodes.NETWORK_ERROR,
      isRetryable: true,
    }
  }

  // API error responses with known codes
  if (code && ERROR_MESSAGES[code]) {
    return {
      message: ERROR_MESSAGES[code].message,
      code,
      isRetryable: ERROR_MESSAGES[code].isRetryable,
    }
  }

  // Code provided but not in our mapping
  if (code) {
    return {
      message: 'Upload failed. Please try again.',
      code,
      isRetryable: true,
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

/**
 * Generate unique ID for files
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Validate a file and return error or category
 */
export function validateFile(file: File): { error: UploadError | null; category: FileCategory | null } {
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
}
