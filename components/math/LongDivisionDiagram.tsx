'use client'

import { useMemo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type LongDivisionData,
  type LongDivisionStep,
  type MathDiagramStepConfig,
  MATH_COLORS,
} from '@/types/math'
import type { SubjectKey } from '@/lib/diagram-theme'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

// Animation variants for step elements (available for SVG element animations)
const _stepVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  highlight: {
    opacity: 1,
    y: 0,
    scale: 1.05,
    transition: { duration: 0.2 }
  }
}

const _digitVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  }
}

const _lineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeInOut' }
  }
}

const _arrowVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      delay: 0.1
    }
  }
}

interface LongDivisionDiagramProps {
  data: LongDivisionData
  currentStep?: number
  totalSteps?: number
  stepConfig?: MathDiagramStepConfig[]
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

/**
 * LongDivisionDiagram - Textbook-style long division visualization
 *
 * Matches the exact format from reference images:
 * - Multiplication helper table on the left
 * - Vertical dotted guiding lines from each digit
 * - Orange horizontal lines for subtraction
 * - Bring-down arrows
 * - Proper column alignment
 */
export function LongDivisionDiagram({
  data,
  currentStep = 0,
  totalSteps: totalStepsProp,
  stepConfig,
  animationDuration = 400,
  onStepComplete: _onStepComplete,
  width = 500,
  height = 400,
  className = '',
  language = 'en',
  showStepCounter = true,
  subject = 'math',
  complexity = 'middle_school',
}: LongDivisionDiagramProps) {
  const { dividend, divisor, quotient, remainder, steps: rawSteps, title } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Guard against undefined steps array
  const steps = rawSteps ?? []

  const dividendStr = dividend.toString()
  const divisorStr = divisor.toString()
  const quotientStr = quotient.toString()

  const actualTotalSteps = totalStepsProp ?? steps.length

  // Generate multiplication helper table (1×divisor through 9×divisor)
  const multiplicationTable = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => ({
      multiplier: i + 1,
      product: (i + 1) * divisor,
    }))
  }, [divisor])

  // Calculate which steps are visible
  const visibleSteps = useMemo(() => {
    return steps.filter((s) => s.step <= currentStep)
  }, [steps, currentStep])

  // Check if current step is a bring-down step (to show arrow only during that step)
  // Check multiple sources since data can come from different places
  // BUG FIX: Use steps.find() instead of steps[currentStep] because step.step !== array index
  const currentStepData = steps.find(s => s.step === currentStep)

  // Gather all possible label sources
  const stepLabel = stepConfig?.[currentStep]?.stepLabel || ''
  const stepExplanation = currentStepData?.explanation || ''
  const allLabels = `${stepLabel} ${stepExplanation}`.toLowerCase()

  // Check type OR any label containing "bring down"
  const isBringDownStep = currentStepData?.type === 'bring_down' ||
    allLabels.includes('bring down')

  // For position detection, use whichever label has content
  const currentStepLabel = stepLabel || stepExplanation

  // Get position from step data, or infer from visible state
  const getBringDownPosition = (): number => {
    // First try to get from step data directly
    if (currentStepData?.type === 'bring_down' && currentStepData.position !== undefined) {
      return currentStepData.position
    }

    if (!isBringDownStep) return -1

    // Try to parse from label (e.g., "Bring down 3 to get 13")
    const match = currentStepLabel.match(/bring down (\d)/i)
    if (match) {
      const digit = match[1]
      // Find position of this digit in dividend (from position 1 onwards)
      for (let i = 1; i < dividendStr.length; i++) {
        if (dividendStr[i] === digit) {
          return i
        }
      }
    }

    // Fallback: find the latest bring-down row in visibleSteps
    for (let i = visibleSteps.length - 1; i >= 0; i--) {
      const step = visibleSteps[i]
      if (step.type === 'bring_down' && step.position !== undefined) {
        return step.position
      }
    }

    // Last resort: check current position from any visible step
    if (currentStepData?.position !== undefined) {
      return currentStepData.position
    }

    return dividendStr.length - 1 // Default to last digit
  }
  const bringDownPosition = getBringDownPosition()

  // Build quotient digits progressively
  const quotientDigits = useMemo(() => {
    const digits: Array<{ digit: number; position: number }> = []
    for (const step of visibleSteps) {
      if (step.type === 'divide' && step.quotientDigit !== undefined) {
        digits.push({ digit: step.quotientDigit, position: step.position })
      }
    }
    return digits
  }, [visibleSteps])

  // Build work rows for display
  const workRows = useMemo(() => {
    const rows: Array<{
      position: number
      product?: number
      difference?: number
      workingNumber?: number
      showProduct: boolean
      showDifference: boolean
      showBringDown: boolean
      bringDownDigit?: string
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
          showBringDown: false,
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
        if (step.type === 'bring_down') {
          currentRow.showBringDown = true
          currentRow.workingNumber = step.workingNumber
          // Get the digit being brought down
          const nextPos = step.position
          if (nextPos < dividendStr.length) {
            currentRow.bringDownDigit = dividendStr[nextPos]
          }
        }
      }
    }

    if (currentRow) {
      rows.push(currentRow)
    }

    return rows
  }, [visibleSteps, dividendStr])

  // Get current step info
  const currentStepInfo = useMemo(() => {
    if (stepConfig && stepConfig[currentStep]) {
      return stepConfig[currentStep]
    }
    return steps[currentStep] || null
  }, [stepConfig, steps, currentStep])

  const isComplete = currentStep >= steps.length - 1
  const progressPercent = ((currentStep + 1) / actualTotalSteps) * 100

  // Sizing
  const digitWidth = 32  // Width per digit column
  const digitHeight = 38 // Height per row
  const fontSize = 24
  const smallFontSize = 16

  // Colors - distinct for each element to aid visual hierarchy
  const lineColor = '#f59e0b'  // Amber for subtraction lines
  const guideLineColor = 'rgba(156, 163, 175, 0.4)'  // Light gray dotted lines
  const textColor = '#1f2937'
  const quotientColor = '#2563eb'  // Blue for quotient (answer)
  const divisorColor = '#7c3aed'  // Violet for divisor
  const dividendColor = '#1f2937'  // Dark for dividend (default)

  // Calculate bring-down arrow position (for big visual arrow from dividend to working number)
  const bringDownArrowInfo = useMemo(() => {
    if (!isBringDownStep || bringDownPosition < 0) return null

    // Calculate pixel positions
    // X position: center of the digit column at bringDownPosition
    const divisorWidth = divisorStr.length * digitWidth * 0.6
    const bracketWidth = 16
    const xCenter = divisorWidth + bracketWidth + (bringDownPosition * digitWidth) + (digitWidth / 2)

    // Y start: bottom of dividend row (quotient row + dividend row)
    const yStart = digitHeight + digitHeight + 4 // After quotient and dividend rows

    // Y end: Calculate based on work rows above this bring-down
    // Count all visible elements in rows before the bring-down position
    let elementsAbove = 0
    for (const row of workRows) {
      if (row.position >= bringDownPosition) {
        // This row is at or after our target position - count elements within it
        if (row.showProduct) elementsAbove += 2 // product row + orange line
        if (row.showDifference) elementsAbove++
        break
      }
      // Count all elements in previous rows
      if (row.showProduct) elementsAbove += 2 // product row + orange line
      if (row.showDifference) elementsAbove++
      if (row.showBringDown) elementsAbove++
    }

    const yEnd = digitHeight * 2 + (elementsAbove * digitHeight) + 8

    return { xCenter, yStart, yEnd }
  }, [isBringDownStep, bringDownPosition, workRows, divisorStr.length, digitWidth, digitHeight])

  // Animation state - track which step is currently animating
  const [animatingStep, setAnimatingStep] = useState<number>(-1)
  const [hasAnimated, setHasAnimated] = useState<Set<number>>(new Set())

  // Trigger animation when step changes
  useEffect(() => {
    if (currentStep > 0 && !hasAnimated.has(currentStep)) {
      setAnimatingStep(currentStep)
      const timer = setTimeout(() => {
        setAnimatingStep(-1)
        setHasAnimated(prev => new Set([...prev, currentStep]))
      }, animationDuration)
      return () => clearTimeout(timer)
    }
  }, [currentStep, hasAnimated, animationDuration])

  // Check if an element should animate (show entrance animation)
  // Available for SVG element animations
  const _shouldAnimate = (stepNum: number) => {
    return animatingStep === stepNum || !hasAnimated.has(stepNum)
  }

  return (
    <div className={`long-division-diagram ${className}`} style={{ width, minHeight: height }}>

      {/* Header */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3">
          {title}
        </h3>
      )}

      {/* Progress bar with smooth animation */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${progressPercent}%`,
            background: isComplete
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : `linear-gradient(90deg, ${subjectColors.dark}, ${subjectColors.primary})`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Main diagram */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex gap-8 justify-center">

          {/* Multiplication helper table (left side) */}
          <div
            className="flex-shrink-0 pr-6 border-r border-gray-200 dark:border-gray-600"
            style={{ fontSize: smallFontSize, fontFamily: 'ui-monospace, monospace' }}
          >
            <div className="text-xs text-gray-500 mb-2 font-medium">
              {language === 'he' ? 'טבלת כפל' : 'Helper'}
            </div>
            {multiplicationTable.map(({ multiplier, product }) => (
              <div
                key={multiplier}
                className="flex items-center gap-2 py-0.5"
                style={{ color: textColor }}
              >
                <span className="w-4 text-right">{multiplier}</span>
                <span className="text-gray-400">×</span>
                <span className="font-medium" style={{ color: divisorColor }}>{product}</span>
              </div>
            ))}
          </div>

          {/* Division diagram (right side) */}
          <div
            className="relative"
            style={{ fontFamily: 'ui-monospace, monospace', fontSize }}
          >
            {/* SVG for lines and guides */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{
                width: '100%',
                height: '100%',
                overflow: 'visible',
              }}
            >
              {/* Vertical guide lines BETWEEN dividend digit columns (not at outer edges) */}
              {Array.from({ length: dividendStr.length - 1 }, (_, i) => {
                // Position guide lines between columns (after column i, before column i+1)
                // Dividend starts at: divisorWidth + bracket(16px)
                const x = (divisorStr.length * digitWidth * 0.6) + 16 + ((i + 1) * digitWidth)
                return (
                  <line
                    key={`guide-${i}`}
                    x1={x}
                    y1={digitHeight + 8}
                    x2={x}
                    y2={digitHeight * (workRows.length + 3) + 40}
                    stroke={guideLineColor}
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                )
              })}

              {/* Big bring-down arrow - curved arrow from dividend digit to working number */}
              {bringDownArrowInfo && (
                <g>
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="bringdown-arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={lineColor}
                      />
                    </marker>
                  </defs>
                  {/* Curved arrow path */}
                  <path
                    d={`M ${bringDownArrowInfo.xCenter} ${bringDownArrowInfo.yStart}
                        C ${bringDownArrowInfo.xCenter + 25} ${bringDownArrowInfo.yStart + (bringDownArrowInfo.yEnd - bringDownArrowInfo.yStart) * 0.3},
                          ${bringDownArrowInfo.xCenter + 25} ${bringDownArrowInfo.yEnd - (bringDownArrowInfo.yEnd - bringDownArrowInfo.yStart) * 0.3},
                          ${bringDownArrowInfo.xCenter} ${bringDownArrowInfo.yEnd}`}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    markerEnd="url(#bringdown-arrowhead)"
                    style={{
                      animation: `fadeIn ${animationDuration}ms ease-out`,
                    }}
                  />
                </g>
              )}
            </svg>

            {/* Quotient row */}
            <div className="flex mb-1" style={{ height: digitHeight }}>
              {/* Spacer for divisor */}
              <div style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }} />

              {/* Quotient digits */}
              <div className="flex">
                {dividendStr.split('').map((_, i) => {
                  const qDigit = quotientDigits.find(d => d.position === i)
                  return (
                    <div
                      key={i}
                      className="text-center font-bold"
                      style={{
                        width: digitWidth,
                        color: qDigit ? quotientColor : 'transparent',
                        lineHeight: `${digitHeight}px`,
                      }}
                    >
                      {qDigit !== undefined ? qDigit.digit : '\u00A0'}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Division bracket row: divisor ) dividend */}
            <div className="flex items-center" style={{ height: digitHeight }}>
              {/* Divisor */}
              <div
                className="text-right font-semibold pr-1"
                style={{
                  width: divisorStr.length * digitWidth * 0.6,
                  color: divisorColor,
                  lineHeight: `${digitHeight}px`,
                }}
              >
                {divisorStr}
              </div>

              {/* Division bracket - curved ) */}
              <div
                className="relative flex-shrink-0"
                style={{
                  width: 16,
                  height: digitHeight,
                }}
              >
                <svg width="16" height={digitHeight} style={{ overflow: 'visible' }}>
                  <path
                    d={`M 2 0 Q 14 ${digitHeight/2} 2 ${digitHeight}`}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Top horizontal line over dividend */}
                  <line
                    x1="2"
                    y1="2"
                    x2={dividendStr.length * digitWidth + 8}
                    y2="2"
                    stroke={lineColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Dividend digits */}
              <div className="flex">
                {dividendStr.split('').map((digit, i) => (
                  <div
                    key={i}
                    className="text-center font-semibold"
                    style={{
                      width: digitWidth,
                      color: dividendColor,
                      lineHeight: `${digitHeight}px`,
                    }}
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>

            {/* Work rows - use same flex+spacer pattern as dividend for exact alignment */}
            <div className="relative">
              {workRows.map((row, rowIndex) => {
                // Check if next row has bring_down - if so, skip showing difference (it's incorporated into workingNumber)
                const nextRow = workRows[rowIndex + 1]
                const skipDifference = nextRow?.showBringDown && nextRow?.workingNumber !== undefined

                return (
                <div key={rowIndex}>
                  {/* Product line (subtraction) */}
                  {row.showProduct && row.product !== undefined && (
                    <div
                      className="flex transition-all duration-300"
                      style={{
                        height: digitHeight,
                        animation: `fadeIn ${animationDuration}ms ease-out`,
                      }}
                    >
                      {/* Spacer matching divisor width */}
                      <div
                        className="flex-shrink-0 flex items-center justify-end pr-1"
                        style={{ width: divisorStr.length * digitWidth * 0.6 }}
                      >
                        <span style={{ color: textColor }}>−</span>
                      </div>
                      {/* Spacer matching bracket width */}
                      <div className="flex-shrink-0" style={{ width: 16 }} />
                      {/* Product digits - same structure as dividend */}
                      <div className="flex">
                        {dividendStr.split('').map((_, i) => {
                          const productStr = row.product!.toString()
                          const endCol = row.position
                          const startCol = endCol - productStr.length + 1
                          const digitIndex = i - startCol
                          const showDigit = digitIndex >= 0 && digitIndex < productStr.length

                          return (
                            <div
                              key={i}
                              className="text-center font-semibold flex-shrink-0"
                              style={{
                                width: digitWidth,
                                color: showDigit ? textColor : 'transparent',
                                lineHeight: `${digitHeight}px`,
                              }}
                            >
                              {showDigit ? productStr[digitIndex] : '\u00A0'}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Subtraction line (orange) */}
                  {row.showProduct && (
                    <div
                      className="flex"
                      style={{ height: 3 }}
                    >
                      {/* Spacer for divisor + bracket */}
                      <div className="flex-shrink-0" style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }} />
                      {/* Orange line spanning the columns */}
                      <div
                        style={{
                          background: lineColor,
                          borderRadius: 2,
                          width: (row.position + 1) * digitWidth,
                        }}
                      />
                    </div>
                  )}

                  {/* Difference (result after subtraction) - skip if next row has bring_down */}
                  {row.showDifference && row.difference !== undefined && !skipDifference && (
                    <div
                      className="flex transition-all duration-300"
                      style={{
                        height: digitHeight,
                        animation: `fadeIn ${animationDuration}ms ease-out`,
                      }}
                    >
                      {/* Spacer for divisor + bracket */}
                      <div className="flex-shrink-0" style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }} />
                      {/* Difference digits */}
                      <div className="flex">
                        {dividendStr.split('').map((_, i) => {
                          const diffStr = row.difference!.toString()
                          const endCol = row.position
                          const startCol = endCol - diffStr.length + 1
                          const digitIndex = i - startCol
                          const showDigit = digitIndex >= 0 && digitIndex < diffStr.length

                          return (
                            <div
                              key={i}
                              className="text-center font-semibold flex-shrink-0"
                              style={{
                                width: digitWidth,
                                color: showDigit ? textColor : 'transparent',
                                lineHeight: `${digitHeight}px`,
                              }}
                            >
                              {showDigit ? diffStr[digitIndex] : '\u00A0'}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bring down arrow and new working number */}
                  {row.showBringDown && row.workingNumber !== undefined && (
                    <div
                      className="flex transition-all duration-300"
                      style={{
                        height: digitHeight,
                        animation: `fadeIn ${animationDuration}ms ease-out`,
                      }}
                    >
                      {/* Spacer for divisor + bracket */}
                      <div className="flex-shrink-0" style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }} />
                      {/* Working number digits */}
                      <div className="flex relative">
                        {dividendStr.split('').map((_, i) => {
                          const workStr = row.workingNumber!.toString()
                          const endCol = row.position
                          const startCol = endCol - workStr.length + 1
                          const digitIndex = i - startCol
                          const showDigit = digitIndex >= 0 && digitIndex < workStr.length

                          return (
                            <div
                              key={i}
                              className="text-center font-semibold relative flex-shrink-0"
                              style={{
                                width: digitWidth,
                                color: showDigit ? textColor : 'transparent',
                                lineHeight: `${digitHeight}px`,
                              }}
                            >
                              {showDigit ? workStr[digitIndex] : '\u00A0'}
                              {/* Big bring-down arrow is now rendered in SVG above */}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                )
              })}

              {/* Final remainder with line */}
              {isComplete && (
                <div>
                  {/* Final subtraction line */}
                  <div className="flex" style={{ height: 3 }}>
                    <div className="flex-shrink-0" style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }} />
                    <div
                      style={{
                        background: lineColor,
                        borderRadius: 2,
                        width: dividendStr.length * digitWidth,
                      }}
                    />
                  </div>

                  {/* Remainder */}
                  <div
                    className="flex transition-all duration-300"
                    style={{
                      height: digitHeight,
                      animation: `fadeIn ${animationDuration}ms ease-out`,
                    }}
                  >
                    <div className="flex-shrink-0" style={{ width: divisorStr.length * digitWidth * 0.6 + 16 }} />
                    <div className="flex">
                      {dividendStr.split('').map((_, i) => {
                        const remStr = remainder.toString()
                        const endCol = dividendStr.length - 1
                        const startCol = endCol - remStr.length + 1
                        const digitIndex = i - startCol
                        const showDigit = digitIndex >= 0 && digitIndex < remStr.length

                        return (
                          <div
                            key={i}
                            className="text-center font-bold flex-shrink-0"
                            style={{
                              width: digitWidth,
                              color: showDigit ? MATH_COLORS.success : 'transparent',
                              lineHeight: `${digitHeight}px`,
                            }}
                          >
                            {showDigit ? remStr[digitIndex] : '\u00A0'}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step explanation with animation */}
      <AnimatePresence mode="wait">
        {currentStepInfo && (
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-4 p-4 rounded-xl border-l-4"
            style={{
              backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              borderLeftColor: isComplete ? MATH_COLORS.success : lineColor,
            }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              {language === 'he'
                ? (currentStepInfo as LongDivisionStep).explanationHe ||
                  (currentStepInfo as LongDivisionStep).explanation ||
                  (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabelHe ||
                  (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabel
                : (currentStepInfo as LongDivisionStep).explanation ||
                  (stepConfig?.[currentStep] as MathDiagramStepConfig)?.stepLabel}
            </motion.p>

            {((currentStepInfo as LongDivisionStep).calculation ||
              (stepConfig?.[currentStep] as MathDiagramStepConfig)?.showCalculation) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="mt-2 inline-block px-3 py-1.5 rounded-lg font-mono text-sm font-semibold"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#b45309',
                }}
              >
                {(currentStepInfo as LongDivisionStep).calculation ||
                  (stepConfig?.[currentStep] as MathDiagramStepConfig)?.showCalculation}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final answer with celebration animation */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mt-4 p-4 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
              border: '2px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-semibold text-gray-800 dark:text-gray-200"
            >
              {dividend} ÷ {divisor} ={' '}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="font-bold inline-block"
                style={{ color: quotientColor }}
              >
                {quotientStr}
              </motion.span>
              {remainder > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-500 ml-2"
                >
                  {language === 'he' ? `שארית ${remainder}` : `R ${remainder}`}
                </motion.span>
              )}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step counter */}
      {showStepCounter && (
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400">
            {language === 'he'
              ? `שלב ${currentStep + 1} מתוך ${actualTotalSteps}`
              : `Step ${currentStep + 1} of ${actualTotalSteps}`}
          </span>
        </div>
      )}

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
