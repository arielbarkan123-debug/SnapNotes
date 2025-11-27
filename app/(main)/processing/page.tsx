'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

// ============================================================================
// Types
// ============================================================================

interface ProcessingState {
  status: 'processing' | 'success' | 'error'
  error?: string
  retryable?: boolean
  courseId?: string
}

interface ProgressStage {
  message: string
  submessage: string
  percent: number
}

// ============================================================================
// Constants
// ============================================================================

const PROGRESS_STAGES: ProgressStage[] = [
  {
    message: 'Analyzing your notebook page...',
    submessage: 'Scanning for text, diagrams, and formulas',
    percent: 15,
  },
  {
    message: 'Reading text and diagrams...',
    submessage: 'Extracting all visible content',
    percent: 35,
  },
  {
    message: 'Understanding the structure...',
    submessage: 'Identifying topics and relationships',
    percent: 55,
  },
  {
    message: 'Generating your study course...',
    submessage: 'Creating explanations and examples',
    percent: 75,
  },
  {
    message: 'Adding finishing touches...',
    submessage: 'Organizing sections and key points',
    percent: 90,
  },
  {
    message: 'Almost done...',
    submessage: 'Finalizing your course',
    percent: 95,
  },
]

const STAGE_INTERVAL = 4000 // 4 seconds per stage

// ============================================================================
// Main Component
// ============================================================================

function ProcessingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const imageUrl = searchParams.get('imageUrl')
  const title = searchParams.get('title')

  const [state, setState] = useState<ProcessingState>({ status: 'processing' })
  const [currentStage, setCurrentStage] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  // Redirect if no image URL
  useEffect(() => {
    if (!imageUrl) {
      router.replace('/dashboard')
    }
  }, [imageUrl, router])

  // Progress animation
  useEffect(() => {
    if (state.status !== 'processing') return

    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < PROGRESS_STAGES.length - 1) {
          return prev + 1
        }
        return prev // Stay on last stage
      })
    }, STAGE_INTERVAL)

    return () => clearInterval(interval)
  }, [state.status])

  // API call
  const generateCourse = useCallback(async () => {
    if (!imageUrl) return

    setState({ status: 'processing' })
    setCurrentStage(0)

    try {
      const response = await fetch('/api/generate-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          title: title || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setState({
          status: 'error',
          error: data.error || 'Failed to generate course',
          retryable: data.retryable ?? true,
        })
        return
      }

      setState({
        status: 'success',
        courseId: data.courseId,
      })

      // Redirect to the new course
      router.push(`/course/${data.courseId}`)
    } catch (error) {
      console.error('Generation error:', error)
      setState({
        status: 'error',
        error: 'Connection error. Please check your internet and try again.',
        retryable: true,
      })
    }
  }, [imageUrl, title, router])

  // Start generation on mount
  useEffect(() => {
    if (!hasStarted && imageUrl) {
      setHasStarted(true)
      generateCourse()
    }
  }, [hasStarted, imageUrl, generateCourse])

  // Handle retry
  const handleRetry = () => {
    setHasStarted(false)
    setTimeout(() => {
      setHasStarted(true)
      generateCourse()
    }, 100)
  }

  if (!imageUrl) {
    return null // Will redirect
  }

  const stage = PROGRESS_STAGES[currentStage]

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {state.status === 'processing' && (
          <ProcessingView
            stage={stage}
            imageUrl={imageUrl}
          />
        )}

        {state.status === 'success' && (
          <SuccessView />
        )}

        {state.status === 'error' && (
          <ErrorView
            error={state.error || 'An error occurred'}
            retryable={state.retryable}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Processing View
// ============================================================================

interface ProcessingViewProps {
  stage: ProgressStage
  imageUrl: string
}

function ProcessingView({ stage, imageUrl }: ProcessingViewProps) {
  return (
    <div className="text-center">
      {/* Image Preview */}
      <div className="mb-8 flex justify-center">
        <div className="relative w-32 h-40 rounded-lg overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-700 ring-4 ring-indigo-100 dark:ring-indigo-900/50">
          <Image
            src={imageUrl}
            alt="Your notebook page"
            fill
            className="object-cover"
          />
          {/* Scanning animation overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-transparent animate-scan" />
        </div>
      </div>

      {/* Spinner */}
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin" />
        </div>
      </div>

      {/* Progress Text */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 transition-all duration-500">
        {stage.message}
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 transition-all duration-500">
        {stage.submessage}
      </p>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${stage.percent}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          {stage.percent}% complete
        </p>
      </div>

      {/* Tips */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-sm text-indigo-700 dark:text-indigo-300">
        <p className="font-medium mb-1">Did you know?</p>
        <p className="text-indigo-600 dark:text-indigo-400">
          Our AI reads handwritten notes, identifies formulas, and creates structured study materials automatically.
        </p>
      </div>

      {/* Cancel Link */}
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Cancel and return to dashboard
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Success View
// ============================================================================

function SuccessView() {
  return (
    <div className="text-center">
      {/* Success Icon */}
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        Course Created!
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        Redirecting you to your new study course...
      </p>

      {/* Loading dots */}
      <div className="flex justify-center gap-1">
        <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ============================================================================
// Error View
// ============================================================================

interface ErrorViewProps {
  error: string
  retryable?: boolean
  onRetry: () => void
}

function ErrorView({ error, retryable, onRetry }: ErrorViewProps) {
  return (
    <div className="text-center">
      {/* Error Icon */}
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {error}
      </p>

      {/* Action Buttons */}
      <div className="space-y-3">
        {retryable && (
          <button
            onClick={onRetry}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
        )}

        <Link
          href="/dashboard"
          className="block w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
        >
          Upload Different Image
        </Link>
      </div>

      {/* Help Text */}
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        If the problem persists, try uploading a clearer image or contact support.
      </p>
    </div>
  )
}

// ============================================================================
// Page Export with Suspense
// ============================================================================

export default function ProcessingPage() {
  return (
    <Suspense fallback={<ProcessingFallback />}>
      <ProcessingContent />
    </Suspense>
  )
}

function ProcessingFallback() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
