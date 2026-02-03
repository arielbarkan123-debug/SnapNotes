'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { NumberLineData, NumberLineErrorHighlight } from '@/types'
import { useVisualComplexity, useComplexityAnimations } from '@/hooks/useVisualComplexity'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { CONCRETE_ICONS } from '@/lib/visual-complexity'
import { detectCollisions, type BoundingBox, type LayoutElement } from '@/lib/visual-learning'

interface NumberLineDataWithErrors extends NumberLineData {
  errorHighlight?: NumberLineErrorHighlight
}

interface NumberLineProps {
  data: NumberLineDataWithErrors
  className?: string
  width?: number
  height?: number
  /** Override complexity level for this diagram */
  complexity?: VisualComplexityLevel
  /** Whether to animate on mount */
  animate?: boolean
}

/**
 * NumberLine - SVG component for displaying number lines
 * Used for inequalities, solution sets, and intervals
 *
 * Now with age-adaptive visuals:
 * - Elementary: Larger fonts, concrete examples, slower animations
 * - Middle/High School: Standard display
 * - Advanced: Compact, instant animations
 */
export function NumberLine({
  data,
  className = '',
  width = 400,
  height = 80,
  complexity: forcedComplexity,
  animate = true,
}: NumberLineProps) {
  const { min, max, points = [], intervals = [], title, errorHighlight } = data

  // Get complexity-based settings
  const {
    complexity,
    fontSize,
    showConcreteExamples,
    colors,
  } = useVisualComplexity({ forceComplexity: forcedComplexity })

  const { duration, stagger, enabled: animationsEnabled } = useComplexityAnimations()

  // Adjust dimensions based on complexity
  const isElementary = complexity === 'elementary'
  const adjustedHeight = isElementary ? Math.max(height, 120) : height

  // Padding and dimensions (larger for elementary)
  const padding = {
    left: isElementary ? 50 : 40,
    right: isElementary ? 50 : 40,
    top: isElementary ? 40 : 30,
    bottom: isElementary ? 30 : 20,
  }
  const lineY = adjustedHeight - padding.bottom - 15
  const lineStartX = padding.left
  const lineEndX = width - padding.right
  const lineLength = lineEndX - lineStartX

  // Convert value to x coordinate
  const valueToX = (value: number): number => {
    const ratio = (value - min) / (max - min)
    return lineStartX + ratio * lineLength
  }

  // Generate tick marks
  const range = max - min
  const tickInterval = range <= 10 ? 1 : range <= 20 ? 2 : range <= 50 ? 5 : 10
  const ticks: number[] = []
  for (let v = Math.ceil(min / tickInterval) * tickInterval; v <= max; v += tickInterval) {
    ticks.push(v)
  }

  // Animation variants for Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: animationsEnabled ? duration / 1000 : 0,
        staggerChildren: animationsEnabled ? stagger / 1000 : 0,
      },
    },
  }

  const pointVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: isElementary ? 150 : 300,
        damping: isElementary ? 15 : 25,
      },
    },
  }

  // Generate concrete examples for elementary level
  const renderConcreteExample = (value: number, x: number, y: number) => {
    if (!showConcreteExamples || !isElementary) return null
    const absValue = Math.abs(Math.round(value))
    if (absValue > 10) return null // Too many to show

    const icon = value >= 0 ? CONCRETE_ICONS.apple : CONCRETE_ICONS.star
    const spacing = 12
    const startX = x - ((absValue - 1) * spacing) / 2

    return (
      <g>
        {Array.from({ length: absValue }).map((_, i) => (
          <text
            key={`concrete-${i}`}
            x={startX + i * spacing}
            y={y - 25}
            textAnchor="middle"
            fontSize={10}
          >
            {icon}
          </text>
        ))}
      </g>
    )
  }

  // Calculate non-overlapping label positions using layout engine
  const labelPositions = useMemo(() => {
    const positions = new Map<number, { y: number; stagger: boolean }>()
    const labelHeight = isElementary ? 20 : 16
    const labelWidth = 30 // Approximate width of a label
    const baseY = lineY - (isElementary ? 16 : 12)

    // Create layout elements for collision detection
    const elements: LayoutElement[] = points
      .filter(p => p.label)
      .map((point, i) => {
        const x = valueToX(point.value)
        const bounds: BoundingBox = {
          x: x - labelWidth / 2,
          y: baseY - labelHeight,
          width: labelWidth,
          height: labelHeight,
        }
        return {
          id: `label-${i}`,
          type: 'label' as const,
          position: { x, y: baseY },
          bounds,
          priority: 1,
        }
      })

    // Check for collisions and stagger if needed
    const collisions = detectCollisions(elements)

    points.forEach((point, i) => {
      const hasCollision = collisions.some(
        c => c.element1 === `label-${i}` || c.element2 === `label-${i}`
      )
      // Stagger labels that collide by moving alternate ones higher
      const shouldStagger = hasCollision && i % 2 === 1
      positions.set(point.value, {
        y: shouldStagger ? baseY - labelHeight - 4 : baseY,
        stagger: shouldStagger,
      })
    })

    return positions
  }, [points, lineY, isElementary, valueToX])

  return (
    <motion.svg
      width={width}
      height={adjustedHeight}
      viewBox={`0 0 ${width} ${adjustedHeight}`}
      className={`text-gray-800 dark:text-gray-200 ${className}`}
      initial={animate && animationsEnabled ? 'hidden' : 'visible'}
      animate="visible"
      variants={containerVariants}
    >
      {/* Title */}
      {title && (
        <motion.text
          x={width / 2}
          y={isElementary ? 20 : 15}
          textAnchor="middle"
          className="fill-current font-medium"
          style={{ fontSize: fontSize.normal }}
          variants={pointVariants}
        >
          {title}
        </motion.text>
      )}

      {/* Intervals (shaded regions) */}
      {intervals.map((interval, index) => {
        const startX = interval.start !== null ? valueToX(interval.start) : lineStartX
        const endX = interval.end !== null ? valueToX(interval.end) : lineEndX

        return (
          <g key={`interval-${index}`}>
            {/* Shaded region */}
            <rect
              x={startX}
              y={lineY - 8}
              width={endX - startX}
              height={16}
              fill={interval.color || '#3B82F6'}
              opacity={0.3}
            />
            {/* Interval line */}
            <line
              x1={startX}
              y1={lineY}
              x2={endX}
              y2={lineY}
              stroke={interval.color || '#3B82F6'}
              strokeWidth={4}
            />
            {/* Start arrow if extending to negative infinity */}
            {interval.start === null && (
              <polygon
                points={`${lineStartX},${lineY} ${lineStartX + 10},${lineY - 5} ${lineStartX + 10},${lineY + 5}`}
                fill={interval.color || '#3B82F6'}
              />
            )}
            {/* End arrow if extending to positive infinity */}
            {interval.end === null && (
              <polygon
                points={`${lineEndX},${lineY} ${lineEndX - 10},${lineY - 5} ${lineEndX - 10},${lineY + 5}`}
                fill={interval.color || '#3B82F6'}
              />
            )}
          </g>
        )
      })}

      {/* Main number line */}
      <line
        x1={lineStartX}
        y1={lineY}
        x2={lineEndX}
        y2={lineY}
        stroke="currentColor"
        strokeWidth={2}
      />

      {/* Left arrow */}
      <polygon
        points={`${lineStartX - 8},${lineY} ${lineStartX},${lineY - 4} ${lineStartX},${lineY + 4}`}
        fill="currentColor"
      />

      {/* Right arrow */}
      <polygon
        points={`${lineEndX + 8},${lineY} ${lineEndX},${lineY - 4} ${lineEndX},${lineY + 4}`}
        fill="currentColor"
      />

      {/* Tick marks and labels */}
      {ticks.map((tick, index) => {
        const x = valueToX(tick)
        return (
          <motion.g
            key={`tick-${tick}`}
            variants={pointVariants}
            custom={index}
          >
            <line
              x1={x}
              y1={lineY - (isElementary ? 6 : 5)}
              x2={x}
              y2={lineY + (isElementary ? 6 : 5)}
              stroke="currentColor"
              strokeWidth={isElementary ? 2 : 1}
            />
            <text
              x={x}
              y={lineY + (isElementary ? 22 : 18)}
              textAnchor="middle"
              className="fill-current"
              style={{ fontSize: fontSize.small }}
            >
              {tick}
            </text>
            {/* Concrete example for elementary level */}
            {renderConcreteExample(tick, x, lineY)}
          </motion.g>
        )
      })}

      {/* Points */}
      {points.map((point, index) => {
        const x = valueToX(point.value)
        const isFilled = point.style === 'filled'
        const pointRadius = isElementary ? 8 : 6

        return (
          <motion.g
            key={`point-${index}`}
            variants={pointVariants}
            custom={index}
          >
            {/* Point circle */}
            <motion.circle
              cx={x}
              cy={lineY}
              r={pointRadius}
              fill={isFilled ? colors.primary : 'white'}
              stroke={colors.primary}
              strokeWidth={isElementary ? 3 : 2}
              whileHover={animationsEnabled ? { scale: 1.2 } : undefined}
            />
            {/* Point label with smart positioning */}
            {point.label && (
              <>
                {/* Connector line for staggered labels */}
                {labelPositions.get(point.value)?.stagger && (
                  <line
                    x1={x}
                    y1={lineY - (isElementary ? 10 : 8)}
                    x2={x}
                    y2={labelPositions.get(point.value)?.y ?? lineY - 12}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                    opacity={0.5}
                  />
                )}
                <text
                  x={x}
                  y={labelPositions.get(point.value)?.y ?? lineY - (isElementary ? 16 : 12)}
                  textAnchor="middle"
                  className="fill-red-600 dark:fill-red-400 font-medium"
                  style={{ fontSize: fontSize.small }}
                >
                  {point.label}
                </text>
              </>
            )}
            {/* Concrete example for elementary level */}
            {renderConcreteExample(point.value, x, lineY)}
          </motion.g>
        )
      })}

      {/* Interval endpoint markers */}
      {intervals.map((interval, index) => {
        const elements = []

        if (interval.start !== null) {
          const x = valueToX(interval.start)
          elements.push(
            <circle
              key={`interval-start-${index}`}
              cx={x}
              cy={lineY}
              r={5}
              fill={interval.startInclusive ? (interval.color || '#3B82F6') : 'white'}
              stroke={interval.color || '#3B82F6'}
              strokeWidth={2}
            />
          )
        }

        if (interval.end !== null) {
          const x = valueToX(interval.end)
          elements.push(
            <circle
              key={`interval-end-${index}`}
              cx={x}
              cy={lineY}
              r={5}
              fill={interval.endInclusive ? (interval.color || '#3B82F6') : 'white'}
              stroke={interval.color || '#3B82F6'}
              strokeWidth={2}
            />
          )
        }

        return elements
      })}

      {/* Error highlighting - Wrong points (shown with X) */}
      {errorHighlight?.wrongPoints?.map((point, index) => {
        const x = valueToX(point.value)
        return (
          <g key={`wrong-point-${index}`}>
            {/* Red X mark */}
            <line
              x1={x - 6}
              y1={lineY - 6}
              x2={x + 6}
              y2={lineY + 6}
              stroke="#EF4444"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={x + 6}
              y1={lineY - 6}
              x2={x - 6}
              y2={lineY + 6}
              stroke="#EF4444"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Error label */}
            {point.errorLabel && (
              <text
                x={x}
                y={lineY - 16}
                textAnchor="middle"
                className="fill-red-600 text-xs font-medium"
              >
                {point.errorLabel}
              </text>
            )}
          </g>
        )
      })}

      {/* Error highlighting - Correct points (shown with checkmark) */}
      {errorHighlight?.correctPoints?.map((point, index) => {
        const x = valueToX(point.value)
        return (
          <g key={`correct-point-${index}`}>
            {/* Green circle with checkmark */}
            <circle
              cx={x}
              cy={lineY}
              r={8}
              fill="#22C55E"
              opacity={0.2}
            />
            <circle
              cx={x}
              cy={lineY}
              r={5}
              fill="#22C55E"
              stroke="white"
              strokeWidth={1}
            />
            {/* Checkmark */}
            <path
              d={`M ${x - 3} ${lineY} L ${x - 1} ${lineY + 2} L ${x + 3} ${lineY - 2}`}
              stroke="white"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Correct label */}
            {point.correctLabel && (
              <text
                x={x}
                y={lineY - 16}
                textAnchor="middle"
                className="fill-green-600 text-xs font-medium"
              >
                {point.correctLabel}
              </text>
            )}
          </g>
        )
      })}

      {/* Error highlighting - Wrong intervals */}
      {errorHighlight?.wrongIntervals?.map((interval, index) => {
        const startX = interval.start !== null ? valueToX(interval.start) : lineStartX
        const endX = interval.end !== null ? valueToX(interval.end) : lineEndX
        return (
          <g key={`wrong-interval-${index}`}>
            {/* Red dashed line */}
            <line
              x1={startX}
              y1={lineY - 12}
              x2={endX}
              y2={lineY - 12}
              stroke="#EF4444"
              strokeWidth={2}
              strokeDasharray="4,2"
            />
            {/* X marks at endpoints */}
            <text x={startX} y={lineY - 18} textAnchor="middle" className="fill-red-600 text-xs">✗</text>
            <text x={endX} y={lineY - 18} textAnchor="middle" className="fill-red-600 text-xs">✗</text>
          </g>
        )
      })}

      {/* Error highlighting - Correct intervals */}
      {errorHighlight?.correctIntervals?.map((interval, index) => {
        const startX = interval.start !== null ? valueToX(interval.start) : lineStartX
        const endX = interval.end !== null ? valueToX(interval.end) : lineEndX
        return (
          <motion.g
            key={`correct-interval-${index}`}
            variants={pointVariants}
          >
            {/* Green shaded region */}
            <rect
              x={startX}
              y={lineY - (isElementary ? 12 : 10)}
              width={endX - startX}
              height={isElementary ? 24 : 20}
              fill="#22C55E"
              opacity={0.15}
            />
            {/* Green solid line */}
            <line
              x1={startX}
              y1={lineY}
              x2={endX}
              y2={lineY}
              stroke="#22C55E"
              strokeWidth={isElementary ? 5 : 4}
            />
            {/* Checkmarks at endpoints */}
            <text
              x={startX}
              y={lineY - (isElementary ? 22 : 18)}
              textAnchor="middle"
              className="fill-green-600"
              style={{ fontSize: fontSize.small }}
            >
              {isElementary ? '👍' : '✓'}
            </text>
            <text
              x={endX}
              y={lineY - (isElementary ? 22 : 18)}
              textAnchor="middle"
              className="fill-green-600"
              style={{ fontSize: fontSize.small }}
            >
              {isElementary ? '👍' : '✓'}
            </text>
          </motion.g>
        )
      })}
    </motion.svg>
  )
}

export default NumberLine
