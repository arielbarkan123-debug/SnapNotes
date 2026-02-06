'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StepSyncManager, type StepState, type StepConfig } from '@/lib/visual-learning'

interface DiagramStepControlsProps {
  /** Current step state */
  state: StepState
  /** Step configurations */
  steps: StepConfig[]
  /** Go to next step */
  onNext: () => void
  /** Go to previous step */
  onPrevious: () => void
  /** Go to specific step */
  onGoToStep: (step: number) => void
  /** Toggle auto-advance */
  onToggleAutoAdvance: () => void
  /** Reset to beginning */
  onReset: () => void
  /** Show step labels */
  showStepLabels?: boolean
  /** Show progress bar */
  showProgressBar?: boolean
  /** Compact mode */
  compact?: boolean
  /** Language */
  language?: 'en' | 'he'
  /** Additional className */
  className?: string
}

/**
 * DiagramStepControls - Navigation controls for stepped diagrams
 *
 * Features:
 * - Back/Next buttons with disabled states
 * - Step indicator dots (clickable)
 * - Play/Pause for auto-advance
 * - Progress bar
 * - Keyboard navigation support
 * - RTL support
 */
export function DiagramStepControls({
  state,
  steps,
  onNext,
  onPrevious,
  onGoToStep,
  onToggleAutoAdvance,
  onReset,
  showStepLabels = true,
  showProgressBar = true,
  compact = false,
  language = 'en',
  className = '',
}: DiagramStepControlsProps) {
  const isRTL = language === 'he'
  const { currentStep, totalSteps, isAnimating, isAutoAdvancing } = state

  // Progress percentage
  const progress = useMemo(() => {
    if (totalSteps <= 1) return 100
    return (currentStep / (totalSteps - 1)) * 100
  }, [currentStep, totalSteps])

  // Current step config
  const currentStepConfig = steps[currentStep]

  // Labels
  const labels = useMemo(() => ({
    previous: language === 'he' ? 'הקודם' : 'Previous',
    next: language === 'he' ? 'הבא' : 'Next',
    play: language === 'he' ? 'נגן' : 'Play',
    pause: language === 'he' ? 'עצור' : 'Pause',
    reset: language === 'he' ? 'התחל מחדש' : 'Restart',
    step: language === 'he' ? 'שלב' : 'Step',
    of: language === 'he' ? 'מתוך' : 'of',
    complete: language === 'he' ? 'הושלם!' : 'Complete!',
  }), [language])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if focus is in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          if (!isRTL) onNext()
          else onPrevious()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (!isRTL) onPrevious()
          else onNext()
          break
        case ' ':
          e.preventDefault()
          onToggleAutoAdvance()
          break
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            onReset()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRTL, onNext, onPrevious, onToggleAutoAdvance, onReset])

  // Can navigate?
  const canGoBack = currentStep > 0 && !isAnimating
  const canGoForward = currentStep < totalSteps - 1 && !isAnimating
  const isComplete = currentStep === totalSteps - 1

  return (
    <div
      className={`diagram-step-controls ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="region"
      aria-label={language === 'he' ? 'בקרות תרשים' : 'Diagram controls'}
    >
      {/* Progress bar */}
      {showProgressBar && (
        <div
          className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={language === 'he' ? `שלב ${currentStep + 1} מתוך ${totalSteps}` : `Step ${currentStep + 1} of ${totalSteps}`}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${progress}%`,
              backgroundColor: isComplete ? '#22c55e' : '#3b82f6',
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Step label */}
      {showStepLabels && currentStepConfig && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`text-center mb-3 ${compact ? 'text-sm' : 'text-base'}`}
          >
            <span className="text-gray-600 dark:text-gray-400">
              {labels.step} {currentStep + 1} {labels.of} {totalSteps}:
            </span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {language === 'he' && currentStepConfig.labelHe
                ? currentStepConfig.labelHe
                : currentStepConfig.label}
            </span>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-center gap-2">
        {/* Previous button */}
        <motion.button
          onClick={onPrevious}
          disabled={!canGoBack}
          whileHover={canGoBack ? { scale: 1.05 } : undefined}
          whileTap={canGoBack ? { scale: 0.95 } : undefined}
          className={`
            flex items-center gap-1 px-3 py-2 rounded-lg font-medium
            transition-colors duration-200
            ${canGoBack
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }
            ${compact ? 'text-sm' : 'text-base'}
          `}
          aria-label={labels.previous}
        >
          <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {!compact && <span>{labels.previous}</span>}
        </motion.button>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 px-2">
          {steps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => onGoToStep(index)}
              disabled={isAnimating}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={`
                w-2.5 h-2.5 rounded-full transition-all duration-200
                ${index === currentStep
                  ? 'bg-blue-500 scale-125'
                  : index < currentStep
                    ? 'bg-blue-300 dark:bg-blue-700'
                    : 'bg-gray-300 dark:bg-gray-600'
                }
                ${isAnimating ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-125'}
              `}
              aria-label={`${labels.step} ${index + 1}`}
            />
          ))}
        </div>

        {/* Play/Pause button */}
        <motion.button
          onClick={onToggleAutoAdvance}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            p-2 rounded-lg transition-colors duration-200
            ${isAutoAdvancing
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
          aria-label={isAutoAdvancing ? labels.pause : labels.play}
        >
          {isAutoAdvancing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </motion.button>

        {/* Next button */}
        <motion.button
          onClick={onNext}
          disabled={!canGoForward}
          whileHover={canGoForward ? { scale: 1.05 } : undefined}
          whileTap={canGoForward ? { scale: 0.95 } : undefined}
          className={`
            flex items-center gap-1 px-3 py-2 rounded-lg font-medium
            transition-colors duration-200
            ${canGoForward
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : isComplete
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
            ${compact ? 'text-sm' : 'text-base'}
          `}
          aria-label={isComplete ? labels.complete : labels.next}
        >
          {!compact && <span>{isComplete ? labels.complete : labels.next}</span>}
          {!isComplete && (
            <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {isComplete && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Keyboard hints (shown on larger screens) */}
      {!compact && (
        <div className="hidden sm:flex justify-center mt-2 text-xs text-gray-400 dark:text-gray-500 gap-4">
          <span>← → {language === 'he' ? 'לניווט' : 'navigate'}</span>
          <span>Space: {isAutoAdvancing ? labels.pause : labels.play}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to use StepSyncManager with React state
 */
export function useStepControls(
  steps: StepConfig[],
  options?: {
    defaultAnimationDuration?: number
    autoAdvanceDelay?: number
    onComplete?: () => void
  }
) {
  const [state, setState] = useState<StepState>({
    currentStep: 0,
    totalSteps: steps.length,
    isAnimating: false,
    isAutoAdvancing: false,
    direction: null,
  })

  const managerRef = useRef<StepSyncManager | null>(null)

  // Initialize manager
  useEffect(() => {
    managerRef.current = new StepSyncManager(
      steps,
      {
        onComplete: options?.onComplete,
      },
      {
        defaultAnimationDuration: options?.defaultAnimationDuration ?? 400,
        autoAdvanceDelay: options?.autoAdvanceDelay ?? 2000,
      }
    )

    // Subscribe to all state changes
    const unsubscribe = managerRef.current.subscribe((newState) => {
      setState(newState)
    })

    return () => {
      unsubscribe()
      managerRef.current?.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update steps if they change
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateSteps(steps)
      setState(managerRef.current.getState())
    }
  }, [steps])

  const next = useCallback(() => managerRef.current?.next(), [])
  const previous = useCallback(() => managerRef.current?.previous(), [])
  const goToStep = useCallback((step: number) => managerRef.current?.goToStep(step), [])
  const toggleAutoAdvance = useCallback(() => managerRef.current?.toggleAutoAdvance(), [])
  const reset = useCallback(() => managerRef.current?.reset(), [])

  return {
    state,
    next,
    previous,
    goToStep,
    toggleAutoAdvance,
    reset,
    manager: managerRef.current,
  }
}

export default DiagramStepControls
