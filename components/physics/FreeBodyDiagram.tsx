'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useAnimation, Variants } from 'framer-motion'
import {
  FreeBodyDiagramData,
  DiagramStepConfig,
  Force,
} from '@/types/physics'
import { ForceVector } from './ForceVector'
import {
  COLORS,
  SHADOWS,
  hexToRgba,
} from '@/lib/diagram-theme'
import {
  createForceAnimationSequence,
  prefersReducedMotion,
} from '@/lib/diagram-animations'

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
 * FreeBodyDiagram - Enhanced SVG component with choreographed animations
 *
 * Features:
 * - Framer Motion for smooth, choreographed animations
 * - Progressive force reveal with educational sequencing
 * - Object fade-in before forces appear
 * - Forces animate in order: weight → normal → friction → tension → net
 * - Professional visual design with gradients and shadows
 * - Step-synced with tutor explanations
 * - Accessibility: respects prefers-reduced-motion
 */
export function FreeBodyDiagram({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete,
  animationDuration = 500,
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

  const _controls = useAnimation()
  const reducedMotion = prefersReducedMotion()
  const [completedAnimations, setCompletedAnimations] = useState<Set<string>>(new Set())
  const [isObjectVisible, setIsObjectVisible] = useState(currentStep > 0)

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

  // Calculate which forces should be visible based on step
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

  // Create choreographed animation sequence for forces
  const forceAnimationSequence = useMemo(() => {
    const forceNames = visibleForces.map((f) => f.type.toLowerCase())
    return createForceAnimationSequence(forceNames, reducedMotion ? 0 : animationDuration / 1000)
  }, [visibleForces, animationDuration, reducedMotion])

  // Calculate animation delay for each force (choreographed)
  const getForceDelay = useCallback(
    (force: Force): number => {
      const type = force.type.toLowerCase()
      const sequence = forceAnimationSequence.get(type)
      // Add base delay for object to appear first
      const objectDelay = reducedMotion ? 0 : 200
      return objectDelay + (sequence?.delay || 0) * 1000
    },
    [forceAnimationSequence, reducedMotion]
  )

  // Handle animation completion for choreography
  const handleForceAnimationComplete = useCallback(
    (forceName: string) => {
      setCompletedAnimations((prev) => {
        const next = new Set(prev)
        next.add(forceName)
        return next
      })

      // Check if all forces have completed
      if (completedAnimations.size + 1 >= visibleForces.length) {
        onStepComplete?.()
      }
    },
    [completedAnimations, visibleForces, onStepComplete]
  )

  // Trigger object visibility when step changes
  useEffect(() => {
    if (currentStep > 0 && !isObjectVisible) {
      setIsObjectVisible(true)
    }
  }, [currentStep, isObjectVisible])

  // Animation variants for the object
  const objectVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: reducedMotion ? 0 : 0.4,
      },
    },
  }

  // Render physics object with animation
  const renderObject = () => {
    const objSize = 50
    const objX = centerX - objSize / 2
    const objY = centerY - objSize / 2
    const gradientId = 'object-gradient'

    const objectContent = (() => {
      switch (object.type) {
        case 'block':
          return (
            <>
              {/* Shadow */}
              <rect
                x={objX + 3}
                y={objY + 3}
                width={object.width || objSize}
                height={object.height || objSize}
                fill="rgba(0,0,0,0.1)"
                rx={6}
              />
              {/* Main block with gradient */}
              <rect
                x={objX}
                y={objY}
                width={object.width || objSize}
                height={object.height || objSize}
                fill={`url(#${gradientId})`}
                stroke={COLORS.gray[400]}
                strokeWidth={2}
                rx={6}
              />
              {object.label && (
                <text
                  x={centerX}
                  y={centerY - (object.mass ? 5 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={16}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
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
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'sphere':
          return (
            <>
              {/* Shadow */}
              <ellipse
                cx={centerX + 3}
                cy={centerY + 5}
                rx={(object.radius || objSize / 2) * 0.9}
                ry={(object.radius || objSize / 2) * 0.5}
                fill="rgba(0,0,0,0.15)"
              />
              {/* Main sphere with gradient */}
              <circle
                cx={centerX}
                cy={centerY}
                r={object.radius || objSize / 2}
                fill={`url(#${gradientId})`}
                stroke={COLORS.gray[400]}
                strokeWidth={2}
              />
              {/* Highlight for 3D effect */}
              <ellipse
                cx={centerX - 8}
                cy={centerY - 8}
                rx={8}
                ry={6}
                fill="rgba(255,255,255,0.5)"
              />
              {object.label && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={16}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
            </>
          )

        case 'particle':
          return (
            <>
              <circle cx={centerX} cy={centerY} r={10} fill={COLORS.gray[600]} />
              <circle cx={centerX - 2} cy={centerY - 2} r={3} fill="rgba(255,255,255,0.4)" />
              {object.label && (
                <text
                  x={centerX + 18}
                  y={centerY - 12}
                  textAnchor="start"
                  fontSize={14}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
            </>
          )

        default:
          return (
            <rect
              x={objX}
              y={objY}
              width={objSize}
              height={objSize}
              fill={`url(#${gradientId})`}
              stroke={COLORS.gray[400]}
              strokeWidth={2}
              rx={4}
            />
          )
      }
    })()

    return (
      <motion.g
        className="physics-object"
        initial="hidden"
        animate={isObjectVisible ? 'visible' : 'hidden'}
        variants={objectVariants}
      >
        {objectContent}
      </motion.g>
    )
  }

  // Render coordinate axes with subtle styling
  const renderAxes = () => {
    if (coordinateSystem === 'none') return null

    const axisLength = 60
    const rotation = coordinateSystem === 'inclined' ? -referenceAngle : 0

    return (
      <motion.g
        className="coordinate-axes"
        transform={`rotate(${rotation}, ${centerX}, ${centerY})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: reducedMotion ? 0 : 0.1, duration: 0.3 }}
      >
        {/* X-axis */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + axisLength}
          y2={centerY}
          stroke={COLORS.gray[400]}
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <polygon
          points={`${centerX + axisLength},${centerY} ${centerX + axisLength - 7},${centerY - 4} ${centerX + axisLength - 7},${centerY + 4}`}
          fill={COLORS.gray[400]}
        />
        <text
          x={centerX + axisLength + 12}
          y={centerY}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={12}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight={500}
          fill={COLORS.gray[500]}
        >
          {coordinateSystem === 'inclined' ? 'x∥' : 'x'}
        </text>

        {/* Y-axis */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX}
          y2={centerY - axisLength}
          stroke={COLORS.gray[400]}
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <polygon
          points={`${centerX},${centerY - axisLength} ${centerX - 4},${centerY - axisLength + 7} ${centerX + 4},${centerY - axisLength + 7}`}
          fill={COLORS.gray[400]}
        />
        <text
          x={centerX}
          y={centerY - axisLength - 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight={500}
          fill={COLORS.gray[500]}
        >
          {coordinateSystem === 'inclined' ? 'y⊥' : 'y'}
        </text>
      </motion.g>
    )
  }

  // Calculate force origin points (from object surface)
  const getForceOrigin = (force: Force): { x: number; y: number } => {
    const objSize = 50
    const halfSize = objSize / 2
    const angleRad = (force.angle * Math.PI) / 180

    if (force.origin) {
      return {
        x: centerX + force.origin.x,
        y: centerY + force.origin.y,
      }
    }

    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    if (Math.abs(cos) > Math.abs(sin)) {
      return {
        x: centerX + (cos > 0 ? halfSize : -halfSize),
        y: centerY,
      }
    } else {
      return {
        x: centerX,
        y: centerY + (sin > 0 ? -halfSize : halfSize),
      }
    }
  }

  // Render forces with choreographed draw animations
  const renderForces = () => {
    const defaultScale = 2.5

    return (
      <AnimatePresence>
        {visibleForces.map((force) => {
          const isHighlighted = highlightedForces.has(force.name)
          const origin = getForceOrigin(force)
          const animDelay = getForceDelay(force)

          return (
            <ForceVector
              key={force.name}
              force={force}
              origin={origin}
              scale={forceScale * defaultScale}
              highlighted={isHighlighted}
              showLabel={true}
              showMagnitude={isHighlighted}
              showAngle={showAngles && isHighlighted}
              referenceAngle={referenceAngle}
              animation="draw"
              animationDuration={reducedMotion ? 0 : animationDuration}
              animationDelay={animDelay}
              useGradient={true}
              onAnimationComplete={() => handleForceAnimationComplete(force.name)}
            />
          )
        })}
      </AnimatePresence>
    )
  }

  // Render net force if enabled
  const renderNetForce = () => {
    if (!showNetForce || !currentStepConfig.showNetForce) return null

    let netX = 0
    let netY = 0

    visibleForces.forEach((force) => {
      const angleRad = (force.angle * Math.PI) / 180
      netX += force.magnitude * Math.cos(angleRad)
      netY += force.magnitude * Math.sin(angleRad)
    })

    const netMagnitude = Math.sqrt(netX * netX + netY * netY)
    const netAngle = (Math.atan2(netY, netX) * 180) / Math.PI

    if (netMagnitude < 0.01) return null

    const netForce: Force = {
      name: 'net',
      type: 'net',
      magnitude: netMagnitude,
      angle: netAngle,
      symbol: 'F',
      subscript: 'net',
    }

    // Net force appears after all other forces
    const netDelay = reducedMotion ? 0 : 200 + visibleForces.length * 250

    return (
      <ForceVector
        force={netForce}
        origin={{ x: centerX, y: centerY }}
        scale={forceScale * 2.5}
        highlighted={true}
        showLabel={true}
        showMagnitude={true}
        animation="draw"
        animationDuration={reducedMotion ? 0 : animationDuration}
        animationDelay={netDelay}
        useGradient={true}
      />
    )
  }

  // Render step label with animation
  const renderStepLabel = () => {
    const label =
      language === 'he' ? currentStepConfig.stepLabelHe : currentStepConfig.stepLabel

    if (!label && !currentStepConfig.showCalculation) return null

    return (
      <motion.g
        className="step-info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.3, duration: 0.3 }}
      >
        {/* Background card for step info */}
        {(label || currentStepConfig.showCalculation) && (
          <rect
            x={width - 170}
            y={height - 60}
            width={160}
            height={50}
            fill="white"
            stroke={COLORS.gray[200]}
            strokeWidth={1}
            rx={6}
            style={{ filter: SHADOWS.soft }}
          />
        )}
        {label && (
          <text
            x={width - 90}
            y={height - 40}
            textAnchor="middle"
            fontSize={12}
            fill={COLORS.gray[600]}
            fontFamily="'Inter', system-ui, sans-serif"
            fontStyle="italic"
          >
            {label}
          </text>
        )}
        {currentStepConfig.showCalculation && (
          <text
            x={width - 90}
            y={height - 22}
            textAnchor="middle"
            fontSize={13}
            fill={COLORS.primary[600]}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="500"
          >
            {currentStepConfig.showCalculation}
          </text>
        )}
      </motion.g>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`free-body-diagram ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Definitions */}
      <defs>
        {/* Object gradient */}
        <linearGradient id="object-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={object.color || COLORS.gray[100]} />
          <stop offset="100%" stopColor={object.color ? hexToRgba(object.color, 0.8) : COLORS.gray[200]} />
        </linearGradient>

        {/* Background gradient */}
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>

        {/* Subtle grid pattern */}
        <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke={COLORS.gray[100]}
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      {/* Background with subtle gradient */}
      <rect width={width} height={height} fill="url(#bg-gradient)" rx={12} />

      {/* Subtle grid */}
      <rect width={width} height={height} fill="url(#grid-pattern)" opacity={0.5} rx={12} />

      {/* Title */}
      {title && (
        <motion.text
          x={width / 2}
          y={28}
          textAnchor="middle"
          fontSize={16}
          fontWeight="600"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.gray[800]}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.text>
      )}

      {/* Coordinate axes (behind object) */}
      {renderAxes()}

      {/* Physics object */}
      {renderObject()}

      {/* Force vectors with choreographed animations */}
      {renderForces()}

      {/* Net force (if enabled) */}
      {renderNetForce()}

      {/* Step information */}
      {renderStepLabel()}

      {/* Step indicator with progress */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <rect
          x={8}
          y={height - 28}
          width={80}
          height={20}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={48}
          y={height - 15}
          textAnchor="middle"
          fontSize={11}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight={500}
          fill={COLORS.gray[500]}
        >
          {language === 'he' ? `שלב ${currentStep}` : `Step ${currentStep}`}
        </text>
      </motion.g>
    </svg>
  )
}

export default FreeBodyDiagram
