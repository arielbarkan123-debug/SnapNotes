'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DecimalGridData } from '@/types/math'
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

interface DecimalGridProps {
  data: DecimalGridData
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
  grid: { en: 'Draw the grid', he: 'ציור הרשת' },
  shade: { en: 'Shade the cells', he: 'צביעת התאים' },
  labels: { en: 'Show labels', he: 'הצגת תוויות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DecimalGrid({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: DecimalGridProps) {
  const { value, gridSize, showFractionEquivalent, highlightCells, title } = data

  // Grid dimensions: gridSize 10 = 10x1, gridSize 100 = 10x10
  const cols = 10
  const rows = gridSize === 10 ? 1 : 10

  // How many cells to shade based on value
  const shadedCount = Math.round(value * gridSize)

  // Determine which cells are shaded (row by row, left to right)
  const getShadedCells = (): Set<number> => {
    if (highlightCells && highlightCells.length > 0) {
      return new Set(highlightCells)
    }
    const cells = new Set<number>()
    for (let i = 0; i < shadedCount; i++) {
      cells.add(i)
    }
    return cells
  }

  const shadedCellSet = useMemo(() => getShadedCells(), [shadedCount, highlightCells])

  // Fraction equivalent
  const fractionNumerator = shadedCount
  const fractionDenominator = gridSize

  // GCD for simplification
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(Math.abs(fractionNumerator), fractionDenominator)
  const simplifiedNum = fractionNumerator / divisor
  const simplifiedDen = fractionDenominator / divisor

  // Step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
      { id: 'shade', label: STEP_LABELS.shade.en, labelHe: STEP_LABELS.shade.he },
      { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
    ]
    return defs
  }, [])

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
  const lightColor = diagram.colors.light

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Layout calculations
  const padding = { left: 40, right: 40, top: 50, bottom: 70 }
  const gridWidth = width - padding.left - padding.right
  const gridHeight = height - padding.top - padding.bottom
  const cellWidth = gridWidth / cols
  const cellHeight = gridHeight / rows

  return (
    <div
      data-testid="decimal-grid"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Decimal grid showing ${value} (${shadedCount} out of ${gridSize} cells shaded)`}
      >
        {/* Background */}
        <rect
          data-testid="dg-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <motion.text
            data-testid="dg-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
          >
            {title}
          </motion.text>
        )}

        {/* Step 0: Draw grid */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="dg-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid cells (empty) */}
              {Array.from({ length: rows }, (_, row) =>
                Array.from({ length: cols }, (_, col) => {
                  const cellIndex = row * cols + col
                  const x = padding.left + col * cellWidth
                  const y = padding.top + row * cellHeight
                  return (
                    <motion.rect
                      key={`cell-${cellIndex}`}
                      data-testid={`dg-cell-${cellIndex}`}
                      x={x}
                      y={y}
                      width={cellWidth}
                      height={cellHeight}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={diagram.lineWeight * 0.4}
                      strokeOpacity={0.3}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: cellIndex * 0.005 }}
                    />
                  )
                })
              )}

              {/* Outer border */}
              <rect
                x={padding.left}
                y={padding.top}
                width={gridWidth}
                height={gridHeight}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                rx={2}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Shade cells */}
        <AnimatePresence>
          {isVisible('shade') && (
            <motion.g
              data-testid="dg-shaded"
              initial="hidden"
              animate={isCurrent('shade') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: rows }, (_, row) =>
                Array.from({ length: cols }, (_, col) => {
                  const cellIndex = row * cols + col
                  if (!shadedCellSet.has(cellIndex)) return null
                  const x = padding.left + col * cellWidth
                  const y = padding.top + row * cellHeight
                  return (
                    <motion.rect
                      key={`shaded-${cellIndex}`}
                      data-testid={`dg-shaded-cell-${cellIndex}`}
                      x={x + 0.5}
                      y={y + 0.5}
                      width={cellWidth - 1}
                      height={cellHeight - 1}
                      fill={primaryColor}
                      opacity={0.6}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.6, scale: 1 }}
                      transition={{ delay: cellIndex * 0.01, duration: 0.2 }}
                    />
                  )
                })
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="dg-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Decimal value */}
              <motion.text
                data-testid="dg-decimal-label"
                x={width / 2}
                y={height - 38}
                textAnchor="middle"
                className="fill-current font-bold"
                style={{ fontSize: 22, fill: primaryColor }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {value}
              </motion.text>

              {/* Fraction equivalent */}
              {showFractionEquivalent && (
                <motion.text
                  data-testid="dg-fraction-label"
                  x={width / 2}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-current font-medium"
                  style={{ fontSize: 16, fill: lightColor === '#c7d2fe' ? primaryColor : diagram.colors.dark }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  = {fractionNumerator}/{fractionDenominator}
                  {simplifiedNum !== fractionNumerator && (
                    <tspan> = {simplifiedNum}/{simplifiedDen}</tspan>
                  )}
                </motion.text>
              )}

              {/* Count label */}
              <motion.text
                data-testid="dg-count-label"
                x={width - padding.right + 5}
                y={padding.top + gridHeight / 2}
                textAnchor="start"
                className="fill-current"
                style={{ fontSize: 12 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {shadedCount}/{gridSize}
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

export default DecimalGrid
