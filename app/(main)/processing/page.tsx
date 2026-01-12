'use client'

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useXP } from '@/contexts/XPContext'
import { useFunnelTracking } from '@/lib/analytics'
// Import types from the dedicated types file to avoid bundling mammoth/jszip
import type { ExtractedDocument } from '@/lib/documents/types'

// ============================================================================
// Types
// ============================================================================

interface ProcessingState {
  status: 'processing' | 'success' | 'error'
  error?: string
  retryable?: boolean
  courseId?: string
  cardsGenerated?: number
  generationStatus?: 'complete' | 'partial'
  lessonsReady?: number
  totalLessons?: number
}

interface ProgressStage {
  message: string
  submessage: string
  percent: number
}

type SourceType = 'image' | 'pdf' | 'pptx' | 'docx' | 'text'

// ============================================================================
// Constants
// ============================================================================

// Maximum automatic retries for transient errors (Safari fix)
const MAX_AUTO_RETRIES = 2
const AUTO_RETRY_DELAY_MS = 2000

// Error messages that indicate transient issues and should auto-retry
const TRANSIENT_ERROR_PATTERNS = [
  'AI service is temporarily busy',
  'AI service encountered',
  'temporarily busy',
  'temporary issue',
  'try again',
  'Connection closed unexpectedly',
  'Connection error',
]

/**
 * Check if an error message indicates a transient issue that should auto-retry
 */
function isTransientError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase()
  return TRANSIENT_ERROR_PATTERNS.some(pattern =>
    lowerMessage.includes(pattern.toLowerCase())
  )
}

const IMAGE_PROGRESS_STAGES: ProgressStage[] = [
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

const DOCUMENT_PROGRESS_STAGES: ProgressStage[] = [
  {
    message: 'Processing your document...',
    submessage: 'Preparing content for analysis',
    percent: 20,
  },
  {
    message: 'Analyzing document structure...',
    submessage: 'Identifying sections and topics',
    percent: 40,
  },
  {
    message: 'Generating your study course...',
    submessage: 'Creating explanations and examples',
    percent: 65,
  },
  {
    message: 'Adding finishing touches...',
    submessage: 'Organizing sections and key points',
    percent: 85,
  },
  {
    message: 'Almost done...',
    submessage: 'Finalizing your course',
    percent: 95,
  },
]

const TEXT_PROGRESS_STAGES: ProgressStage[] = [
  {
    message: 'Analyzing your content...',
    submessage: 'Understanding topics and structure',
    percent: 15,
  },
  {
    message: 'Expanding your topics...',
    submessage: 'Adding educational content and explanations',
    percent: 35,
  },
  {
    message: 'Creating lessons...',
    submessage: 'Organizing content into bite-sized steps',
    percent: 55,
  },
  {
    message: 'Generating questions...',
    submessage: 'Creating interactive quizzes',
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

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  image: 'image',
  pdf: 'PDF',
  pptx: 'presentation',
  docx: 'document',
  text: 'text',
}

const SOURCE_TYPE_ICONS: Record<SourceType, string> = {
  image: '🖼️',
  pdf: '📄',
  pptx: '📊',
  docx: '📝',
  text: '✏️',
}

// Progress timing - faster initial stages, slower final stages
// This creates a more honest UX where we don't fake completion
const STAGE_INTERVALS = [
  2000,  // Stage 1: 2s - Quick initial feedback
  2500,  // Stage 2: 2.5s
  3000,  // Stage 3: 3s
  4000,  // Stage 4: 4s
  8000,  // Stage 5: 8s - Longer for actual generation
  15000, // Stage 6: 15s - Stay here while waiting
]

// ============================================================================
// Main Component
// ============================================================================

function ProcessingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('processing')
  const { showXP, showLevelUp } = useXP()
  const { trackStep: trackFunnelStep } = useFunnelTracking('course_creation')

  // Image params
  const imageUrl = searchParams.get('imageUrl')
  const imageUrlsParam = searchParams.get('imageUrls')
  const title = searchParams.get('title')

  // Document params
  const documentId = searchParams.get('documentId')
  const documentUrl = searchParams.get('documentUrl')
  const sourceTypeParam = searchParams.get('sourceType') as SourceType | null

  // Text params
  const textContent = searchParams.get('textContent')

  // Intensity mode param
  const intensityMode = searchParams.get('intensityMode') || 'standard'

  // State to hold document content loaded from sessionStorage
  const [documentContent, setDocumentContent] = useState<ExtractedDocument | null>(null)

  // Load document content from sessionStorage on mount
  useEffect(() => {
    if (!documentId) return
    try {
      const stored = sessionStorage.getItem(documentId)
      if (!stored) {
        return
      }
      const parsed = JSON.parse(stored)
      setDocumentContent(parsed)
      // Clean up sessionStorage after successful read
      sessionStorage.removeItem(documentId)
    } catch {
      // Failed to parse document content
    }
  }, [documentId])

  // Parse image URLs array if present
  const imageUrls = useMemo<string[] | null>(() => {
    if (!imageUrlsParam) return null
    try {
      return JSON.parse(imageUrlsParam)
    } catch {
      return null
    }
  }, [imageUrlsParam])

  // Determine source type and whether we have valid input
  const sourceType: SourceType = sourceTypeParam || (documentContent?.type as SourceType) || 'image'
  const isDocumentSource = sourceType !== 'image' && sourceType !== 'text' && documentContent !== null
  const isTextSource = sourceType === 'text' && textContent !== null && textContent.length > 0
  // For documents, we need to wait for content to load from sessionStorage
  const isWaitingForDocumentContent = documentId && !documentContent
  const hasValidInput = isTextSource || isDocumentSource || imageUrl || (imageUrls && imageUrls.length > 0)

  // Select progress stages based on source type
  const progressStages = isTextSource
    ? TEXT_PROGRESS_STAGES
    : isDocumentSource
      ? DOCUMENT_PROGRESS_STAGES
      : IMAGE_PROGRESS_STAGES

  const [state, setState] = useState<ProcessingState>({ status: 'processing' })
  const [currentStage, setCurrentStage] = useState(0)
  const [xpAwarded, setXpAwarded] = useState(0)
  const hasStartedRef = useRef(false)
  const autoRetryCountRef = useRef(0)

  // Generate a unique key for this processing session
  const processingKey = useMemo(() => {
    if (textContent) {
      // Use a hash of the text content for uniqueness
      return `processing_text_${textContent.slice(0, 50).replace(/\s+/g, '_')}_${Date.now()}`
    }
    if (documentContent) {
      return `processing_doc_${documentContent.title || documentUrl || Date.now()}`
    }
    if (imageUrls && imageUrls.length > 0) {
      return `processing_${imageUrls[0]}`
    }
    if (imageUrl) {
      return `processing_${imageUrl}`
    }
    return null
  }, [textContent, documentContent, documentUrl, imageUrls, imageUrl])

  // Redirect if no valid input (but wait for document content to potentially load)
  useEffect(() => {
    if (!hasValidInput && !isWaitingForDocumentContent) {
      router.replace('/dashboard')
    }
  }, [hasValidInput, isWaitingForDocumentContent, router])

  // Track if we're on the final waiting stage
  const [isWaitingOnFinalStage, setIsWaitingOnFinalStage] = useState(false)

  // Progress animation with variable timing per stage
  useEffect(() => {
    if (state.status !== 'processing') return

    // Get the interval for current stage (fallback to 5s if out of bounds)
    const currentInterval = STAGE_INTERVALS[currentStage] || 5000

    const timeout = setTimeout(() => {
      setCurrentStage((prev) => {
        if (prev < progressStages.length - 1) {
          return prev + 1
        }
        // On last stage, mark as waiting
        setIsWaitingOnFinalStage(true)
        return prev
      })
    }, currentInterval)

    return () => clearTimeout(timeout)
  }, [state.status, currentStage, progressStages.length])

  // Helper to handle errors with auto-retry for transient issues (Safari fix)
  const handleError = useCallback((
    errorMessage: string,
    retryable: boolean,
    processingKey: string | null,
    retryFn: () => void
  ) => {
    // Check if we should auto-retry transient errors
    if (retryable && isTransientError(errorMessage) && autoRetryCountRef.current < MAX_AUTO_RETRIES) {
      autoRetryCountRef.current += 1
      console.log(`[Processing] Auto-retrying (${autoRetryCountRef.current}/${MAX_AUTO_RETRIES}) after transient error: ${errorMessage}`)

      // Clear processing key so retry can proceed
      if (processingKey) {
        sessionStorage.removeItem(processingKey)
      }

      // Show brief "retrying" state then retry
      setState({
        status: 'processing',
      })
      setCurrentStage(0)

      // Delay then retry
      setTimeout(() => {
        retryFn()
      }, AUTO_RETRY_DELAY_MS)
      return true // Indicates retry was triggered
    }

    // No auto-retry - show error to user
    setState({
      status: 'error',
      error: errorMessage,
      retryable,
    })
    return false
  }, [])

  // API call with streaming support
  const generateCourse = useCallback(async () => {
    console.log('[Processing] generateCourse called', { hasValidInput, processingKey, autoRetry: autoRetryCountRef.current })
    if (!hasValidInput || !processingKey) {
      console.log('[Processing] Early return - no valid input or key')
      return
    }

    // Check if we're already processing (prevents duplicates on remount)
    // Skip this check during auto-retry
    const isAlreadyProcessing = sessionStorage.getItem(processingKey)
    if (isAlreadyProcessing === 'started' && autoRetryCountRef.current === 0) {
      console.log('[Processing] Already processing, skipping')
      return
    }

    // Mark as started in sessionStorage
    try {
      sessionStorage.setItem(processingKey, 'started')
      console.log('[Processing] Marked as started in sessionStorage')
    } catch (e) {
      console.warn('[Processing] sessionStorage.setItem failed:', e)
      // Ignore quota errors for processing flag - it's just a guard against double-submit
    }

    setState({ status: 'processing' })
    setCurrentStage(0)

    // Create AbortController for timeout
    // Safari/iOS needs more time due to aggressive connection management
    const isSafari = typeof navigator !== 'undefined' &&
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const timeoutMs = isSafari ? 240000 : 210000 // 4 min for Safari, 3.5 min for others

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log(`[Processing] Request timed out after ${timeoutMs / 1000}s`)
      controller.abort()
    }, timeoutMs)

    try {
      // Build request body based on source type
      const requestBody: Record<string, unknown> = {}

      if (textContent) {
        // Text-based request
        requestBody.textContent = textContent
      } else if (documentContent) {
        // Document-based request
        requestBody.documentContent = documentContent
        requestBody.documentUrl = documentUrl || undefined
      } else if (imageUrls && imageUrls.length > 0) {
        // Multiple images
        requestBody.imageUrls = imageUrls
      } else if (imageUrl) {
        // Single image (legacy)
        requestBody.imageUrl = imageUrl
      }

      if (title) {
        requestBody.title = title
      }

      // Pass intensity mode for lesson generation
      requestBody.intensityMode = intensityMode

      console.log('[Processing] Sending fetch request to /api/generate-course')
      const response = await fetch('/api/generate-course', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      console.log('[Processing] Got response:', { status: response.status, ok: response.ok })

      // Check for HTTP errors first
      if (!response.ok) {
        console.error('[Processing] HTTP error:', response.status, response.statusText)
        clearTimeout(timeoutId)
        if (processingKey) {
          sessionStorage.removeItem(processingKey)
        }
        const wasRetried = handleError(
          `Server error (${response.status}). Please try again.`,
          true,
          processingKey,
          generateCourse
        )
        if (wasRetried) return
        return
      }

      // Handle streaming response - with fallback for older browsers
      if (!response.body) {
        console.error('[Processing] No response body - trying text() fallback')
        // Fallback: read entire response as text (for older Safari)
        const text = await response.text()
        console.log('[Processing] Got text response:', text.slice(0, 200))
        const lines = text.split('\n').filter(l => l.trim())
        for (const line of lines) {
          try {
            const message = JSON.parse(line)
            if (message.type === 'success') {
              console.log('[Processing] SUCCESS from text fallback:', message.courseId)
              clearTimeout(timeoutId)
              if (processingKey) {
                sessionStorage.removeItem(processingKey)
              }
              flushSync(() => {
                setState({
                  status: 'success',
                  courseId: message.courseId,
                  cardsGenerated: message.cardsGenerated || 0,
                  generationStatus: message.generationStatus || 'complete',
                  lessonsReady: message.lessonsReady,
                  totalLessons: message.totalLessons,
                })
              })
              return
            } else if (message.type === 'error') {
              console.error('[Processing] ERROR from text fallback:', message.error)
              clearTimeout(timeoutId)
              if (processingKey) {
                sessionStorage.removeItem(processingKey)
              }
              const wasRetried = handleError(
                message.error || 'Failed to generate course',
                message.retryable ?? true,
                processingKey,
                generateCourse
              )
              if (wasRetried) return
              return
            }
          } catch {
            // Skip non-JSON lines
          }
        }
        // No success/error found in response
        throw new Error('Invalid response format')
      }

      console.log('[Processing] Starting to read stream')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Read stream
      while (true) {
        let readResult
        try {
          readResult = await reader.read()
        } catch (readError) {
          console.error('[Processing] Stream read error:', readError)
          // On read error, check if we have any complete messages in buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n').filter(l => l.trim())
            for (const line of lines) {
              try {
                const message = JSON.parse(line)
                if (message.type === 'success') {
                  console.log('[Processing] Found success in buffer after read error')
                  clearTimeout(timeoutId)
                  if (processingKey) {
                    sessionStorage.removeItem(processingKey)
                  }
                  flushSync(() => {
                    setState({
                      status: 'success',
                      courseId: message.courseId,
                      cardsGenerated: message.cardsGenerated || 0,
                      generationStatus: message.generationStatus || 'complete',
                      lessonsReady: message.lessonsReady,
                      totalLessons: message.totalLessons,
                    })
                  })
                  return
                }
              } catch {
                // Skip non-JSON
              }
            }
          }
          throw readError
        }

        const { done, value } = readResult

        if (done) {
          console.log('[Processing] Stream done')
          break
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const message = JSON.parse(line)
            console.log('[Processing] Received message:', message.type)

            switch (message.type) {
              case 'heartbeat':
                // Connection is alive, no action needed
                console.log('[Processing] Heartbeat received')
                break

              case 'progress':
                // Update UI progress (optional - we have our own progress animation)
                // You could map server progress to local progress here
                console.log('[Processing] Progress:', message.stage, message.percent)
                break

              case 'success': {
                console.log('[Processing] SUCCESS! courseId:', message.courseId)
                // Clear timeout and processing flag on success
                clearTimeout(timeoutId)
                if (processingKey) {
                  sessionStorage.removeItem(processingKey)
                }

                // CRITICAL: Use flushSync to force immediate DOM update on mobile
                // React 18 batches updates by default which can cause issues on mobile
                console.log('[Processing] Setting state to success with flushSync')
                flushSync(() => {
                  setState({
                    status: 'success',
                    courseId: message.courseId,
                    cardsGenerated: message.cardsGenerated || 0,
                    generationStatus: message.generationStatus || 'complete',
                    lessonsReady: message.lessonsReady,
                    totalLessons: message.totalLessons,
                  })
                })
                console.log('[Processing] flushSync complete, state should be updated')

                // Track course created (non-blocking)
                trackFunnelStep('course_created', 5, {
                  courseId: message.courseId,
                  cardsGenerated: message.cardsGenerated || 0,
                  sourceType: sourceType,
                })

                // Fire-and-forget gamification calls - don't block the UI
                // These run in background and won't prevent redirect
                const doGamification = async () => {
                  try {
                    const xpResponse = await fetch('/api/gamification/xp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ event: 'course_created' }),
                    })

                    if (xpResponse.ok) {
                      const xpData = await xpResponse.json()
                      setXpAwarded(xpData.xpAwarded)
                      showXP(xpData.xpAwarded)

                      if (xpData.levelUp && xpData.newLevel) {
                        setTimeout(() => showLevelUp(xpData.newLevel, xpData.newTitle), 1500)
                      }
                    }

                    // Update streak
                    fetch('/api/gamification/streak', { method: 'POST' }).catch(() => {})

                    // Check for achievements
                    fetch('/api/gamification/check', { method: 'POST' }).catch(() => {})
                  } catch {
                    // XP award failed - continue anyway
                  }
                }

                // Start gamification but don't await it
                doGamification()

                console.log('[Processing] State set and gamification started, returning')
                // Note: Redirect is now handled in SuccessView component for better mobile compatibility
                return
              }

              case 'error': {
                console.error('[Processing] ERROR from server:', message.error)
                // Clear timeout and processing flag so retry can work
                clearTimeout(timeoutId)
                if (processingKey) {
                  sessionStorage.removeItem(processingKey)
                }
                const wasRetried = handleError(
                  message.error || 'Failed to generate course',
                  message.retryable ?? true,
                  processingKey,
                  generateCourse
                )
                if (wasRetried) return
                return
              }
            }
          } catch {
            // Ignore parse errors for incomplete/malformed messages
          }
        }
      }

      // Check remaining buffer after stream ends (message might not have trailing newline)
      if (buffer.trim()) {
        console.log('[Processing] Checking remaining buffer:', buffer.slice(0, 100))
        try {
          const message = JSON.parse(buffer)
          if (message.type === 'success') {
            console.log('[Processing] SUCCESS found in remaining buffer:', message.courseId)
            clearTimeout(timeoutId)
            if (processingKey) {
              sessionStorage.removeItem(processingKey)
            }
            flushSync(() => {
              setState({
                status: 'success',
                courseId: message.courseId,
                cardsGenerated: message.cardsGenerated || 0,
                generationStatus: message.generationStatus || 'complete',
                lessonsReady: message.lessonsReady,
                totalLessons: message.totalLessons,
              })
            })
            return
          } else if (message.type === 'error') {
            console.error('[Processing] ERROR found in remaining buffer:', message.error)
            clearTimeout(timeoutId)
            if (processingKey) {
              sessionStorage.removeItem(processingKey)
            }
            const wasRetried = handleError(
              message.error || 'Failed to generate course',
              message.retryable ?? true,
              processingKey,
              generateCourse
            )
            if (wasRetried) return
            return
          }
        } catch {
          console.log('[Processing] Could not parse remaining buffer')
        }
      }

      // If we got here without success/error, something went wrong
      console.error('[Processing] Stream ended without success/error message')
      clearTimeout(timeoutId)
      if (processingKey) {
        sessionStorage.removeItem(processingKey)
      }
      const wasRetried = handleError(
        'Connection closed unexpectedly. Please try again.',
        true,
        processingKey,
        generateCourse
      )
      if (wasRetried) return

    } catch (error) {
      clearTimeout(timeoutId)
      // Clear the processing flag so retry can work
      if (processingKey) {
        sessionStorage.removeItem(processingKey)
      }

      // Handle abort/timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't auto-retry timeouts - they indicate the request is too large
        setState({
          status: 'error',
          error: 'Generation is taking longer than expected. Please try again or use a smaller document.',
          retryable: true,
        })
      } else {
        // Auto-retry connection errors
        const wasRetried = handleError(
          'Connection error. Please check your internet and try again.',
          true,
          processingKey,
          generateCourse
        )
        if (wasRetried) return
      }
    }
  }, [hasValidInput, textContent, documentContent, documentUrl, imageUrls, imageUrl, title, sourceType, processingKey, showXP, showLevelUp, trackFunnelStep, intensityMode, handleError])

  // Start generation on mount (ref prevents duplicate calls in StrictMode)
  // Wait for document content to load if we have a documentId
  useEffect(() => {
    if (!hasStartedRef.current && hasValidInput && !isWaitingForDocumentContent) {
      hasStartedRef.current = true
      generateCourse()
    }
  }, [hasValidInput, isWaitingForDocumentContent, generateCourse])

  // Handle manual retry - reset auto-retry counter
  const handleRetry = () => {
    autoRetryCountRef.current = 0 // Reset counter for fresh manual retry
    generateCourse()
  }

  if (!hasValidInput && !isWaitingForDocumentContent) {
    return null // Will redirect
  }

  // Show loading while waiting for document content
  if (isWaitingForDocumentContent) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 xs:mb-6 flex justify-center">
            <div className="w-12 h-12 xs:w-16 xs:h-16 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          </div>
          <p className="text-sm xs:text-base text-gray-500 dark:text-gray-400">{t('loadingDocument')}</p>
        </div>
      </div>
    )
  }

  const stage = progressStages[currentStage]

  // Log every render to help debug mobile issues
  console.log('[ProcessingContent] Render:', { status: state.status, courseId: state.courseId })

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {state.status === 'processing' && (
          <ProcessingView
            stage={stage}
            imageUrl={imageUrls?.[0] || imageUrl}
            sourceType={sourceType}
            documentTitle={documentContent?.title}
            textPreview={textContent?.slice(0, 100)}
            isWaitingOnFinalStage={isWaitingOnFinalStage}
            t={t}
          />
        )}

        {state.status === 'success' && (
          <SuccessView
            cardsGenerated={state.cardsGenerated || 0}
            xpAwarded={xpAwarded}
            generationStatus={state.generationStatus}
            lessonsReady={state.lessonsReady}
            totalLessons={state.totalLessons}
            courseId={state.courseId}
            t={t}
          />
        )}

        {state.status === 'error' && (
          <ErrorView
            error={state.error || 'An error occurred'}
            retryable={state.retryable}
            onRetry={handleRetry}
            t={t}
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
  imageUrl: string | null
  sourceType: SourceType
  documentTitle?: string
  textPreview?: string
  isWaitingOnFinalStage?: boolean
  t: ReturnType<typeof useTranslations<'processing'>>
}

function ProcessingView({ stage, imageUrl, sourceType, documentTitle, textPreview, isWaitingOnFinalStage, t }: ProcessingViewProps) {
  const isDocument = sourceType !== 'image' && sourceType !== 'text'
  const isText = sourceType === 'text'

  return (
    <div className="text-center">
      {/* Preview - Image, Document Icon, or Text Preview */}
      <div className="mb-6 xs:mb-8 flex justify-center">
        {isText ? (
          /* Text Preview */
          <div className="relative w-32 h-32 xs:w-40 xs:h-40 rounded-lg overflow-hidden shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 ring-4 ring-indigo-100 dark:ring-indigo-900/50 flex flex-col items-center justify-center p-3 xs:p-4">
            <span className="text-3xl xs:text-4xl mb-1 xs:mb-2">{SOURCE_TYPE_ICONS[sourceType]}</span>
            <span className="text-[10px] xs:text-xs text-gray-600 dark:text-gray-300 text-center line-clamp-3 leading-tight">
              {textPreview ? `"${textPreview}..."` : t('yourTextContent')}
            </span>
            {/* Pulse animation overlay */}
            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
          </div>
        ) : isDocument ? (
          /* Document Preview */
          <div className="relative w-28 h-36 xs:w-32 xs:h-40 rounded-lg overflow-hidden shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 ring-4 ring-indigo-100 dark:ring-indigo-900/50 flex flex-col items-center justify-center">
            <span className="text-4xl xs:text-5xl mb-1 xs:mb-2">{SOURCE_TYPE_ICONS[sourceType]}</span>
            <span className="text-[10px] xs:text-xs text-gray-500 dark:text-gray-400 uppercase font-medium px-2 text-center truncate max-w-full">
              {SOURCE_TYPE_LABELS[sourceType]}
            </span>
            {documentTitle && (
              <span className="text-[9px] xs:text-[10px] text-gray-400 dark:text-gray-500 px-2 text-center truncate max-w-full mt-1">
                {documentTitle.length > 20 ? documentTitle.slice(0, 20) + '...' : documentTitle}
              </span>
            )}
            {/* Pulse animation overlay */}
            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
          </div>
        ) : imageUrl ? (
          /* Image Preview */
          <div className="relative w-28 h-36 xs:w-32 xs:h-40 rounded-lg overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-700 ring-4 ring-indigo-100 dark:ring-indigo-900/50">
            <Image
              src={imageUrl}
              alt="Your notebook page"
              fill
              className="object-cover"
            />
            {/* Scanning animation overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-transparent animate-scan" />
          </div>
        ) : (
          /* Fallback - no preview */
          <div className="relative w-28 h-36 xs:w-32 xs:h-40 rounded-lg overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-700 ring-4 ring-indigo-100 dark:ring-indigo-900/50 flex items-center justify-center">
            <span className="text-3xl xs:text-4xl">📝</span>
            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
          </div>
        )}
      </div>

      {/* Spinner */}
      <div className="mb-4 xs:mb-6 flex justify-center">
        <div className="relative">
          <div className="w-12 h-12 xs:w-16 xs:h-16 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 xs:w-16 xs:h-16 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin" />
        </div>
      </div>

      {/* Progress Text */}
      <h2 className="text-lg xs:text-xl font-semibold text-gray-900 dark:text-white mb-1 xs:mb-2 transition-all duration-500 px-2">
        {stage.message}
      </h2>
      <p className="text-sm xs:text-base text-gray-500 dark:text-gray-400 mb-4 xs:mb-6 transition-all duration-500 px-2">
        {stage.submessage}
      </p>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
          {isWaitingOnFinalStage ? (
            /* Indeterminate progress bar when waiting on final stage */
            <div className="absolute inset-0">
              <div
                className="h-full w-1/3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-indeterminate"
              />
            </div>
          ) : (
            /* Normal progress bar */
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${stage.percent}%` }}
            />
          )}
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          {isWaitingOnFinalStage ? (
            <span className="flex items-center justify-center gap-2">
              <span>{t('generatingCourse')}</span>
              <span className="animate-pulse">...</span>
            </span>
          ) : (
            t('percentComplete', { percent: stage.percent })
          )}
        </p>
      </div>

      {/* Tips with time estimate */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 xs:p-4 text-xs xs:text-sm text-indigo-700 dark:text-indigo-300">
        <p className="font-medium mb-1 flex items-center justify-center xs:justify-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{isText ? t('tips.textTime') : isDocument ? t('tips.documentTime') : t('tips.imageTime')}</span>
        </p>
        <p className="text-indigo-600 dark:text-indigo-400 text-center xs:text-start">
          {isText
            ? t('tips.textDescription')
            : isDocument
              ? t('tips.documentDescription')
              : t('tips.imageDescription')}
        </p>
      </div>

      {/* Cancel Link */}
      <div className="mt-4 xs:mt-6">
        <Link
          href="/dashboard"
          className="text-xs xs:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-h-[44px] inline-flex items-center px-4"
        >
          {t('cancelAndReturn')}
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Success View
// ============================================================================

interface SuccessViewProps {
  cardsGenerated: number
  xpAwarded: number
  generationStatus?: 'complete' | 'partial'
  lessonsReady?: number
  totalLessons?: number
  courseId?: string
  t: ReturnType<typeof useTranslations<'processing'>>
}

function SuccessView({ cardsGenerated, xpAwarded, generationStatus, lessonsReady, totalLessons, courseId, t }: SuccessViewProps) {
  const isPartial = generationStatus === 'partial'
  const router = useRouter()
  // If no courseId, show manual button immediately
  const [redirectFailed, setRedirectFailed] = useState(!courseId)
  const [attemptedRedirect, setAttemptedRedirect] = useState(false)

  console.log('[SuccessView] Rendered with courseId:', courseId, 'redirectFailed:', redirectFailed)

  // Auto-redirect with fallback for mobile
  useEffect(() => {
    console.log('[SuccessView] useEffect triggered, courseId:', courseId)
    if (!courseId) {
      console.log('[SuccessView] No courseId, showing manual button')
      setRedirectFailed(true)
      return
    }

    console.log('[SuccessView] Setting up redirect timers')

    // Shorter initial delay for faster UX
    const redirectTimer = setTimeout(() => {
      if (attemptedRedirect) return // Prevent double redirect
      setAttemptedRedirect(true)

      console.log('[SuccessView] Attempting redirect to /course/' + courseId)

      // Use window.location directly on mobile - more reliable than router.push
      // We check for touch capability as a mobile indicator
      const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      if (isMobile) {
        console.log('[SuccessView] Mobile detected, using window.location directly')
        window.location.href = `/course/${courseId}`
      } else {
        // Desktop: try router.push first
        try {
          router.push(`/course/${courseId}`)
          console.log('[SuccessView] router.push called')
        } catch (e) {
          console.error('[SuccessView] router.push failed:', e)
          window.location.href = `/course/${courseId}`
        }
      }
    }, 1500) // Reduced from 2500ms to 1500ms

    // Set a backup timer - if we're still on this page after 4 seconds, show manual button
    const fallbackTimer = setTimeout(() => {
      console.log('[SuccessView] Fallback timer triggered - showing manual button')
      setRedirectFailed(true)
    }, 4000) // Reduced from 5000ms to 4000ms

    return () => {
      console.log('[SuccessView] Cleanup - clearing timers')
      clearTimeout(redirectTimer)
      clearTimeout(fallbackTimer)
    }
  }, [courseId, router, attemptedRedirect])

  // Manual navigation handler for mobile fallback
  const handleManualNavigation = () => {
    console.log('[SuccessView] Manual navigation clicked, courseId:', courseId)
    if (courseId) {
      // Use window.location for guaranteed navigation on mobile
      console.log('[SuccessView] Navigating via window.location to /course/' + courseId)
      window.location.href = `/course/${courseId}`
    }
  }

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
        {t('success.title')}
      </h2>

      {/* XP Badge */}
      {xpAwarded > 0 && (
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full border border-amber-200 dark:border-amber-800/50">
          <span className="text-2xl">⭐</span>
          <span className="text-amber-700 dark:text-amber-300 font-bold">
            {t('success.xpAwarded', { xp: xpAwarded })}
          </span>
        </div>
      )}

      {/* Card count badge */}
      {cardsGenerated > 0 && (
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
          <span className="text-2xl">📚</span>
          <span className="text-indigo-700 dark:text-indigo-300 font-medium">
            {cardsGenerated === 1
              ? t('success.flashcardsReady', { count: cardsGenerated })
              : t('success.flashcardsReadyPlural', { count: cardsGenerated })}
          </span>
        </div>
      )}

      {/* Partial generation info */}
      {isPartial && lessonsReady !== undefined && totalLessons !== undefined && (
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
          <span className="text-2xl">🚀</span>
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            {t('success.partialReady', { ready: lessonsReady, total: totalLessons })}
          </span>
        </div>
      )}

      {redirectFailed ? (
        /* Show manual button if auto-redirect failed (common on mobile) */
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('success.tapToView') || 'Tap the button below to view your course'}
          </p>
          <button
            onClick={handleManualNavigation}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2 text-lg"
          >
            <span>📖</span>
            {t('success.viewCourse') || 'View Your Course'}
          </button>
        </>
      ) : (
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {isPartial ? t('success.redirectingPartial') : t('success.redirecting')}
          </p>

          {/* Loading dots */}
          <div className="flex justify-center gap-1 mb-4">
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>

          {/* Always show a manual link as backup */}
          {courseId && (
            <button
              onClick={handleManualNavigation}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('success.tapIfStuck') || 'Tap here if not redirected'}
            </button>
          )}
        </>
      )}
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
  t: ReturnType<typeof useTranslations<'processing'>>
}

function ErrorView({ error, retryable, onRetry, t }: ErrorViewProps) {
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
        {t('error.title')}
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
            {t('error.tryAgain')}
          </button>
        )}

        <Link
          href="/dashboard"
          className="block w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
        >
          {t('error.uploadDifferent')}
        </Link>
      </div>

      {/* Help Text */}
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        {t('error.helpText')}
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
  const t = useTranslations('processing')
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
      </div>
    </div>
  )
}
