'use client'

import { useMemo } from 'react'
import {
  FractionOperationData,
  FractionStep,
  Fraction,
  MathDiagramStepConfig,
  MATH_COLORS,
  FRACTION_COLORS,
} from '@/types/math'

interface FractionOperationProps {
  data: FractionOperationData
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
 * FractionOperation - Step-synced visualization of fraction operations
 *
 * Shows fraction operations progressively:
 * 1. Initial fractions
 * 2. Find LCD (for add/subtract)
 * 3. Convert fractions
 * 4. Perform operation
 * 5. Simplify result
 */
export function FractionOperation({
  data,
  currentStep = 0,
  stepConfig: _stepConfig,
  animationDuration = 400,
  onStepComplete: _onStepComplete,
  width = 400,
  height: _height,
  className = '',
  language = 'en',
}: FractionOperationProps) {
  const {
    operationType,
    fraction1,
    fraction2,
    result,
    steps,
    title,
    showPieChart,
    showBarModel,
  } = data

  // Get visible steps
  const visibleSteps = useMemo(() => {
    return steps.filter((s) => s.step <= currentStep)
  }, [steps, currentStep])

  // Current step info
  const currentStepInfo = useMemo(() => {
    return steps[currentStep] || null
  }, [steps, currentStep])

  // Get operator symbol
  const getOperatorSymbol = (): string => {
    switch (operationType) {
      case 'add':
        return '+'
      case 'subtract':
        return '−'
      case 'multiply':
        return '×'
      case 'divide':
        return '÷'
    }
  }

  // Animation style
  const fadeInStyle = {
    animation: `fadeIn ${animationDuration}ms ease-out`,
  }

  return (
    <div className={`fraction-operation ${className}`} style={{ width }}>
      {/* Title */}
      {title && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h3>
        </div>
      )}

      {/* Visual representations */}
      {(showPieChart || showBarModel) && currentStepInfo && (
        <div className="mb-4 flex justify-center gap-4">
          {showPieChart && (
            <div className="flex items-center gap-2">
              <FractionPieChart
                fraction={currentStepInfo.fractions[0] || fraction1}
                color={FRACTION_COLORS[0]}
                size={60}
              />
              {currentStepInfo.fractions[1] && (
                <>
                  <span className="text-xl text-gray-500">{getOperatorSymbol()}</span>
                  <FractionPieChart
                    fraction={currentStepInfo.fractions[1] || fraction2}
                    color={FRACTION_COLORS[1]}
                    size={60}
                  />
                </>
              )}
              {currentStepInfo.result && (
                <>
                  <span className="text-xl text-gray-500">=</span>
                  <FractionPieChart
                    fraction={currentStepInfo.result}
                    color={FRACTION_COLORS[2]}
                    size={60}
                  />
                </>
              )}
            </div>
          )}

          {showBarModel && (
            <div className="flex flex-col gap-2">
              <FractionBar
                fraction={currentStepInfo.fractions[0] || fraction1}
                color={FRACTION_COLORS[0]}
                width={120}
              />
              {currentStepInfo.fractions[1] && (
                <FractionBar
                  fraction={currentStepInfo.fractions[1] || fraction2}
                  color={FRACTION_COLORS[1]}
                  width={120}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Fraction expression */}
      <div className="flex items-center justify-center gap-3 text-2xl mb-4">
        {/* First fraction - always visible */}
        <FractionDisplay
          fraction={fraction1}
          highlighted={currentStep === 0}
          color={FRACTION_COLORS[0]}
        />

        {/* Operator */}
        <span className="text-gray-500 font-medium">{getOperatorSymbol()}</span>

        {/* Second fraction */}
        <FractionDisplay
          fraction={fraction2}
          highlighted={currentStep === 0}
          color={FRACTION_COLORS[1]}
        />

        {/* Equals and result (shown progressively) */}
        {currentStep >= steps.length - 1 && (
          <>
            <span className="text-gray-500">=</span>
            <FractionDisplay
              fraction={result}
              highlighted={true}
              color={MATH_COLORS.success}
              style={fadeInStyle}
            />
          </>
        )}
      </div>

      {/* Steps explanation */}
      <div className="space-y-2">
        {visibleSteps.map((step, index) => {
          const isCurrentStep = step.step === currentStep
          const stepInfo = step as FractionStep

          return (
            <div
              key={index}
              className={`
                p-3 rounded-lg transition-all duration-300
                ${isCurrentStep
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500'
                  : 'bg-gray-50 dark:bg-gray-800/50'
                }
              `}
              style={isCurrentStep ? fadeInStyle : undefined}
            >
              {/* Step type badge */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`
                    text-xs font-medium px-2 py-0.5 rounded-full
                    ${isCurrentStep
                      ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}
                >
                  {getStepTypeName(stepInfo.type, language)}
                </span>
              </div>

              {/* Fractions at this step */}
              {stepInfo.fractions.length > 0 && (
                <div className="flex items-center justify-center gap-2 my-2">
                  {stepInfo.fractions.map((f, fIndex) => (
                    <div key={fIndex} className="flex items-center gap-2">
                      {fIndex > 0 && (
                        <span className="text-gray-400">{stepInfo.operator || getOperatorSymbol()}</span>
                      )}
                      <FractionDisplay
                        fraction={f}
                        size="small"
                        color={FRACTION_COLORS[fIndex % FRACTION_COLORS.length]}
                      />
                    </div>
                  ))}
                  {stepInfo.result && (
                    <>
                      <span className="text-gray-400">=</span>
                      <FractionDisplay
                        fraction={stepInfo.result}
                        size="small"
                        color={MATH_COLORS.success}
                      />
                    </>
                  )}
                </div>
              )}

              {/* LCD display */}
              {stepInfo.lcd && (
                <p className="text-center text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                  LCD = {stepInfo.lcd}
                </p>
              )}

              {/* Calculation */}
              {stepInfo.calculation && (
                <p className="text-center text-sm font-mono text-gray-600 dark:text-gray-400">
                  {stepInfo.calculation}
                </p>
              )}

              {/* Description */}
              {(stepInfo.description || stepInfo.descriptionHe) && (
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                  {language === 'he'
                    ? stepInfo.descriptionHe || stepInfo.description
                    : stepInfo.description}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Final result highlight */}
      {currentStep >= steps.length - 1 && (
        <div
          className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center border-2 border-green-300 dark:border-green-700"
          style={fadeInStyle}
        >
          <p className="text-sm text-green-600 dark:text-green-400 mb-2">
            {language === 'he' ? 'תשובה:' : 'Answer:'}
          </p>
          <div className="flex justify-center">
            <FractionDisplay
              fraction={result}
              color={MATH_COLORS.success}
              size="large"
            />
          </div>
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

/**
 * Get step type display name
 */
function getStepTypeName(type: FractionStep['type'], language: 'en' | 'he'): string {
  const names = {
    en: {
      initial: 'Original',
      find_lcd: 'Find LCD',
      convert: 'Convert',
      operate: 'Calculate',
      simplify: 'Simplify',
      result: 'Result',
    },
    he: {
      initial: 'מקורי',
      find_lcd: 'מצא מכנה משותף',
      convert: 'המר',
      operate: 'חשב',
      simplify: 'צמצם',
      result: 'תוצאה',
    },
  }
  return names[language][type] || type
}

/**
 * Fraction Display Component
 */
function FractionDisplay({
  fraction,
  highlighted = false,
  color = MATH_COLORS.primary,
  size = 'normal',
  style,
}: {
  fraction: Fraction
  highlighted?: boolean
  color?: string
  size?: 'small' | 'normal' | 'large'
  style?: React.CSSProperties
}) {
  const fontSize = size === 'small' ? 'text-base' : size === 'large' ? 'text-3xl' : 'text-xl'

  return (
    <div
      className={`inline-flex flex-col items-center ${fontSize}`}
      style={{
        color: highlighted ? color : undefined,
        fontWeight: highlighted ? 'bold' : 'normal',
        ...style,
      }}
    >
      {/* Whole number (for mixed fractions) */}
      {fraction.wholeNumber !== undefined && fraction.wholeNumber !== 0 && (
        <div className="flex items-center gap-1">
          <span>{fraction.wholeNumber}</span>
          <div className="flex flex-col items-center">
            <span className="border-b border-current px-1">{fraction.numerator}</span>
            <span>{fraction.denominator}</span>
          </div>
        </div>
      )}

      {/* Regular fraction */}
      {(fraction.wholeNumber === undefined || fraction.wholeNumber === 0) && (
        <div className="flex flex-col items-center">
          <span className="border-b-2 border-current px-2">{fraction.numerator}</span>
          <span>{fraction.denominator}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Fraction Pie Chart Component
 */
function FractionPieChart({
  fraction,
  color,
  size = 60,
}: {
  fraction: Fraction
  color: string
  size?: number
}) {
  const percentage = fraction.numerator / fraction.denominator
  const angle = percentage * 360

  // SVG arc path
  const x = size / 2
  const y = size / 2
  const r = (size - 4) / 2

  const startX = x
  const startY = y - r

  const radians = (angle * Math.PI) / 180
  const endX = x + r * Math.sin(radians)
  const endY = y - r * Math.cos(radians)

  const largeArc = angle > 180 ? 1 : 0

  const pathD =
    angle >= 360
      ? `M ${x} ${y - r} A ${r} ${r} 0 1 1 ${x - 0.001} ${y - r} Z`
      : `M ${x} ${y} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={2}
      />

      {/* Filled portion */}
      <path d={pathD} fill={color} opacity={0.7} />

      {/* Border */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
    </svg>
  )
}

/**
 * Fraction Bar Model Component
 */
function FractionBar({
  fraction,
  color,
  width = 120,
}: {
  fraction: Fraction
  color: string
  width?: number
}) {
  const segments = fraction.denominator
  const filled = fraction.numerator
  const segmentWidth = width / segments

  return (
    <div
      className="flex border-2 rounded overflow-hidden"
      style={{ width, borderColor: color }}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`h-6 border-r last:border-r-0`}
          style={{
            width: segmentWidth,
            backgroundColor: i < filled ? color : 'transparent',
            opacity: i < filled ? 0.7 : 1,
            borderColor: color,
          }}
        />
      ))}
    </div>
  )
}

export default FractionOperation
