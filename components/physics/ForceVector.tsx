'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { motion, useAnimation, type Variants } from 'framer-motion'
import { type Force, FORCE_COLORS, FORCE_SYMBOLS } from '@/types/physics'
import { FORCE_COLORS as THEME_FORCE_COLORS, SHADOWS } from '@/lib/diagram-theme'
import {
  createPathDrawVariants,
  prefersReducedMotion,
} from '@/lib/diagram-animations'

interface ForceVectorProps {
  force: Force
  /** Origin point in SVG coordinates */
  origin: { x: number; y: number }
  /** Scale factor for force magnitude to arrow length */
  scale?: number
  /** Whether this force is highlighted */
  highlighted?: boolean
  /** Whether to show the label */
  showLabel?: boolean
  /** Whether to show magnitude value */
  showMagnitude?: boolean
  /** Whether to show angle arc */
  showAngle?: boolean
  /** Reference angle for angle arc (degrees) */
  referenceAngle?: number
  /** Animation state */
  animation?: 'none' | 'fade' | 'draw' | 'pulse'
  /** Animation duration in ms */
  animationDuration?: number
  /** Animation delay in ms (for choreographed sequences) */
  animationDelay?: number
  /** Opacity (for fade animations) */
  opacity?: number
  /** Arrow head size */
  arrowSize?: number
  /** Stroke width */
  strokeWidth?: number
  /** Whether to use gradient fill */
  useGradient?: boolean
  /** Custom className for additional styling */
  className?: string
  /** Callback when animation completes */
  onAnimationComplete?: () => void
}

/**
 * ForceVector - Enhanced SVG component for rendering force arrows
 *
 * Features:
 * - Framer Motion animations for smooth draw/fade effects
 * - Gradient-filled arrows (3Blue1Brown style)
 * - Color-coded by force type with semantic colors
 * - Optional label with symbol and subscript
 * - Optional magnitude display inline with vector
 * - Optional angle arc from reference
 * - Choreographed animation support for educational reveals
 * - Accessibility: respects prefers-reduced-motion
 */
export function ForceVector({
  force,
  origin,
  scale = 1,
  highlighted = false,
  showLabel = true,
  showMagnitude = false,
  showAngle = false,
  referenceAngle = 0,
  animation = 'none',
  animationDuration = 500,
  animationDelay = 0,
  opacity = 1,
  arrowSize = 12,
  strokeWidth = 3,
  useGradient = true,
  className = '',
  onAnimationComplete,
}: ForceVectorProps) {
  const lineRef = useRef<SVGLineElement>(null)
  const controls = useAnimation()
  const [_isAnimating, setIsAnimating] = useState(animation !== 'none')
  const reducedMotion = prefersReducedMotion()

  // Get force-specific colors from theme
  const forceThemeColors = useMemo(() => {
    const type = force.type.toLowerCase()
    if (type.includes('weight') || type.includes('gravity')) return THEME_FORCE_COLORS.weight
    if (type.includes('normal')) return THEME_FORCE_COLORS.normal
    if (type.includes('friction')) return THEME_FORCE_COLORS.friction
    if (type.includes('tension')) return THEME_FORCE_COLORS.tension
    if (type.includes('applied') || type.includes('push') || type.includes('pull'))
      return THEME_FORCE_COLORS.applied
    if (type.includes('net') || type.includes('resultant')) return THEME_FORCE_COLORS.net
    if (type.includes('spring')) return THEME_FORCE_COLORS.spring
    if (type.includes('drive') || type.includes('engine')) return THEME_FORCE_COLORS.drive
    if (type.includes('resistance')) return THEME_FORCE_COLORS.resistance
    if (type.includes('thrust')) return THEME_FORCE_COLORS.thrust
    if (type.includes('lift')) return THEME_FORCE_COLORS.lift
    if (type.includes('drag')) return THEME_FORCE_COLORS.drag
    return THEME_FORCE_COLORS.applied
  }, [force.type])

  // Use force color or theme color
  const color = force.color || FORCE_COLORS[force.type] || forceThemeColors.primary
  const gradientId = `force-gradient-${force.name.replace(/\s+/g, '-')}-${origin.x}-${origin.y}`
  const glowId = `force-glow-${force.name.replace(/\s+/g, '-')}-${origin.x}-${origin.y}`

  // Defensive defaults for null/undefined values
  const safeAngle = force.angle ?? 0
  const safeMagnitude = force.magnitude ?? 0

  // Calculate end point based on magnitude and angle
  const angleRad = (safeAngle * Math.PI) / 180
  const length = Math.max(safeMagnitude * scale, 20) // Minimum length for visibility

  const endX = origin.x + length * Math.cos(angleRad)
  const endY = origin.y - length * Math.sin(angleRad) // SVG Y is inverted

  // Calculate arrowhead points (larger, more professional)
  const arrowAngle = Math.atan2(origin.y - endY, endX - origin.x)
  const arrowPoint1 = {
    x: endX - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
    y: endY + arrowSize * Math.sin(arrowAngle - Math.PI / 6),
  }
  const arrowPoint2 = {
    x: endX - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
    y: endY + arrowSize * Math.sin(arrowAngle + Math.PI / 6),
  }

  // Label position - integrated at the arrow tip (Spatial Contiguity principle)
  const labelOffset = arrowSize + 12
  const labelX = endX + labelOffset * Math.cos(angleRad)
  const labelY = endY - labelOffset * Math.sin(angleRad)

  // Build label text
  const symbol = force.symbol || FORCE_SYMBOLS[force.type] || force.name
  const subscript = force.subscript || ''

  // Magnitude label position (along the shaft)
  const magLabelX = (origin.x + endX) / 2 + 12 * Math.sin(angleRad)
  const magLabelY = (origin.y + endY) / 2 + 12 * Math.cos(angleRad)

  // Animation variants
  const shaftDrawVariants = useMemo(
    () =>
      createPathDrawVariants(
        reducedMotion ? 0 : animationDuration / 1000,
        reducedMotion ? 0 : animationDelay / 1000
      ),
    [animationDuration, animationDelay, reducedMotion]
  )

  const arrowheadAnimVariants: Variants = useMemo(
    () => ({
      hidden: { scale: 0, opacity: 0 },
      visible: {
        scale: 1,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 20,
          delay: reducedMotion ? 0 : (animationDelay + animationDuration * 0.7) / 1000,
        },
      },
    }),
    [animationDelay, animationDuration, reducedMotion]
  )

  const labelVariants: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, x: -5 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          delay: reducedMotion ? 0 : (animationDelay + animationDuration) / 1000,
          duration: 0.2,
        },
      },
    }),
    [animationDelay, animationDuration, reducedMotion]
  )

  const fadeVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: opacity,
      transition: { duration: reducedMotion ? 0 : animationDuration / 1000, delay: animationDelay / 1000 },
    },
  }

  const pulseVariants: Variants = {
    idle: { scale: 1, opacity: 1 },
    pulse: {
      scale: [1, 1.02, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  // Trigger animation on mount or when animation prop changes
  useEffect(() => {
    if (animation === 'draw' || animation === 'fade') {
      controls.start('visible').then(() => {
        setIsAnimating(false)
        onAnimationComplete?.()
      })
    } else if (animation === 'pulse') {
      controls.start('pulse')
    }
  }, [animation, controls, onAnimationComplete])

  // Angle arc rendering
  const renderAngleArc = () => {
    if (!showAngle) return null

    const arcRadius = 25
    const startAngle = (referenceAngle * Math.PI) / 180
    const endAngle = angleRad

    const startArcX = origin.x + arcRadius * Math.cos(startAngle)
    const startArcY = origin.y - arcRadius * Math.sin(startAngle)
    const endArcX = origin.x + arcRadius * Math.cos(endAngle)
    const endArcY = origin.y - arcRadius * Math.sin(endAngle)

    let angleDiff = force.angle - referenceAngle
    while (angleDiff < 0) angleDiff += 360
    while (angleDiff > 360) angleDiff -= 360
    const largeArc = angleDiff > 180 ? 1 : 0

    const arcPath = `M ${startArcX} ${startArcY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${endArcX} ${endArcY}`

    const midAngle = (startAngle + endAngle) / 2
    const labelRadius = arcRadius + 12
    const angleLabelX = origin.x + labelRadius * Math.cos(midAngle)
    const angleLabelY = origin.y - labelRadius * Math.sin(midAngle)

    return (
      <motion.g
        className="force-angle-arc"
        initial="hidden"
        animate={controls}
        variants={fadeVariants}
      >
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
        />
        <text
          x={angleLabelX}
          y={angleLabelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill={color}
          fontWeight={500}
        >
          {Math.abs(Math.round(force.angle - referenceAngle))}°
        </text>
      </motion.g>
    )
  }

  // Determine which animation variant set to use
  const getAnimationVariants = () => {
    if (animation === 'draw') return shaftDrawVariants
    if (animation === 'fade') return fadeVariants
    if (animation === 'pulse') return pulseVariants
    return undefined
  }

  const animVariants = getAnimationVariants()

  return (
    <g className={`force-vector ${highlighted ? 'highlighted' : ''} ${className}`}>
      {/* Gradient Definitions */}
      <defs>
        {/* Arrow shaft gradient - darker at tip */}
        <linearGradient
          id={gradientId}
          x1={origin.x}
          y1={origin.y}
          x2={endX}
          y2={endY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={forceThemeColors.light} />
          <stop offset="100%" stopColor={forceThemeColors.dark} />
        </linearGradient>

        {/* Glow filter for highlights */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Angle arc */}
      {renderAngleArc()}

      {/* Glow effect for highlighted state */}
      {highlighted && (
        <motion.line
          x1={origin.x}
          y1={origin.y}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth={strokeWidth + 6}
          strokeLinecap="round"
          opacity={0.3}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
        />
      )}

      {/* Main arrow shaft with draw animation */}
      <motion.line
        ref={lineRef}
        x1={origin.x}
        y1={origin.y}
        x2={endX}
        y2={endY}
        stroke={useGradient ? `url(#${gradientId})` : color}
        strokeWidth={highlighted ? strokeWidth + 1 : strokeWidth}
        strokeLinecap="round"
        filter={highlighted ? `url(#${glowId})` : undefined}
        initial={animation !== 'none' ? 'hidden' : 'visible'}
        animate={animation !== 'none' ? controls : undefined}
        variants={
          animation === 'draw'
            ? {
                hidden: { pathLength: 0, opacity: 0 },
                visible: {
                  pathLength: 1,
                  opacity: 1,
                  transition: {
                    pathLength: {
                      type: 'tween',
                      duration: reducedMotion ? 0 : animationDuration / 1000,
                      delay: reducedMotion ? 0 : animationDelay / 1000,
                      ease: [0.65, 0, 0.35, 1],
                    },
                    opacity: { duration: 0.1, delay: animationDelay / 1000 },
                  },
                },
              }
            : animVariants
        }
        style={{ opacity: animation === 'none' ? opacity : undefined }}
        pathLength={animation === 'draw' ? 1 : undefined}
      />

      {/* Arrowhead with pop animation */}
      <motion.polygon
        points={`${endX},${endY} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
        fill={useGradient ? forceThemeColors.dark : color}
        filter={highlighted ? `url(#${glowId})` : undefined}
        initial={animation !== 'none' ? 'hidden' : 'visible'}
        animate={animation !== 'none' ? controls : undefined}
        variants={animation === 'draw' ? arrowheadAnimVariants : animVariants}
        style={{
          opacity: animation === 'none' ? opacity : undefined,
          transformOrigin: `${endX}px ${endY}px`,
        }}
      />

      {/* Highlighted arrowhead glow */}
      {highlighted && (
        <polygon
          points={`${endX},${endY} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
          fill={color}
          opacity={0.3}
          style={{ transform: 'scale(1.3)', transformOrigin: `${endX}px ${endY}px` }}
        />
      )}

      {/* Label - integrated near arrow tip (Spatial Contiguity) */}
      {showLabel && (
        <motion.g
          className="force-label"
          initial={animation !== 'none' ? 'hidden' : 'visible'}
          animate={animation !== 'none' ? controls : undefined}
          variants={labelVariants}
        >
          {/* Label background pill */}
          <rect
            x={labelX - 18}
            y={labelY - 11}
            width={36}
            height={22}
            fill="white"
            opacity={0.95}
            rx={4}
            style={{ filter: SHADOWS.soft }}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={highlighted ? 600 : 500}
            fontFamily="'Inter', system-ui, sans-serif"
            fill={color}
          >
            {symbol}
            {subscript && (
              <tspan fontSize={10} dy={4} fontWeight={400}>
                {subscript}
              </tspan>
            )}
          </text>
        </motion.g>
      )}

      {/* Magnitude value - along the shaft */}
      {showMagnitude && (
        <motion.g
          initial={animation !== 'none' ? 'hidden' : 'visible'}
          animate={animation !== 'none' ? controls : undefined}
          variants={labelVariants}
        >
          <rect
            x={magLabelX - 22}
            y={magLabelY - 9}
            width={44}
            height={18}
            fill="white"
            opacity={0.9}
            rx={3}
          />
          <text
            x={magLabelX}
            y={magLabelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            fill="#4b5563"
          >
            {(force.magnitude ?? 0).toFixed(1)} N
          </text>
        </motion.g>
      )}
    </g>
  )
}

export default ForceVector
