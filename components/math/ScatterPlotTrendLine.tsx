'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScatterPlotTrendLineData } from '@/types/math'
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

interface ScatterPlotTrendLineProps {
  data: ScatterPlotTrendLineData
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
  points: { en: 'Plot data points', he: 'סימון נקודות נתונים' },
  trendLine: { en: 'Draw trend line', he: 'ציור קו מגמה' },
  equation: { en: 'Show equation', he: 'הצגת המשוואה' },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PADDING = 50

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScatterPlotTrendLine({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ScatterPlotTrendLineProps) {
  const { points, trendLine, xLabel, yLabel, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he },
    ]
    if (trendLine) {
      defs.push({ id: 'trendLine', label: STEP_LABELS.trendLine.en, labelHe: STEP_LABELS.trendLine.he })
      defs.push({ id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he })
    }
    return defs
  }, [trendLine])

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
  const accentColor = diagram.colors.accent
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Coordinate system
  const plotW = width - PADDING * 2
  const plotH = height - PADDING * 2

  const domainRange = useMemo(() => {
    if (points.length === 0) return { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const xMargin = (Math.max(...xs) - Math.min(...xs)) * 0.15 || 2
    const yMargin = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 2
    return {
      xMin: Math.min(0, Math.min(...xs) - xMargin),
      xMax: Math.max(...xs) + xMargin,
      yMin: Math.min(0, Math.min(...ys) - yMargin),
      yMax: Math.max(...ys) + yMargin,
    }
  }, [points])

  const { xMin, xMax, yMin, yMax } = domainRange

  const toSvgX = (x: number) => PADDING + ((x - xMin) / (xMax - xMin)) * plotW
  const toSvgY = (y: number) => PADDING + ((yMax - y) / (yMax - yMin)) * plotH

  // Grid and ticks
  const xTickStep = useMemo(() => {
    const range = xMax - xMin
    if (range <= 10) return 1
    if (range <= 50) return 5
    return 10
  }, [xMin, xMax])

  const yTickStep = useMemo(() => {
    const range = yMax - yMin
    if (range <= 10) return 1
    if (range <= 50) return 5
    return 10
  }, [yMin, yMax])

  const xTicks = useMemo(() => {
    const ticks: number[] = []
    for (let x = Math.ceil(xMin / xTickStep) * xTickStep; x <= xMax; x += xTickStep) {
      if (x !== 0) ticks.push(x)
    }
    return ticks
  }, [xMin, xMax, xTickStep])

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    for (let y = Math.ceil(yMin / yTickStep) * yTickStep; y <= yMax; y += yTickStep) {
      if (y !== 0) ticks.push(y)
    }
    return ticks
  }, [yMin, yMax, yTickStep])

  // Trend line endpoints
  const trendLineEndpoints = useMemo(() => {
    if (!trendLine) return null
    const x1 = xMin
    const y1 = trendLine.slope * x1 + trendLine.yIntercept
    const x2 = xMax
    const y2 = trendLine.slope * x2 + trendLine.yIntercept
    return { x1: toSvgX(x1), y1: toSvgY(y1), x2: toSvgX(x2), y2: toSvgY(y2) }
  }, [trendLine, xMin, xMax])

  return (
    <div
      data-testid="scatter-plot-trend-line"
      className={`bg-white dark:bg-gray-900 rounded-lg p-2 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="sptl-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Scatter plot with ${points.length} data points${trendLine ? ' and trend line' : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="sptl-background"
          x={0}
          y={0}
          width={width}
          height={height}
          fill="white"
          className="dark:fill-gray-900"
        />

        {/* Clip region */}
        <defs>
          <clipPath id="sptl-clip">
            <rect x={PADDING} y={PADDING} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="sptl-axes"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {/* Grid */}
              {xTicks.map((x) => (
                <line key={`gx-${x}`} x1={toSvgX(x)} y1={PADDING} x2={toSvgX(x)} y2={PADDING + plotH} stroke="#e5e7eb" strokeWidth={1} />
              ))}
              {yTicks.map((y) => (
                <line key={`gy-${y}`} x1={PADDING} y1={toSvgY(y)} x2={PADDING + plotW} y2={toSvgY(y)} stroke="#e5e7eb" strokeWidth={1} />
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
                <text key={`xt-${x}`} x={toSvgX(x)} y={toSvgY(0) + 16} textAnchor="middle" fontSize={10} fill="#6b7280">
                  {Number.isInteger(x) ? x : x.toFixed(1)}
                </text>
              ))}
              {yTicks.map((y) => (
                <text key={`yt-${y}`} x={toSvgX(0) - 8} y={toSvgY(y) + 4} textAnchor="end" fontSize={10} fill="#6b7280">
                  {Number.isInteger(y) ? y : y.toFixed(1)}
                </text>
              ))}

              {/* Axis labels */}
              {xLabel && (
                <text x={PADDING + plotW / 2} y={height - 6} textAnchor="middle" fontSize={12} className="fill-gray-700 dark:fill-gray-300" fontWeight={600}>
                  {xLabel}
                </text>
              )}
              {yLabel && (
                <text x={12} y={PADDING + plotH / 2} textAnchor="middle" fontSize={12} className="fill-gray-700 dark:fill-gray-300" fontWeight={600} transform={`rotate(-90, 12, ${PADDING + plotH / 2})`}>
                  {yLabel}
                </text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Data points */}
        <AnimatePresence>
          {isVisible('points') && (
            <motion.g
              data-testid="sptl-points"
              initial="hidden"
              animate="visible"
              variants={spotlight}
              clipPath="url(#sptl-clip)"
            >
              {points.map((pt, i) => (
                <motion.circle
                  key={`pt-${i}`}
                  data-testid={`sptl-point-${i}`}
                  cx={toSvgX(pt.x)}
                  cy={toSvgY(pt.y)}
                  r={4}
                  fill={primaryColor}
                  opacity={0.8}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: Math.min(i * 0.05, 1.5) }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Trend line */}
        <AnimatePresence>
          {isVisible('trendLine') && trendLineEndpoints && (
            <motion.g
              data-testid="sptl-trend-line"
              initial="hidden"
              animate="visible"
              variants={spotlight}
              clipPath="url(#sptl-clip)"
            >
              <motion.line
                x1={trendLineEndpoints.x1}
                y1={trendLineEndpoints.y1}
                x2={trendLineEndpoints.x2}
                y2={trendLineEndpoints.y2}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Equation and R-squared */}
        <AnimatePresence>
          {isVisible('equation') && trendLine && (
            <motion.g
              data-testid="sptl-equation"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.rect
                x={PADDING + 8}
                y={PADDING + 8}
                width={160}
                height={trendLine.rSquared !== undefined ? 44 : 26}
                rx={6}
                fill="white"
                stroke={primaryColor}
                strokeWidth={1}
                opacity={0.95}
                variants={labelAppearVariants}
              />
              <motion.text
                data-testid="sptl-equation-text"
                x={PADDING + 16}
                y={PADDING + 26}
                fill={primaryColor}
                fontSize={12}
                fontWeight={600}
                variants={labelAppearVariants}
              >
                y = {trendLine.slope.toFixed(2)}x {trendLine.yIntercept >= 0 ? '+' : ''} {trendLine.yIntercept.toFixed(2)}
              </motion.text>
              {trendLine.rSquared !== undefined && (
                <motion.text
                  data-testid="sptl-r-squared"
                  x={PADDING + 16}
                  y={PADDING + 44}
                  fill="#6b7280"
                  fontSize={11}
                  fontWeight={500}
                  variants={labelAppearVariants}
                >
                  R² = {trendLine.rSquared.toFixed(4)}
                </motion.text>
              )}
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

export default ScatterPlotTrendLine
