'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MeasuresOfCenterData } from '@/types/math'
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

interface MeasuresOfCenterProps {
  data: MeasuresOfCenterData
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
  dataPoints: { en: 'Show data points', he: 'הצגת נקודות נתונים' },
  mean: { en: 'Show mean', he: 'הצגת ממוצע' },
  median: { en: 'Show median', he: 'הצגת חציון' },
  mode: { en: 'Show mode', he: 'הצגת שכיח' },
}

// ---------------------------------------------------------------------------
// Marker colors (distinct for each measure)
// ---------------------------------------------------------------------------

const MEASURE_COLORS = {
  mean: '#3b82f6',    // blue
  median: '#22c55e',  // green
  mode: '#f59e0b',    // amber
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeasuresOfCenter({
  data,
  className = '',
  width = 450,
  height = 200,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: MeasuresOfCenterProps) {
  const { data: values, mean, median, mode, range, title } = data

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const lineMin = dataMin - (dataMax - dataMin) * 0.1 - 0.5
  const lineMax = dataMax + (dataMax - dataMin) * 0.1 + 0.5

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'dataPoints', label: STEP_LABELS.dataPoints.en, labelHe: STEP_LABELS.dataPoints.he },
    { id: 'mean', label: STEP_LABELS.mean.en, labelHe: STEP_LABELS.mean.he },
    { id: 'median', label: STEP_LABELS.median.en, labelHe: STEP_LABELS.median.he },
    { id: 'mode', label: STEP_LABELS.mode.en, labelHe: STEP_LABELS.mode.he },
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

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Layout
  const padding = { left: 30, right: 30, top: 50, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const lineY = height / 2 + 10

  const scaleX = (v: number) =>
    padding.left + ((v - lineMin) / (lineMax - lineMin)) * plotWidth

  // Frequency map for data points (for dot stacking)
  const freqMap = useMemo(() => {
    const map = new Map<number, number>()
    values.forEach((v) => map.set(v, (map.get(v) || 0) + 1))
    return map
  }, [values])

  const dotRadius = 5
  const dotSpacing = dotRadius * 2.4

  // Arrow marker for measures
  const markerSize = 8

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="measures-of-center"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="moc-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="moc-svg"
        viewBox={viewBox}
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        {/* Step 0: Number line with data points */}
        <AnimatePresence>
          {isVisible('dataPoints') && (
            <motion.g
              data-testid="moc-data-points"
              initial="hidden"
              animate={isCurrent('dataPoints') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Number line */}
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

              {/* Tick marks for min and max */}
              {[dataMin, dataMax].map((v) => (
                <motion.g key={`tick-${v}`}>
                  <motion.line
                    x1={scaleX(v)}
                    y1={lineY - 4}
                    x2={scaleX(v)}
                    y2={lineY + 4}
                    stroke="#374151"
                    strokeWidth={1}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  <motion.text
                    x={scaleX(v)}
                    y={lineY + 18}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize={10}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {v}
                  </motion.text>
                </motion.g>
              ))}

              {/* Data point dots (stacked) */}
              {(() => {
                const positions: Array<{ value: number; stackIndex: number }> = []
                const countSoFar = new Map<number, number>()
                values.forEach((v) => {
                  const idx = countSoFar.get(v) || 0
                  positions.push({ value: v, stackIndex: idx })
                  countSoFar.set(v, idx + 1)
                })
                return positions.map((pos, i) => (
                  <motion.circle
                    key={`dp-${i}`}
                    cx={scaleX(pos.value)}
                    cy={lineY - dotRadius - 6 - pos.stackIndex * dotSpacing}
                    r={dotRadius}
                    fill={`${primaryColor}80`}
                    stroke={primaryColor}
                    strokeWidth={1}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                      delay: i * 0.04,
                    }}
                  />
                ))
              })()}

              {/* Range annotation */}
              {range !== undefined && (
                <motion.text
                  x={width / 2}
                  y={lineY + 32}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize={10}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he' ? 'טווח' : 'Range'} = {range}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Mean marker */}
        <AnimatePresence>
          {isVisible('mean') && (
            <motion.g
              data-testid="moc-mean"
              initial="hidden"
              animate={isCurrent('mean') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle marker pointing up */}
              <motion.polygon
                points={`${scaleX(mean)},${lineY + 8} ${scaleX(mean) - markerSize},${lineY + 8 + markerSize * 1.5} ${scaleX(mean) + markerSize},${lineY + 8 + markerSize * 1.5}`}
                fill={MEASURE_COLORS.mean}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              />
              {/* Label */}
              <motion.text
                x={scaleX(mean)}
                y={lineY + 8 + markerSize * 1.5 + 14}
                textAnchor="middle"
                fill={MEASURE_COLORS.mean}
                fontSize={11}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'ממוצע' : 'Mean'}: {Math.round(mean * 100) / 100}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Median marker */}
        <AnimatePresence>
          {isVisible('median') && (
            <motion.g
              data-testid="moc-median"
              initial="hidden"
              animate={isCurrent('median') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Diamond marker */}
              <motion.polygon
                points={`${scaleX(median)},${lineY + 10} ${scaleX(median) - markerSize},${lineY + 10 + markerSize} ${scaleX(median)},${lineY + 10 + markerSize * 2} ${scaleX(median) + markerSize},${lineY + 10 + markerSize}`}
                fill={MEASURE_COLORS.median}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              />
              {/* Vertical dashed line */}
              <motion.line
                x1={scaleX(median)}
                y1={lineY - 2}
                x2={scaleX(median)}
                y2={padding.top}
                stroke={MEASURE_COLORS.median}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ duration: 0.3 }}
              />
              <motion.text
                x={scaleX(median)}
                y={padding.top - 4}
                textAnchor="middle"
                fill={MEASURE_COLORS.median}
                fontSize={11}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'חציון' : 'Median'}: {median}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Mode marker(s) */}
        <AnimatePresence>
          {isVisible('mode') && (
            <motion.g
              data-testid="moc-mode"
              initial="hidden"
              animate={isCurrent('mode') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {mode.map((m, i) => (
                <motion.g key={`mode-${i}`}>
                  {/* Circle marker */}
                  <motion.circle
                    cx={scaleX(m)}
                    cy={lineY + 10 + markerSize}
                    r={markerSize}
                    fill="none"
                    stroke={MEASURE_COLORS.mode}
                    strokeWidth={2.5}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.1 }}
                  />
                  {/* Highlight ring around dot column */}
                  <motion.circle
                    cx={scaleX(m)}
                    cy={lineY - dotRadius - 6 - ((freqMap.get(m) || 1) - 1) * dotSpacing / 2}
                    r={dotRadius + 4}
                    fill="none"
                    stroke={MEASURE_COLORS.mode}
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                  />
                </motion.g>
              ))}
              {/* Mode label */}
              <motion.text
                x={scaleX(mode[0])}
                y={lineY + 10 + markerSize * 2 + 14}
                textAnchor="middle"
                fill={MEASURE_COLORS.mode}
                fontSize={11}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'שכיח' : 'Mode'}: {mode.join(', ')}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Legend */}
      {diagram.currentStep >= 1 && (
        <div className="flex items-center justify-center gap-4 mt-1 text-xs">
          {isVisible('mean') && (
            <span className="flex items-center gap-1">
              <span style={{ color: MEASURE_COLORS.mean }}>&#9650;</span>
              <span style={{ color: MEASURE_COLORS.mean, fontWeight: 600 }}>
                {language === 'he' ? 'ממוצע' : 'Mean'}
              </span>
            </span>
          )}
          {isVisible('median') && (
            <span className="flex items-center gap-1">
              <span style={{ color: MEASURE_COLORS.median }}>&#9670;</span>
              <span style={{ color: MEASURE_COLORS.median, fontWeight: 600 }}>
                {language === 'he' ? 'חציון' : 'Median'}
              </span>
            </span>
          )}
          {isVisible('mode') && (
            <span className="flex items-center gap-1">
              <span style={{ color: MEASURE_COLORS.mode }}>&#9675;</span>
              <span style={{ color: MEASURE_COLORS.mode, fontWeight: 600 }}>
                {language === 'he' ? 'שכיח' : 'Mode'}
              </span>
            </span>
          )}
        </div>
      )}

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

export default MeasuresOfCenter
