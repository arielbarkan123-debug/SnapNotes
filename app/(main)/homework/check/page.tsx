'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'
import { sanitizeError } from '@/lib/utils/error-sanitizer'

// HEIC conversion is done client-side before upload because:
// - Vercel's sharp doesn't have HEIC codec support
// - Server-side heic-convert also fails on Vercel
// - heic2any works in browser via WASM
// Note: heic2any is dynamically imported to avoid SSR issues (window not defined)

// ============================================================================
// Types
// ============================================================================

interface UploadedImage {
  file: File
  preview: string | null  // null for HEIC files (Chrome can't preview them)
  isHeic: boolean  // Track if conversion needed at submit time
}

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
 * Uses dynamic import to avoid SSR issues with heic2any
 */
async function convertHeicToJpeg(file: File): Promise<HeicConversionResult> {
  if (!isHeicFile(file)) {
    return { file, converted: false }
  }

  console.log('[HEIC] Converting HEIC to JPEG:', file.name)

  try {
    // Dynamic import to avoid window not defined errors during SSR
    const heic2any = (await import('heic2any')).default

    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    })

    // heic2any can return a single blob or array of blobs
    const resultBlob = Array.isArray(blob) ? blob[0] : blob

    // Create a new File with .jpg extension
    const newFileName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
    const convertedFile = new File([resultBlob], newFileName, { type: 'image/jpeg' })

    console.log('[HEIC] Conversion successful:', newFileName)
    return { file: convertedFile, converted: true }
  } catch (error) {
    console.error('[HEIC] Conversion failed:', error)
    // Return error info so caller can show user-friendly message
    return {
      file,
      converted: false,
      error: 'Could not convert this image. Please open the photo in your Gallery app, tap Share or Export, and save as JPEG.'
    }
  }
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
            {image.preview ? (
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
                  Image ready
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
            Ready
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
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Two-button layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Take Photo Button */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 dark:active:bg-indigo-900/30 transition-colors min-h-[120px]"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Take Photo</span>
        </button>

        {/* From Gallery Button */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 dark:active:bg-indigo-900/30 transition-colors min-h-[120px]"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From Gallery</span>
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
        <span className="text-gray-400 font-normal ml-2">({images.length}/{maxImages})</span>
      </label>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
              {image.preview ? (
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
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Take Photo</span>
          </button>

          {/* From Gallery Button */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">From Gallery</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function HomeworkCheckPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('homework_checker')

  // Track page open
  useEffect(() => {
    trackStep('checker_opened', 1)
    trackFeature('homework_checker_view', { source: 'direct' })
  }, [trackStep, trackFeature])

  // Upload states
  const [taskImage, setTaskImage] = useState<UploadedImage | null>(null)
  const [answerImage, setAnswerImage] = useState<UploadedImage | null>(null)
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([])
  const [teacherReviews, setTeacherReviews] = useState<UploadedImage[]>([])
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
  const handleTaskUpload = useCallback((file: File) => {
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
      console.error('[HEIC] Unexpected conversion error:', err)
      setError('Could not convert this image. Please export it as JPEG from your Gallery app.')
      trackFeature('heic_conversion_error', { type: heicWarning.type, error: err instanceof Error ? err.message : 'unknown' })
    } finally {
      setHeicWarning(null)
      setIsConverting(false)
    }
  }, [heicWarning, createSafeObjectURL, trackStep, trackFeature])

  const handleSubmit = async () => {
    if (!taskImage && !answerImage) {
      setError('Please upload at least one image')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSubmissionStatus(null)

    // Track submission
    trackStep('check_submitted', 4)
    trackFeature('homework_check_submit', {
      hasReferences: referenceImages.length > 0,
      hasTeacherReviews: teacherReviews.length > 0,
      referenceCount: referenceImages.length,
      teacherReviewCount: teacherReviews.length,
    })

    try {
      // Collect all images - HEIC conversion already happened at upload time
      // via the warning modal, so all files should be safe formats now
      const allImages: File[] = []
      if (taskImage) allImages.push(taskImage.file)
      if (answerImage) allImages.push(answerImage.file)
      allImages.push(...referenceImages.map(img => img.file))
      allImages.push(...teacherReviews.map(img => img.file))

      // Upload all images to storage
      setSubmissionStatus('Uploading images...')

      const formData = new FormData()
      allImages.forEach((file) => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      // Check if response is JSON before parsing
      const uploadContentType = uploadResponse.headers.get('content-type')
      if (!uploadContentType || !uploadContentType.includes('application/json')) {
        console.error('[HomeworkCheck] Non-JSON upload response:', uploadResponse.status)
        if (uploadResponse.status === 504 || uploadResponse.status === 503 || uploadResponse.status === 502) {
          throw new Error('Upload timeout. Please try again with fewer or smaller images.')
        }
        throw new Error('Server error uploading images. Please try again.')
      }

      let uploadData
      try {
        uploadData = await uploadResponse.json()
      } catch (parseError) {
        console.error('[HomeworkCheck] JSON parse error:', parseError)
        throw new Error('Server error. Please try again.')
      }

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload images')
      }

      const uploadedImages = uploadData.images

      // Map uploaded URLs back to their types based on what was uploaded
      let idx = 0
      const taskImageUrl = taskImage ? uploadedImages[idx++]?.url : undefined
      const answerImageUrl = answerImage ? uploadedImages[idx++]?.url : undefined
      const referenceImageUrls = uploadedImages
        .slice(idx, idx + referenceImages.length)
        .map((img: { url: string }) => img.url)
      idx += referenceImages.length
      const teacherReviewUrls = uploadedImages
        .slice(idx)
        .map((img: { url: string }) => img.url)

      if (!taskImageUrl && !answerImageUrl) {
        throw new Error('Failed to upload images')
      }

      // Step 3: Submit to homework check API (streaming response)
      // The API sends heartbeats every 5 seconds to keep mobile connections alive
      // If only one image provided, use it as taskImageUrl (the main image for analysis)
      setSubmissionStatus('Analyzing homework...')
      const response = await fetch('/api/homework/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskImageUrl: taskImageUrl || answerImageUrl,  // Use answer as task if no task provided
          answerImageUrl: taskImageUrl ? answerImageUrl : undefined,  // Only include if we have both
          referenceImageUrls,
          teacherReviewUrls,
        }),
      })

      if (!response.ok && !response.body) {
        throw new Error('Failed to connect to analysis service. Please try again.')
      }

      // Read streaming NDJSON response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to start analysis stream. Please try again.')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let check = null
      let streamError: string | null = null

      try {
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
                // Could update UI with elapsed time: message.elapsed
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
        }
      } finally {
        reader.releaseLock()
      }

      // Handle any error from the stream
      if (streamError) {
        throw new Error(streamError)
      }

      // Ensure we got a result
      if (!check) {
        throw new Error('Analysis did not return a result. Please try again.')
      }

      // Track successful feedback
      trackStep('feedback_received', 5)
      trackFeature('homework_check_success', {
        checkId: check.id,
        subject: check.subject,
        gradeLevel: check.feedback?.gradeLevel,
      })

      router.push(`/homework/${check.id}`)
    } catch (err) {
      // Track raw error for debugging
      trackFeature('homework_check_error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      })

      // Show sanitized user-friendly error message
      setError(sanitizeError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = (taskImage || answerImage) && !isSubmitting

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* HEIC Warning Modal */}
      {heicWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-4xl text-center mb-4">⚠️</div>
            <h3 className="font-semibold text-center text-gray-900 dark:text-white mb-2">
              HEIC Image Detected
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              This image may not work on some devices. For best results:
            </p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2 list-decimal list-inside">
              <li>Open the photo in your Gallery app</li>
              <li>Tap Share or Export</li>
              <li>Save as JPEG</li>
              <li>Upload the JPEG version</li>
            </ol>
            <div className="space-y-3">
              <button
                onClick={tryHeicConversion}
                disabled={isConverting}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isConverting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Converting...
                  </>
                ) : (
                  'Try Converting Anyway'
                )}
              </button>
              <button
                onClick={() => setHeicWarning(null)}
                disabled={isConverting}
                className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
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
            Back to Homework Hub
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg">
              📝
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Homework Checker
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get feedback before you submit
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* How it Works */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 mb-8 border border-blue-100 dark:border-blue-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>💡</span> How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Upload Task</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Photo of the assignment</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Upload Answer</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Your completed work</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Get Feedback</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Instant AI review</p>
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
          {/* Image Uploads */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Upload Images</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">At least one image is required</p>
            <div className="grid md:grid-cols-2 gap-6">
              <ImageUploader
                label="Task / Question"
                image={taskImage}
                onUpload={handleTaskUpload}
                onRemove={() => setTaskImage(null)}
              />
              <ImageUploader
                label="Your Answer"
                image={answerImage}
                onUpload={handleAnswerUpload}
                onRemove={() => setAnswerImage(null)}
              />
            </div>
          </div>

          {/* Optional Uploads */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Optional</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Add more context for better feedback</p>
            <div className="space-y-6">
              <MultiImageUploader
                label="Reference Materials"
                description="Textbook pages, notes, examples"
                images={referenceImages}
                onUpload={handleReferenceUpload}
                onRemove={(index) => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                maxImages={5}
                icon="📚"
              />
              <MultiImageUploader
                label="Previous Teacher Reviews"
                description="Past graded work to match style"
                images={teacherReviews}
                onUpload={handleTeacherReviewUpload}
                onRemove={(index) => setTeacherReviews(prev => prev.filter((_, i) => i !== index))}
                maxImages={3}
                icon="👨‍🏫"
              />
            </div>
          </div>

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
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {submissionStatus || 'Processing...'}
                </>
              ) : (
                <>
                  <span className="mr-2">✓</span>
                  Check My Homework
                </>
              )}
            </Button>
            <Link href="/homework" className="sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Your uploads are private and only used to generate feedback.
          </p>
        </div>
      </main>
    </div>
  )
}
