'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type InclinedPlaneData,
  type DiagramStepConfig,
  FORCE_COLORS as PHYSICS_FORCE_COLORS,
} from '@/types/physics'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
  arrowVariants,
  arrowheadVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InclinedPlaneProps {
  data: InclinedPlaneData
  /** Initial step to display (uncontrolled mode) */
  initialStep?: number
  /** Controlled step - when provided, external control takes over */
  currentStep?: number
  /** Step configuration for progressive reveal */
  stepConfig?: DiagramStepConfig[]
  /** Callback when step animation completes */
  onStepComplete?: () => void
  /** Animation duration in ms (for backwards compatibility) */
  animationDuration?: number
  /** Width of the SVG */
  width?: number
  /** Height of the SVG */
  height?: number
  /** Additional className */
  className?: string
  /** Subject for theming */
  subject?: SubjectKey
  /** Complexity level for line weights */
  complexity?: VisualComplexityLevel
  /** Language for labels */
  language?: 'en' | 'he'
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  plane: { en: 'Draw the inclined plane', he: '\u05E6\u05D9\u05D5\u05E8 \u05D4\u05DE\u05D9\u05E9\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D5\u05E4\u05E2' },
  object: { en: 'Place the object', he: '\u05D4\u05E6\u05D1\u05EA \u05D4\u05D2\u05D5\u05E3' },
  weight: { en: 'Show weight force', he: '\u05D4\u05E6\u05D2\u05EA \u05DB\u05D5\u05D7 \u05D4\u05DE\u05E9\u05E7\u05DC' },
  normal: { en: 'Show normal force', he: '\u05D4\u05E6\u05D2\u05EA \u05DB\u05D5\u05D7 \u05E0\u05D5\u05E8\u05DE\u05DC\u05D9' },
  friction: { en: 'Show friction force', he: '\u05D4\u05E6\u05D2\u05EA \u05DB\u05D5\u05D7 \u05D7\u05D9\u05DB\u05D5\u05DA' },
  components: { en: 'Show force components', he: '\u05D4\u05E6\u05D2\u05EA \u05E8\u05DB\u05D9\u05D1\u05D9 \u05D4\u05DB\u05D5\u05D7' },
  equations: { en: 'Show equations', he: '\u05D4\u05E6\u05D2\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05D5\u05EA' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * InclinedPlane - Phase 2 rebuild with new diagram infrastructure.
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
export function InclinedPlane({
  data,
  initialStep = 0,
  currentStep: controlledStep,
  stepConfig,
  onStepComplete,
  animationDuration: _animationDuration,
  width = 500,
  height = 380,
  className = '',
  subject = 'physics',
  complexity = 'middle_school',
  language = 'en',
}: InclinedPlaneProps) {
  const {
    angle,
    object: rawObject,
    forces: rawForces,
    showDecomposition = false,
    frictionCoefficient,
    coordinateSystem = 'standard',
    showAngleLabel = true,
    surface,
    title,
  } = data

  // Defensive defaults
  const object = rawObject || {
    type: 'block' as const,
    position: { x: 0, y: 0 },
    mass: undefined,
    label: undefined,
    color: '#e5e7eb',
  }
  const forces = rawForces || []

  // ------ Detect optional features ------
  const hasWeight = forces.some((f) => f.type === 'weight')
  const hasNormal = forces.some((f) => f.type === 'normal')
  const hasFriction = forces.some((f) => f.type === 'friction')
  const hasComponents = showDecomposition && hasWeight

  // Build dynamic step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'plane', label: STEP_LABELS.plane.en, labelHe: STEP_LABELS.plane.he },
      { id: 'object', label: STEP_LABELS.object.en, labelHe: STEP_LABELS.object.he },
    ]
    if (hasWeight) {
      defs.push({ id: 'weight', label: STEP_LABELS.weight.en, labelHe: STEP_LABELS.weight.he })
    }
    if (hasNormal) {
      defs.push({ id: 'normal', label: STEP_LABELS.normal.en, labelHe: STEP_LABELS.normal.he })
    }
    if (hasFriction) {
      defs.push({ id: 'friction', label: STEP_LABELS.friction.en, labelHe: STEP_LABELS.friction.he })
    }
    if (hasComponents) {
      defs.push({ id: 'components', label: STEP_LABELS.components.en, labelHe: STEP_LABELS.components.he })
    }
    // Add equations step if stepConfig contains calculation info
    if (stepConfig?.some((s) => s.showCalculation)) {
      defs.push({ id: 'equations', label: STEP_LABELS.equations.en, labelHe: STEP_LABELS.equations.he })
    }
    return defs
  }, [hasWeight, hasNormal, hasFriction, hasComponents, stepConfig])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
    initialStep: initialStep,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
    onStepChange: () => onStepComplete?.(),
  })

  // Use controlled step if provided, otherwise use internal step from useDiagramBase
  const effectiveStep = controlledStep !== undefined ? controlledStep : diagram.currentStep

  // Step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && effectiveStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === effectiveStep

  // Spotlight variants
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary],
  )

  // Get current step configuration (from external stepConfig if provided)
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > effectiveStep) {
      return stepConfig[effectiveStep]
    }
    return {
      step: effectiveStep,
      visibleForces: forces.slice(0, effectiveStep).map((f) => f.name),
    }
  }, [effectiveStep, stepConfig, forces])

  // === LAYOUT CALCULATIONS ===
  const margin = { left: 50, right: 30, top: 60, bottom: 50 }
  const diagramWidth = width - margin.left - margin.right
  const diagramHeight = height - margin.top - margin.bottom

  const angleRad = (angle * Math.PI) / 180

  // Plane geometry - use most of the available space
  const planeLength = Math.min(diagramWidth * 0.85, diagramHeight / Math.sin(angleRad) * 0.8)

  // Ground level
  const groundY = height - margin.bottom

  // Plane start (bottom-left of incline)
  const planeStart = {
    x: margin.left + 40,
    y: groundY,
  }

  // Plane end (top-right of incline)
  const planeEnd = {
    x: planeStart.x + planeLength * Math.cos(angleRad),
    y: planeStart.y - planeLength * Math.sin(angleRad),
  }

  // Object on slope - positioned at 40% up the slope
  const objectPosition = 0.4
  const objectOnSlope = {
    x: planeStart.x + planeLength * objectPosition * Math.cos(angleRad),
    y: planeStart.y - planeLength * objectPosition * Math.sin(angleRad),
  }

  // Object size - LARGER for visibility
  const objSize = 55

  // Object center (perpendicular offset from slope surface)
  const perpOffset = objSize / 2 + 3
  const objectCenter = {
    x: objectOnSlope.x + perpOffset * Math.sin(angleRad),
    y: objectOnSlope.y - perpOffset * Math.cos(angleRad),
  }

  // Current step label
  const currentStepDef = stepDefs[effectiveStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // === RENDER FUNCTIONS ===

  // Ground and inclined surface
  const renderPlane = () => (
    <motion.g
      data-testid="ip-plane"
      className="plane-surface"
      initial="hidden"
      animate={isCurrent('plane') ? 'spotlight' : 'visible'}
      variants={spotlight}
    >
      {/* Ground line */}
      <motion.line
        x1={margin.left}
        y1={groundY}
        x2={width - margin.right}
        y2={groundY}
        stroke="currentColor"
        strokeWidth={diagram.lineWeight}
        initial="hidden"
        animate="visible"
        variants={lineDrawVariants}
      />

      {/* Ground hatching */}
      {Array.from({ length: Math.floor((width - margin.left - margin.right) / 12) }).map((_, i) => (
        <motion.line
          key={i}
          x1={margin.left + i * 12}
          y1={groundY}
          x2={margin.left + i * 12 + 6}
          y2={groundY + 6}
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.4}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.3 + i * 0.01 }}
        />
      ))}

      {/* Inclined surface - thick and prominent */}
      <motion.line
        x1={planeStart.x}
        y1={planeStart.y}
        x2={planeEnd.x}
        y2={planeEnd.y}
        stroke="currentColor"
        strokeWidth={diagram.lineWeight + 1}
        strokeLinecap="round"
        initial="hidden"
        animate="visible"
        variants={lineDrawVariants}
      />

      {/* Surface texture for friction */}
      {(frictionCoefficient || surface?.hasRoughness) && (
        <g className="friction-texture">
          {Array.from({ length: 10 }).map((_, i) => {
            const t = (i + 1) / 11
            const x = planeStart.x + (planeEnd.x - planeStart.x) * t
            const y = planeStart.y + (planeEnd.y - planeStart.y) * t
            const perpX = Math.sin(angleRad) * 5
            const perpY = Math.cos(angleRad) * 5
            return (
              <motion.line
                key={i}
                x1={x - perpX}
                y1={y - perpY}
                x2={x + perpX}
                y2={y + perpY}
                stroke="currentColor"
                strokeWidth={1.5}
                opacity={0.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.5 + i * 0.02 }}
              />
            )
          })}
        </g>
      )}

      {/* Vertical support (dashed) */}
      <motion.line
        x1={planeEnd.x}
        y1={planeEnd.y}
        x2={planeEnd.x}
        y2={groundY}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        opacity={0.4}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.4 }}
      />
    </motion.g>
  )

  // Angle arc and label - positioned clearly at bottom left
  const renderAngle = () => {
    if (!showAngleLabel) return null

    const arcRadius = 45
    const endAngle = -angleRad
    const arcEndX = planeStart.x + arcRadius * Math.cos(endAngle)
    const arcEndY = planeStart.y + arcRadius * Math.sin(endAngle)
    const arcPath = `M ${planeStart.x + arcRadius} ${planeStart.y} A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`

    // Label positioned along the arc midpoint, outside
    const labelAngle = -angleRad / 2
    const labelRadius = arcRadius + 22
    const labelX = planeStart.x + labelRadius * Math.cos(labelAngle)
    const labelY = planeStart.y + labelRadius * Math.sin(labelAngle)

    return (
      <motion.g
        data-testid="ip-angle"
        className="angle-indicator"
        initial="hidden"
        animate="visible"
        variants={labelAppearVariants}
        transition={{ delay: 0.5 }}
      >
        <motion.path
          d={arcPath}
          fill="none"
          stroke={diagram.colors.primary}
          strokeWidth={2.5}
          initial="hidden"
          animate="visible"
          variants={lineDrawVariants}
        />
        {/* White background for readability */}
        <rect
          x={labelX - 28}
          y={labelY - 11}
          width={56}
          height={22}
          className="fill-white dark:fill-gray-800"
          stroke={diagram.colors.light}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={15}
          fontWeight="600"
          fill={diagram.colors.primary}
        >
          θ = {angle}°
        </text>
      </motion.g>
    )
  }

  // The object (block/crate) on the slope
  const renderObject = () => {
    const halfSize = objSize / 2
    const cos = Math.cos(-angleRad)
    const sin = Math.sin(-angleRad)

    // Rotated rectangle corners
    const corners = [
      { x: -halfSize, y: -halfSize },
      { x: halfSize, y: -halfSize },
      { x: halfSize, y: halfSize },
      { x: -halfSize, y: halfSize },
    ].map((c) => ({
      x: objectCenter.x + c.x * cos - c.y * sin,
      y: objectCenter.y + c.x * sin + c.y * cos,
    }))

    const pathD = `M ${corners.map((c) => `${c.x},${c.y}`).join(' L ')} Z`

    return (
      <motion.g
        data-testid="ip-object"
        className="object-block"
        initial="hidden"
        animate={isCurrent('object') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        {/* Shadow */}
        <motion.path
          d={pathD}
          fill="#00000015"
          transform="translate(3, 3)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        />
        {/* Block */}
        <motion.path
          d={pathD}
          fill={object.color || '#e5e7eb'}
          stroke="currentColor"
          strokeWidth={diagram.lineWeight}
          initial="hidden"
          animate="visible"
          variants={lineDrawVariants}
        />
        {/* Label inside block */}
        {object.label && (
          <motion.text
            x={objectCenter.x}
            y={objectCenter.y - (object.mass ? 6 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={18}
            fontWeight="bold"
            className="fill-current"
            transform={`rotate(${-angle}, ${objectCenter.x}, ${objectCenter.y - (object.mass ? 6 : 0)})`}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
            transition={{ delay: 0.3 }}
          >
            {object.label}
          </motion.text>
        )}
        {object.mass && (
          <motion.text
            x={objectCenter.x}
            y={objectCenter.y + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            className="fill-gray-500 dark:fill-gray-400"
            transform={`rotate(${-angle}, ${objectCenter.x}, ${objectCenter.y + 10})`}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
            transition={{ delay: 0.4 }}
          >
            {object.mass} kg
          </motion.text>
        )}
      </motion.g>
    )
  }

  // Single force rendering helper
  const renderForce = (force: typeof forces[0], isHighlighted: boolean) => {
    const forceScale = 1.8
    const arrowSize = 10
    const mag = (force.magnitude ?? 0) * forceScale
    const forceAngleRad = ((force.angle ?? 0) * Math.PI) / 180

    // Determine force origin based on type
    let origin = { ...objectCenter }
    const halfSize = objSize / 2

    if (force.type === 'normal') {
      origin = {
        x: objectOnSlope.x,
        y: objectOnSlope.y,
      }
    } else if (force.type === 'friction') {
      origin = {
        x: objectOnSlope.x + halfSize * Math.cos(angleRad) * 0.5,
        y: objectOnSlope.y - halfSize * Math.sin(angleRad) * 0.5,
      }
    } else if (force.type === 'weight') {
      origin = { ...objectCenter }
    }

    const endX = origin.x + mag * Math.cos(forceAngleRad)
    const endY = origin.y - mag * Math.sin(forceAngleRad)

    // Arrow head
    const arrowAngle = Math.atan2(origin.y - endY, endX - origin.x)
    const arrow1 = {
      x: endX - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
      y: endY + arrowSize * Math.sin(arrowAngle - Math.PI / 6),
    }
    const arrow2 = {
      x: endX - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
      y: endY + arrowSize * Math.sin(arrowAngle + Math.PI / 6),
    }

    // Force color - use theme accent for non-semantic colors
    const color = force.color || PHYSICS_FORCE_COLORS[force.type] || diagram.colors.accent

    // Label position - offset from arrow tip
    const labelOffset = 18
    const labelX = endX + labelOffset * Math.cos(forceAngleRad)
    const labelY = endY - labelOffset * Math.sin(forceAngleRad)

    return (
      <g key={force.name} className={`force-${force.type}`}>
        {/* Force arrow line */}
        <motion.line
          x1={origin.x}
          y1={origin.y}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth={diagram.lineWeight + 0.5}
          strokeLinecap="round"
          initial="hidden"
          animate="visible"
          variants={arrowVariants}
        />
        {/* Arrow head */}
        <motion.polygon
          points={`${endX},${endY} ${arrow1.x},${arrow1.y} ${arrow2.x},${arrow2.y}`}
          fill={color}
          initial="hidden"
          animate="visible"
          variants={arrowheadVariants}
        />
        {/* Label with background */}
        <motion.g
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.5 }}
        >
          <rect
            x={labelX - 14}
            y={labelY - 10}
            width={28}
            height={20}
            className="fill-white dark:fill-gray-800"
            stroke={color}
            strokeWidth={1}
            rx={3}
            opacity={0.95}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight="bold"
            fill={color}
          >
            {force.symbol || force.name.charAt(0).toUpperCase()}
            {force.subscript && (
              <tspan fontSize={10} dy={3}>
                {force.subscript}
              </tspan>
            )}
          </text>
        </motion.g>
      </g>
    )
  }

  // Coordinate axes - in top-right corner, small and unobtrusive
  const renderAxes = () => {
    if (coordinateSystem === 'none') return null

    const axisOrigin = { x: width - 70, y: 50 }
    const axisLength = 35
    const rotation = coordinateSystem === 'inclined' ? -angle : 0

    return (
      <motion.g
        data-testid="ip-axes"
        className="coordinate-axes"
        transform={`rotate(${rotation}, ${axisOrigin.x}, ${axisOrigin.y})`}
        opacity={0.6}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.3 }}
      >
        {/* Background */}
        <rect
          x={axisOrigin.x - 10}
          y={axisOrigin.y - axisLength - 15}
          width={axisLength + 30}
          height={axisLength + 25}
          className="fill-white dark:fill-gray-800"
          stroke={diagram.colors.light}
          strokeWidth={1}
          rx={4}
        />
        {/* X-axis */}
        <line
          x1={axisOrigin.x}
          y1={axisOrigin.y}
          x2={axisOrigin.x + axisLength}
          y2={axisOrigin.y}
          stroke={diagram.colors.primary}
          strokeWidth={2}
          markerEnd="url(#ip-axis-arrow)"
        />
        <text
          x={axisOrigin.x + axisLength + 8}
          y={axisOrigin.y}
          fontSize={12}
          fontWeight="600"
          fill={diagram.colors.primary}
          dominantBaseline="middle"
        >
          x
        </text>
        {/* Y-axis */}
        <line
          x1={axisOrigin.x}
          y1={axisOrigin.y}
          x2={axisOrigin.x}
          y2={axisOrigin.y - axisLength}
          stroke={diagram.colors.primary}
          strokeWidth={2}
          markerEnd="url(#ip-axis-arrow)"
        />
        <text
          x={axisOrigin.x}
          y={axisOrigin.y - axisLength - 8}
          fontSize={12}
          fontWeight="600"
          fill={diagram.colors.primary}
          textAnchor="middle"
        >
          y
        </text>
      </motion.g>
    )
  }

  // Force decomposition (if enabled)
  const renderDecomposition = () => {
    const weightForce = forces.find((f) => f.type === 'weight')
    if (!weightForce) return null

    const mag = (weightForce.magnitude ?? 0) * 1.5
    const parallelMag = mag * Math.sin(angleRad)
    const perpMag = mag * Math.cos(angleRad)

    // Parallel component (down the slope)
    const parallelAngle = -90 + angle
    const parallelRad = (parallelAngle * Math.PI) / 180
    const pEndX = objectCenter.x + parallelMag * Math.cos(parallelRad)
    const pEndY = objectCenter.y - parallelMag * Math.sin(parallelRad)

    // Perpendicular component (into slope)
    const perpAngle = -angle
    const perpRad = (perpAngle * Math.PI) / 180
    const perpEndX = objectCenter.x + perpMag * Math.cos(perpRad)
    const perpEndY = objectCenter.y - perpMag * Math.sin(perpRad)

    const weightColor = PHYSICS_FORCE_COLORS.weight

    return (
      <motion.g
        data-testid="ip-decomposition"
        className="decomposition"
        initial="hidden"
        animate={isCurrent('components') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        {/* Parallel component */}
        <motion.line
          x1={objectCenter.x}
          y1={objectCenter.y}
          x2={pEndX}
          y2={pEndY}
          stroke={weightColor}
          strokeWidth={diagram.lineWeight}
          strokeDasharray="5 3"
          initial="hidden"
          animate="visible"
          variants={lineDrawVariants}
        />
        <motion.text
          x={pEndX + 10}
          y={pEndY}
          fontSize={12}
          fill={weightColor}
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.3 }}
        >
          W∥
        </motion.text>

        {/* Perpendicular component */}
        <motion.line
          x1={objectCenter.x}
          y1={objectCenter.y}
          x2={perpEndX}
          y2={perpEndY}
          stroke={weightColor}
          strokeWidth={diagram.lineWeight}
          strokeDasharray="5 3"
          initial="hidden"
          animate="visible"
          variants={lineDrawVariants}
          transition={{ delay: 0.15 }}
        />
        <motion.text
          x={perpEndX}
          y={perpEndY - 10}
          fontSize={12}
          fill={weightColor}
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.45 }}
        >
          W⊥
        </motion.text>
      </motion.g>
    )
  }

  // Step info display
  const renderStepInfo = () => {
    const label = language === 'he' ? currentStepConfig.stepLabelHe : currentStepConfig.stepLabel

    return (
      <g className="step-info">
        {label && (
          <text
            x={width - 15}
            y={height - 15}
            textAnchor="end"
            fontSize={12}
            className="fill-gray-500 dark:fill-gray-400"
            fontStyle="italic"
          >
            {label}
          </text>
        )}
        {currentStepConfig.showCalculation && (
          <text
            x={width / 2}
            y={height - 15}
            textAnchor="middle"
            fontSize={13}
            className="fill-current"
            fontWeight="500"
          >
            {currentStepConfig.showCalculation}
          </text>
        )}
      </g>
    )
  }

  return (
    <div
      data-testid="inclined-plane"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Inclined plane at ${angle} degrees${object.mass ? ` with ${object.mass}kg object` : ''}`}
      >
        {/* Definitions */}
        <defs>
          <marker
            id="ip-axis-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 Z" fill={diagram.colors.primary} />
          </marker>
        </defs>

        {/* Background */}
        <rect
          data-testid="ip-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            x={width / 2}
            y={28}
            textAnchor="middle"
            fontSize={16}
            fontWeight="bold"
            className="fill-current"
          >
            {title}
          </text>
        )}

        {/* Friction coefficient - top left */}
        {frictionCoefficient !== undefined && (
          <text x={15} y={28} fontSize={14} fontWeight="500" className="fill-gray-600 dark:fill-gray-300">
            μ = {frictionCoefficient}
          </text>
        )}

        {/* ---- Step 0: Draw the plane ---- */}
        <AnimatePresence>
          {isVisible('plane') && renderPlane()}
        </AnimatePresence>

        {/* Angle indicator (part of plane step) */}
        <AnimatePresence>
          {isVisible('plane') && renderAngle()}
        </AnimatePresence>

        {/* Coordinate axes (part of plane step) */}
        <AnimatePresence>
          {isVisible('plane') && renderAxes()}
        </AnimatePresence>

        {/* ---- Step 1: Place the object ---- */}
        <AnimatePresence>
          {isVisible('object') && renderObject()}
        </AnimatePresence>

        {/* ---- Step 2: Show weight force ---- */}
        <AnimatePresence>
          {hasWeight && isVisible('weight') && (
            <motion.g
              data-testid="ip-weight"
              initial="hidden"
              animate={isCurrent('weight') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {forces
                .filter((f) => f.type === 'weight')
                .map((force) => renderForce(force, isCurrent('weight')))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 3: Show normal force ---- */}
        <AnimatePresence>
          {hasNormal && isVisible('normal') && (
            <motion.g
              data-testid="ip-normal"
              initial="hidden"
              animate={isCurrent('normal') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {forces
                .filter((f) => f.type === 'normal')
                .map((force) => renderForce(force, isCurrent('normal')))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 4: Show friction force ---- */}
        <AnimatePresence>
          {hasFriction && isVisible('friction') && (
            <motion.g
              data-testid="ip-friction"
              initial="hidden"
              animate={isCurrent('friction') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {forces
                .filter((f) => f.type === 'friction')
                .map((force) => renderForce(force, isCurrent('friction')))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 5: Show force components (decomposition) ---- */}
        <AnimatePresence>
          {hasComponents && isVisible('components') && currentStepConfig.showComponents !== false && (
            renderDecomposition()
          )}
        </AnimatePresence>

        {/* ---- Step 6: Show equations/calculations ---- */}
        <AnimatePresence>
          {isVisible('equations') && renderStepInfo()}
        </AnimatePresence>
      </svg>

      {/* Step Controls */}
      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={effectiveStep}
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

export default InclinedPlane
