'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HistogramData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  lineDrawVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistogramProps {
  data: HistogramData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  showStepCounter?: boolean
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  axes: { en: 'Draw axes', he: 'ציור צירים' },
  bars: { en: 'Show frequency bars', he: 'הצגת עמודות תדירות' },
  labels: { en: 'Show labels', he: 'הצגת תוויות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Histogram({
  data,
  className = '',
  width = 450,
  height = 280,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: HistogramProps) {
  const { bins, title, xAxisLabel, yAxisLabel } = data

  const maxCount = Math.max(...bins.map((b) => b.count), 1)

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'bars', label: STEP_LABELS.bars.en, labelHe: STEP_LABELS.bars.he },
    { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
  ], [])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
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

  // Layout
  const padding = { left: 55, right: 20, top: 15, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const originX = padding.left
  const originY = height - padding.bottom

  const barWidth = plotWidth / bins.length

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const step = Math.ceil(maxCount / 5) || 1
    const ticks: number[] = []
    for (let i = 0; i <= maxCount; i += step) {
      ticks.push(i)
    }
    if (ticks[ticks.length - 1] < maxCount) {
      ticks.push(maxCount)
    }
    return ticks
  }, [maxCount])

  const scaleY = (count: number) => originY - (count / maxCount) * plotHeight

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="histogram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="hist-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="hist-svg"
        viewBox={viewBox}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="hist-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Y-axis */}
              <motion.line
                x1={originX}
                y1={padding.top}
                x2={originX}
                y2={originY}
                stroke="#374151"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* X-axis */}
              <motion.line
                x1={originX}
                y1={originY}
                x2={originX + plotWidth}
                y2={originY}
                stroke="#374151"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Y-axis ticks and labels */}
              {yTicks.map((tick) => (
                <motion.g key={`y-${tick}`}>
                  <motion.line
                    x1={originX - 4}
                    y1={scaleY(tick)}
                    x2={originX}
                    y2={scaleY(tick)}
                    stroke="#374151"
                    strokeWidth={1}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  {/* Grid line */}
                  <motion.line
                    x1={originX}
                    y1={scaleY(tick)}
                    x2={originX + plotWidth}
                    y2={scaleY(tick)}
                    stroke="#e5e7eb"
                    strokeWidth={0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.text
                    x={originX - 8}
                    y={scaleY(tick) + 4}
                    textAnchor="end"
                    fill="#6b7280"
                    fontSize={10}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {tick}
                  </motion.text>
                </motion.g>
              ))}

              {/* Y-axis label */}
              {yAxisLabel && (
                <motion.text
                  x={12}
                  y={originY / 2 + padding.top / 2}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={11}
                  fontWeight={500}
                  transform={`rotate(-90, 12, ${originY / 2 + padding.top / 2})`}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {yAxisLabel}
                </motion.text>
              )}

              {/* X-axis label */}
              {xAxisLabel && (
                <motion.text
                  x={originX + plotWidth / 2}
                  y={height - 5}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={11}
                  fontWeight={500}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {xAxisLabel}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Bars */}
        <AnimatePresence>
          {isVisible('bars') && (
            <motion.g
              data-testid="hist-bars"
              initial="hidden"
              animate={isCurrent('bars') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {bins.map((bin, i) => {
                const barH = (bin.count / maxCount) * plotHeight
                const x = originX + i * barWidth
                const barY = originY - barH
                return (
                  <motion.rect
                    key={`bar-${i}`}
                    data-testid={`hist-bar-${i}`}
                    x={x}
                    y={barY}
                    width={barWidth}
                    height={barH}
                    fill={`${primaryColor}60`}
                    stroke={primaryColor}
                    strokeWidth={diagram.lineWeight * 0.5}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    style={{ transformOrigin: `${x + barWidth / 2}px ${originY}px` }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                      delay: Math.min(i * 0.1, 1.5),
                    }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Bin labels and count labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="hist-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {bins.map((bin, i) => {
                const x = originX + i * barWidth + barWidth / 2
                const barH = (bin.count / maxCount) * plotHeight
                const barY = originY - barH
                return (
                  <motion.g key={`label-${i}`}>
                    {/* Bin range label below x-axis */}
                    <motion.text
                      x={x}
                      y={originY + 15}
                      textAnchor="middle"
                      className="fill-gray-700 dark:fill-gray-300"
                      fontSize={9}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {bin.min}-{bin.max}
                    </motion.text>

                    {/* Count above bar */}
                    {bin.count > 0 && (
                      <motion.text
                        x={x}
                        y={barY - 4}
                        textAnchor="middle"
                        fill={primaryColor}
                        fontSize={10}
                        fontWeight={600}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {bin.count}
                      </motion.text>
                    )}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

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

export default Histogram
