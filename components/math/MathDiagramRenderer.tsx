'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MathDiagramState,
  MathDiagramStepConfig,
  LongDivisionData,
  EquationData,
  FractionOperationData,
} from '@/types/math'
import { LongDivisionDiagram } from './LongDivisionDiagram'
import { EquationSteps } from './EquationSteps'
import { FractionOperation } from './FractionOperation'
import { NumberLine } from './NumberLine'
import { CoordinatePlane } from './CoordinatePlane'

interface MathDiagramRendererProps {
  /** Diagram state from tutor response */
  diagram: MathDiagramState
  /** Override the current step */
  currentStep?: number
  /** Whether to animate transitions */
  animate?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** Callback when step animation completes */
  onStepComplete?: () => void
  /** Callback when user clicks to advance step manually */
  onStepAdvance?: () => void
  /** Whether to show step controls */
  showControls?: boolean
  /** Width of the diagram */
  width?: number
  /** Height of the diagram */
  height?: number
  /** Additional className */
  className?: string
  /** Language for labels */
  language?: 'en' | 'he'
}

/**
 * MathDiagramRenderer - Universal renderer for all math diagram types
 *
 * This component:
 * - Renders the appropriate diagram component based on type
 * - Manages step-synced animation state
 * - Provides optional controls for manual step advancement
 * - Integrates with tutor responses
 */
export function MathDiagramRenderer({
  diagram,
  currentStep: stepOverride,
  animate = true,
  animationDuration = 400,
  onStepComplete,
  onStepAdvance,
  showControls = false,
  width,
  height,
  className = '',
  language = 'en',
}: MathDiagramRendererProps) {
  const [internalStep, setInternalStep] = useState(diagram.visibleStep)

  // Use override step if provided, otherwise use internal state
  const currentStep = stepOverride ?? internalStep

  // Sync internal step with diagram state changes
  useEffect(() => {
    if (stepOverride === undefined) {
      setInternalStep(diagram.visibleStep)
    }
  }, [diagram.visibleStep, stepOverride])

  // Handle step completion
  const handleStepComplete = useCallback(() => {
    onStepComplete?.()
  }, [onStepComplete])

  // Handle manual step advance
  const handleNextStep = useCallback(() => {
    const totalSteps = diagram.totalSteps || diagram.stepConfig?.length || 10
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1
      if (stepOverride === undefined) {
        setInternalStep(newStep)
      }
      onStepAdvance?.()
    }
  }, [currentStep, diagram.totalSteps, diagram.stepConfig, stepOverride, onStepAdvance])

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      if (stepOverride === undefined) {
        setInternalStep(newStep)
      }
    }
  }, [currentStep, stepOverride])

  // Render the appropriate diagram type
  const renderDiagram = () => {
    const commonProps = {
      currentStep,
      stepConfig: diagram.stepConfig as MathDiagramStepConfig[],
      onStepComplete: handleStepComplete,
      animationDuration: animate ? animationDuration : 0,
      className: 'diagram-content',
      language,
    }

    switch (diagram.type) {
      case 'long_division':
        return (
          <LongDivisionDiagram
            data={diagram.data as LongDivisionData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'equation':
        return (
          <EquationSteps
            data={diagram.data as EquationData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'fraction':
        return (
          <FractionOperation
            data={diagram.data as FractionOperationData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'number_line':
        // NumberLine doesn't have step-sync yet, render directly
        // Cast through unknown to bridge between math.ts and index.ts NumberLineData types
        return (
          <NumberLine
            data={diagram.data as unknown as Parameters<typeof NumberLine>[0]['data']}
            width={width || 400}
            height={height || 100}
            className="diagram-content"
          />
        )

      case 'coordinate_plane':
        // CoordinatePlane doesn't have step-sync yet, render directly
        // Cast through unknown to bridge between math.ts and index.ts types
        return (
          <CoordinatePlane
            data={diagram.data as unknown as Parameters<typeof CoordinatePlane>[0]['data']}
            width={width || 400}
            height={height || 400}
            className="diagram-content"
          />
        )

      // Placeholder for future diagram types
      case 'triangle':
      case 'circle':
      case 'bar_model':
      case 'area_model':
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500">
              {language === 'he'
                ? `סוג תרשים "${diagram.type}" בפיתוח`
                : `Diagram type "${diagram.type}" coming soon`}
            </p>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500">
              {language === 'he' ? 'סוג תרשים לא ידוע' : 'Unknown diagram type'}
            </p>
          </div>
        )
    }
  }

  // Calculate total steps for progress indicator
  const totalSteps = diagram.totalSteps || diagram.stepConfig?.length || 1

  // Get diagram type display name
  const getDiagramTypeName = (): string => {
    const names = {
      en: {
        long_division: 'Long Division',
        equation: 'Equation Solving',
        fraction: 'Fractions',
        number_line: 'Number Line',
        coordinate_plane: 'Coordinate Plane',
        triangle: 'Triangle',
        circle: 'Circle',
        bar_model: 'Bar Model',
        area_model: 'Area Model',
      },
      he: {
        long_division: 'חילוק ארוך',
        equation: 'פתרון משוואה',
        fraction: 'שברים',
        number_line: 'ציר מספרים',
        coordinate_plane: 'מערכת צירים',
        triangle: 'משולש',
        circle: 'מעגל',
        bar_model: 'מודל עמודות',
        area_model: 'מודל שטח',
      },
    }
    return names[language][diagram.type] || diagram.type
  }

  return (
    <div className={`math-diagram-container ${className}`}>
      {/* Diagram type header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {getDiagramTypeName()}
        </span>
        <span className="text-xs text-gray-400">
          {language === 'he' ? 'צעד' : 'Step'} {currentStep + 1}/{totalSteps}
        </span>
      </div>

      {/* Diagram */}
      <div className="diagram-wrapper">
        {renderDiagram()}
      </div>

      {/* Step controls (optional) */}
      {showControls && totalSteps > 1 && (
        <div className="step-controls mt-3 flex items-center justify-between px-2">
          {/* Progress indicator */}
          <div className="progress-indicator flex items-center gap-2">
            <div className="progress-bar h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-32">
              <div
                className="progress-fill h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="nav-buttons flex gap-2">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? '← הקודם' : '← Prev'}
            </button>
            <button
              onClick={handleNextStep}
              disabled={currentStep >= totalSteps - 1}
              className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? 'הבא →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Current step info */}
      {diagram.stepConfig?.[currentStep]?.stepLabel && (
        <div className="step-info mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-md mx-2">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            {language === 'he'
              ? diagram.stepConfig[currentStep].stepLabelHe || diagram.stepConfig[currentStep].stepLabel
              : diagram.stepConfig[currentStep].stepLabel}
          </p>
        </div>
      )}

      <style jsx>{`
        .math-diagram-container {
          display: flex;
          flex-direction: column;
        }

        .diagram-wrapper {
          display: flex;
          justify-content: center;
          background: white;
          border-radius: 8px;
          padding: 16px;
          overflow: hidden;
        }

        @media (prefers-color-scheme: dark) {
          .diagram-wrapper {
            background: #1f2937;
          }
        }
      `}</style>
    </div>
  )
}

export default MathDiagramRenderer
