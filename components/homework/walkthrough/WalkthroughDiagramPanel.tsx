'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

interface WalkthroughDiagramPanelProps {
  currentStep: number
  stepImages: string[]
  isCompiling?: boolean
  stepDescription?: string
  onRetry?: (stepIndex: number) => void
}

/**
 * Diagram panel that crossfades between step images.
 * Features:
 * - Fixed container height to prevent layout shift
 * - Image preloading for instant transitions
 * - Tap-to-zoom lightbox
 * - Dark mode support (inverts white-background diagrams)
 * - Error retry button
 * - i18n for all strings
 */
export default function WalkthroughDiagramPanel({
  currentStep,
  stepImages,
  isCompiling,
  stepDescription,
  onRetry,
}: WalkthroughDiagramPanelProps) {
  const t = useTranslations('homework.walkthrough')
  const imageUrl = stepImages[currentStep] || ''
  const [zoomed, setZoomed] = useState(false)

  // Preload the next step's image for instant transitions
  useEffect(() => {
    const nextUrl = stepImages[currentStep + 1]
    if (nextUrl) {
      const img = new window.Image()
      img.src = nextUrl
    }
  }, [currentStep, stepImages])

  // Close zoom on Escape key
  useEffect(() => {
    if (!zoomed) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [zoomed])

  const handleRetry = useCallback(() => {
    onRetry?.(currentStep)
  }, [onRetry, currentStep])

  return (
    <div className="w-full p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
        >
          {imageUrl ? (
            <div
              className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"
              role="img"
              aria-label={stepDescription || `Step ${currentStep + 1} diagram`}
            >
              <div
                className="relative w-full flex items-center justify-center p-2 cursor-zoom-in min-h-[200px] max-h-[35vh] sm:min-h-[250px] sm:max-h-[45vh] lg:min-h-[300px] lg:max-h-[70vh]"
                onClick={() => setZoomed(true)}
              >
                <Image
                  src={imageUrl}
                  alt={stepDescription || `Step ${currentStep + 1} diagram`}
                  width={900}
                  height={600}
                  className="max-w-full max-h-full h-auto object-contain dark:invert dark:hue-rotate-180"
                  unoptimized
                />
              </div>
            </div>
          ) : isCompiling ? (
            <div
              className="flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700 min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('compilingDiagram')}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700 min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]"
            >
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('diagramNotAvailable')}
              </p>
              {onRetry && (
                <button
                  onClick={handleRetry}
                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                >
                  {t('retryDiagram')}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Zoom lightbox overlay */}
      <AnimatePresence>
        {zoomed && imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out p-4"
            onClick={() => setZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="max-w-[90vw] max-h-[90vh]"
            >
              <Image
                src={imageUrl}
                alt={stepDescription || `Step ${currentStep + 1} diagram (zoomed)`}
                width={1800}
                height={1200}
                className="max-w-full max-h-[90vh] object-contain rounded-lg dark:invert dark:hue-rotate-180"
                unoptimized
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
