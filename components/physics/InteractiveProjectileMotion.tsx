'use client'

import { useState, useCallback, useMemo } from 'react'
import { ProjectileMotion } from './ProjectileMotion'
import { WhatIfMode } from '@/components/interactive'
import { useInteractiveParameters } from '@/hooks/useInteractiveParameters'
import {
  PROJECTILE_PARAMETERS,
  PROJECTILE_SUGGESTIONS,
  getProjectileResults,
  calculateProjectile,
} from '@/lib/visual-learning'
import type { ProjectileMotionData } from '@/types/physics'

interface InteractiveProjectileMotionProps {
  /** Initial data for the diagram */
  initialData: ProjectileMotionData
  /** Initial step for progressive reveal */
  initialStep?: number
  /** Width of the diagram */
  width?: number
  /** Height of the diagram */
  height?: number
  /** Language */
  language?: 'en' | 'he'
  /** Whether what-if mode is initially enabled */
  whatIfEnabled?: boolean
  /** Callback when what-if mode is toggled */
  onWhatIfToggle?: (enabled: boolean) => void
  /** Callback when parameters change */
  onParamsChange?: (data: ProjectileMotionData) => void
}

/**
 * InteractiveProjectileMotion - ProjectileMotion with What-If Mode
 *
 * Uses Phase 3 architecture:
 * - useInteractiveParameters hook for state management
 * - physics-calculations for physics
 * - WhatIfMode component for UI
 *
 * Allows students to explore how changing:
 * - Initial velocity affects range and max height
 * - Launch angle affects trajectory shape
 * - Initial height affects time of flight
 */
export function InteractiveProjectileMotion({
  initialData,
  initialStep = 0,
  width = 500,
  height = 350,
  language = 'en',
  whatIfEnabled = false,
  onWhatIfToggle,
  onParamsChange,
}: InteractiveProjectileMotionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isWhatIfEnabled, setIsWhatIfEnabled] = useState(whatIfEnabled)

  // Calculate results from parameters
  const calculate = useCallback((params: Record<string, number>) => {
    return getProjectileResults({
      initialVelocity: params.initialVelocity ?? 20,
      launchAngle: params.launchAngle ?? 45,
      initialHeight: params.initialHeight ?? 0,
    })
  }, [])

  // Initialize parameters from initial data
  const initialValues = useMemo(() => ({
    initialVelocity: initialData.initialVelocity?.magnitude ?? 20,
    launchAngle: initialData.initialVelocity?.angle ?? 45,
    initialHeight: 0, // Calculate from initial.y and groundLevel if needed
  }), [initialData])

  // Use the interactive parameters hook
  const { values, actions, results } = useInteractiveParameters(
    PROJECTILE_PARAMETERS.map(p => ({
      ...p,
      default: initialValues[p.name as keyof typeof initialValues] ?? p.default,
    })),
    {
      calculate,
      onChange: (newValues) => {
        if (isWhatIfEnabled && onParamsChange) {
          const data = buildDiagramData(newValues)
          onParamsChange(data)
        }
      },
    }
  )

  // Build diagram data from parameters
  const buildDiagramData = useCallback((params: Record<string, number>): ProjectileMotionData => {
    const velocity = params.initialVelocity ?? 20
    const angle = params.launchAngle ?? 45
    const initialHeight = params.initialHeight ?? 0

    // Calculate physics for time intervals
    const physics = calculateProjectile({ initialVelocity: velocity, launchAngle: angle, initialHeight })

    // Generate time intervals for markers
    const numMarkers = 5
    const timeIntervals = Array.from(
      { length: numMarkers },
      (_, i) => Number((i * physics.timeOfFlight / (numMarkers - 1)).toFixed(2))
    )

    // Adjust initial position based on initial height
    // The diagram uses y-down coordinate system, so higher initialHeight = lower initial.y
    const groundLevel = initialData.groundLevel ?? (height - 60)
    const pixelsPerMeter = 8
    const initialY = groundLevel - initialHeight * pixelsPerMeter

    return {
      ...initialData,
      initial: {
        x: initialData.initial?.x ?? 50,
        y: Math.max(50, initialY), // Ensure it's on screen
      },
      initialVelocity: {
        magnitude: velocity,
        angle: angle,
      },
      timeIntervals,
      groundLevel,
    }
  }, [initialData, height])

  // Current diagram data
  const diagramData = useMemo(() => buildDiagramData(values), [buildDiagramData, values])

  // Handle toggle
  const handleToggle = useCallback(() => {
    const newEnabled = !isWhatIfEnabled
    setIsWhatIfEnabled(newEnabled)
    onWhatIfToggle?.(newEnabled)
  }, [isWhatIfEnabled, onWhatIfToggle])

  return (
    <div className="space-y-4">
      {/* Toggle button */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggle}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
            transition-all duration-200
            ${isWhatIfEnabled
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
        >
          <span className={`
            w-2 h-2 rounded-full transition-colors
            ${isWhatIfEnabled ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}
          `} />
          {language === 'he' ? 'מצב "מה אם"' : 'What-If Mode'}
        </button>
      </div>

      {/* Layout container */}
      <div className={`flex ${language === 'he' ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        {/* Diagram */}
        <div className={`
          flex-1 min-w-0 transition-all duration-200
          ${isWhatIfEnabled ? 'ring-2 ring-blue-500/30 rounded-lg' : ''}
        `}>
          <ProjectileMotion
            data={diagramData}
            initialStep={initialStep}
            width={width}
            height={height}
            language={language}
          />
        </div>

        {/* What-If Panel */}
        {isWhatIfEnabled && (
          <div className="w-80 flex-shrink-0">
            <WhatIfMode
              parameters={PROJECTILE_PARAMETERS}
              values={values}
              onParameterChange={actions.setValue}
              onParametersChange={actions.setValues}
              results={results}
              suggestions={PROJECTILE_SUGGESTIONS}
              language={language}
              subject="physics"
              expanded={isExpanded}
              onToggleExpanded={() => setIsExpanded(!isExpanded)}
              onReset={actions.reset}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default InteractiveProjectileMotion
