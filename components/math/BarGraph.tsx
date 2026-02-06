'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BarGraphData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { hexToRgba } from '@/lib/diagram-theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BarGraphProps {
  data: BarGraphData
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
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  axes: { en: 'Draw the axes', he: 'ציור הצירים' },
  bars: { en: 'Show the bars', he: 'הצגת העמודות' },
  labels: { en: 'Add labels', he: 'הוספת תוויות' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBarColor(index: number, customColor: string | undefined, primaryColor: string): string {
  if (customColor) return customColor
  // Slight hue variations of primary
  const variations = [0, 0.08, 0.16, 0.24, 0.32, 0.4]
  const shift = variations[index % variations.length]
  return hexToRgba(primaryColor, 1 - shift * 0.5)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BarGraph({
  data,
  className = '',
  width = 450,
  height = 320,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: BarGraphProps) {
  const { categories, title, scale, orientation = 'vertical', yAxisLabel, xAxisLabel } = data

  const isVertical = orientation === 'vertical'

  // Step definitions
  const stepDefs = useMemo(() => [
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'bars', label: STEP_LABELS.bars.en, labelHe: STEP_LABELS.bars.he },
    { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
  ], [])

  // useDiagramBase
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'elementary',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility
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

  const padding = { left: 60, right: 30, top: 40, bottom: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxValue = Math.max(...categories.map((c) => c.value), 1)
  const scaleMax = Math.ceil(maxValue / scale) * scale
  const gridCount = scaleMax / scale

  // Bar sizing
  const barCount = categories.length
  const gap = isVertical ? chartWidth * 0.1 / Math.max(barCount, 1) : chartHeight * 0.1 / Math.max(barCount, 1)
  const barThickness = isVertical
    ? (chartWidth - gap * (barCount + 1)) / Math.max(barCount, 1)
    : (chartHeight - gap * (barCount + 1)) / Math.max(barCount, 1)

  return (
    <div
      data-testid="bar-graph"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Bar graph: ${title}`}
      >
        {/* Background */}
        <rect width={width} height={height} rx={4} className="fill-white dark:fill-gray-900" />

        {/* Title */}
        {title && (
          <text
            data-testid="bg-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
          >
            {title}
          </text>
        )}

        {/* ── Step 0: Axes & Grid ──────────────────────────── */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="bg-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid lines */}
              {Array.from({ length: gridCount + 1 }, (_, i) => {
                const val = i * scale
                if (isVertical) {
                  const y = padding.top + chartHeight - (val / scaleMax) * chartHeight
                  return (
                    <motion.line
                      key={`grid-${i}`}
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + chartWidth}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                      strokeDasharray={i === 0 ? 'none' : '4,4'}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    />
                  )
                } else {
                  const x = padding.left + (val / scaleMax) * chartWidth
                  return (
                    <motion.line
                      key={`grid-${i}`}
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + chartHeight}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                      strokeDasharray={i === 0 ? 'none' : '4,4'}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    />
                  )
                }
              })}

              {/* Y-axis */}
              <motion.path
                d={`M ${padding.left} ${padding.top} L ${padding.left} ${padding.top + chartHeight}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* X-axis */}
              <motion.path
                d={`M ${padding.left} ${padding.top + chartHeight} L ${padding.left + chartWidth} ${padding.top + chartHeight}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Scale labels */}
              {Array.from({ length: gridCount + 1 }, (_, i) => {
                const val = i * scale
                if (isVertical) {
                  const y = padding.top + chartHeight - (val / scaleMax) * chartHeight
                  return (
                    <motion.text
                      key={`scale-${i}`}
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-current"
                      style={{ fontSize: 11 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {val}
                    </motion.text>
                  )
                } else {
                  const x = padding.left + (val / scaleMax) * chartWidth
                  return (
                    <motion.text
                      key={`scale-${i}`}
                      x={x}
                      y={padding.top + chartHeight + 16}
                      textAnchor="middle"
                      className="fill-current"
                      style={{ fontSize: 11 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {val}
                    </motion.text>
                  )
                }
              })}

              {/* Axis labels */}
              {yAxisLabel && (
                <text
                  data-testid="bg-y-label"
                  x={14}
                  y={padding.top + chartHeight / 2}
                  textAnchor="middle"
                  className="fill-current"
                  style={{ fontSize: 12 }}
                  transform={`rotate(-90, 14, ${padding.top + chartHeight / 2})`}
                >
                  {yAxisLabel}
                </text>
              )}
              {xAxisLabel && (
                <text
                  data-testid="bg-x-label"
                  x={padding.left + chartWidth / 2}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-current"
                  style={{ fontSize: 12 }}
                >
                  {xAxisLabel}
                </text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Bars grow ─────────────────────────────── */}
        <AnimatePresence>
          {isVisible('bars') && (
            <motion.g
              data-testid="bg-bars"
              initial="hidden"
              animate={isCurrent('bars') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {categories.map((cat, i) => {
                const color = getBarColor(i, cat.color, primaryColor)
                if (isVertical) {
                  const barH = (cat.value / scaleMax) * chartHeight
                  const x = padding.left + gap + i * (barThickness + gap)
                  const y = padding.top + chartHeight - barH
                  return (
                    <motion.rect
                      key={`bar-${i}`}
                      data-testid={`bg-bar-${i}`}
                      x={x}
                      y={y}
                      width={barThickness}
                      height={barH}
                      rx={2}
                      fill={color}
                      initial={{ height: 0, y: padding.top + chartHeight }}
                      animate={{ height: barH, y }}
                      transition={{ delay: i * 0.12, duration: 0.5, ease: 'easeOut' }}
                    />
                  )
                } else {
                  const barW = (cat.value / scaleMax) * chartWidth
                  const y = padding.top + gap + i * (barThickness + gap)
                  return (
                    <motion.rect
                      key={`bar-${i}`}
                      data-testid={`bg-bar-${i}`}
                      x={padding.left}
                      y={y}
                      width={barW}
                      height={barThickness}
                      rx={2}
                      fill={color}
                      initial={{ width: 0 }}
                      animate={{ width: barW }}
                      transition={{ delay: i * 0.12, duration: 0.5, ease: 'easeOut' }}
                    />
                  )
                }
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Labels ────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="bg-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {categories.map((cat, i) => {
                if (isVertical) {
                  const x = padding.left + gap + i * (barThickness + gap) + barThickness / 2
                  const barH = (cat.value / scaleMax) * chartHeight
                  const barY = padding.top + chartHeight - barH
                  return (
                    <motion.g
                      key={`label-${i}`}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.08 }}
                    >
                      {/* Category label on x-axis */}
                      <text
                        data-testid={`bg-cat-label-${i}`}
                        x={x}
                        y={padding.top + chartHeight + 16}
                        textAnchor="middle"
                        className="fill-current"
                        style={{ fontSize: 11 }}
                      >
                        {cat.label}
                      </text>
                      {/* Value label on top of bar */}
                      <text
                        data-testid={`bg-val-label-${i}`}
                        x={x}
                        y={barY - 4}
                        textAnchor="middle"
                        className="fill-current font-medium"
                        style={{ fontSize: 12 }}
                      >
                        {cat.value}
                      </text>
                    </motion.g>
                  )
                } else {
                  const y = padding.top + gap + i * (barThickness + gap) + barThickness / 2
                  const barW = (cat.value / scaleMax) * chartWidth
                  return (
                    <motion.g
                      key={`label-${i}`}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.08 }}
                    >
                      {/* Category label on y-axis */}
                      <text
                        data-testid={`bg-cat-label-${i}`}
                        x={padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-current"
                        style={{ fontSize: 11 }}
                      >
                        {cat.label}
                      </text>
                      {/* Value label at end of bar */}
                      <text
                        data-testid={`bg-val-label-${i}`}
                        x={padding.left + barW + 6}
                        y={y + 4}
                        textAnchor="start"
                        className="fill-current font-medium"
                        style={{ fontSize: 12 }}
                      >
                        {cat.value}
                      </text>
                    </motion.g>
                  )
                }
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

export default BarGraph
