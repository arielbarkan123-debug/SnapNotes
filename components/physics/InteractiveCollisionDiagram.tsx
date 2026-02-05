'use client'

import { useState, useCallback, useMemo } from 'react'
import { CollisionDiagram } from './CollisionDiagram'
import { WhatIfMode } from '@/components/interactive'
import { useInteractiveParameters } from '@/hooks/useInteractiveParameters'
import {
  COLLISION_PARAMETERS,
  getCollisionResults,
  calculateCollision,
} from '@/lib/visual-learning'
import type { CollisionDiagramData, CollisionObject } from '@/types/physics'

interface InteractiveCollisionDiagramProps {
  /** Initial data for the diagram */
  initialData: CollisionDiagramData
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
  onParamsChange?: (data: CollisionDiagramData) => void
}

/**
 * InteractiveCollisionDiagram - CollisionDiagram with What-If Mode
 *
 * Uses Phase 3 architecture:
 * - useInteractiveParameters hook for state management
 * - physics-calculations for physics
 * - WhatIfMode component for UI
 *
 * Allows students to explore how changing:
 * - Masses affects final velocities
 * - Initial velocities affects momentum and energy
 * - Elasticity affects energy loss
 */
export function InteractiveCollisionDiagram({
  initialData,
  initialStep = 0,
  width = 500,
  height = 350,
  language = 'en',
  whatIfEnabled = false,
  onWhatIfToggle,
  onParamsChange,
}: InteractiveCollisionDiagramProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isWhatIfEnabled, setIsWhatIfEnabled] = useState(whatIfEnabled)

  // Calculate results from parameters
  const calculate = useCallback((params: Record<string, number>) => {
    return getCollisionResults({
      mass1: params.mass1 ?? 2,
      mass2: params.mass2 ?? 3,
      velocity1: params.velocity1 ?? 5,
      velocity2: params.velocity2 ?? -2,
      elasticity: params.elasticity ?? 1,
    })
  }, [])

  // Extract initial values from data
  const extractInitialValues = useCallback(() => {
    const obj1 = initialData.objects[0]
    const obj2 = initialData.objects[1]

    return {
      mass1: obj1?.object?.mass ?? 2,
      mass2: obj2?.object?.mass ?? 3,
      velocity1: obj1?.velocity?.before ?? 5,
      velocity2: obj2?.velocity?.before ?? -2,
      elasticity: initialData.collisionType === 'elastic' ? 1
        : initialData.collisionType === 'perfectly_inelastic' ? 0
        : 0.5,
    }
  }, [initialData])

  // Initialize parameters from initial data
  const initialValues = useMemo(() => extractInitialValues(), [extractInitialValues])

  // Use the interactive parameters hook
  const { values, actions, results } = useInteractiveParameters(
    COLLISION_PARAMETERS.map(p => ({
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
  const buildDiagramData = useCallback((params: Record<string, number>): CollisionDiagramData => {
    const mass1 = params.mass1 ?? 2
    const mass2 = params.mass2 ?? 3
    const velocity1 = params.velocity1 ?? 5
    const velocity2 = params.velocity2 ?? -2
    const elasticity = params.elasticity ?? 1

    const physics = calculateCollision({ mass1, mass2, velocity1, velocity2, elasticity })

    // Determine collision type from elasticity
    const collisionType: CollisionDiagramData['collisionType'] =
      elasticity >= 0.99 ? 'elastic' :
      elasticity <= 0.01 ? 'perfectly_inelastic' :
      'inelastic'

    // Build objects array
    const objects: CollisionObject[] = [
      {
        object: {
          ...(initialData.objects[0]?.object || { type: 'block' as const, position: { x: 0, y: 0 } }),
          mass: mass1,
          label: `m₁`,
        },
        velocity: {
          before: velocity1,
          after: physics.v1Final,
        },
      },
      {
        object: {
          ...(initialData.objects[1]?.object || { type: 'block' as const, position: { x: 0, y: 0 } }),
          mass: mass2,
          label: `m₂`,
        },
        velocity: {
          before: velocity2,
          after: physics.v2Final,
        },
      },
    ]

    return {
      ...initialData,
      objects,
      collisionType,
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
          <CollisionDiagram
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
              parameters={COLLISION_PARAMETERS}
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

export default InteractiveCollisionDiagram
