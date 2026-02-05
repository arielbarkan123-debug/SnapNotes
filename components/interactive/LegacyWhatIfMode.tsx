'use client'

/**
 * LegacyWhatIfMode - Backward-compatible version of WhatIfMode
 *
 * @deprecated Use WhatIfMode with the new types from types/interactivity.ts
 *
 * This component provides the old interface for existing code while
 * we migrate to the new architecture. New code should use WhatIfMode directly.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ParameterSliderGroup, type ParameterDef } from './ParameterSlider'

/**
 * Physics calculation functions
 */
const PHYSICS_CALCULATORS = {
  /**
   * Inclined plane calculations
   */
  inclined_plane: (params: Record<string, number>) => {
    const m = params.mass ?? 5
    const g = 9.8
    const theta = (params.angle ?? 30) * Math.PI / 180
    const mu = params.friction ?? 0.3

    const W = m * g
    const W_parallel = W * Math.sin(theta)
    const W_perpendicular = W * Math.cos(theta)
    const N = W_perpendicular
    const f_max = mu * N

    // Determine motion state
    const netParallel = W_parallel - f_max
    const isSliding = netParallel > 0
    const acceleration = isSliding ? netParallel / m : 0

    return {
      weight: W,
      weightParallel: W_parallel,
      weightPerpendicular: W_perpendicular,
      normal: N,
      frictionMax: f_max,
      friction: Math.min(f_max, W_parallel),
      isSliding,
      acceleration,
      forces: [
        { name: 'weight', type: 'weight', magnitude: W, angle: -90, symbol: 'W' },
        { name: 'normal', type: 'normal', magnitude: N, angle: 90 - (params.angle ?? 30), symbol: 'N' },
        { name: 'friction', type: 'friction', magnitude: Math.min(f_max, W_parallel), angle: 180 - (params.angle ?? 30), symbol: 'f' },
      ],
    }
  },

  /**
   * Free body diagram calculations
   */
  fbd: (params: Record<string, number>) => {
    const m = params.mass ?? 5
    const g = 9.8
    const appliedForce = params.appliedForce ?? 0
    const appliedAngle = params.appliedAngle ?? 0
    const mu = params.friction ?? 0

    const W = m * g
    const F_x = appliedForce * Math.cos(appliedAngle * Math.PI / 180)
    const F_y = appliedForce * Math.sin(appliedAngle * Math.PI / 180)
    const N = W - F_y
    const f_max = mu * Math.abs(N)
    const f = Math.min(f_max, Math.abs(F_x)) * Math.sign(F_x) * -1

    const netForce_x = F_x + f
    const netForce_y = N + F_y - W
    const acceleration = netForce_x / m

    return {
      weight: W,
      normal: N,
      frictionMax: f_max,
      friction: Math.abs(f),
      netForce: Math.sqrt(netForce_x ** 2 + netForce_y ** 2),
      acceleration,
      forces: [
        { name: 'weight', type: 'weight', magnitude: W, angle: -90, symbol: 'W' },
        { name: 'normal', type: 'normal', magnitude: N, angle: 90, symbol: 'N' },
        ...(appliedForce > 0 ? [{ name: 'applied', type: 'applied', magnitude: appliedForce, angle: appliedAngle, symbol: 'F' }] : []),
        ...(Math.abs(f) > 0.1 ? [{ name: 'friction', type: 'friction', magnitude: Math.abs(f), angle: f > 0 ? 0 : 180, symbol: 'f' }] : []),
      ],
    }
  },

  /**
   * Projectile motion calculations
   */
  projectile: (params: Record<string, number>) => {
    const v0 = params.initialVelocity ?? 20
    const theta = (params.launchAngle ?? 45) * Math.PI / 180
    const g = 9.8

    const v0x = v0 * Math.cos(theta)
    const v0y = v0 * Math.sin(theta)
    const timeOfFlight = 2 * v0y / g
    const maxHeight = (v0y ** 2) / (2 * g)
    const range = v0x * timeOfFlight

    return {
      v0x,
      v0y,
      timeOfFlight,
      maxHeight,
      range,
    }
  },
}

/**
 * Default parameters for different diagram types
 */
const DEFAULT_PARAMETERS: Record<string, ParameterDef[]> = {
  inclined_plane: [
    {
      id: 'mass',
      name: 'Mass',
      symbol: 'm',
      unit: 'kg',
      min: 0.5,
      max: 20,
      step: 0.5,
      defaultValue: 5,
      description: 'Mass of the object on the incline',
      color: '#3b82f6',
      affectsPhysics: true,
    },
    {
      id: 'angle',
      name: 'Incline Angle',
      symbol: 'θ',
      unit: '°',
      min: 0,
      max: 60,
      step: 1,
      defaultValue: 30,
      description: 'Angle of the inclined plane',
      color: '#10b981',
      affectsPhysics: true,
    },
    {
      id: 'friction',
      name: 'Friction Coefficient',
      symbol: 'μ',
      unit: '',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.3,
      description: 'Coefficient of friction between object and surface',
      color: '#f59e0b',
      affectsPhysics: true,
    },
  ],
  fbd: [
    {
      id: 'mass',
      name: 'Mass',
      symbol: 'm',
      unit: 'kg',
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      color: '#3b82f6',
      affectsPhysics: true,
    },
    {
      id: 'appliedForce',
      name: 'Applied Force',
      symbol: 'F',
      unit: 'N',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 20,
      color: '#ef4444',
      affectsPhysics: true,
    },
    {
      id: 'appliedAngle',
      name: 'Force Angle',
      symbol: 'θ',
      unit: '°',
      min: -45,
      max: 45,
      step: 5,
      defaultValue: 0,
      color: '#10b981',
      affectsPhysics: true,
    },
    {
      id: 'friction',
      name: 'Friction Coefficient',
      symbol: 'μ',
      unit: '',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.2,
      color: '#f59e0b',
      affectsPhysics: true,
    },
  ],
  projectile: [
    {
      id: 'initialVelocity',
      name: 'Initial Velocity',
      symbol: 'v₀',
      unit: 'm/s',
      min: 5,
      max: 50,
      step: 1,
      defaultValue: 20,
      color: '#3b82f6',
      affectsPhysics: true,
    },
    {
      id: 'launchAngle',
      name: 'Launch Angle',
      symbol: 'θ',
      unit: '°',
      min: 15,
      max: 75,
      step: 5,
      defaultValue: 45,
      color: '#10b981',
      affectsPhysics: true,
    },
  ],
}

interface LegacyWhatIfModeProps {
  /** Type of diagram */
  diagramType: 'inclined_plane' | 'fbd' | 'projectile' | string
  /** Initial parameter values */
  initialParams?: Record<string, number>
  /** Custom parameters (overrides defaults) */
  customParameters?: ParameterDef[]
  /** Callback when parameters change */
  onParamsChange?: (params: Record<string, number>, calculated: Record<string, unknown>) => void
  /** Render function for the diagram */
  renderDiagram: (params: Record<string, number>, calculated: Record<string, unknown>) => React.ReactNode
  /** Language for labels */
  language?: 'en' | 'he'
  /** Whether what-if mode is enabled */
  enabled?: boolean
  /** Toggle callback */
  onToggle?: (enabled: boolean) => void
}

/**
 * LegacyWhatIfMode - Interactive parameter exploration wrapper
 *
 * @deprecated Use WhatIfMode with useInteractiveParameters hook instead
 */
export function LegacyWhatIfMode({
  diagramType,
  initialParams,
  customParameters,
  onParamsChange,
  renderDiagram,
  language = 'en',
  enabled = false,
  onToggle,
}: LegacyWhatIfModeProps) {
  const isRTL = language === 'he'

  // Get parameters for this diagram type
  const parameters = useMemo(() => {
    return customParameters || DEFAULT_PARAMETERS[diagramType] || []
  }, [diagramType, customParameters])

  // Initialize parameter values
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {}
    parameters.forEach(p => {
      defaults[p.id] = initialParams?.[p.id] ?? p.defaultValue
    })
    return defaults
  })

  // Calculate derived values
  const calculated = useMemo(() => {
    const calculator = PHYSICS_CALCULATORS[diagramType as keyof typeof PHYSICS_CALCULATORS]
    if (calculator) {
      return calculator(paramValues)
    }
    return {}
  }, [diagramType, paramValues])

  // Handle parameter change
  const handleParamChange = useCallback((id: string, value: number) => {
    setParamValues(prev => {
      const next = { ...prev, [id]: value }
      return next
    })
  }, [])

  // Notify parent of changes
  useEffect(() => {
    onParamsChange?.(paramValues, calculated)
  }, [paramValues, calculated, onParamsChange])

  // Reset to defaults
  const handleReset = useCallback(() => {
    const defaults: Record<string, number> = {}
    parameters.forEach(p => {
      defaults[p.id] = initialParams?.[p.id] ?? p.defaultValue
    })
    setParamValues(defaults)
  }, [parameters, initialParams])

  // Labels
  const labels = {
    whatIfMode: language === 'he' ? 'מצב "מה אם"' : 'What-If Mode',
    parameters: language === 'he' ? 'פרמטרים' : 'Parameters',
    reset: language === 'he' ? 'איפוס' : 'Reset',
    results: language === 'he' ? 'תוצאות' : 'Results',
    tryIt: language === 'he' ? 'נסה לשנות ערכים!' : 'Try changing values!',
  }

  return (
    <div className="relative" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Toggle button */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onToggle?.(!enabled)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
            transition-all duration-200
            ${enabled
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
        >
          <span className={`
            w-2 h-2 rounded-full transition-colors
            ${enabled ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}
          `} />
          {labels.whatIfMode}
        </button>

        {enabled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleReset}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {labels.reset}
          </motion.button>
        )}
      </div>

      {/* Main content */}
      <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        {/* Diagram */}
        <div className="flex-1 min-w-0">
          <motion.div
            animate={{
              scale: enabled ? 1 : 1,
              borderColor: enabled ? 'rgb(59 130 246 / 0.5)' : 'transparent',
            }}
            className={`
              rounded-lg overflow-hidden
              ${enabled ? 'ring-2 ring-blue-500/30' : ''}
            `}
          >
            {renderDiagram(paramValues, calculated)}
          </motion.div>
        </div>

        {/* Parameter panel */}
        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -20 : 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 280 }}
              exit={{ opacity: 0, x: isRTL ? -20 : 20, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <div className="space-y-4">
                {/* Parameters */}
                <ParameterSliderGroup
                  parameters={parameters}
                  values={paramValues}
                  onChange={handleParamChange}
                  title={labels.parameters}
                  language={language}
                />

                {/* Calculated results */}
                {Object.keys(calculated).length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {labels.results}
                    </h4>
                    <div className="space-y-1 text-xs font-mono">
                      {Object.entries(calculated)
                        .filter(([key]) => !['forces'].includes(key))
                        .slice(0, 6)
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500">{formatKey(key)}:</span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {typeof value === 'number' ? value.toFixed(2) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Hint */}
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                  {labels.tryIt}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * Format a camelCase key for display
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

export default LegacyWhatIfMode
