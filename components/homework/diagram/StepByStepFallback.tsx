'use client'

import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import EngineDiagramImage from './EngineDiagramImage'
import type { StepLayerMeta } from './types'

interface StepByStepFallbackProps {
  steps: StepLayerMeta[]
  finalImageUrl: string
  pipeline?: string
  language?: 'en' | 'he'
  onClose: () => void
}

/**
 * Fallback when step-by-step image rendering fails.
 * Shows the final diagram with text-only step explanations.
 */
export default function StepByStepFallback({
  steps,
  finalImageUrl,
  pipeline,
  language = 'en',
  onClose,
}: StepByStepFallbackProps) {
  const t = useTranslations('diagram')
  const isHe = language === 'he'
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  return (
    <div
      className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-900/10">
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          {t('stepByStep.fallbackTitle')}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('stepByStep.close')}
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Note about fallback */}
      <div className="px-4 py-2 bg-amber-50/30 dark:bg-amber-900/5 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t('stepByStep.fallbackNote')}
        </p>
      </div>

      {/* Final diagram */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <EngineDiagramImage imageUrl={finalImageUrl} pipeline={pipeline} />
      </div>

      {/* Step list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            className="cursor-pointer"
            onClick={() => setExpandedStep(expandedStep === i ? null : i)}
          >
            <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              {/* Step number */}
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-bold mt-0.5">
                {i + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {isHe ? step.labelHe : step.label}
                  </h4>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedStep === i ? 'rotate-90' : ''}`}
                  />
                </div>
                {expandedStep === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed"
                  >
                    {isHe ? step.explanationHe : step.explanation}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
