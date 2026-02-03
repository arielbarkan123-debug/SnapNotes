'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  type InclinedPlaneData,
  type DiagramStepConfig,
  type Force,
  FORCE_COLORS,
} from '@/types/physics'
import { ForceVector } from './ForceVector'

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
 * InclinedPlane - SVG component for inclined plane physics diagrams
 *
 * Features:
 * - Inclined surface with configurable angle
 * - Object on the slope
 * - Progressive force vector reveal
 * - Force decomposition into parallel/perpendicular components
 * - Angle arc and measurement display
 * - Friction indication on surface
 */
export function InclinedPlane({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete,
  animationDuration = 400,
  width = 450,
  height = 350,
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

  // Defensive defaults for missing data
  const object = rawObject || {
    type: 'block' as const,
    position: { x: 0, y: 0 },
    mass: undefined,
    label: undefined,
    color: '#f3f4f6',
  }
  const forces = rawForces || []

  const [animatingForces, setAnimatingForces] = useState<Set<string>>(new Set())

  // SVG geometry calculations - improved spacing
  const padding = { left: 60, right: 40, top: 50, bottom: 60 }
  const planeLength = width - padding.left - padding.right - 20
  const angleRad = (angle * Math.PI) / 180

  // Calculate plane vertices - start more to the left for angle label space
  const planeStart = { x: padding.left + 30, y: height - padding.bottom }
  const planeEnd = {
    x: planeStart.x + planeLength * Math.cos(angleRad),
    y: planeStart.y - planeLength * Math.sin(angleRad),
  }

  // Object position (somewhere on the slope) - moved up slightly
  const objectPosition = 0.45 // 0 = bottom, 1 = top
  const objectOnPlane = {
    x: planeStart.x + planeLength * objectPosition * Math.cos(angleRad),
    y: planeStart.y - planeLength * objectPosition * Math.sin(angleRad),
  }

  // Object size - slightly smaller for better fit
  const objSize = 40

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

  // Calculate highlighted forces
  const highlightedForces = useMemo(() => {
    return new Set(currentStepConfig.highlightForces || [])
  }, [currentStepConfig])

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

  // Render the inclined plane surface
  const renderPlane = () => {
    // Ground line
    const groundY = height - padding.bottom

    return (
      <g className="inclined-plane-surface">
        {/* Ground */}
        <line
          x1={padding.left - 10}
          y1={groundY}
          x2={width - padding.right + 10}
          y2={groundY}
          stroke="#6b7280"
          strokeWidth={2}
        />

        {/* Ground hatching (indicates fixed surface) */}
        {Array.from({ length: Math.floor((width - padding.left) / 15) }).map((_, i) => (
          <line
            key={i}
            x1={padding.left + i * 15}
            y1={groundY}
            x2={padding.left + i * 15 + 8}
            y2={groundY + 8}
            stroke="#9ca3af"
            strokeWidth={1}
          />
        ))}

        {/* Inclined surface */}
        <line
          x1={planeStart.x}
          y1={planeStart.y}
          x2={planeEnd.x}
          y2={planeEnd.y}
          stroke="#374151"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Surface roughness indication (if friction) */}
        {(frictionCoefficient || surface?.hasRoughness) && (
          <g className="surface-roughness">
            {Array.from({ length: 8 }).map((_, i) => {
              const t = (i + 1) / 9
              const x = planeStart.x + (planeEnd.x - planeStart.x) * t
              const y = planeStart.y + (planeEnd.y - planeStart.y) * t
              const perpX = Math.sin(angleRad) * 4
              const perpY = Math.cos(angleRad) * 4
              return (
                <line
                  key={i}
                  x1={x - perpX}
                  y1={y - perpY}
                  x2={x + perpX}
                  y2={y + perpY}
                  stroke="#9ca3af"
                  strokeWidth={1}
                />
              )
            })}
          </g>
        )}

        {/* Vertical support line */}
        <line
          x1={planeEnd.x}
          y1={planeEnd.y}
          x2={planeEnd.x}
          y2={groundY}
          stroke="#6b7280"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      </g>
    )
  }

  // Render angle arc and label
  const renderAngle = () => {
    if (!showAngleLabel) return null

    const arcRadius = 50
    const arcX = planeStart.x + arcRadius
    const arcY = planeStart.y

    // Arc path
    const endAngle = -angleRad
    const arcEndX = planeStart.x + arcRadius * Math.cos(endAngle)
    const arcEndY = planeStart.y + arcRadius * Math.sin(endAngle)

    const arcPath = `M ${arcX} ${arcY} A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`

    // Label position - further out and with background for visibility
    const labelAngle = -angleRad / 2
    const labelRadius = arcRadius + 25
    const labelX = planeStart.x + labelRadius * Math.cos(labelAngle)
    const labelY = planeStart.y + labelRadius * Math.sin(labelAngle)

    return (
      <g className="angle-indicator">
        <path
          d={arcPath}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
        />
        {/* Background for label readability */}
        <rect
          x={labelX - 30}
          y={labelY - 10}
          width={60}
          height={20}
          fill="white"
          rx={4}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight="600"
          fill="#4f46e5"
        >
          θ = {angle}°
        </text>
      </g>
    )
  }

  // Render the object on the plane
  const renderObject = () => {
    // Object center (offset perpendicular to plane surface)
    const perpOffset = objSize / 2 + 2
    const centerX = objectOnPlane.x + perpOffset * Math.sin(angleRad)
    const centerY = objectOnPlane.y - perpOffset * Math.cos(angleRad)

    // Rotated rectangle for block
    const halfWidth = objSize / 2
    const halfHeight = objSize / 2

    // Calculate rotated corners
    const cos = Math.cos(-angleRad)
    const sin = Math.sin(-angleRad)

    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ].map((c) => ({
      x: centerX + c.x * cos - c.y * sin,
      y: centerY + c.x * sin + c.y * cos,
    }))

    const pathD = `M ${corners.map((c) => `${c.x},${c.y}`).join(' L ')} Z`

    return (
      <g className="physics-object">
        <path
          d={pathD}
          fill={object.color || '#f3f4f6'}
          stroke="#374151"
          strokeWidth={2}
        />
        {object.label && (
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={16}
            fontWeight="bold"
            fill="#374151"
            transform={`rotate(${-angle}, ${centerX}, ${centerY})`}
          >
            {object.label}
          </text>
        )}
        {object.mass && (
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="#6b7280"
            transform={`rotate(${-angle}, ${centerX}, ${centerY + 15})`}
          >
            m = {object.mass} kg
          </text>
        )}
      </g>
    )
  }

  // Calculate force origin for inclined plane
  const getForceOrigin = (_force: Force): { x: number; y: number } => {
    // Note: _force param reserved for future per-force positioning
    const perpOffset = objSize / 2 + 2
    const centerX = objectOnPlane.x + perpOffset * Math.sin(angleRad)
    const centerY = objectOnPlane.y - perpOffset * Math.cos(angleRad)

    return { x: centerX, y: centerY }
  }

  // Render force decomposition components
  const renderDecomposition = () => {
    if (!showDecomposition || !currentStepConfig.showComponents) return null

    const origin = getForceOrigin(forces[0])
    const components: JSX.Element[] = []

    visibleForces.forEach((force) => {
      if (force.type === 'weight' && force.components) {
        // Weight parallel component (along slope)
        const parallelAngle = -90 + angle // Down the slope
        const parallelMag = force.magnitude * Math.sin(angleRad)

        components.push(
          <ForceVector
            key={`${force.name}-parallel`}
            force={{
              name: `${force.name}_parallel`,
              type: 'component',
              magnitude: parallelMag,
              angle: parallelAngle,
              symbol: 'W',
              subscript: '∥',
              color: FORCE_COLORS.weight,
            }}
            origin={origin}
            scale={2.5}
            highlighted={highlightedForces.has(force.name)}
            animation="fade"
            strokeWidth={2}
          />
        )

        // Weight perpendicular component (into slope)
        const perpAngle = -angle // Into the slope
        const perpMag = force.magnitude * Math.cos(angleRad)

        components.push(
          <ForceVector
            key={`${force.name}-perp`}
            force={{
              name: `${force.name}_perp`,
              type: 'component',
              magnitude: perpMag,
              angle: perpAngle,
              symbol: 'W',
              subscript: '⊥',
              color: FORCE_COLORS.weight,
            }}
            origin={origin}
            scale={2.5}
            highlighted={highlightedForces.has(force.name)}
            animation="fade"
            strokeWidth={2}
          />
        )
      }
    })

    return <g className="force-decomposition">{components}</g>
  }

  // Render coordinate axes (optional rotated system) - positioned to the side
  const renderAxes = () => {
    if (coordinateSystem === 'none') return null

    // Position axes to the right of the object, not overlapping
    const origin = getForceOrigin(forces[0] || { name: '', type: 'weight', magnitude: 0, angle: 0 })
    const axisLength = 40
    const rotation = coordinateSystem === 'inclined' ? -angle : 0

    // Offset axes to the right side of object
    const axisOriginX = origin.x + objSize + 15
    const axisOriginY = origin.y

    return (
      <g
        className="coordinate-axes"
        transform={`rotate(${rotation}, ${axisOriginX}, ${axisOriginY})`}
        opacity={0.7}
      >
        {/* X-axis */}
        <line
          x1={axisOriginX}
          y1={axisOriginY}
          x2={axisOriginX + axisLength}
          y2={axisOriginY}
          stroke="#6366f1"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={axisOriginX + axisLength + 10}
          y={axisOriginY}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight="500"
          fill="#4f46e5"
        >
          x
        </text>

        {/* Y-axis */}
        <line
          x1={axisOriginX}
          y1={axisOriginY}
          x2={axisOriginX}
          y2={axisOriginY - axisLength}
          stroke="#6366f1"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={axisOriginX}
          y={axisOriginY - axisLength - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight="500"
          fill="#4f46e5"
        >
          y
        </text>
      </g>
    )
  }

  // Render forces
  const renderForces = () => {
    return visibleForces.map((force) => {
      const isHighlighted = highlightedForces.has(force.name)
      const origin = getForceOrigin(force)

      return (
        <ForceVector
          key={force.name}
          force={force}
          origin={origin}
          scale={2.5}
          highlighted={isHighlighted}
          showLabel={true}
          showMagnitude={false}
          animation={animatingForces.has(force.name) ? 'fade' : 'none'}
          animationDuration={animationDuration}
        />
      )
    })
  }

  // Render step info
  const renderStepInfo = () => {
    const label = language === 'he'
      ? currentStepConfig.stepLabelHe
      : currentStepConfig.stepLabel

    return (
      <g className="step-info">
        {label && (
          <text
            x={width - 10}
            y={30}
            textAnchor="end"
            fontSize={13}
            fill="#4b5563"
            fontStyle="italic"
          >
            {label}
          </text>
        )}
        {currentStepConfig.showCalculation && (
          <text
            x={width - 10}
            y={50}
            textAnchor="end"
            fontSize={14}
            fill="#1f2937"
            fontWeight="500"
          >
            {currentStepConfig.showCalculation}
          </text>
        )}
        {/* Step counter */}
        <text
          x={10}
          y={height - 10}
          fontSize={11}
          fill="#9ca3af"
        >
          {language === 'he' ? `שלב ${currentStep}` : `Step ${currentStep}`}
        </text>
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
      {/* Background */}
      <rect width={width} height={height} fill="#ffffff" rx={8} />

      {/* Title */}
      {title && (
        <text
          x={width / 2}
          y={25}
          textAnchor="middle"
          fontSize={16}
          fontWeight="bold"
          fill="#1f2937"
        >
          {title}
        </text>
      )}

      {/* Inclined plane surface */}
      {renderPlane()}

      {/* Angle indicator */}
      {renderAngle()}

      {/* Coordinate axes */}
      {renderAxes()}

      {/* Object on plane */}
      {renderObject()}

      {/* Force vectors */}
      {renderForces()}

      {/* Force decomposition (if enabled) */}
      {renderDecomposition()}

      {/* Step information */}
      {renderStepInfo()}

      {/* Friction coefficient display */}
      {frictionCoefficient !== undefined && (
        <text
          x={10}
          y={30}
          fontSize={12}
          fill="#6b7280"
        >
          μ = {frictionCoefficient}
        </text>
      )}

      <style>
        {`
          .inclined-plane-diagram {
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
        `}
      </style>
    </svg>
  )
}

export default InclinedPlane
