'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BinomialDistributionData } from '@/types/math'
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

interface BinomialDistributionProps {
  data: BinomialDistributionData
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
  histogram: { en: 'Build histogram bars', he: 'בניית עמודות היסטוגרמה' },
  mean: { en: 'Show mean line', he: 'הצגת קו ממוצע' },
  std: { en: 'Show std markers', he: 'הצגת סטיית תקן' },
  highlight: { en: 'Highlight P(X=k)', he: 'הדגשת P(X=k)' },
}

// ---------------------------------------------------------------------------
// Helper: Binomial PMF
// ---------------------------------------------------------------------------

function binomialCoeff(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  let result = 1
  for (let i = 0; i < Math.min(k, n - k); i++) {
    result = result * (n - i) / (i + 1)
  }
  return Math.round(result)
}

function binomialPMF(n: number, p: number, k: number): number {
  return binomialCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BinomialDistribution({
  data,
  className = '',
  width = 450,
  height = 320,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: BinomialDistributionProps) {
  const { n, p, highlightK, showMean = false, showStd = false, title } = data

  // Compute probabilities for k = 0..n
  const probabilities = useMemo(() => {
    return Array.from({ length: n + 1 }, (_, k) => ({
      k,
      probability: binomialPMF(n, p, k),
    }))
  }, [n, p])

  const mean = n * p
  const std = Math.sqrt(n * p * (1 - p))

  const hasHighlight = highlightK !== undefined && highlightK >= 0 && highlightK <= n

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'histogram', label: STEP_LABELS.histogram.en, labelHe: STEP_LABELS.histogram.he },
    ]
    if (showMean) {
      defs.push({ id: 'mean', label: STEP_LABELS.mean.en, labelHe: STEP_LABELS.mean.he })
    }
    if (showStd) {
      defs.push({ id: 'std', label: STEP_LABELS.std.en, labelHe: STEP_LABELS.std.he })
    }
    if (hasHighlight) {
      defs.push({ id: 'highlight', label: STEP_LABELS.highlight.en, labelHe: STEP_LABELS.highlight.he })
    }
    return defs
  }, [showMean, showStd, hasHighlight])

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

  const padding = { top: 40, right: 30, bottom: 50, left: 55 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const maxProb = Math.max(...probabilities.map((p) => p.probability), 0.01)
  const barGap = Math.max(1, Math.min(4, plotWidth / (n + 1) * 0.1))
  const barWidth = Math.max(6, (plotWidth - n * barGap) / (n + 1))

  const toSvgX = (k: number) => padding.left + k * (barWidth + barGap) + barWidth / 2
  const toSvgY = (prob: number) => padding.top + plotHeight - (prob / (maxProb * 1.2)) * plotHeight
  const barBaseY = padding.top + plotHeight

  // Mean X position
  const meanX = padding.left + (mean / n) * plotWidth

  return (
    <div
      data-testid="binomial-distribution"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Binomial distribution${title ? `: ${title}` : ''}, n=${n}, p=${p}`}
      >
        {/* Background */}
        <rect
          data-testid="bd-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="bd-title"
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
              data-testid="bd-axes"
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
                P(X = k)
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
                k
              </motion.text>

              {/* Parameter label */}
              <motion.text
                x={width - padding.right}
                y={padding.top - 5}
                textAnchor="end"
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                n={n}, p={p}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 1: Histogram bars -------------------------------------- */}
        <AnimatePresence>
          {isVisible('histogram') && (
            <motion.g
              data-testid="bd-histogram"
              initial="hidden"
              animate={isCurrent('histogram') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {probabilities.map(({ k, probability }) => {
                const x = toSvgX(k) - barWidth / 2
                const topY = toSvgY(probability)
                const barH = barBaseY - topY

                return (
                  <motion.g key={`bar-${k}`}>
                    <motion.rect
                      data-testid={`bd-bar-${k}`}
                      x={x}
                      y={topY}
                      width={barWidth}
                      height={Math.max(barH, 0.5)}
                      fill={primaryColor}
                      opacity={0.75}
                      rx={1}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                        delay: k * 0.03,
                      }}
                      style={{ transformOrigin: `${x + barWidth / 2}px ${barBaseY}px` }}
                    />

                    {/* K label below bar */}
                    {(n <= 20 || k % Math.ceil(n / 15) === 0) && (
                      <motion.text
                        x={toSvgX(k)}
                        y={barBaseY + 14}
                        textAnchor="middle"
                        className="fill-current"
                        style={{ fontSize: n > 15 ? '8px' : '10px' }}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {k}
                      </motion.text>
                    )}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Mean line ------------------------------------------- */}
        <AnimatePresence>
          {showMean && isVisible('mean') && (
            <motion.g
              data-testid="bd-mean"
              initial="hidden"
              animate={isCurrent('mean') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                data-testid="bd-mean-line"
                x1={meanX}
                y1={padding.top}
                x2={meanX}
                y2={barBaseY}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight + 1}
                strokeDasharray="6,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={meanX}
                y={padding.top - 5}
                textAnchor="middle"
                className="text-xs font-medium"
                fill={accentColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {'\u03BC'} = {mean.toFixed(1)}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 3: Std markers ----------------------------------------- */}
        <AnimatePresence>
          {showStd && isVisible('std') && (
            <motion.g
              data-testid="bd-std"
              initial="hidden"
              animate={isCurrent('std') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Mean - 1 std */}
              {(() => {
                const leftX = padding.left + ((mean - std) / n) * plotWidth
                const rightX = padding.left + ((mean + std) / n) * plotWidth
                const markerY = barBaseY - 10

                return (
                  <>
                    {/* Left std marker */}
                    <motion.line
                      data-testid="bd-std-left"
                      x1={leftX}
                      y1={padding.top}
                      x2={leftX}
                      y2={barBaseY}
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      strokeDasharray="4,3"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />

                    {/* Right std marker */}
                    <motion.line
                      data-testid="bd-std-right"
                      x1={rightX}
                      y1={padding.top}
                      x2={rightX}
                      y2={barBaseY}
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      strokeDasharray="4,3"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />

                    {/* Double arrow between std markers */}
                    <motion.line
                      x1={leftX}
                      y1={markerY}
                      x2={rightX}
                      y2={markerY}
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />

                    {/* Std label */}
                    <motion.text
                      x={(leftX + rightX) / 2}
                      y={markerY - 5}
                      textAnchor="middle"
                      className="text-xs font-medium"
                      fill="#22c55e"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {'\u03C3'} = {std.toFixed(2)}
                    </motion.text>
                  </>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 4: Highlight specific k -------------------------------- */}
        <AnimatePresence>
          {hasHighlight && isVisible('highlight') && (
            <motion.g
              data-testid="bd-highlight"
              initial="hidden"
              animate={isCurrent('highlight') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {(() => {
                const k = highlightK!
                const prob = probabilities[k]?.probability ?? 0
                const x = toSvgX(k) - barWidth / 2
                const topY = toSvgY(prob)
                const barH = barBaseY - topY

                return (
                  <>
                    {/* Highlight overlay bar */}
                    <motion.rect
                      data-testid={`bd-highlight-${k}`}
                      x={x - 2}
                      y={topY - 2}
                      width={barWidth + 4}
                      height={barH + 4}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      rx={3}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />

                    {/* Probability label */}
                    <motion.text
                      x={toSvgX(k)}
                      y={topY - 8}
                      textAnchor="middle"
                      className="text-xs font-bold"
                      fill="#ef4444"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      P(X={k}) = {prob.toFixed(4)}
                    </motion.text>
                  </>
                )
              })()}
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

export default BinomialDistribution
