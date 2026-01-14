'use client'

import { useMemo } from 'react'
import {
  LongDivisionData,
  LongDivisionStep,
  MathDiagramStepConfig,
  MATH_COLORS,
} from '@/types/math'

interface LongDivisionDiagramProps {
  data: LongDivisionData
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
}

/**
 * LongDivisionDiagram - Step-synced visualization of long division
 *
 * Shows the long division process progressively:
 * 1. Setup: Show dividend and divisor
 * 2. Divide: Determine quotient digit
 * 3. Multiply: Show the product
 * 4. Subtract: Show subtraction line and difference
 * 5. Bring down: Bring down next digit
 * 6. Repeat until complete
 */
export function LongDivisionDiagram({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  stepConfig,
  animationDuration = 400,
  onStepComplete: _onStepComplete,
  width = 400,
  height = 350,
  className = '',
  language = 'en',
  showStepCounter = true,
}: LongDivisionDiagramProps) {
  const { dividend, divisor, quotient, remainder, steps, title } = data

  const dividendStr = dividend.toString()
  const divisorStr = divisor.toString()
  // quotientStr is built progressively in visibleQuotient
  void quotient

  // Calculate total steps for progress
  const actualTotalSteps = totalStepsProp ?? steps.length

  // Calculate which elements should be visible based on current step
  const visibleSteps = useMemo(() => {
    return steps.filter((s) => s.step <= currentStep)
  }, [steps, currentStep])

  // Get the current step info
  const currentStepInfo = useMemo(() => {
    if (stepConfig && stepConfig[currentStep]) {
      return stepConfig[currentStep]
    }
    return steps[currentStep] || null
  }, [stepConfig, steps, currentStep])

  // Build the quotient string up to current step
  const visibleQuotient = useMemo(() => {
    let q = ''
    for (const step of visibleSteps) {
      if (step.type === 'divide' && step.quotientDigit !== undefined) {
        q += step.quotientDigit.toString()
      }
    }
    return q
  }, [visibleSteps])

  // Group steps by position for rendering work rows
  const workRows = useMemo(() => {
    const rows: Array<{
      position: number
      product?: number
      difference?: number
      workingNumber?: number
      showProduct: boolean
      showDifference: boolean
      showWorkingNumber: boolean
    }> = []

    let currentPosition = -1
    let currentRow: (typeof rows)[0] | null = null

    for (const step of visibleSteps) {
      if (step.position !== currentPosition) {
        if (currentRow) {
          rows.push(currentRow)
        }
        currentPosition = step.position
        currentRow = {
          position: step.position,
          showProduct: false,
          showDifference: false,
          showWorkingNumber: false,
        }
      }

      if (currentRow) {
        if (step.type === 'multiply' && step.product !== undefined) {
          currentRow.product = step.product
          currentRow.showProduct = true
        }
        if (step.type === 'subtract' && step.difference !== undefined) {
          currentRow.difference = step.difference
          currentRow.showDifference = true
        }
        if (step.type === 'bring_down' && step.workingNumber !== undefined) {
          currentRow.workingNumber = step.workingNumber
          currentRow.showWorkingNumber = true
        }
      }
    }

    if (currentRow) {
      rows.push(currentRow)
    }

    return rows
  }, [visibleSteps])

  // Get step type icon and label
  const getStepTypeInfo = (step: LongDivisionStep | MathDiagramStepConfig | null): { icon: string; label: string; labelHe: string } => {
    if (!step) return { icon: '📐', label: 'Setup', labelHe: 'התחלה' }

    const stepData = step as LongDivisionStep
    switch (stepData.type) {
      case 'setup':
        return { icon: '📐', label: 'Setup', labelHe: 'התחלה' }
      case 'divide':
        return { icon: '➗', label: 'Divide', labelHe: 'חלוקה' }
      case 'multiply':
        return { icon: '✖️', label: 'Multiply', labelHe: 'כפל' }
      case 'subtract':
        return { icon: '➖', label: 'Subtract', labelHe: 'חיסור' }
      case 'bring_down':
        return { icon: '⬇️', label: 'Bring Down', labelHe: 'הורדה' }
      case 'remainder':
        return { icon: '🔢', label: 'Remainder', labelHe: 'שארית' }
      case 'complete':
        return { icon: '✅', label: 'Complete', labelHe: 'סיום' }
      default:
        return { icon: '📝', label: 'Step', labelHe: 'שלב' }
    }
  }

  // Animation styles
  const fadeInStyle = {
    animation: `fadeIn ${animationDuration}ms ease-out`,
  }

  // Font sizes based on width
  const baseFontSize = Math.max(18, Math.min(28, width / 14))
  const smallFontSize = baseFontSize * 0.7

  // Progress percentage
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100

  // Is complete?
  const isComplete = currentStep >= steps.length - 1

  return (
    <div
      className={`long-division-diagram ${className}`}
      style={{ width, minHeight: height }}
    >
      {/* Header with title and progress */}
      <div className="mb-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3">
            {title}
          </h3>
        )}

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: isComplete
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #4f46e5, #6366f1)',
            }}
          />
        </div>
      </div>

      {/* Main diagram card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        {/* Division bracket visualization */}
        <div
          className="flex justify-center"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}
        >
          <div className="inline-block">
            {/* Quotient row with highlight effect */}
            <div
              className="flex justify-end mb-2 pr-3"
              style={{ fontSize: baseFontSize }}
            >
              <div className="relative">
                <span
                  className="font-bold tracking-wider transition-all duration-300"
                  style={{
                    color: MATH_COLORS.quotient,
                    textShadow: isComplete ? '0 0 8px rgba(79, 70, 229, 0.3)' : 'none',
                  }}
                >
                  {visibleQuotient}
                  {!isComplete && (
                    <span className="animate-pulse text-gray-300 dark:text-gray-600">_</span>
                  )}
                </span>
                {visibleQuotient && (
                  <div
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${MATH_COLORS.quotient}, transparent)`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Division bracket: divisor ⟌ dividend */}
            <div className="flex items-start" style={{ fontSize: baseFontSize }}>
              {/* Divisor with subtle background */}
              <div className="relative">
                <span
                  className="font-semibold px-2 py-1 rounded-lg mr-3"
                  style={{
                    color: MATH_COLORS.divisor,
                    backgroundColor: 'rgba(75, 85, 99, 0.08)',
                  }}
                >
                  {divisorStr}
                </span>
              </div>

              {/* Division bracket with dividend */}
              <div
                className="relative pl-4 pt-2"
                style={{
                  borderLeft: `3px solid ${MATH_COLORS.dividend}`,
                  borderTop: `3px solid ${MATH_COLORS.dividend}`,
                  borderTopLeftRadius: '6px',
                }}
              >
                {/* Dividend with digit separation */}
                <span
                  className="tracking-widest font-semibold"
                  style={{ color: MATH_COLORS.dividend }}
                >
                  {dividendStr.split('').map((digit, i) => (
                    <span
                      key={i}
                      className="inline-block transition-all duration-200"
                      style={{
                        marginRight: '2px',
                        opacity: 1,
                      }}
                    >
                      {digit}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            {/* Work area - show steps progressively */}
            <div
              className="ml-14 mt-3 space-y-2"
              style={{ fontSize: baseFontSize * 0.85 }}
            >
              {workRows.map((row, rowIndex) => (
                <div key={rowIndex} className="space-y-1">
                  {/* Product (subtraction line) */}
                  {row.showProduct && row.product !== undefined && (
                    <div
                      className="flex items-center transition-all duration-300 pl-1"
                      style={fadeInStyle}
                    >
                      <span
                        className="mr-2 font-medium"
                        style={{ color: MATH_COLORS.product }}
                      >
                        −
                      </span>
                      <span
                        className="font-semibold tracking-wider"
                        style={{ color: MATH_COLORS.product }}
                      >
                        {row.product}
                      </span>
                    </div>
                  )}

                  {/* Difference (after subtraction) */}
                  {row.showDifference && row.difference !== undefined && (
                    <div
                      className="border-t-2 pt-2 transition-all duration-300"
                      style={{
                        borderColor: MATH_COLORS.muted,
                        ...fadeInStyle,
                      }}
                    >
                      <span
                        className="font-semibold tracking-wider pl-4"
                        style={{ color: MATH_COLORS.difference }}
                      >
                        {row.difference}
                      </span>
                    </div>
                  )}

                  {/* Bring down (new working number) */}
                  {row.showWorkingNumber && row.workingNumber !== undefined && (
                    <div
                      className="flex items-center gap-2 transition-all duration-300 pl-4"
                      style={fadeInStyle}
                    >
                      <span
                        className="font-semibold tracking-wider"
                        style={{ color: MATH_COLORS.workingNumber }}
                      >
                        {row.workingNumber}
                      </span>
                      <span
                        className="text-sm animate-bounce"
                        style={{ color: MATH_COLORS.workingNumber, animationDuration: '1s' }}
                      >
                        ↓
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Show remainder if we're at the final step */}
              {isComplete && remainder > 0 && (
                <div
                  className="border-t-2 pt-3 mt-3 flex items-center gap-2 transition-all duration-300"
                  style={{
                    borderColor: MATH_COLORS.muted,
                    ...fadeInStyle,
                  }}
                >
                  <span
                    className="text-sm font-medium px-2 py-0.5 rounded-full"
                    style={{
                      fontSize: smallFontSize,
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      color: MATH_COLORS.warning,
                    }}
                  >
                    {language === 'he' ? 'שארית' : 'Remainder'}
                  </span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: MATH_COLORS.warning }}
                  >
                    {remainder}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step explanation card */}
      {currentStepInfo && (
        <div
          className="mt-4 p-4 rounded-xl border-l-4 transition-all duration-300"
          style={{
            backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.08)' : 'rgba(79, 70, 229, 0.08)',
            borderLeftColor: isComplete ? MATH_COLORS.success : MATH_COLORS.primary,
            ...fadeInStyle,
          }}
        >
          <div className="flex items-start gap-3">
            {/* Step type indicator */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{
                backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.15)' : 'rgba(79, 70, 229, 0.15)',
              }}
            >
              {getStepTypeInfo(currentStepInfo as LongDivisionStep).icon}
            </div>

            <div className="flex-1">
              {/* Step type label */}
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: isComplete ? MATH_COLORS.success : MATH_COLORS.primary }}>
                {language === 'he'
                  ? getStepTypeInfo(currentStepInfo as LongDivisionStep).labelHe
                  : getStepTypeInfo(currentStepInfo as LongDivisionStep).label}
              </div>

              {/* Explanation text */}
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {language === 'he'
                  ? (currentStepInfo as LongDivisionStep).explanationHe ||
                    (currentStepInfo as LongDivisionStep).explanation ||
                    (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabelHe ||
                    (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabel
                  : (currentStepInfo as LongDivisionStep).explanation ||
                    (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabel}
              </p>

              {/* Calculation highlight */}
              {((currentStepInfo as LongDivisionStep).calculation ||
                (stepConfig?.[currentStep] as MathDiagramStepConfig)?.showCalculation) && (
                <div
                  className="mt-2 inline-block px-3 py-1.5 rounded-lg font-mono text-sm font-semibold"
                  style={{
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    color: MATH_COLORS.primary,
                  }}
                >
                  {(currentStepInfo as LongDivisionStep).calculation ||
                    (stepConfig?.[currentStep] as MathDiagramStepConfig)?.showCalculation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Final answer celebration */}
      {isComplete && (
        <div
          className="mt-4 p-4 rounded-xl text-center transition-all duration-500"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            ...fadeInStyle,
          }}
        >
          <div className="text-2xl mb-2">🎉</div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {dividend} ÷ {divisor} ={' '}
            <span
              className="font-bold"
              style={{ color: MATH_COLORS.quotient }}
            >
              {quotient}
            </span>
            {remainder > 0 && (
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                R{remainder}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Step counter - only show if not rendered by parent */}
      {showStepCounter && (
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {language === 'he'
              ? `שלב ${currentStep + 1} מתוך ${actualTotalSteps}`
              : `Step ${currentStep + 1} of ${actualTotalSteps}`}
          </span>
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default LongDivisionDiagram
