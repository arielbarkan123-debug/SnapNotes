'use client'

import { useMemo } from 'react'
import {
  EquationData,
  EquationStep,
  MathDiagramStepConfig,
  MATH_COLORS,
} from '@/types/math'

interface EquationStepsProps {
  data: EquationData
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
 * EquationSteps - Step-synced visualization of algebraic equation solving
 *
 * Shows the equation transformation progressively:
 * 1. Original equation
 * 2. Each algebraic step with operation explanation
 * 3. Final solution
 */
export function EquationSteps({
  data,
  currentStep = 0,
  stepConfig,
  animationDuration = 400,
  onStepComplete: _onStepComplete,
  width = 400,
  height: _height,
  className = '',
  language = 'en',
}: EquationStepsProps) {
  const { originalEquation: _originalEquation, variable, solution, steps, title, showBalanceScale } = data

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

  // Animation style
  const fadeInStyle = {
    animation: `fadeIn ${animationDuration}ms ease-out`,
  }

  // Get operation symbol
  const getOperationSymbol = (operation: EquationStep['operation']): string => {
    switch (operation) {
      case 'add':
        return '+'
      case 'subtract':
        return '−'
      case 'multiply':
        return '×'
      case 'divide':
        return '÷'
      case 'simplify':
        return '='
      case 'combine':
        return '⟹'
      case 'distribute':
        return '⟹'
      case 'factor':
        return '⟹'
      default:
        return ''
    }
  }

  // Get operation color
  const getOperationColor = (operation: EquationStep['operation']): string => {
    switch (operation) {
      case 'add':
        return MATH_COLORS.success
      case 'subtract':
        return MATH_COLORS.error
      case 'multiply':
        return MATH_COLORS.primary
      case 'divide':
        return MATH_COLORS.warning
      default:
        return MATH_COLORS.secondary
    }
  }

  return (
    <div className={`equation-steps ${className}`} style={{ width }}>
      {/* Title */}
      {title && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h3>
        </div>
      )}

      {/* Balance Scale Visualization (optional) */}
      {showBalanceScale && currentStepInfo && (
        <div className="mb-4 flex justify-center">
          <BalanceScale
            leftSide={(steps[currentStep] as EquationStep)?.leftSide || ''}
            rightSide={(steps[currentStep] as EquationStep)?.rightSide || ''}
            isBalanced={currentStep === steps.length - 1}
          />
        </div>
      )}

      {/* Equation steps */}
      <div className="space-y-3">
        {visibleSteps.map((step, index) => {
          const isCurrentStep = step.step === currentStep
          const stepInfo = step as EquationStep

          return (
            <div
              key={index}
              className={`
                p-3 rounded-lg transition-all duration-300
                ${isCurrentStep
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700'
                  : 'bg-gray-50 dark:bg-gray-800/50'
                }
              `}
              style={isCurrentStep ? fadeInStyle : undefined}
            >
              {/* Equation */}
              <div className="flex items-center justify-center gap-2 font-mono text-lg">
                <span
                  className={`
                    ${isCurrentStep ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-gray-700 dark:text-gray-300'}
                  `}
                >
                  {stepInfo.leftSide}
                </span>
                <span className="text-gray-500">=</span>
                <span
                  className={`
                    ${isCurrentStep ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-gray-700 dark:text-gray-300'}
                  `}
                >
                  {stepInfo.rightSide}
                </span>
              </div>

              {/* Operation explanation */}
              {stepInfo.operation && stepInfo.operation !== 'initial' && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                  <span
                    className="px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: getOperationColor(stepInfo.operation) }}
                  >
                    {getOperationSymbol(stepInfo.operation)} {stepInfo.calculation}
                  </span>
                </div>
              )}

              {/* Description */}
              {(stepInfo.description || stepInfo.descriptionHe) && isCurrentStep && (
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                  {language === 'he'
                    ? stepInfo.descriptionHe || stepInfo.description
                    : stepInfo.description}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Arrows between steps */}
      <div className="flex flex-col items-center my-2">
        {visibleSteps.slice(0, -1).map((_, index) => (
          <div
            key={`arrow-${index}`}
            className="text-gray-400 dark:text-gray-600 text-lg"
          >
            ↓
          </div>
        ))}
      </div>

      {/* Final solution highlight */}
      {currentStep >= steps.length - 1 && (
        <div
          className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center border-2 border-green-300 dark:border-green-700"
          style={fadeInStyle}
        >
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">
            {language === 'he' ? 'פתרון:' : 'Solution:'}
          </p>
          <p
            className="text-2xl font-bold font-mono"
            style={{ color: MATH_COLORS.success }}
          >
            {variable} = {solution}
          </p>
        </div>
      )}

      {/* Step description from config */}
      {stepConfig?.[currentStep]?.stepLabel && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-center">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {language === 'he'
              ? stepConfig[currentStep].stepLabelHe || stepConfig[currentStep].stepLabel
              : stepConfig[currentStep].stepLabel}
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

/**
 * Balance Scale - Visual representation of equation balance
 */
function BalanceScale({
  leftSide,
  rightSide,
  isBalanced,
}: {
  leftSide: string
  rightSide: string
  isBalanced: boolean
}) {
  return (
    <div className="relative w-64 h-32">
      {/* Fulcrum (triangle base) */}
      <div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '20px solid transparent',
          borderRight: '20px solid transparent',
          borderBottom: `30px solid ${MATH_COLORS.muted}`,
        }}
      />

      {/* Beam */}
      <div
        className={`
          absolute top-10 left-0 right-0 h-2 bg-gray-600 dark:bg-gray-400 rounded
          transform transition-transform duration-500 origin-center
          ${isBalanced ? 'rotate-0' : '-rotate-2'}
        `}
      />

      {/* Left pan */}
      <div className="absolute top-12 left-4 w-20 text-center">
        <div className="w-full h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 flex items-center justify-center">
          <span className="text-xs font-mono font-medium text-indigo-700 dark:text-indigo-300 truncate px-1">
            {leftSide}
          </span>
        </div>
        <div className="w-px h-4 bg-gray-400 mx-auto" />
      </div>

      {/* Right pan */}
      <div className="absolute top-12 right-4 w-20 text-center">
        <div className="w-full h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 flex items-center justify-center">
          <span className="text-xs font-mono font-medium text-indigo-700 dark:text-indigo-300 truncate px-1">
            {rightSide}
          </span>
        </div>
        <div className="w-px h-4 bg-gray-400 mx-auto" />
      </div>

      {/* Balance indicator */}
      {isBalanced && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <span className="text-green-500 text-xl">✓</span>
        </div>
      )}
    </div>
  )
}

export default EquationSteps
