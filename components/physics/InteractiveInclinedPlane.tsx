'use client'

import { useState, useCallback, useMemo } from 'react'
import { InclinedPlane } from './InclinedPlane'
import { WhatIfMode } from '@/components/interactive'
import type { InclinedPlaneData, Force } from '@/types/physics'

interface InteractiveInclinedPlaneProps {
  /** Initial data for the diagram */
  initialData: InclinedPlaneData
  /** Current step for progressive reveal */
  currentStep?: number
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
 * Allows students to explore how changing:
 * - Incline angle affects force components
 * - Mass affects all force magnitudes
 * - Friction coefficient affects friction force
 */
export function InteractiveInclinedPlane({
  initialData,
  currentStep = 0,
  width = 500,
  height = 380,
  language = 'en',
  whatIfEnabled = false,
  onWhatIfToggle,
  onParamsChange,
}: InteractiveInclinedPlaneProps) {
  const [isWhatIfEnabled, setIsWhatIfEnabled] = useState(whatIfEnabled)

  // Extract initial parameters from data
  const initialParams = useMemo(() => ({
    angle: initialData.angle || 30,
    mass: initialData.object?.mass || 5,
    friction: initialData.frictionCoefficient || 0.3,
  }), [initialData])

  // Handle what-if toggle
  const handleToggle = useCallback((enabled: boolean) => {
    setIsWhatIfEnabled(enabled)
    onWhatIfToggle?.(enabled)
  }, [onWhatIfToggle])

  // Render the diagram with current parameters
  const renderDiagram = useCallback((
    params: Record<string, number>,
    calculated: Record<string, unknown>
  ) => {
    // Build updated data with new parameters
    const g = 9.8
    const mass = params.mass || 5
    const angle = params.angle || 30
    const mu = params.friction || 0.3

    const W = mass * g
    const theta = angle * Math.PI / 180
    const W_parallel = W * Math.sin(theta)
    const W_perp = W * Math.cos(theta)
    const N = W_perp
    const f_max = mu * N
    const friction = Math.min(f_max, W_parallel)

    // Get forces from calculated or build new ones
    const calculatedForces = calculated.forces as Force[] | undefined
    const forces: Force[] = calculatedForces || [
      {
        name: 'weight',
        type: 'weight',
        magnitude: W,
        angle: -90,
        symbol: 'W',
      },
      {
        name: 'normal',
        type: 'normal',
        magnitude: N,
        angle: 90 - angle,
        symbol: 'N',
      },
      {
        name: 'friction',
        type: 'friction',
        magnitude: friction,
        angle: 180 - angle,
        symbol: 'f',
      },
    ]

    const updatedData: InclinedPlaneData = {
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

    // Notify parent of changes
    if (isWhatIfEnabled) {
      onParamsChange?.(updatedData)
    }

    return (
      <InclinedPlane
        data={updatedData}
        currentStep={currentStep}
        width={width}
        height={height}
        language={language}
      />
    )
  }, [initialData, currentStep, width, height, language, isWhatIfEnabled, onParamsChange])

  return (
    <WhatIfMode
      diagramType="inclined_plane"
      initialParams={initialParams}
      renderDiagram={renderDiagram}
      language={language}
      enabled={isWhatIfEnabled}
      onToggle={handleToggle}
    />
  )
}

export default InteractiveInclinedPlane
