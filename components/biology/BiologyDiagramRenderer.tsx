'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type BiologyDiagramState,
  type CellDiagramData,
  type DNADiagramData,
} from '@/types/biology'
import { CellDiagram } from './CellDiagram'
import { DNADiagram } from './DNADiagram'

interface BiologyDiagramRendererProps {
  /** Diagram state from tutor response */
  diagram: BiologyDiagramState
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
}

/**
 * BiologyDiagramRenderer - Universal renderer for all biology diagram types
 *
 * This component:
 * - Renders the appropriate diagram component based on type (cell, DNA, organelle, etc.)
 * - Manages step-synced animation state
 * - Provides optional controls for manual step advancement
 * - Integrates with tutor responses
 */
export function BiologyDiagramRenderer({
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
}: BiologyDiagramRendererProps) {
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
      onStepBack?.()
    }
  }, [currentStep, stepOverride, onStepBack])

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
      case 'cell':
        return (
          <CellDiagram
            data={diagram.data as CellDiagramData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'dna':
        return (
          <DNADiagram
            data={diagram.data as DNADiagramData}
            width={width || 400}
            height={height || 450}
            {...commonProps}
          />
        )

      // Placeholder for future diagram types
      case 'organelle':
      case 'process':
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
        cell: 'Cell Structure',
        organelle: 'Organelle',
        dna: 'DNA Structure',
        process: 'Biological Process',
      },
      he: {
        cell: 'מבנה התא',
        organelle: 'אברון',
        dna: 'מבנה DNA',
        process: 'תהליך ביולוגי',
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
      <div className="flex justify-center bg-white dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
        {renderDiagram()}
      </div>

      {/* Step controls (optional) */}
      {showControls && calculatedTotalSteps > 1 && (
        <div className="step-controls mt-3 flex items-center justify-between px-2">
          {/* Progress indicator */}
          <div className="progress-indicator flex items-center gap-2">
            <div className="progress-bar h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-32">
              <div
                className="progress-fill h-full bg-green-500 rounded-full transition-all duration-300"
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
              className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? 'הבא →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Current step info */}
      {diagram.stepConfig?.[currentStep]?.stepLabel && (
        <div className="step-info mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-md mx-2">
          <p className="text-sm text-green-700 dark:text-green-300">
            {language === 'he'
              ? diagram.stepConfig[currentStep].stepLabelHe || diagram.stepConfig[currentStep].stepLabel
              : diagram.stepConfig[currentStep].stepLabel}
          </p>
        </div>
      )}

    </div>
  )
}

export default BiologyDiagramRenderer
