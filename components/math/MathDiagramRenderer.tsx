'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type MathDiagramState,
  type MathDiagramStepConfig,
  type LongDivisionData,
  type EquationData,
  type FractionOperationData,
} from '@/types/math'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { LongDivisionDiagram } from './LongDivisionDiagram'
import { EquationSteps } from './EquationSteps'
import { FractionOperation } from './FractionOperation'
import { NumberLine } from './NumberLine'
import { CoordinatePlane } from './CoordinatePlane'
import { FactoringDiagram, type FactoringData } from './FactoringDiagram'
import { CompletingSquareSteps, type CompletingSquareData } from './CompletingSquareSteps'
import { PolynomialOperations, type PolynomialOperationsData } from './PolynomialOperations'
import { RadicalSimplification, type RadicalSimplificationData } from './RadicalSimplification'
import { SystemsOfEquations, type SystemsOfEquationsData } from './SystemsOfEquations'
import { InequalityDiagram, type InequalityData } from './InequalityDiagram'

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
  /** Callback when user clicks to go back a step */
  onStepBack?: () => void
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
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
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
  onStepBack,
  showControls = false,
  width,
  height,
  className = '',
  language = 'en',
  subject = 'math',
  complexity = 'middle_school',
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

  // Calculate total steps once for use in rendering and controls
  const dataStepsArray = (diagram.data as { steps?: unknown[] })?.steps
  const calculatedTotalSteps = diagram.totalSteps ?? diagram.stepConfig?.length ?? dataStepsArray?.length ?? 1

  // Handle step completion
  const handleStepComplete = useCallback(() => {
    onStepComplete?.()
  }, [onStepComplete])

  // Handle manual step advance - always update internal state AND notify parent
  const handleNextStep = useCallback(() => {
    if (currentStep < calculatedTotalSteps - 1) {
      const newStep = currentStep + 1
      setInternalStep(newStep)
      onStepAdvance?.()
    }
  }, [currentStep, calculatedTotalSteps, onStepAdvance])

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setInternalStep(newStep)
      onStepBack?.()
    }
  }, [currentStep, onStepBack])

  // Render the appropriate diagram type
  const renderDiagram = () => {
    const commonProps = {
      currentStep,
      stepConfig: diagram.stepConfig as MathDiagramStepConfig[],
      onStepComplete: handleStepComplete,
      animationDuration: animate ? animationDuration : 0,
      className: 'diagram-content',
      language,
      subject,
      complexity,
    }

    switch (diagram.type) {
      case 'long_division':
        return (
          <LongDivisionDiagram
            data={diagram.data as LongDivisionData}
            width={width || 620}
            height={height || 450}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'equation':
        return (
          <EquationSteps
            data={diagram.data as EquationData}
            width={width || 400}
            height={height || 350}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'fraction':
        return (
          <FractionOperation
            data={diagram.data as FractionOperationData}
            width={width || 400}
            height={height || 350}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
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
            subject={subject}
            complexity={complexity}
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
            subject={subject}
            complexity={complexity}
          />
        )

      case 'factoring':
        return (
          <FactoringDiagram
            data={diagram.data as unknown as FactoringData}
            width={width || 420}
            height={height || 400}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'completing_square':
        return (
          <CompletingSquareSteps
            data={diagram.data as unknown as CompletingSquareData}
            width={width || 440}
            height={height || 450}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'polynomial':
        return (
          <PolynomialOperations
            data={diagram.data as unknown as PolynomialOperationsData}
            width={width || 480}
            height={height || 400}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'radical':
        return (
          <RadicalSimplification
            data={diagram.data as unknown as RadicalSimplificationData}
            width={width || 420}
            height={height || 400}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'systems':
        return (
          <SystemsOfEquations
            data={diagram.data as unknown as SystemsOfEquationsData}
            width={width || 460}
            height={height || 500}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'inequality':
        return (
          <InequalityDiagram
            data={diagram.data as unknown as InequalityData}
            width={width || 440}
            height={height || 450}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
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

  // Get diagram type display name
  const getDiagramTypeName = (): string => {
    const names: Record<string, Record<string, string>> = {
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
        factoring: 'Factoring',
        completing_square: 'Completing the Square',
        polynomial: 'Polynomial Operations',
        radical: 'Radical Simplification',
        systems: 'Systems of Equations',
        inequality: 'Inequalities',
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
        factoring: 'פירוק לגורמים',
        completing_square: 'השלמה לריבוע',
        polynomial: 'פעולות פולינום',
        radical: 'פישוט שורשים',
        systems: 'מערכת משוואות',
        inequality: 'אי-שוויונות',
      },
    }
    return names[language][diagram.type] || diagram.type
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Diagram type header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {getDiagramTypeName()}
        </span>
        <span className="text-xs text-gray-400">
          {language === 'he' ? 'צעד' : 'Step'} {currentStep + 1}/{calculatedTotalSteps}
        </span>
      </div>

      {/* Diagram */}
      <div className="flex justify-center rounded-lg overflow-x-auto">
        {renderDiagram()}
      </div>

      {/* Step controls (optional) */}
      {showControls && calculatedTotalSteps > 1 && (
        <div className="step-controls mt-3 flex items-center justify-between px-2">
          {/* Progress indicator */}
          <div className="progress-indicator flex items-center gap-2">
            <div className="progress-bar h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-32">
              <div
                className="progress-fill h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / calculatedTotalSteps) * 100}%` }}
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
              disabled={currentStep >= calculatedTotalSteps - 1}
              className="px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? 'הבא →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Current step info */}
      {diagram.stepConfig?.[currentStep]?.stepLabel && (
        <div className="step-info mt-2 p-2 bg-violet-50 dark:bg-violet-900/30 rounded-md mx-2">
          <p className="text-sm text-violet-700 dark:text-violet-300">
            {language === 'he'
              ? diagram.stepConfig[currentStep].stepLabelHe || diagram.stepConfig[currentStep].stepLabel
              : diagram.stepConfig[currentStep].stepLabel}
          </p>
        </div>
      )}

    </div>
  )
}

export default MathDiagramRenderer
