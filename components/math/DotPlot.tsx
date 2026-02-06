'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DotPlotData } from '@/types/math'
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

interface DotPlotProps {
  data: DotPlotData
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
  dots: { en: 'Place dots', he: 'הצבת נקודות' },
  highlight: { en: 'Highlight value', he: 'הדגשת ערך' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DotPlot({
  data,
  className = '',
  width = 450,
  height = 200,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: DotPlotProps) {
  const { data: values, min, max, title, xAxisLabel, highlightValue } = data

  // Count frequency of each value
  const frequencyMap = useMemo(() => {
    const map = new Map<number, number>()
    values.forEach((v) => {
      map.set(v, (map.get(v) || 0) + 1)
    })
    return map
  }, [values])

  const _maxFrequency = Math.max(...frequencyMap.values(), 1)

  // Build unique sorted values on the line
  const uniqueValues = useMemo(() => {
    const set = new Set<number>()
    for (let v = min; v <= max; v++) {
      set.add(v)
    }
    values.forEach((v) => set.add(v))
    return Array.from(set).sort((a, b) => a - b)
  }, [values, min, max])

  // Build step definitions
  const hasHighlight = highlightValue !== undefined
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'numberLine', label: STEP_LABELS.numberLine.en, labelHe: STEP_LABELS.numberLine.he },
      { id: 'dots', label: STEP_LABELS.dots.en, labelHe: STEP_LABELS.dots.he },
    ]
    if (hasHighlight) {
      defs.push({ id: 'highlight', label: STEP_LABELS.highlight.en, labelHe: STEP_LABELS.highlight.he })
    }
    return defs
  }, [hasHighlight])

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
  const _accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Layout
  const padding = { left: 30, right: 30, top: 20, bottom: 45 }
  const plotWidth = width - padding.left - padding.right
  const _plotHeight = height - padding.top - padding.bottom
  const lineY = height - padding.bottom

  const dotRadius = Math.min(8, plotWidth / (uniqueValues.length * 3))
  const dotSpacing = dotRadius * 2.5

  const scaleX = (v: number) =>
    max === min
      ? padding.left + plotWidth / 2
      : padding.left + ((v - min) / (max - min)) * plotWidth

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="dot-plot"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="dp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="dp-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Number line */}
        <AnimatePresence>
          {isVisible('numberLine') && (
            <motion.g
              data-testid="dp-number-line"
              initial="hidden"
              animate={isCurrent('numberLine') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Main line */}
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

              {/* Tick marks and labels */}
              {uniqueValues.map((v) => {
                const x = scaleX(v)
                return (
                  <motion.g key={`tick-${v}`}>
                    <motion.line
                      x1={x}
                      y1={lineY - 4}
                      x2={x}
                      y2={lineY + 4}
                      stroke="#374151"
                      strokeWidth={diagram.lineWeight * 0.8}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      x={x}
                      y={lineY + 18}
                      textAnchor="middle"
                      className="fill-gray-700 dark:fill-gray-300"
                      fontSize={11}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {v}
                    </motion.text>
                  </motion.g>
                )
              })}

              {/* X-axis label */}
              {xAxisLabel && (
                <motion.text
                  x={width / 2}
                  y={lineY + 35}
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

        {/* Step 1: Dots */}
        <AnimatePresence>
          {isVisible('dots') && (
            <motion.g
              data-testid="dp-dots"
              initial="hidden"
              animate={isCurrent('dots') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from(frequencyMap.entries()).map(([value, count]) => {
                const x = scaleX(value)
                const isHighlighted = hasHighlight && highlightValue === value && isVisible('highlight')
                const valueIdx = Array.from(frequencyMap.keys()).indexOf(value)
                return (
                  <motion.g
                    key={`dots-${value}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                      delay: Math.min(valueIdx * 0.08, 1.5),
                    }}
                  >
                    {Array.from({ length: count }, (_, dotIdx) => (
                      <circle
                        key={`dot-${value}-${dotIdx}`}
                        cx={x}
                        cy={lineY - dotRadius - 4 - dotIdx * dotSpacing}
                        r={dotRadius}
                        fill={isHighlighted ? '#ef4444' : primaryColor}
                        stroke="white"
                        strokeWidth={1}
                      />
                    ))}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Highlight specific value */}
        <AnimatePresence>
          {hasHighlight && isVisible('highlight') && (
            <motion.g
              data-testid="dp-highlight"
              initial="hidden"
              animate={isCurrent('highlight') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {highlightValue !== undefined && (
                <>
                  <motion.line
                    x1={scaleX(highlightValue)}
                    y1={lineY + 4}
                    x2={scaleX(highlightValue)}
                    y2={padding.top}
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.text
                    x={scaleX(highlightValue)}
                    y={padding.top - 4}
                    textAnchor="middle"
                    fill="#ef4444"
                    fontSize={12}
                    fontWeight={700}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {frequencyMap.get(highlightValue) || 0}x
                  </motion.text>
                </>
              )}
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

export default DotPlot
