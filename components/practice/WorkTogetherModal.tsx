'use client'

import { useState, useRef, useEffect, useCallback, useMemo, Component, type ReactNode } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import dynamic from 'next/dynamic'
import type { HintLevel, ConversationMessage, TutorDiagramState } from '@/lib/homework/types'
import {
  type DiagramState,
  getLatestDiagram,
} from '@/components/homework/diagram'

// ============================================================================
// Error Boundary
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
}

class WorkTogetherErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error): void {
    console.error('[WorkTogetherModal] Error:', error)
    this.props.onError?.(error)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <div className="text-red-500 dark:text-red-400 mb-3">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-700 dark:text-red-300 font-medium mb-2">Something went wrong</p>
            <p className="text-sm text-red-600 dark:text-red-400 text-center max-w-xs">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}

// ============================================================================
// Loading Components
// ============================================================================

function DiagramLoadingState() {
  return (
    <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 dark:text-gray-400 text-sm">Loading diagram...</span>
      </div>
    </div>
  )
}

// Reserved for future lazy-loaded modal content
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ModalLoadingState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600 dark:text-gray-400">Loading tutoring session...</span>
      </div>
    </div>
  )
}

// Lazy load diagram components with better loading states
const DiagramRenderer = dynamic(() => import('@/components/homework/diagram/DiagramRenderer'), {
  ssr: false,
  loading: DiagramLoadingState,
})

const FullScreenDiagramView = dynamic(() => import('@/components/diagrams/FullScreenDiagramView'), {
  ssr: false,
  loading: () => null, // Don't show loading for fullscreen since it's already in a modal
})

// ============================================================================
// Focus Trap Hook
// ============================================================================

function useFocusTrap(isOpen: boolean, containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    // Handle escape key
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closeButton = container.querySelector<HTMLButtonElement>('[aria-label*="Close"], [aria-label*="סגור"]')
        closeButton?.click()
      }
    }

    container.addEventListener('keydown', handleTabKey)
    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      container.removeEventListener('keydown', handleTabKey)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, containerRef])
}

// ============================================================================
// Types
// ============================================================================

interface PracticeQuestion {
  question: string
  correctAnswer: string
  explanation?: string
  courseId?: string
  lessonIndex?: number
  lessonTitle?: string
  cardType?: string
}

interface WorkTogetherModalProps {
  isOpen: boolean
  onClose: () => void
  question: PracticeQuestion
  userAnswer?: string
  wasCorrect?: boolean
}

interface TutorMessage extends ConversationMessage {
  diagram?: TutorDiagramState
}

// ============================================================================
// Helper Components
// ============================================================================

function MessageBubble({
  message,
  isRTL,
  index,
}: {
  message: TutorMessage
  isRTL: boolean
  index: number
}) {
  const isTutor = message.role === 'tutor'
  const messageId = `message-${index}`

  return (
    <article
      className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}
      aria-labelledby={`${messageId}-sender`}
      role="article"
    >
      <div className={`max-w-[85%] ${isTutor ? '' : 'order-last'}`}>
        {isTutor && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-sm" aria-hidden="true">
              🎓
            </div>
            <span id={`${messageId}-sender`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isRTL ? 'מורה' : 'Tutor'}
            </span>
            {message.hintLevel && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full" aria-label={isRTL ? `רמז ברמה ${message.hintLevel}` : `Hint level ${message.hintLevel}`}>
                {isRTL ? `רמז ${message.hintLevel}` : `Hint ${message.hintLevel}`}
              </span>
            )}
          </div>
        )}
        {!isTutor && (
          <span id={`${messageId}-sender`} className="sr-only">{isRTL ? 'את/ה' : 'You'}</span>
        )}
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm
            ${isTutor
              ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-md'
              : 'bg-violet-600 text-white rounded-tr-md'
            }
          `}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </article>
  )
}

function LoadingIndicator({ isRTL }: { isRTL: boolean }) {
  return (
    <div className="flex justify-start" role="status" aria-live="polite" aria-label={isRTL ? 'המורה מקליד...' : 'Tutor is typing...'}>
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-sm" aria-hidden="true">
            🎓
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isRTL ? 'מורה' : 'Tutor'}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3">
          <div className="flex gap-1" aria-hidden="true">
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="sr-only">{isRTL ? 'חושב...' : 'Thinking...'}</span>
        </div>
      </div>
    </div>
  )
}

function HintButtons({
  onRequestHint,
  disabled,
  isRTL,
}: {
  onRequestHint: (level: HintLevel) => void
  disabled: boolean
  isRTL: boolean
}) {
  const hints: { level: HintLevel; label: string; labelHe: string; icon: string; descEn: string; descHe: string }[] = [
    { level: 1, label: 'Concept', labelHe: 'רעיון', icon: '💡', descEn: 'Get help understanding the concept', descHe: 'קבל עזרה בהבנת הרעיון' },
    { level: 2, label: 'Strategy', labelHe: 'אסטרטגיה', icon: '🧭', descEn: 'Get a strategy to solve this problem', descHe: 'קבל אסטרטגיה לפתרון הבעיה' },
    { level: 3, label: 'Example', labelHe: 'דוגמה', icon: '📝', descEn: 'See a similar worked example', descHe: 'ראה דוגמה דומה מפורטת' },
    { level: 4, label: 'Guide', labelHe: 'הדרכה', icon: '🤝', descEn: 'Get step-by-step guidance', descHe: 'קבל הדרכה צעד אחר צעד' },
    { level: 5, label: 'Answer', labelHe: 'תשובה', icon: '✅', descEn: 'Show the complete answer', descHe: 'הצג את התשובה המלאה' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-1" role="group" aria-label={isRTL ? 'רמות רמזים' : 'Hint levels'}>
      {hints.map(({ level, label, labelHe, icon, descEn, descHe }) => (
        <button
          key={level}
          onClick={() => onRequestHint(level)}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            ${level === 5
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
              : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }
          `}
          aria-label={`${isRTL ? labelHe : label}: ${isRTL ? descHe : descEn}`}
          title={isRTL ? descHe : descEn}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{isRTL ? labelHe : label}</span>
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function WorkTogetherModal({
  isOpen,
  onClose,
  question,
  userAnswer,
  wasCorrect,
}: WorkTogetherModalProps) {
  const t = useTranslations('practice.page')
  const locale = useLocale()
  const isRTL = locale === 'he'

  // State
  const [conversation, setConversation] = useState<TutorMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diagramStep, setDiagramStep] = useState(0)
  const [showFullscreenDiagram, setShowFullscreenDiagram] = useState(false)
  const [sessionId] = useState(() => `practice_${Date.now()}`)
  const [retryCount, setRetryCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap for modal
  useFocusTrap(isOpen, dialogRef)

  // Body scroll lock and focus restoration
  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      previousFocus?.focus()
    }
  }, [isOpen])

  // Get current diagram from conversation
  const currentDiagram = useMemo<DiagramState | null>(() => {
    return getLatestDiagram(conversation)
  }, [conversation])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Initial tutor message
  useEffect(() => {
    if (isOpen && conversation.length === 0) {
      const initialMessage: TutorMessage = {
        role: 'tutor',
        content: isRTL
          ? `שלום! בוא נעבוד יחד על השאלה הזו. 📚\n\n**שאלה:** ${question.question}\n\n${wasCorrect === false ? `ראיתי שענית "${userAnswer || ''}" - בוא נבין למה התשובה הנכונה היא אחרת.\n\n` : ''}איך היית ניגש לפתור את זה? ספר לי מה אתה חושב.`
          : `Hi! Let's work through this together. 📚\n\n**Question:** ${question.question}\n\n${wasCorrect === false ? `I saw you answered "${userAnswer || ''}" - let's understand why the correct answer is different.\n\n` : ''}How would you approach this? Tell me what you're thinking.`,
        timestamp: new Date().toISOString(),
        pedagogicalIntent: 'probe_understanding',
      }
      setConversation([initialMessage])
    }
  }, [isOpen, conversation.length, question, userAnswer, wasCorrect, isRTL])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setConversation([])
      setInput('')
      setDiagramStep(0)
      setError(null)
      setRetryCount(0)
    }
  }, [isOpen])

  // Dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Send message to tutor with retry logic
  const sendMessage = useCallback(async (message: string, retry = false) => {
    if (!message.trim() || isLoading) return

    // Clear any previous error
    setError(null)

    // Add user message only on first try
    if (!retry) {
      const userMessage: TutorMessage = {
        role: 'student',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setConversation(prev => [...prev, userMessage])
      setInput('')
    }
    setIsLoading(true)

    try {
      const response = await fetch('/api/practice/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message,
          question: question.question,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          userAnswer,
          wasCorrect,
          conversation: conversation.map(m => ({
            role: m.role,
            content: m.content,
          })),
          language: locale,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.response) {
        const tutorMessage: TutorMessage = {
          role: 'tutor',
          content: data.response.message,
          timestamp: new Date().toISOString(),
          pedagogicalIntent: data.response.pedagogicalIntent,
          diagram: data.response.diagram,
        }
        setConversation(prev => [...prev, tutorMessage])
        setRetryCount(0) // Reset retry count on success

        // Update diagram step if new diagram
        if (data.response.diagram) {
          setDiagramStep(data.response.diagram.visibleStep || 0)
        }
      } else {
        throw new Error(data.error || 'Failed to get response from tutor')
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'

      // Auto-retry once on network errors
      if (retryCount < 1 && (errorMsg.includes('fetch') || errorMsg.includes('network'))) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => sendMessage(message, true), 1000)
        return
      }

      setError(isRTL
        ? 'מצטער, משהו השתבש. נסה שוב בבקשה.'
        : 'Sorry, something went wrong. Please try again.')

      const errorMessage: TutorMessage = {
        role: 'tutor',
        content: isRTL
          ? 'מצטער, משהו השתבש. נסה שוב בבקשה.'
          : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setConversation(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, question, userAnswer, wasCorrect, conversation, locale, isRTL, retryCount])

  // Request hint
  const requestHint = useCallback(async (level: HintLevel) => {
    if (isLoading) return
    setIsLoading(true)

    try {
      const response = await fetch('/api/practice/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          hintLevel: level,
          question: question.question,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          conversation: conversation.map(m => ({
            role: m.role,
            content: m.content,
          })),
          language: locale,
        }),
      })

      const data = await response.json()

      if (data.success && data.response) {
        const tutorMessage: TutorMessage = {
          role: 'tutor',
          content: data.response.message,
          timestamp: new Date().toISOString(),
          hintLevel: level,
          pedagogicalIntent: data.response.pedagogicalIntent,
          diagram: data.response.diagram,
        }
        setConversation(prev => [...prev, tutorMessage])

        if (data.response.diagram) {
          setDiagramStep(data.response.diagram.visibleStep || 0)
        }
      }
    } catch (error) {
      console.error('Failed to request hint:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, question, conversation, locale])

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Handle diagram step navigation
  const handleStepAdvance = useCallback(() => {
    setDiagramStep(prev => Math.min(prev + 1, (currentDiagram?.totalSteps || 10) - 1))
  }, [currentDiagram?.totalSteps])

  const handleStepBack = useCallback(() => {
    setDiagramStep(prev => Math.max(prev - 1, 0))
  }, [])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
        role="presentation"
      >
        <WorkTogetherErrorBoundary
          onError={(err) => console.error('[WorkTogether] Caught error:', err)}
          fallback={
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md mx-auto" role="alertdialog" aria-labelledby="error-title" aria-describedby="error-desc">
              <div className="text-center">
                <div className="text-red-500 mb-4" aria-hidden="true">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 id="error-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {isRTL ? 'משהו השתבש' : 'Something went wrong'}
                </h3>
                <p id="error-desc" className="text-gray-600 dark:text-gray-400 mb-4">
                  {isRTL ? 'אנא נסה שוב מאוחר יותר' : 'Please try again later'}
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                  autoFocus
                >
                  {isRTL ? 'סגור' : 'Close'}
                </button>
              </div>
            </div>
          }
        >
        <div
          ref={dialogRef}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col lg:flex-row overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          dir={isRTL ? 'rtl' : 'ltr'}
          role="dialog"
          aria-modal="true"
          aria-labelledby="work-together-title"
          aria-describedby="work-together-question"
        >
          {/* Left/Top: Diagram Area (when diagram available) */}
          {currentDiagram && (
            <div className="lg:w-[60%] lg:border-r border-b lg:border-b-0 border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-950">
              {/* Diagram Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-violet-500">📊</span>
                  {t('viewDiagram')}
                </h3>
                <button
                  onClick={() => setShowFullscreenDiagram(true)}
                  className="p-2 text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={isRTL ? 'מסך מלא' : 'Fullscreen'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>

              {/* Diagram Content */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[200px] lg:min-h-0">
                <DiagramRenderer
                  diagram={currentDiagram}
                  currentStep={diagramStep}
                  animate={true}
                  showControls={true}
                  onStepAdvance={handleStepAdvance}
                  onStepBack={handleStepBack}
                  language={locale as 'en' | 'he'}
                />
              </div>
            </div>
          )}

          {/* Right/Bottom: Chat Area */}
          <div className={`flex-1 flex flex-col ${currentDiagram ? 'lg:w-[40%]' : 'w-full'}`}>
            {/* Header */}
            <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl" aria-hidden="true">
                  👥
                </div>
                <div>
                  <h2 id="work-together-title" className="font-semibold text-gray-900 dark:text-white">
                    {t('workTogether')}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('workTogetherDesc')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={isRTL ? 'סגור' : 'Close'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {/* Question Banner */}
            <div id="work-together-question" className="px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800" role="region" aria-label={isRTL ? 'השאלה' : 'The question'}>
              <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                {question.question}
              </p>
              {wasCorrect === false && userAnswer && (
                <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
                  {isRTL ? `התשובה שלך: ${userAnswer}` : `Your answer: ${userAnswer}`}
                </p>
              )}
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              role="log"
              aria-live="polite"
              aria-label={isRTL ? 'שיחה עם המורה' : 'Conversation with tutor'}
              aria-relevant="additions"
            >
              {conversation.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  isRTL={isRTL}
                  index={idx}
                />
              ))}

              {isLoading && <LoadingIndicator isRTL={isRTL} />}

              <div ref={messagesEndRef} />
            </div>

            {/* Hint Buttons */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                <span>💡</span>
                <span>{isRTL ? 'צריך עזרה? בחר רמת רמז:' : 'Need help? Choose a hint level:'}</span>
              </p>
              <HintButtons
                onRequestHint={requestHint}
                disabled={isLoading}
                isRTL={isRTL}
              />
            </div>

            {/* Error Banner */}
            {error && (
              <div
                id="tutor-error"
                className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                    aria-label={isRTL ? 'סגור שגיאה' : 'Dismiss error'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <form onSubmit={handleSubmit} className="flex gap-2" role="form" aria-label={isRTL ? 'שלח הודעה למורה' : 'Send message to tutor'}>
                <label htmlFor="tutor-input" className="sr-only">
                  {isRTL ? 'הקלד את השאלה שלך' : 'Type your question'}
                </label>
                <textarea
                  id="tutor-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('askTutor')}
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                  aria-describedby={error ? 'tutor-error' : 'tutor-input-hint'}
                  aria-invalid={!!error}
                />
                <span id="tutor-input-hint" className="sr-only">
                  {isRTL ? 'לחץ Enter לשליחה, Shift+Enter לשורה חדשה' : 'Press Enter to send, Shift+Enter for new line'}
                </span>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label={isRTL ? 'שלח הודעה' : 'Send message'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </footer>
          </div>
        </div>
        </WorkTogetherErrorBoundary>
      </div>

      {/* Fullscreen Diagram Modal */}
      {currentDiagram && (
        <FullScreenDiagramView
          diagram={currentDiagram}
          isOpen={showFullscreenDiagram}
          onClose={() => setShowFullscreenDiagram(false)}
          initialStep={diagramStep}
          language={locale as 'en' | 'he'}
          stepConfig={currentDiagram.stepConfig?.map((s, idx) => ({
            step: 'step' in s ? (s as { step: number }).step : idx,
            stepLabel: s.stepLabel || `Step ${idx + 1}`,
            stepLabelHe: s.stepLabelHe,
            showCalculation: typeof s.showCalculation === 'string' ? s.showCalculation : undefined,
          }))}
        />
      )}
    </>
  )
}
