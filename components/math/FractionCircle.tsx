'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FractionCircleData } from '@/types/math'
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

interface FractionCircleProps {
  data: FractionCircleData
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
  circle: { en: 'Draw the circle', he: 'ציור העיגול' },
  divide: { en: 'Divide into parts', he: 'חלוקה לחלקים' },
  shade: { en: 'Shade the fraction', he: 'צביעת השבר' },
  label: { en: 'Show the label', he: 'הצגת התווית' },
}

// ---------------------------------------------------------------------------
// SVG Arc Helper
// ---------------------------------------------------------------------------

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  // Angles in degrees, 0 = top (12 o'clock), clockwise
  const startRad = ((startAngle - 90) * Math.PI) / 180
  const endRad = ((endAngle - 90) * Math.PI) / 180

  const x1 = cx + radius * Math.cos(startRad)
  const y1 = cy + radius * Math.sin(startRad)
  const x2 = cx + radius * Math.cos(endRad)
  const y2 = cy + radius * Math.sin(endRad)

  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionCircle({
  data,
  className = '',
  width = 400,
  height = 300,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: FractionCircleProps) {
  const { numerator, denominator, showLabel, color, compareTo, title } = data

  const hasComparison = !!compareTo

  const stepDefs = useMemo(() => [
    { id: 'circle', label: STEP_LABELS.circle.en, labelHe: STEP_LABELS.circle.he },
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

  const mainCx = hasComparison ? width * 0.3 : width / 2
  const mainCy = height / 2 + 10
  const radius = Math.min(hasComparison ? width * 0.22 : width * 0.3, height * 0.35)

  const compCx = width * 0.7
  const compCy = mainCy
  const compRadius = radius

  const sliceAngle = 360 / Math.max(denominator, 1)

  // Comparison slice angle
  const compSliceAngle = compareTo ? 360 / Math.max(compareTo.denominator, 1) : 0

  // ---------------------------------------------------------------------------
  // Render a single fraction circle
  // ---------------------------------------------------------------------------

  function renderCircle(
    cx: number, cy: number, r: number,
    num: number, denom: number,
    slAngle: number, fColor: string,
    prefix: string,
  ) {
    return (
      <>
        {/* Step 0: Circle outline */}
        <AnimatePresence>
          {isVisible('circle') && (
            <motion.circle
              data-testid={`${prefix}-circle`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={diagram.lineWeight}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
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
              {Array.from({ length: denom }, (_, i) => {
                const angle = ((i * slAngle - 90) * Math.PI) / 180
                const x2 = cx + r * Math.cos(angle)
                const y2 = cy + r * Math.sin(angle)
                return (
                  <motion.line
                    key={`${prefix}-div-${i}`}
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth={diagram.lineWeight * 0.7}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Shaded sectors */}
        <AnimatePresence>
          {isVisible('shade') && (
            <motion.g
              data-testid={`${prefix}-shaded`}
              initial="hidden"
              animate={isCurrent('shade') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: num }, (_, i) => {
                const startAngle = i * slAngle
                const endAngle = (i + 1) * slAngle
                const path = describeArc(cx, cy, r, startAngle, endAngle)
                return (
                  <motion.path
                    key={`${prefix}-sector-${i}`}
                    data-testid={`${prefix}-sector-${i}`}
                    d={path}
                    fill={fColor}
                    fillOpacity={0.5}
                    stroke={fColor}
                    strokeWidth={1}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
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
      data-testid="fraction-circle"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Fraction circle: ${numerator}/${denominator}${title ? ` - ${title}` : ''}`}
      >
        <rect width={width} height={height} rx={4} className="fill-white dark:fill-gray-900" />

        {/* Title */}
        {title && (
          <text
            data-testid="fc-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
          >
            {title}
          </text>
        )}

        {/* Main circle */}
        {renderCircle(mainCx, mainCy, radius, numerator, denominator, sliceAngle, fillColor, 'fc-main')}

        {/* Comparison circle */}
        {hasComparison && compareTo && renderCircle(
          compCx, compCy, compRadius,
          compareTo.numerator, compareTo.denominator,
          compSliceAngle,
          compareTo.color || diagram.colors.accent,
          'fc-comp',
        )}

        {/* Step 3: Labels */}
        <AnimatePresence>
          {showLabel && isVisible('label') && (
            <motion.g
              data-testid="fc-labels"
              initial="hidden"
              animate={isCurrent('label') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Main fraction label */}
              <motion.g initial="hidden" animate="visible" variants={labelAppearVariants}>
                <text
                  data-testid="fc-main-label"
                  x={mainCx}
                  y={mainCy + radius + 28}
                  textAnchor="middle"
                  className="fill-current font-semibold"
                  style={{ fontSize: 18 }}
                >
                  {numerator}/{denominator}
                </text>
              </motion.g>

              {/* Comparison label */}
              {hasComparison && compareTo && (
                <motion.g initial="hidden" animate="visible" variants={labelAppearVariants} transition={{ delay: 0.15 }}>
                  <text
                    data-testid="fc-comp-label"
                    x={compCx}
                    y={compCy + compRadius + 28}
                    textAnchor="middle"
                    className="fill-current font-semibold"
                    style={{ fontSize: 18 }}
                  >
                    {compareTo.numerator}/{compareTo.denominator}
                  </text>
                </motion.g>
              )}

              {/* Equals / comparison symbol */}
              {hasComparison && (
                <motion.text
                  data-testid="fc-comparison-symbol"
                  x={width / 2}
                  y={mainCy + 6}
                  textAnchor="middle"
                  className="fill-current"
                  style={{ fontSize: 24, fontWeight: 600 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {numerator / denominator === (compareTo?.numerator ?? 0) / (compareTo?.denominator ?? 1) ? '=' : numerator / denominator > (compareTo?.numerator ?? 0) / (compareTo?.denominator ?? 1) ? '>' : '<'}
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

export default FractionCircle
