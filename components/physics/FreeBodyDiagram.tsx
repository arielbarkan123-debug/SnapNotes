'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  FreeBodyDiagramData,
  DiagramStepConfig,
  Force,
} from '@/types/physics'
import { ForceVector } from './ForceVector'

interface FreeBodyDiagramProps {
  data: FreeBodyDiagramData
  /** Current step to display (0 = base, 1+ = progressive force reveal) */
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
 * FreeBodyDiagram - SVG component for rendering free body diagrams
 *
 * Features:
 * - Renders object at center
 * - Progressive force reveal based on currentStep
 * - Smooth transitions between steps
 * - Optional force component decomposition
 * - Coordinate axes display
 * - Step-synced with tutor explanations
 */
export function FreeBodyDiagram({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete,
  animationDuration = 400,
  width = 400,
  height = 350,
  className = '',
  language = 'en',
}: FreeBodyDiagramProps) {
  const {
    object,
    forces,
    coordinateSystem = 'standard',
    showComponents: _showComponents = false,
    showNetForce = false,
    showAngles = false,
    title,
    referenceAngle = 0,
    forceScale = 1,
  } = data

  const [animatingForces, setAnimatingForces] = useState<Set<string>>(new Set())

  // Calculate center of diagram
  const centerX = width / 2
  const centerY = height / 2

  // Get current step configuration
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > currentStep) {
      return stepConfig[currentStep]
    }
    // Default: show all forces up to current step
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
    // If no step config, show forces progressively
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

  // Track newly visible forces for animation
  useEffect(() => {
    const newForces = visibleForces.filter((f) => !animatingForces.has(f.name))
    if (newForces.length > 0) {
      setAnimatingForces(new Set(newForces.map((f) => f.name)))
    }
  }, [visibleForces])

  // Render physics object
  const renderObject = () => {
    const objSize = 50
    const objX = centerX - objSize / 2
    const objY = centerY - objSize / 2

    switch (object.type) {
      case 'block':
        return (
          <g className="physics-object block">
            <rect
              x={objX}
              y={objY}
              width={object.width || objSize}
              height={object.height || objSize}
              fill={object.color || '#f3f4f6'}
              stroke="#374151"
              strokeWidth={2}
              rx={4}
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
                fontSize={12}
                fill="#6b7280"
              >
                m = {object.mass} kg
              </text>
            )}
          </g>
        )

      case 'sphere':
        return (
          <g className="physics-object sphere">
            <circle
              cx={centerX}
              cy={centerY}
              r={object.radius || objSize / 2}
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
              >
                {object.label}
              </text>
            )}
          </g>
        )

      case 'particle':
        return (
          <g className="physics-object particle">
            <circle
              cx={centerX}
              cy={centerY}
              r={8}
              fill="#374151"
            />
            {object.label && (
              <text
                x={centerX + 15}
                y={centerY - 10}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight="bold"
                fill="#374151"
              >
                {object.label}
              </text>
            )}
          </g>
        )

      default:
        return (
          <rect
            x={objX}
            y={objY}
            width={objSize}
            height={objSize}
            fill="#f3f4f6"
            stroke="#374151"
            strokeWidth={2}
          />
        )
    }
  }

  // Render coordinate axes
  const renderAxes = () => {
    if (coordinateSystem === 'none') return null

    const axisLength = 60
    const rotation = coordinateSystem === 'inclined' ? -referenceAngle : 0

    return (
      <g
        className="coordinate-axes"
        transform={`rotate(${rotation}, ${centerX}, ${centerY})`}
      >
        {/* X-axis */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + axisLength}
          y2={centerY}
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        <polygon
          points={`${centerX + axisLength},${centerY} ${centerX + axisLength - 6},${centerY - 4} ${centerX + axisLength - 6},${centerY + 4}`}
          fill="#9ca3af"
        />
        <text
          x={centerX + axisLength + 10}
          y={centerY}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={12}
          fill="#6b7280"
        >
          {coordinateSystem === 'inclined' ? 'x∥' : 'x'}
        </text>

        {/* Y-axis */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX}
          y2={centerY - axisLength}
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        <polygon
          points={`${centerX},${centerY - axisLength} ${centerX - 4},${centerY - axisLength + 6} ${centerX + 4},${centerY - axisLength + 6}`}
          fill="#9ca3af"
        />
        <text
          x={centerX}
          y={centerY - axisLength - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fill="#6b7280"
        >
          {coordinateSystem === 'inclined' ? 'y⊥' : 'y'}
        </text>
      </g>
    )
  }

  // Calculate force origin points (from object surface)
  const getForceOrigin = (force: Force): { x: number; y: number } => {
    const objSize = 50
    const halfSize = objSize / 2
    const angleRad = (force.angle * Math.PI) / 180

    // If force has custom origin, use it
    if (force.origin) {
      return {
        x: centerX + force.origin.x,
        y: centerY + force.origin.y,
      }
    }

    // Calculate origin based on force direction (arrow starts from object surface)
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    // Determine which surface the force originates from
    if (Math.abs(cos) > Math.abs(sin)) {
      // Horizontal direction dominant
      return {
        x: centerX + (cos > 0 ? halfSize : -halfSize),
        y: centerY,
      }
    } else {
      // Vertical direction dominant
      return {
        x: centerX,
        y: centerY + (sin > 0 ? -halfSize : halfSize),
      }
    }
  }

  // Render forces
  const renderForces = () => {
    const defaultScale = 2.5 // Pixels per Newton

    return visibleForces.map((force) => {
      const isAnimating = animatingForces.has(force.name)
      const isHighlighted = highlightedForces.has(force.name)
      const origin = getForceOrigin(force)

      return (
        <ForceVector
          key={force.name}
          force={force}
          origin={origin}
          scale={forceScale * defaultScale}
          highlighted={isHighlighted}
          showLabel={true}
          showMagnitude={false}
          showAngle={showAngles && isHighlighted}
          referenceAngle={referenceAngle}
          animation={isAnimating ? 'fade' : 'none'}
          animationDuration={animationDuration}
          opacity={isAnimating ? 1 : 1}
        />
      )
    })
  }

  // Render net force if enabled
  const renderNetForce = () => {
    if (!showNetForce || !currentStepConfig.showNetForce) return null

    // Calculate net force
    let netX = 0
    let netY = 0

    visibleForces.forEach((force) => {
      const angleRad = (force.angle * Math.PI) / 180
      netX += force.magnitude * Math.cos(angleRad)
      netY += force.magnitude * Math.sin(angleRad)
    })

    const netMagnitude = Math.sqrt(netX * netX + netY * netY)
    const netAngle = (Math.atan2(netY, netX) * 180) / Math.PI

    if (netMagnitude < 0.01) return null // Don't show if negligible

    const netForce: Force = {
      name: 'net',
      type: 'net',
      magnitude: netMagnitude,
      angle: netAngle,
      symbol: 'F',
      subscript: 'net',
    }

    return (
      <ForceVector
        force={netForce}
        origin={{ x: centerX, y: centerY }}
        scale={forceScale * 2.5}
        highlighted={true}
        showLabel={true}
        showMagnitude={true}
        animation="pulse"
      />
    )
  }

  // Render step label if provided
  const renderStepLabel = () => {
    const label = language === 'he'
      ? currentStepConfig.stepLabelHe
      : currentStepConfig.stepLabel

    if (!label && !currentStepConfig.showCalculation) return null

    return (
      <g className="step-info">
        {label && (
          <text
            x={width - 10}
            y={height - 30}
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
            y={height - 10}
            textAnchor="end"
            fontSize={14}
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
      className={`free-body-diagram ${className}`}
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

      {/* Coordinate axes (behind object) */}
      {renderAxes()}

      {/* Physics object */}
      {renderObject()}

      {/* Force vectors */}
      {renderForces()}

      {/* Net force (if enabled) */}
      {renderNetForce()}

      {/* Step information */}
      {renderStepLabel()}

      {/* Step indicator */}
      <text
        x={10}
        y={height - 10}
        fontSize={11}
        fill="#9ca3af"
      >
        {language === 'he' ? `שלב ${currentStep}` : `Step ${currentStep}`}
      </text>

      {/* Styles */}
      <style>
        {`
          .free-body-diagram {
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .physics-object rect,
          .physics-object circle {
            transition: all 0.2s ease-out;
          }

          .physics-object:hover rect,
          .physics-object:hover circle {
            fill: #e5e7eb;
          }
        `}
      </style>
    </svg>
  )
}

export default FreeBodyDiagram
