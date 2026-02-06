'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SystemOfEquationsGraphData } from '@/types/math'
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

interface SystemOfEquationsGraphProps {
  data: SystemOfEquationsGraphData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  showStepCounter?: boolean
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  axes: { en: 'Draw axes', he: 'ציור צירים' },
  line1: { en: 'Draw first equation', he: 'ציור משוואה ראשונה' },
  line2: { en: 'Draw second equation', he: 'ציור משוואה שנייה' },
  intersection: { en: 'Mark intersection', he: 'סימון נקודת חיתוך' },
  solution: { en: 'Show solution', he: 'הצגת הפתרון' },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PADDING = 40
const LINE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SystemOfEquationsGraph({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: SystemOfEquationsGraphProps) {
  const { equations, solution, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'line1', label: STEP_LABELS.line1.en, labelHe: STEP_LABELS.line1.he },
    ]
    if (equations.length > 1) {
      defs.push({ id: 'line2', label: STEP_LABELS.line2.en, labelHe: STEP_LABELS.line2.he })
    }
    if (solution) {
      defs.push(
        { id: 'intersection', label: STEP_LABELS.intersection.en, labelHe: STEP_LABELS.intersection.he },
        { id: 'solution', label: STEP_LABELS.solution.en, labelHe: STEP_LABELS.solution.he },
      )
    }
    return defs
  }, [equations.length, solution])

  // useDiagramBase
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }

  const primaryColor = diagram.colors.primary
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Coordinate system
  const plotW = width - PADDING * 2
  const plotH = height - PADDING * 2

  // Compute domain from equations and solution
  const domainRange = useMemo(() => {
    let xMin = -10, xMax = 10, yMin = -10, yMax = 10
    if (solution) {
      const margin = 5
      xMin = Math.min(-2, solution.x - margin)
      xMax = Math.max(2, solution.x + margin)
      yMin = Math.min(-2, solution.y - margin)
      yMax = Math.max(2, solution.y + margin)
    }
    return { xMin, xMax, yMin, yMax }
  }, [solution])

  const { xMin, xMax, yMin, yMax } = domainRange

  const toSvgX = (x: number) => PADDING + ((x - xMin) / (xMax - xMin)) * plotW
  const toSvgY = (y: number) => PADDING + ((yMax - y) / (yMax - yMin)) * plotH

  // Compute line endpoints
  const getLinePoints = (slope: number, yIntercept: number) => {
    const x1 = xMin
    const y1 = slope * x1 + yIntercept
    const x2 = xMax
    const y2 = slope * x2 + yIntercept
    return { x1: toSvgX(x1), y1: toSvgY(y1), x2: toSvgX(x2), y2: toSvgY(y2) }
  }

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; type: 'v' | 'h' }> = []
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      lines.push({ x1: toSvgX(x), y1: PADDING, x2: toSvgX(x), y2: PADDING + plotH, type: 'v' })
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      lines.push({ x1: PADDING, y1: toSvgY(y), x2: PADDING + plotW, y2: toSvgY(y), type: 'h' })
    }
    return lines
  }, [xMin, xMax, yMin, yMax, plotW, plotH])

  // Tick labels
  const xTicks = useMemo(() => {
    const ticks: number[] = []
    const step = Math.max(1, Math.ceil((xMax - xMin) / 10))
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += step) {
      if (x !== 0) ticks.push(x)
    }
    return ticks
  }, [xMin, xMax])

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const step = Math.max(1, Math.ceil((yMax - yMin) / 10))
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += step) {
      if (y !== 0) ticks.push(y)
    }
    return ticks
  }, [yMin, yMax])

  return (
    <div
      data-testid="system-of-equations-graph"
      className={`bg-white dark:bg-gray-900 rounded-lg p-2 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="seg-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`System of equations graph from ${xMin} to ${xMax}`}
      >
        {/* Background */}
        <rect
          data-testid="seg-background"
          x={0}
          y={0}
          width={width}
          height={height}
          fill="white"
          className="dark:fill-gray-900"
        />

        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="seg-axes"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {/* Grid */}
              {gridLines.map((gl, i) => (
                <line
                  key={`grid-${i}`}
                  x1={gl.x1}
                  y1={gl.y1}
                  x2={gl.x2}
                  y2={gl.y2}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
              ))}

              {/* X axis */}
              <motion.line
                x1={PADDING}
                y1={toSvgY(0)}
                x2={PADDING + plotW}
                y2={toSvgY(0)}
                stroke="#374151"
                strokeWidth={diagram.lineWeight}
                variants={lineDrawVariants}
              />
              {/* Y axis */}
              <motion.line
                x1={toSvgX(0)}
                y1={PADDING}
                x2={toSvgX(0)}
                y2={PADDING + plotH}
                stroke="#374151"
                strokeWidth={diagram.lineWeight}
                variants={lineDrawVariants}
              />

              {/* Tick labels */}
              {xTicks.map((x) => (
                <text
                  key={`xt-${x}`}
                  x={toSvgX(x)}
                  y={toSvgY(0) + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6b7280"
                >
                  {x}
                </text>
              ))}
              {yTicks.map((y) => (
                <text
                  key={`yt-${y}`}
                  x={toSvgX(0) - 8}
                  y={toSvgY(y) + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="#6b7280"
                >
                  {y}
                </text>
              ))}

              {/* Axis labels */}
              <text x={PADDING + plotW - 5} y={toSvgY(0) - 8} textAnchor="end" fontSize={12} className="fill-gray-700 dark:fill-gray-300" fontWeight={600}>x</text>
              <text x={toSvgX(0) + 10} y={PADDING + 12} textAnchor="start" fontSize={12} className="fill-gray-700 dark:fill-gray-300" fontWeight={600}>y</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: First line */}
        <AnimatePresence>
          {isVisible('line1') && equations[0] && (
            <motion.g
              data-testid="seg-line1"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {(() => {
                const eq = equations[0]
                const pts = getLinePoints(eq.slope, eq.yIntercept)
                const color = eq.color || LINE_COLORS[0]
                return (
                  <>
                    <motion.line
                      x1={pts.x1}
                      y1={pts.y1}
                      x2={pts.x2}
                      y2={pts.y2}
                      stroke={color}
                      strokeWidth={diagram.lineWeight}
                      strokeLinecap="round"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      data-testid="seg-equation-label-0"
                      x={pts.x2 - 10}
                      y={pts.y2 - 10}
                      fill={color}
                      fontSize={12}
                      fontWeight={600}
                      variants={labelAppearVariants}
                    >
                      {eq.expression}
                    </motion.text>
                  </>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Second line */}
        <AnimatePresence>
          {isVisible('line2') && equations[1] && (
            <motion.g
              data-testid="seg-line2"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {(() => {
                const eq = equations[1]
                const pts = getLinePoints(eq.slope, eq.yIntercept)
                const color = eq.color || LINE_COLORS[1]
                return (
                  <>
                    <motion.line
                      x1={pts.x1}
                      y1={pts.y1}
                      x2={pts.x2}
                      y2={pts.y2}
                      stroke={color}
                      strokeWidth={diagram.lineWeight}
                      strokeLinecap="round"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      data-testid="seg-equation-label-1"
                      x={pts.x2 - 10}
                      y={pts.y2 + 16}
                      fill={color}
                      fontSize={12}
                      fontWeight={600}
                      variants={labelAppearVariants}
                    >
                      {eq.expression}
                    </motion.text>
                  </>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Intersection point */}
        <AnimatePresence>
          {isVisible('intersection') && solution && (
            <motion.g
              data-testid="seg-intersection"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {/* Dashed lines to axes */}
              <line
                x1={toSvgX(solution.x)}
                y1={toSvgY(solution.y)}
                x2={toSvgX(solution.x)}
                y2={toSvgY(0)}
                stroke={primaryColor}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.5}
              />
              <line
                x1={toSvgX(solution.x)}
                y1={toSvgY(solution.y)}
                x2={toSvgX(0)}
                y2={toSvgY(solution.y)}
                stroke={primaryColor}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.5}
              />
              {/* Intersection dot */}
              <motion.circle
                data-testid="seg-intersection-point"
                cx={toSvgX(solution.x)}
                cy={toSvgY(solution.y)}
                r={6}
                fill={primaryColor}
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Solution label */}
        <AnimatePresence>
          {isVisible('solution') && solution && (
            <motion.g
              data-testid="seg-solution"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.rect
                x={toSvgX(solution.x) + 10}
                y={toSvgY(solution.y) - 24}
                width={80}
                height={24}
                rx={4}
                fill={primaryColor}
                opacity={0.9}
                variants={labelAppearVariants}
              />
              <motion.text
                x={toSvgX(solution.x) + 50}
                y={toSvgY(solution.y) - 8}
                textAnchor="middle"
                fill="white"
                fontSize={12}
                fontWeight={600}
                variants={labelAppearVariants}
              >
                ({solution.x}, {solution.y})
              </motion.text>
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
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default SystemOfEquationsGraph
