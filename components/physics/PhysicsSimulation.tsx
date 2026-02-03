'use client'

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from 'react'
// Note: motion and dynamic imports reserved for future animation enhancements

// ============================================================================
// Types
// ============================================================================

// Matter.js types
interface MatterEngine {
  world: MatterWorld
}

interface MatterWorld {
  gravity: { x: number; y: number; scale: number }
  bodies: MatterBody[]
}

interface MatterBody {
  id: number
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  angle: number
  angularVelocity: number
  force: { x: number; y: number }
  mass: number
  label?: string
  isStatic?: boolean
  friction?: number
  render?: {
    fillStyle?: string
    strokeStyle?: string
    lineWidth?: number
  }
}

interface MatterRender {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  options: {
    width: number
    height: number
    background: string
    wireframes: boolean
    showVelocity: boolean
    showAngleIndicator: boolean
  }
}

// Define matter-js window extension for lazy loading
declare global {
  interface Window {
    Matter?: {
      Engine: {
        create: () => MatterEngine
        update: (engine: MatterEngine, delta?: number) => void
        clear: (engine: MatterEngine) => void
      }
      Render: {
        create: (opts: {
          element: HTMLElement
          engine: MatterEngine
          options: Partial<MatterRender['options']>
        }) => MatterRender
        run: (render: MatterRender) => void
        stop: (render: MatterRender) => void
      }
      Runner: {
        create: () => MatterRunner
        run: (runner: MatterRunner, engine: MatterEngine) => void
        stop: (runner: MatterRunner) => void
      }
      World: {
        add: (world: MatterWorld, body: MatterBody | MatterBody[]) => void
        remove: (world: MatterWorld, body: MatterBody) => void
        clear: (world: MatterWorld, keepStatic: boolean) => void
      }
      Bodies: {
        rectangle: (
          x: number,
          y: number,
          width: number,
          height: number,
          options?: Partial<MatterBody>
        ) => MatterBody
        circle: (x: number, y: number, radius: number, options?: Partial<MatterBody>) => MatterBody
        polygon: (
          x: number,
          y: number,
          sides: number,
          radius: number,
          options?: Partial<MatterBody>
        ) => MatterBody
        trapezoid: (
          x: number,
          y: number,
          width: number,
          height: number,
          slope: number,
          options?: Partial<MatterBody>
        ) => MatterBody
      }
      Body: {
        setPosition: (body: MatterBody, position: { x: number; y: number }) => void
        setVelocity: (body: MatterBody, velocity: { x: number; y: number }) => void
        setAngle: (body: MatterBody, angle: number) => void
        applyForce: (body: MatterBody, position: { x: number; y: number }, force: { x: number; y: number }) => void
      }
      Composite: {
        allBodies: (composite: MatterWorld) => MatterBody[]
      }
      Events: {
        on: (obj: MatterEngine | MatterRender, event: string, callback: (evt: MatterEvent) => void) => void
        off: (obj: MatterEngine | MatterRender, event: string, callback?: (evt: MatterEvent) => void) => void
      }
      Constraint: {
        create: (opts: {
          bodyA?: MatterBody
          bodyB?: MatterBody
          pointA?: { x: number; y: number }
          pointB?: { x: number; y: number }
          length?: number
          stiffness?: number
          render?: { visible?: boolean; strokeStyle?: string; lineWidth?: number }
        }) => MatterConstraint
      }
      Mouse: {
        create: (canvas: HTMLCanvasElement) => MatterMouse
      }
      MouseConstraint: {
        create: (engine: MatterEngine, opts: {
          mouse: MatterMouse
          constraint: Partial<MatterConstraint>
        }) => MatterMouseConstraint
      }
      Vector: {
        create: (x: number, y: number) => { x: number; y: number }
        add: (a: { x: number; y: number }, b: { x: number; y: number }) => { x: number; y: number }
        sub: (a: { x: number; y: number }, b: { x: number; y: number }) => { x: number; y: number }
        mult: (a: { x: number; y: number }, scalar: number) => { x: number; y: number }
        magnitude: (a: { x: number; y: number }) => number
        normalise: (a: { x: number; y: number }) => { x: number; y: number }
        rotate: (a: { x: number; y: number }, angle: number) => { x: number; y: number }
      }
    }
  }
}

interface MatterRunner {
  enabled: boolean
}

interface MatterConstraint {
  bodyA?: MatterBody
  bodyB?: MatterBody
  pointA?: { x: number; y: number }
  pointB?: { x: number; y: number }
  length?: number
  stiffness?: number
}

interface MatterMouse {
  position: { x: number; y: number }
  button: number
}

interface MatterMouseConstraint {
  mouse: MatterMouse
  constraint: MatterConstraint
}

interface MatterEvent {
  timestamp: number
  source: MatterEngine
  name: string
}

export interface SimulationParams {
  /** Gravity in m/s² (default: 9.81) */
  gravity?: number
  /** Time scale (default: 1) */
  timeScale?: number
  /** Friction coefficient (default: 0.5) */
  friction?: number
  /** Restitution/bounciness (default: 0.5) */
  restitution?: number
  /** Air resistance (default: 0.01) */
  airResistance?: number
}

export interface PhysicsSimulationProps {
  /** Simulation width */
  width?: number
  /** Simulation height */
  height?: number
  /** Simulation parameters */
  params?: SimulationParams
  /** Setup function called when engine is ready */
  onSetup?: (engine: MatterEngine, world: MatterWorld) => void
  /** Update function called each frame */
  onUpdate?: (engine: MatterEngine, delta: number) => void
  /** Whether simulation is running */
  running?: boolean
  /** Show debug wireframes */
  wireframes?: boolean
  /** Show velocity vectors */
  showVelocity?: boolean
  /** Background color */
  backgroundColor?: string
  /** Allow mouse interaction (drag objects) */
  interactive?: boolean
  /** Additional class name */
  className?: string
  /** Children (overlays, controls, etc.) */
  children?: ReactNode
}

export interface PhysicsSimulationRef {
  /** Get the Matter.js engine */
  getEngine: () => MatterEngine | null
  /** Get the Matter.js world */
  getWorld: () => MatterWorld | null
  /** Start the simulation */
  start: () => void
  /** Pause the simulation */
  pause: () => void
  /** Step forward one frame */
  step: (delta?: number) => void
  /** Reset to initial state */
  reset: () => void
  /** Add a body to the world */
  addBody: (body: MatterBody) => void
  /** Remove a body from the world */
  removeBody: (body: MatterBody) => void
  /** Get all bodies */
  getBodies: () => MatterBody[]
}

// ============================================================================
// Matter.js Script Loader
// ============================================================================

const MATTER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'

let matterLoadPromise: Promise<void> | null = null

function loadMatterScript(): Promise<void> {
  if (matterLoadPromise) return matterLoadPromise

  matterLoadPromise = new Promise((resolve, reject) => {
    if (window.Matter) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = MATTER_CDN
    script.async = true

    script.onload = () => {
      if (window.Matter) {
        resolve()
      } else {
        reject(new Error('Matter.js failed to initialize'))
      }
    }

    script.onerror = () => {
      matterLoadPromise = null
      reject(new Error('Failed to load Matter.js'))
    }

    document.head.appendChild(script)
  })

  return matterLoadPromise
}

// ============================================================================
// Component
// ============================================================================

/**
 * PhysicsSimulation - Matter.js physics engine wrapper
 *
 * Provides a canvas-based physics simulation with:
 * - Play/pause/step controls
 * - Parameter adjustment (gravity, friction, etc.)
 * - Mouse interaction (drag objects)
 * - Real-time velocity/force visualization
 *
 * @example
 * // Basic usage
 * <PhysicsSimulation
 *   onSetup={(engine, world) => {
 *     const box = Matter.Bodies.rectangle(200, 100, 50, 50)
 *     Matter.World.add(world, box)
 *   }}
 * />
 */
export const PhysicsSimulation = forwardRef<PhysicsSimulationRef, PhysicsSimulationProps>(
  function PhysicsSimulation(
    {
      width = 600,
      height = 400,
      params = {},
      onSetup,
      onUpdate,
      running: initialRunning = false,
      wireframes = false,
      showVelocity = true,
      backgroundColor = '#1f2937',
      interactive = true,
      className = '',
      children,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const engineRef = useRef<MatterEngine | null>(null)
    const renderRef = useRef<MatterRender | null>(null)
    const runnerRef = useRef<MatterRunner | null>(null)
    const setupCallbackRef = useRef(onSetup)
    const updateCallbackRef = useRef(onUpdate)
    const initialStateRef = useRef<string | null>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRunning, setIsRunning] = useState(initialRunning)

    // Keep callbacks up to date
    useEffect(() => {
      setupCallbackRef.current = onSetup
      updateCallbackRef.current = onUpdate
    }, [onSetup, onUpdate])

    // Initialize Matter.js
    useEffect(() => {
      let mounted = true

      async function init() {
        if (!containerRef.current) return

        try {
          await loadMatterScript()

          if (!mounted || !containerRef.current || !window.Matter) return

          const Matter = window.Matter

          // Create engine
          const engine = Matter.Engine.create()
          engineRef.current = engine

          // Set gravity
          const gravity = params.gravity ?? 9.81
          engine.world.gravity.y = gravity / 100 // Scale down for Matter.js

          // Create renderer
          const render = Matter.Render.create({
            element: containerRef.current,
            engine,
            options: {
              width,
              height,
              background: backgroundColor,
              wireframes,
              showVelocity,
              showAngleIndicator: false,
            },
          })
          renderRef.current = render
          canvasRef.current = render.canvas

          // Add mouse constraint for interactive mode
          if (interactive) {
            const mouse = Matter.Mouse.create(render.canvas)
            const mouseConstraint = Matter.MouseConstraint.create(engine, {
              mouse,
              constraint: {
                stiffness: 0.2,
              },
            })
            Matter.World.add(engine.world, mouseConstraint as unknown as MatterBody)
          }

          // Create runner
          const runner = Matter.Runner.create()
          runnerRef.current = runner

          // Run the renderer
          Matter.Render.run(render)

          // Call setup callback
          if (setupCallbackRef.current) {
            setupCallbackRef.current(engine, engine.world)
          }

          // Save initial state for reset
          initialStateRef.current = JSON.stringify(
            Matter.Composite.allBodies(engine.world).map((b) => ({
              id: b.id,
              position: { ...b.position },
              velocity: { ...b.velocity },
              angle: b.angle,
            }))
          )

          // Set up update event
          if (updateCallbackRef.current) {
            Matter.Events.on(engine, 'afterUpdate', () => {
              if (updateCallbackRef.current) {
                updateCallbackRef.current(engine, 16.67) // ~60fps
              }
            })
          }

          // Start if initially running
          if (initialRunning) {
            Matter.Runner.run(runner, engine)
            setIsRunning(true)
          }

          setIsLoading(false)
        } catch (err) {
          console.error('Physics simulation error:', err)
          setError(err instanceof Error ? err.message : 'Failed to initialize physics')
          setIsLoading(false)
        }
      }

      init()

      return () => {
        mounted = false
        if (window.Matter && renderRef.current) {
          window.Matter.Render.stop(renderRef.current)
        }
        if (window.Matter && runnerRef.current) {
          window.Matter.Runner.stop(runnerRef.current)
        }
        if (window.Matter && engineRef.current) {
          window.Matter.Engine.clear(engineRef.current)
        }
      }
    }, [width, height, wireframes, showVelocity, backgroundColor, interactive, params.gravity, initialRunning])

    // Control functions
    const start = useCallback(() => {
      if (!window.Matter || !runnerRef.current || !engineRef.current) return
      window.Matter.Runner.run(runnerRef.current, engineRef.current)
      setIsRunning(true)
    }, [])

    const pause = useCallback(() => {
      if (!window.Matter || !runnerRef.current) return
      window.Matter.Runner.stop(runnerRef.current)
      setIsRunning(false)
    }, [])

    const step = useCallback((delta: number = 16.67) => {
      if (!window.Matter || !engineRef.current) return
      window.Matter.Engine.update(engineRef.current, delta)
    }, [])

    const reset = useCallback(() => {
      if (!window.Matter || !engineRef.current || !initialStateRef.current) return

      pause()

      const initialStates = JSON.parse(initialStateRef.current)
      const bodies = window.Matter.Composite.allBodies(engineRef.current.world)

      for (const state of initialStates) {
        const body = bodies.find((b) => b.id === state.id)
        if (body) {
          window.Matter.Body.setPosition(body, state.position)
          window.Matter.Body.setVelocity(body, state.velocity)
          window.Matter.Body.setAngle(body, state.angle)
        }
      }
    }, [pause])

    const addBody = useCallback((body: MatterBody) => {
      if (!window.Matter || !engineRef.current) return
      window.Matter.World.add(engineRef.current.world, body)
    }, [])

    const removeBody = useCallback((body: MatterBody) => {
      if (!window.Matter || !engineRef.current) return
      window.Matter.World.remove(engineRef.current.world, body)
    }, [])

    const getBodies = useCallback(() => {
      if (!window.Matter || !engineRef.current) return []
      return window.Matter.Composite.allBodies(engineRef.current.world)
    }, [])

    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        getEngine: () => engineRef.current,
        getWorld: () => engineRef.current?.world ?? null,
        start,
        pause,
        step,
        reset,
        addBody,
        removeBody,
        getBodies,
      }),
      [start, pause, step, reset, addBody, removeBody, getBodies]
    )

    return (
      <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ width, height }}>
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              <span className="text-sm text-gray-400">Loading physics engine...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-900/20">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Canvas container */}
        <div ref={containerRef} className="h-full w-full" />

        {/* Control overlay */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            onClick={isRunning ? pause : start}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            title={isRunning ? 'Pause' : 'Play'}
          >
            {isRunning ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => step()}
            disabled={isRunning}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            title="Step forward"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={reset}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            title="Reset"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Children (custom overlays) */}
        {children}
      </div>
    )
  }
)

export default PhysicsSimulation
