'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { type DiagramStepConfig, type Force } from '@/types/physics'
import { ForceVector } from './ForceVector'
import { COLORS, hexToRgba as _hexToRgba } from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface CircularMotionData {
  /** Radius of the circular path */
  radius: number
  /** Mass of the object */
  mass?: number
  /** Speed of the object */
  speed?: number
  /** Angular position in degrees (0 = right, counterclockwise positive) */
  angularPosition?: number
  /** Show velocity vector tangent to path */
  showVelocity?: boolean
  /** Show centripetal acceleration */
  showAcceleration?: boolean
  /** Show centripetal force */
  showCentripetalForce?: boolean
  /** Show angular velocity */
  showAngularVelocity?: boolean
  /** Forces acting on the object */
  forces?: Force[]
  /** Type: horizontal (turntable), vertical (ferris wheel), banked (car) */
  type?: 'horizontal' | 'vertical' | 'banked'
  /** Bank angle for banked curves */
  bankAngle?: number
  /** Title */
  title?: string
  /** Object label */
  objectLabel?: string
}

interface CircularMotionProps {
  data: CircularMotionData
  currentStep?: number
  stepConfig?: DiagramStepConfig[]
  onStepComplete?: () => void
  animationDuration?: number
  width?: number
  height?: number
  className?: string
  language?: 'en' | 'he'
}

/**
 * CircularMotion - SVG component for circular motion diagrams
 * 
 * Features:
 * - Circular path visualization
 * - Object moving on path (optional animation)
 * - Velocity vector (tangent to path)
 * - Centripetal acceleration/force vector (toward center)
 * - Angular velocity indicator
 * - Different views: horizontal, vertical, banked curve
 */
export function CircularMotion({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete: _onStepComplete,
  animationDuration = 500,
  width = 400,
  height = 400,
  className = '',
  language = 'en',
}: CircularMotionProps) {
  const {
    radius,
    mass,
    speed,
    angularPosition = 45,
    showVelocity = true,
    showAcceleration = false,
    showCentripetalForce = false,
    showAngularVelocity = false,
    forces = [],
    type = 'horizontal',
    bankAngle = 0,
    title,
    objectLabel,
  } = data

  const reducedMotion = prefersReducedMotion()
  const [isVisible, setIsVisible] = useState(currentStep > 0)

  const centerX = width / 2
  const centerY = height / 2
  const displayRadius = Math.min(width, height) * 0.35 // Scale to fit

  useEffect(() => {
    if (currentStep > 0 && !isVisible) {
      setIsVisible(true)
    }
  }, [currentStep, isVisible])

  // Calculate object position on circle
  const objectPos = useMemo(() => {
    const angleRad = (angularPosition * Math.PI) / 180
    return {
      x: centerX + displayRadius * Math.cos(angleRad),
      y: centerY - displayRadius * Math.sin(angleRad),
    }
  }, [centerX, centerY, displayRadius, angularPosition])

  // Calculate velocity direction (tangent to circle, perpendicular to radius)
  const velocityAngle = angularPosition + 90 // Tangent is perpendicular to radius

  // Current step config
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > currentStep) {
      return stepConfig[currentStep]
    }
    return { step: currentStep }
  }, [currentStep, stepConfig])

  // Visible forces based on step
  const visibleForces = useMemo(() => {
    if (currentStepConfig.visibleForces) {
      return forces.filter(f => currentStepConfig.visibleForces?.includes(f.name))
    }
    return forces.slice(0, currentStep)
  }, [forces, currentStep, currentStepConfig])

  // Animation variants
  const objectVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
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

  // Render circular path
  const renderPath = () => (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dashed circle path */}
      <circle
        cx={centerX}
        cy={centerY}
        r={displayRadius}
        fill="none"
        stroke={COLORS.gray[300]}
        strokeWidth={2}
        strokeDasharray="8 4"
      />
      
      {/* Center point */}
      <circle
        cx={centerX}
        cy={centerY}
        r={4}
        fill={COLORS.gray[500]}
      />
      
      {/* Radius line to object */}
      <motion.line
        x1={centerX}
        y1={centerY}
        x2={objectPos.x}
        y2={objectPos.y}
        stroke={COLORS.gray[400]}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.5 }}
      />
      
      {/* Radius label */}
      <text
        x={(centerX + objectPos.x) / 2 + 10}
        y={(centerY + objectPos.y) / 2}
        fontSize={12}
        fill={COLORS.gray[500]}
        fontFamily="'Inter', system-ui, sans-serif"
      >
        r = {radius}m
      </text>
    </motion.g>
  )

  // Render the moving object
  const renderObject = () => (
    <motion.g
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={objectVariants}
    >
      {/* Shadow */}
      <ellipse
        cx={objectPos.x + 2}
        cy={objectPos.y + 3}
        rx={15}
        ry={5}
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Object (sphere/particle) */}
      <circle
        cx={objectPos.x}
        cy={objectPos.y}
        r={18}
        fill="url(#object-grad-circular)"
        stroke={COLORS.gray[500]}
        strokeWidth={2}
      />
      
      {/* Highlight */}
      <ellipse
        cx={objectPos.x - 5}
        cy={objectPos.y - 5}
        rx={5}
        ry={4}
        fill="rgba(255,255,255,0.5)"
      />
      
      {/* Label */}
      {(objectLabel || mass) && (
        <text
          x={objectPos.x}
          y={objectPos.y + 35}
          textAnchor="middle"
          fontSize={11}
          fill={COLORS.gray[600]}
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {objectLabel || (mass ? `m = ${mass} kg` : '')}
        </text>
      )}
    </motion.g>
  )

  // Render velocity vector
  const renderVelocity = () => {
    if (!showVelocity || currentStep < 1) return null

    return (
      <ForceVector
        force={{
          name: 'velocity',
          type: 'applied',
          magnitude: speed ? speed * 5 : 40,
          angle: velocityAngle,
          symbol: 'v',
          color: '#8b5cf6',
        }}
        origin={objectPos}
        scale={1}
        highlighted={currentStepConfig.highlightForces?.includes('velocity')}
        showLabel={true}
        showMagnitude={speed !== undefined}
        animation="draw"
        animationDuration={reducedMotion ? 0 : animationDuration}
        animationDelay={200}
        useGradient={true}
      />
    )
  }

  // Render centripetal acceleration/force
  const renderCentripetal = () => {
    if ((!showAcceleration && !showCentripetalForce) || currentStep < 2) return null

    const centripetalAngle = angularPosition + 180 // Points toward center

    return (
      <ForceVector
        force={{
          name: showCentripetalForce ? 'Fc' : 'ac',
          type: 'centripetal',
          magnitude: 35,
          angle: centripetalAngle,
          symbol: showCentripetalForce ? 'F' : 'a',
          subscript: 'c',
          color: '#f97316',
        }}
        origin={objectPos}
        scale={1}
        highlighted={true}
        showLabel={true}
        showMagnitude={false}
        animation="draw"
        animationDuration={reducedMotion ? 0 : animationDuration}
        animationDelay={400}
        useGradient={true}
      />
    )
  }

  // Render angular velocity indicator
  const renderAngularVelocity = () => {
    if (!showAngularVelocity || currentStep < 3) return null

    return (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {/* Curved arrow around center */}
        <path
          d={`M ${centerX + 25} ${centerY} 
              A 25 25 0 0 0 ${centerX} ${centerY - 25}`}
          fill="none"
          stroke={COLORS.primary[500]}
          strokeWidth={2}
          markerEnd="url(#omega-arrow)"
        />
        <text
          x={centerX + 35}
          y={centerY - 15}
          fontSize={14}
          fill={COLORS.primary[600]}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="500"
        >
          ω
        </text>
      </motion.g>
    )
  }

  // Render additional forces
  const renderForces = () => {
    return visibleForces.map((force, index) => (
      <ForceVector
        key={force.name}
        force={force}
        origin={force.origin ? { x: centerX + force.origin.x, y: centerY + force.origin.y } : objectPos}
        scale={2}
        highlighted={currentStepConfig.highlightForces?.includes(force.name)}
        showLabel={true}
        showMagnitude={currentStepConfig.highlightForces?.includes(force.name)}
        animation="draw"
        animationDuration={reducedMotion ? 0 : animationDuration}
        animationDelay={200 + index * 150}
        useGradient={true}
      />
    ))
  }

  // Render diagram based on type
  const renderTypeSpecific = () => {
    if (type === 'vertical') {
      // Add ground line for vertical circle (like ferris wheel)
      return (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <line
            x1={0}
            y1={centerY + displayRadius + 30}
            x2={width}
            y2={centerY + displayRadius + 30}
            stroke={COLORS.gray[400]}
            strokeWidth={3}
          />
          {/* Hatching */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={i}
              x1={i * 25}
              y1={centerY + displayRadius + 30}
              x2={i * 25 + 15}
              y2={centerY + displayRadius + 40}
              stroke={COLORS.gray[300]}
              strokeWidth={1}
            />
          ))}
        </motion.g>
      )
    }

    if (type === 'banked') {
      // Show banked curve cross-section
      const bankRad = (bankAngle * Math.PI) / 180
      return (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Banked surface */}
          <line
            x1={centerX - 80}
            y1={centerY + displayRadius + 20}
            x2={centerX + 80}
            y2={centerY + displayRadius + 20 - 160 * Math.tan(bankRad)}
            stroke={COLORS.gray[500]}
            strokeWidth={4}
          />
          {/* Bank angle arc */}
          <path
            d={`M ${centerX + 50} ${centerY + displayRadius + 20}
                A 30 30 0 0 0 ${centerX + 50 + 30 * Math.cos(bankRad)} ${centerY + displayRadius + 20 - 30 * Math.sin(bankRad)}`}
            fill="none"
            stroke={COLORS.primary[400]}
            strokeWidth={2}
          />
          <text
            x={centerX + 90}
            y={centerY + displayRadius + 10}
            fontSize={12}
            fill={COLORS.primary[600]}
            fontFamily="'Inter', system-ui, sans-serif"
          >
            θ = {bankAngle}°
          </text>
        </motion.g>
      )
    }

    return null
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`circular-motion ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Definitions */}
      <defs>
        <linearGradient id="bg-gradient-circular" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>

        <radialGradient id="object-grad-circular" cx="30%" cy="30%">
          <stop offset="0%" stopColor={COLORS.gray[200]} />
          <stop offset="100%" stopColor={COLORS.gray[400]} />
        </radialGradient>

        <pattern id="grid-pattern-circular" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={COLORS.gray[100]} strokeWidth="0.5" />
        </pattern>

        <marker id="omega-arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.primary[500]} />
        </marker>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#bg-gradient-circular)" rx={12} />
      <rect width={width} height={height} fill="url(#grid-pattern-circular)" opacity={0.5} rx={12} />

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

      {/* Type-specific elements */}
      {renderTypeSpecific()}

      {/* Circular path */}
      {renderPath()}

      {/* Moving object */}
      {renderObject()}

      {/* Velocity vector */}
      {renderVelocity()}

      {/* Centripetal acceleration/force */}
      {renderCentripetal()}

      {/* Angular velocity */}
      {renderAngularVelocity()}

      {/* Additional forces */}
      {renderForces()}

      {/* Step indicator */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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

export default CircularMotion
