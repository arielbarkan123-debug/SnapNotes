'use client'

import { useState, useCallback, useMemo } from 'react'
import { CircularMotion } from './CircularMotion'
import { WhatIfMode } from '@/components/interactive'
import { useInteractiveParameters } from '@/hooks/useInteractiveParameters'
import {
  CIRCULAR_MOTION_PARAMETERS,
  getCircularMotionResults,
} from '@/lib/visual-learning'
import type { CircularMotionData } from '@/types/physics'

interface InteractiveCircularMotionProps {
  /** Initial data for the diagram */
  initialData: CircularMotionData
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
  onParamsChange?: (data: CircularMotionData) => void
}

/**
 * InteractiveCircularMotion - CircularMotion with What-If Mode
 *
 * Uses Phase 3 architecture:
 * - useInteractiveParameters hook for state management
 * - physics-calculations for physics
 * - WhatIfMode component for UI
 *
 * Allows students to explore how changing:
 * - Mass affects centripetal force
 * - Velocity affects both force and acceleration
 * - Radius affects period and acceleration
 */
export function InteractiveCircularMotion({
  initialData,
  initialStep = 0,
  width = 400,
  height = 400,
  language = 'en',
  whatIfEnabled = false,
  onWhatIfToggle,
  onParamsChange,
}: InteractiveCircularMotionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isWhatIfEnabled, setIsWhatIfEnabled] = useState(whatIfEnabled)

  // Calculate results from parameters
  const calculate = useCallback((params: Record<string, number>) => {
    return getCircularMotionResults({
      mass: params.mass ?? 2,
      velocity: params.velocity ?? 5,
      radius: params.radius ?? 2,
    })
  }, [])

  // Initialize parameters from initial data
  const initialValues = useMemo(() => ({
    mass: initialData.mass ?? 2,
    velocity: initialData.speed ?? 5,
    radius: initialData.radius ?? 2,
  }), [initialData])

  // Use the interactive parameters hook
  const { values, actions, results } = useInteractiveParameters(
    CIRCULAR_MOTION_PARAMETERS.map(p => ({
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
  const buildDiagramData = useCallback((params: Record<string, number>): CircularMotionData => {
    const mass = params.mass ?? 2
    const velocity = params.velocity ?? 5
    const radius = params.radius ?? 2

    return {
      ...initialData,
      radius,
      mass,
      speed: velocity,
      objectLabel: `${mass} kg`,
    }
  }, [initialData])

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
          <CircularMotion
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
              parameters={CIRCULAR_MOTION_PARAMETERS}
              values={values}
              onParameterChange={actions.setValue}
              onParametersChange={actions.setValues}
              results={results}
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

export default InteractiveCircularMotion
