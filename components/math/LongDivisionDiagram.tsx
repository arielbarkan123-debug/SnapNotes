'use client'

import { useMemo } from 'react'
import {
  type LongDivisionData,
  type LongDivisionStep,
  type MathDiagramStepConfig,
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

  // Build the quotient digits with their positions for proper alignment
  const quotientDigits = useMemo(() => {
    const digits: Array<{ digit: number; position: number }> = []
    for (const step of visibleSteps) {
      if (step.type === 'divide' && step.quotientDigit !== undefined) {
        digits.push({ digit: step.quotientDigit, position: step.position })
      }
    }
    return digits
  }, [visibleSteps])

  // For backward compatibility, also keep simple string version
  const _visibleQuotient = quotientDigits.map(d => d.digit).join('')
  void _visibleQuotient // Keep for potential future use

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
      case 'check':
        return { icon: '🤔', label: 'Check', labelHe: 'בדיקה' }
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
        {/* Division bracket visualization with column grid */}
        <div
          className="flex justify-center"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}
        >
          <div className="inline-block">
            {/* Column width for digit alignment */}
            {(() => {
              const colWidth = baseFontSize * 1.4 // Width per digit column
              const numCols = dividendStr.length
              const divisorWidth = divisorStr.length * baseFontSize * 0.8 + 24 // divisor width + padding

              return (
                <div className="relative">
                  {/* Quotient row - aligned with dividend digits below */}
                  <div
                    className="flex mb-2"
                    style={{ fontSize: baseFontSize }}
                  >
                    {/* Spacer for divisor width */}
                    <div style={{ width: divisorWidth }} />
                    {/* Quotient digits in columns */}
                    <div className="flex">
                      {dividendStr.split('').map((_, i) => {
                        const qDigit = quotientDigits.find(d => d.position === i)
                        return (
                          <div
                            key={i}
                            className="text-center font-bold transition-all duration-300"
                            style={{
                              width: colWidth,
                              color: qDigit ? MATH_COLORS.quotient : 'transparent',
                              textShadow: isComplete && qDigit ? '0 0 8px rgba(79, 70, 229, 0.3)' : 'none',
                            }}
                          >
                            {qDigit ? qDigit.digit : '\u00A0'}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Division bracket: divisor ⟌ dividend with column lines */}
                  <div className="flex items-start" style={{ fontSize: baseFontSize }}>
                    {/* Divisor with subtle background */}
                    <div style={{ width: divisorWidth }} className="flex-shrink-0">
                      <span
                        className="font-semibold px-2 py-1 rounded-lg"
                        style={{
                          color: MATH_COLORS.divisor,
                          backgroundColor: 'rgba(75, 85, 99, 0.08)',
                        }}
                      >
                        {divisorStr}
                      </span>
                    </div>

                    {/* Division bracket with dividend - column grid */}
                    <div
                      className="relative"
                      style={{
                        borderLeft: `3px solid ${MATH_COLORS.dividend}`,
                        borderTop: `3px solid ${MATH_COLORS.dividend}`,
                        borderTopLeftRadius: '6px',
                      }}
                    >
                      {/* Dividend digits in columns */}
                      <div className="flex pt-2 pl-1">
                        {dividendStr.split('').map((digit, i) => (
                          <div
                            key={i}
                            className="text-center font-semibold transition-all duration-200"
                            style={{
                              width: colWidth,
                              color: MATH_COLORS.dividend,
                              borderRight: i < numCols - 1 ? '1px dashed rgba(156, 163, 175, 0.4)' : 'none',
                            }}
                          >
                            {digit}
                          </div>
                        ))}
                      </div>

                      {/* Work area - show steps progressively */}
                      <div
                        className="mt-3 pl-1"
                        style={{ fontSize: baseFontSize * 0.85 }}
                      >
                        {workRows.map((row, rowIndex) => (
                          <div key={rowIndex} className="mb-1">
                            {/* Product (subtraction line) - aligned to columns */}
                            {row.showProduct && row.product !== undefined && (
                              <div
                                className="flex transition-all duration-300 mt-1"
                                style={fadeInStyle}
                              >
                                <span
                                  className="font-medium"
                                  style={{ color: MATH_COLORS.product, width: 20 }}
                                >
                                  −
                                </span>
                                <div className="flex">
                                  {/* Pad with spaces for column alignment */}
                                  {dividendStr.split('').map((_, i) => {
                                    const productStr = row.product!.toString()
                                    const startCol = row.position - productStr.length + 1
                                    const digitIndex = i - startCol
                                    const showDigit = digitIndex >= 0 && digitIndex < productStr.length
                                    return (
                                      <div
                                        key={i}
                                        className="text-center font-semibold"
                                        style={{
                                          width: colWidth,
                                          color: showDigit ? MATH_COLORS.product : 'transparent',
                                        }}
                                      >
                                        {showDigit ? productStr[digitIndex] : '\u00A0'}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Difference (after subtraction) - aligned to columns */}
                            {row.showDifference && row.difference !== undefined && (
                              <div
                                className="border-t-2 pt-1 pb-1 transition-all duration-300"
                                style={{
                                  borderColor: MATH_COLORS.muted,
                                  marginLeft: 20,
                                  ...fadeInStyle,
                                }}
                              >
                                <div className="flex">
                                  {dividendStr.split('').map((_, i) => {
                                    const diffStr = row.difference!.toString()
                                    const startCol = row.position - diffStr.length + 1
                                    const digitIndex = i - startCol
                                    const showDigit = digitIndex >= 0 && digitIndex < diffStr.length
                                    return (
                                      <div
                                        key={i}
                                        className="text-center font-semibold"
                                        style={{
                                          width: colWidth,
                                          color: showDigit ? MATH_COLORS.difference : 'transparent',
                                        }}
                                      >
                                        {showDigit ? diffStr[digitIndex] : '\u00A0'}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Bring down (new working number) - aligned to columns */}
                            {row.showWorkingNumber && row.workingNumber !== undefined && (
                              <div
                                className="flex items-center transition-all duration-300 pt-1"
                                style={{ marginLeft: 20, ...fadeInStyle }}
                              >
                                <div className="flex">
                                  {dividendStr.split('').map((_, i) => {
                                    const workStr = row.workingNumber!.toString()
                                    const endCol = row.position
                                    const startCol = endCol - workStr.length + 1
                                    const digitIndex = i - startCol
                                    const showDigit = digitIndex >= 0 && digitIndex < workStr.length
                                    const isNewDigit = i === endCol
                                    return (
                                      <div
                                        key={i}
                                        className="text-center font-semibold relative"
                                        style={{
                                          width: colWidth,
                                          color: showDigit ? MATH_COLORS.workingNumber : 'transparent',
                                        }}
                                      >
                                        {showDigit ? workStr[digitIndex] : '\u00A0'}
                                        {isNewDigit && (
                                          <span
                                            className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs animate-bounce"
                                            style={{ color: MATH_COLORS.workingNumber, animationDuration: '1s' }}
                                          >
                                            ↓
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
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
                              marginLeft: 20,
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
              )
            })()}
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
