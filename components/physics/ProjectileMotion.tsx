'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProjectileMotionData } from '@/types/physics'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
  prefersReducedMotion,
} from '@/lib/diagram-animations'
import { ForceVector } from './ForceVector'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectileMotionProps {
  data: ProjectileMotionData
  width?: number
  height?: number
  className?: string
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  setup: { en: 'Show initial position', he: '\u05D4\u05E6\u05D2\u05EA \u05DE\u05D9\u05E7\u05D5\u05DD \u05D4\u05EA\u05D7\u05DC\u05EA\u05D9' },
  trajectory: { en: 'Draw trajectory', he: '\u05E6\u05D9\u05D5\u05E8 \u05DE\u05E1\u05DC\u05D5\u05DC' },
  maxHeight: { en: 'Show max height', he: '\u05D4\u05E6\u05D2\u05EA \u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9' },
  velocityVectors: { en: 'Show velocity vectors', he: '\u05D4\u05E6\u05D2\u05EA \u05D5\u05E7\u05D8\u05D5\u05E8\u05D9 \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA' },
  components: { en: 'Show components', he: '\u05D4\u05E6\u05D2\u05EA \u05E8\u05DB\u05D9\u05D1\u05D9\u05DD' },
  gravity: { en: 'Show gravity', he: '\u05D4\u05E6\u05D2\u05EA \u05DB\u05D5\u05D7 \u05D4\u05DB\u05D1\u05D9\u05D3\u05D4' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ProjectileMotion -- Phase 2 rebuild with useDiagramBase infrastructure.
 *
 * Quality checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] pathLength draw animation
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 */
export function ProjectileMotion({
  data,
  width = 500,
  height = 350,
  className = '',
  subject = 'physics',
  complexity = 'middle_school',
  language = 'en',
  initialStep,
}: ProjectileMotionProps) {
  const {
    initial,
    initialVelocity,
    timeIntervals = [0, 0.5, 1, 1.5, 2],
    showVelocityVectors = true,
    showAcceleration = false,
    showTrajectory = true,
    showComponents = false,
    groundLevel = height - 60,
    title,
  } = data

  const reducedMotion = prefersReducedMotion()

  // Physics constants
  const g = 9.8 // gravity (m/s^2)
  const scale = 8 // pixels per meter

  // ------ Detect optional features ------
  const hasComponents = showComponents
  const hasGravity = showAcceleration

  // Build dynamic step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'setup', label: STEP_LABELS.setup.en, labelHe: STEP_LABELS.setup.he },
      { id: 'trajectory', label: STEP_LABELS.trajectory.en, labelHe: STEP_LABELS.trajectory.he },
      { id: 'maxHeight', label: STEP_LABELS.maxHeight.en, labelHe: STEP_LABELS.maxHeight.he },
    ]
    if (showVelocityVectors) {
      defs.push({ id: 'velocityVectors', label: STEP_LABELS.velocityVectors.en, labelHe: STEP_LABELS.velocityVectors.he })
    }
    if (hasComponents) {
      defs.push({ id: 'components', label: STEP_LABELS.components.en, labelHe: STEP_LABELS.components.he })
    }
    if (hasGravity) {
      defs.push({ id: 'gravity', label: STEP_LABELS.gravity.en, labelHe: STEP_LABELS.gravity.he })
    }
    return defs
  }, [showVelocityVectors, hasComponents, hasGravity])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Spotlight variants
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary],
  )

  // ---------------------------------------------------------------------------
  // Physics calculations
  // ---------------------------------------------------------------------------

  // Calculate trajectory points
  const trajectoryPoints = useMemo(() => {
    const v0 = initialVelocity.magnitude
    const theta = (initialVelocity.angle * Math.PI) / 180
    const v0x = v0 * Math.cos(theta)
    const v0y = v0 * Math.sin(theta)

    // Time of flight (until projectile returns to initial height)
    const tFlight = (2 * v0y) / g

    const points: Array<{ x: number; y: number; t: number; vx: number; vy: number }> = []
    const numPoints = 50

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * tFlight
      const x = initial.x + v0x * t * scale
      const y = initial.y - (v0y * t - 0.5 * g * t * t) * scale
      const vx = v0x
      const vy = v0y - g * t

      if (y <= groundLevel) {
        points.push({ x, y, t, vx, vy })
      }
    }

    return points
  }, [initial, initialVelocity, groundLevel, scale, g])

  // Calculate positions at specific time intervals
  const markerPositions = useMemo(() => {
    const v0 = initialVelocity.magnitude
    const theta = (initialVelocity.angle * Math.PI) / 180
    const v0x = v0 * Math.cos(theta)
    const v0y = v0 * Math.sin(theta)

    return timeIntervals.map((t) => ({
      t,
      x: initial.x + v0x * t * scale,
      y: initial.y - (v0y * t - 0.5 * g * t * t) * scale,
      vx: v0x,
      vy: v0y - g * t,
    }))
  }, [initial, initialVelocity, timeIntervals, scale, g])

  // Max height point
  const maxHeightPoint = useMemo(() => {
    const v0 = initialVelocity.magnitude
    const theta = (initialVelocity.angle * Math.PI) / 180
    const v0y = v0 * Math.sin(theta)
    const tMax = v0y / g
    const v0x = v0 * Math.cos(theta)

    return {
      x: initial.x + v0x * tMax * scale,
      y: initial.y - (v0y * tMax - 0.5 * g * tMax * tMax) * scale,
      maxHeight: (v0y * v0y) / (2 * g),
    }
  }, [initial, initialVelocity, scale, g])

  // Generate SVG path for trajectory
  const trajectoryPath = useMemo(() => {
    if (trajectoryPoints.length < 2) return ''
    return trajectoryPoints.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`
      return `${path} L ${point.x} ${point.y}`
    }, '')
  }, [trajectoryPoints])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="projectile-motion"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Projectile motion with initial velocity ${initialVelocity.magnitude} at ${initialVelocity.angle} degrees`}
      >
        {/* Definitions */}
        <defs>
          <linearGradient id="bg-gradient-proj" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="[stop-color:theme(colors.sky.50)] dark:[stop-color:theme(colors.gray.900)]" />
            <stop offset="100%" className="[stop-color:theme(colors.sky.100)] dark:[stop-color:theme(colors.gray.800)]" />
          </linearGradient>

          <pattern id="grid-pattern-proj" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              className="stroke-gray-200 dark:stroke-gray-700"
              strokeWidth="0.5"
            />
          </pattern>

          <linearGradient id="ground-gradient-proj" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect
          data-testid="pm-background"
          width={width}
          height={height}
          rx={4}
          fill="url(#bg-gradient-proj)"
        />
        <rect
          width={width}
          height={height}
          fill="url(#grid-pattern-proj)"
          opacity={0.3}
          rx={4}
        />

        {/* Ground */}
        <rect
          data-testid="pm-ground"
          x={0}
          y={groundLevel}
          width={width}
          height={height - groundLevel}
          fill="url(#ground-gradient-proj)"
        />
        <line
          x1={0}
          y1={groundLevel}
          x2={width}
          y2={groundLevel}
          stroke="#22c55e"
          strokeWidth={diagram.lineWeight}
        />

        {/* Title */}
        {title && (
          <motion.text
            x={width / 2}
            y={28}
            textAnchor="middle"
            fontSize={16}
            fontWeight="600"
            fontFamily="'Inter', system-ui, sans-serif"
            className="fill-gray-800 dark:fill-gray-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
            {title}
          </motion.text>
        )}

        {/* ---- Step 0: Setup (initial position / launch point) ---- */}
        <AnimatePresence>
          {isVisible('setup') && (
            <motion.g
              data-testid="pm-setup"
              initial="hidden"
              animate={isCurrent('setup') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <circle
                cx={initial.x}
                cy={initial.y}
                r={8}
                fill={diagram.colors.primary}
                stroke={diagram.colors.dark}
                strokeWidth={2}
              />
              <motion.text
                x={initial.x - 15}
                y={initial.y + 20}
                fontSize={11}
                className="fill-gray-600 dark:fill-gray-400"
                fontFamily="'Inter', system-ui, sans-serif"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? '\u05D4\u05EA\u05D7\u05DC\u05D4' : 'Start'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 1: Trajectory path ---- */}
        <AnimatePresence>
          {isVisible('trajectory') && showTrajectory && (
            <motion.g
              data-testid="pm-trajectory"
              initial="hidden"
              animate={isCurrent('trajectory') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={trajectoryPath}
                fill="none"
                stroke={diagram.colors.curve}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6 3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Position markers along trajectory */}
              {markerPositions.map((point, index) =>
                point.y <= groundLevel && (
                  <motion.g
                    key={`marker-${index}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: index * 0.1 }}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill={diagram.colors.point}
                      stroke="white"
                      strokeWidth={2}
                    />
                    <text
                      x={point.x}
                      y={point.y + 25}
                      textAnchor="middle"
                      fontSize={10}
                      className="fill-gray-500 dark:fill-gray-400"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      t = {point.t}s
                    </text>
                  </motion.g>
                )
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 2: Max height indicator ---- */}
        <AnimatePresence>
          {isVisible('maxHeight') && (
            <motion.g
              data-testid="pm-max-height"
              initial="hidden"
              animate={isCurrent('maxHeight') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={maxHeightPoint.x}
                y1={maxHeightPoint.y}
                x2={maxHeightPoint.x}
                y2={groundLevel}
                stroke={diagram.colors.accent}
                strokeWidth={1}
                strokeDasharray="4 4"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={maxHeightPoint.x + 8}
                y={(maxHeightPoint.y + groundLevel) / 2}
                fontSize={10}
                fill={diagram.colors.primary}
                fontFamily="'JetBrains Mono', monospace"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                h<tspan fontSize={7} dy={2}>max</tspan> = {maxHeightPoint.maxHeight.toFixed(1)}m
              </motion.text>
              {/* Horizontal line at max height */}
              <motion.line
                x1={initial.x}
                y1={maxHeightPoint.y}
                x2={maxHeightPoint.x}
                y2={maxHeightPoint.y}
                stroke={diagram.colors.accent}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 3: Velocity vectors ---- */}
        <AnimatePresence>
          {isVisible('velocityVectors') && showVelocityVectors && (
            <motion.g
              data-testid="pm-velocity-vectors"
              initial="hidden"
              animate={isCurrent('velocityVectors') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {markerPositions.map((point, index) => {
                if (point.y > groundLevel) return null

                const vMag = Math.sqrt(point.vx * point.vx + point.vy * point.vy)
                const vAngle = (Math.atan2(point.vy, point.vx) * 180) / Math.PI

                return (
                  <motion.g
                    key={`velocity-${index}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: index * 0.15 }}
                  >
                    <ForceVector
                      force={{
                        name: `v${index}`,
                        type: 'applied',
                        magnitude: vMag * 3,
                        angle: vAngle,
                        symbol: 'v',
                        color: diagram.colors.primary,
                      }}
                      origin={point}
                      scale={1}
                      highlighted={isCurrent('velocityVectors')}
                      showLabel={true}
                      showMagnitude={false}
                      animation="draw"
                      animationDuration={reducedMotion ? 0 : 400}
                      animationDelay={reducedMotion ? 0 : 200 + index * 150}
                      useGradient={true}
                    />
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 4: Component vectors ---- */}
        <AnimatePresence>
          {isVisible('components') && hasComponents && (
            <motion.g
              data-testid="pm-components"
              initial="hidden"
              animate={isCurrent('components') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {markerPositions.map((point, index) => {
                if (point.y > groundLevel) return null

                return (
                  <motion.g
                    key={`components-${index}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* vx component */}
                    <motion.line
                      x1={point.x}
                      y1={point.y}
                      x2={point.x + point.vx * 3}
                      y2={point.y}
                      stroke="#3b82f6"
                      strokeWidth={diagram.lineWeight - 1}
                      strokeDasharray="4 2"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <text
                      x={point.x + point.vx * 1.5}
                      y={point.y + 15}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#3b82f6"
                      fontFamily="'Inter', system-ui, sans-serif"
                    >
                      v<tspan fontSize={8} dy={2}>x</tspan>
                    </text>

                    {/* vy component */}
                    <motion.line
                      x1={point.x}
                      y1={point.y}
                      x2={point.x}
                      y2={point.y - point.vy * 3}
                      stroke="#22c55e"
                      strokeWidth={diagram.lineWeight - 1}
                      strokeDasharray="4 2"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <text
                      x={point.x - 15}
                      y={point.y - point.vy * 1.5}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#22c55e"
                      fontFamily="'Inter', system-ui, sans-serif"
                    >
                      v<tspan fontSize={8} dy={2}>y</tspan>
                    </text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 5: Gravity / acceleration vector ---- */}
        <AnimatePresence>
          {isVisible('gravity') && hasGravity && (
            <motion.g
              data-testid="pm-gravity"
              initial="hidden"
              animate={isCurrent('gravity') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <ForceVector
                force={{
                  name: 'g',
                  type: 'weight',
                  magnitude: 30,
                  angle: -90,
                  symbol: 'g',
                }}
                origin={{ x: width - 60, y: 80 }}
                scale={1}
                highlighted={isCurrent('gravity')}
                showLabel={true}
                animation="draw"
                animationDuration={reducedMotion ? 0 : 400}
                useGradient={true}
              />
              <motion.text
                x={width - 60}
                y={120}
                textAnchor="middle"
                fontSize={10}
                className="fill-gray-600 dark:fill-gray-400"
                fontFamily="'JetBrains Mono', monospace"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                g = 9.8 m/s²
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Step Controls */}
      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={diagram.currentStep}
          totalSteps={diagram.totalSteps}
          onNext={diagram.next}
          onPrev={diagram.prev}
          stepLabel={stepLabel}
          language={language}
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default ProjectileMotion
