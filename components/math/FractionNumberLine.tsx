'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FractionNumberLineData } from '@/types/math'
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

interface FractionNumberLineProps {
  data: FractionNumberLineData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  onStepComplete?: () => void
  animationDuration?: number
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  line: { en: 'Draw the number line', he: 'ציור ציר המספרים' },
  ticks: { en: 'Add fraction tick marks', he: 'הוספת סימני שבר' },
  points: { en: 'Plot the fractions', he: 'סימון השברים' },
  labels: { en: 'Show labels', he: 'הצגת תוויות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionNumberLine({
  data,
  className = '',
  width = 500,
  height = 130,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: FractionNumberLineProps) {
  const { fractions, min, max, denominator, showTickMarks = true, title } = data

  const stepDefs = useMemo(() => [
    { id: 'line', label: STEP_LABELS.line.en, labelHe: STEP_LABELS.line.he },
    { id: 'ticks', label: STEP_LABELS.ticks.en, labelHe: STEP_LABELS.ticks.he },
    { id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he },
    { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
  ], [])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'elementary',
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
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  const padding = { left: 40, right: 40, top: 35, bottom: 25 }
  const lineY = height - padding.bottom - 20
  const lineStartX = padding.left
  const lineEndX = width - padding.right
  const lineLength = lineEndX - lineStartX

  const safeRange = Math.abs(max - min) < 1e-10 ? 1 : max - min
  const valueToX = (value: number): number =>
    lineStartX + ((value - min) / safeRange) * lineLength

  // Generate tick marks based on denominator
  const tickValues = useMemo(() => {
    if (!showTickMarks) return []
    const ticks: number[] = []
    const step = 1 / Math.max(denominator, 1)
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-10; v += step) {
      ticks.push(Math.round(v * denominator) / denominator) // Avoid floating point
    }
    return ticks
  }, [min, max, denominator, showTickMarks])

  // Integer tick marks (larger)
  const integerTicks = useMemo(() => {
    const ticks: number[] = []
    for (let v = Math.ceil(min); v <= max; v++) {
      ticks.push(v)
    }
    return ticks
  }, [min, max])

  return (
    <div
      data-testid="fraction-number-line"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Fraction number line from ${min} to ${max}${title ? `: ${title}` : ''}`}
      >
        <rect width={width} height={height} rx={4} className="fill-white dark:fill-gray-900" />

        {/* Title */}
        {title && (
          <text
            data-testid="fnl-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 14 }}
          >
            {title}
          </text>
        )}

        {/* ── Step 0: Draw the line ────────────────────────── */}
        <AnimatePresence>
          {isVisible('line') && (
            <motion.g
              data-testid="fnl-line"
              initial="hidden"
              animate={isCurrent('line') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={`M ${lineStartX} ${lineY} L ${lineEndX} ${lineY}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Arrows */}
              <motion.polygon
                points={`${lineStartX - 8},${lineY} ${lineStartX},${lineY - 4} ${lineStartX},${lineY + 4}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.polygon
                points={`${lineEndX + 8},${lineY} ${lineEndX},${lineY - 4} ${lineEndX},${lineY + 4}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
              />

              {/* Integer tick marks and labels */}
              {integerTicks.map((tick) => {
                const x = valueToX(tick)
                return (
                  <g key={`int-tick-${tick}`}>
                    <line
                      x1={x}
                      y1={lineY - 8}
                      x2={x}
                      y2={lineY + 8}
                      stroke="currentColor"
                      strokeWidth={2}
                    />
                    <text
                      x={x}
                      y={lineY + 22}
                      textAnchor="middle"
                      className="fill-current font-medium"
                      style={{ fontSize: 13 }}
                    >
                      {tick}
                    </text>
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Fraction tick marks ───────────────────── */}
        <AnimatePresence>
          {isVisible('ticks') && (
            <motion.g
              data-testid="fnl-ticks"
              initial="hidden"
              animate={isCurrent('ticks') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {tickValues.map((tick, idx) => {
                const x = valueToX(tick)
                const isInteger = Math.abs(tick - Math.round(tick)) < 1e-10
                if (isInteger) return null // Already drawn above
                return (
                  <motion.g
                    key={`frac-tick-${idx}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <line
                      data-testid={`fnl-tick-${idx}`}
                      x1={x}
                      y1={lineY - 5}
                      x2={x}
                      y2={lineY + 5}
                      stroke="currentColor"
                      strokeWidth={1}
                      opacity={0.6}
                    />
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Plot fraction points ──────────────────── */}
        <AnimatePresence>
          {isVisible('points') && (
            <motion.g
              data-testid="fnl-points"
              initial="hidden"
              animate={isCurrent('points') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {fractions.map((frac, idx) => {
                const value = frac.numerator / Math.max(frac.denominator, 1)
                const x = valueToX(value)
                const pointColor = frac.color || primaryColor
                return (
                  <motion.g
                    key={`frac-point-${idx}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 18,
                      delay: idx * 0.15,
                    }}
                  >
                    {/* Glow ring */}
                    <circle
                      cx={x}
                      cy={lineY}
                      r={10}
                      fill={pointColor}
                      fillOpacity={0.15}
                    />
                    {/* Point */}
                    <circle
                      data-testid={`fnl-point-${idx}`}
                      cx={x}
                      cy={lineY}
                      r={6}
                      fill={pointColor}
                      stroke="white"
                      strokeWidth={2}
                    />
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Labels ────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="fnl-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {fractions.map((frac, idx) => {
                const value = frac.numerator / Math.max(frac.denominator, 1)
                const x = valueToX(value)
                const pointColor = frac.color || primaryColor
                // Stagger labels above/below to avoid overlap
                const above = idx % 2 === 0
                const labelY = above ? lineY - 18 : lineY - 18 - 16
                return (
                  <motion.text
                    key={`frac-label-${idx}`}
                    data-testid={`fnl-label-${idx}`}
                    x={x}
                    y={labelY}
                    textAnchor="middle"
                    className="font-semibold"
                    style={{ fontSize: 13, fill: pointColor }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {frac.numerator}/{frac.denominator}
                  </motion.text>
                )
              })}
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

export default FractionNumberLine
