'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { type DiagramStepConfig, type PhysicsObject } from '@/types/physics'
import { COLORS, hexToRgba } from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface CollisionObject {
  object: PhysicsObject
  velocity: { before: number; after?: number }
  position?: { x: number; y: number }
}

interface CollisionDiagramData {
  /** Objects involved in collision */
  objects: CollisionObject[]
  /** Type of collision */
  collisionType: 'elastic' | 'inelastic' | 'perfectly_inelastic'
  /** Show before state */
  showBefore?: boolean
  /** Show after state */
  showAfter?: boolean
  /** Show momentum vectors */
  showMomentum?: boolean
  /** Show kinetic energy comparison */
  showEnergy?: boolean
  /** Title */
  title?: string
}

interface CollisionDiagramProps {
  data: CollisionDiagramData
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
 * CollisionDiagram - SVG component for collision problems
 * 
 * Features:
 * - Before/after visualization
 * - Velocity vectors
 * - Momentum arrows
 * - Elastic/inelastic collision types
 * - Energy comparison bars
 */
export function CollisionDiagram({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete: _onStepComplete,
  animationDuration: _animationDuration = 500,
  width = 500,
  height = 350,
  className = '',
  language = 'en',
}: CollisionDiagramProps) {
  const {
    objects,
    collisionType,
    showBefore = true,
    showAfter = true,
    showMomentum = false,
    showEnergy: _showEnergy = false,
    title,
  } = data

  const reducedMotion = prefersReducedMotion()
  const [isVisible, setIsVisible] = useState(currentStep > 0)

  // Layout constants
  const beforeY = height * 0.3
  const afterY = height * 0.7
  const objectSpacing = 120
  const centerX = width / 2

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

  // Current step config
  const _currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > currentStep) {
      return stepConfig[currentStep]
    }
    return { step: currentStep }
  }, [currentStep, stepConfig])

  // Render a collision object (block/sphere)
  const renderObject = (
    obj: CollisionObject,
    x: number,
    y: number,
    velocity: number,
    label: string,
    index: number
  ) => {
    const { object } = obj
    const objSize = object.width || 50
    const gradientId = `collision-obj-${index}-${label}`

    return (
      <motion.g
        key={`${label}-obj-${index}`}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={objectVariants}
        transition={{ delay: index * 0.1 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={object.color || (index === 0 ? '#60a5fa' : '#f87171')} />
            <stop offset="100%" stopColor={object.color ? hexToRgba(object.color, 0.7) : (index === 0 ? '#3b82f6' : '#ef4444')} />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <rect
          x={x - objSize / 2 + 2}
          y={y - objSize / 2 + 2}
          width={objSize}
          height={objSize}
          fill="rgba(0,0,0,0.1)"
          rx={object.type === 'sphere' ? objSize / 2 : 6}
        />

        {/* Object */}
        {object.type === 'sphere' ? (
          <circle
            cx={x}
            cy={y}
            r={objSize / 2}
            fill={`url(#${gradientId})`}
            stroke={COLORS.gray[500]}
            strokeWidth={2}
          />
        ) : (
          <rect
            x={x - objSize / 2}
            y={y - objSize / 2}
            width={objSize}
            height={objSize}
            fill={`url(#${gradientId})`}
            stroke={COLORS.gray[500]}
            strokeWidth={2}
            rx={6}
          />
        )}

        {/* Mass label */}
        <text
          x={x}
          y={y - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight="600"
          fill="white"
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {object.label || `m${index + 1}`}
        </text>
        {object.mass && (
          <text
            x={x}
            y={y + 12}
            textAnchor="middle"
            fontSize={10}
            fill="white"
            fontFamily="'JetBrains Mono', monospace"
          >
            {object.mass}kg
          </text>
        )}

        {/* Velocity vector */}
        {velocity !== 0 && (
          <>
            <motion.line
              x1={x + (velocity > 0 ? objSize / 2 + 5 : -objSize / 2 - 5)}
              y1={y}
              x2={x + (velocity > 0 ? objSize / 2 + 5 + Math.abs(velocity) * 3 : -objSize / 2 - 5 - Math.abs(velocity) * 3)}
              y2={y}
              stroke={COLORS.primary[500]}
              strokeWidth={3}
              markerEnd="url(#velocity-arrow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.4, delay: 0.3 }}
            />
            <text
              x={x + (velocity > 0 ? objSize / 2 + 20 + Math.abs(velocity) * 1.5 : -objSize / 2 - 20 - Math.abs(velocity) * 1.5)}
              y={y - 12}
              textAnchor="middle"
              fontSize={11}
              fill={COLORS.primary[600]}
              fontFamily="'JetBrains Mono', monospace"
            >
              v = {velocity > 0 ? '+' : ''}{velocity} m/s
            </text>
          </>
        )}
      </motion.g>
    )
  }

  // Render before state
  const renderBeforeState = () => {
    if (!showBefore || currentStep < 1) return null

    return (
      <g>
        {/* Section label */}
        <motion.text
          x={40}
          y={beforeY - 50}
          fontSize={14}
          fontWeight="600"
          fill={COLORS.gray[600]}
          fontFamily="'Inter', system-ui, sans-serif"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {language === 'he' ? 'לפני:' : 'Before:'}
        </motion.text>

        {/* Objects */}
        {objects.map((obj, index) => {
          const x = centerX + (index - (objects.length - 1) / 2) * objectSpacing
          return renderObject(obj, x, beforeY, obj.velocity.before, 'before', index)
        })}

        {/* Collision point indicator */}
        <motion.circle
          cx={centerX}
          cy={beforeY}
          r={5}
          fill={COLORS.warning[400]}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: 0.5, delay: 0.5 }}
        />
      </g>
    )
  }

  // Render after state
  const renderAfterState = () => {
    if (!showAfter || currentStep < 2) return null

    const isPerfectlyInelastic = collisionType === 'perfectly_inelastic'

    return (
      <g>
        {/* Section label */}
        <motion.text
          x={40}
          y={afterY - 50}
          fontSize={14}
          fontWeight="600"
          fill={COLORS.gray[600]}
          fontFamily="'Inter', system-ui, sans-serif"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          {language === 'he' ? 'אחרי:' : 'After:'}
        </motion.text>

        {/* Collision type label */}
        <motion.text
          x={width - 40}
          y={afterY - 50}
          textAnchor="end"
          fontSize={11}
          fill={COLORS.gray[500]}
          fontFamily="'Inter', system-ui, sans-serif"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {collisionType === 'elastic' ? (language === 'he' ? 'אלסטית' : 'Elastic') :
           collisionType === 'inelastic' ? (language === 'he' ? 'לא אלסטית' : 'Inelastic') :
           (language === 'he' ? 'לא אלסטית מושלמת' : 'Perfectly Inelastic')}
        </motion.text>

        {/* Objects after collision */}
        {isPerfectlyInelastic ? (
          // Combined object for perfectly inelastic
          <motion.g
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={objectVariants}
            transition={{ delay: 0.6 }}
          >
            <rect
              x={centerX - 40}
              y={afterY - 30}
              width={80}
              height={60}
              fill="url(#combined-gradient)"
              stroke={COLORS.gray[600]}
              strokeWidth={2}
              rx={8}
            />
            <defs>
              <linearGradient id="combined-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
            <text
              x={centerX}
              y={afterY - 5}
              textAnchor="middle"
              fontSize={12}
              fontWeight="600"
              fill="white"
              fontFamily="'Inter', system-ui, sans-serif"
            >
              {objects.map(o => o.object.label || 'm').join('+')}
            </text>
            <text
              x={centerX}
              y={afterY + 12}
              textAnchor="middle"
              fontSize={10}
              fill="white"
              fontFamily="'JetBrains Mono', monospace"
            >
              {objects.reduce((sum, o) => sum + (o.object.mass || 1), 0)}kg
            </text>

            {/* Combined velocity */}
            {objects[0].velocity.after !== undefined && (
              <motion.line
                x1={centerX + 45}
                y1={afterY}
                x2={centerX + 45 + Math.abs(objects[0].velocity.after) * 3}
                y2={afterY}
                stroke={COLORS.primary[500]}
                strokeWidth={3}
                markerEnd="url(#velocity-arrow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              />
            )}
          </motion.g>
        ) : (
          // Separate objects for elastic/inelastic
          objects.map((obj, index) => {
            const x = centerX + (index - (objects.length - 1) / 2) * objectSpacing
            const afterVelocity = obj.velocity.after !== undefined ? obj.velocity.after : obj.velocity.before
            return renderObject(obj, x, afterY, afterVelocity, 'after', index + 10)
          })
        )}
      </g>
    )
  }

  // Render momentum comparison
  const renderMomentum = () => {
    if (!showMomentum || currentStep < 3) return null

    const beforeMomentum = objects.reduce((sum, obj) => 
      sum + (obj.object.mass || 1) * obj.velocity.before, 0
    )
    const afterMomentum = objects.reduce((sum, obj) => 
      sum + (obj.object.mass || 1) * (obj.velocity.after ?? obj.velocity.before), 0
    )

    return (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <rect
          x={width - 150}
          y={height - 80}
          width={140}
          height={70}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={6}
        />
        <text
          x={width - 80}
          y={height - 62}
          textAnchor="middle"
          fontSize={12}
          fontWeight="600"
          fill={COLORS.gray[700]}
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {language === 'he' ? 'תנע' : 'Momentum'}
        </text>
        <text
          x={width - 80}
          y={height - 42}
          textAnchor="middle"
          fontSize={10}
          fill={COLORS.gray[500]}
          fontFamily="'JetBrains Mono', monospace"
        >
          p{language === 'he' ? ' לפני' : '₁'} = {beforeMomentum.toFixed(1)} kg·m/s
        </text>
        <text
          x={width - 80}
          y={height - 25}
          textAnchor="middle"
          fontSize={10}
          fill={COLORS.gray[500]}
          fontFamily="'JetBrains Mono', monospace"
        >
          p{language === 'he' ? ' אחרי' : '₂'} = {afterMomentum.toFixed(1)} kg·m/s
        </text>
        <text
          x={width - 80}
          y={height - 8}
          textAnchor="middle"
          fontSize={10}
          fontWeight="600"
          fill={Math.abs(beforeMomentum - afterMomentum) < 0.1 ? COLORS.success[600] : COLORS.error[600]}
          fontFamily="'JetBrains Mono', monospace"
        >
          {Math.abs(beforeMomentum - afterMomentum) < 0.1 ? '✓ Conserved' : '≠ Not equal'}
        </text>
      </motion.g>
    )
  }

  // Render collision arrow between before and after
  const renderCollisionArrow = () => {
    if (currentStep < 2) return null

    return (
      <motion.g
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <line
          x1={centerX}
          y1={beforeY + 40}
          x2={centerX}
          y2={afterY - 50}
          stroke={COLORS.gray[400]}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        <polygon
          points={`${centerX},${afterY - 45} ${centerX - 6},${afterY - 55} ${centerX + 6},${afterY - 55}`}
          fill={COLORS.gray[400]}
        />
        <text
          x={centerX + 15}
          y={(beforeY + afterY) / 2}
          fontSize={10}
          fill={COLORS.gray[500]}
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {language === 'he' ? 'התנגשות' : 'Collision'}
        </text>
      </motion.g>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`collision-diagram ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Definitions */}
      <defs>
        <linearGradient id="bg-gradient-collision" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>

        <pattern id="grid-pattern-collision" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={COLORS.gray[100]} strokeWidth="0.5" />
        </pattern>

        <marker id="velocity-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.primary[500]} />
        </marker>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#bg-gradient-collision)" rx={12} />
      <rect width={width} height={height} fill="url(#grid-pattern-collision)" opacity={0.5} rx={12} />

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

      {/* Before state */}
      {renderBeforeState()}

      {/* Collision arrow */}
      {renderCollisionArrow()}

      {/* After state */}
      {renderAfterState()}

      {/* Momentum comparison */}
      {renderMomentum()}

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

export default CollisionDiagram
