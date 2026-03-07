'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface WalkthroughDiagramPanelProps {
  currentStep: number
  stepImages: string[]
  isCompiling?: boolean
}

/**
 * Diagram panel that crossfades between step images.
 * Shows a skeleton loader while images are compiling.
 */
export default function WalkthroughDiagramPanel({
  currentStep,
  stepImages,
  isCompiling,
}: WalkthroughDiagramPanelProps) {
  const imageUrl = stepImages[currentStep] || ''

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
            <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <div className="relative w-full flex items-center justify-center p-2">
                <Image
                  src={imageUrl}
                  alt={`Step ${currentStep + 1} diagram`}
                  width={600}
                  height={400}
                  className="max-w-full h-auto object-contain"
                  unoptimized
                />
              </div>
            </div>
          ) : isCompiling ? (
            <div className="flex items-center justify-center h-48 sm:h-64 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Compiling diagram...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 sm:h-64 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Diagram not available
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
