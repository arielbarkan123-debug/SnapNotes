'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  type InclinedPlaneData,
  type DiagramStepConfig,
  FORCE_COLORS,
} from '@/types/physics'

interface InclinedPlaneProps {
  data: InclinedPlaneData
  /** Current step to display */
  currentStep?: number
  /** Step configuration for progressive reveal */
  stepConfig?: DiagramStepConfig[]
  /** Callback when step animation completes */
  onStepComplete?: () => void
  /** Animation duration in ms */
  animationDuration?: number
  /** Width of the SVG */
  width?: number
  /** Height of the SVG */
  height?: number
  /** Additional className */
  className?: string
  /** Language for labels */
  language?: 'en' | 'he'
}

/**
 * InclinedPlane - Professional SVG component for inclined plane physics diagrams
 *
 * Features:
 * - Clear, well-spaced layout
 * - Large, visible object on slope
 * - Non-overlapping force vectors with proper origins
 * - Clean angle indicator
 * - Coordinate axes in corner (not overlapping)
 */
export function InclinedPlane({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete,
  animationDuration = 400,
  width = 500,
  height = 380,
  className = '',
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

  const [animatingForces, setAnimatingForces] = useState<Set<string>>(new Set())

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
    y: groundY
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

  // Get current step configuration
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > currentStep) {
      return stepConfig[currentStep]
    }
    return {
      step: currentStep,
      visibleForces: forces.slice(0, currentStep).map((f) => f.name),
    }
  }, [currentStep, stepConfig, forces])

  // Calculate which forces should be visible
  const visibleForces = useMemo(() => {
    if (currentStepConfig.visibleForces) {
      return forces.filter((f) => currentStepConfig.visibleForces?.includes(f.name))
    }
    return forces.slice(0, currentStep)
  }, [forces, currentStep, currentStepConfig])

  // Handle animation completion
  useEffect(() => {
    if (animatingForces.size > 0) {
      const timer = setTimeout(() => {
        setAnimatingForces(new Set())
        onStepComplete?.()
      }, animationDuration)
      return () => clearTimeout(timer)
    }
  }, [animatingForces, animationDuration, onStepComplete])

  // === RENDER FUNCTIONS ===

  // Ground and inclined surface
  const renderPlane = () => (
    <g className="plane-surface">
      {/* Ground line */}
      <line
        x1={margin.left}
        y1={groundY}
        x2={width - margin.right}
        y2={groundY}
        stroke="#374151"
        strokeWidth={2}
      />

      {/* Ground hatching */}
      {Array.from({ length: Math.floor((width - margin.left - margin.right) / 12) }).map((_, i) => (
        <line
          key={i}
          x1={margin.left + i * 12}
          y1={groundY}
          x2={margin.left + i * 12 + 6}
          y2={groundY + 6}
          stroke="#9ca3af"
          strokeWidth={1}
        />
      ))}

      {/* Inclined surface - thick and prominent */}
      <line
        x1={planeStart.x}
        y1={planeStart.y}
        x2={planeEnd.x}
        y2={planeEnd.y}
        stroke="#1f2937"
        strokeWidth={4}
        strokeLinecap="round"
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
              <line
                key={i}
                x1={x - perpX}
                y1={y - perpY}
                x2={x + perpX}
                y2={y + perpY}
                stroke="#6b7280"
                strokeWidth={1.5}
              />
            )
          })}
        </g>
      )}

      {/* Vertical support (dashed) */}
      <line
        x1={planeEnd.x}
        y1={planeEnd.y}
        x2={planeEnd.x}
        y2={groundY}
        stroke="#9ca3af"
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />
    </g>
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
      <g className="angle-indicator">
        <path
          d={arcPath}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2.5}
        />
        {/* White background for readability */}
        <rect
          x={labelX - 28}
          y={labelY - 11}
          width={56}
          height={22}
          fill="white"
          stroke="#e5e7eb"
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
          fill="#4f46e5"
        >
          θ = {angle}°
        </text>
      </g>
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
      <g className="object-block">
        {/* Shadow */}
        <path
          d={pathD}
          fill="#00000015"
          transform="translate(3, 3)"
        />
        {/* Block */}
        <path
          d={pathD}
          fill={object.color || '#e5e7eb'}
          stroke="#374151"
          strokeWidth={2.5}
        />
        {/* Label inside block */}
        {object.label && (
          <text
            x={objectCenter.x}
            y={objectCenter.y - (object.mass ? 6 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={18}
            fontWeight="bold"
            fill="#1f2937"
            transform={`rotate(${-angle}, ${objectCenter.x}, ${objectCenter.y - (object.mass ? 6 : 0)})`}
          >
            {object.label}
          </text>
        )}
        {object.mass && (
          <text
            x={objectCenter.x}
            y={objectCenter.y + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="#4b5563"
            transform={`rotate(${-angle}, ${objectCenter.x}, ${objectCenter.y + 10})`}
          >
            {object.mass} kg
          </text>
        )}
      </g>
    )
  }

  // Force vectors - each with proper origin based on force type
  const renderForces = () => {
    const forceScale = 1.8
    const arrowSize = 10

    return visibleForces.map((force) => {
      const mag = (force.magnitude ?? 0) * forceScale
      const forceAngleRad = ((force.angle ?? 0) * Math.PI) / 180

      // Determine force origin based on type
      let origin = { ...objectCenter }
      const halfSize = objSize / 2

      if (force.type === 'normal') {
        // Normal force: from center of bottom surface (touching slope)
        origin = {
          x: objectOnSlope.x,
          y: objectOnSlope.y,
        }
      } else if (force.type === 'friction') {
        // Friction: from bottom-front of object along slope
        origin = {
          x: objectOnSlope.x + halfSize * Math.cos(angleRad) * 0.5,
          y: objectOnSlope.y - halfSize * Math.sin(angleRad) * 0.5,
        }
      } else if (force.type === 'weight') {
        // Weight: from center of object
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

      // Force color
      const color = force.color || FORCE_COLORS[force.type] || '#3b82f6'

      // Label position - offset from arrow tip
      const labelOffset = 18
      const labelX = endX + labelOffset * Math.cos(forceAngleRad)
      const labelY = endY - labelOffset * Math.sin(forceAngleRad)

      return (
        <g key={force.name} className={`force-${force.type}`}>
          {/* Force arrow line */}
          <line
            x1={origin.x}
            y1={origin.y}
            x2={endX}
            y2={endY}
            stroke={color}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          {/* Arrow head */}
          <polygon
            points={`${endX},${endY} ${arrow1.x},${arrow1.y} ${arrow2.x},${arrow2.y}`}
            fill={color}
          />
          {/* Label with background */}
          <rect
            x={labelX - 14}
            y={labelY - 10}
            width={28}
            height={20}
            fill="white"
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
              <tspan fontSize={10} dy={3}>{force.subscript}</tspan>
            )}
          </text>
        </g>
      )
    })
  }

  // Coordinate axes - in top-right corner, small and unobtrusive
  const renderAxes = () => {
    if (coordinateSystem === 'none') return null

    const axisOrigin = { x: width - 70, y: 50 }
    const axisLength = 35
    const rotation = coordinateSystem === 'inclined' ? -angle : 0

    return (
      <g
        className="coordinate-axes"
        transform={`rotate(${rotation}, ${axisOrigin.x}, ${axisOrigin.y})`}
        opacity={0.6}
      >
        {/* Background */}
        <rect
          x={axisOrigin.x - 10}
          y={axisOrigin.y - axisLength - 15}
          width={axisLength + 30}
          height={axisLength + 25}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth={1}
          rx={4}
        />
        {/* X-axis */}
        <line
          x1={axisOrigin.x}
          y1={axisOrigin.y}
          x2={axisOrigin.x + axisLength}
          y2={axisOrigin.y}
          stroke="#6366f1"
          strokeWidth={2}
          markerEnd="url(#axis-arrow)"
        />
        <text
          x={axisOrigin.x + axisLength + 8}
          y={axisOrigin.y}
          fontSize={12}
          fontWeight="600"
          fill="#4f46e5"
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
          stroke="#6366f1"
          strokeWidth={2}
          markerEnd="url(#axis-arrow)"
        />
        <text
          x={axisOrigin.x}
          y={axisOrigin.y - axisLength - 8}
          fontSize={12}
          fontWeight="600"
          fill="#4f46e5"
          textAnchor="middle"
        >
          y
        </text>
      </g>
    )
  }

  // Force decomposition (if enabled)
  const renderDecomposition = () => {
    if (!showDecomposition || !currentStepConfig.showComponents) return null

    const components: JSX.Element[] = []

    visibleForces.forEach((force) => {
      if (force.type === 'weight' && force.components) {
        const mag = (force.magnitude ?? 0) * 1.5
        const parallelMag = mag * Math.sin(angleRad)
        const perpMag = mag * Math.cos(angleRad)

        // Parallel component (down the slope)
        const parallelAngle = -90 + angle
        const parallelRad = (parallelAngle * Math.PI) / 180
        const pEndX = objectCenter.x + parallelMag * Math.cos(parallelRad)
        const pEndY = objectCenter.y - parallelMag * Math.sin(parallelRad)

        components.push(
          <g key="parallel">
            <line
              x1={objectCenter.x}
              y1={objectCenter.y}
              x2={pEndX}
              y2={pEndY}
              stroke={FORCE_COLORS.weight}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <text x={pEndX + 10} y={pEndY} fontSize={12} fill={FORCE_COLORS.weight}>
              W∥
            </text>
          </g>
        )

        // Perpendicular component (into slope)
        const perpAngle = -angle
        const perpRad = (perpAngle * Math.PI) / 180
        const perpEndX = objectCenter.x + perpMag * Math.cos(perpRad)
        const perpEndY = objectCenter.y - perpMag * Math.sin(perpRad)

        components.push(
          <g key="perpendicular">
            <line
              x1={objectCenter.x}
              y1={objectCenter.y}
              x2={perpEndX}
              y2={perpEndY}
              stroke={FORCE_COLORS.weight}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <text x={perpEndX} y={perpEndY - 10} fontSize={12} fill={FORCE_COLORS.weight}>
              W⊥
            </text>
          </g>
        )
      }
    })

    return <g className="decomposition">{components}</g>
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
            fill="#6b7280"
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
            fill="#1f2937"
            fontWeight="500"
          >
            {currentStepConfig.showCalculation}
          </text>
        )}
      </g>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`inclined-plane-diagram ${className}`}
      style={{ backgroundColor: '#ffffff', borderRadius: '8px' }}
    >
      {/* Definitions */}
      <defs>
        <marker
          id="axis-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 Z" fill="#6366f1" />
        </marker>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="#ffffff" rx={8} />

      {/* Title */}
      {title && (
        <text
          x={width / 2}
          y={28}
          textAnchor="middle"
          fontSize={16}
          fontWeight="bold"
          fill="#1f2937"
        >
          {title}
        </text>
      )}

      {/* Friction coefficient - top left */}
      {frictionCoefficient !== undefined && (
        <text x={15} y={28} fontSize={14} fontWeight="500" fill="#4b5563">
          μ = {frictionCoefficient}
        </text>
      )}

      {/* Render order matters for layering */}
      {renderPlane()}
      {renderAngle()}
      {renderAxes()}
      {renderObject()}
      {renderForces()}
      {renderDecomposition()}
      {renderStepInfo()}
    </svg>
  )
}

export default InclinedPlane
