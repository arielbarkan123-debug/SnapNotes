/**
 * Types and constants for UploadModal components
 */

import { ErrorCodes } from '@/lib/api/errors'

// ============================================================================
// Types
// ============================================================================

export interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface UploadError {
  message: string
  code?: string
  isRetryable?: boolean
}

export interface UploadProgress {
  current: number
  total: number
  status: 'uploading' | 'processing' | 'complete'
}

export interface UploadFileError {
  index: number
  filename: string
  error: string
}

export type FileCategory = 'image' | 'pdf' | 'pptx' | 'docx'

export type InputMode = 'files' | 'text'

export interface SelectedFile {
  file: File
  preview: string
  id: string
  category: FileCategory
}

// ============================================================================
// Constants
// ============================================================================

// Accepted MIME types mapped to file categories
export const ACCEPTED_TYPES: Record<string, FileCategory> = {
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

export const ACCEPTED_EXTENSIONS = 'image/*,.pdf,.pptx,.ppt,.docx,.doc'

// File size limits per category
export const MAX_FILE_SIZES: Record<FileCategory, number> = {
  image: 10 * 1024 * 1024, // 10MB
  pdf: 20 * 1024 * 1024,   // 20MB
  pptx: 20 * 1024 * 1024,  // 20MB
  docx: 20 * 1024 * 1024,  // 20MB
}

export const MAX_FILES = 10

// Icons for each file type
export const FILE_ICONS: Record<FileCategory, string> = {
  image: '🖼️',
  pdf: '📄',
  pptx: '📊',
  docx: '📝',
}

// Labels for button text
export const FILE_TYPE_LABELS: Record<FileCategory, string> = {
  image: 'Images',
  pdf: 'PDF',
  pptx: 'Presentation',
  docx: 'Document',
}

// Error code mapping for user-friendly messages
export const ERROR_MESSAGES: Record<string, { message: string; isRetryable: boolean }> = {
  [ErrorCodes.FILE_TOO_LARGE]: {
    message: 'File is too large. Maximum size is 10MB for images, 20MB for documents.',
    isRetryable: false,
  },
  [ErrorCodes.INVALID_FILE_TYPE]: {
    message: 'Invalid file type. Please upload images (JPG, PNG, WebP, HEIC), PDF, PowerPoint, or Word files.',
    isRetryable: false,
  },
  [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: {
    message: 'Storage quota exceeded. Please delete some courses and try again.',
    isRetryable: false,
  },
  [ErrorCodes.UNAUTHORIZED]: {
    message: 'Please log in to upload files.',
    isRetryable: false,
  },
  [ErrorCodes.RATE_LIMITED]: {
    message: 'Too many uploads. Please wait a moment and try again.',
    isRetryable: true,
  },
  [ErrorCodes.NETWORK_ERROR]: {
    message: 'Network error. Please check your connection and try again.',
    isRetryable: true,
  },
}
