'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import RichTextInput from '@/components/ui/RichTextInput'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import { sanitizeError } from '@/lib/utils/error-sanitizer'

import type { InputMode } from '@/lib/homework/types'

// ============================================================================
// Error Codes for Homework Helper Page
// ============================================================================

const ERROR_CODES = {
  // Validation errors
  HH_VAL_001: 'HH_VAL_001', // No image uploaded (image mode)
  HH_VAL_002: 'HH_VAL_002', // Question text too short (text mode)

  // Upload errors
  HH_UPL_001: 'HH_UPL_001', // Upload failed

  // Session creation errors (text mode)
  HH_TXT_001: 'HH_TXT_001', // Failed to create session

  // Session creation errors (image mode)
  HH_IMG_001: 'HH_IMG_001', // Failed to create session
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
  preview: string
}

type ComfortLevel = 'new' | 'some_idea' | 'stuck'

// Minimum text length for question input
const MIN_QUESTION_TEXT_LENGTH = 10

// ============================================================================
// Image Uploader Component
// ============================================================================

function ImageUploader({
  label,
  description,
  image,
  onUpload,
  onRemove,
  required = false,
  icon,
  uploadedLabel,
  dragDropLabel,
}: {
  label: string
  description: string
  image: UploadedImage | null
  onUpload: (file: File) => void
  onRemove: () => void
  required?: boolean
  icon: string
  uploadedLabel: string
  dragDropLabel: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        onUpload(file)
      }
    },
    [onUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onUpload(file)
      }
    },
    [onUpload]
  )

  if (image) {
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative rounded-xl overflow-hidden border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="relative aspect-[4/3]">
            <Image
              src={image.preview}
              alt={label}
              fill
              className="object-contain"
            />
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
            {uploadedLabel}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-8
          transition-all duration-200 text-center
          ${isDragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-4xl mb-3">{icon}</div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {dragDropLabel}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Multi Image Uploader Component
// ============================================================================

function MultiImageUploader({
  label,
  description,
  images,
  onUpload,
  onRemove,
  maxImages = 5,
  icon,
}: {
  label: string
  description: string
  images: UploadedImage[]
  onUpload: (file: File) => void
  onRemove: (index: number) => void
  maxImages?: number
  icon: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      files.slice(0, maxImages - images.length).forEach(onUpload)
    },
    [onUpload, images.length, maxImages]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

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

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
              <Image
                src={image.preview}
                alt={`Reference ${index + 1}`}
                fill
                className="object-cover"
              />
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
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            cursor-pointer rounded-xl border-2 border-dashed p-6
            transition-all duration-200 text-center
            ${isDragging
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-3xl mb-2">{icon}</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function HomeworkHelpPage() {
  const router = useRouter()
  const t = useTranslations('homework.help')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('homework_helper')

  // Track page open
  useEffect(() => {
    trackStep('helper_opened', 1)
    trackFeature('homework_helper_view', { source: 'direct' })
  }, [trackStep, trackFeature])

  // Input mode: 'image' or 'text'
  const [inputMode, setInputMode] = useState<InputMode>('image')

  // Form states
  const [questionImage, setQuestionImage] = useState<UploadedImage | null>(null)
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([])
  const [questionText, setQuestionText] = useState('')
  const [whatTried, setWhatTried] = useState('')
  const [comfortLevel, setComfortLevel] = useState<ComfortLevel>('some_idea')

  // Safe URL creation for iOS Safari compatibility
  const createSafeObjectURL = useCallback((file: File): string | null => {
    try {
      return URL.createObjectURL(file)
    } catch (err) {
      console.error('Failed to create object URL:', err)
      setError(t('uploadError'))
      return null
    }
  }, [t])

  // Handlers
  const handleQuestionUpload = useCallback((file: File) => {
    const preview = createSafeObjectURL(file)
    if (!preview) return
    setQuestionImage({ file, preview })
    setError(null)
    trackStep('question_uploaded', 2)
    trackFeature('homework_question_upload', { fileType: file.type, fileSize: file.size })
  }, [trackStep, trackFeature, createSafeObjectURL])

  const handleReferenceUpload = useCallback((file: File) => {
    const preview = createSafeObjectURL(file)
    if (!preview) return
    setReferenceImages(prev => [...prev, { file, preview }])
  }, [createSafeObjectURL])

  const handleSubmit = async () => {
    // Validate based on input mode
    if (inputMode === 'image') {
      if (!questionImage) {
        setError(formatError(ERROR_CODES.HH_VAL_001, t('noImageError'), 'HomeworkHelper/ImageMode'))
        return
      }
    } else {
      // Text mode validation
      if (!questionText || questionText.trim().length < MIN_QUESTION_TEXT_LENGTH) {
        setError(formatError(ERROR_CODES.HH_VAL_002, t('textTooShort', { min: MIN_QUESTION_TEXT_LENGTH }), 'HomeworkHelper/TextMode'))
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    // Track context provided and session start
    trackStep('context_provided', 3)
    trackFeature('homework_helper_submit', {
      inputMode,
      comfortLevel,
      hasWhatTried: whatTried.length > 0,
      referenceCount: referenceImages.length,
      questionTextLength: inputMode === 'text' ? questionText.length : undefined,
    })

    try {
      // ============================================================================
      // TEXT MODE: Skip image upload, go directly to session creation
      // ============================================================================
      if (inputMode === 'text') {
        const sessionRes = await fetch('/api/homework/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputMode: 'text',
            questionText: questionText.trim(),
            comfortLevel,
            initialAttempt: whatTried || null,
          }),
        })

        if (!sessionRes.ok) {
          const errorData = await sessionRes.json()
          throw new Error(formatError(ERROR_CODES.HH_TXT_001, errorData.error || 'Failed to create session', `HomeworkHelper/TextMode/CreateSession/Status:${sessionRes.status}`))
        }

        const { session } = await sessionRes.json()

        trackStep('session_started', 4)
        trackFeature('homework_helper_session_start', {
          sessionId: session.id,
          comfortLevel,
          inputMode: 'text',
        })

        router.push(`/homework/${session.id}?type=help`)
        return
      }

      // ============================================================================
      // IMAGE MODE: Upload images first, then create session
      // ============================================================================
      // Step 1: Upload images
      const formData = new FormData()
      formData.append('files', questionImage!.file)
      referenceImages.forEach((img) => {
        formData.append('files', img.file)
      })

      const uploadRes = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        throw new Error(formatError(ERROR_CODES.HH_UPL_001, uploadData.error || 'Failed to upload images', `HomeworkHelper/ImageMode/Upload/Status:${uploadRes.status}`))
      }

      const { images } = uploadData
      const questionImageUrl = images[0].url
      const referenceImageUrls = images.slice(1).map((img: { url: string }) => img.url)

      // Step 2: Create the help session
      const sessionRes = await fetch('/api/homework/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMode: 'image',
          questionImageUrl,
          referenceImageUrls,
          comfortLevel,
          initialAttempt: whatTried || null,
        }),
      })

      if (!sessionRes.ok) {
        const errorData = await sessionRes.json()
        throw new Error(formatError(ERROR_CODES.HH_IMG_001, errorData.error || 'Failed to create session', `HomeworkHelper/ImageMode/CreateSession/Status:${sessionRes.status}`))
      }

      const { session } = await sessionRes.json()

      trackStep('session_started', 4)
      trackFeature('homework_helper_session_start', {
        sessionId: session.id,
        comfortLevel,
      })

      router.push(`/homework/${session.id}?type=help`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      trackFeature('homework_helper_error', {
        error: errMsg,
      })
      // If error already has a code (starts with [), use it directly
      if (errMsg.startsWith('[')) {
        setError(errMsg)
      } else {
        setError(sanitizeError(err, 'Something went wrong'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = inputMode === 'image'
    ? questionImage && !isSubmitting
    : questionText.trim().length >= MIN_QUESTION_TEXT_LENGTH && !isSubmitting

  const comfortOptions: { value: ComfortLevel; labelKey: 'comfortNew' | 'comfortSomeIdea' | 'comfortStuck'; icon: string; descKey: 'comfortNewDesc' | 'comfortSomeIdeaDesc' | 'comfortStuckDesc' }[] = [
    { value: 'new', labelKey: 'comfortNew', icon: '🌱', descKey: 'comfortNewDesc' },
    { value: 'some_idea', labelKey: 'comfortSomeIdea', icon: '💭', descKey: 'comfortSomeIdeaDesc' },
    { value: 'stuck', labelKey: 'comfortStuck', icon: '🤔', descKey: 'comfortStuckDesc' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
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
            {t('backToHub')}
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl shadow-lg">
              🎓
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t('pageTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('pageSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* How it Works */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-[22px] shadow-card p-5 mb-8 border border-purple-100 dark:border-purple-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>🎓</span> {t('socraticTitle')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('socraticDesc')}
          </p>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">❓</span>
              <span className="text-gray-700 dark:text-gray-300">{t('stepQuestions')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">💡</span>
              <span className="text-gray-700 dark:text-gray-300">{t('stepHints')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">🧠</span>
              <span className="text-gray-700 dark:text-gray-300">{t('stepThink')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">🎉</span>
              <span className="text-gray-700 dark:text-gray-300">{t('stepSolve')}</span>
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
        <div className="space-y-6">
          {/* Question Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-5">{t('yourQuestion')}</h3>

            {/* Input Mode Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('howToSubmit')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInputMode('image')}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${inputMode === 'image'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                    }
                  `}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    inputMode === 'image' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className={`text-sm font-medium ${
                    inputMode === 'image' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t('uploadImage')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${inputMode === 'text'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                    }
                  `}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    inputMode === 'text' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <span className={`text-sm font-medium ${
                    inputMode === 'text' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t('pasteText')}
                  </span>
                </button>
              </div>
            </div>

            {/* Conditional: Image Mode */}
            {inputMode === 'image' && (
              <ImageUploader
                label={t('homeworkQuestion')}
                description={t('uploadProblem')}
                image={questionImage}
                onUpload={handleQuestionUpload}
                onRemove={() => setQuestionImage(null)}
                required
                icon="❓"
                uploadedLabel={t('uploaded')}
                dragDropLabel={t('dragDropOrClick')}
              />
            )}

            {/* Conditional: Text Mode */}
            {inputMode === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('questionLabel')} <span className="text-red-500">*</span>
                </label>
                <RichTextInput
                  value={questionText}
                  onChange={setQuestionText}
                  placeholder={t('questionPlaceholder')}
                  minHeight="144px"
                />
                {questionText.length > 0 && questionText.length < MIN_QUESTION_TEXT_LENGTH && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    {t('minCharsNeeded', { min: MIN_QUESTION_TEXT_LENGTH, remaining: MIN_QUESTION_TEXT_LENGTH - questionText.length })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reference Materials - only show in image mode */}
          {inputMode === 'image' && (
            <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('referenceMaterials')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('referenceDesc')}</p>
              <MultiImageUploader
                label={t('references')}
                description={t('addContext')}
                images={referenceImages}
                onUpload={handleReferenceUpload}
                onRemove={(index) => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                maxImages={10}
                icon="📚"
              />
            </div>
          )}

          {/* Context */}
          <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-5">{t('tellMeMore')}</h3>

            {/* Comfort Level */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('comfortLabel')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {comfortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setComfortLevel(option.value)}
                    className={`
                      p-4 rounded-xl border-2 text-center transition-all
                      ${comfortLevel === option.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                      }
                    `}
                  >
                    <div className="text-2xl mb-1">{option.icon}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{t(option.labelKey)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">{t(option.descKey)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* What Tried */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('whatTriedLabel')}
                <span className="text-gray-400 font-normal ms-1">({t('whatTriedOptional')})</span>
              </label>
              <textarea
                value={whatTried}
                onChange={(e) => setWhatTried(e.target.value)}
                placeholder={t('whatTriedPlaceholder')}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1 !bg-gradient-to-r !from-purple-500 !to-pink-600 hover:!from-purple-600 hover:!to-pink-700"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ms-1 me-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('startingSession')}
                </>
              ) : (
                <>
                  <span className="me-2">💡</span>
                  {t('getHelp')}
                </>
              )}
            </Button>
            <Link href="/homework" className="sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">
                {t('cancel')}
              </Button>
            </Link>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {t('privacyNote')}
          </p>
        </div>
      </main>
    </div>
  )
}
