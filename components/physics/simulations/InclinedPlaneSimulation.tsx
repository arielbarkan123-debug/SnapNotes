'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import type { PhysicsSimulationRef } from '../PhysicsSimulation'

// Lazy load the physics simulation
const PhysicsSimulation = dynamic(
  () => import('../PhysicsSimulation').then((mod) => mod.PhysicsSimulation),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl bg-gray-800">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    ),
  }
)

// ============================================================================
// Types
// ============================================================================

export interface InclinedPlaneSimulationProps {
  /** Angle of the incline in degrees */
  angle?: number
  /** Mass of the block in kg */
  mass?: number
  /** Friction coefficient */
  friction?: number
  /** Whether to show the friction force */
  showFriction?: boolean
  /** Whether to show velocity vector */
  showVelocity?: boolean
  /** Whether to show force labels */
  showLabels?: boolean
  /** Width */
  width?: number
  /** Height */
  height?: number
  /** Additional className */
  className?: string
  /** Callback when simulation runs */
  onSimulationUpdate?: (data: {
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    acceleration: number
  }) => void
}

// ============================================================================
// Component
// ============================================================================

/**
 * InclinedPlaneSimulation - Interactive inclined plane physics demo
 *
 * Features:
 * - Adjustable angle slider
 * - Real-time force visualization
 * - Friction coefficient adjustment
 * - Play/pause/reset controls
 *
 * @example
 * <InclinedPlaneSimulation
 *   angle={30}
 *   mass={5}
 *   friction={0.3}
 *   showLabels={true}
 * />
 */
export function InclinedPlaneSimulation({
  angle: initialAngle = 30,
  mass: initialMass = 5,
  friction: initialFriction = 0.3,
  showFriction = true,
  showVelocity = true,
  showLabels = true,
  width = 600,
  height = 400,
  className = '',
  onSimulationUpdate,
}: InclinedPlaneSimulationProps) {
  const simulationRef = useRef<PhysicsSimulationRef>(null)
  const [angle, setAngle] = useState(initialAngle)
  const [mass, setMass] = useState(initialMass)
  const [friction, setFriction] = useState(initialFriction)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  // Physics calculations
  const gravity = 9.81
  const angleRad = (angle * Math.PI) / 180
  const weight = mass * gravity
  const normalForce = weight * Math.cos(angleRad)
  const gravitationalComponent = weight * Math.sin(angleRad)
  const frictionForce = friction * normalForce
  const netForce = gravitationalComponent - frictionForce
  const acceleration = netForce / mass

  // Setup function for Matter.js
  const handleSetup = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine: any, world: any) => {
      if (!window.Matter) return
      const Matter = window.Matter

      // Clear existing bodies
      Matter.World.clear(world, false)

      // Dimensions
      const inclineLength = width * 0.7
      const inclineHeight = inclineLength * Math.tan(angleRad)
      const baseY = height - 50

      // Create inclined plane (static)
      const incline = Matter.Bodies.rectangle(
        width / 2,
        baseY - inclineHeight / 2,
        inclineLength,
        20,
        {
          isStatic: true,
          angle: -angleRad,
          render: {
            fillStyle: '#4b5563',
          },
          friction: friction,
          label: 'incline',
        }
      )

      // Create block on incline
      const blockSize = 40
      const blockX = width * 0.3
      const blockY = baseY - inclineHeight - blockSize / 2 - 30
      const block = Matter.Bodies.rectangle(blockX, blockY, blockSize, blockSize, {
        render: {
          fillStyle: '#6366f1',
        },
        friction: friction,
        mass: mass,
        label: 'block',
      })

      // Create floor (static)
      const floor = Matter.Bodies.rectangle(width / 2, height - 10, width, 20, {
        isStatic: true,
        render: {
          fillStyle: '#374151',
        },
        label: 'floor',
      })

      // Add bodies to world
      Matter.World.add(world, [incline, block, floor])
    },
    [angle, angleRad, friction, mass, width, height]
  )

  // Update callback
  const handleUpdate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine: any) => {
      if (!window.Matter || !onSimulationUpdate) return

      const bodies = window.Matter.Composite.allBodies(engine.world)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const block = bodies.find((b: any) => b.label === 'block')

      if (block) {
        const speed = window.Matter.Vector.magnitude(block.velocity)
        onSimulationUpdate({
          position: { x: block.position.x, y: block.position.y },
          velocity: { x: block.velocity.x, y: block.velocity.y },
          acceleration: speed > 0.1 ? acceleration : 0,
        })
      }
    },
    [acceleration, onSimulationUpdate]
  )

  // Reconfigure simulation when parameters change
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.reset()
    }
  }, [angle, mass, friction])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Simulation canvas */}
      <div className="relative">
        <PhysicsSimulation
          ref={simulationRef}
          width={width}
          height={height}
          onSetup={handleSetup}
          onUpdate={handleUpdate}
          params={{ gravity: 9.81, friction }}
          showVelocity={showVelocity}
          interactive={true}
        >
          {/* Force labels overlay */}
          {showLabels && (
            <div className="absolute right-4 top-4 space-y-2 rounded-lg bg-black/50 p-3 text-xs text-white backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Weight:</span>
                <span className="font-mono">{weight.toFixed(1)} N</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Normal:</span>
                <span className="font-mono">{normalForce.toFixed(1)} N</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">mg·sin(θ):</span>
                <span className="font-mono">{gravitationalComponent.toFixed(1)} N</span>
              </div>
              {showFriction && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-400">Friction:</span>
                  <span className="font-mono">{frictionForce.toFixed(1)} N</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-400">Net Force:</span>
                  <span className={`font-mono ${netForce > 0 ? 'text-green-400' : netForce < 0 ? 'text-red-400' : 'text-white'}`}>
                    {netForce.toFixed(1)} N
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-400">Acceleration:</span>
                  <span className="font-mono">{acceleration.toFixed(2)} m/s²</span>
                </div>
              </div>
            </div>
          )}
        </PhysicsSimulation>

        {/* Config toggle */}
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          title="Configure parameters"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Parameter sliders */}
      {isConfigOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <h4 className="mb-4 font-medium text-gray-900 dark:text-white">Simulation Parameters</h4>

          <div className="space-y-4">
            {/* Angle slider */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">Angle</label>
                <span className="font-mono text-sm text-gray-900 dark:text-white">{angle}°</span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
              />
            </div>

            {/* Mass slider */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">Mass</label>
                <span className="font-mono text-sm text-gray-900 dark:text-white">{mass} kg</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={mass}
                onChange={(e) => setMass(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
              />
            </div>

            {/* Friction slider */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">Friction (μ)</label>
                <span className="font-mono text-sm text-gray-900 dark:text-white">{friction.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={friction * 100}
                onChange={(e) => setFriction(Number(e.target.value) / 100)}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Prediction */}
          <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {netForce > 0.1
                ? `The block will slide down with acceleration ${acceleration.toFixed(2)} m/s²`
                : netForce < -0.1
                  ? 'The block will not slide (friction exceeds gravity component)'
                  : 'The block is at the threshold of motion'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default InclinedPlaneSimulation
