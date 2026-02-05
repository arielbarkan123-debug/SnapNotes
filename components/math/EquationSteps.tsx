'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  type EquationData,
  type EquationStep,
  type MathDiagramStepConfig,
} from '@/types/math'
import { COLORS, MATH_OPERATION_COLORS } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface EquationStepsProps {
  data: EquationData
  /** Current step to display */
  currentStep?: number
  /** Total number of steps (for step counter display) */
  totalSteps?: number
  /** Step configuration */
  stepConfig?: MathDiagramStepConfig[]
  /** Animation duration in ms */
  animationDuration?: number
  /** Callback when step animation completes */
  onStepComplete?: () => void
  /** Width of the component */
  width?: number
  /** Height of the component */
  height?: number
  /** Additional className */
  className?: string
  /** Language for labels */
  language?: 'en' | 'he'
  /** Whether to show the step counter (default: true) */
  showStepCounter?: boolean
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
}

/**
 * EquationSteps - Enhanced step-synced visualization with Framer Motion
 *
 * Features:
 * - Smooth step reveal animations
 * - Animated balance scale
 * - Morph transitions between equation states
 * - Professional visual design
 * - Celebration effect on completion
 */
export function EquationSteps({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  stepConfig,
  animationDuration: _animationDuration = 400,
  onStepComplete: _onStepComplete,
  width = 400,
  height: _height,
  className = '',
  language = 'en',
  showStepCounter = true,
  subject = 'math',
  complexity = 'middle_school',
}: EquationStepsProps) {
  const { originalEquation: _originalEquation, variable, solution, steps, title, showBalanceScale } = data
  const reducedMotion = prefersReducedMotion()

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Calculate total steps for progress
  const actualTotalSteps = totalStepsProp ?? steps.length

  // Get visible steps up to current step
  const visibleSteps = useMemo(() => {
    return steps.filter((s) => s.step <= currentStep)
  }, [steps, currentStep])

  // Get current step info
  const currentStepInfo = useMemo(() => {
    if (stepConfig && stepConfig[currentStep]) {
      return stepConfig[currentStep]
    }
    return steps[currentStep] || null
  }, [stepConfig, steps, currentStep])

  // Progress percentage
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100

  // Is complete?
  const isComplete = currentStep >= steps.length - 1

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.1,
        delayChildren: 0.1,
      },
    },
  }

  const stepCardVariants: Variants = {
    hidden: {
      opacity: 0,
      y: reducedMotion ? 0 : -10,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.98,
    },
  }

  const celebrationVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: reducedMotion ? 0 : 0.2,
      },
    },
  }

  // Get operation info with colors from theme
  const getOperationInfo = (operation: EquationStep['operation']): {
    symbol: string
    color: string
    bgColor: string
    icon: string
    label: string
    labelHe: string
  } => {
    switch (operation) {
      case 'add':
        return {
          symbol: '+',
          color: MATH_OPERATION_COLORS.add.primary,
          bgColor: MATH_OPERATION_COLORS.add.bg,
          icon: '➕',
          label: 'Add',
          labelHe: 'חיבור',
        }
      case 'subtract':
        return {
          symbol: '−',
          color: MATH_OPERATION_COLORS.subtract.primary,
          bgColor: MATH_OPERATION_COLORS.subtract.bg,
          icon: '➖',
          label: 'Subtract',
          labelHe: 'חיסור',
        }
      case 'multiply':
        return {
          symbol: '×',
          color: MATH_OPERATION_COLORS.multiply.primary,
          bgColor: MATH_OPERATION_COLORS.multiply.bg,
          icon: '✖️',
          label: 'Multiply',
          labelHe: 'כפל',
        }
      case 'divide':
        return {
          symbol: '÷',
          color: MATH_OPERATION_COLORS.divide.primary,
          bgColor: MATH_OPERATION_COLORS.divide.bg,
          icon: '➗',
          label: 'Divide',
          labelHe: 'חילוק',
        }
      case 'simplify':
        return {
          symbol: '=',
          color: MATH_OPERATION_COLORS.equals.primary,
          bgColor: MATH_OPERATION_COLORS.equals.bg,
          icon: '🔄',
          label: 'Simplify',
          labelHe: 'פישוט',
        }
      case 'combine':
        return {
          symbol: '⟹',
          color: subjectColors.primary,
          bgColor: subjectColors.light + '20',
          icon: '🔗',
          label: 'Combine',
          labelHe: 'איחוד',
        }
      case 'distribute':
        return {
          symbol: '⟹',
          color: subjectColors.primary,
          bgColor: subjectColors.light + '20',
          icon: '📤',
          label: 'Distribute',
          labelHe: 'פיזור',
        }
      case 'factor':
        return {
          symbol: '⟹',
          color: subjectColors.primary,
          bgColor: subjectColors.light + '20',
          icon: '📦',
          label: 'Factor',
          labelHe: 'פירוק',
        }
      case 'initial':
        return {
          symbol: '',
          color: COLORS.gray[500],
          bgColor: COLORS.gray[100],
          icon: '📝',
          label: 'Start',
          labelHe: 'התחלה',
        }
      default:
        return {
          symbol: '',
          color: subjectColors.primary,
          bgColor: subjectColors.light + '20',
          icon: '📐',
          label: 'Step',
          labelHe: 'שלב',
        }
    }
  }

  return (
    <div className={`equation-steps ${className}`} style={{ width }}>
      {/* Header with title and progress */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.3 }}
      >
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3">
            {title}
          </h3>
        )}

        {/* Animated progress bar */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut' }}
            style={{
              background: isComplete
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : `linear-gradient(90deg, ${subjectColors.dark}, ${subjectColors.primary})`,
            }}
          />
        </div>
      </motion.div>

      {/* Balance Scale Visualization (optional) */}
      {showBalanceScale && currentStepInfo && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.4 }}
        >
          <BalanceScale
            leftSide={(steps[currentStep] as EquationStep)?.leftSide || ''}
            rightSide={(steps[currentStep] as EquationStep)?.rightSide || ''}
            isBalanced={isComplete}
            operation={steps[currentStep]?.operation}
            reducedMotion={reducedMotion}
            subjectColors={subjectColors}
          />
        </motion.div>
      )}

      {/* Equation steps in card */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.3, delay: 0.1 }}
      >
        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="sync">
            {visibleSteps.map((step, index) => {
              const isCurrentStep = step.step === currentStep
              const stepInfo = step as EquationStep
              const opInfo = getOperationInfo(stepInfo.operation)

              return (
                <motion.div
                  key={`step-${index}`}
                  variants={stepCardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={`
                    relative p-4 rounded-xl transition-colors duration-300
                    ${isCurrentStep
                      ? 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border-2 border-violet-300 dark:border-violet-700 shadow-md'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                    }
                  `}
                >
                  {/* Step indicator badge with animation */}
                  <motion.div
                    className="absolute -left-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 15,
                      delay: reducedMotion ? 0 : index * 0.05,
                    }}
                    style={{
                      backgroundColor: isCurrentStep ? subjectColors.primary : COLORS.gray[200],
                      color: isCurrentStep ? 'white' : COLORS.gray[500],
                    }}
                  >
                    {index + 1}
                  </motion.div>

                  {/* Equation display with morph effect */}
                  <motion.div
                    className="flex items-center justify-center gap-3 font-mono text-xl mt-2"
                    layout
                  >
                    <motion.span
                      className={`
                        px-3 py-1 rounded-lg
                        ${isCurrentStep ? 'font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-800/50' : 'text-gray-700 dark:text-gray-300'}
                      `}
                      layout
                      key={`left-${stepInfo.leftSide}`}
                    >
                      {stepInfo.leftSide}
                    </motion.span>
                    <span className="text-gray-500 text-2xl">=</span>
                    <motion.span
                      className={`
                        px-3 py-1 rounded-lg
                        ${isCurrentStep ? 'font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-800/50' : 'text-gray-700 dark:text-gray-300'}
                      `}
                      layout
                      key={`right-${stepInfo.rightSide}`}
                    >
                      {stepInfo.rightSide}
                    </motion.span>
                  </motion.div>

                  {/* Operation explanation with slide-in animation */}
                  {stepInfo.operation && stepInfo.operation !== 'initial' && isCurrentStep && (
                    <motion.div
                      className="flex items-center justify-center gap-2 mt-3"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reducedMotion ? 0 : 0.2 }}
                    >
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm"
                        style={{ backgroundColor: opInfo.color }}
                      >
                        <span>{opInfo.icon}</span>
                        <span>{language === 'he' ? opInfo.labelHe : opInfo.label}</span>
                        {stepInfo.calculation && (
                          <span className="ml-1 font-mono bg-white/20 px-2 py-0.5 rounded">
                            {stepInfo.calculation}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Description */}
                  {(stepInfo.description || stepInfo.descriptionHe) && isCurrentStep && (
                    <motion.p
                      className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 italic"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: reducedMotion ? 0 : 0.3 }}
                    >
                      {language === 'he'
                        ? stepInfo.descriptionHe || stepInfo.description
                        : stepInfo.description}
                    </motion.p>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {/* Arrow indicators between visible steps */}
        {visibleSteps.length > 1 && !isComplete && (
          <motion.div
            className="flex justify-center mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.span
              className="text-gray-400 text-xl"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              ↓
            </motion.span>
          </motion.div>
        )}
      </motion.div>

      {/* Final solution highlight with celebration animation */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            variants={celebrationVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="mt-4 p-5 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
              border: '2px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <motion.div
              className="text-2xl mb-2"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.3 }}
            >
              🎉
            </motion.div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">
              {language === 'he' ? 'פתרון:' : 'Solution:'}
            </p>
            <motion.p
              className="text-3xl font-bold font-mono"
              style={{ color: COLORS.success[500] }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: reducedMotion ? 0 : 0.4 }}
            >
              {variable} = {solution}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step description from config */}
      {stepConfig?.[currentStep]?.stepLabel && (
        <motion.div
          className="mt-4 p-3 rounded-xl border-l-4"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderLeftColor: subjectColors.primary,
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
        >
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {language === 'he'
              ? stepConfig[currentStep].stepLabelHe || stepConfig[currentStep].stepLabel
              : stepConfig[currentStep].stepLabel}
          </p>
        </motion.div>
      )}

      {/* Step counter */}
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

/**
 * Balance Scale - Enhanced animated visual representation
 */
function BalanceScale({
  leftSide,
  rightSide,
  isBalanced,
  operation,
  reducedMotion = false,
  subjectColors,
}: {
  leftSide: string
  rightSide: string
  isBalanced: boolean
  operation?: EquationStep['operation']
  reducedMotion?: boolean
  subjectColors: ReturnType<typeof getSubjectColor>
}) {
  // Calculate tilt based on whether balanced
  const tiltAngle = isBalanced ? 0 : -3

  // Get glow color based on operation
  const glowColor = isBalanced ? 'rgba(34, 197, 94, 0.3)' : `${subjectColors.light}40`

  return (
    <div className="relative w-full max-w-sm mx-auto h-40">
      {/* Balance indicator at top */}
      <motion.div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg"
          animate={{
            backgroundColor: isBalanced ? COLORS.success[500] : subjectColors.primary,
            boxShadow: `0 0 15px ${glowColor}`,
          }}
          transition={{ duration: reducedMotion ? 0 : 0.5 }}
        >
          <motion.span
            key={isBalanced ? 'check' : 'scale'}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {isBalanced ? '✓' : '⚖️'}
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Fulcrum (triangle base) - more stylish */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
        <svg width="50" height="40" viewBox="0 0 50 40">
          <defs>
            <linearGradient id="fulcrumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
          </defs>
          <polygon points="25,0 50,40 0,40" fill="url(#fulcrumGradient)" />
        </svg>
      </div>

      {/* Beam with smooth rotation */}
      <motion.div
        className="absolute top-12 left-1/2 origin-center"
        style={{ width: '280px' }}
        initial={{ rotate: 0 }}
        animate={{
          rotate: tiltAngle,
          x: '-50%',
        }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 15,
          duration: reducedMotion ? 0 : 0.7,
        }}
      >
        {/* Main beam */}
        <div
          className="h-3 rounded-full shadow-md"
          style={{ background: 'linear-gradient(180deg, #4b5563, #374151)' }}
        />

        {/* Left string */}
        <div className="absolute -left-2 top-3 w-0.5 h-8 bg-gray-500" />

        {/* Right string */}
        <div className="absolute -right-2 top-3 w-0.5 h-8 bg-gray-500" />

        {/* Left pan */}
        <motion.div
          className="absolute top-11 transform -translate-x-1/2"
          style={{ left: '0%' }}
          animate={{
            rotate: -tiltAngle, // Counter-rotate to stay level
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <motion.div
            className="w-24 min-h-12 px-2 py-2 rounded-xl shadow-lg flex items-center justify-center"
            animate={{
              background: isBalanced
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))'
                : `linear-gradient(135deg, ${subjectColors.light}26, ${subjectColors.primary}26)`,
              borderColor: isBalanced ? 'rgba(34, 197, 94, 0.4)' : `${subjectColors.primary}66`,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            style={{ border: '2px solid' }}
          >
            <motion.span
              className="text-sm font-mono font-bold text-center break-all"
              key={leftSide}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                color: isBalanced ? COLORS.success[500] : subjectColors.primary
              }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              {leftSide}
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Right pan */}
        <motion.div
          className="absolute top-11 transform -translate-x-1/2"
          style={{ left: '100%' }}
          animate={{
            rotate: -tiltAngle, // Counter-rotate to stay level
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <motion.div
            className="w-24 min-h-12 px-2 py-2 rounded-xl shadow-lg flex items-center justify-center"
            animate={{
              background: isBalanced
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))'
                : `linear-gradient(135deg, ${subjectColors.light}26, ${subjectColors.primary}26)`,
              borderColor: isBalanced ? 'rgba(34, 197, 94, 0.4)' : `${subjectColors.primary}66`,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            style={{ border: '2px solid' }}
          >
            <motion.span
              className="text-sm font-mono font-bold text-center break-all"
              key={rightSide}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                color: isBalanced ? COLORS.success[500] : subjectColors.primary
              }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              {rightSide}
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Operation indicator */}
      <AnimatePresence>
        {operation && operation !== 'initial' && !isBalanced && (
          <motion.div
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
            <motion.div
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: `${subjectColors.primary}1a`,
                color: subjectColors.primary,
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {operation === 'add' && '+ both sides'}
              {operation === 'subtract' && '− both sides'}
              {operation === 'multiply' && '× both sides'}
              {operation === 'divide' && '÷ both sides'}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EquationSteps
