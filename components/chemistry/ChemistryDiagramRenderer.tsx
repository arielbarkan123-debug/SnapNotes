'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type ChemistryDiagramState,
  type AtomDiagramData,
  type MoleculeDiagramData,
} from '@/types/chemistry'
import { AtomDiagram } from './AtomDiagram'
import { MoleculeDiagram } from './MoleculeDiagram'

interface ChemistryDiagramRendererProps {
  /** Diagram state from tutor response */
  diagram: ChemistryDiagramState
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
 * ChemistryDiagramRenderer - Universal renderer for all chemistry diagram types
 *
 * This component:
 * - Renders the appropriate diagram component based on type (atom, molecule, etc.)
 * - Manages step-synced animation state
 * - Provides optional controls for manual step advancement
 * - Integrates with tutor responses
 */
export function ChemistryDiagramRenderer({
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
}: ChemistryDiagramRendererProps) {
  const [internalStep, setInternalStep] = useState(diagram.visibleStep)

  // Use override step if provided, otherwise use internal state
  const currentStep = stepOverride ?? internalStep

  // Sync internal step with diagram state changes
  useEffect(() => {
    if (stepOverride === undefined) {
      setInternalStep(diagram.visibleStep)
    }
  }, [diagram.visibleStep, stepOverride])

  // Calculate total steps
  const dataStepsArray = (diagram.data as { steps?: unknown[] })?.steps
  const calculatedTotalSteps = diagram.totalSteps ?? diagram.stepConfig?.length ?? dataStepsArray?.length ?? 1

  // Handle step completion
  const handleStepComplete = useCallback(() => {
    onStepComplete?.()
  }, [onStepComplete])

  // Handle manual step advance
  const handleNextStep = useCallback(() => {
    if (currentStep < calculatedTotalSteps - 1) {
      const newStep = currentStep + 1
      if (stepOverride === undefined) {
        setInternalStep(newStep)
      }
      onStepAdvance?.()
    }
  }, [currentStep, calculatedTotalSteps, stepOverride, onStepAdvance])

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
      onStepComplete: handleStepComplete,
      animationDuration: animate ? animationDuration : 0,
      className: 'diagram-content',
      language,
    }

    switch (diagram.type) {
      case 'atom':
        return (
          <AtomDiagram
            data={diagram.data as AtomDiagramData}
            width={width || 350}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'molecule':
        return (
          <MoleculeDiagram
            data={diagram.data as MoleculeDiagramData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      // Placeholder for future diagram types
      case 'periodic_element':
      case 'bonding':
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
    const names = {
      en: {
        atom: 'Atom Structure',
        molecule: 'Molecule',
        periodic_element: 'Periodic Element',
        bonding: 'Chemical Bonding',
      },
      he: {
        atom: 'מבנה אטום',
        molecule: 'מולקולה',
        periodic_element: 'יסוד בטבלה המחזורית',
        bonding: 'קשר כימי',
      },
    }
    return names[language][diagram.type] || diagram.type
  }

  return (
    <div className={`chemistry-diagram-container ${className}`}>
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
      <div className="diagram-wrapper">
        {renderDiagram()}
      </div>

      {/* Step controls (optional) */}
      {showControls && calculatedTotalSteps > 1 && (
        <div className="step-controls mt-3 flex items-center justify-between px-2">
          {/* Progress indicator */}
          <div className="progress-indicator flex items-center gap-2">
            <div className="progress-bar h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-32">
              <div
                className="progress-fill h-full bg-teal-500 rounded-full transition-all duration-300"
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
              className="px-3 py-1.5 text-sm bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? 'הבא →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Current step info */}
      {diagram.stepConfig?.[currentStep]?.stepLabel && (
        <div className="step-info mt-2 p-2 bg-teal-50 dark:bg-teal-900/30 rounded-md mx-2">
          <p className="text-sm text-teal-700 dark:text-teal-300">
            {language === 'he'
              ? diagram.stepConfig[currentStep].stepLabelHe || diagram.stepConfig[currentStep].stepLabel
              : diagram.stepConfig[currentStep].stepLabel}
          </p>
        </div>
      )}

      <style jsx>{`
        .chemistry-diagram-container {
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

export default ChemistryDiagramRenderer
