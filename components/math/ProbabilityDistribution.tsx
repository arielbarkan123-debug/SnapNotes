'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProbabilityDistributionData } from '@/types/math'
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

interface ProbabilityDistributionProps {
  data: ProbabilityDistributionData
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
  bars: { en: 'Show probability bars', he: 'הצגת עמודות הסתברות' },
  expected: { en: 'Show expected value', he: 'הצגת תוחלת' },
  labels: { en: 'Show labels', he: 'הצגת תוויות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProbabilityDistribution({
  data,
  className = '',
  width = 400,
  height = 300,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ProbabilityDistributionProps) {
  const { outcomes, expectedValue, title } = data

  const hasExpected = expectedValue !== undefined

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'bars', label: STEP_LABELS.bars.en, labelHe: STEP_LABELS.bars.he },
    ]
    if (hasExpected) {
      defs.push({ id: 'expected', label: STEP_LABELS.expected.en, labelHe: STEP_LABELS.expected.he })
    }
    defs.push({ id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he })
    return defs
  }, [hasExpected])

  // useDiagramBase
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'high_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility helpers
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

  // ---------------------------------------------------------------------------
  // Layout calculations
  // ---------------------------------------------------------------------------

  const padding = { top: 40, right: 30, bottom: 50, left: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const maxProb = Math.max(...outcomes.map((o) => o.probability), 0.01)
  const n = outcomes.length
  const barGap = 4
  const barWidth = Math.max(8, (plotWidth - (n - 1) * barGap) / n)

  const toSvgX = (index: number) => padding.left + index * (barWidth + barGap) + barWidth / 2
  const toSvgY = (prob: number) => padding.top + plotHeight - (prob / (maxProb * 1.2)) * plotHeight
  const barBaseY = padding.top + plotHeight

  // Expected value X position (for numeric outcomes)
  const getExpectedX = () => {
    if (expectedValue === undefined) return 0
    // Find position interpolated between bars
    const numericOutcomes = outcomes.map((o) => typeof o.value === 'number' ? o.value : parseFloat(String(o.value)))
    if (numericOutcomes.some(isNaN)) {
      // Non-numeric: compute weighted index
      const weightedIdx = outcomes.reduce((sum, o, i) => sum + o.probability * i, 0)
      return toSvgX(weightedIdx)
    }
    const oMin = Math.min(...numericOutcomes)
    const oMax = Math.max(...numericOutcomes)
    const range = oMax - oMin || 1
    const frac = (expectedValue - oMin) / range
    return padding.left + frac * (plotWidth - barWidth) + barWidth / 2
  }

  return (
    <div
      data-testid="probability-distribution"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Probability distribution${title ? `: ${title}` : ''} with ${n} outcomes`}
      >
        {/* Background */}
        <rect
          data-testid="pd-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="pd-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* -- Step 0: Axes ------------------------------------------------ */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="pd-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* X axis */}
              <motion.line
                x1={padding.left}
                y1={barBaseY}
                x2={padding.left + plotWidth}
                y2={barBaseY}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Y axis */}
              <motion.line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={barBaseY}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Y axis label */}
              <motion.text
                x={12}
                y={padding.top + plotHeight / 2}
                textAnchor="middle"
                transform={`rotate(-90, 12, ${padding.top + plotHeight / 2})`}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                P(X)
              </motion.text>

              {/* X axis label */}
              <motion.text
                x={padding.left + plotWidth / 2}
                y={height - 5}
                textAnchor="middle"
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'תוצאות' : 'Outcomes'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 1: Bars appear one by one ------------------------------ */}
        <AnimatePresence>
          {isVisible('bars') && (
            <motion.g
              data-testid="pd-bars"
              initial="hidden"
              animate={isCurrent('bars') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {outcomes.map((outcome, i) => {
                const x = toSvgX(i) - barWidth / 2
                const topY = toSvgY(outcome.probability)
                const barH = barBaseY - topY

                return (
                  <motion.rect
                    key={`bar-${i}`}
                    data-testid={`pd-bar-${i}`}
                    x={x}
                    y={topY}
                    width={barWidth}
                    height={barH}
                    fill={primaryColor}
                    opacity={0.8}
                    rx={2}
                    initial={{ scaleY: 0, originY: '100%' }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                      delay: i * 0.08,
                    }}
                    style={{ transformOrigin: `${x + barWidth / 2}px ${barBaseY}px` }}
                  />
                )
              })}

              {/* Outcome labels on x axis */}
              {outcomes.map((outcome, i) => (
                <motion.text
                  key={`xlabel-${i}`}
                  x={toSvgX(i)}
                  y={barBaseY + 15}
                  textAnchor="middle"
                  className="fill-current text-xs"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: i * 0.05 }}
                >
                  {outcome.label || String(outcome.value)}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Expected value line --------------------------------- */}
        <AnimatePresence>
          {hasExpected && isVisible('expected') && (
            <motion.g
              data-testid="pd-expected"
              initial="hidden"
              animate={isCurrent('expected') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                data-testid="pd-expected-line"
                x1={getExpectedX()}
                y1={padding.top}
                x2={getExpectedX()}
                y2={barBaseY}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight + 1}
                strokeDasharray="6,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={getExpectedX()}
                y={padding.top - 5}
                textAnchor="middle"
                className="text-xs font-medium"
                fill={accentColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                E(X) = {expectedValue.toFixed(2)}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 3: Probability value labels on bars -------------------- */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="pd-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {outcomes.map((outcome, i) => {
                const topY = toSvgY(outcome.probability)
                return (
                  <motion.text
                    key={`prob-${i}`}
                    data-testid={`pd-label-${i}`}
                    x={toSvgX(i)}
                    y={topY - 6}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill={primaryColor}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: i * 0.04 }}
                  >
                    {outcome.probability.toFixed(2)}
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

export default ProbabilityDistribution
