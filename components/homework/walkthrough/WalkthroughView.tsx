'use client'

import { useEffect, useRef } from 'react'
import { useWalkthrough } from './useWalkthrough'
import WalkthroughHeader from './WalkthroughHeader'
import WalkthroughDiagramPanel from './WalkthroughDiagramPanel'
import WalkthroughStepPanel from './WalkthroughStepPanel'
import WalkthroughNavigation from './WalkthroughNavigation'
import WalkthroughStepChat from './WalkthroughStepChat'
import WalkthroughSkeleton from './WalkthroughSkeleton'

interface WalkthroughViewProps {
  sessionId: string
  language?: 'en' | 'he'
  onClose: () => void
}

/**
 * Full-page walkthrough container.
 * Replaces the chat view after the user clicks "Get Help".
 */
export default function WalkthroughView({
  sessionId,
  language = 'en',
  onClose,
}: WalkthroughViewProps) {
  const isHe = language === 'he'
  const hasStarted = useRef(false)

  const {
    state,
    walkthroughId,
    solution,
    stepImages,
    stepsRendered,
    totalSteps,
    error,
    currentStep,
    visitedSteps,
    isAutoPlaying,
    goToStep,
    goNext,
    goPrev,
    restart,
    toggleAutoPlay,
    startWalkthrough,
  } = useWalkthrough()

  // Start walkthrough on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true
      startWalkthrough(sessionId)
    }
  }, [sessionId, startWalkthrough])

  // Touch swipe handlers for the main content area
  const touchStartX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        if (isHe) { goNext() } else { goPrev() }
      } else {
        if (isHe) { goPrev() } else { goNext() }
      }
    }
    touchStartX.current = null
  }

  // Loading state
  if (state === 'idle' || (state === 'generating' && !solution)) {
    return (
      <div dir={isHe ? 'rtl' : 'ltr'}>
        <WalkthroughSkeleton />
      </div>
    )
  }

  // Error state (no solution at all)
  if (state === 'error' && !solution) {
    return (
      <div
        dir={isHe ? 'rtl' : 'ltr'}
        className="w-full max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg p-8 text-center"
      >
        <div className="text-red-500 dark:text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {isHe ? 'אירעה שגיאה' : 'Something went wrong'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {error || (isHe ? 'לא ניתן ליצור את ההדרכה' : 'Could not generate the walkthrough')}
        </p>
        <button
          onClick={() => startWalkthrough(sessionId)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg transition-colors"
        >
          {isHe ? 'נסה שוב' : 'Try Again'}
        </button>
      </div>
    )
  }

  // We have solution — render walkthrough
  const step = solution!.steps[currentStep]
  const isCompiling = state === 'compiling'
  const isLast = currentStep === totalSteps - 1

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      className="w-full max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
      role="region"
      aria-label={isHe ? 'הדרכה צעד אחר צעד' : 'Step-by-step walkthrough'}
    >
      {/* Header */}
      <WalkthroughHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        onClose={onClose}
        isHe={isHe}
      />

      {/* Navigation: progress bar + step dots */}
      <WalkthroughNavigation
        steps={solution!.steps}
        currentStep={currentStep}
        visitedSteps={visitedSteps}
        isAutoPlaying={isAutoPlaying}
        isHe={isHe}
        onGoToStep={goToStep}
        onNext={goNext}
        onPrev={goPrev}
        onRestart={restart}
        onToggleAutoPlay={toggleAutoPlay}
        onClose={onClose}
      />

      {/* Main content: diagram + step explanation */}
      <div
        className="flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Diagram panel */}
        <WalkthroughDiagramPanel
          currentStep={currentStep}
          stepImages={stepImages}
          isCompiling={isCompiling}
          stepDescription={step ? (isHe ? step.titleHe : step.title) : undefined}
        />

        {/* Step explanation */}
        {step && (
          <WalkthroughStepPanel
            step={step}
            currentStep={currentStep}
            isLast={isLast}
            isHe={isHe}
          />
        )}

        {/* Per-step chat */}
        {walkthroughId && (
          <WalkthroughStepChat
            walkthroughId={walkthroughId}
            stepIndex={currentStep}
            isHe={isHe}
          />
        )}
      </div>

      {/* Compilation progress indicator */}
      {isCompiling && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-500 dark:text-amber-400 text-center">
            {isHe
              ? `מעבד תרשימים... ${stepsRendered}/${totalSteps}`
              : `Compiling diagrams... ${stepsRendered}/${totalSteps}`}
          </p>
        </div>
      )}
    </div>
  )
}
