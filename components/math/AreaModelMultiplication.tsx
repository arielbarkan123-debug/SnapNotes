'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AreaModelMultiplicationData } from '@/types/math'
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

interface AreaModelMultiplicationProps {
  data: AreaModelMultiplicationData
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
  rectangle: { en: 'Draw the rectangle', he: 'ציור המלבן' },
  factors: { en: 'Show factor decompositions', he: 'הצגת פירוק הגורמים' },
  grid: { en: 'Draw interior lines', he: 'ציור קווים פנימיים' },
  partials: { en: 'Fill in partial products', he: 'מילוי מכפלות חלקיות' },
  total: { en: 'Show the total', he: 'הצגת הסכום' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decompose(n: number, customDecomp?: number[]): number[] {
  if (customDecomp && customDecomp.length > 0) {
    return customDecomp
  }
  // Auto-decompose: split into tens and ones
  if (n < 10) return [n]
  const tens = Math.floor(n / 10) * 10
  const ones = n % 10
  if (ones === 0) return [tens]
  return [tens, ones]
}

// Fill colors for sections
const SECTION_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f59e0b', // amber
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AreaModelMultiplication({
  data,
  className = '',
  width = 420,
  height = 360,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: AreaModelMultiplicationProps) {
  const { factor1, factor2, decomposition1, decomposition2, title } = data

  const parts1 = useMemo(() => decompose(factor1, decomposition1), [factor1, decomposition1])
  const parts2 = useMemo(() => decompose(factor2, decomposition2), [factor2, decomposition2])

  const totalProduct = factor1 * factor2

  const stepDefs = useMemo(() => [
    { id: 'rectangle', label: STEP_LABELS.rectangle.en, labelHe: STEP_LABELS.rectangle.he },
    { id: 'factors', label: STEP_LABELS.factors.en, labelHe: STEP_LABELS.factors.he },
    { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    { id: 'partials', label: STEP_LABELS.partials.en, labelHe: STEP_LABELS.partials.he },
    { id: 'total', label: STEP_LABELS.total.en, labelHe: STEP_LABELS.total.he },
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

  const padding = { left: 60, right: 30, top: 60, bottom: 60 }
  const rectWidth = width - padding.left - padding.right
  const rectHeight = height - padding.top - padding.bottom
  const rectX = padding.left
  const rectY = padding.top

  // Proportional widths for columns (based on factor2 decomposition)
  const totalFactor2 = parts2.reduce((a, b) => a + b, 0) || 1
  const colWidths = parts2.map((p) => (p / totalFactor2) * rectWidth)

  // Proportional heights for rows (based on factor1 decomposition)
  const totalFactor1 = parts1.reduce((a, b) => a + b, 0) || 1
  const rowHeights = parts1.map((p) => (p / totalFactor1) * rectHeight)

  // Column X positions
  const colXPositions = colWidths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? rectX : acc[i - 1] + colWidths[i - 1])
    return acc
  }, [])

  // Row Y positions
  const rowYPositions = rowHeights.reduce<number[]>((acc, h, i) => {
    acc.push(i === 0 ? rectY : acc[i - 1] + rowHeights[i - 1])
    return acc
  }, [])

  return (
    <div
      data-testid="area-model-multiplication"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Area model multiplication: ${factor1} x ${factor2} = ${totalProduct}${title ? ` - ${title}` : ''}`}
      >
        <rect width={width} height={height} rx={4} className="fill-white dark:fill-gray-900" />

        {/* Title */}
        {title && (
          <text
            data-testid="am-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
          >
            {title}
          </text>
        )}

        {/* ── Step 0: Outer rectangle ──────────────────────── */}
        <AnimatePresence>
          {isVisible('rectangle') && (
            <motion.rect
              data-testid="am-outer-rect"
              x={rectX}
              y={rectY}
              width={rectWidth}
              height={rectHeight}
              fill="none"
              stroke="currentColor"
              strokeWidth={diagram.lineWeight}
              rx={2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>

        {/* ── Step 1: Factor decompositions on edges ──────── */}
        <AnimatePresence>
          {isVisible('factors') && (
            <motion.g
              data-testid="am-factors"
              initial="hidden"
              animate={isCurrent('factors') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top edge: factor2 decomposition */}
              {parts2.map((part, i) => (
                <motion.text
                  key={`f2-${i}`}
                  data-testid={`am-factor2-${i}`}
                  x={colXPositions[i] + colWidths[i] / 2}
                  y={rectY - 10}
                  textAnchor="middle"
                  className="fill-current font-semibold"
                  style={{ fontSize: 15 }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: i * 0.12 }}
                >
                  {part}
                </motion.text>
              ))}

              {/* Left edge: factor1 decomposition */}
              {parts1.map((part, i) => (
                <motion.text
                  key={`f1-${i}`}
                  data-testid={`am-factor1-${i}`}
                  x={rectX - 12}
                  y={rowYPositions[i] + rowHeights[i] / 2 + 5}
                  textAnchor="end"
                  className="fill-current font-semibold"
                  style={{ fontSize: 15 }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: i * 0.12 + 0.1 }}
                >
                  {part}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Interior grid lines ──────────────────── */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="am-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Vertical interior lines */}
              {colXPositions.slice(1).map((x, i) => (
                <motion.line
                  key={`vline-${i}`}
                  x1={x}
                  y1={rectY}
                  x2={x}
                  y2={rectY + rectHeight}
                  stroke="currentColor"
                  strokeWidth={diagram.lineWeight * 0.7}
                  strokeDasharray="4,3"
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                  transition={{ delay: i * 0.1 }}
                />
              ))}

              {/* Horizontal interior lines */}
              {rowYPositions.slice(1).map((y, i) => (
                <motion.line
                  key={`hline-${i}`}
                  x1={rectX}
                  y1={y}
                  x2={rectX + rectWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth={diagram.lineWeight * 0.7}
                  strokeDasharray="4,3"
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                  transition={{ delay: i * 0.1 + 0.15 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Partial products ─────────────────────── */}
        <AnimatePresence>
          {isVisible('partials') && (
            <motion.g
              data-testid="am-partials"
              initial="hidden"
              animate={isCurrent('partials') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {parts1.map((p1, r) =>
                parts2.map((p2, c) => {
                  const partial = p1 * p2
                  const colorIndex = (r * parts2.length + c) % SECTION_COLORS.length
                  const sectionColor = SECTION_COLORS[colorIndex]
                  const cx = colXPositions[c]
                  const cy = rowYPositions[r]
                  const w = colWidths[c]
                  const h = rowHeights[r]

                  return (
                    <motion.g
                      key={`partial-${r}-${c}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (r * parts2.length + c) * 0.15, duration: 0.4 }}
                    >
                      {/* Fill */}
                      <rect
                        data-testid={`am-section-${r}-${c}`}
                        x={cx}
                        y={cy}
                        width={w}
                        height={h}
                        fill={hexToRgba(sectionColor, 0.2)}
                      />
                      {/* Partial product label */}
                      <text
                        data-testid={`am-partial-${r}-${c}`}
                        x={cx + w / 2}
                        y={cy + h / 2 + 6}
                        textAnchor="middle"
                        className="font-bold"
                        style={{ fontSize: 16, fill: sectionColor }}
                      >
                        {partial}
                      </text>
                      {/* Calculation */}
                      <text
                        x={cx + w / 2}
                        y={cy + h / 2 - 10}
                        textAnchor="middle"
                        className="fill-current"
                        style={{ fontSize: 11, opacity: 0.6 }}
                      >
                        {p1} {'\u00D7'} {p2}
                      </text>
                    </motion.g>
                  )
                })
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Total ────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('total') && (
            <motion.g
              data-testid="am-total"
              initial="hidden"
              animate={isCurrent('total') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Partial products sum line */}
              <motion.text
                data-testid="am-total-text"
                x={width / 2}
                y={height - 16}
                textAnchor="middle"
                className="fill-current font-bold"
                style={{ fontSize: 18 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {parts1
                  .flatMap((p1) => parts2.map((p2) => p1 * p2))
                  .join(' + ')}{' '}
                = {totalProduct}
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

export default AreaModelMultiplication
