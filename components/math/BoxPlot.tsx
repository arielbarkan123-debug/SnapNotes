'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BoxPlotData } from '@/types/math'
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

interface BoxPlotProps {
  data: BoxPlotData
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
  numberLine: { en: 'Draw number line', he: 'ציור קו מספרים' },
  box: { en: 'Draw box (Q1 to Q3)', he: 'ציור קופסה (Q1 עד Q3)' },
  median: { en: 'Mark median', he: 'סימון חציון' },
  whiskers: { en: 'Draw whiskers', he: 'ציור שפמים' },
  outliers: { en: 'Show outliers', he: 'הצגת חריגים' },
  labels: { en: 'Show labels', he: 'הצגת תוויות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BoxPlot({
  data,
  className = '',
  width = 450,
  height = 180,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: BoxPlotProps) {
  const {
    min: dataMin,
    q1,
    median,
    q3,
    max: dataMax,
    outliers,
    title,
    showLabels: dataShowLabels,
  } = data

  const hasOutliers = outliers && outliers.length > 0

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'numberLine', label: STEP_LABELS.numberLine.en, labelHe: STEP_LABELS.numberLine.he },
      { id: 'box', label: STEP_LABELS.box.en, labelHe: STEP_LABELS.box.he },
      { id: 'median', label: STEP_LABELS.median.en, labelHe: STEP_LABELS.median.he },
      { id: 'whiskers', label: STEP_LABELS.whiskers.en, labelHe: STEP_LABELS.whiskers.he },
    ]
    if (hasOutliers) {
      defs.push({ id: 'outliers', label: STEP_LABELS.outliers.en, labelHe: STEP_LABELS.outliers.he })
    }
    defs.push({ id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he })
    return defs
  }, [hasOutliers])

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
  const padding = { left: 30, right: 30, top: 25, bottom: 45 }
  const plotWidth = width - padding.left - padding.right
  const boxCenterY = height / 2 - 5
  const boxHeight = 40

  // Compute full data range including outliers
  const allValues = [dataMin, q1, median, q3, dataMax, ...(outliers ?? [])]
  const rangeMin = Math.min(...allValues)
  const rangeMax = Math.max(...allValues)
  const rangePadding = (rangeMax - rangeMin) * 0.05 || 1

  const scaleX = (v: number) =>
    padding.left +
    ((v - (rangeMin - rangePadding)) / (rangeMax - rangeMin + 2 * rangePadding)) * plotWidth

  // Number line ticks
  const lineY = height - padding.bottom
  const numTicks = 6
  const tickStep = (rangeMax - rangeMin) / (numTicks - 1) || 1
  const ticks = Array.from({ length: numTicks }, (_, i) =>
    Math.round((rangeMin + i * tickStep) * 10) / 10
  )

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="box-plot"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="bp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="bp-svg"
        viewBox={viewBox}
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        {/* Step 0: Number line */}
        <AnimatePresence>
          {isVisible('numberLine') && (
            <motion.g
              data-testid="bp-number-line"
              initial="hidden"
              animate={isCurrent('numberLine') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={padding.left}
                y1={lineY}
                x2={width - padding.right}
                y2={lineY}
                stroke="#374151"
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {ticks.map((tick) => (
                <motion.g key={`tick-${tick}`}>
                  <motion.line
                    x1={scaleX(tick)}
                    y1={lineY - 4}
                    x2={scaleX(tick)}
                    y2={lineY + 4}
                    stroke="#374151"
                    strokeWidth={1}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  <motion.text
                    x={scaleX(tick)}
                    y={lineY + 18}
                    textAnchor="middle"
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
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Box (Q1 to Q3) */}
        <AnimatePresence>
          {isVisible('box') && (
            <motion.g
              data-testid="bp-box"
              initial="hidden"
              animate={isCurrent('box') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={scaleX(q1)}
                y={boxCenterY - boxHeight / 2}
                width={scaleX(q3) - scaleX(q1)}
                height={boxHeight}
                fill={`${primaryColor}20`}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                rx={2}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{ transformOrigin: `${scaleX(q1)}px ${boxCenterY}px` }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Median line */}
        <AnimatePresence>
          {isVisible('median') && (
            <motion.g
              data-testid="bp-median"
              initial="hidden"
              animate={isCurrent('median') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={scaleX(median)}
                y1={boxCenterY - boxHeight / 2}
                x2={scaleX(median)}
                y2={boxCenterY + boxHeight / 2}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight + 1}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Whiskers */}
        <AnimatePresence>
          {isVisible('whiskers') && (
            <motion.g
              data-testid="bp-whiskers"
              initial="hidden"
              animate={isCurrent('whiskers') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Left whisker */}
              <motion.line
                x1={scaleX(dataMin)}
                y1={boxCenterY}
                x2={scaleX(q1)}
                y2={boxCenterY}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="4 3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Left whisker cap */}
              <motion.line
                x1={scaleX(dataMin)}
                y1={boxCenterY - boxHeight / 4}
                x2={scaleX(dataMin)}
                y2={boxCenterY + boxHeight / 4}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Right whisker */}
              <motion.line
                x1={scaleX(q3)}
                y1={boxCenterY}
                x2={scaleX(dataMax)}
                y2={boxCenterY}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="4 3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right whisker cap */}
              <motion.line
                x1={scaleX(dataMax)}
                y1={boxCenterY - boxHeight / 4}
                x2={scaleX(dataMax)}
                y2={boxCenterY + boxHeight / 4}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Outliers */}
        <AnimatePresence>
          {hasOutliers && isVisible('outliers') && (
            <motion.g
              data-testid="bp-outliers"
              initial="hidden"
              animate={isCurrent('outliers') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {outliers!.map((o, i) => (
                <motion.circle
                  key={`outlier-${i}`}
                  cx={scaleX(o)}
                  cy={boxCenterY}
                  r={4}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.1 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 5: Labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="bp-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Min label */}
              <motion.text
                x={scaleX(dataMin)}
                y={boxCenterY - boxHeight / 2 - 8}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={10}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Min: {dataMin}
              </motion.text>

              {/* Q1 label */}
              <motion.text
                x={scaleX(q1)}
                y={boxCenterY + boxHeight / 2 + 15}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={10}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Q1: {q1}
              </motion.text>

              {/* Median label */}
              <motion.text
                x={scaleX(median)}
                y={boxCenterY - boxHeight / 2 - 8}
                textAnchor="middle"
                fill={accentColor}
                fontSize={10}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Med: {median}
              </motion.text>

              {/* Q3 label */}
              <motion.text
                x={scaleX(q3)}
                y={boxCenterY + boxHeight / 2 + 15}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={10}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Q3: {q3}
              </motion.text>

              {/* Max label */}
              <motion.text
                x={scaleX(dataMax)}
                y={boxCenterY - boxHeight / 2 - 8}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={10}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Max: {dataMax}
              </motion.text>

              {/* IQR bracket */}
              <motion.text
                x={(scaleX(q1) + scaleX(q3)) / 2}
                y={boxCenterY + boxHeight / 2 + 28}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={9}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                IQR = {q3 - q1}
              </motion.text>
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

export default BoxPlot
