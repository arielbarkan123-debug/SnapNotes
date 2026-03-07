'use client'

import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import StepDot from '@/components/homework/diagram/StepDot'
import type { WalkthroughStep } from '@/types/walkthrough'

const AUTOPLAY_INTERVAL = 6000

interface WalkthroughNavigationProps {
  steps: WalkthroughStep[]
  currentStep: number
  visitedSteps: Set<number>
  isAutoPlaying: boolean
  isHe: boolean
  onGoToStep: (index: number) => void
  onNext: () => void
  onPrev: () => void
  onRestart: () => void
  onToggleAutoPlay: () => void
  onClose: () => void
}

export default function WalkthroughNavigation({
  steps,
  currentStep,
  visitedSteps,
  isAutoPlaying,
  isHe,
  onGoToStep,
  onNext,
  onPrev,
  onRestart,
  onToggleAutoPlay,
  onClose,
}: WalkthroughNavigationProps) {
  const t = useTranslations('homework')
  const totalSteps = steps.length
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  // Auto-play timer
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(onNext, AUTOPLAY_INTERVAL)
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isAutoPlaying, onNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (isHe) { onPrev() } else { onNext() }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (isHe) { onNext() } else { onPrev() }
      } else if (e.key === ' ') {
        e.preventDefault()
        onToggleAutoPlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNext, onPrev, isHe, onClose, onToggleAutoPlay])

  // Touch swipe
  const touchStartX = useRef<number | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        if (isHe) { onNext() } else { onPrev() }
      } else {
        if (isHe) { onPrev() } else { onNext() }
      }
    }
    touchStartX.current = null
  }, [isHe, onNext, onPrev])

  return (
    <>
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
            onClick={() => onGoToStep(i)}
            label={isHe ? s.titleHe : s.title}
          />
        ))}
      </div>

      {/* Touch area wrapper (wraps the main content via parent) */}
      <div
        className="hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-touch-area
      />

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <button
          type="button"
          onClick={isHe ? onNext : onPrev}
          disabled={isHe ? isLast : isFirst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('walkthrough.previous')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoPlay}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={isAutoPlaying ? 'Pause' : 'Play'}
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
              onClick={onRestart}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Restart"
            >
              <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={isHe ? onPrev : onNext}
          disabled={isHe ? isFirst : isLast}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline">{t('walkthrough.next')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}

export { type WalkthroughNavigationProps }
