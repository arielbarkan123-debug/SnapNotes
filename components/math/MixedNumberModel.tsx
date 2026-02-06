'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MixedNumberModelData, Fraction } from '@/types/math'
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

interface MixedNumberModelProps {
  data: MixedNumberModelData
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
  wholes: { en: 'Show whole circles', he: 'הצגת עיגולים שלמים' },
  fraction: { en: 'Show fractional part', he: 'הצגת חלק שברי' },
  mixed: { en: 'Show mixed number', he: 'הצגת מספר מעורב' },
  improper: { en: 'Show improper fraction', he: 'הצגת שבר מדומה' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toImproperFraction(wholeNumber: number, fraction: Fraction): Fraction {
  return {
    numerator: wholeNumber * fraction.denominator + fraction.numerator,
    denominator: fraction.denominator,
  }
}

// ---------------------------------------------------------------------------
// Sub-components: Circle model pieces
// ---------------------------------------------------------------------------

function WholeCircle({
  cx,
  cy,
  r,
  fillColor,
  strokeColor,
  lineWeight,
  denominator,
  index,
}: {
  cx: number
  cy: number
  r: number
  fillColor: string
  strokeColor: string
  lineWeight: number
  denominator: number
  index: number
}) {
  const sliceAngle = (2 * Math.PI) / denominator
  const slices = Array.from({ length: denominator }, (_, i) => {
    const startAngle = i * sliceAngle - Math.PI / 2
    const endAngle = (i + 1) * sliceAngle - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = sliceAngle > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
  })

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.15 }}
    >
      {slices.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={lineWeight * 0.5}
        />
      ))}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={lineWeight}
      />
    </motion.g>
  )
}

function FractionalCircle({
  cx,
  cy,
  r,
  numerator,
  denominator,
  fillColor,
  emptyColor,
  strokeColor,
  lineWeight,
}: {
  cx: number
  cy: number
  r: number
  numerator: number
  denominator: number
  fillColor: string
  emptyColor: string
  strokeColor: string
  lineWeight: number
}) {
  const sliceAngle = (2 * Math.PI) / denominator
  const slices = Array.from({ length: denominator }, (_, i) => {
    const startAngle = i * sliceAngle - Math.PI / 2
    const endAngle = (i + 1) * sliceAngle - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = sliceAngle > Math.PI ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    return { d, filled: i < numerator }
  })

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {slices.map((slice, i) => (
        <motion.path
          key={i}
          d={slice.d}
          fill={slice.filled ? fillColor : emptyColor}
          stroke={strokeColor}
          strokeWidth={lineWeight * 0.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        />
      ))}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={lineWeight}
      />
    </motion.g>
  )
}

// ---------------------------------------------------------------------------
// Sub-components: Bar model pieces
// ---------------------------------------------------------------------------

function WholeBar({
  x,
  y,
  width,
  height,
  fillColor,
  strokeColor,
  lineWeight,
  denominator,
  index,
}: {
  x: number
  y: number
  width: number
  height: number
  fillColor: string
  strokeColor: string
  lineWeight: number
  denominator: number
  index: number
}) {
  const partWidth = width / denominator
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.15 }}
    >
      {Array.from({ length: denominator }, (_, i) => (
        <rect
          key={i}
          x={x + i * partWidth}
          y={y}
          width={partWidth}
          height={height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={lineWeight * 0.5}
        />
      ))}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={strokeColor}
        strokeWidth={lineWeight}
        rx={4}
      />
    </motion.g>
  )
}

function FractionalBar({
  x,
  y,
  width,
  height,
  numerator,
  denominator,
  fillColor,
  emptyColor,
  strokeColor,
  lineWeight,
}: {
  x: number
  y: number
  width: number
  height: number
  numerator: number
  denominator: number
  fillColor: string
  emptyColor: string
  strokeColor: string
  lineWeight: number
}) {
  const partWidth = width / denominator
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {Array.from({ length: denominator }, (_, i) => (
        <motion.rect
          key={i}
          x={x + i * partWidth}
          y={y}
          width={partWidth}
          height={height}
          fill={i < numerator ? fillColor : emptyColor}
          stroke={strokeColor}
          strokeWidth={lineWeight * 0.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        />
      ))}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={strokeColor}
        strokeWidth={lineWeight}
        rx={4}
      />
    </motion.g>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MixedNumberModel({
  data,
  className = '',
  width = 500,
  height = 250,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: MixedNumberModelProps) {
  const { wholeNumber, fraction, showImproper, modelType = 'circle', title } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'wholes', label: STEP_LABELS.wholes.en, labelHe: STEP_LABELS.wholes.he },
      { id: 'fraction', label: STEP_LABELS.fraction.en, labelHe: STEP_LABELS.fraction.he },
      { id: 'mixed', label: STEP_LABELS.mixed.en, labelHe: STEP_LABELS.mixed.he },
    ]
    if (showImproper) {
      defs.push({ id: 'improper', label: STEP_LABELS.improper.en, labelHe: STEP_LABELS.improper.he })
    }
    return defs
  }, [showImproper])

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
  const lightColor = diagram.colors.light

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  const improperFraction = toImproperFraction(wholeNumber, fraction)

  // Layout calculations
  const totalPieces = wholeNumber + 1
  const padding = 30
  const availableWidth = width - padding * 2

  // Circle model layout
  const circleRadius = Math.min(
    (availableWidth / totalPieces - 10) / 2,
    (height - 100) / 2 - 10
  )
  const circleY = height / 2 - 10
  const circleSpacing = availableWidth / totalPieces
  const startX = padding + circleSpacing / 2

  // Bar model layout
  const barWidth = Math.min((availableWidth - (totalPieces - 1) * 8) / totalPieces, 120)
  const barHeight = 50
  const barY = height / 2 - barHeight / 2 - 15
  const barSpacing = barWidth + 8
  const barStartX = (width - totalPieces * barSpacing + 8) / 2

  return (
    <div
      data-testid="mixed-number-model"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Mixed number model: ${wholeNumber} and ${fraction.numerator}/${fraction.denominator}`}
      >
        {/* Background */}
        <rect
          data-testid="mnm-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <motion.text
            data-testid="mnm-title"
            x={width / 2}
            y={24}
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

        {/* Step 0: Whole number circles/bars */}
        <AnimatePresence>
          {isVisible('wholes') && (
            <motion.g
              data-testid="mnm-wholes"
              initial="hidden"
              animate={isCurrent('wholes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {modelType === 'circle'
                ? Array.from({ length: wholeNumber }, (_, i) => (
                    <WholeCircle
                      key={`whole-${i}`}
                      cx={startX + i * circleSpacing}
                      cy={circleY}
                      r={circleRadius}
                      fillColor={primaryColor}
                      strokeColor={primaryColor}
                      lineWeight={diagram.lineWeight}
                      denominator={fraction.denominator}
                      index={i}
                    />
                  ))
                : Array.from({ length: wholeNumber }, (_, i) => (
                    <WholeBar
                      key={`whole-${i}`}
                      x={barStartX + i * barSpacing}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fillColor={primaryColor}
                      strokeColor={primaryColor}
                      lineWeight={diagram.lineWeight}
                      denominator={fraction.denominator}
                      index={i}
                    />
                  ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Fractional circle/bar */}
        <AnimatePresence>
          {isVisible('fraction') && (
            <motion.g
              data-testid="mnm-fraction"
              initial="hidden"
              animate={isCurrent('fraction') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {modelType === 'circle' ? (
                <FractionalCircle
                  cx={startX + wholeNumber * circleSpacing}
                  cy={circleY}
                  r={circleRadius}
                  numerator={fraction.numerator}
                  denominator={fraction.denominator}
                  fillColor={accentColor}
                  emptyColor={lightColor}
                  strokeColor={accentColor}
                  lineWeight={diagram.lineWeight}
                />
              ) : (
                <FractionalBar
                  x={barStartX + wholeNumber * barSpacing}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  numerator={fraction.numerator}
                  denominator={fraction.denominator}
                  fillColor={accentColor}
                  emptyColor={lightColor}
                  strokeColor={accentColor}
                  lineWeight={diagram.lineWeight}
                />
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Mixed number label */}
        <AnimatePresence>
          {isVisible('mixed') && (
            <motion.g
              data-testid="mnm-mixed-label"
              initial="hidden"
              animate={isCurrent('mixed') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 20}
                textAnchor="middle"
                className="fill-current font-bold"
                style={{ fontSize: 22, fill: primaryColor }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {wholeNumber}
                {' '}
                {fraction.numerator}/{fraction.denominator}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Improper fraction equivalent */}
        <AnimatePresence>
          {showImproper && isVisible('improper') && (
            <motion.g
              data-testid="mnm-improper"
              initial="hidden"
              animate={isCurrent('improper') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 20}
                textAnchor="middle"
                className="fill-current font-bold"
                style={{ fontSize: 22, fill: primaryColor }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {wholeNumber} {fraction.numerator}/{fraction.denominator} = {improperFraction.numerator}/{improperFraction.denominator}
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

export default MixedNumberModel
