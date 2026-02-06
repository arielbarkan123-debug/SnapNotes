'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FractionDivisionModelData, Fraction } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { hexToRgba } from '@/lib/diagram-theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FractionDivisionModelProps {
  data: FractionDivisionModelData
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
  dividend: { en: 'Show the dividend', he: 'הצגת המחולק' },
  divisor: { en: 'Show the divisor unit', he: 'הצגת יחידת המחלק' },
  groups: { en: 'Show groups fitting', he: 'הצגת הקבוצות' },
  quotient: { en: 'Show the quotient', he: 'הצגת המנה' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GROUP_COLORS = [
  '#6366f1', '#f59e0b', '#22c55e', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
]

function fractionToDecimal(f: Fraction): number {
  return f.numerator / f.denominator
}

function formatFraction(f: Fraction): string {
  if (f.wholeNumber && f.wholeNumber > 0) {
    return `${f.wholeNumber} ${f.numerator}/${f.denominator}`
  }
  return `${f.numerator}/${f.denominator}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionDivisionModel({
  data,
  className = '',
  width = 500,
  height = 280,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: FractionDivisionModelProps) {
  const { dividend, divisor, showGroups: _showGroups, quotient, title } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'dividend', label: STEP_LABELS.dividend.en, labelHe: STEP_LABELS.dividend.he },
      { id: 'divisor', label: STEP_LABELS.divisor.en, labelHe: STEP_LABELS.divisor.he },
      { id: 'groups', label: STEP_LABELS.groups.en, labelHe: STEP_LABELS.groups.he },
      { id: 'quotient', label: STEP_LABELS.quotient.en, labelHe: STEP_LABELS.quotient.he },
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

  // Layout calculations
  const padding = { left: 40, right: 40, top: 55, bottom: 80 }
  const barAreaWidth = width - padding.left - padding.right
  const barHeight = 45

  // Dividend bar
  const dividendValue = fractionToDecimal(dividend)
  const divisorValue = fractionToDecimal(divisor)

  // How many full groups of divisor fit in dividend
  const numGroups = Math.floor(dividendValue / divisorValue)
  const remainder = dividendValue - numGroups * divisorValue

  // The quotient as a fraction (dividend / divisor = dividend * (1/divisor))
  const computedQuotient = quotient || {
    numerator: dividend.numerator * divisor.denominator,
    denominator: dividend.denominator * divisor.numerator,
  }

  // Bar widths (scaled to dividend)
  const dividendBarWidth = barAreaWidth
  const divisorUnitWidth = (divisorValue / dividendValue) * barAreaWidth
  const groupWidth = divisorUnitWidth

  // Dividend subdivisions (denominator-based)
  const dividendParts = Math.round(dividendValue * dividend.denominator)
  const partWidth = dividendBarWidth / dividendParts

  // Y positions
  const dividendY = padding.top
  const divisorY = dividendY + barHeight + 30

  return (
    <div
      data-testid="fraction-division-model"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Fraction division: ${formatFraction(dividend)} divided by ${formatFraction(divisor)}`}
      >
        {/* Background */}
        <rect
          data-testid="fdm-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <motion.text
            data-testid="fdm-title"
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

        {/* Step 0: Dividend bar */}
        <AnimatePresence>
          {isVisible('dividend') && (
            <motion.g
              data-testid="fdm-dividend"
              initial="hidden"
              animate={isCurrent('dividend') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Dividend bar with subdivisions */}
              {Array.from({ length: dividendParts }, (_, i) => (
                <motion.rect
                  key={`dividend-part-${i}`}
                  x={padding.left + i * partWidth}
                  y={dividendY}
                  width={partWidth}
                  height={barHeight}
                  fill={hexToRgba(primaryColor, 0.3)}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.4}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: Math.min(i * 0.05, 1.5), duration: 0.2 }}
                />
              ))}
              {/* Outer border */}
              <rect
                x={padding.left}
                y={dividendY}
                width={dividendBarWidth}
                height={barHeight}
                fill="none"
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                rx={4}
              />
              {/* Label */}
              <motion.text
                x={padding.left + dividendBarWidth / 2}
                y={dividendY + barHeight / 2 + 5}
                textAnchor="middle"
                style={{ fontSize: 16, fill: primaryColor, fontWeight: 700 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {formatFraction(dividend)}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Divisor unit */}
        <AnimatePresence>
          {isVisible('divisor') && (
            <motion.g
              data-testid="fdm-divisor"
              initial="hidden"
              animate={isCurrent('divisor') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={padding.left}
                y={divisorY}
                width={divisorUnitWidth}
                height={barHeight}
                fill={hexToRgba(accentColor, 0.3)}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                rx={4}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.4 }}
                style={{ transformOrigin: `${padding.left}px ${divisorY}px` }}
              />
              <motion.text
                x={padding.left + divisorUnitWidth / 2}
                y={divisorY + barHeight / 2 + 5}
                textAnchor="middle"
                style={{ fontSize: 14, fill: accentColor, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {formatFraction(divisor)}
              </motion.text>
              {/* Question label */}
              <motion.text
                x={padding.left + barAreaWidth / 2}
                y={divisorY + barHeight + 18}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 13, fontStyle: 'italic' }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? `כמה פעמים ${formatFraction(divisor)} נכנס ב-${formatFraction(dividend)}?`
                  : `How many times does ${formatFraction(divisor)} fit in ${formatFraction(dividend)}?`}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show groups fitting */}
        <AnimatePresence>
          {isVisible('groups') && (
            <motion.g
              data-testid="fdm-groups"
              initial="hidden"
              animate={isCurrent('groups') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: numGroups }, (_, i) => {
                const groupColor = GROUP_COLORS[i % GROUP_COLORS.length]
                return (
                  <motion.g
                    key={`group-${i}`}
                    data-testid={`fdm-group-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.15, 1.5), type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <rect
                      x={padding.left + i * groupWidth + 1}
                      y={dividendY + 1}
                      width={groupWidth - 2}
                      height={barHeight - 2}
                      fill={hexToRgba(groupColor, 0.35)}
                      stroke={groupColor}
                      strokeWidth={diagram.lineWeight * 0.8}
                      rx={3}
                    />
                    {/* Group number */}
                    <text
                      x={padding.left + i * groupWidth + groupWidth / 2}
                      y={dividendY - 6}
                      textAnchor="middle"
                      style={{ fontSize: 12, fill: groupColor, fontWeight: 600 }}
                    >
                      {i + 1}
                    </text>
                  </motion.g>
                )
              })}

              {/* Show remainder if any */}
              {remainder > 0.001 && (
                <motion.rect
                  x={padding.left + numGroups * groupWidth + 1}
                  y={dividendY + 1}
                  width={(remainder / dividendValue) * barAreaWidth - 2}
                  height={barHeight - 2}
                  fill={hexToRgba('#9ca3af', 0.2)}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="4,2"
                  rx={3}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: numGroups * 0.15 }}
                />
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show quotient */}
        <AnimatePresence>
          {isVisible('quotient') && (
            <motion.g
              data-testid="fdm-quotient"
              initial="hidden"
              animate={isCurrent('quotient') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                data-testid="fdm-quotient-label"
                x={width / 2}
                y={height - 25}
                textAnchor="middle"
                style={{ fontSize: 20, fill: primaryColor, fontWeight: 700 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {formatFraction(dividend)} {'\u00F7'} {formatFraction(divisor)} = {formatFraction(computedQuotient)}
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

export default FractionDivisionModel
