'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  type SolutionStep,
  type Subject,
  SUBJECT_COLORS,
} from '@/types/solution'
import { SolutionDiagram } from './SolutionDiagram'

interface SolutionStepComponentProps {
  step: SolutionStep
  subject: Subject
  language: 'en' | 'he'
  animate?: boolean
  animationDuration?: number
  showHint?: boolean
  showEstimatedTime?: boolean
}

/**
 * SolutionStep - Renders a single step in a solution
 *
 * Features:
 * - Animated step reveal
 * - Diagram integration
 * - Expandable hints
 * - Calculation/formula display
 */
export function SolutionStepComponent({
  step,
  subject,
  language,
  animate = true,
  animationDuration = 400,
  showHint = true,
  showEstimatedTime = false,
}: SolutionStepComponentProps) {
  const [showHintContent, setShowHintContent] = useState(false)
  const subjectColors = SUBJECT_COLORS[subject]

  // Get localized content
  const title = language === 'he' ? step.titleHe || step.title : step.title
  const explanation = language === 'he' ? step.explanationHe || step.explanation : step.explanation
  const hint = language === 'he' ? step.hintHe || step.hint : step.hint

  return (
    <motion.div
      className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={animate ? { opacity: 0, y: -20 } : undefined}
      transition={{ duration: animationDuration / 1000 }}
    >
      {/* Step header */}
      <div className="step-header flex items-start gap-3 mb-4">
        {/* Step number badge */}
        <div
          className="step-number w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: subjectColors.bg }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: subjectColors.primary }}
          >
            {step.stepNumber}
          </span>
        </div>

        {/* Step title */}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h4>
          {step.isKeyStep && (
            <span
              className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
              style={{
                backgroundColor: subjectColors.bg,
                color: subjectColors.primary,
              }}
            >
              {language === 'he' ? 'צעד מפתח' : 'Key Step'}
            </span>
          )}
        </div>

        {/* Estimated time */}
        {showEstimatedTime && step.estimatedTime && (
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{step.estimatedTime}s</span>
          </div>
        )}
      </div>

      {/* Explanation text */}
      <div className="step-explanation mb-4">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          {explanation}
        </p>
      </div>

      {/* Calculation display */}
      {step.calculation && (
        <motion.div
          className="step-calculation mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          initial={animate ? { scale: 0.95, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div
            className="font-mono text-lg text-center"
            style={{ color: subjectColors.primary }}
          >
            {step.calculation}
          </div>
        </motion.div>
      )}

      {/* Diagram */}
      {step.diagram && (
        <motion.div
          className="step-diagram mb-4"
          initial={animate ? { scale: 0.95, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <SolutionDiagram
            diagram={step.diagram}
            subject={subject}
            language={language}
            animate={animate}
            animationDuration={animationDuration}
          />
        </motion.div>
      )}

      {/* Hint section */}
      {showHint && hint && (
        <div className="step-hint mt-4">
          <button
            onClick={() => setShowHintContent(!showHintContent)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showHintContent ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span>
              {language === 'he' ? 'רמז' : 'Hint'}
            </span>
          </button>

          {showHintContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-start gap-2">
                <span className="text-amber-500">💡</span>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {hint}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}

    </motion.div>
  )
}

export default SolutionStepComponent
