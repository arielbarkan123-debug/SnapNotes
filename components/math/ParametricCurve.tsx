'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { evaluate } from 'mathjs'
import type { ParametricCurveData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParametricCurveProps {
  data: ParametricCurveData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  axes: { en: 'Draw axes', he: 'ציור צירים' },
  range: { en: 'Show parameter range', he: 'הצגת טווח הפרמטר' },
  curve: { en: 'Trace the curve', he: 'מעקב אחרי העקום' },
  points: { en: 'Mark t-values', he: 'סימון ערכי t' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function evaluateParametric(expr: string, t: number): number {
  try {
    return evaluate(expr, { t }) as number
  } catch {
    return 0
  }
}

function generateCurvePoints(
  xExpr: string,
  yExpr: string,
  tMin: number,
  tMax: number,
  numPoints: number = 200
): Array<{ x: number; y: number; t: number }> {
  const points: Array<{ x: number; y: number; t: number }> = []
  const dt = (tMax - tMin) / numPoints
  for (let i = 0; i <= numPoints; i++) {
    const t = tMin + i * dt
    const x = evaluateParametric(xExpr, t)
    const y = evaluateParametric(yExpr, t)
    if (isFinite(x) && isFinite(y)) {
      points.push({ x, y, t })
    }
  }
  return points
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParametricCurve({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ParametricCurveProps) {
  const {
    xExpression,
    yExpression,
    tRange,
    showDirection = true,
    showPoints = [],
    title,
  } = data

  const hasPoints = showPoints.length > 0

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'range', label: STEP_LABELS.range.en, labelHe: STEP_LABELS.range.he },
      { id: 'curve', label: STEP_LABELS.curve.en, labelHe: STEP_LABELS.curve.he },
    ]
    if (hasPoints) {
      defs.push({ id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he })
    }
    return defs
  }, [hasPoints])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'high_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Generate curve points
  const curvePoints = useMemo(
    () => generateCurvePoints(xExpression, yExpression, tRange.min, tRange.max),
    [xExpression, yExpression, tRange.min, tRange.max]
  )

  // Compute bounds
  const bounds = useMemo(() => {
    if (curvePoints.length === 0) return { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity
    for (const p of curvePoints) {
      if (p.x < xMin) xMin = p.x
      if (p.x > xMax) xMax = p.x
      if (p.y < yMin) yMin = p.y
      if (p.y > yMax) yMax = p.y
    }
    const xPad = (xMax - xMin) * 0.15 || 1
    const yPad = (yMax - yMin) * 0.15 || 1
    return {
      xMin: xMin - xPad,
      xMax: xMax + xPad,
      yMin: yMin - yPad,
      yMax: yMax + yPad,
    }
  }, [curvePoints])

  // SVG coordinate system
  const padding = 40
  const svgW = width
  const svgH = height
  const plotW = svgW - padding * 2
  const plotH = svgH - padding * 2

  const toSvgX = (x: number) => padding + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plotW
  const toSvgY = (y: number) => padding + ((bounds.yMax - y) / (bounds.yMax - bounds.yMin)) * plotH

  // Build curve path
  const curvePath = useMemo(() => {
    if (curvePoints.length < 2) return ''
    return curvePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`)
      .join(' ')
  }, [curvePoints, bounds, plotW, plotH]) // eslint-disable-line react-hooks/exhaustive-deps

  // Direction arrows along the curve
  const directionArrows = useMemo(() => {
    if (!showDirection || curvePoints.length < 10) return []
    const arrows: Array<{ x: number; y: number; angle: number }> = []
    const step = Math.floor(curvePoints.length / 5)
    for (let i = step; i < curvePoints.length - 1; i += step) {
      const p = curvePoints[i]
      const pNext = curvePoints[Math.min(i + 1, curvePoints.length - 1)]
      const dx = toSvgX(pNext.x) - toSvgX(p.x)
      const dy = toSvgY(pNext.y) - toSvgY(p.y)
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI
      arrows.push({ x: toSvgX(p.x), y: toSvgY(p.y), angle })
    }
    return arrows
  }, [curvePoints, showDirection, bounds, plotW, plotH]) // eslint-disable-line react-hooks/exhaustive-deps

  // Evaluate specific t-values
  const markedPoints = useMemo(() => {
    return showPoints.map((sp) => {
      const x = evaluateParametric(xExpression, sp.t)
      const y = evaluateParametric(yExpression, sp.t)
      return { ...sp, x, y, svgX: toSvgX(x), svgY: toSvgY(y) }
    })
  }, [showPoints, xExpression, yExpression, bounds, plotW, plotH]) // eslint-disable-line react-hooks/exhaustive-deps

  // Axes positions
  const originX = toSvgX(0)
  const originY = toSvgY(0)
  const xAxisVisible = bounds.yMin <= 0 && bounds.yMax >= 0
  const yAxisVisible = bounds.xMin <= 0 && bounds.xMax >= 0

  return (
    <div
      data-testid="parametric-curve"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="pc-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="pc-svg"
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        role="img"
        aria-label={title || 'Parametric curve diagram'}
      >
        {/* Grid lines */}
        <g data-testid="pc-grid" opacity={0.15}>
          {Array.from({ length: 11 }, (_, i) => {
            const x = padding + (i / 10) * plotW
            return <line key={`gv${i}`} x1={x} y1={padding} x2={x} y2={padding + plotH} stroke="#6b7280" strokeWidth={0.5} />
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = padding + (i / 10) * plotH
            return <line key={`gh${i}`} x1={padding} y1={y} x2={padding + plotW} y2={y} stroke="#6b7280" strokeWidth={0.5} />
          })}
        </g>

        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="pc-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {xAxisVisible && (
                <motion.line
                  x1={padding}
                  y1={originY}
                  x2={padding + plotW}
                  y2={originY}
                  stroke={diagram.colors.dark}
                  strokeWidth={diagram.lineWeight}
                  variants={lineDrawVariants}
                  initial="hidden"
                  animate="visible"
                />
              )}
              {yAxisVisible && (
                <motion.line
                  x1={originX}
                  y1={padding}
                  x2={originX}
                  y2={padding + plotH}
                  stroke={diagram.colors.dark}
                  strokeWidth={diagram.lineWeight}
                  variants={lineDrawVariants}
                  initial="hidden"
                  animate="visible"
                />
              )}
              <motion.text
                x={padding + plotW + 5}
                y={xAxisVisible ? originY + 15 : padding + plotH + 15}
                fill={diagram.colors.dark}
                fontSize={12}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                x
              </motion.text>
              <motion.text
                x={yAxisVisible ? originX - 15 : padding - 15}
                y={padding - 5}
                fill={diagram.colors.dark}
                fontSize={12}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                y
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Parameter range */}
        <AnimatePresence>
          {isVisible('range') && (
            <motion.g
              data-testid="pc-range"
              initial="hidden"
              animate={isCurrent('range') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={svgW / 2}
                y={svgH - 8}
                textAnchor="middle"
                fill={accentColor}
                fontSize={13}
                fontWeight={600}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                t \u2208 [{tRange.min.toFixed(1)}, {tRange.max.toFixed(1)}]
              </motion.text>
              <motion.text
                x={svgW / 2}
                y={padding - 20}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={12}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                x(t) = {xExpression}, y(t) = {yExpression}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Trace curve with direction arrows */}
        <AnimatePresence>
          {isVisible('curve') && (
            <motion.g
              data-testid="pc-curve"
              initial="hidden"
              animate={isCurrent('curve') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={curvePath}
                fill="none"
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={lineDrawVariants}
                initial="hidden"
                animate="visible"
              />
              {showDirection && directionArrows.map((arrow, i) => (
                <motion.polygon
                  key={`arrow-${i}`}
                  points="-6,-3 0,0 -6,3"
                  fill={primaryColor}
                  transform={`translate(${arrow.x},${arrow.y}) rotate(${arrow.angle})`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Mark t-values */}
        <AnimatePresence>
          {isVisible('points') && hasPoints && (
            <motion.g
              data-testid="pc-points"
              initial="hidden"
              animate={isCurrent('points') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {markedPoints.map((pt, i) => (
                <motion.g
                  key={`pt-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.15, 1.5), type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <circle
                    cx={pt.svgX}
                    cy={pt.svgY}
                    r={5}
                    fill={accentColor}
                    stroke="white"
                    strokeWidth={2}
                  />
                  <text
                    x={pt.svgX + 8}
                    y={pt.svgY - 8}
                    fill={accentColor}
                    fontSize={11}
                    fontWeight={600}
                  >
                    {pt.label || `t=${pt.t}`}
                  </text>
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={diagram.currentStep}
          totalSteps={diagram.totalSteps}
          onNext={diagram.next}
          onPrev={diagram.prev}
          stepLabel={stepLabel}
          language={language}
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default ParametricCurve
