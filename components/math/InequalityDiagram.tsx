'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { COLORS } from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

// ============================================================================
// Types
// ============================================================================

export type InequalityOperator = '<' | '>' | '<=' | '>=' | '!='

export interface InequalityStep {
  step: number
  type: 'setup' | 'isolate' | 'divide_flip' | 'simplify' | 'graph' | 'interval' | 'complete'
  description: string
  descriptionHe?: string
  /** Left side of inequality */
  leftSide: string
  /** Operator */
  operator: InequalityOperator
  /** Right side */
  rightSide: string
  /** Operation performed */
  operation?: 'add' | 'subtract' | 'multiply' | 'divide' | 'flip'
  /** Value used in operation */
  operationValue?: string
  /** Whether sign flipped in this step */
  signFlipped?: boolean
  /** Calculation to show */
  calculation?: string
  highlighted?: boolean
}

export interface InequalityData {
  /** Original inequality (e.g., "2x + 3 < 7") */
  originalInequality: string
  /** Variable being solved */
  variable: string
  /** Solution inequality (e.g., "x < 2") */
  solution: string
  /** Solution value (the boundary) */
  boundaryValue: number
  /** Final operator */
  finalOperator: InequalityOperator
  /** Interval notation (e.g., "(-∞, 2)" or "[3, ∞)") */
  intervalNotation: string
  /** Set builder notation (e.g., "{x | x < 2}") */
  setBuilderNotation?: string
  /** All steps */
  steps: InequalityStep[]
  /** Whether this is a compound inequality */
  isCompound?: boolean
  /** Number line bounds for visualization */
  numberLineBounds?: { min: number; max: number }
  /** Title */
  title?: string
}

interface InequalityDiagramProps {
  data: InequalityData
  currentStep?: number
  totalSteps?: number
  animationDuration?: number
  onStepComplete?: () => void
  width?: number
  height?: number
  className?: string
  language?: 'en' | 'he'
  showStepCounter?: boolean
}

// ============================================================================
// Helper Components
// ============================================================================

interface NumberLineProps {
  min: number
  max: number
  boundaryValue: number
  operator: InequalityOperator
  showSolution: boolean
  width: number
  language: 'en' | 'he'
}

function InequalityNumberLine({
  min,
  max,
  boundaryValue,
  operator,
  showSolution,
  width,
  language: _language,
}: NumberLineProps) {
  const padding = 40
  const lineWidth = width - padding * 2
  const reducedMotion = prefersReducedMotion()

  // Calculate position on the number line
  const valueToX = (value: number): number => {
    const ratio = (value - min) / (max - min)
    return padding + ratio * lineWidth
  }

  const boundaryX = valueToX(boundaryValue)

  // Determine which side to shade
  const shadeLeft = operator === '<' || operator === '<='
  const inclusive = operator === '<=' || operator === '>='

  // Generate tick marks
  const ticks: number[] = []
  const step = Math.ceil((max - min) / 10)
  for (let v = Math.ceil(min); v <= Math.floor(max); v += step) {
    ticks.push(v)
  }
  // Always include the boundary value
  if (!ticks.includes(boundaryValue)) {
    ticks.push(boundaryValue)
    ticks.sort((a, b) => a - b)
  }

  return (
    <svg width={width} height={80} viewBox={`0 0 ${width} 80`} className="overflow-visible">
      <defs>
        {/* Gradient for the shaded region */}
        <linearGradient id="solutionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={COLORS.success[400]} stopOpacity={shadeLeft ? 0.3 : 0} />
          <stop offset="100%" stopColor={COLORS.success[400]} stopOpacity={shadeLeft ? 0 : 0.3} />
        </linearGradient>

        {/* Arrow marker */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.gray[500]} />
        </marker>
      </defs>

      {/* Number line */}
      <line
        x1={padding - 10}
        y1={40}
        x2={width - padding + 10}
        y2={40}
        stroke={COLORS.gray[400]}
        strokeWidth={2}
        markerEnd="url(#arrowhead)"
      />
      <line
        x1={padding - 10}
        y1={40}
        x2={padding - 20}
        y2={40}
        stroke={COLORS.gray[400]}
        strokeWidth={2}
      />

      {/* Solution shading */}
      {showSolution && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.5 }}
        >
          {/* Shaded region */}
          <motion.rect
            x={shadeLeft ? padding - 10 : boundaryX}
            y={32}
            width={shadeLeft ? boundaryX - padding + 10 : width - padding - boundaryX + 10}
            height={16}
            fill={COLORS.success[400]}
            opacity={0.3}
            rx={2}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.6, delay: 0.2 }}
            style={{ transformOrigin: shadeLeft ? 'right' : 'left' }}
          />

          {/* Arrow showing direction of solution */}
          <motion.path
            d={shadeLeft
              ? `M ${boundaryX - 5} 40 L ${padding + 20} 40`
              : `M ${boundaryX + 5} 40 L ${width - padding - 20} 40`
            }
            stroke={COLORS.success[500]}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: 0.3 }}
          />

          {/* Infinity arrow */}
          <motion.polygon
            points={shadeLeft
              ? `${padding + 10},36 ${padding + 10},44 ${padding},40`
              : `${width - padding - 10},36 ${width - padding - 10},44 ${width - padding},40`
            }
            fill={COLORS.success[500]}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.5 }}
          />
        </motion.g>
      )}

      {/* Tick marks and labels */}
      {ticks.map((value) => {
        const x = valueToX(value)
        const isBoundary = value === boundaryValue

        return (
          <g key={value}>
            <line
              x1={x}
              y1={isBoundary ? 32 : 36}
              x2={x}
              y2={isBoundary ? 48 : 44}
              stroke={isBoundary ? COLORS.primary[500] : COLORS.gray[400]}
              strokeWidth={isBoundary ? 2 : 1}
            />
            <text
              x={x}
              y={60}
              textAnchor="middle"
              fontSize={isBoundary ? 14 : 11}
              fontWeight={isBoundary ? 600 : 400}
              fontFamily="'JetBrains Mono', monospace"
              fill={isBoundary ? COLORS.primary[600] : COLORS.gray[500]}
            >
              {value}
            </text>
          </g>
        )
      })}

      {/* Boundary point */}
      {showSolution && (
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
        >
          {inclusive ? (
            // Filled circle for ≤ or ≥
            <circle
              cx={boundaryX}
              cy={40}
              r={8}
              fill={COLORS.success[500]}
              stroke="white"
              strokeWidth={2}
            />
          ) : (
            // Open circle for < or >
            <>
              <circle
                cx={boundaryX}
                cy={40}
                r={8}
                fill="white"
                stroke={COLORS.success[500]}
                strokeWidth={3}
              />
              <circle
                cx={boundaryX}
                cy={40}
                r={4}
                fill="white"
              />
            </>
          )}
        </motion.g>
      )}

      {/* Labels */}
      <text
        x={padding - 15}
        y={70}
        textAnchor="middle"
        fontSize={10}
        fill={COLORS.gray[400]}
      >
        −∞
      </text>
      <text
        x={width - padding + 15}
        y={70}
        textAnchor="middle"
        fontSize={10}
        fill={COLORS.gray[400]}
      >
        +∞
      </text>
    </svg>
  )
}

// ============================================================================
// Component
// ============================================================================

export function InequalityDiagram({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  animationDuration = 400,
  width = 440,
  className = '',
  language = 'en',
  showStepCounter = true,
}: InequalityDiagramProps) {
  const { originalInequality, variable: _variable, solution, boundaryValue, finalOperator, intervalNotation, setBuilderNotation, steps, numberLineBounds, title } = data
  const reducedMotion = prefersReducedMotion()
  void animationDuration // reserved for future animation customization

  const actualTotalSteps = totalStepsProp ?? steps.length
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100
  const isComplete = currentStep >= steps.length - 1

  const visibleSteps = useMemo(() => steps.filter((s) => s.step <= currentStep), [steps, currentStep])
  const currentStepInfo = steps[currentStep] || null

  // Determine number line bounds
  const bounds = numberLineBounds || {
    min: Math.min(-5, boundaryValue - 5),
    max: Math.max(5, boundaryValue + 5),
  }

  // Show number line after certain step
  const showNumberLine = currentStep >= steps.findIndex(s => s.type === 'graph') || isComplete

  // Animation variants
  const stepVariants: Variants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 },
    },
    exit: { opacity: 0, y: 10 },
  }

  // Get operator display
  const getOperatorDisplay = (op: InequalityOperator): string => {
    switch (op) {
      case '<': return '<'
      case '>': return '>'
      case '<=': return '≤'
      case '>=': return '≥'
      case '!=': return '≠'
    }
  }

  // Get step icon
  const getStepIcon = (type: InequalityStep['type']): string => {
    const icons: Record<InequalityStep['type'], string> = {
      setup: '📝',
      isolate: '🎯',
      divide_flip: '🔄',
      simplify: '✨',
      graph: '📊',
      interval: '📐',
      complete: '✅',
    }
    return icons[type] || '📐'
  }

  // Get step label
  const getStepLabel = (type: InequalityStep['type']): { en: string; he: string } => {
    const labels: Record<InequalityStep['type'], { en: string; he: string }> = {
      setup: { en: 'Setup', he: 'התחלה' },
      isolate: { en: 'Isolate variable', he: 'בידוד משתנה' },
      divide_flip: { en: 'Divide (flip sign!)', he: 'חלוקה (הפיכת סימן!)' },
      simplify: { en: 'Simplify', he: 'פישוט' },
      graph: { en: 'Graph solution', he: 'גרף הפתרון' },
      interval: { en: 'Interval notation', he: 'סימון קטע' },
      complete: { en: 'Complete!', he: 'הושלם!' },
    }
    return labels[type] || { en: 'Step', he: 'שלב' }
  }

  return (
    <div className={`inequality-diagram ${className}`} style={{ width }}>
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
        <div className="text-center text-sm text-orange-600 dark:text-orange-400 font-medium mb-3">
          {language === 'he' ? 'פתרון אי-שוויון' : 'Solving Inequalities'}
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
                : 'linear-gradient(90deg, #f97316, #fb923c)',
            }}
          />
        </div>
      </motion.div>

      {/* Original Inequality */}
      <motion.div
        className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-xl p-4 mb-4 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {language === 'he' ? 'פתור:' : 'Solve:'}
        </div>
        <div className="text-2xl font-mono font-bold text-orange-700 dark:text-orange-300">
          {originalInequality}
        </div>
      </motion.div>

      {/* Important Note about flipping */}
      {currentStepInfo?.signFlipped && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-medium">
              {language === 'he'
                ? 'כאשר מכפילים או מחלקים במספר שלילי, הופכים את הסימן!'
                : 'When multiplying or dividing by a negative number, flip the inequality sign!'}
            </p>
          </div>
        </motion.div>
      )}

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
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-2 border-orange-300 dark:border-orange-700 shadow-md'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                    }
                    ${step.signFlipped ? 'ring-2 ring-red-400 ring-offset-2' : ''}
                  `}
                >
                  {/* Step badge */}
                  <motion.div
                    className="absolute -left-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, delay: reducedMotion ? 0 : index * 0.05 }}
                    style={{
                      backgroundColor: step.signFlipped ? '#ef4444' : isCurrentStep ? '#f97316' : COLORS.gray[200],
                      color: isCurrentStep || step.signFlipped ? 'white' : COLORS.gray[500],
                    }}
                  >
                    {getStepIcon(step.type)}
                  </motion.div>

                  {/* Step label */}
                  {isCurrentStep && (
                    <motion.div
                      className="text-xs font-semibold mb-2 ml-4"
                      style={{ color: step.signFlipped ? '#dc2626' : '#ea580c' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {language === 'he' ? stepLabel.he : stepLabel.en}
                      {step.signFlipped && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400">
                          {language === 'he' ? 'סימן התהפך!' : 'Sign flipped!'}
                        </span>
                      )}
                    </motion.div>
                  )}

                  {/* Inequality display */}
                  <motion.div
                    className="flex items-center justify-center gap-3 font-mono text-lg mt-2"
                    layout
                  >
                    <span
                      className={`px-3 py-1.5 rounded-lg ${
                        isCurrentStep
                          ? 'font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-800/50'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {step.leftSide}
                    </span>
                    <motion.span
                      className={`text-xl font-bold ${
                        step.signFlipped ? 'text-red-500' : 'text-gray-500'
                      }`}
                      animate={step.signFlipped && isCurrentStep ? { scale: [1, 1.3, 1], rotate: [0, 180, 360] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {getOperatorDisplay(step.operator)}
                    </motion.span>
                    <span
                      className={`px-3 py-1.5 rounded-lg ${
                        isCurrentStep
                          ? 'font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-800/50'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {step.rightSide}
                    </span>
                  </motion.div>

                  {/* Operation indicator */}
                  {step.calculation && isCurrentStep && (
                    <motion.div
                      className="flex justify-center mt-3"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="px-3 py-1.5 rounded-lg text-sm font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        {step.calculation}
                      </span>
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
      </motion.div>

      {/* Number Line Visualization */}
      {showNumberLine && (
        <motion.div
          className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-2">
            {language === 'he' ? 'גרף על ציר המספרים:' : 'Graph on Number Line:'}
          </div>
          <InequalityNumberLine
            min={bounds.min}
            max={bounds.max}
            boundaryValue={boundaryValue}
            operator={finalOperator}
            showSolution={true}
            width={width - 32}
            language={language}
          />
        </motion.div>
      )}

      {/* Final Solution */}
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
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              🎉
            </motion.div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">
              {language === 'he' ? 'פתרון:' : 'Solution:'}
            </p>
            <motion.div
              className="text-2xl font-bold font-mono mb-3"
              style={{ color: COLORS.success[500] }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {solution}
            </motion.div>

            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'he' ? 'סימון קטע:' : 'Interval:'}
                </div>
                <div className="font-mono font-semibold text-violet-600 dark:text-violet-400">
                  {intervalNotation}
                </div>
              </div>
              {setBuilderNotation && (
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'he' ? 'סימון קבוצה:' : 'Set Builder:'}
                  </div>
                  <div className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                    {setBuilderNotation}
                  </div>
                </div>
              )}
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

export default InequalityDiagram
