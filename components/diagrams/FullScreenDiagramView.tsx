'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { type DiagramState, getDiagramTypeName, SELF_MANAGING_DIAGRAM_TYPES } from '@/components/homework/diagram/types'
import DiagramRenderer from '@/components/homework/diagram/DiagramRenderer'
import DiagramExplanationPanel, { type StepExplanation } from './DiagramExplanationPanel'

// ============================================================================
// Types
// ============================================================================

interface FullScreenDiagramViewProps {
  diagram: DiagramState
  isOpen: boolean
  onClose: () => void
  initialStep?: number
  language?: 'en' | 'he'
  /** Step explanations for the explanation panel */
  stepConfig?: StepExplanation[]
  /** Title to display (defaults to diagram type name) */
  title?: string
}

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

    // Focus first element when modal opens
    setTimeout(() => firstElement?.focus(), 50)

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

    container.addEventListener('keydown', handleTabKey)
    return () => container.removeEventListener('keydown', handleTabKey)
  }, [isOpen, containerRef])
}

// ============================================================================
// Main Component
// ============================================================================

export default function FullScreenDiagramView({
  diagram,
  isOpen,
  onClose,
  initialStep = 0,
  language = 'en',
  stepConfig,
  title,
}: FullScreenDiagramViewProps) {
  const t = useTranslations('diagram')
  const isRTL = language === 'he'

  const [currentStep, setCurrentStep] = useState(initialStep)
  const [autoPlay, setAutoPlay] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [stepAnnouncement, setStepAnnouncement] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  // Guard against invalid values
  const totalSteps = Math.max(1, diagram.totalSteps || 1)
  const displayTitle = title || getDiagramTypeName(diagram.type)

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

  // Reset step when diagram changes (with bounds checking)
  useEffect(() => {
    const safeInitialStep = Math.max(0, Math.min(initialStep || 0, totalSteps - 1))
    setCurrentStep(safeInitialStep)
  }, [diagram, initialStep, totalSteps])

  // Announce step changes for screen readers
  useEffect(() => {
    const currentStepLabel = stepConfig?.find(s => s.step === currentStep)?.stepLabel
    const announcement = currentStepLabel
      ? `${currentStepLabel}. Step ${currentStep + 1} of ${totalSteps}.`
      : `Step ${currentStep + 1} of ${totalSteps}.`
    setStepAnnouncement(announcement)
  }, [currentStep, totalSteps, stepConfig])

  // Handle container resize
  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        })
      }
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [isOpen])

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && currentStep < totalSteps - 1) {
      autoPlayRef.current = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
      }, 2000) // 2 seconds per step
    }

    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current)
      }
    }
  }, [autoPlay, currentStep, totalSteps])

  // Stop autoplay at last step
  useEffect(() => {
    if (currentStep >= totalSteps - 1 && autoPlay) {
      setAutoPlay(false)
    }
  }, [currentStep, totalSteps, autoPlay])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          if (isRTL) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
          } else {
            setCurrentStep(prev => Math.max(prev - 1, 0))
          }
          break
        case 'ArrowRight':
          if (isRTL) {
            setCurrentStep(prev => Math.max(prev - 1, 0))
          } else {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
          }
          break
        case 'Escape':
          onClose()
          break
        case ' ':
          e.preventDefault()
          setAutoPlay(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, totalSteps, isRTL])

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
  }, [totalSteps])

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step)
    setAutoPlay(false)
  }, [])

  const handleToggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => !prev)
  }, [])

  // Self-managing components have their own step controls and don't respond
  // to external currentStep changes. Let them manage their own stepping.
  const isSelfManaging = SELF_MANAGING_DIAGRAM_TYPES.has(diagram.type)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Screen reader announcement for step changes */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {stepAnnouncement}
      </div>

      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagram-dialog-title"
        aria-describedby="diagram-dialog-description"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label={isRTL ? 'חזרה וסגירה' : 'Go back and close'}
          >
            <svg className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t('back')}</span>
          </button>

          <h2 id="diagram-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-violet-500" aria-hidden="true">📊</span>
            {displayTitle}
            {totalSteps > 1 && !isSelfManaging && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                — {t('stepOf', { current: currentStep + 1, total: totalSteps })}
              </span>
            )}
          </h2>

          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('close')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Hidden description for screen readers */}
        <p id="diagram-dialog-description" className="sr-only">
          {isRTL
            ? `דיאגרמה אינטראקטיבית עם ${totalSteps} שלבים. השתמש בחצים לניווט בין השלבים.`
            : `Interactive diagram with ${totalSteps} steps. Use arrow keys to navigate between steps.`}
        </p>

        {/* Diagram Area */}
        <main
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-950 overflow-hidden"
          role="region"
          aria-label={isRTL ? 'אזור הדיאגרמה' : 'Diagram area'}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-2 w-full h-full flex items-center justify-center [&_.diagram-content]:!max-w-full"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          >
            <DiagramRenderer
              diagram={diagram}
              currentStep={isSelfManaging ? undefined : currentStep}
              animate={true}
              showControls={isSelfManaging}
              onStepAdvance={handleNext}
              onStepBack={handlePrevious}
              width={Math.max(containerSize.width - 48, 400)}
              height={Math.max(containerSize.height - 48, 300)}
              language={language}
            />
          </div>
        </main>

        {/* Explanation Panel — hidden for self-managing types that have their own controls */}
        {totalSteps > 1 && !isSelfManaging && (
          <DiagramExplanationPanel
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepConfig={stepConfig}
            onStepChange={handleStepChange}
            onPrevious={handlePrevious}
            onNext={handleNext}
            autoPlay={autoPlay}
            onToggleAutoPlay={handleToggleAutoPlay}
            language={language}
          />
        )}

        {/* Keyboard hints */}
        <footer className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center" role="contentinfo">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">←</kbd>
            {' '}
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">→</kbd>
            {' '}{t('keyboardHint')}{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Space</kbd>
            {' '}{isRTL ? 'להפעלה/עצירה' : 'to play/pause'}{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Esc</kbd>
            {' '}{isRTL ? 'לסגירה' : 'to close'}
          </p>
        </footer>
      </div>
    </div>
  )
}
