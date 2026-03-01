'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import StepDot from './StepDot'
import EngineDiagramImage from './EngineDiagramImage'

interface StepData {
  stepNumber: number
  title: string
  titleHe: string
  explanation: string
  explanationHe: string
  diagramImageUrl: string | null
  pipeline: string | null
  highlightWhat: string
}

interface StepSequencePlayerProps {
  steps: StepData[]
  language?: 'en' | 'he'
  summary?: string
  summaryHe?: string
  partial?: boolean
  onComplete?: () => void
}

const AUTOPLAY_INTERVAL = 5000 // 5 seconds per step

export default function StepSequencePlayer({
  steps,
  language = 'en',
  summary,
  summaryHe,
  partial,
  onComplete,
}: StepSequencePlayerProps) {
  const t = useTranslations('diagram')
  const isHe = language === 'he'
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0) // -1 = back, 1 = forward
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalSteps = steps.length
  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  // ─── Navigation ────────────────────────────────────────────────────────────

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= totalSteps) return
    setDirection(index > currentStep ? 1 : -1)
    setCurrentStep(index)
    setVisitedSteps(prev => new Set([...prev, index]))
  }, [currentStep, totalSteps])

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete?.()
      setIsAutoPlaying(false)
      return
    }
    goToStep(currentStep + 1)
  }, [currentStep, isLast, goToStep, onComplete])

  const goPrev = useCallback(() => {
    if (!isFirst) goToStep(currentStep - 1)
  }, [currentStep, isFirst, goToStep])

  const restart = useCallback(() => {
    setDirection(-1)
    setCurrentStep(0)
    setVisitedSteps(new Set([0]))
    setIsAutoPlaying(false)
  }, [])

  // ─── Auto-play ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(goNext, AUTOPLAY_INTERVAL)
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isAutoPlaying, goNext])

  // Stop autoplay when reaching last step
  useEffect(() => {
    if (isLast && isAutoPlaying) {
      setIsAutoPlaying(false)
    }
  }, [isLast, isAutoPlaying])

  // ─── Keyboard Navigation ──────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (isHe) { goPrev() } else { goNext() }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (isHe) { goNext() } else { goPrev() }
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsAutoPlaying(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, isHe])

  // ─── Touch Swipe ───────────────────────────────────────────────────────────

  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        if (isHe) { goNext() } else { goPrev() } // Swipe right
      } else {
        if (isHe) { goPrev() } else { goNext() } // Swipe left
      }
    }
    touchStartX.current = null
  }

  // ─── Animation Variants ────────────────────────────────────────────────────

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
      role="region"
      aria-label={t('stepSequence.ariaLabel')}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <motion.div
          className="h-full bg-violet-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        {steps.map((s, i) => (
          <StepDot
            key={i}
            stepNumber={i + 1}
            isActive={i === currentStep}
            isCompleted={visitedSteps.has(i) && i !== currentStep}
            onClick={() => goToStep(i)}
            label={isHe ? s.titleHe : s.title}
          />
        ))}
      </div>

      {/* Main content area */}
      <div
        className="relative min-h-[350px] md:min-h-[400px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="p-4 md:p-6"
          >
            {/* Step header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-bold">
                {step.stepNumber}
              </span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {isHe ? step.titleHe : step.title}
              </h3>
            </div>

            {/* Explanation */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {isHe ? step.explanationHe : step.explanation}
            </p>

            {/* Diagram */}
            {step.diagramImageUrl ? (
              <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                <EngineDiagramImage
                  imageUrl={step.diagramImageUrl}
                  pipeline={step.pipeline || undefined}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('stepSequence.diagramUnavailable')}
                </p>
              </div>
            )}

            {/* Highlight badge */}
            {step.highlightWhat && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-full">
                <span className="text-violet-600 dark:text-violet-400 text-xs">
                  {step.highlightWhat}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        {/* Left: Previous */}
        <button
          onClick={isHe ? goNext : goPrev}
          disabled={isHe ? isLast : isFirst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={t('stepSequence.previous')}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('stepSequence.previous')}</span>
        </button>

        {/* Center: Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlaying(prev => !prev)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={isAutoPlaying ? t('stepSequence.pause') : t('stepSequence.play')}
          >
            {isAutoPlaying ? (
              <Pause className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            ) : (
              <Play className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          <span className="text-xs text-gray-400 dark:text-gray-500 min-w-[40px] text-center">
            {currentStep + 1} / {totalSteps}
          </span>

          {isLast && (
            <button
              onClick={restart}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('stepSequence.restart')}
            >
              <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Right: Next */}
        <button
          onClick={isHe ? goPrev : goNext}
          disabled={isHe ? isFirst : isLast}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={t('stepSequence.next')}
        >
          <span className="hidden sm:inline">{t('stepSequence.next')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary (shown on last step) */}
      {isLast && (summary || summaryHe) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-4"
        >
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">
              {t('stepSequence.summary')}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {isHe ? summaryHe : summary}
            </p>
          </div>
        </motion.div>
      )}

      {/* Partial warning */}
      {partial && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-500 dark:text-amber-400 text-center">
            {t('stepSequence.partialWarning')}
          </p>
        </div>
      )}
    </div>
  )
}
