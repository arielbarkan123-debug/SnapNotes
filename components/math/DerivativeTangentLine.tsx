'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { evaluate } from 'mathjs'
import type { DerivativeTangentLineData } from '@/types/math'
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

interface DerivativeTangentLineProps {
  data: DerivativeTangentLineData
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
  function: { en: 'Draw function', he: 'ציור הפונקציה' },
  point: { en: 'Mark the point', he: 'סימון הנקודה' },
  secants: { en: 'Show secant lines', he: 'הצגת ישרים חותכים' },
  tangent: { en: 'Draw tangent line', he: 'ציור המשיק' },
  slope: { en: 'Show slope value', he: 'הצגת ערך השיפוע' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeEval(expr: string, x: number): number | null {
  try {
    const result = evaluate(expr, { x }) as number
    if (!isFinite(result) || Math.abs(result) > 500) return null
    return result
  } catch {
    return null
  }
}

function generateFunctionPoints(
  expr: string,
  xMin: number,
  xMax: number,
  numPoints: number = 300
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  const dx = (xMax - xMin) / numPoints
  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + i * dx
    const y = safeEval(expr, x)
    if (y !== null) points.push({ x, y })
  }
  return points
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DerivativeTangentLine({
  data,
  className = '',
  width = 400,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: DerivativeTangentLineProps) {
  const {
    expression,
    point,
    slope,
    tangentLine,
    secantLines = [],
    domain,
    showSecants = false,
    title,
  } = data

  const xMin = domain?.min ?? point.x - 5
  const xMax = domain?.max ?? point.x + 5

  const hasSecants = showSecants && secantLines.length > 0

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'function', label: STEP_LABELS.function.en, labelHe: STEP_LABELS.function.he },
      { id: 'point', label: STEP_LABELS.point.en, labelHe: STEP_LABELS.point.he },
    ]
    if (hasSecants) {
      defs.push({ id: 'secants', label: STEP_LABELS.secants.en, labelHe: STEP_LABELS.secants.he })
    }
    defs.push({ id: 'tangent', label: STEP_LABELS.tangent.en, labelHe: STEP_LABELS.tangent.he })
    defs.push({ id: 'slope', label: STEP_LABELS.slope.en, labelHe: STEP_LABELS.slope.he })
    return defs
  }, [hasSecants])

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

  // Generate function points
  const funcPoints = useMemo(
    () => generateFunctionPoints(expression, xMin, xMax),
    [expression, xMin, xMax]
  )

  // Compute y bounds
  const yBounds = useMemo(() => {
    if (funcPoints.length === 0) return { yMin: -5, yMax: 5 }
    let yMin = Infinity, yMax = -Infinity
    for (const p of funcPoints) {
      if (p.y < yMin) yMin = p.y
      if (p.y > yMax) yMax = p.y
    }
    const yPad = (yMax - yMin) * 0.2 || 2
    return { yMin: yMin - yPad, yMax: yMax + yPad }
  }, [funcPoints])

  // SVG coordinate helpers
  const padding = 40
  const svgW = width
  const svgH = height
  const plotW = svgW - padding * 2
  const plotH = svgH - padding * 2

  const toSvgX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * plotW
  const toSvgY = (y: number) => padding + ((yBounds.yMax - y) / (yBounds.yMax - yBounds.yMin)) * plotH

  // Build function curve path
  const curvePath = useMemo(() => {
    if (funcPoints.length < 2) return ''
    return funcPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`)
      .join(' ')
  }, [funcPoints, xMin, xMax, yBounds, plotW, plotH]) // eslint-disable-line react-hooks/exhaustive-deps

  // Point on curve
  const ptSvgX = toSvgX(point.x)
  const ptSvgY = toSvgY(point.y)

  // Tangent line endpoints
  const tangentSlope = tangentLine?.slope ?? slope
  const tangentYInt = tangentLine?.yIntercept ?? (point.y - tangentSlope * point.x)
  const tangentX1 = xMin
  const tangentX2 = xMax
  const tangentY1 = tangentSlope * tangentX1 + tangentYInt
  const tangentY2 = tangentSlope * tangentX2 + tangentYInt

  // Origin axes
  const originY = toSvgY(0)
  const originX = toSvgX(0)
  const xAxisVisible = yBounds.yMin <= 0 && yBounds.yMax >= 0
  const yAxisVisible = xMin <= 0 && xMax >= 0

  return (
    <div
      data-testid="derivative-tangent-line"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="dtl-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="dtl-svg"
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        role="img"
        aria-label={title || 'Derivative tangent line diagram'}
      >
        {/* Grid */}
        <g opacity={0.12}>
          {Array.from({ length: 11 }, (_, i) => {
            const x = padding + (i / 10) * plotW
            return <line key={`gv${i}`} x1={x} y1={padding} x2={x} y2={padding + plotH} stroke="#6b7280" strokeWidth={0.5} />
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = padding + (i / 10) * plotH
            return <line key={`gh${i}`} x1={padding} y1={y} x2={padding + plotW} y2={y} stroke="#6b7280" strokeWidth={0.5} />
          })}
        </g>

        {/* Axes */}
        <g>
          {xAxisVisible && (
            <line x1={padding} y1={originY} x2={padding + plotW} y2={originY} stroke="#374151" strokeWidth={1.5} />
          )}
          {yAxisVisible && (
            <line x1={originX} y1={padding} x2={originX} y2={padding + plotH} stroke="#374151" strokeWidth={1.5} />
          )}
        </g>

        {/* Step 0: Function curve */}
        <AnimatePresence>
          {isVisible('function') && (
            <motion.g
              data-testid="dtl-function"
              initial="hidden"
              animate={isCurrent('function') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={curvePath}
                fill="none"
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                variants={lineDrawVariants}
                initial="hidden"
                animate="visible"
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Mark point on curve */}
        <AnimatePresence>
          {isVisible('point') && (
            <motion.g
              data-testid="dtl-point"
              initial="hidden"
              animate={isCurrent('point') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={ptSvgX}
                cy={ptSvgY}
                r={6}
                fill={accentColor}
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              />
              <motion.text
                x={ptSvgX + 10}
                y={ptSvgY - 10}
                fill={accentColor}
                fontSize={11}
                fontWeight={600}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                ({point.x}, {point.y.toFixed(1)})
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Secant lines (optional) */}
        <AnimatePresence>
          {isVisible('secants') && hasSecants && (
            <motion.g
              data-testid="dtl-secants"
              initial="hidden"
              animate={isCurrent('secants') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {secantLines.map((sec, i) => {
                const y1 = safeEval(expression, sec.x1)
                const y2 = safeEval(expression, sec.x2)
                if (y1 === null || y2 === null) return null
                const opacity = 0.3 + (i / secantLines.length) * 0.5
                return (
                  <motion.line
                    key={`sec-${i}`}
                    x1={toSvgX(sec.x1)}
                    y1={toSvgY(y1)}
                    x2={toSvgX(sec.x2)}
                    y2={toSvgY(y2)}
                    stroke={accentColor}
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    opacity={opacity}
                    variants={lineDrawVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: i * 0.2 }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Tangent line */}
        <AnimatePresence>
          {isVisible('tangent') && (
            <motion.g
              data-testid="dtl-tangent"
              initial="hidden"
              animate={isCurrent('tangent') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={toSvgX(tangentX1)}
                y1={toSvgY(tangentY1)}
                x2={toSvgX(tangentX2)}
                y2={toSvgY(tangentY2)}
                stroke="#22c55e"
                strokeWidth={diagram.lineWeight + 0.5}
                strokeLinecap="round"
                variants={lineDrawVariants}
                initial="hidden"
                animate="visible"
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Slope value */}
        <AnimatePresence>
          {isVisible('slope') && (
            <motion.g
              data-testid="dtl-slope"
              initial="hidden"
              animate={isCurrent('slope') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={ptSvgX + 12}
                y={ptSvgY - 32}
                width={90}
                height={22}
                rx={4}
                fill="#22c55e"
                opacity={0.9}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.9, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                x={ptSvgX + 57}
                y={ptSvgY - 17}
                textAnchor="middle"
                fill="white"
                fontSize={12}
                fontWeight={700}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                m = {slope.toFixed(2)}
              </motion.text>
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

export default DerivativeTangentLine
