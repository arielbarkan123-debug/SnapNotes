'use client'

import { useState, useCallback, useMemo } from 'react'
import { PulleySystem } from './PulleySystem'
import { WhatIfMode } from '@/components/interactive'
import { useInteractiveParameters } from '@/hooks/useInteractiveParameters'
import type { PulleySystemData, Force } from '@/types/physics'
import type { ParameterDefinition, CalculationResult } from '@/types/interactivity'

// Parameter definitions for pulley system (Atwood machine)
const PULLEY_PARAMETERS: ParameterDefinition[] = [
  {
    name: 'mass1',
    label: 'Mass 1 (heavier)',
    labelHe: 'מסה 1 (כבדה)',
    default: 5,
    min: 1,
    max: 20,
    step: 0.5,
    unit: 'kg',
    unitHe: 'ק"ג',
    category: 'mass',
  },
  {
    name: 'mass2',
    label: 'Mass 2 (lighter)',
    labelHe: 'מסה 2 (קלה)',
    default: 3,
    min: 1,
    max: 20,
    step: 0.5,
    unit: 'kg',
    unitHe: 'ק"ג',
    category: 'mass',
  },
]

const GRAVITY = 9.8

// Calculate Atwood machine physics
function calculatePulley(mass1: number, mass2: number) {
  // For Atwood machine: a = (m1 - m2) * g / (m1 + m2)
  // T = 2 * m1 * m2 * g / (m1 + m2)

  const totalMass = mass1 + mass2
  const massDiff = Math.abs(mass1 - mass2)

  const acceleration = (massDiff * GRAVITY) / totalMass
  const tension = (2 * mass1 * mass2 * GRAVITY) / totalMass

  return {
    acceleration,
    tension,
    weight1: mass1 * GRAVITY,
    weight2: mass2 * GRAVITY,
  }
}

// Get results for display
function getPulleyResults(params: Record<string, number>): CalculationResult[] {
  const mass1 = params.mass1 ?? 5
  const mass2 = params.mass2 ?? 3

  const results = calculatePulley(mass1, mass2)

  return [
    {
      value: results.acceleration,
      unit: 'm/s²',
      label: 'Acceleration',
      labelHe: 'תאוצה',
      description: 'System acceleration',
      descriptionHe: 'תאוצת המערכת',
      formatted: `${results.acceleration.toFixed(2)} m/s²`,
      isPrimary: true,
    },
    {
      value: results.tension,
      unit: 'N',
      label: 'Tension',
      labelHe: 'מתיחה',
      description: 'Rope tension',
      descriptionHe: 'מתיחת החבל',
      formatted: `${results.tension.toFixed(2)} N`,
    },
    {
      value: results.weight1,
      unit: 'N',
      label: 'Weight 1',
      labelHe: 'משקל 1',
      description: 'Weight of mass 1',
      descriptionHe: 'משקל מסה 1',
      formatted: `${results.weight1.toFixed(2)} N`,
    },
    {
      value: results.weight2,
      unit: 'N',
      label: 'Weight 2',
      labelHe: 'משקל 2',
      description: 'Weight of mass 2',
      descriptionHe: 'משקל מסה 2',
      formatted: `${results.weight2.toFixed(2)} N`,
    },
  ]
}

interface InteractivePulleySystemProps {
  /** Initial data for the diagram */
  initialData: PulleySystemData
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
  onParamsChange?: (data: PulleySystemData) => void
}

/**
 * InteractivePulleySystem - PulleySystem with What-If Mode
 *
 * Uses Phase 3 architecture:
 * - useInteractiveParameters hook for state management
 * - Inline physics calculations for Atwood machine
 * - WhatIfMode component for UI
 *
 * Allows students to explore how changing:
 * - Mass 1 affects acceleration and tension
 * - Mass 2 affects acceleration and tension
 * - Mass ratio affects system behavior
 */
export function InteractivePulleySystem({
  initialData,
  initialStep = 0,
  width = 450,
  height = 400,
  language = 'en',
  whatIfEnabled = false,
  onWhatIfToggle,
  onParamsChange,
}: InteractivePulleySystemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isWhatIfEnabled, setIsWhatIfEnabled] = useState(whatIfEnabled)

  // Calculate results from parameters
  const calculate = useCallback((params: Record<string, number>) => {
    return getPulleyResults(params)
  }, [])

  // Extract initial values from data
  const extractInitialValues = useCallback(() => {
    const leftMass = initialData.masses.find(m => m.side === 'left')?.object?.mass ?? 5
    const rightMass = initialData.masses.find(m => m.side === 'right')?.object?.mass ?? 3

    // Ensure mass1 is always the heavier one
    return {
      mass1: Math.max(leftMass, rightMass),
      mass2: Math.min(leftMass, rightMass),
    }
  }, [initialData])

  // Initialize parameters from initial data
  const initialValues = useMemo(() => extractInitialValues(), [extractInitialValues])

  // Use the interactive parameters hook
  const { values, actions, results } = useInteractiveParameters(
    PULLEY_PARAMETERS.map(p => ({
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
  const buildDiagramData = useCallback((params: Record<string, number>): PulleySystemData => {
    const mass1 = params.mass1 ?? 5
    const mass2 = params.mass2 ?? 3

    const physics = calculatePulley(mass1, mass2)

    // Build tensions array
    const tensions: Force[] = [
      {
        name: 'tension1',
        type: 'tension',
        magnitude: physics.tension,
        angle: 90, // Upward
        symbol: 'T',
      },
      {
        name: 'tension2',
        type: 'tension',
        magnitude: physics.tension,
        angle: 90, // Upward
        symbol: 'T',
      },
    ]

    // Update masses in the data
    const updatedMasses = initialData.masses.map((mass, index) => ({
      ...mass,
      object: {
        ...mass.object,
        mass: index === 0 ? mass1 : mass2,
        label: mass.object.label || `m${index + 1}`,
      },
    }))

    return {
      ...initialData,
      masses: updatedMasses,
      tensions,
      showAcceleration: true,
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
          <PulleySystem
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
              parameters={PULLEY_PARAMETERS}
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

export default InteractivePulleySystem
