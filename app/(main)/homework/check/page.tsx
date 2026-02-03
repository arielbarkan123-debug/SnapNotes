'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import { sanitizeError } from '@/lib/utils/error-sanitizer'

// HEIC conversion is done client-side before upload because:
// - Vercel's sharp doesn't have HEIC codec support
// - Server-side heic-convert also fails on Vercel
// - heic2any works in browser via WASM
// HEIC conversion module is dynamically imported to avoid bundling heic2any
// into the main bundle (which causes SecurityError on some mobile browsers)

// Auto-retry configuration for transient errors (Safari fix)
const MAX_AUTO_RETRIES = 2
const AUTO_RETRY_DELAY_MS = 2000

const TRANSIENT_ERROR_PATTERNS = [
  'AI service is temporarily busy',
  'AI is busy',
  'temporarily busy',
  'temporary issue',
  'try again',
  'Database schema error',
  'Failed to create homework check',
]

function isTransientError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase()
  return TRANSIENT_ERROR_PATTERNS.some(pattern =>
    lowerMessage.includes(pattern.toLowerCase())
  )
}

import type { InputMode } from '@/lib/homework/types'

// ============================================================================
// Error Codes for Homework Checker Page
// ============================================================================

const ERROR_CODES = {
  // Validation errors
  HC_VAL_001: 'HC_VAL_001', // No image uploaded (image mode)
  HC_VAL_002: 'HC_VAL_002', // Task text too short (text mode)

  // Upload errors
  HC_UPL_001: 'HC_UPL_001', // Upload timeout
  HC_UPL_002: 'HC_UPL_002', // Non-JSON response from upload
  HC_UPL_003: 'HC_UPL_003', // JSON parse error
  HC_UPL_004: 'HC_UPL_004', // Upload failed
  HC_UPL_005: 'HC_UPL_005', // No files uploaded successfully

  // Analysis errors (text mode)
  HC_TXT_001: 'HC_TXT_001', // Failed to connect to analysis service
  HC_TXT_002: 'HC_TXT_002', // Failed to start stream
  HC_TXT_003: 'HC_TXT_003', // Stream error from server
  HC_TXT_004: 'HC_TXT_004', // No result returned
  HC_TXT_005: 'HC_TXT_005', // Timeout during analysis

  // Analysis errors (image mode)
  HC_IMG_001: 'HC_IMG_001', // Failed to connect to analysis service
  HC_IMG_002: 'HC_IMG_002', // Failed to start stream
  HC_IMG_003: 'HC_IMG_003', // Stream error from server
  HC_IMG_004: 'HC_IMG_004', // No result returned
  HC_IMG_005: 'HC_IMG_005', // Timeout during analysis

  // HEIC errors
  HC_HEIC_001: 'HC_HEIC_001', // HEIC conversion failed
} as const

/**
 * Format error message with code for debugging
 */
function formatError(code: string, message: string, details?: string): string {
  const detailSuffix = details ? ` (${details})` : ''
  return `[${code}] ${message}${detailSuffix}`
}

// ============================================================================
// Types
// ============================================================================

interface UploadedImage {
  file: File
  preview: string | null  // null for HEIC files (Chrome can't preview them)
  isHeic: boolean  // Track if conversion needed at submit time
  isDocument?: boolean  // True for PDF/DOCX files
  docType?: 'pdf' | 'docx'  // Document type if isDocument is true
}

// Minimum text length for task input
const MIN_TASK_TEXT_LENGTH = 10

interface HeicWarning {
  type: 'task' | 'answer' | 'reference' | 'review'
  file: File
  index?: number  // For reference/review arrays
}

interface HeicConversionResult {
  file: File
  converted: boolean
  error?: string
}

// ============================================================================
// HEIC Conversion Helper
// ============================================================================

/**
 * Check if a file is HEIC/HEIF format
 */
function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return (
    type.includes('heic') ||
    type.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

/**
 * Convert HEIC file to JPEG
 * Returns result with converted file, success status, and any error message
 * Uses dynamic import to load heic-converter module only when needed
 */
async function convertHeicToJpeg(file: File): Promise<HeicConversionResult> {
  if (!isHeicFile(file)) {
    return { file, converted: false }
  }

  console.log('[HEIC] Converting HEIC to JPEG:', file.name)

  try {
    // Dynamically import the converter module - keeps heic2any out of main bundle
    const { convertHeicToJpeg: convert } = await import('@/lib/upload/heic-converter')
    const convertedFile = await convert(file)

    console.log('[HEIC] Conversion successful:', convertedFile.name)
    return { file: convertedFile, converted: true }
  } catch (error) {
    console.error('[HEIC] Conversion failed:', error)
    // Return error info so caller can show user-friendly message
    return {
      file,
      converted: false,
      error: error instanceof Error ? error.message : 'Could not convert this image. Please open the photo in your Gallery app, tap Share or Export, and save as JPEG.'
    }
  }
}

/**
 * Check if a file is a document (PDF or DOCX)
 * Returns the document type or null if it's not a document
 */
function isDocumentFile(file: File): 'pdf' | 'docx' | null {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (name.endsWith('.pdf') || type === 'application/pdf') {
    return 'pdf'
  }
  if (name.endsWith('.docx') || name.endsWith('.doc') || type.includes('wordprocessingml')) {
    return 'docx'
  }
  return null
}

// ============================================================================
// Image Uploader Component
// ============================================================================

function ImageUploader({
  label,
  image,
  onUpload,
  onRemove,
  required = false,
}: {
  label: string
  description?: string  // No longer used but kept for compatibility
  image: UploadedImage | null
  onUpload: (file: File) => void
  onRemove: () => void
  required?: boolean
  icon?: string  // No longer used but kept for compatibility
}) {
  const t = useTranslations('homework.check')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onUpload(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [onUpload]
  )

  // Show uploaded image (with preview or placeholder for HEIC)
  if (image) {
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative rounded-xl overflow-hidden border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="relative aspect-[4/3]">
            {image.isDocument ? (
              // Placeholder for PDF/DOCX documents
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="text-5xl mb-2">
                  {image.docType === 'pdf' ? '📄' : '📝'}
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center px-4 truncate max-w-full">
                  {image.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {image.docType?.toUpperCase()} {t('documentLabel')}
                </p>
              </div>
            ) : image.preview ? (
              <Image
                src={image.preview}
                alt={label}
                fill
                className="object-contain"
              />
            ) : (
              // Placeholder for HEIC files (Chrome can't preview them)
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="text-5xl mb-2">📷</div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {image.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {t('imageReady')}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onRemove}
            className="absolute top-3 right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('ready')}
          </div>
        </div>
      </div>
    )
  }

  // Show two-button upload area (Take Photo / From Gallery)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,.pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Two-button layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Take Photo Button */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 dark:active:bg-violet-900/30 transition-colors min-h-[120px]"
        >
          <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('takePhoto')}</span>
        </button>

        {/* From Gallery Button */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 dark:active:bg-violet-900/30 transition-colors min-h-[120px]"
        >
          <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('fromGallery')}</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Multi Image Uploader Component
// ============================================================================

function MultiImageUploader({
  label,
  images,
  onUpload,
  onRemove,
  maxImages = 5,
}: {
  label: string
  description?: string  // No longer used but kept for compatibility
  images: UploadedImage[]
  onUpload: (file: File) => void
  onRemove: (index: number) => void
  maxImages?: number
  icon?: string  // No longer used but kept for compatibility
}) {
  const t = useTranslations('homework.check')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      files.slice(0, maxImages - images.length).forEach(onUpload)
      e.target.value = ''
    },
    [onUpload, images.length, maxImages]
  )

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        <span className="text-gray-400 font-normal ms-2">({images.length}/{maxImages})</span>
      </label>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,.pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
              {image.isDocument ? (
                // Placeholder for PDF/DOCX documents
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="text-2xl">{image.docType === 'pdf' ? '📄' : '📝'}</div>
                  <p className="text-[10px] text-gray-500 mt-1 truncate px-1 w-full text-center">
                    {image.file.name}
                  </p>
                </div>
              ) : image.preview ? (
                <Image
                  src={image.preview}
                  alt={`Reference ${index + 1}`}
                  fill
                  className="object-cover"
                />
              ) : (
                // Placeholder for HEIC files
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="text-2xl">📷</div>
                  <p className="text-[10px] text-gray-500 mt-1 truncate px-1 w-full text-center">
                    {image.file.name}
                  </p>
                </div>
              )}
              <button
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div className="grid grid-cols-2 gap-2">
          {/* Take Photo Button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('takePhoto')}</span>
          </button>

          {/* From Gallery Button */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('fromGallery')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Input Mode Toggle Component
// ============================================================================

function InputModeToggle({
  mode,
  onChange,
}: {
  mode: InputMode
  onChange: (mode: InputMode) => void
}) {
  const t = useTranslations('homework')
  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('inputMode.howToSubmit')}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('image')}
          className={`
            flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
            ${mode === 'image'
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
            }
          `}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            mode === 'image' ? 'bg-violet-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className={`text-sm font-medium ${
            mode === 'image' ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {t('inputMode.uploadImage')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange('text')}
          className={`
            flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
            ${mode === 'text'
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
            }
          `}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            mode === 'text' ? 'bg-violet-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <span className={`text-sm font-medium ${
            mode === 'text' ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {t('inputMode.pasteText')}
          </span>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Text Input Component
// ============================================================================

function TextInputSection({
  taskText,
  answerText,
  onTaskTextChange,
  onAnswerTextChange,
}: {
  taskText: string
  answerText: string
  onTaskTextChange: (text: string) => void
  onAnswerTextChange: (text: string) => void
}) {
  const t = useTranslations('homework')
  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('inputMode.taskTextLabel')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={taskText}
          onChange={(e) => onTaskTextChange(e.target.value)}
          placeholder={t('inputMode.taskTextPlaceholder')}
          rows={6}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
        />
        {taskText.length > 0 && taskText.length < MIN_TASK_TEXT_LENGTH && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            {t('inputMode.textMinLength', { min: MIN_TASK_TEXT_LENGTH })} ({t('check.moreCharsNeeded', { count: MIN_TASK_TEXT_LENGTH - taskText.length })})
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('inputMode.answerTextLabel')} <span className="text-gray-400 font-normal">({t('inputMode.optional')})</span>
        </label>
        <textarea
          value={answerText}
          onChange={(e) => onAnswerTextChange(e.target.value)}
          placeholder={t('inputMode.answerTextPlaceholder')}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function HomeworkCheckPage() {
  const router = useRouter()
  const t = useTranslations('homework')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoRetryCountRef = useRef(0)

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('homework_checker')

  // Track page open
  useEffect(() => {
    trackStep('checker_opened', 1)
    trackFeature('homework_checker_view', { source: 'direct' })
  }, [trackStep, trackFeature])

  // Input mode: 'image' or 'text'
  const [inputMode, setInputMode] = useState<InputMode>('image')

  // Upload states (for image mode)
  const [taskImage, setTaskImage] = useState<UploadedImage | null>(null)
  const [answerImage, setAnswerImage] = useState<UploadedImage | null>(null)
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([])
  const [teacherReviews, setTeacherReviews] = useState<UploadedImage[]>([])

  // Text states (for text mode)
  const [taskText, setTaskText] = useState('')
  const [answerText, setAnswerText] = useState('')

  // Status message during submission (for HEIC conversion + upload + analysis)
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null)
  // HEIC warning modal - shows when user selects HEIC image
  const [heicWarning, setHeicWarning] = useState<HeicWarning | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  // Safe URL creation for iOS Safari compatibility
  const createSafeObjectURL = useCallback((file: File): string | null => {
    try {
      return URL.createObjectURL(file)
    } catch (err) {
      console.error('Failed to create object URL:', err)
      return null
    }
  }, [])

  // Upload handlers - show HEIC warning if needed, otherwise store file immediately
  // HEIC files show a warning modal asking user to convert or export as JPEG
  // Documents (PDF/DOCX) are handled without preview
  const handleTaskUpload = useCallback((file: File) => {
    // Check for document files first
    const docType = isDocumentFile(file)
    if (docType) {
      // Documents don't have image previews
      setTaskImage({ file, preview: null, isHeic: false, isDocument: true, docType })
      setError(null)
      trackStep('task_uploaded', 2)
      trackFeature('homework_task_upload', { fileType: file.type, fileSize: file.size, isDocument: true, docType })
      return
    }

    const heic = isHeicFile(file)
    if (heic) {
      // Show warning for HEIC files - user must confirm before proceeding
      setError(null) // Clear any previous error
      setHeicWarning({ type: 'task', file })
      return
    }
    // Non-HEIC: proceed immediately
    const preview = createSafeObjectURL(file)
    setTaskImage({ file, preview, isHeic: false })
    setError(null)
    trackStep('task_uploaded', 2)
    trackFeature('homework_task_upload', { fileType: file.type, fileSize: file.size, isHeic: false })
  }, [trackStep, trackFeature, createSafeObjectURL])

  const handleAnswerUpload = useCallback((file: File) => {
    // Check for document files first
    const docType = isDocumentFile(file)
    if (docType) {
      setAnswerImage({ file, preview: null, isHeic: false, isDocument: true, docType })
      setError(null)
      trackStep('answer_uploaded', 3)
      trackFeature('homework_answer_upload', { fileType: file.type, fileSize: file.size, isDocument: true, docType })
      return
    }

    const heic = isHeicFile(file)
    if (heic) {
      setError(null) // Clear any previous error
      setHeicWarning({ type: 'answer', file })
      return
    }
    const preview = createSafeObjectURL(file)
    setAnswerImage({ file, preview, isHeic: false })
    setError(null)
    trackStep('answer_uploaded', 3)
    trackFeature('homework_answer_upload', { fileType: file.type, fileSize: file.size, isHeic: false })
  }, [trackStep, trackFeature, createSafeObjectURL])

  const handleReferenceUpload = useCallback((file: File) => {
    // Check for document files first
    const docType = isDocumentFile(file)
    if (docType) {
      setReferenceImages(prev => [...prev, { file, preview: null, isHeic: false, isDocument: true, docType }])
      return
    }

    const heic = isHeicFile(file)
    if (heic) {
      setError(null) // Clear any previous error
      setHeicWarning({ type: 'reference', file, index: referenceImages.length })
      return
    }
    const preview = createSafeObjectURL(file)
    setReferenceImages(prev => [...prev, { file, preview, isHeic: false }])
  }, [createSafeObjectURL, referenceImages.length])

  const handleTeacherReviewUpload = useCallback((file: File) => {
    // Check for document files first
    const docType = isDocumentFile(file)
    if (docType) {
      setTeacherReviews(prev => [...prev, { file, preview: null, isHeic: false, isDocument: true, docType }])
      return
    }

    const heic = isHeicFile(file)
    if (heic) {
      setError(null) // Clear any previous error
      setHeicWarning({ type: 'review', file, index: teacherReviews.length })
      return
    }
    const preview = createSafeObjectURL(file)
    setTeacherReviews(prev => [...prev, { file, preview, isHeic: false }])
  }, [createSafeObjectURL, teacherReviews.length])

  // Handle HEIC conversion when user clicks "Try Anyway" in the warning modal
  const tryHeicConversion = useCallback(async () => {
    if (!heicWarning) return

    setIsConverting(true)
    setError(null)

    try {
      const result = await convertHeicToJpeg(heicWarning.file)

      if (result.error) {
        // Conversion failed - show error and don't proceed
        setError(result.error)
        setHeicWarning(null)
        setIsConverting(false)
        trackFeature('heic_conversion_failed', { type: heicWarning.type })
        return
      }

      // Conversion succeeded - add the converted file
      const preview = createSafeObjectURL(result.file)

      switch (heicWarning.type) {
        case 'task':
          setTaskImage({ file: result.file, preview, isHeic: false })
          trackStep('task_uploaded', 2)
          trackFeature('homework_task_upload', { fileType: result.file.type, fileSize: result.file.size, isHeic: true, converted: true })
          break
        case 'answer':
          setAnswerImage({ file: result.file, preview, isHeic: false })
          trackStep('answer_uploaded', 3)
          trackFeature('homework_answer_upload', { fileType: result.file.type, fileSize: result.file.size, isHeic: true, converted: true })
          break
        case 'reference':
          setReferenceImages(prev => [...prev, { file: result.file, preview, isHeic: false }])
          break
        case 'review':
          setTeacherReviews(prev => [...prev, { file: result.file, preview, isHeic: false }])
          break
      }

      trackFeature('heic_conversion_success', { type: heicWarning.type })
    } catch (err) {
      console.error('[HomeworkChecker/HEIC] Unexpected conversion error:', err)
      setError(formatError(ERROR_CODES.HC_HEIC_001, 'Could not convert this image. Please export it as JPEG from your Gallery app.', `HomeworkChecker/HEIC/${heicWarning.type}`))
      trackFeature('heic_conversion_error', { type: heicWarning.type, error: err instanceof Error ? err.message : 'unknown' })
    } finally {
      setHeicWarning(null)
      setIsConverting(false)
    }
  }, [heicWarning, createSafeObjectURL, trackStep, trackFeature])

  const handleSubmit = async () => {
    // Validate based on input mode
    if (inputMode === 'image') {
      if (!taskImage && !answerImage) {
        setError(formatError(ERROR_CODES.HC_VAL_001, 'Please upload at least one image', 'HomeworkChecker/ImageMode'))
        return
      }
    } else {
      // Text mode validation
      if (!taskText || taskText.trim().length < MIN_TASK_TEXT_LENGTH) {
        setError(formatError(ERROR_CODES.HC_VAL_002, `Please enter at least ${MIN_TASK_TEXT_LENGTH} characters for your question`, 'HomeworkChecker/TextMode'))
        return
      }
    }

    setIsSubmitting(true)
    setError(null)
    setSubmissionStatus(null)

    // Track submission
    trackStep('check_submitted', 4)
    trackFeature('homework_check_submit', {
      inputMode,
      hasReferences: referenceImages.length > 0,
      hasTeacherReviews: teacherReviews.length > 0,
      referenceCount: referenceImages.length,
      teacherReviewCount: teacherReviews.length,
      taskTextLength: inputMode === 'text' ? taskText.length : undefined,
      answerTextLength: inputMode === 'text' ? answerText.length : undefined,
    })

    try {
      // ============================================================================
      // TEXT MODE: Skip image upload, go directly to API with text
      // ============================================================================
      if (inputMode === 'text') {
        setSubmissionStatus(t('check.analyzingHomework'))

        // Create AbortController with timeout
        const isSafari = typeof navigator !== 'undefined' &&
          /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        const timeoutMs = isSafari ? 240000 : 210000

        const controller = new AbortController()
        let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
          controller.abort()
        }, timeoutMs)

        const clearTimeoutSafely = () => {
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
        }

        let response: Response
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

        try {
          response = await fetch('/api/homework/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              inputMode: 'text',
              taskText: taskText.trim(),
              answerText: answerText.trim() || undefined,
            }),
          })

          if (!response.ok && !response.body) {
            throw new Error(formatError(ERROR_CODES.HC_TXT_001, 'Failed to connect to analysis service. Please try again.', 'HomeworkChecker/TextMode/Connect'))
          }

          reader = response.body?.getReader() || null
          if (!reader) {
            throw new Error(formatError(ERROR_CODES.HC_TXT_002, 'Failed to start analysis stream. Please try again.', 'HomeworkChecker/TextMode/Stream'))
          }

          const decoder = new TextDecoder()
          let buffer = ''
          let check = null
          let streamError: string | null = null
          let lastHeartbeat = Date.now()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const message = JSON.parse(line)
                if (message.type === 'heartbeat') {
                  lastHeartbeat = Date.now()
                } else if (message.type === 'result') {
                  check = message.check
                } else if (message.type === 'error') {
                  streamError = message.error
                }
              } catch {
                // Ignore parse errors
              }
            }

            if (Date.now() - lastHeartbeat > 30000) {
              console.warn('[HomeworkCheck] No heartbeat for 30 seconds')
            }
          }

          clearTimeoutSafely()

          if (streamError) {
            throw new Error(formatError(ERROR_CODES.HC_TXT_003, streamError, 'HomeworkChecker/TextMode/StreamError'))
          }

          if (!check) {
            throw new Error(formatError(ERROR_CODES.HC_TXT_004, 'Analysis did not return a result. Please try again.', 'HomeworkChecker/TextMode/NoResult'))
          }

          trackStep('feedback_received', 5)
          trackFeature('homework_check_success', {
            checkId: check.id,
            subject: check.subject,
            gradeLevel: check.feedback?.gradeLevel,
            inputMode: 'text',
          })

          router.push(`/homework/${check.id}`)
          return
        } finally {
          clearTimeoutSafely()
          if (reader) {
            try {
              reader.releaseLock()
            } catch {
              // Ignore
            }
          }
        }
      }

      // ============================================================================
      // IMAGE MODE: Upload images first, then analyze
      // ============================================================================
      // Collect all files - HEIC conversion already happened at upload time
      // via the warning modal, so all files should be safe formats now
      const allFiles: File[] = []
      if (taskImage) allFiles.push(taskImage.file)
      if (answerImage) allFiles.push(answerImage.file)
      allFiles.push(...referenceImages.map(img => img.file))
      allFiles.push(...teacherReviews.map(img => img.file))

      // Upload all files to storage
      setSubmissionStatus(t('check.uploadingFiles'))

      const formData = new FormData()
      allFiles.forEach((file) => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      // Check if response is JSON before parsing
      const uploadContentType = uploadResponse.headers.get('content-type')
      if (!uploadContentType || !uploadContentType.includes('application/json')) {
        console.error('[HomeworkChecker/Upload] Non-JSON response:', uploadResponse.status)
        if (uploadResponse.status === 504 || uploadResponse.status === 503 || uploadResponse.status === 502) {
          throw new Error(formatError(ERROR_CODES.HC_UPL_001, 'Upload timeout. Please try again with fewer or smaller files.', `HomeworkChecker/Upload/Status:${uploadResponse.status}`))
        }
        throw new Error(formatError(ERROR_CODES.HC_UPL_002, 'Server error uploading files. Please try again.', `HomeworkChecker/Upload/NonJSON/Status:${uploadResponse.status}`))
      }

      let uploadData
      try {
        uploadData = await uploadResponse.json()
      } catch (parseError) {
        console.error('[HomeworkChecker/Upload] JSON parse error:', parseError)
        throw new Error(formatError(ERROR_CODES.HC_UPL_003, 'Server error parsing response. Please try again.', 'HomeworkChecker/Upload/JSONParse'))
      }

      if (!uploadResponse.ok) {
        throw new Error(formatError(ERROR_CODES.HC_UPL_004, uploadData.error || 'Failed to upload files', `HomeworkChecker/Upload/Failed/Status:${uploadResponse.status}`))
      }

      const uploadedFiles = uploadData.images

      // Map uploaded URLs back to their types based on what was uploaded
      let idx = 0
      const taskFileData = taskImage ? uploadedFiles[idx++] : undefined
      const answerFileData = answerImage ? uploadedFiles[idx++] : undefined
      const referenceImageUrls = uploadedFiles
        .slice(idx, idx + referenceImages.length)
        .map((img: { url: string }) => img.url)
      idx += referenceImages.length
      const teacherReviewUrls = uploadedFiles
        .slice(idx)
        .map((img: { url: string }) => img.url)

      if (!taskFileData && !answerFileData) {
        throw new Error(formatError(ERROR_CODES.HC_UPL_005, 'No files were uploaded successfully. Please try again.', 'HomeworkChecker/Upload/NoFiles'))
      }

      // Extract text from DOCX files (DOCX not supported by Claude Vision directly)
      let taskDocumentText: string | undefined
      let answerDocumentText: string | undefined

      if (taskImage?.docType === 'docx' && taskFileData?.storagePath) {
        setSubmissionStatus(t('check.extractingDocText'))
        try {
          const docResponse = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storagePath: taskFileData.storagePath,
              fileName: taskImage.file.name,
              fileType: 'docx',
              bucket: 'notebook-images',  // Homework checker uploads to this bucket
            }),
          })
          if (docResponse.ok) {
            const docData = await docResponse.json()
            if (docData.extractedContent?.fullText) {
              taskDocumentText = docData.extractedContent.fullText
              console.log('[HomeworkCheck] Extracted task DOCX text, length:', taskDocumentText?.length || 0)
            }
          }
        } catch (err) {
          console.error('[HomeworkCheck] Failed to extract task DOCX:', err)
          // Continue without extracted text - will use the file URL
        }
      }

      if (answerImage?.docType === 'docx' && answerFileData?.storagePath) {
        setSubmissionStatus(t('check.extractingDocText'))
        try {
          const docResponse = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storagePath: answerFileData.storagePath,
              fileName: answerImage.file.name,
              fileType: 'docx',
              bucket: 'notebook-images',  // Homework checker uploads to this bucket
            }),
          })
          if (docResponse.ok) {
            const docData = await docResponse.json()
            if (docData.extractedContent?.fullText) {
              answerDocumentText = docData.extractedContent.fullText
              console.log('[HomeworkCheck] Extracted answer DOCX text, length:', answerDocumentText?.length || 0)
            }
          }
        } catch (err) {
          console.error('[HomeworkCheck] Failed to extract answer DOCX:', err)
          // Continue without extracted text - will use the file URL
        }
      }

      const taskImageUrl = taskFileData?.url
      const answerImageUrl = answerFileData?.url

      // Step 3: Submit to homework check API (streaming response)
      // The API sends heartbeats every 5 seconds to keep mobile connections alive
      // If only one image provided, use it as taskImageUrl (the main image for analysis)
      setSubmissionStatus(t('check.analyzingHomework'))

      // Create AbortController with timeout
      // Safari/iOS needs more time due to aggressive connection management
      const isSafari = typeof navigator !== 'undefined' &&
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const timeoutMs = isSafari ? 240000 : 210000 // 4 min for Safari, 3.5 min for others

      const controller = new AbortController()
      let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        console.log(`[HomeworkCheck] Client-side timeout after ${timeoutMs / 1000}s`)
        controller.abort()
      }, timeoutMs)

      // Helper to clear timeout when we're done
      const clearTimeoutSafely = () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      }

      let response: Response
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

      try {
        response = await fetch('/api/homework/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            inputMode: 'image',
            taskImageUrl: taskImageUrl || answerImageUrl,  // Use answer as task if no task provided
            answerImageUrl: taskImageUrl ? answerImageUrl : undefined,  // Only include if we have both
            referenceImageUrls,
            teacherReviewUrls,
            // Include extracted DOCX text if available
            taskDocumentText,
            answerDocumentText,
          }),
        })

        if (!response.ok && !response.body) {
          throw new Error(formatError(ERROR_CODES.HC_IMG_001, 'Failed to connect to analysis service. Please try again.', 'HomeworkChecker/ImageMode/Connect'))
        }

        // Read streaming NDJSON response
        reader = response.body?.getReader() || null
        if (!reader) {
          throw new Error(formatError(ERROR_CODES.HC_IMG_002, 'Failed to start analysis stream. Please try again.', 'HomeworkChecker/ImageMode/Stream'))
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let check = null
        let streamError: string | null = null
        let lastHeartbeat = Date.now()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const message = JSON.parse(line)

              if (message.type === 'heartbeat') {
                // Heartbeat received - connection is alive
                lastHeartbeat = Date.now()
                console.log('[HomeworkCheck] Heartbeat:', message.elapsed, 'seconds')
              } else if (message.type === 'status') {
                console.log('[HomeworkCheck] Status:', message.status, message.checkId)
              } else if (message.type === 'result') {
                check = message.check
              } else if (message.type === 'error') {
                streamError = message.error
              }
            } catch (parseErr) {
              console.error('[HomeworkCheck] Failed to parse stream message:', line, parseErr)
            }
          }

          // Safety check: if no heartbeat for 30 seconds during stream, something's wrong
          if (Date.now() - lastHeartbeat > 30000) {
            console.warn('[HomeworkCheck] No heartbeat for 30 seconds, connection may be stale')
          }
        }

        // Clear timeout only after stream is fully read
        clearTimeoutSafely()

        // Handle any error from the stream
        if (streamError) {
          throw new Error(formatError(ERROR_CODES.HC_IMG_003, streamError, 'HomeworkChecker/ImageMode/StreamError'))
        }

        // Ensure we got a result
        if (!check) {
          throw new Error(formatError(ERROR_CODES.HC_IMG_004, 'Analysis did not return a result. Please try again.', 'HomeworkChecker/ImageMode/NoResult'))
        }

        // Track successful feedback
        trackStep('feedback_received', 5)
        trackFeature('homework_check_success', {
          checkId: check.id,
          subject: check.subject,
          gradeLevel: check.feedback?.gradeLevel,
        })

        router.push(`/homework/${check.id}`)
        return  // Exit early on success

      } finally {
        // Always clean up
        clearTimeoutSafely()
        if (reader) {
          try {
            reader.releaseLock()
          } catch {
            // Ignore if already released
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Track raw error for debugging
      trackFeature('homework_check_error', {
        error: errorMessage,
        name: err instanceof Error ? err.name : 'Unknown',
        autoRetryAttempt: autoRetryCountRef.current,
      })

      // Check if we should auto-retry transient errors (Safari fix)
      if (isTransientError(errorMessage) && autoRetryCountRef.current < MAX_AUTO_RETRIES) {
        autoRetryCountRef.current += 1
        console.log(`[HomeworkCheck] Auto-retrying (${autoRetryCountRef.current}/${MAX_AUTO_RETRIES}) after error: ${errorMessage}`)

        // Brief delay before retry
        setSubmissionStatus(t('check.retrying'))
        setTimeout(() => {
          handleSubmit()
        }, AUTO_RETRY_DELAY_MS)
        return
      }

      // Handle timeout/abort specifically with a clearer message
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutCode = inputMode === 'text' ? ERROR_CODES.HC_TXT_005 : ERROR_CODES.HC_IMG_005
        setError(formatError(timeoutCode, 'Analysis is taking longer than expected. Please try again with clearer images or fewer files.', `HomeworkChecker/${inputMode === 'text' ? 'TextMode' : 'ImageMode'}/Timeout`))
      } else {
        // Show sanitized user-friendly error message with the original error if it has a code
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        // If error already has a code (starts with [), use it directly
        if (errMsg.startsWith('[')) {
          setError(errMsg)
        } else {
          setError(sanitizeError(err))
        }
      }

      // Reset auto-retry counter on final error
      autoRetryCountRef.current = 0
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = inputMode === 'image'
    ? (taskImage || answerImage) && !isSubmitting
    : taskText.trim().length >= MIN_TASK_TEXT_LENGTH && !isSubmitting

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* HEIC Warning Modal */}
      {heicWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-4xl text-center mb-4">⚠️</div>
            <h3 className="font-semibold text-center text-gray-900 dark:text-white mb-2">
              {t('check.heicDetected')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              {t('check.heicWarning')}
            </p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2 list-decimal list-inside">
              <li>{t('check.heicStep1')}</li>
              <li>{t('check.heicStep2')}</li>
              <li>{t('check.heicStep3')}</li>
              <li>{t('check.heicStep4')}</li>
            </ol>
            <div className="space-y-3">
              <button
                onClick={tryHeicConversion}
                disabled={isConverting}
                className="w-full py-3 bg-violet-500 hover:bg-violet-600 disabled:bg-violet-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isConverting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('check.converting')}
                  </>
                ) : (
                  t('check.tryConvertingAnyway')
                )}
              </button>
              <button
                onClick={() => setHeicWarning(null)}
                disabled={isConverting}
                className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('check.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Link
            href="/homework"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('check.backToHub')}
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-2xl shadow-lg">
              📝
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t('check.pageTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('check.pageSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* How it Works */}
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 rounded-[22px] shadow-card p-5 mb-8 border border-blue-100 dark:border-blue-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>💡</span> {t('check.howItWorks')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('check.step1Title')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('check.step1Desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('check.step2Title')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('check.step2Desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('check.step3Title')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('check.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Upload Form */}
        <div className="space-y-8">
          {/* Input Mode Toggle */}
          <InputModeToggle mode={inputMode} onChange={setInputMode} />

          {/* Conditional: Image Mode */}
          {inputMode === 'image' && (
            <>
              {/* Image Uploads */}
              <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('check.uploadImages')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('check.atLeastOneImage')}</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <ImageUploader
                    label={t('check.taskQuestion')}
                    image={taskImage}
                    onUpload={handleTaskUpload}
                    onRemove={() => setTaskImage(null)}
                  />
                  <ImageUploader
                    label={t('check.yourAnswer')}
                    image={answerImage}
                    onUpload={handleAnswerUpload}
                    onRemove={() => setAnswerImage(null)}
                  />
                </div>
              </div>

              {/* Optional Uploads */}
              <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('check.optionalSection')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('check.moreContextHelp')}</p>
                <div className="space-y-6">
                  <MultiImageUploader
                    label={t('check.referenceMaterials')}
                    description="Textbook pages, notes, examples"
                    images={referenceImages}
                    onUpload={handleReferenceUpload}
                    onRemove={(index) => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                    maxImages={5}
                    icon="📚"
                  />
                  <MultiImageUploader
                    label={t('check.previousTeacherReviews')}
                    description="Past graded work to match style"
                    images={teacherReviews}
                    onUpload={handleTeacherReviewUpload}
                    onRemove={(index) => setTeacherReviews(prev => prev.filter((_, i) => i !== index))}
                    maxImages={3}
                    icon="👨‍🏫"
                  />
                </div>
              </div>
            </>
          )}

          {/* Conditional: Text Mode */}
          {inputMode === 'text' && (
            <TextInputSection
              taskText={taskText}
              answerText={answerText}
              onTaskTextChange={setTaskText}
              onAnswerTextChange={setAnswerText}
            />
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ms-1 me-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {submissionStatus || t('check.processing')}
                </>
              ) : (
                <>
                  <span className="me-2">✓</span>
                  {t('checkMyHomework')}
                </>
              )}
            </Button>
            <Link href="/homework" className="sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">
                {t('check.cancel')}
              </Button>
            </Link>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {t('check.privacyNote')}
          </p>
        </div>
      </main>
    </div>
  )
}
