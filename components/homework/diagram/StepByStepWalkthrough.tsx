'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import StepDot from './StepDot'
import EngineDiagramImage from './EngineDiagramImage'
import { MathText } from '@/components/ui/MathRenderer'
import type { StepLayerMeta } from './types'

interface StepByStepWalkthroughProps {
  stepImageUrls: string[]
  steps: StepLayerMeta[]
  finalImageUrl: string
  language?: 'en' | 'he'
  partial?: boolean
  onClose: () => void
}

const AUTOPLAY_INTERVAL = 6000

export default function StepByStepWalkthrough({
  stepImageUrls,
  steps,
  finalImageUrl: _finalImageUrl,
  language = 'en',
  partial,
  onClose,
}: StepByStepWalkthroughProps) {
  const t = useTranslations('diagram')
  const isHe = language === 'he'
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  // Reserved for future "show final diagram" button
  void _finalImageUrl

  const totalSteps = steps.length
  const step = steps[currentStep]
  const imageUrl = stepImageUrls[currentStep] || ''
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  // ─── Navigation ──────────────────────────────────────────────

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= totalSteps) return
    setCurrentStep(index)
    setVisitedSteps(prev => new Set([...prev, index]))
  }, [totalSteps])

  const goNext = useCallback(() => {
    if (isLast) {
      setIsAutoPlaying(false)
      return
    }
    goToStep(currentStep + 1)
  }, [currentStep, isLast, goToStep])

  const goPrev = useCallback(() => {
    if (!isFirst) goToStep(currentStep - 1)
  }, [currentStep, isFirst, goToStep])

  const restart = useCallback(() => {
    setCurrentStep(0)
    setVisitedSteps(new Set([0]))
    setIsAutoPlaying(false)
  }, [])

  // ─── Auto-play ───────────────────────────────────────────────

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(goNext, AUTOPLAY_INTERVAL)
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current) }
  }, [isAutoPlaying, goNext])

  useEffect(() => {
    if (isLast && isAutoPlaying) setIsAutoPlaying(false)
  }, [isLast, isAutoPlaying])

  // ─── Keyboard ────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { onClose(); return }
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
  }, [goNext, goPrev, isHe, onClose])

  // ─── Touch swipe ─────────────────────────────────────────────

  const touchStartX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
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

  // ─── Animation ───────────────────────────────────────────────

  const fadeVariants = {
    enter: { opacity: 0, scale: 0.98 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div
      className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
      dir={isHe ? 'rtl' : 'ltr'}
      role="region"
      aria-label={t('stepByStep.walkthroughLabel')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-violet-50/50 dark:bg-violet-900/10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            {t('stepByStep.title')}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('stepByStep.close')}
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <motion.div
          className="h-full bg-violet-600"
          animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        {steps.map((s, i) => (
          <StepDot
            key={i}
            stepNumber={i + 1}
            isActive={i === currentStep}
            isCompleted={visitedSteps.has(i) && i !== currentStep}
            onClick={() => goToStep(i)}
            label={isHe ? s.labelHe : s.label}
          />
        ))}
      </div>

      {/* Main content: stacked vertical (diagram on top, explanation card below) */}
      <div
        className="flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Diagram panel (full width) */}
        <div className="w-full p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={fadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {imageUrl ? (
                <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <EngineDiagramImage
                    imageUrl={imageUrl}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('stepByStep.renderFailed')}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Explanation card (full width, below diagram) */}
        <div className="w-full px-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl bg-violet-50/60 dark:bg-violet-900/15 border border-violet-200/60 dark:border-violet-800/40 p-4"
            >
              {/* Step badge + label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-sm font-bold">
                  {currentStep + 1}
                </span>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {isHe ? step.labelHe : step.label}
                </h3>
              </div>

              {/* Explanation with LaTeX math rendering */}
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <MathText>{isHe ? step.explanationHe : step.explanation}</MathText>
              </div>

              {/* Final step summary */}
              {isLast && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">
                    {t('stepByStep.complete')}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <button
          type="button"
          onClick={isHe ? goNext : goPrev}
          disabled={isHe ? isLast : isFirst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('stepSequence.previous')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
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

          {isLast && (
            <button
              type="button"
              onClick={restart}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={isHe ? goPrev : goNext}
          disabled={isHe ? isFirst : isLast}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline">{t('stepSequence.next')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Partial warning */}
      {partial && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-500 dark:text-amber-400 text-center">
            {t('stepByStep.partialWarning')}
          </p>
        </div>
      )}
    </div>
  )
}
