'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type DiagramState,
  type FreeBodyDiagramData,
  type InclinedPlaneData,
  type ProjectileMotionData,
  type PulleySystemData,
  type DiagramStepConfig,
} from '@/types/physics'
import { FreeBodyDiagram } from './FreeBodyDiagram'
import { InclinedPlane } from './InclinedPlane'
import { ProjectileMotion } from './ProjectileMotion'
import { PulleySystem } from './PulleySystem'
import { CircularMotion } from './CircularMotion'
import { CollisionDiagram } from './CollisionDiagram'

interface PhysicsDiagramRendererProps {
  /** Diagram state from tutor response */
  diagram: DiagramState
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
 * PhysicsDiagramRenderer - Universal renderer for all physics diagram types
 *
 * This component:
 * - Renders the appropriate diagram component based on type
 * - Manages step-synced animation state
 * - Provides optional controls for manual step advancement
 * - Integrates with tutor responses
 */
export function PhysicsDiagramRenderer({
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
}: PhysicsDiagramRendererProps) {
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
      onStepBack?.()
    }
  }, [currentStep, stepOverride, onStepBack])

  // Render the appropriate diagram type
  const renderDiagram = () => {
    const commonProps = {
      currentStep,
      stepConfig: diagram.stepConfig as DiagramStepConfig[],
      onStepComplete: handleStepComplete,
      animationDuration: animate ? animationDuration : 0,
      className: 'diagram-content',
      language,
    }

    switch (diagram.type) {
      case 'fbd':
        return (
          <FreeBodyDiagram
            data={diagram.data as FreeBodyDiagramData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'inclined_plane':
        return (
          <InclinedPlane
            data={diagram.data as InclinedPlaneData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'projectile':
        return (
          <ProjectileMotion
            data={diagram.data as ProjectileMotionData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'pulley':
        return (
          <PulleySystem
            data={diagram.data as PulleySystemData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'motion':
        // CircularMotion handles motion diagrams
        return (
          <CircularMotion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={diagram.data as any}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'collision':
        return (
          <CollisionDiagram
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={diagram.data as any}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      // Placeholder for remaining diagram types
      case 'circuit':
      case 'wave':
      case 'optics':
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

  return (
    <div className={`physics-diagram-container ${className}`}>
      {/* Diagram */}
      <div className="diagram-wrapper">
        {renderDiagram()}
      </div>

      {/* Step controls (optional) */}
      {showControls && totalSteps > 1 && (
        <div className="step-controls mt-3 flex items-center justify-between">
          {/* Progress indicator */}
          <div className="progress-indicator flex items-center gap-2">
            <div className="progress-bar h-1.5 bg-gray-200 rounded-full w-32">
              <div
                className="progress-fill h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>

          {/* Navigation buttons */}
          <div className="nav-buttons flex gap-2">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? '← הקודם' : '← Prev'}
            </button>
            <button
              onClick={handleNextStep}
              disabled={currentStep >= totalSteps - 1}
              className="px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? 'הבא →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Current step info */}
      {diagram.stepConfig?.[currentStep]?.stepLabel && (
        <div className="step-info mt-2 p-2 bg-violet-50 rounded-md">
          <p className="text-sm text-violet-700">
            {language === 'he'
              ? diagram.stepConfig[currentStep].stepLabelHe || diagram.stepConfig[currentStep].stepLabel
              : diagram.stepConfig[currentStep].stepLabel}
          </p>
        </div>
      )}

      <style jsx>{`
        .physics-diagram-container {
          display: flex;
          flex-direction: column;
        }

        .diagram-wrapper {
          display: flex;
          justify-content: center;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .step-controls {
          padding: 8px 0;
        }
      `}</style>
    </div>
  )
}

export default PhysicsDiagramRenderer
