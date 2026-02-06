'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { evaluate } from 'mathjs'
import type { LimitVisualizationData } from '@/types/math'
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

interface LimitVisualizationProps {
  data: LimitVisualizationData
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
  function: { en: 'Draw the function', he: 'ציור הפונקציה' },
  left: { en: 'Approach from left', he: 'התקרבות משמאל' },
  right: { en: 'Approach from right', he: 'התקרבות מימין' },
  limit: { en: 'Show limit value', he: 'הצגת ערך הגבול' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeEvaluate(expr: string, x: number): number | null {
  try {
    const result = evaluate(expr, { x }) as number
    if (!isFinite(result) || Math.abs(result) > 1000) return null
    return result
  } catch {
    return null
  }
}

function generateFunctionPoints(
  expr: string,
  xMin: number,
  xMax: number,
  skipX?: number,
  numPoints: number = 300
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  const dx = (xMax - xMin) / numPoints
  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + i * dx
    if (skipX !== undefined && Math.abs(x - skipX) < dx * 0.5) continue
    const y = safeEvaluate(expr, x)
    if (y !== null) points.push({ x, y })
  }
  return points
}

function pointsToPath(
  points: Array<{ x: number; y: number }>,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number
): string {
  if (points.length < 2) return ''
  const segments: string[] = []
  let inSegment = false
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const prev = i > 0 ? points[i - 1] : null
    // Break path if there's a large gap (discontinuity)
    if (prev && Math.abs(p.y - prev.y) > (points[points.length - 1].x - points[0].x) * 2) {
      inSegment = false
    }
    if (!inSegment) {
      segments.push(`M${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`)
      inSegment = true
    } else {
      segments.push(`L${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`)
    }
  }
  return segments.join(' ')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LimitVisualization({
  data,
  className = '',
  width = 400,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: LimitVisualizationProps) {
  const {
    expression,
    approachValue,
    leftLimit,
    rightLimit,
    actualValue,
    showApproachArrows = true,
    showDiscontinuity = false,
    domain,
    title,
  } = data

  const xMin = domain?.min ?? approachValue - 5
  const xMax = domain?.max ?? approachValue + 5

  const stepDefs = useMemo(() => {
    return [
      { id: 'function', label: STEP_LABELS.function.en, labelHe: STEP_LABELS.function.he },
      { id: 'left', label: STEP_LABELS.left.en, labelHe: STEP_LABELS.left.he },
      { id: 'right', label: STEP_LABELS.right.en, labelHe: STEP_LABELS.right.he },
      { id: 'limit', label: STEP_LABELS.limit.en, labelHe: STEP_LABELS.limit.he },
    ]
  }, [])

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
    () => generateFunctionPoints(expression, xMin, xMax, showDiscontinuity ? approachValue : undefined),
    [expression, xMin, xMax, showDiscontinuity, approachValue]
  )

  // Compute y bounds
  const yBounds = useMemo(() => {
    if (funcPoints.length === 0) return { yMin: -5, yMax: 5 }
    let yMin = Infinity, yMax = -Infinity
    for (const p of funcPoints) {
      if (p.y < yMin) yMin = p.y
      if (p.y > yMax) yMax = p.y
    }
    const yPad = (yMax - yMin) * 0.15 || 1
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

  const curvePath = useMemo(
    () => pointsToPath(funcPoints, toSvgX, toSvgY),
    [funcPoints, xMin, xMax, yBounds, plotW, plotH] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Limit value for display
  const limitValue = leftLimit !== undefined && rightLimit !== undefined && leftLimit === rightLimit
    ? leftLimit
    : null
  const limExists = limitValue !== null

  // Approach point SVG coordinates
  const approachSvgX = toSvgX(approachValue)
  const limitSvgY = limExists ? toSvgY(limitValue) : null

  // Origin-based axis lines
  const originY = toSvgY(0)
  const originX = toSvgX(0)
  const xAxisVisible = yBounds.yMin <= 0 && yBounds.yMax >= 0
  const yAxisVisible = xMin <= 0 && xMax >= 0

  return (
    <div
      data-testid="limit-visualization"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="lv-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="lv-svg"
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        role="img"
        aria-label={title || 'Limit visualization'}
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
              data-testid="lv-function"
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
              {/* Discontinuity hole */}
              {showDiscontinuity && (
                <circle
                  cx={approachSvgX}
                  cy={limitSvgY ?? toSvgY(leftLimit ?? rightLimit ?? 0)}
                  r={5}
                  fill="white"
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight}
                />
              )}
              {/* Actual value point if different */}
              {actualValue !== undefined && showDiscontinuity && (
                <circle
                  cx={approachSvgX}
                  cy={toSvgY(actualValue)}
                  r={4}
                  fill={primaryColor}
                />
              )}
              <motion.text
                x={padding + plotW - 5}
                y={padding - 8}
                textAnchor="end"
                fill={primaryColor}
                fontSize={12}
                fontWeight={500}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                f(x) = {expression}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Approach from left */}
        <AnimatePresence>
          {isVisible('left') && showApproachArrows && (
            <motion.g
              data-testid="lv-left"
              initial="hidden"
              animate={isCurrent('left') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Arrow approaching from left */}
              <motion.line
                x1={toSvgX(approachValue - 2)}
                y1={toSvgY(leftLimit ?? 0)}
                x2={approachSvgX - 8}
                y2={toSvgY(leftLimit ?? 0)}
                stroke={accentColor}
                strokeWidth={2}
                strokeDasharray="6 3"
                markerEnd="url(#lv-arrowhead-left)"
                variants={lineDrawVariants}
                initial="hidden"
                animate="visible"
              />
              {/* Vertical dotted from approach x to limit y */}
              <motion.line
                x1={approachSvgX}
                y1={toSvgY(0)}
                x2={approachSvgX}
                y2={toSvgY(leftLimit ?? 0)}
                stroke={accentColor}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.5}
                variants={lineDrawVariants}
                initial="hidden"
                animate="visible"
              />
              {leftLimit !== undefined && (
                <motion.text
                  x={toSvgX(approachValue - 2.5)}
                  y={toSvgY(leftLimit) - 8}
                  fill={accentColor}
                  fontSize={11}
                  fontWeight={600}
                  variants={labelAppearVariants}
                  initial="hidden"
                  animate="visible"
                >
                  L\u207B = {leftLimit.toFixed(2)}
                </motion.text>
              )}
              <defs>
                <marker id="lv-arrowhead-left" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0,0 8,3 0,6" fill={accentColor} />
                </marker>
              </defs>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Approach from right */}
        <AnimatePresence>
          {isVisible('right') && showApproachArrows && (
            <motion.g
              data-testid="lv-right"
              initial="hidden"
              animate={isCurrent('right') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={toSvgX(approachValue + 2)}
                y1={toSvgY(rightLimit ?? 0)}
                x2={approachSvgX + 8}
                y2={toSvgY(rightLimit ?? 0)}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="6 3"
                markerEnd="url(#lv-arrowhead-right)"
                variants={lineDrawVariants}
                initial="hidden"
                animate="visible"
              />
              <motion.line
                x1={approachSvgX}
                y1={toSvgY(0)}
                x2={approachSvgX}
                y2={toSvgY(rightLimit ?? 0)}
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.5}
                variants={lineDrawVariants}
                initial="hidden"
                animate="visible"
              />
              {rightLimit !== undefined && (
                <motion.text
                  x={toSvgX(approachValue + 0.5)}
                  y={toSvgY(rightLimit) - 8}
                  fill="#ef4444"
                  fontSize={11}
                  fontWeight={600}
                  variants={labelAppearVariants}
                  initial="hidden"
                  animate="visible"
                >
                  L\u207A = {rightLimit.toFixed(2)}
                </motion.text>
              )}
              <defs>
                <marker id="lv-arrowhead-right" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
                  <polygon points="8,0 0,3 8,6" fill="#ef4444" />
                </marker>
              </defs>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show limit value / discontinuity */}
        <AnimatePresence>
          {isVisible('limit') && (
            <motion.g
              data-testid="lv-limit"
              initial="hidden"
              animate={isCurrent('limit') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {limExists && limitSvgY !== null && (
                <>
                  {/* Horizontal dotted line at limit value */}
                  <motion.line
                    x1={padding}
                    y1={limitSvgY}
                    x2={padding + plotW}
                    y2={limitSvgY}
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    strokeDasharray="8 4"
                    opacity={0.6}
                    variants={lineDrawVariants}
                    initial="hidden"
                    animate="visible"
                  />
                  <motion.text
                    x={padding + plotW + 3}
                    y={limitSvgY + 4}
                    fill="#22c55e"
                    fontSize={12}
                    fontWeight={700}
                    variants={labelAppearVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    L = {limitValue.toFixed(2)}
                  </motion.text>
                </>
              )}
              {!limExists && (
                <motion.text
                  x={svgW / 2}
                  y={svgH - 8}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize={13}
                  fontWeight={700}
                  variants={labelAppearVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {language === 'he' ? 'הגבול אינו קיים' : 'Limit does not exist'}
                </motion.text>
              )}
              {/* x approach label */}
              <motion.text
                x={approachSvgX}
                y={padding + plotH + 15}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={11}
                variants={labelAppearVariants}
                initial="hidden"
                animate="visible"
              >
                x = {approachValue}
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

export default LimitVisualization
