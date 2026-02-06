'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FractionMultiplicationAreaData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  lineDrawVariants,
} from '@/lib/diagram-animations'
import { hexToRgba } from '@/lib/diagram-theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FractionMultiplicationAreaProps {
  data: FractionMultiplicationAreaData
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
  square: { en: 'Draw unit square', he: 'ציור ריבוע יחידה' },
  horizontal: { en: 'Divide horizontally', he: 'חלוקה אופקית' },
  shade1: { en: 'Shade first fraction', he: 'צביעת השבר הראשון' },
  vertical: { en: 'Divide vertically', he: 'חלוקה אנכית' },
  overlap: { en: 'Show product (overlap)', he: 'הצגת המכפלה (חפיפה)' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionMultiplicationArea({
  data,
  className = '',
  width = 400,
  height = 420,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: FractionMultiplicationAreaProps) {
  const { fraction1, fraction2, showOverlap: _showOverlap, title } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'square', label: STEP_LABELS.square.en, labelHe: STEP_LABELS.square.he },
      { id: 'horizontal', label: STEP_LABELS.horizontal.en, labelHe: STEP_LABELS.horizontal.he },
      { id: 'shade1', label: STEP_LABELS.shade1.en, labelHe: STEP_LABELS.shade1.he },
      { id: 'vertical', label: STEP_LABELS.vertical.en, labelHe: STEP_LABELS.vertical.he },
      { id: 'overlap', label: STEP_LABELS.overlap.en, labelHe: STEP_LABELS.overlap.he },
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
  const accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Layout: unit square inside the SVG
  const padding = { left: 60, right: 60, top: 50, bottom: 90 }
  const squareSize = Math.min(width - padding.left - padding.right, height - padding.top - padding.bottom)
  const squareX = (width - squareSize) / 2
  const squareY = padding.top

  // Horizontal divisions for fraction1 (rows)
  const rowHeight = squareSize / fraction1.denominator
  // Vertical divisions for fraction2 (columns)
  const colWidth = squareSize / fraction2.denominator

  // Product fraction
  const productNumerator = fraction1.numerator * fraction2.numerator
  const productDenominator = fraction1.denominator * fraction2.denominator

  return (
    <div
      data-testid="fraction-multiplication-area"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Fraction multiplication area model: ${fraction1.numerator}/${fraction1.denominator} x ${fraction2.numerator}/${fraction2.denominator}`}
      >
        {/* Background */}
        <rect
          data-testid="fma-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <motion.text
            data-testid="fma-title"
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

        {/* Step 0: Unit square */}
        <AnimatePresence>
          {isVisible('square') && (
            <motion.g
              data-testid="fma-square"
              initial="hidden"
              animate={isCurrent('square') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={squareX}
                y={squareY}
                width={squareSize}
                height={squareSize}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                rx={2}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* "1" labels on sides */}
              <motion.text
                x={squareX + squareSize / 2}
                y={squareY - 8}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 13 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                1
              </motion.text>
              <motion.text
                x={squareX - 12}
                y={squareY + squareSize / 2 + 4}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 13 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                1
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Divide horizontally (fraction1 = rows) */}
        <AnimatePresence>
          {isVisible('horizontal') && (
            <motion.g
              data-testid="fma-horizontal"
              initial="hidden"
              animate={isCurrent('horizontal') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: fraction1.denominator - 1 }, (_, i) => {
                const y = squareY + (i + 1) * rowHeight
                return (
                  <motion.line
                    key={`h-line-${i}`}
                    x1={squareX}
                    y1={y}
                    x2={squareX + squareSize}
                    y2={y}
                    stroke={primaryColor}
                    strokeWidth={diagram.lineWeight * 0.6}
                    strokeDasharray="4,3"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
              {/* Label for fraction1 on left side */}
              <motion.text
                x={squareX - 8}
                y={squareY + (fraction1.numerator * rowHeight) / 2 + 4}
                textAnchor="end"
                style={{ fontSize: 14, fill: primaryColor, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {fraction1.numerator}/{fraction1.denominator}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Shade fraction1 (horizontal strips) */}
        <AnimatePresence>
          {isVisible('shade1') && (
            <motion.g
              data-testid="fma-shade1"
              initial="hidden"
              animate={isCurrent('shade1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={squareX + 1}
                y={squareY + 1}
                width={squareSize - 2}
                height={fraction1.numerator * rowHeight - 2}
                fill={hexToRgba(primaryColor, 0.25)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Divide vertically (fraction2 = columns) */}
        <AnimatePresence>
          {isVisible('vertical') && (
            <motion.g
              data-testid="fma-vertical"
              initial="hidden"
              animate={isCurrent('vertical') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: fraction2.denominator - 1 }, (_, i) => {
                const x = squareX + (i + 1) * colWidth
                return (
                  <motion.line
                    key={`v-line-${i}`}
                    x1={x}
                    y1={squareY}
                    x2={x}
                    y2={squareY + squareSize}
                    stroke={accentColor}
                    strokeWidth={diagram.lineWeight * 0.6}
                    strokeDasharray="4,3"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
              {/* Label for fraction2 on top */}
              <motion.text
                x={squareX + (fraction2.numerator * colWidth) / 2}
                y={squareY - 8}
                textAnchor="middle"
                style={{ fontSize: 14, fill: accentColor, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {fraction2.numerator}/{fraction2.denominator}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Show overlap as product */}
        <AnimatePresence>
          {isVisible('overlap') && (
            <motion.g
              data-testid="fma-overlap"
              initial="hidden"
              animate={isCurrent('overlap') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Overlap rectangle (darker shade) */}
              <motion.rect
                x={squareX + 1}
                y={squareY + 1}
                width={fraction2.numerator * colWidth - 2}
                height={fraction1.numerator * rowHeight - 2}
                fill={hexToRgba(primaryColor, 0.5)}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight * 0.8}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              />

              {/* Product label */}
              <motion.text
                data-testid="fma-product-label"
                x={width / 2}
                y={squareY + squareSize + 30}
                textAnchor="middle"
                style={{ fontSize: 20, fill: primaryColor, fontWeight: 700 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {fraction1.numerator}/{fraction1.denominator} {'\u00D7'} {fraction2.numerator}/{fraction2.denominator} = {productNumerator}/{productDenominator}
              </motion.text>

              {/* Shaded squares count */}
              <motion.text
                data-testid="fma-count-label"
                x={width / 2}
                y={squareY + squareSize + 52}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 13 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? `${productNumerator} תאים מוצללים מתוך ${productDenominator}`
                  : `${productNumerator} shaded cells out of ${productDenominator}`}
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

export default FractionMultiplicationArea
