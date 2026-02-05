'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { COLORS, getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { prefersReducedMotion } from '@/lib/diagram-animations'

// ============================================================================
// Types
// ============================================================================

export interface CompletingSquareStep {
  step: number
  type: 'identify' | 'isolate' | 'half_b' | 'square_it' | 'add_both' | 'factor_left' | 'sqrt_both' | 'solve' | 'complete'
  description: string
  descriptionHe?: string
  leftSide: string
  rightSide: string
  calculation?: string
  highlightValue?: string
  highlighted?: boolean
}

export interface CompletingSquareData {
  /** Original equation (e.g., "x² + 6x + 5 = 0") */
  originalEquation: string
  /** Coefficient of x² (should be 1 after normalization) */
  a: number
  /** Coefficient of x */
  b: number
  /** Constant term */
  c: number
  /** Half of b: b/2 */
  halfB: number
  /** (b/2)² - the number we add to both sides */
  squaredHalfB: number
  /** Variable being solved */
  variable: string
  /** Solutions (could be 1 or 2) */
  solutions: string[]
  /** Vertex form result (e.g., "(x + 3)² = 4") */
  vertexForm: string
  /** All steps */
  steps: CompletingSquareStep[]
  /** Title */
  title?: string
}

interface CompletingSquareStepsProps {
  data: CompletingSquareData
  currentStep?: number
  totalSteps?: number
  animationDuration?: number
  onStepComplete?: () => void
  width?: number
  height?: number
  className?: string
  language?: 'en' | 'he'
  showStepCounter?: boolean
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
}

// ============================================================================
// Component
// ============================================================================

export function CompletingSquareSteps({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  animationDuration = 400,
  width = 440,
  className = '',
  language = 'en',
  showStepCounter = true,
  subject = 'math',
  complexity = 'middle_school',
}: CompletingSquareStepsProps) {
  const { originalEquation, b, halfB, squaredHalfB, variable, solutions, vertexForm, steps, title } = data
  const reducedMotion = prefersReducedMotion()
  void animationDuration // reserved for future animation customization

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])
  void adaptiveLineWeight // available for future line weight customization

  const actualTotalSteps = totalStepsProp ?? steps.length
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100
  const isComplete = currentStep >= steps.length - 1

  const visibleSteps = useMemo(() => steps.filter((s) => s.step <= currentStep), [steps, currentStep])
  const currentStepInfo = steps[currentStep] || null

  // Animation variants
  const stepVariants: Variants = {
    hidden: { opacity: 0, y: -15, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 },
    },
    exit: { opacity: 0, y: 10, scale: 0.95 },
  }

  const highlightVariants: Variants = {
    initial: { backgroundColor: 'transparent' },
    highlight: {
      backgroundColor: ['rgba(251, 191, 36, 0)', 'rgba(251, 191, 36, 0.3)', 'rgba(251, 191, 36, 0)'],
      transition: { duration: 1.5, repeat: Infinity },
    },
  }

  // Get step icon based on type
  const getStepIcon = (type: CompletingSquareStep['type']): string => {
    const icons: Record<CompletingSquareStep['type'], string> = {
      identify: '🔍',
      isolate: '➡️',
      half_b: '½',
      square_it: '²',
      add_both: '➕',
      factor_left: '📦',
      sqrt_both: '√',
      solve: '🧮',
      complete: '✅',
    }
    return icons[type] || '📝'
  }

  // Get step label
  const getStepLabel = (type: CompletingSquareStep['type']): { en: string; he: string } => {
    const labels: Record<CompletingSquareStep['type'], { en: string; he: string }> = {
      identify: { en: 'Identify', he: 'זיהוי' },
      isolate: { en: 'Isolate', he: 'בידוד' },
      half_b: { en: 'Half of b', he: 'חצי מ-b' },
      square_it: { en: 'Square it', he: 'העלה בריבוע' },
      add_both: { en: 'Add to both sides', he: 'הוסף לשני הצדדים' },
      factor_left: { en: 'Factor left side', he: 'פרק צד שמאל' },
      sqrt_both: { en: 'Square root', he: 'שורש ריבועי' },
      solve: { en: 'Solve for x', he: 'פתור עבור x' },
      complete: { en: 'Complete!', he: 'הושלם!' },
    }
    return labels[type] || { en: 'Step', he: 'שלב' }
  }

  return (
    <div className={`completing-square-steps ${className}`} style={{ width }}>
      {/* Header */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.3 }}
      >
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2">
            {title}
          </h3>
        )}
        <div className="text-center text-sm text-purple-600 dark:text-purple-400 font-medium mb-3">
          {language === 'he' ? 'השלמה לריבוע' : 'Completing the Square'}
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.5 }}
            style={{
              background: isComplete
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : `linear-gradient(90deg, ${subjectColors.dark}, ${subjectColors.primary})`,
            }}
          />
        </div>
      </motion.div>

      {/* Original Equation */}
      <motion.div
        className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-4 mb-4 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {language === 'he' ? 'משוואה:' : 'Equation:'}
        </div>
        <div className="text-2xl font-mono font-bold text-purple-700 dark:text-purple-300">
          {originalEquation}
        </div>
      </motion.div>

      {/* Key Values Box */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <motion.div
            className="p-3 rounded-lg"
            variants={highlightVariants}
            initial="initial"
            animate={currentStepInfo?.type === 'half_b' ? 'highlight' : 'initial'}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">b</div>
            <div className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">{b}</div>
          </motion.div>
          <motion.div
            className="p-3 rounded-lg"
            variants={highlightVariants}
            initial="initial"
            animate={currentStepInfo?.type === 'half_b' ? 'highlight' : 'initial'}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">b ÷ 2</div>
            <div className="text-xl font-mono font-bold text-purple-600 dark:text-purple-400">{halfB}</div>
          </motion.div>
          <motion.div
            className="p-3 rounded-lg"
            variants={highlightVariants}
            initial="initial"
            animate={currentStepInfo?.type === 'square_it' || currentStepInfo?.type === 'add_both' ? 'highlight' : 'initial'}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">(b/2)²</div>
            <div className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">{squaredHalfB}</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Steps Card */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="space-y-3">
          <AnimatePresence mode="sync">
            {visibleSteps.map((step, index) => {
              const isCurrentStep = step.step === currentStep
              const stepLabel = getStepLabel(step.type)

              return (
                <motion.div
                  key={`step-${index}`}
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={`
                    relative p-4 rounded-xl transition-all duration-300
                    ${isCurrentStep
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-300 dark:border-purple-700 shadow-md'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                    }
                  `}
                >
                  {/* Step badge */}
                  <motion.div
                    className="absolute -left-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, delay: reducedMotion ? 0 : index * 0.05 }}
                    style={{
                      backgroundColor: isCurrentStep ? subjectColors.dark : COLORS.gray[200],
                      color: isCurrentStep ? 'white' : COLORS.gray[500],
                    }}
                  >
                    {getStepIcon(step.type)}
                  </motion.div>

                  {/* Step type label */}
                  {isCurrentStep && (
                    <motion.div
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 ml-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {language === 'he' ? stepLabel.he : stepLabel.en}
                    </motion.div>
                  )}

                  {/* Equation display */}
                  <motion.div
                    className="flex items-center justify-center gap-3 font-mono text-lg mt-2"
                    layout
                  >
                    <motion.span
                      className={`px-3 py-1.5 rounded-lg ${
                        isCurrentStep
                          ? 'font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800/50'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                      layout
                    >
                      {step.leftSide}
                    </motion.span>
                    <span className="text-gray-500 text-xl">=</span>
                    <motion.span
                      className={`px-3 py-1.5 rounded-lg ${
                        isCurrentStep
                          ? 'font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800/50'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                      layout
                    >
                      {step.rightSide}
                    </motion.span>
                  </motion.div>

                  {/* Calculation highlight */}
                  {step.calculation && isCurrentStep && (
                    <motion.div
                      className="flex justify-center mt-3"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="px-3 py-1.5 rounded-lg text-sm font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                        {step.calculation}
                      </div>
                    </motion.div>
                  )}

                  {/* Description */}
                  {isCurrentStep && (
                    <motion.p
                      className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {language === 'he'
                        ? step.descriptionHe || step.description
                        : step.description}
                    </motion.p>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Arrow between steps */}
        {visibleSteps.length > 0 && visibleSteps.length < steps.length && (
          <motion.div
            className="flex justify-center mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span
              className="text-purple-400 text-xl"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ↓
            </motion.span>
          </motion.div>
        )}
      </motion.div>

      {/* Vertex Form Result */}
      {currentStep >= 5 && (
        <motion.div
          className="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <div className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-1">
              {language === 'he' ? 'צורת קודקוד:' : 'Vertex Form:'}
            </div>
            <div className="text-xl font-mono font-bold text-violet-700 dark:text-violet-300">
              {vertexForm}
            </div>
          </div>
        </motion.div>
      )}

      {/* Final Solutions */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mt-4 p-5 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
              border: '2px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <motion.div
              className="text-2xl mb-2"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5 }}
            >
              🎉
            </motion.div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">
              {language === 'he' ? (solutions.length > 1 ? 'פתרונות:' : 'פתרון:') : (solutions.length > 1 ? 'Solutions:' : 'Solution:')}
            </p>
            <div className="flex justify-center gap-4">
              {solutions.map((sol, idx) => (
                <motion.div
                  key={idx}
                  className="text-2xl font-bold font-mono"
                  style={{ color: COLORS.success[500] }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                >
                  {variable} = {sol}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Counter */}
      {showStepCounter && (
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {language === 'he'
              ? `שלב ${currentStep + 1} מתוך ${actualTotalSteps}`
              : `Step ${currentStep + 1} of ${actualTotalSteps}`}
          </span>
        </div>
      )}
    </div>
  )
}

export default CompletingSquareSteps
