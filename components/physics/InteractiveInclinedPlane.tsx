'use client'

import { useState, useCallback, useMemo } from 'react'
import { InclinedPlane } from './InclinedPlane'
import { WhatIfMode } from '@/components/interactive'
import { useInteractiveParameters } from '@/hooks/useInteractiveParameters'
import {
  INCLINED_PLANE_PARAMETERS,
  INCLINED_PLANE_SUGGESTIONS,
  getInclinedPlaneResults,
  calculateInclinedPlane,
} from '@/lib/visual-learning'
import type { InclinedPlaneData, Force } from '@/types/physics'

interface InteractiveInclinedPlaneProps {
  /** Initial data for the diagram */
  initialData: InclinedPlaneData
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
  onParamsChange?: (data: InclinedPlaneData) => void
}

/**
 * InteractiveInclinedPlane - InclinedPlane with What-If Mode
 *
 * Uses Phase 3 architecture:
 * - useInteractiveParameters hook for state management
 * - physics-calculations for physics
 * - WhatIfMode component for UI
 *
 * Allows students to explore how changing:
 * - Incline angle affects force components
 * - Mass affects all force magnitudes
 * - Friction coefficient affects friction force
 */
export function InteractiveInclinedPlane({
  initialData,
  initialStep = 0,
  width = 500,
  height = 380,
  language = 'en',
  whatIfEnabled = false,
  onWhatIfToggle,
  onParamsChange,
}: InteractiveInclinedPlaneProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isWhatIfEnabled, setIsWhatIfEnabled] = useState(whatIfEnabled)

  // Calculate results from parameters
  const calculate = useCallback((params: Record<string, number>) => {
    return getInclinedPlaneResults({
      mass: params.mass ?? 5,
      angle: params.angle ?? 30,
      friction: params.friction ?? 0.3,
    })
  }, [])

  // Initialize parameters from initial data
  const initialValues = useMemo(() => ({
    mass: initialData.object?.mass ?? 5,
    angle: initialData.angle ?? 30,
    friction: initialData.frictionCoefficient ?? 0.3,
  }), [initialData])

  // Use the interactive parameters hook
  const { values, actions, results } = useInteractiveParameters(
    INCLINED_PLANE_PARAMETERS.map(p => ({
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
  const buildDiagramData = useCallback((params: Record<string, number>): InclinedPlaneData => {
    const mass = params.mass ?? 5
    const angle = params.angle ?? 30
    const mu = params.friction ?? 0.3

    const physics = calculateInclinedPlane({ mass, angle, friction: mu })

    const forces: Force[] = [
      {
        name: 'weight',
        type: 'weight',
        magnitude: physics.weight,
        angle: -90,
        symbol: 'W',
      },
      {
        name: 'normal',
        type: 'normal',
        magnitude: physics.normalForce,
        angle: 90 - angle,
        symbol: 'N',
      },
      {
        name: 'friction',
        type: 'friction',
        magnitude: physics.frictionForce,
        angle: 180 - angle,
        symbol: 'f',
      },
    ]

    return {
      ...initialData,
      angle,
      object: {
        ...initialData.object,
        type: initialData.object?.type || 'block',
        position: initialData.object?.position || { x: 0, y: 0 },
        mass,
        label: `${mass} kg`,
      },
      forces,
      frictionCoefficient: mu,
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
          <InclinedPlane
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
              parameters={INCLINED_PLANE_PARAMETERS}
              values={values}
              onParameterChange={actions.setValue}
              onParametersChange={actions.setValues}
              results={results}
              suggestions={INCLINED_PLANE_SUGGESTIONS}
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

export default InteractiveInclinedPlane
