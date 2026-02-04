'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { type ProjectileMotionData, type DiagramStepConfig } from '@/types/physics'
import { ForceVector } from './ForceVector'
import { COLORS, hexToRgba as _hexToRgba } from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface ProjectileMotionProps {
  data: ProjectileMotionData
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
 * ProjectileMotion - SVG component for projectile motion diagrams
 * 
 * Features:
 * - Parabolic trajectory path
 * - Velocity vectors at different time points
 * - Component decomposition (vx, vy)
 * - Time markers along path
 * - Ground level indication
 * - Maximum height and range markers
 */
export function ProjectileMotion({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete: _onStepComplete,
  animationDuration = 500,
  width = 500,
  height = 350,
  className = '',
  language = 'en',
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
  const [isVisible, setIsVisible] = useState(currentStep > 0)

  // Physics constants
  const g = 9.8 // gravity (m/s²)
  const scale = 8 // pixels per meter

  useEffect(() => {
    if (currentStep > 0 && !isVisible) {
      setIsVisible(true)
    }
  }, [currentStep, isVisible])

  // Calculate trajectory points
  const trajectoryPoints = useMemo(() => {
    const v0 = initialVelocity.magnitude
    const theta = (initialVelocity.angle * Math.PI) / 180
    const v0x = v0 * Math.cos(theta)
    const v0y = v0 * Math.sin(theta)

    // Time of flight (until ground level)
    const _y0 = initial.y
    const _yGround = groundLevel
    // Solving: y0 + v0y*t - 0.5*g*t² = yGround
    // Simplified: find when projectile returns to initial height
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
  }, [initial, initialVelocity, groundLevel, scale])

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
  }, [initial, initialVelocity, timeIntervals, scale])

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
  }, [initial, initialVelocity, scale])

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

  // Generate SVG path for trajectory
  const trajectoryPath = useMemo(() => {
    if (trajectoryPoints.length < 2) return ''
    return trajectoryPoints.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`
      return `${path} L ${point.x} ${point.y}`
    }, '')
  }, [trajectoryPoints])

  // Current step config
  const _currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > currentStep) {
      return stepConfig[currentStep]
    }
    return { step: currentStep }
  }, [currentStep, stepConfig])

  // Render velocity vector at a point
  const renderVelocityVector = (
    point: { x: number; y: number; vx: number; vy: number; t: number },
    index: number
  ) => {
    const vMag = Math.sqrt(point.vx * point.vx + point.vy * point.vy)
    const vAngle = (Math.atan2(point.vy, point.vx) * 180) / Math.PI

    if (point.y > groundLevel) return null

    return (
      <g key={`velocity-${index}`}>
        {/* Velocity vector */}
        <ForceVector
          force={{
            name: `v${index}`,
            type: 'applied',
            magnitude: vMag * 3,
            angle: vAngle,
            symbol: 'v',
            color: '#8b5cf6',
          }}
          origin={point}
          scale={1}
          highlighted={index === currentStep - 1}
          showLabel={true}
          showMagnitude={false}
          animation={currentStep > index ? 'draw' : 'none'}
          animationDuration={reducedMotion ? 0 : animationDuration}
          animationDelay={reducedMotion ? 0 : 200 + index * 150}
          useGradient={true}
        />

        {/* Component vectors if enabled */}
        {showComponents && index === currentStep - 1 && (
          <>
            {/* vx component */}
            <motion.line
              x1={point.x}
              y1={point.y}
              x2={point.x + point.vx * 3}
              y2={point.y}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="4 2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
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
              strokeWidth={2}
              strokeDasharray="4 2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
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
          </>
        )}

        {/* Time label */}
        <text
          x={point.x}
          y={point.y + 25}
          textAnchor="middle"
          fontSize={10}
          fill={COLORS.gray[500]}
          fontFamily="'JetBrains Mono', monospace"
        >
          t = {point.t}s
        </text>
      </g>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`projectile-motion ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Definitions */}
      <defs>
        <linearGradient id="bg-gradient-proj" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>

        <pattern id="grid-pattern-proj" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={COLORS.gray[100]} strokeWidth="0.5" />
        </pattern>

        <linearGradient id="ground-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>

      {/* Sky background */}
      <rect width={width} height={height} fill="url(#bg-gradient-proj)" rx={12} />
      <rect width={width} height={height} fill="url(#grid-pattern-proj)" opacity={0.3} rx={12} />

      {/* Ground */}
      <rect
        x={0}
        y={groundLevel}
        width={width}
        height={height - groundLevel}
        fill="url(#ground-gradient)"
      />
      <line
        x1={0}
        y1={groundLevel}
        x2={width}
        y2={groundLevel}
        stroke="#22c55e"
        strokeWidth={3}
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
          fill={COLORS.gray[800]}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.text>
      )}

      {/* Trajectory path */}
      {showTrajectory && (
        <motion.path
          d={trajectoryPath}
          fill="none"
          stroke={COLORS.gray[400]}
          strokeWidth={2}
          strokeDasharray="6 3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: reducedMotion ? 0 : 1, delay: 0.2 }}
        />
      )}

      {/* Max height indicator */}
      {currentStep > 1 && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <line
            x1={maxHeightPoint.x}
            y1={maxHeightPoint.y}
            x2={maxHeightPoint.x}
            y2={groundLevel}
            stroke={COLORS.primary[300]}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text
            x={maxHeightPoint.x + 8}
            y={(maxHeightPoint.y + groundLevel) / 2}
            fontSize={10}
            fill={COLORS.primary[600]}
            fontFamily="'JetBrains Mono', monospace"
          >
            h<tspan fontSize={7} dy={2}>max</tspan> = {maxHeightPoint.maxHeight.toFixed(1)}m
          </text>
        </motion.g>
      )}

      {/* Launch point */}
      <motion.g
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={objectVariants}
      >
        <circle
          cx={initial.x}
          cy={initial.y}
          r={8}
          fill={COLORS.primary[500]}
          stroke={COLORS.primary[600]}
          strokeWidth={2}
        />
        <text
          x={initial.x - 15}
          y={initial.y + 20}
          fontSize={11}
          fill={COLORS.gray[600]}
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {language === 'he' ? 'התחלה' : 'Start'}
        </text>
      </motion.g>

      {/* Velocity vectors at time intervals */}
      {showVelocityVectors && markerPositions.map((point, index) => 
        currentStep > index && renderVelocityVector(point, index)
      )}

      {/* Position markers */}
      {markerPositions.map((point, index) => (
        currentStep > index && point.y <= groundLevel && (
          <motion.circle
            key={`marker-${index}`}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={index === currentStep - 1 ? COLORS.primary[500] : COLORS.gray[400]}
            stroke="white"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: index * 0.1 }}
          />
        )
      ))}

      {/* Acceleration vector (gravity) if shown */}
      {showAcceleration && currentStep > 0 && (
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
          highlighted={true}
          showLabel={true}
          animation="draw"
          animationDuration={reducedMotion ? 0 : animationDuration}
          useGradient={true}
        />
      )}

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

export default ProjectileMotion
