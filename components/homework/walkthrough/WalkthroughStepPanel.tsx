'use client'

import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { MathText } from '@/components/ui/MathRenderer'
import type { WalkthroughStep } from '@/types/walkthrough'
import { useTranslations } from 'next-intl'

const MarkdownWithMath = dynamic(
  () => import('@/components/prepare/MarkdownWithMath'),
  { ssr: false }
)

interface WalkthroughStepPanelProps {
  step: WalkthroughStep
  currentStep: number
  isLast: boolean
  isHe: boolean
}

/**
 * Displays the current step's explanation, equation, and final-step summary.
 */
export default function WalkthroughStepPanel({
  step,
  currentStep,
  isLast,
  isHe,
}: WalkthroughStepPanelProps) {
  const t = useTranslations('homework')

  const title = isHe ? step.titleHe : step.title
  const explanation = isHe ? step.explanationHe : step.explanation

  return (
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
          {/* Step badge + title */}
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-sm font-bold shrink-0">
              {currentStep + 1}
            </span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>

          {/* Key equation */}
          {step.equation && (
            <div className="mb-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-violet-200/40 dark:border-violet-800/30">
              <div className="text-center">
                <MathText>{`$$${step.equation}$$`}</MathText>
              </div>
            </div>
          )}

          {/* Explanation with math rendering */}
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <MarkdownWithMath className="[&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-violet-700 dark:[&_strong]:text-violet-300 [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1.5 [&_li]:my-0.5">
              {explanation}
            </MarkdownWithMath>
          </div>

          {/* Final step summary */}
          {isLast && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-700 dark:text-green-300">
                {t('walkthrough.complete')}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
