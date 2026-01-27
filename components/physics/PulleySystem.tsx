'use client'

import { useState, useEffect, useMemo, useCallback as _useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { type PulleySystemData, type DiagramStepConfig, type Force as _Force } from '@/types/physics'
import { ForceVector } from './ForceVector'
import { COLORS, SHADOWS as _SHADOWS, hexToRgba } from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface PulleySystemProps {
  data: PulleySystemData
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
 * PulleySystem - SVG component for rendering pulley system diagrams
 * 
 * Features:
 * - Single and multiple pulley configurations
 * - Masses connected via ropes
 * - Tension vectors
 * - Animated rope/string
 * - Acceleration indicators
 */
export function PulleySystem({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete: _onStepComplete,
  animationDuration = 500,
  width = 450,
  height = 400,
  className = '',
  language = 'en',
}: PulleySystemProps) {
  const { pulleys, masses, tensions = [], showAcceleration = false, title } = data
  
  const reducedMotion = prefersReducedMotion()
  const [isVisible, setIsVisible] = useState(currentStep > 0)

  useEffect(() => {
    if (currentStep > 0 && !isVisible) {
      setIsVisible(true)
    }
  }, [currentStep, isVisible])

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

  // Get current step config
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > currentStep) {
      return stepConfig[currentStep]
    }
    return { step: currentStep, visibleForces: tensions.map(t => t.name) }
  }, [currentStep, stepConfig, tensions])

  // Visible tensions based on step
  const visibleTensions = useMemo(() => {
    if (currentStepConfig.visibleForces) {
      return tensions.filter(t => currentStepConfig.visibleForces?.includes(t.name))
    }
    return tensions.slice(0, currentStep)
  }, [tensions, currentStep, currentStepConfig])

  // Render a pulley wheel
  const renderPulley = (pulley: typeof pulleys[0], index: number) => {
    const { position, radius, fixed = true } = pulley
    const gradientId = `pulley-gradient-${index}`

    return (
      <motion.g
        key={`pulley-${index}`}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={objectVariants}
      >
        {/* Pulley mounting bracket (for fixed pulleys) */}
        {fixed && (
          <>
            <rect
              x={position.x - radius * 0.3}
              y={position.y - radius - 20}
              width={radius * 0.6}
              height={20}
              fill={COLORS.gray[500]}
              stroke={COLORS.gray[600]}
              strokeWidth={2}
            />
            {/* Ceiling/support */}
            <line
              x1={position.x - radius * 1.5}
              y1={position.y - radius - 20}
              x2={position.x + radius * 1.5}
              y2={position.y - radius - 20}
              stroke={COLORS.gray[600]}
              strokeWidth={4}
            />
            {/* Hatching for fixed support */}
            {[-1, -0.5, 0, 0.5, 1].map((offset, i) => (
              <line
                key={i}
                x1={position.x + offset * radius}
                y1={position.y - radius - 20}
                x2={position.x + offset * radius - 8}
                y2={position.y - radius - 30}
                stroke={COLORS.gray[500]}
                strokeWidth={1.5}
              />
            ))}
          </>
        )}

        {/* Pulley wheel shadow */}
        <ellipse
          cx={position.x + 2}
          cy={position.y + 3}
          rx={radius}
          ry={radius * 0.3}
          fill="rgba(0,0,0,0.1)"
        />

        {/* Pulley wheel */}
        <defs>
          <radialGradient id={gradientId} cx="30%" cy="30%">
            <stop offset="0%" stopColor={COLORS.gray[300]} />
            <stop offset="100%" stopColor={COLORS.gray[500]} />
          </radialGradient>
        </defs>
        <circle
          cx={position.x}
          cy={position.y}
          r={radius}
          fill={`url(#${gradientId})`}
          stroke={COLORS.gray[600]}
          strokeWidth={3}
        />
        
        {/* Inner groove */}
        <circle
          cx={position.x}
          cy={position.y}
          r={radius * 0.7}
          fill="none"
          stroke={COLORS.gray[400]}
          strokeWidth={2}
        />
        
        {/* Axle */}
        <circle
          cx={position.x}
          cy={position.y}
          r={radius * 0.15}
          fill={COLORS.gray[700]}
          stroke={COLORS.gray[800]}
          strokeWidth={1}
        />
      </motion.g>
    )
  }

  // Render a mass block
  const renderMass = (massData: typeof masses[0], index: number) => {
    const { object, attachedTo, side } = massData
    const pulley = pulleys[attachedTo]
    
    // Calculate position based on which side of pulley
    const xOffset = side === 'left' ? -pulley.radius - 30 : pulley.radius + 30
    const massX = pulley.position.x + xOffset
    const massY = pulley.position.y + 100 // Hanging below
    
    const blockWidth = object.width || 50
    const blockHeight = object.height || 50
    const gradientId = `mass-gradient-${index}`

    return (
      <motion.g
        key={`mass-${index}`}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={objectVariants}
      >
        {/* Rope from pulley to mass */}
        <motion.path
          d={`M ${pulley.position.x + (side === 'left' ? -pulley.radius : pulley.radius)} ${pulley.position.y}
              L ${massX} ${massY - blockHeight / 2}`}
          fill="none"
          stroke={COLORS.gray[600]}
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.5, delay: 0.2 }}
        />

        {/* Shadow */}
        <rect
          x={massX - blockWidth / 2 + 3}
          y={massY - blockHeight / 2 + 3}
          width={blockWidth}
          height={blockHeight}
          fill="rgba(0,0,0,0.1)"
          rx={4}
        />

        {/* Mass block */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={object.color || COLORS.gray[200]} />
            <stop offset="100%" stopColor={object.color ? hexToRgba(object.color, 0.7) : COLORS.gray[400]} />
          </linearGradient>
        </defs>
        <rect
          x={massX - blockWidth / 2}
          y={massY - blockHeight / 2}
          width={blockWidth}
          height={blockHeight}
          fill={`url(#${gradientId})`}
          stroke={COLORS.gray[500]}
          strokeWidth={2}
          rx={4}
        />

        {/* Label */}
        {object.label && (
          <text
            x={massX}
            y={massY - (object.mass ? 5 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight="600"
            fontFamily="'Inter', system-ui, sans-serif"
            fill={COLORS.gray[700]}
          >
            {object.label}
          </text>
        )}

        {/* Mass value */}
        {object.mass && (
          <text
            x={massX}
            y={massY + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            fill={COLORS.gray[500]}
          >
            {object.mass} kg
          </text>
        )}

        {/* Acceleration arrow if enabled */}
        {showAcceleration && currentStep > 0 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <line
              x1={massX + blockWidth / 2 + 15}
              y1={massY}
              x2={massX + blockWidth / 2 + 15}
              y2={massY + 25}
              stroke={COLORS.primary[500]}
              strokeWidth={2}
              markerEnd="url(#accel-arrow)"
            />
            <text
              x={massX + blockWidth / 2 + 25}
              y={massY + 15}
              fontSize={12}
              fontFamily="'Inter', system-ui, sans-serif"
              fontWeight="500"
              fill={COLORS.primary[600]}
            >
              a
            </text>
          </motion.g>
        )}
      </motion.g>
    )
  }

  // Render tension forces
  const renderTensions = () => {
    return (
      <AnimatePresence>
        {visibleTensions.map((tension, index) => {
          // Calculate position based on tension config
          const origin = tension.origin || { x: width / 2, y: height / 2 }
          return (
            <ForceVector
              key={tension.name}
              force={tension}
              origin={{ x: origin.x, y: origin.y }}
              scale={2}
              highlighted={currentStepConfig.highlightForces?.includes(tension.name)}
              showLabel={true}
              showMagnitude={currentStepConfig.highlightForces?.includes(tension.name)}
              animation="draw"
              animationDuration={reducedMotion ? 0 : animationDuration}
              animationDelay={reducedMotion ? 0 : 300 + index * 150}
              useGradient={true}
            />
          )
        })}
      </AnimatePresence>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`pulley-system ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Definitions */}
      <defs>
        {/* Background gradient */}
        <linearGradient id="bg-gradient-pulley" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>

        {/* Grid pattern */}
        <pattern id="grid-pattern-pulley" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke={COLORS.gray[100]}
            strokeWidth="0.5"
          />
        </pattern>

        {/* Acceleration arrow marker */}
        <marker
          id="accel-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.primary[500]} />
        </marker>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#bg-gradient-pulley)" rx={12} />
      <rect width={width} height={height} fill="url(#grid-pattern-pulley)" opacity={0.5} rx={12} />

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

      {/* Pulleys */}
      {pulleys.map((pulley, index) => renderPulley(pulley, index))}

      {/* Masses */}
      {masses.map((mass, index) => renderMass(mass, index))}

      {/* Tension forces */}
      {renderTensions()}

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

export default PulleySystem
