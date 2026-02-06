'use client'

import { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parse } from 'mathjs'
import type { CoordinatePlaneData, CoordinatePlaneErrorHighlight } from '@/types'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { SVGLabel } from '@/components/math/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoordinatePlaneDataWithErrors extends CoordinatePlaneData {
  errorHighlight?: CoordinatePlaneErrorHighlight
}

interface CoordinatePlaneProps {
  data: CoordinatePlaneDataWithErrors
  className?: string
  /** ViewBox width — SVG scales responsively to container */
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  grid: { en: 'Draw the grid', he: 'ציור הרשת' },
  axes: { en: 'Draw the axes', he: 'ציור הצירים' },
  curves: { en: 'Plot the curves', he: 'שרטוט הגרפים' },
  points: { en: 'Mark the points', he: 'סימון הנקודות' },
  labels: { en: 'Show labels', he: 'הצגת תוויות' },
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CoordinatePlane — Phase 2 Visual Learning Overhaul.
 *
 * Quality standard checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] pathLength draw animation
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 * - [x] Step-by-step progressive reveal with AnimatePresence
 * - [x] Uses shared SVG primitives (SVGPoint, SVGLabel)
 */
export function CoordinatePlane({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
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

  // Determine which step groups exist based on data
  const hasCurves = curves.length > 0 || lines.length > 0
  const hasPoints = points.length > 0
  const hasLabels = !!(
    title ||
    points.some((p) => p.label) ||
    xLabel ||
    yLabel
  )
  const hasErrors = !!(
    errorHighlight?.wrongPoints?.length ||
    errorHighlight?.correctPoints?.length ||
    errorHighlight?.wrongCurves?.length ||
    errorHighlight?.correctCurves?.length
  )

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    ]
    if (hasCurves) defs.push({ id: 'curves', label: STEP_LABELS.curves.en, labelHe: STEP_LABELS.curves.he })
    if (hasPoints) defs.push({ id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he })
    if (hasLabels) defs.push({ id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he })
    if (hasErrors) defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    return defs
  }, [hasCurves, hasPoints, hasLabels, hasErrors])

  // useDiagramBase — step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = { left: 50, right: 30, top: 40, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const safeXRange = Math.abs(xMax - xMin) < 1e-10 ? 1 : xMax - xMin
  const safeYRange = Math.abs(yMax - yMin) < 1e-10 ? 1 : yMax - yMin

  const xToSvg = useCallback(
    (x: number): number => padding.left + ((x - xMin) / safeXRange) * plotWidth,
    [xMin, safeXRange, plotWidth]
  )

  const yToSvg = useCallback(
    (y: number): number => padding.top + plotHeight - ((y - yMin) / safeYRange) * plotHeight,
    [yMin, safeYRange, plotHeight]
  )

  // Origin position (if visible)
  const originX = xToSvg(0)
  const originY = yToSvg(0)
  const showXAxis = yMin <= 0 && yMax >= 0
  const showYAxis = xMin <= 0 && xMax >= 0

  // Generate grid lines with major/minor distinction
  const gridData = useMemo(() => {
    const xRange = xMax - xMin
    const yRange = yMax - yMin

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

    for (let x = Math.ceil(xMin / xIntervals.minor) * xIntervals.minor; x <= xMax; x += xIntervals.minor) {
      const rounded = Math.round(x * 1000) / 1000
      if (Math.abs(rounded % xIntervals.major) < 0.001) {
        xMajorTicks.push(rounded)
      } else {
        xMinorTicks.push(rounded)
      }
    }

    for (let y = Math.ceil(yMin / yIntervals.minor) * yIntervals.minor; y <= yMax; y += yIntervals.minor) {
      const rounded = Math.round(y * 1000) / 1000
      if (Math.abs(rounded % yIntervals.major) < 0.001) {
        yMajorTicks.push(rounded)
      } else {
        yMinorTicks.push(rounded)
      }
    }

    return { xMajorTicks, xMinorTicks, yMajorTicks, yMinorTicks }
  }, [xMin, xMax, yMin, yMax])

  // ---------------------------------------------------------------------------
  // Expression evaluation
  // ---------------------------------------------------------------------------

  const evaluateExpression = useCallback((expression: string, x: number): number | null => {
    try {
      let expr = expression
        .replace(/\^/g, '^')
        .replace(/\u00b2/g, '^2')
        .replace(/\u00b3/g, '^3')
        .replace(/\u221a/g, 'sqrt')
        .replace(/\u03c0/g, 'pi')
        .replace(/e\^/g, 'exp(')

      if (expr.includes('exp(') && !expr.includes('exp(x)')) {
        const expIndex = expr.indexOf('exp(')
        if (expIndex !== -1 && !expr.substring(expIndex).includes(')')) {
          expr = expr + ')'
        }
      }

      const node = parse(expr)
      const result = node.evaluate({ x })

      if (typeof result === 'object' && 'im' in result) {
        return null
      }

      return typeof result === 'number' && isFinite(result) ? result : null
    } catch {
      try {
        const simpleExpr = expression.toLowerCase().replace(/\s/g, '')
        if (simpleExpr.includes('sin')) return Math.sin(x)
        if (simpleExpr.includes('cos')) return Math.cos(x)
        if (simpleExpr === 'x') return x
        if (!simpleExpr.includes('x')) return parseFloat(expression)
        return null
      } catch {
        return null
      }
    }
  }, [])

  const generateCurvePath = useCallback(
    (expression: string, domain?: { min: number; max: number }): string => {
      const domainMin = domain?.min ?? xMin
      const domainMax = domain?.max ?? xMax
      const numPoints = 200
      const step = (domainMax - domainMin) / numPoints
      const pathPoints: string[] = []
      let isFirst = true

      for (let i = 0; i <= numPoints; i++) {
        const x = domainMin + i * step
        const y = evaluateExpression(expression, x)

        if (y !== null && y >= yMin - (yMax - yMin) * 0.5 && y <= yMax + (yMax - yMin) * 0.5) {
          const svgX = xToSvg(x)
          const svgY = yToSvg(y)
          const clampedY = Math.max(padding.top - 20, Math.min(height - padding.bottom + 20, svgY))
          pathPoints.push(`${isFirst ? 'M' : 'L'} ${svgX.toFixed(2)} ${clampedY.toFixed(2)}`)
          isFirst = false
        } else {
          isFirst = true
        }
      }

      return pathPoints.join(' ')
    },
    [xMin, xMax, yMin, yMax, xToSvg, yToSvg, evaluateExpression, height]
  )

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="coordinate-plane"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* SVG Diagram */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Coordinate plane${title ? `: ${title}` : ''} with x from ${xMin} to ${xMax} and y from ${yMin} to ${yMax}`}
      >
        {/* Background */}
        <rect
          data-testid="cp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* ── Step 0: Grid ──────────────────────────────────────── */}
        <AnimatePresence>
          {showGrid && isVisible('grid') && (
            <motion.g
              data-testid="cp-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Minor grid lines */}
              <g opacity={0.45}>
                {gridData.xMinorTicks.map((x) => (
                  <line
                    key={`grid-v-minor-${x}`}
                    x1={xToSvg(x)} y1={padding.top}
                    x2={xToSvg(x)} y2={height - padding.bottom}
                    stroke="currentColor" strokeWidth={0.5} opacity={0.3}
                  />
                ))}
                {gridData.yMinorTicks.map((y) => (
                  <line
                    key={`grid-h-minor-${y}`}
                    x1={padding.left} y1={yToSvg(y)}
                    x2={width - padding.right} y2={yToSvg(y)}
                    stroke="currentColor" strokeWidth={0.5} opacity={0.3}
                  />
                ))}
              </g>

              {/* Major grid lines */}
              <g opacity={0.65}>
                {gridData.xMajorTicks.map((x) =>
                  x === 0 ? null : (
                    <line
                      key={`grid-v-major-${x}`}
                      x1={xToSvg(x)} y1={padding.top}
                      x2={xToSvg(x)} y2={height - padding.bottom}
                      stroke="currentColor" strokeWidth={0.75} opacity={0.5}
                    />
                  )
                )}
                {gridData.yMajorTicks.map((y) =>
                  y === 0 ? null : (
                    <line
                      key={`grid-h-major-${y}`}
                      x1={padding.left} y1={yToSvg(y)}
                      x2={width - padding.right} y2={yToSvg(y)}
                      stroke="currentColor" strokeWidth={0.75} opacity={0.5}
                    />
                  )
                )}
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Axes ──────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="cp-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* X axis line */}
              <motion.path
                d={`M ${padding.left} ${showXAxis ? originY : height - padding.bottom} L ${width - padding.right} ${showXAxis ? originY : height - padding.bottom}`}
                stroke="currentColor" strokeWidth={diagram.lineWeight} fill="none"
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />

              {/* X axis arrow */}
              <motion.polygon
                points={`${width - padding.right + 10},${showXAxis ? originY : height - padding.bottom} ${width - padding.right},${(showXAxis ? originY : height - padding.bottom) - 5} ${width - padding.right},${(showXAxis ? originY : height - padding.bottom) + 5}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
              />

              {/* X axis label */}
              <SVGLabel
                x={width - padding.right + 18}
                y={(showXAxis ? originY : height - padding.bottom) + 5}
                text={xLabel}
                fontSize={14}
                className="fill-current"
              />

              {/* Y axis line */}
              <motion.path
                d={`M ${showYAxis ? originX : padding.left} ${height - padding.bottom} L ${showYAxis ? originX : padding.left} ${padding.top}`}
                stroke="currentColor" strokeWidth={diagram.lineWeight} fill="none"
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />

              {/* Y axis arrow */}
              <motion.polygon
                points={`${showYAxis ? originX : padding.left},${padding.top - 10} ${(showYAxis ? originX : padding.left) - 5},${padding.top} ${(showYAxis ? originX : padding.left) + 5},${padding.top}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
              />

              {/* Y axis label */}
              <SVGLabel
                x={(showYAxis ? originX : padding.left) - 5}
                y={padding.top - 18}
                text={yLabel}
                textAnchor="middle"
                fontSize={14}
                className="fill-current"
              />

              {/* X axis tick marks and labels */}
              {gridData.xMajorTicks.map((x, index) => {
                if (x === 0 && showYAxis) return null
                const svgX = xToSvg(x)
                const tickY = showXAxis ? originY : height - padding.bottom
                return (
                  <motion.g
                    key={`x-tick-${x}`}
                    initial="hidden" animate="visible" variants={labelAppearVariants}
                    transition={{ delay: index * 0.02 }}
                  >
                    <line
                      x1={svgX} y1={tickY - 4} x2={svgX} y2={tickY + 4}
                      stroke="currentColor" strokeWidth={1.5}
                    />
                    <text
                      x={svgX} y={tickY + 18}
                      textAnchor="middle" className="fill-current"
                      style={{ fontSize: 11 }}
                    >
                      {Number.isInteger(x) ? x : x.toFixed(1)}
                    </text>
                  </motion.g>
                )
              })}

              {/* Y axis tick marks and labels */}
              {gridData.yMajorTicks.map((y, index) => {
                if (y === 0 && showXAxis) return null
                const svgY = yToSvg(y)
                const tickX = showYAxis ? originX : padding.left
                return (
                  <motion.g
                    key={`y-tick-${y}`}
                    initial="hidden" animate="visible" variants={labelAppearVariants}
                    transition={{ delay: index * 0.02 }}
                  >
                    <line
                      x1={tickX - 4} y1={svgY} x2={tickX + 4} y2={svgY}
                      stroke="currentColor" strokeWidth={1.5}
                    />
                    <text
                      x={tickX - 10} y={svgY + 4}
                      textAnchor="end" className="fill-current"
                      style={{ fontSize: 11 }}
                    >
                      {Number.isInteger(y) ? y : y.toFixed(1)}
                    </text>
                  </motion.g>
                )
              })}

              {/* Origin marker */}
              {showXAxis && showYAxis && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <circle cx={originX} cy={originY} r={3} fill="currentColor" />
                  <text
                    x={originX - 12} y={originY + 18}
                    textAnchor="end" className="fill-current"
                    style={{ fontSize: 11 }}
                  >
                    0
                  </text>
                </motion.g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Curves / Lines ────────────────────────────── */}
        <AnimatePresence>
          {hasCurves && isVisible('curves') && (
            <motion.g
              data-testid="cp-curves"
              initial="hidden"
              animate={isCurrent('curves') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Equation curves */}
              {curves.map((curve, index) => {
                const pathD = generateCurvePath(curve.expression, curve.domain)
                return (
                  <motion.path
                    key={`curve-${index}`}
                    data-testid={`cp-curve-${index}`}
                    d={pathD}
                    fill="none"
                    stroke={curve.color || diagram.colors.primary}
                    strokeWidth={diagram.lineWeight}
                    strokeLinecap="round" strokeLinejoin="round"
                    initial="hidden" animate="visible" variants={lineDrawVariants}
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

                if (line.type === 'line' && x1 !== x2) {
                  const slope = (y2 - y1) / (x2 - x1)
                  const refX = xToSvg(p1.x)
                  const refY = yToSvg(p1.y)
                  x1 = padding.left
                  y1 = slope * (x1 - refX) + refY
                  x2 = width - padding.right
                  y2 = slope * (x2 - refX) + refY
                }

                return (
                  <motion.path
                    key={`line-${index}`}
                    data-testid={`cp-line-${index}`}
                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                    fill="none"
                    stroke={line.color || diagram.colors.primary}
                    strokeWidth={diagram.lineWeight}
                    strokeDasharray={line.dashed ? '6,4' : undefined}
                    strokeLinecap="round"
                    initial="hidden" animate="visible" variants={lineDrawVariants}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Points ────────────────────────────────────── */}
        <AnimatePresence>
          {hasPoints && isVisible('points') && (
            <motion.g
              data-testid="cp-points"
              initial="hidden"
              animate={isCurrent('points') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {points.map((point, index) => {
                const svgX = xToSvg(point.x)
                const svgY = yToSvg(point.y)
                const color = point.color || diagram.colors.primary
                const pointId = (point as unknown as Record<string, unknown>).id as string | undefined

                return (
                  <motion.g
                    key={`point-${index}`}
                    data-testid={`cp-point-${pointId || index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.1 }}
                  >
                    <circle cx={svgX} cy={svgY} r={10} fill={color} opacity={0.15} />
                    <circle
                      data-testid={`cp-point-circle-${pointId || index}`}
                      cx={svgX} cy={svgY} r={6} fill={color} stroke={color} strokeWidth={2}
                    />
                    <circle cx={svgX - 1.5} cy={svgY - 1.5} r={2} fill="rgba(255,255,255,0.5)" />
                    {point.label && (
                      <SVGLabel
                        x={svgX + 12} y={svgY - 10}
                        text={point.label} fontSize={12} fontWeight={500} color={color}
                      />
                    )}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Labels / Annotations ──────────────────────── */}
        <AnimatePresence>
          {hasLabels && isVisible('labels') && (
            <motion.g
              data-testid="cp-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Title */}
              {title && (
                <g data-testid="cp-title">
                  <SVGLabel
                    x={width / 2}
                    y={24}
                    text={title}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={500}
                    className="fill-current"
                  />
                </g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 5: Error highlights ──────────────────────────── */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="cp-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Wrong points */}
              {errorHighlight?.wrongPoints?.map((point, index) => {
                const svgX = xToSvg(point.x)
                const svgY = yToSvg(point.y)
                return (
                  <g key={`wrong-point-${index}`} data-testid={`cp-wrong-${index}`}>
                    <circle cx={svgX} cy={svgY} r={14} fill="#EF4444" opacity={0.15} />
                    <circle cx={svgX} cy={svgY} r={8} fill="#EF4444" opacity={0.3} />
                    <line x1={svgX - 5} y1={svgY - 5} x2={svgX + 5} y2={svgY + 5} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
                    <line x1={svgX + 5} y1={svgY - 5} x2={svgX - 5} y2={svgY + 5} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
                    {point.errorLabel && (
                      <SVGLabel x={svgX} y={svgY - 20} text={point.errorLabel} textAnchor="middle" color="#EF4444" fontSize={11} fontWeight={500} animate={false} />
                    )}
                  </g>
                )
              })}

              {/* Correct points */}
              {errorHighlight?.correctPoints?.map((point, index) => {
                const svgX = xToSvg(point.x)
                const svgY = yToSvg(point.y)
                return (
                  <g key={`correct-point-${index}`} data-testid={`cp-correct-${index}`}>
                    <circle cx={svgX} cy={svgY} r={14} fill="#22C55E" opacity={0.15} />
                    <circle cx={svgX} cy={svgY} r={8} fill="#22C55E" />
                    <path
                      d={`M ${svgX - 3} ${svgY} L ${svgX - 0.5} ${svgY + 3} L ${svgX + 4} ${svgY - 3}`}
                      stroke="white" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
                    />
                    {point.correctLabel && (
                      <SVGLabel x={svgX} y={svgY - 20} text={point.correctLabel} textAnchor="middle" color="#22C55E" fontSize={11} fontWeight={500} animate={false} />
                    )}
                  </g>
                )
              })}

              {/* Wrong curves */}
              {errorHighlight?.wrongCurves?.map((curve, index) => (
                <motion.path
                  key={`wrong-curve-${index}`}
                  d={generateCurvePath(curve.expression, curve.domain)}
                  fill="none" stroke="#EF4444" strokeWidth={2.5}
                  strokeDasharray="6,4" opacity={0.8}
                  initial="hidden" animate="visible" variants={lineDrawVariants}
                />
              ))}

              {/* Correct curves */}
              {errorHighlight?.correctCurves?.map((curve, index) => (
                <motion.path
                  key={`correct-curve-${index}`}
                  d={generateCurvePath(curve.expression, curve.domain)}
                  fill="none" stroke="#22C55E" strokeWidth={3}
                  initial="hidden" animate="visible" variants={lineDrawVariants}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Step Controls */}
      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={diagram.currentStep}
          totalSteps={diagram.totalSteps}
          onNext={diagram.next}
          onPrev={diagram.prev}
          stepLabel={stepLabel}
          language={language}
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default CoordinatePlane
