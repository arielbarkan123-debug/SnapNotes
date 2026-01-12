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
  stepConfig,
  animationDuration = 400,
  onStepComplete: _onStepComplete,
  width = 400,
  height = 350,
  className = '',
  language = 'en',
}: LongDivisionDiagramProps) {
  const { dividend, divisor, quotient, remainder, steps, title } = data

  const dividendStr = dividend.toString()
  const divisorStr = divisor.toString()
  // quotientStr is built progressively in visibleQuotient
  void quotient

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

  // Animation styles
  const fadeInStyle = {
    animation: `fadeIn ${animationDuration}ms ease-out`,
  }

  // Font sizes based on width
  const baseFontSize = Math.max(16, Math.min(24, width / 16))
  const smallFontSize = baseFontSize * 0.75

  return (
    <div
      className={`long-division-diagram ${className}`}
      style={{ width, minHeight: height }}
    >
      {/* Title */}
      {title && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h3>
        </div>
      )}

      {/* Division bracket visualization */}
      <div
        className="flex justify-center"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        <div className="inline-block">
          {/* Quotient row */}
          <div
            className="flex justify-end mb-1 pr-2"
            style={{ fontSize: baseFontSize }}
          >
            <span
              className="font-bold tracking-widest transition-all duration-300"
              style={{ color: MATH_COLORS.quotient }}
            >
              {visibleQuotient}
              {currentStep < steps.length && (
                <span className="animate-pulse text-gray-300">_</span>
              )}
            </span>
          </div>

          {/* Division bracket: divisor ⟌ dividend */}
          <div className="flex items-start" style={{ fontSize: baseFontSize }}>
            {/* Divisor */}
            <span
              className="font-medium mr-2"
              style={{ color: MATH_COLORS.divisor }}
            >
              {divisorStr}
            </span>

            {/* Division bracket with dividend */}
            <div
              className="relative pl-3 pt-1"
              style={{
                borderLeft: `2px solid ${MATH_COLORS.dividend}`,
                borderTop: `2px solid ${MATH_COLORS.dividend}`,
                borderTopLeftRadius: '4px',
              }}
            >
              {/* Dividend */}
              <span
                className="tracking-widest font-medium"
                style={{ color: MATH_COLORS.dividend }}
              >
                {dividendStr}
              </span>
            </div>
          </div>

          {/* Work area - show steps progressively */}
          <div
            className="ml-12 mt-2 space-y-1"
            style={{ fontSize: baseFontSize * 0.9 }}
          >
            {workRows.map((row, rowIndex) => (
              <div key={rowIndex} className="space-y-1">
                {/* Product (subtraction line) */}
                {row.showProduct && row.product !== undefined && (
                  <div
                    className="flex items-center transition-all duration-300"
                    style={fadeInStyle}
                  >
                    <span
                      className="mr-1"
                      style={{ color: MATH_COLORS.product }}
                    >
                      −
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: MATH_COLORS.product }}
                    >
                      {row.product}
                    </span>
                  </div>
                )}

                {/* Difference (after subtraction) */}
                {row.showDifference && row.difference !== undefined && (
                  <div
                    className="border-t-2 pt-1 transition-all duration-300"
                    style={{
                      borderColor: MATH_COLORS.muted,
                      ...fadeInStyle,
                    }}
                  >
                    <span
                      className="font-medium"
                      style={{ color: MATH_COLORS.difference }}
                    >
                      {row.difference}
                    </span>
                  </div>
                )}

                {/* Bring down (new working number) */}
                {row.showWorkingNumber && row.workingNumber !== undefined && (
                  <div
                    className="transition-all duration-300"
                    style={fadeInStyle}
                  >
                    <span
                      className="font-medium"
                      style={{ color: MATH_COLORS.workingNumber }}
                    >
                      {row.workingNumber}
                    </span>
                    <span className="text-xs ml-1 text-gray-400">
                      ↓
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Show remainder if we're at the final step */}
            {currentStep >= steps.length - 1 && remainder > 0 && (
              <div
                className="border-t-2 pt-2 mt-2 transition-all duration-300"
                style={{
                  borderColor: MATH_COLORS.muted,
                  ...fadeInStyle,
                }}
              >
                <span className="text-gray-500" style={{ fontSize: smallFontSize }}>
                  {language === 'he' ? 'שארית: ' : 'Remainder: '}
                </span>
                <span
                  className="font-bold"
                  style={{ color: MATH_COLORS.warning }}
                >
                  {remainder}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step explanation */}
      {currentStepInfo && (
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            {language === 'he'
              ? (currentStepInfo as LongDivisionStep).explanationHe ||
                (currentStepInfo as LongDivisionStep).explanation ||
                (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabelHe ||
                (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabel
              : (currentStepInfo as LongDivisionStep).explanation ||
                (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabel}
          </p>
          {((currentStepInfo as LongDivisionStep).calculation ||
            (stepConfig?.[currentStep] as MathDiagramStepConfig)?.showCalculation) && (
            <p
              className="text-sm font-mono mt-1 font-medium"
              style={{ color: MATH_COLORS.primary }}
            >
              {(currentStepInfo as LongDivisionStep).calculation ||
                (stepConfig?.[currentStep] as MathDiagramStepConfig)?.showCalculation}
            </p>
          )}
        </div>
      )}

      {/* Final answer (shown at completion) */}
      {currentStep >= steps.length - 1 && (
        <div
          className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-center transition-all duration-500"
          style={fadeInStyle}
        >
          <p className="text-green-800 dark:text-green-200 font-medium">
            {dividend} ÷ {divisor} ={' '}
            <span className="font-bold" style={{ color: MATH_COLORS.quotient }}>
              {quotient}
            </span>
            {remainder > 0 && (
              <span className="text-gray-600 dark:text-gray-400">
                {' '}
                R{remainder}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Step counter */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-400">
          {language === 'he'
            ? `שלב ${currentStep + 1} מתוך ${steps.length}`
            : `Step ${currentStep + 1} of ${steps.length}`}
        </span>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
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
