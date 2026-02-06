'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SlopeTriangleData } from '@/types/math'
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

interface SlopeTriangleProps {
  data: SlopeTriangleData
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
  axes: { en: 'Draw coordinate axes', he: 'ציור צירים' },
  points: { en: 'Plot points', he: 'סימון נקודות' },
  line: { en: 'Draw line through points', he: 'ציור ישר דרך הנקודות' },
  triangle: { en: 'Draw rise/run triangle', he: 'ציור משולש עלייה/ריצה' },
  formula: { en: 'Show slope formula', he: 'הצגת נוסחת השיפוע' },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PADDING = 50

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SlopeTriangle({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: SlopeTriangleProps) {
  const { point1, point2, rise, run, slope, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he },
      { id: 'line', label: STEP_LABELS.line.en, labelHe: STEP_LABELS.line.he },
      { id: 'triangle', label: STEP_LABELS.triangle.en, labelHe: STEP_LABELS.triangle.he },
      { id: 'formula', label: STEP_LABELS.formula.en, labelHe: STEP_LABELS.formula.he },
    ]
    return defs
  }, [])

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
    const allX = [point1.x, point2.x]
    const allY = [point1.y, point2.y]
    const margin = 3
    const xMin = Math.min(...allX, 0) - margin
    const xMax = Math.max(...allX, 0) + margin
    const yMin = Math.min(...allY, 0) - margin
    const yMax = Math.max(...allY, 0) + margin
    return { xMin, xMax, yMin, yMax }
  }, [point1, point2])

  const { xMin, xMax, yMin, yMax } = domainRange

  const toSvgX = (x: number) => PADDING + ((x - xMin) / (xMax - xMin)) * plotW
  const toSvgY = (y: number) => PADDING + ((yMax - y) / (yMax - yMin)) * plotH

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      lines.push({ x1: toSvgX(x), y1: PADDING, x2: toSvgX(x), y2: PADDING + plotH })
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      lines.push({ x1: PADDING, y1: toSvgY(y), x2: PADDING + plotW, y2: toSvgY(y) })
    }
    return lines
  }, [xMin, xMax, yMin, yMax, plotW, plotH])

  // Extended line endpoints
  const lineEndpoints = useMemo(() => {
    if (run === 0) {
      return { x1: toSvgX(point1.x), y1: PADDING, x2: toSvgX(point1.x), y2: PADDING + plotH }
    }
    const m = rise / run
    const b = point1.y - m * point1.x
    const y1 = m * xMin + b
    const y2 = m * xMax + b
    return { x1: toSvgX(xMin), y1: toSvgY(y1), x2: toSvgX(xMax), y2: toSvgY(y2) }
  }, [point1, rise, run, xMin, xMax])

  return (
    <div
      data-testid="slope-triangle"
      className={`bg-white dark:bg-gray-900 rounded-lg p-2 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="st-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Slope triangle from (${point1.x},${point1.y}) to (${point2.x},${point2.y}), slope = ${slope}`}
      >
        {/* Background */}
        <rect
          data-testid="st-background"
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
              data-testid="st-axes"
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

              {/* Axis labels */}
              <text x={PADDING + plotW - 5} y={toSvgY(0) - 8} textAnchor="end" fontSize={12} fill="#374151" fontWeight={600}>x</text>
              <text x={toSvgX(0) + 10} y={PADDING + 12} textAnchor="start" fontSize={12} fill="#374151" fontWeight={600}>y</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Plot points */}
        <AnimatePresence>
          {isVisible('points') && (
            <motion.g
              data-testid="st-points"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.circle
                data-testid="st-point1"
                cx={toSvgX(point1.x)}
                cy={toSvgY(point1.y)}
                r={5}
                fill={primaryColor}
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              />
              <motion.text
                x={toSvgX(point1.x) - 10}
                y={toSvgY(point1.y) - 10}
                fill={primaryColor}
                fontSize={11}
                fontWeight={600}
                textAnchor="end"
                variants={labelAppearVariants}
              >
                ({point1.x}, {point1.y})
              </motion.text>

              <motion.circle
                data-testid="st-point2"
                cx={toSvgX(point2.x)}
                cy={toSvgY(point2.y)}
                r={5}
                fill={accentColor}
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }}
              />
              <motion.text
                x={toSvgX(point2.x) + 10}
                y={toSvgY(point2.y) - 10}
                fill={accentColor}
                fontSize={11}
                fontWeight={600}
                textAnchor="start"
                variants={labelAppearVariants}
              >
                ({point2.x}, {point2.y})
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Draw line */}
        <AnimatePresence>
          {isVisible('line') && (
            <motion.g
              data-testid="st-line"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.line
                x1={lineEndpoints.x1}
                y1={lineEndpoints.y1}
                x2={lineEndpoints.x2}
                y2={lineEndpoints.y2}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Rise/run triangle */}
        <AnimatePresence>
          {isVisible('triangle') && (
            <motion.g
              data-testid="st-triangle"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {/* Horizontal run line */}
              <motion.line
                data-testid="st-run-line"
                x1={toSvgX(point1.x)}
                y1={toSvgY(point1.y)}
                x2={toSvgX(point2.x)}
                y2={toSvgY(point1.y)}
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="6 3"
                variants={lineDrawVariants}
              />
              {/* Vertical rise line */}
              <motion.line
                data-testid="st-rise-line"
                x1={toSvgX(point2.x)}
                y1={toSvgY(point1.y)}
                x2={toSvgX(point2.x)}
                y2={toSvgY(point2.y)}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="6 3"
                variants={lineDrawVariants}
              />

              {/* Run label */}
              <motion.text
                data-testid="st-run-label"
                x={(toSvgX(point1.x) + toSvgX(point2.x)) / 2}
                y={toSvgY(point1.y) + 16}
                textAnchor="middle"
                fill="#22c55e"
                fontSize={13}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'ריצה' : 'run'} = {run}
              </motion.text>

              {/* Rise label */}
              <motion.text
                data-testid="st-rise-label"
                x={toSvgX(point2.x) + 12}
                y={(toSvgY(point1.y) + toSvgY(point2.y)) / 2 + 4}
                textAnchor="start"
                fill="#ef4444"
                fontSize={13}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'עלייה' : 'rise'} = {rise}
              </motion.text>

              {/* Right angle marker */}
              <rect
                x={toSvgX(point2.x) - 8}
                y={toSvgY(point1.y) - 8}
                width={8}
                height={8}
                fill="none"
                stroke="#6b7280"
                strokeWidth={1}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Slope formula */}
        <AnimatePresence>
          {isVisible('formula') && (
            <motion.g
              data-testid="st-formula"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 70}
                y={height - 38}
                width={140}
                height={28}
                rx={6}
                fill={primaryColor}
                opacity={0.9}
                variants={labelAppearVariants}
              />
              <motion.text
                x={width / 2}
                y={height - 20}
                textAnchor="middle"
                fill="white"
                fontSize={14}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                m = {rise}/{run} = {slope}
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

export default SlopeTriangle
