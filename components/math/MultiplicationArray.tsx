'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MultiplicationArrayData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MultiplicationArrayProps {
  data: MultiplicationArrayData
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
  grid: { en: 'Show grid outline', he: 'הצגת מתאר הרשת' },
  dots: { en: 'Fill in the dots', he: 'מילוי הנקודות' },
  dimensions: { en: 'Show row and column labels', he: 'הצגת תוויות שורות ועמודות' },
  product: { en: 'Show the product', he: 'הצגת המכפלה' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MultiplicationArray({
  data,
  className = '',
  width = 400,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: MultiplicationArrayProps) {
  const { rows, columns, color, highlightRow, highlightColumn, title } = data

  const stepDefs = useMemo(() => [
    { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    { id: 'dots', label: STEP_LABELS.dots.en, labelHe: STEP_LABELS.dots.he },
    { id: 'dimensions', label: STEP_LABELS.dimensions.en, labelHe: STEP_LABELS.dimensions.he },
    { id: 'product', label: STEP_LABELS.product.en, labelHe: STEP_LABELS.product.he },
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
  const dotColor = color || primaryColor
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  const padding = { left: 50, right: 30, top: 50, bottom: 60 }
  const availableWidth = width - padding.left - padding.right
  const availableHeight = height - padding.top - padding.bottom

  const dotRadius = Math.min(
    availableWidth / (columns * 2.8),
    availableHeight / (rows * 2.8),
    14,
  )
  const spacingX = Math.min(availableWidth / Math.max(columns, 1), dotRadius * 3.2)
  const spacingY = Math.min(availableHeight / Math.max(rows, 1), dotRadius * 3.2)

  const gridWidth = (columns - 1) * spacingX
  const gridHeight = (rows - 1) * spacingY
  const startX = padding.left + (availableWidth - gridWidth) / 2
  const startY = padding.top + (availableHeight - gridHeight) / 2

  const product = rows * columns

  return (
    <div
      data-testid="multiplication-array"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Multiplication array: ${rows} rows x ${columns} columns = ${product}${title ? ` - ${title}` : ''}`}
      >
        <rect width={width} height={height} rx={4} className="fill-white dark:fill-gray-900" />

        {/* Title */}
        {title && (
          <text
            data-testid="ma-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
          >
            {title}
          </text>
        )}

        {/* ── Step 0: Grid outline ─────────────────────────── */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.rect
              data-testid="ma-grid-outline"
              x={startX - dotRadius * 1.5}
              y={startY - dotRadius * 1.5}
              width={gridWidth + dotRadius * 3}
              height={gridHeight + dotRadius * 3}
              fill="none"
              stroke="currentColor"
              strokeWidth={diagram.lineWeight}
              strokeDasharray="6,4"
              rx={6}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isCurrent('grid') ? 0.6 : 0.3, scale: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* ── Step 1: Dots row by row ──────────────────────── */}
        <AnimatePresence>
          {isVisible('dots') && (
            <motion.g
              data-testid="ma-dots"
              initial="hidden"
              animate={isCurrent('dots') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: rows }, (_, r) =>
                Array.from({ length: columns }, (_, c) => {
                  const cx = startX + c * spacingX
                  const cy = startY + r * spacingY
                  const isHighlighted =
                    (highlightRow !== undefined && r === highlightRow) ||
                    (highlightColumn !== undefined && c === highlightColumn)
                  return (
                    <motion.circle
                      key={`dot-${r}-${c}`}
                      data-testid={`ma-dot-${r}-${c}`}
                      cx={cx}
                      cy={cy}
                      r={dotRadius}
                      fill={isHighlighted ? diagram.colors.accent : dotColor}
                      fillOpacity={isHighlighted ? 0.9 : 0.7}
                      stroke={isHighlighted ? diagram.colors.accent : dotColor}
                      strokeWidth={1}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 250,
                        damping: 20,
                        delay: r * 0.12 + c * 0.04,
                      }}
                    />
                  )
                })
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Row/column labels ────────────────────── */}
        <AnimatePresence>
          {isVisible('dimensions') && (
            <motion.g
              data-testid="ma-dimensions"
              initial="hidden"
              animate={isCurrent('dimensions') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Rows label (left side) */}
              <motion.text
                data-testid="ma-rows-label"
                x={startX - dotRadius * 1.5 - 14}
                y={startY + gridHeight / 2 + 5}
                textAnchor="middle"
                className="fill-current font-semibold"
                style={{ fontSize: 16 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {rows}
              </motion.text>

              {/* Rows brace indicator */}
              <motion.line
                x1={startX - dotRadius * 1.5 - 6}
                y1={startY - dotRadius}
                x2={startX - dotRadius * 1.5 - 6}
                y2={startY + gridHeight + dotRadius}
                stroke={primaryColor}
                strokeWidth={2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              />

              {/* Columns label (top) */}
              <motion.text
                data-testid="ma-cols-label"
                x={startX + gridWidth / 2}
                y={startY - dotRadius * 1.5 - 8}
                textAnchor="middle"
                className="fill-current font-semibold"
                style={{ fontSize: 16 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.15 }}
              >
                {columns}
              </motion.text>

              {/* Columns brace indicator */}
              <motion.line
                x1={startX - dotRadius}
                y1={startY - dotRadius * 1.5 - 2}
                x2={startX + gridWidth + dotRadius}
                y2={startY - dotRadius * 1.5 - 2}
                stroke={primaryColor}
                strokeWidth={2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              />

              {/* Multiplication sign */}
              <motion.text
                x={startX - dotRadius * 1.5 - 14}
                y={startY - dotRadius * 1.5 - 8}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 14, fontWeight: 500 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.3 }}
              >
                {'\u00D7'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Product ──────────────────────────────── */}
        <AnimatePresence>
          {isVisible('product') && (
            <motion.g
              data-testid="ma-product"
              initial="hidden"
              animate={isCurrent('product') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                data-testid="ma-product-text"
                x={width / 2}
                y={height - 18}
                textAnchor="middle"
                className="fill-current font-bold"
                style={{ fontSize: 20 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {rows} {'\u00D7'} {columns} = {product}
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

export default MultiplicationArray
