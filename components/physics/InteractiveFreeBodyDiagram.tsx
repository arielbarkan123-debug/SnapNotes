'use client'

import { useState, useCallback, useMemo } from 'react'
import { FreeBodyDiagram } from './FreeBodyDiagram'
import { WhatIfMode } from '@/components/interactive'
import { useInteractiveParameters } from '@/hooks/useInteractiveParameters'
import {
  FBD_PARAMETERS,
  getFBDResults,
  calculateFBD,
} from '@/lib/visual-learning'
import type { FreeBodyDiagramData, Force } from '@/types/physics'

interface InteractiveFreeBodyDiagramProps {
  /** Initial data for the diagram */
  initialData: FreeBodyDiagramData
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
  onParamsChange?: (data: FreeBodyDiagramData) => void
}

/**
 * InteractiveFreeBodyDiagram - FreeBodyDiagram with What-If Mode
 *
 * Uses Phase 3 architecture:
 * - useInteractiveParameters hook for state management
 * - physics-calculations for physics
 * - WhatIfMode component for UI
 *
 * Allows students to explore how changing:
 * - Mass affects all force magnitudes
 * - Applied force affects acceleration
 * - Force angle affects normal force and friction
 * - Friction coefficient affects friction force
 */
export function InteractiveFreeBodyDiagram({
  initialData,
  initialStep = 0,
  width = 400,
  height = 350,
  language = 'en',
  whatIfEnabled = false,
  onWhatIfToggle,
  onParamsChange,
}: InteractiveFreeBodyDiagramProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isWhatIfEnabled, setIsWhatIfEnabled] = useState(whatIfEnabled)

  // Calculate results from parameters
  const calculate = useCallback((params: Record<string, number>) => {
    return getFBDResults({
      mass: params.mass ?? 5,
      appliedForce: params.appliedForce ?? 20,
      appliedAngle: params.appliedAngle ?? 0,
      friction: params.friction ?? 0.2,
    })
  }, [])

  // Extract initial values from data
  const getInitialAppliedForce = useCallback(() => {
    const appliedForce = initialData.forces.find(f => f.type === 'applied')
    return appliedForce?.magnitude ?? 20
  }, [initialData])

  const getInitialAppliedAngle = useCallback(() => {
    const appliedForce = initialData.forces.find(f => f.type === 'applied')
    return appliedForce?.angle ?? 0
  }, [initialData])

  // Initialize parameters from initial data
  const initialValues = useMemo(() => ({
    mass: initialData.object?.mass ?? 5,
    appliedForce: getInitialAppliedForce(),
    appliedAngle: getInitialAppliedAngle(),
    friction: 0.2, // Default friction coefficient
  }), [initialData, getInitialAppliedForce, getInitialAppliedAngle])

  // Use the interactive parameters hook
  const { values, actions, results } = useInteractiveParameters(
    FBD_PARAMETERS.map(p => ({
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
  const buildDiagramData = useCallback((params: Record<string, number>): FreeBodyDiagramData => {
    const mass = params.mass ?? 5
    const appliedForce = params.appliedForce ?? 20
    const appliedAngle = params.appliedAngle ?? 0
    const mu = params.friction ?? 0.2

    const physics = calculateFBD({ mass, appliedForce, appliedAngle, friction: mu })

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
        angle: 90,
        symbol: 'N',
      },
    ]

    // Add applied force if present
    if (appliedForce > 0) {
      forces.push({
        name: 'applied',
        type: 'applied',
        magnitude: appliedForce,
        angle: appliedAngle,
        symbol: 'F',
        subscript: 'app',
      })
    }

    // Add friction if there's horizontal motion
    if (physics.frictionForce > 0.01) {
      forces.push({
        name: 'friction',
        type: 'friction',
        magnitude: physics.frictionForce,
        // Friction opposes motion - if applied force is pushing right, friction pushes left
        angle: appliedForce * Math.cos(appliedAngle * Math.PI / 180) > 0 ? 180 : 0,
        symbol: 'f',
      })
    }

    return {
      ...initialData,
      object: {
        ...initialData.object,
        mass,
        label: initialData.object?.label || `${mass} kg`,
      },
      forces,
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
          <FreeBodyDiagram
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
              parameters={FBD_PARAMETERS}
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

export default InteractiveFreeBodyDiagram
