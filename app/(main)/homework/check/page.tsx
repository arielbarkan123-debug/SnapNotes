'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'

// ============================================================================
// Types
// ============================================================================

interface UploadedImage {
  file: File
  preview: string
}

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
}: {
  label: string
  description: string
  image: UploadedImage | null
  onUpload: (file: File) => void
  onRemove: () => void
  required?: boolean
  icon: string
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
            Uploaded
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
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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
          Drag & drop or click to upload
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
        <span className="text-gray-400 font-normal ml-2">({images.length}/{maxImages})</span>
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
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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

  // Handlers
  const handleTaskUpload = useCallback((file: File) => {
    setTaskImage({ file, preview: URL.createObjectURL(file) })
    trackStep('task_uploaded', 2)
    trackFeature('homework_task_upload', { fileType: file.type, fileSize: file.size })
  }, [trackStep, trackFeature])

  const handleAnswerUpload = useCallback((file: File) => {
    setAnswerImage({ file, preview: URL.createObjectURL(file) })
    trackStep('answer_uploaded', 3)
    trackFeature('homework_answer_upload', { fileType: file.type, fileSize: file.size })
  }, [trackStep, trackFeature])

  const handleReferenceUpload = useCallback((file: File) => {
    setReferenceImages(prev => [...prev, { file, preview: URL.createObjectURL(file) }])
  }, [])

  const handleTeacherReviewUpload = useCallback((file: File) => {
    setTeacherReviews(prev => [...prev, { file, preview: URL.createObjectURL(file) }])
  }, [])

  const handleSubmit = async () => {
    if (!taskImage || !answerImage) {
      setError('Please upload both the task and your answer')
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Track submission
    trackStep('check_submitted', 4)
    trackFeature('homework_check_submit', {
      hasReferences: referenceImages.length > 0,
      hasTeacherReviews: teacherReviews.length > 0,
      referenceCount: referenceImages.length,
      teacherReviewCount: teacherReviews.length,
    })

    try {
      // Step 1: Upload all images to storage
      const allImages = [
        { file: taskImage.file, type: 'task' },
        { file: answerImage.file, type: 'answer' },
        ...referenceImages.map((img, i) => ({ file: img.file, type: `ref_${i}` })),
        ...teacherReviews.map((img, i) => ({ file: img.file, type: `review_${i}` })),
      ]

      const formData = new FormData()
      allImages.forEach(({ file }, index) => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json()
        throw new Error(data.error || 'Failed to upload images')
      }

      const { images: uploadedImages } = await uploadResponse.json()

      // Map uploaded URLs back to their types
      const taskImageUrl = uploadedImages[0]?.url
      const answerImageUrl = uploadedImages[1]?.url
      const referenceImageUrls = uploadedImages
        .slice(2, 2 + referenceImages.length)
        .map((img: { url: string }) => img.url)
      const teacherReviewUrls = uploadedImages
        .slice(2 + referenceImages.length)
        .map((img: { url: string }) => img.url)

      if (!taskImageUrl || !answerImageUrl) {
        throw new Error('Failed to upload required images')
      }

      // Step 2: Submit to homework check API
      const response = await fetch('/api/homework/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskImageUrl,
          answerImageUrl,
          referenceImageUrls,
          teacherReviewUrls,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check homework')
      }

      const { check } = await response.json()

      // Track successful feedback
      trackStep('feedback_received', 5)
      trackFeature('homework_check_success', {
        checkId: check.id,
        subject: check.subject,
        gradeLevel: check.feedback?.gradeLevel,
      })

      router.push(`/homework/${check.id}`)
    } catch (err) {
      // Track error
      trackFeature('homework_check_error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = taskImage && answerImage && !isSubmitting

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
          {/* Required Uploads */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Required</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <ImageUploader
                label="Task / Question"
                description="Upload the homework task"
                image={taskImage}
                onUpload={handleTaskUpload}
                onRemove={() => setTaskImage(null)}
                required
                icon="📋"
              />
              <ImageUploader
                label="Your Answer"
                description="Upload your completed work"
                image={answerImage}
                onUpload={handleAnswerUpload}
                onRemove={() => setAnswerImage(null)}
                required
                icon="✍️"
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
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="mr-2">✓</span>
                  Check My Homework
                </>
              )}
            </Button>
            <Link href="/homework" className="sm:w-auto">
              <Button variant="outline" size="lg" className="w-full">
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
