'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FractionBarData } from '@/types/math'
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

interface FractionBarProps {
  data: FractionBarData
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
  outline: { en: 'Draw the bar', he: 'ציור הסרגל' },
  divide: { en: 'Divide into parts', he: 'חלוקה לחלקים' },
  shade: { en: 'Shade the fraction', he: 'צביעת השבר' },
  label: { en: 'Show the label', he: 'הצגת התווית' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionBar({
  data,
  className = '',
  width = 400,
  height = 200,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: FractionBarProps) {
  const { numerator, denominator, showEquivalent, color, title, showLabel = true } = data

  const hasEquivalent = !!showEquivalent

  const stepDefs = useMemo(() => [
    { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
    { id: 'divide', label: STEP_LABELS.divide.en, labelHe: STEP_LABELS.divide.he },
    { id: 'shade', label: STEP_LABELS.shade.en, labelHe: STEP_LABELS.shade.he },
    { id: 'label', label: STEP_LABELS.label.en, labelHe: STEP_LABELS.label.he },
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
  const fillColor = color || primaryColor
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  const padding = { left: 30, right: 30, top: 40, bottom: 30 }
  const barWidth = width - padding.left - padding.right
  const barHeight = 40
  const barY = hasEquivalent ? padding.top + 10 : height / 2 - barHeight / 2
  const barX = padding.left

  // Equivalent bar
  const equivBarY = barY + barHeight + 30
  const equivDenom = showEquivalent?.denominator ?? denominator
  const equivNum = showEquivalent?.numerator ?? numerator

  // Part width
  const partWidth = barWidth / Math.max(denominator, 1)
  const equivPartWidth = barWidth / Math.max(equivDenom, 1)

  // ---------------------------------------------------------------------------
  // Render a fraction bar
  // ---------------------------------------------------------------------------

  function renderBar(
    bx: number, by: number, bw: number, bh: number,
    num: number, denom: number, pw: number,
    fColor: string, prefix: string,
  ) {
    return (
      <>
        {/* Step 0: Outline */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.rect
              data-testid={`${prefix}-outline`}
              x={bx}
              y={by}
              width={bw}
              height={bh}
              fill="none"
              stroke="currentColor"
              strokeWidth={diagram.lineWeight}
              rx={3}
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            />
          )}
        </AnimatePresence>

        {/* Step 1: Division lines */}
        <AnimatePresence>
          {isVisible('divide') && (
            <motion.g
              data-testid={`${prefix}-divisions`}
              initial="hidden"
              animate={isCurrent('divide') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: denom - 1 }, (_, i) => {
                const x = bx + (i + 1) * pw
                return (
                  <motion.line
                    key={`${prefix}-divline-${i}`}
                    x1={x}
                    y1={by}
                    x2={x}
                    y2={by + bh}
                    stroke="currentColor"
                    strokeWidth={diagram.lineWeight * 0.6}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                    transition={{ delay: i * 0.05 }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Shaded parts */}
        <AnimatePresence>
          {isVisible('shade') && (
            <motion.g
              data-testid={`${prefix}-shaded`}
              initial="hidden"
              animate={isCurrent('shade') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: num }, (_, i) => {
                const x = bx + i * pw
                const isFirst = i === 0
                const isLast = i === denom - 1
                return (
                  <motion.rect
                    key={`${prefix}-shade-${i}`}
                    data-testid={`${prefix}-shade-${i}`}
                    x={x}
                    y={by}
                    width={pw}
                    height={bh}
                    fill={fColor}
                    fillOpacity={0.5}
                    stroke={fColor}
                    strokeWidth={1}
                    rx={isFirst || isLast ? 3 : 0}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    style={{ transformOrigin: `${x}px ${by + bh / 2}px` }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <div
      data-testid="fraction-bar"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Fraction bar: ${numerator}/${denominator}${title ? ` - ${title}` : ''}`}
      >
        <rect width={width} height={height} rx={4} className="fill-white dark:fill-gray-900" />

        {/* Title */}
        {title && (
          <text
            data-testid="fb-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
          >
            {title}
          </text>
        )}

        {/* Main fraction bar */}
        {renderBar(barX, barY, barWidth, barHeight, numerator, denominator, partWidth, fillColor, 'fb-main')}

        {/* Equivalent fraction bar */}
        {hasEquivalent && showEquivalent && renderBar(
          barX, equivBarY, barWidth, barHeight,
          equivNum, equivDenom, equivPartWidth,
          showEquivalent.color || diagram.colors.accent,
          'fb-equiv',
        )}

        {/* Step 3: Labels */}
        <AnimatePresence>
          {showLabel && isVisible('label') && (
            <motion.g
              data-testid="fb-labels"
              initial="hidden"
              animate={isCurrent('label') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Main fraction label */}
              <motion.text
                data-testid="fb-main-label"
                x={barX + barWidth + 14}
                y={barY + barHeight / 2 + 6}
                textAnchor="start"
                className="fill-current font-semibold"
                style={{ fontSize: 18 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {numerator}/{denominator}
              </motion.text>

              {/* Equivalent label */}
              {hasEquivalent && showEquivalent && (
                <motion.text
                  data-testid="fb-equiv-label"
                  x={barX + barWidth + 14}
                  y={equivBarY + barHeight / 2 + 6}
                  textAnchor="start"
                  className="fill-current font-semibold"
                  style={{ fontSize: 18 }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.15 }}
                >
                  {equivNum}/{equivDenom}
                </motion.text>
              )}

              {/* Equals sign between bars if equivalent */}
              {hasEquivalent && (
                <motion.text
                  data-testid="fb-equals"
                  x={barX - 16}
                  y={(barY + barHeight + equivBarY) / 2 + 6}
                  textAnchor="middle"
                  className="fill-current"
                  style={{ fontSize: 22, fontWeight: 600 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  =
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

export default FractionBar
