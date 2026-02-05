'use client'

import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { parse } from 'mathjs'
import type { CoordinatePlaneData, CoordinatePlaneErrorHighlight } from '@/types'
import {
  COLORS,
  SHADOWS,
  hexToRgba,
  getSubjectColor,
  getAdaptiveLineWeight,
} from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { createPathDrawVariants, prefersReducedMotion } from '@/lib/diagram-animations'

interface CoordinatePlaneDataWithErrors extends CoordinatePlaneData {
  errorHighlight?: CoordinatePlaneErrorHighlight
}

interface CoordinatePlaneProps {
  data: CoordinatePlaneDataWithErrors
  className?: string
  width?: number
  height?: number
  /** Enable curve draw animation */
  animateCurves?: boolean
  /** Animation duration for curve drawing in ms */
  animationDuration?: number
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
}

/**
 * CoordinatePlane - Enhanced SVG component for 2D coordinate graphs
 *
 * Features:
 * - mathjs-powered expression parser for full math support
 * - Desmos-style grid with major/minor distinction
 * - Framer Motion curve drawing animations
 * - Professional visual design with gradients
 * - Error highlighting for wrong/correct answers
 *
 * Supported expressions:
 * - Basic: x, 2x+3, -x+5
 * - Quadratic: x^2, 2x^2+3x-1
 * - Trigonometric: sin(x), cos(x), tan(x), sec(x), csc(x), cot(x)
 * - Inverse trig: asin(x), acos(x), atan(x)
 * - Exponential: exp(x), e^x, 2^x
 * - Logarithmic: log(x), ln(x), log10(x)
 * - Roots: sqrt(x), nthRoot(x, n)
 * - Special: abs(x), floor(x), ceil(x), sign(x)
 * - Complex: sin(x)*cos(x), x^2*exp(-x)
 */
export function CoordinatePlane({
  data,
  className = '',
  width = 400,
  height = 400,
  animateCurves = true,
  animationDuration = 800,
  subject = 'math',
  complexity = 'middle_school',
}: CoordinatePlaneProps) {
  const {
    xMin,
    xMax,
    yMin,
    yMax,
    points = [],
    lines = [],
    curves = [],
    title,
    xLabel = 'x',
    yLabel = 'y',
    showGrid = true,
    errorHighlight,
  } = data

  const reducedMotion = prefersReducedMotion()

  // Subject-coded colors and adaptive line weight
  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Padding and dimensions
  const padding = { left: 50, right: 30, top: 40, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Guard against degenerate ranges (division by zero)
  const xRange = xMax - xMin
  const yRange = yMax - yMin
  const safeXRange = Math.abs(xRange) < 1e-10 ? 1 : xRange
  const safeYRange = Math.abs(yRange) < 1e-10 ? 1 : yRange

  // Convert coordinates to SVG coordinates
  const xToSvg = useCallback(
    (x: number): number => {
      const ratio = (x - xMin) / safeXRange
      return padding.left + ratio * plotWidth
    },
    [xMin, safeXRange, plotWidth]
  )

  const yToSvg = useCallback(
    (y: number): number => {
      const ratio = (y - yMin) / safeYRange
      return padding.top + plotHeight - ratio * plotHeight
    },
    [yMin, safeYRange, plotHeight]
  )

  // Find origin position (if visible)
  const originX = xToSvg(0)
  const originY = yToSvg(0)
  const showXAxis = yMin <= 0 && yMax >= 0
  const showYAxis = xMin <= 0 && xMax >= 0

  // Generate grid lines with major/minor distinction (Desmos-style)
  const gridData = useMemo(() => {
    const xRange = xMax - xMin
    const yRange = yMax - yMin

    // Calculate appropriate tick intervals
    const getTickInterval = (range: number): { major: number; minor: number } => {
      if (range <= 5) return { major: 1, minor: 0.5 }
      if (range <= 10) return { major: 2, minor: 1 }
      if (range <= 20) return { major: 5, minor: 1 }
      if (range <= 50) return { major: 10, minor: 2 }
      if (range <= 100) return { major: 20, minor: 5 }
      return { major: 50, minor: 10 }
    }

    const xIntervals = getTickInterval(xRange)
    const yIntervals = getTickInterval(yRange)

    const xMajorTicks: number[] = []
    const xMinorTicks: number[] = []
    const yMajorTicks: number[] = []
    const yMinorTicks: number[] = []

    // Generate X ticks
    for (let x = Math.ceil(xMin / xIntervals.minor) * xIntervals.minor; x <= xMax; x += xIntervals.minor) {
      const rounded = Math.round(x * 1000) / 1000 // Avoid floating point issues
      if (Math.abs(rounded % xIntervals.major) < 0.001) {
        xMajorTicks.push(rounded)
      } else {
        xMinorTicks.push(rounded)
      }
    }

    // Generate Y ticks
    for (let y = Math.ceil(yMin / yIntervals.minor) * yIntervals.minor; y <= yMax; y += yIntervals.minor) {
      const rounded = Math.round(y * 1000) / 1000
      if (Math.abs(rounded % yIntervals.major) < 0.001) {
        yMajorTicks.push(rounded)
      } else {
        yMinorTicks.push(rounded)
      }
    }

    return { xMajorTicks, xMinorTicks, yMajorTicks, yMinorTicks, xIntervals, yIntervals }
  }, [xMin, xMax, yMin, yMax])

  /**
   * Evaluate a mathematical expression using mathjs
   * Falls back to basic parsing if mathjs fails
   */
  const evaluateExpression = useCallback((expression: string, x: number): number | null => {
    try {
      // Pre-process expression for common notation
      let expr = expression
        .replace(/\^/g, '^') // Ensure proper exponent
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/√/g, 'sqrt')
        .replace(/π/g, 'pi')
        .replace(/e\^/g, 'exp(') // Convert e^x to exp(x)

      // Handle e^(...) by adding closing paren
      if (expr.includes('exp(') && !expr.includes('exp(x)')) {
        // Count parens and add if needed
        const expIndex = expr.indexOf('exp(')
        if (expIndex !== -1 && !expr.substring(expIndex).includes(')')) {
          expr = expr + ')'
        }
      }

      // Parse and evaluate using mathjs
      const node = parse(expr)
      const result = node.evaluate({ x })

      // Handle complex numbers or invalid results
      if (typeof result === 'object' && 'im' in result) {
        return null // Complex number
      }

      return typeof result === 'number' && isFinite(result) ? result : null
    } catch {
      // Fallback to simple evaluation for basic cases
      try {
        const simpleExpr = expression.toLowerCase().replace(/\s/g, '')

        if (simpleExpr.includes('sin')) {
          return Math.sin(x)
        }
        if (simpleExpr.includes('cos')) {
          return Math.cos(x)
        }
        if (simpleExpr === 'x') {
          return x
        }
        if (!simpleExpr.includes('x')) {
          return parseFloat(expression)
        }

        return null
      } catch {
        return null
      }
    }
  }, [])

  /**
   * Generate SVG path for a curve expression
   */
  const generateCurvePoints = useCallback(
    (expression: string, domain?: { min: number; max: number }): string => {
      const domainMin = domain?.min ?? xMin
      const domainMax = domain?.max ?? xMax
      const numPoints = 200 // Higher resolution for smooth curves
      const step = (domainMax - domainMin) / numPoints
      const pathPoints: string[] = []
      let isFirst = true

      for (let i = 0; i <= numPoints; i++) {
        const x = domainMin + i * step
        const y = evaluateExpression(expression, x)

        if (y !== null && y >= yMin - (yMax - yMin) * 0.5 && y <= yMax + (yMax - yMin) * 0.5) {
          const svgX = xToSvg(x)
          const svgY = yToSvg(y)

          // Clamp to visible area with some margin
          const clampedY = Math.max(padding.top - 20, Math.min(height - padding.bottom + 20, svgY))

          pathPoints.push(`${isFirst ? 'M' : 'L'} ${svgX.toFixed(2)} ${clampedY.toFixed(2)}`)
          isFirst = false
        } else {
          // Break the path for discontinuities
          isFirst = true
        }
      }

      return pathPoints.join(' ')
    },
    [xMin, xMax, yMin, yMax, xToSvg, yToSvg, evaluateExpression, height]
  )

  // Animation variants for curves
  const curveDrawVariants = useMemo(
    () =>
      createPathDrawVariants(reducedMotion ? 0 : animationDuration / 1000, 0),
    [animationDuration, reducedMotion]
  )

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`coordinate-plane ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
      role="img"
      aria-label={`Coordinate plane${title ? `: ${title}` : ''} with x from ${xMin} to ${xMax} and y from ${yMin} to ${yMax}`}
    >
      {/* Definitions */}
      <defs>
        {/* Background gradient */}
        <linearGradient id="coord-bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>

        {/* Curve gradients */}
        {curves.map((curve, index) => (
          <linearGradient
            key={`curve-gradient-${index}`}
            id={`curve-gradient-${index}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={curve.color || subjectColors.light} />
            <stop offset="100%" stopColor={curve.color || subjectColors.dark} />
          </linearGradient>
        ))}

        {/* Point glow filter */}
        <filter id="coord-point-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#coord-bg-gradient)" rx={12} />

      {/* Title */}
      {title && (
        <motion.text
          x={width / 2}
          y={24}
          textAnchor="middle"
          fontSize={15}
          fontWeight="600"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.gray[800]}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.text>
      )}

      {/* Minor grid lines (Desmos-style) */}
      {showGrid && (
        <g opacity={0.45}>
          {/* Vertical minor grid lines */}
          {gridData.xMinorTicks.map((x) => (
            <line
              key={`grid-v-minor-${x}`}
              x1={xToSvg(x)}
              y1={padding.top}
              x2={xToSvg(x)}
              y2={height - padding.bottom}
              stroke={COLORS.gray[300]}
              strokeWidth={0.75}
            />
          ))}
          {/* Horizontal minor grid lines */}
          {gridData.yMinorTicks.map((y) => (
            <line
              key={`grid-h-minor-${y}`}
              x1={padding.left}
              y1={yToSvg(y)}
              x2={width - padding.right}
              y2={yToSvg(y)}
              stroke={COLORS.gray[300]}
              strokeWidth={0.75}
            />
          ))}
        </g>
      )}

      {/* Major grid lines (more visible) */}
      {showGrid && (
        <g opacity={0.65}>
          {/* Vertical major grid lines */}
          {gridData.xMajorTicks.map((x) =>
            x === 0 ? null : (
              <line
                key={`grid-v-major-${x}`}
                x1={xToSvg(x)}
                y1={padding.top}
                x2={xToSvg(x)}
                y2={height - padding.bottom}
                stroke={COLORS.gray[300]}
                strokeWidth={1}
              />
            )
          )}
          {/* Horizontal major grid lines */}
          {gridData.yMajorTicks.map((y) =>
            y === 0 ? null : (
              <line
                key={`grid-h-major-${y}`}
                x1={padding.left}
                y1={yToSvg(y)}
                x2={width - padding.right}
                y2={yToSvg(y)}
                stroke={COLORS.gray[300]}
                strokeWidth={1}
              />
            )
          )}
        </g>
      )}

      {/* X Axis (prominent) */}
      <line
        x1={padding.left}
        y1={showXAxis ? originY : height - padding.bottom}
        x2={width - padding.right}
        y2={showXAxis ? originY : height - padding.bottom}
        stroke={COLORS.gray[700]}
        strokeWidth={adaptiveLineWeight}
      />
      {/* X axis arrow */}
      <polygon
        points={`${width - padding.right + 10},${showXAxis ? originY : height - padding.bottom} ${width - padding.right},${(showXAxis ? originY : height - padding.bottom) - 5} ${width - padding.right},${(showXAxis ? originY : height - padding.bottom) + 5}`}
        fill={COLORS.gray[700]}
      />
      {/* X label */}
      <text
        x={width - padding.right + 18}
        y={(showXAxis ? originY : height - padding.bottom) + 5}
        fontSize={14}
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight={500}
        fill={COLORS.gray[600]}
      >
        {xLabel}
      </text>

      {/* Y Axis (prominent) */}
      <line
        x1={showYAxis ? originX : padding.left}
        y1={padding.top}
        x2={showYAxis ? originX : padding.left}
        y2={height - padding.bottom}
        stroke={COLORS.gray[700]}
        strokeWidth={adaptiveLineWeight}
      />
      {/* Y axis arrow */}
      <polygon
        points={`${showYAxis ? originX : padding.left},${padding.top - 10} ${(showYAxis ? originX : padding.left) - 5},${padding.top} ${(showYAxis ? originX : padding.left) + 5},${padding.top}`}
        fill={COLORS.gray[700]}
      />
      {/* Y label */}
      <text
        x={(showYAxis ? originX : padding.left) - 5}
        y={padding.top - 18}
        textAnchor="middle"
        fontSize={14}
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight={500}
        fill={COLORS.gray[600]}
      >
        {yLabel}
      </text>

      {/* X axis ticks and labels (major only) */}
      {gridData.xMajorTicks.map((x) => {
        if (x === 0 && showYAxis) return null
        const svgX = xToSvg(x)
        const tickY = showXAxis ? originY : height - padding.bottom
        return (
          <g key={`x-tick-${x}`}>
            <line
              x1={svgX}
              y1={tickY - 4}
              x2={svgX}
              y2={tickY + 4}
              stroke={COLORS.gray[600]}
              strokeWidth={1.5}
            />
            <text
              x={svgX}
              y={tickY + 18}
              textAnchor="middle"
              fontSize={11}
              fontFamily="'JetBrains Mono', monospace"
              fill={COLORS.gray[500]}
            >
              {Number.isInteger(x) ? x : x.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* Y axis ticks and labels (major only) */}
      {gridData.yMajorTicks.map((y) => {
        if (y === 0 && showXAxis) return null
        const svgY = yToSvg(y)
        const tickX = showYAxis ? originX : padding.left
        return (
          <g key={`y-tick-${y}`}>
            <line
              x1={tickX - 4}
              y1={svgY}
              x2={tickX + 4}
              y2={svgY}
              stroke={COLORS.gray[600]}
              strokeWidth={1.5}
            />
            <text
              x={tickX - 10}
              y={svgY + 4}
              textAnchor="end"
              fontSize={11}
              fontFamily="'JetBrains Mono', monospace"
              fill={COLORS.gray[500]}
            >
              {Number.isInteger(y) ? y : y.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* Origin marker */}
      {showXAxis && showYAxis && (
        <>
          <circle cx={originX} cy={originY} r={4} fill={COLORS.gray[400]} />
          <text
            x={originX - 12}
            y={originY + 18}
            textAnchor="end"
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            fill={COLORS.gray[500]}
          >
            0
          </text>
        </>
      )}

      {/* Curves with draw animation */}
      {curves.map((curve, index) => {
        const pathD = generateCurvePoints(curve.expression, curve.domain)
        return (
          <motion.path
            key={`curve-${index}`}
            d={pathD}
            fill="none"
            stroke={`url(#curve-gradient-${index})`}
            strokeWidth={adaptiveLineWeight - 0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animateCurves && !reducedMotion ? 'hidden' : 'visible'}
            animate="visible"
            variants={curveDrawVariants}
            style={{ filter: SHADOWS.soft }}
          />
        )
      })}

      {/* Lines */}
      {lines.map((line, index) => {
        const [p1, p2] = line.points
        let x1 = xToSvg(p1.x)
        let y1 = yToSvg(p1.y)
        let x2 = xToSvg(p2.x)
        let y2 = yToSvg(p2.y)

        // Extend line to edges if it's a full line
        if (line.type === 'line' && x1 !== x2) {
          const slope = (y2 - y1) / (x2 - x1)
          x1 = padding.left
          y1 = slope * (x1 - xToSvg(p1.x)) + yToSvg(p1.y)
          x2 = width - padding.right
          y2 = slope * (x2 - xToSvg(p1.x)) + yToSvg(p1.y)
        }

        return (
          <motion.line
            key={`line-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={line.color || subjectColors.primary}
            strokeWidth={2}
            strokeDasharray={line.dashed ? '6,4' : undefined}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.5 }}
          />
        )
      })}

      {/* Points */}
      {points.map((point, index) => {
        const svgX = xToSvg(point.x)
        const svgY = yToSvg(point.y)
        const color = point.color || subjectColors.primary

        return (
          <motion.g
            key={`point-${index}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 20,
              delay: reducedMotion ? 0 : index * 0.1,
            }}
          >
            {/* Outer glow */}
            <circle cx={svgX} cy={svgY} r={10} fill={hexToRgba(color, 0.2)} />
            {/* Point */}
            <circle cx={svgX} cy={svgY} r={6} fill={color} filter="url(#coord-point-glow)" />
            {/* Inner highlight */}
            <circle cx={svgX - 1.5} cy={svgY - 1.5} r={2} fill="rgba(255,255,255,0.5)" />
            {point.label && (
              <text
                x={svgX + 12}
                y={svgY - 10}
                fontSize={12}
                fontFamily="'Inter', system-ui, sans-serif"
                fontWeight={500}
                fill={color}
              >
                {point.label}
              </text>
            )}
          </motion.g>
        )
      })}

      {/* Error highlighting - Wrong points (shown with X) */}
      {errorHighlight?.wrongPoints?.map((point, index) => {
        const svgX = xToSvg(point.x)
        const svgY = yToSvg(point.y)
        return (
          <motion.g
            key={`wrong-point-${index}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <circle cx={svgX} cy={svgY} r={14} fill={hexToRgba(COLORS.error[500], 0.15)} />
            <circle cx={svgX} cy={svgY} r={8} fill={hexToRgba(COLORS.error[500], 0.3)} />
            <line
              x1={svgX - 5}
              y1={svgY - 5}
              x2={svgX + 5}
              y2={svgY + 5}
              stroke={COLORS.error[500]}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={svgX + 5}
              y1={svgY - 5}
              x2={svgX - 5}
              y2={svgY + 5}
              stroke={COLORS.error[500]}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {point.errorLabel && (
              <text
                x={svgX}
                y={svgY - 20}
                textAnchor="middle"
                fontSize={11}
                fontFamily="'Inter', system-ui, sans-serif"
                fontWeight={500}
                fill={COLORS.error[600]}
              >
                {point.errorLabel}
              </text>
            )}
          </motion.g>
        )
      })}

      {/* Error highlighting - Correct points (shown with checkmark) */}
      {errorHighlight?.correctPoints?.map((point, index) => {
        const svgX = xToSvg(point.x)
        const svgY = yToSvg(point.y)
        return (
          <motion.g
            key={`correct-point-${index}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <circle cx={svgX} cy={svgY} r={14} fill={hexToRgba(COLORS.success[500], 0.15)} />
            <circle cx={svgX} cy={svgY} r={8} fill={COLORS.success[500]} />
            <path
              d={`M ${svgX - 3} ${svgY} L ${svgX - 0.5} ${svgY + 3} L ${svgX + 4} ${svgY - 3}`}
              stroke="white"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {point.correctLabel && (
              <text
                x={svgX}
                y={svgY - 20}
                textAnchor="middle"
                fontSize={11}
                fontFamily="'Inter', system-ui, sans-serif"
                fontWeight={500}
                fill={COLORS.success[600]}
              >
                {point.correctLabel}
              </text>
            )}
          </motion.g>
        )
      })}

      {/* Error highlighting - Wrong curves (dashed red) */}
      {errorHighlight?.wrongCurves?.map((curve, index) => (
        <motion.path
          key={`wrong-curve-${index}`}
          d={generateCurvePoints(curve.expression, curve.domain)}
          fill="none"
          stroke={COLORS.error[500]}
          strokeWidth={2.5}
          strokeDasharray="6,4"
          opacity={0.8}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
        />
      ))}

      {/* Error highlighting - Correct curves (solid green) */}
      {errorHighlight?.correctCurves?.map((curve, index) => (
        <motion.path
          key={`correct-curve-${index}`}
          d={generateCurvePoints(curve.expression, curve.domain)}
          fill="none"
          stroke={COLORS.success[500]}
          strokeWidth={3}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
        />
      ))}
    </svg>
  )
}

export default CoordinatePlane
