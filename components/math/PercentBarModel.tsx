'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PercentBarModelData } from '@/types/math'
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

interface PercentBarModelProps {
  data: PercentBarModelData
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
  outline: { en: 'Draw the bar', he: 'ציור הסרגל' },
  fill: { en: 'Fill parts', he: 'מילוי החלקים' },
  percents: { en: 'Show percentages', he: 'הצגת אחוזים' },
  values: { en: 'Show values', he: 'הצגת ערכים' },
}

// ---------------------------------------------------------------------------
// Default part colors
// ---------------------------------------------------------------------------

const PART_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PercentBarModel({
  data,
  className = '',
  width = 500,
  height = 200,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: PercentBarModelProps) {
  const { total, parts, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
    { id: 'fill', label: STEP_LABELS.fill.en, labelHe: STEP_LABELS.fill.he },
    { id: 'percents', label: STEP_LABELS.percents.en, labelHe: STEP_LABELS.percents.he },
    { id: 'values', label: STEP_LABELS.values.en, labelHe: STEP_LABELS.values.he },
  ], [])

  // useDiagramBase
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
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

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // SVG dimensions
  const svgWidth = width
  const svgHeight = height
  const padding = { top: 30, right: 30, bottom: 50, left: 30 }
  const barX = padding.left
  const barY = padding.top + 10
  const barWidth = svgWidth - padding.left - padding.right
  const barHeight = 50

  // Calculate cumulative widths for each part
  const partWidths = useMemo(() => {
    const totalPercent = parts.reduce((sum, p) => sum + p.percent, 0)
    let cumX = 0
    return parts.map((part) => {
      const w = (part.percent / Math.max(totalPercent, 100)) * barWidth
      const x = cumX
      cumX += w
      return { x, w, part }
    })
  }, [parts, barWidth])

  // Scale marks
  const scaleMarks = [0, 25, 50, 75, 100]

  return (
    <div
      data-testid="percent-bar-model"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="pbm-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="pbm-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0: Bar outline with scale */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="pbm-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Bar outline */}
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill="none"
                stroke={diagram.colors.dark}
                strokeWidth={diagram.lineWeight}
                rx={4}
              />

              {/* Scale marks */}
              {scaleMarks.map((pct) => {
                const x = barX + (pct / 100) * barWidth
                return (
                  <g key={`scale-${pct}`}>
                    <line
                      x1={x}
                      y1={barY + barHeight}
                      x2={x}
                      y2={barY + barHeight + 8}
                      stroke="#6b7280"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={barY + barHeight + 22}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#6b7280"
                    >
                      {pct}%
                    </text>
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Fill parts with colors */}
        <AnimatePresence>
          {isVisible('fill') && (
            <motion.g
              data-testid="pbm-fill"
              initial="hidden"
              animate={isCurrent('fill') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {partWidths.map(({ x, w, part }, i) => (
                <motion.rect
                  key={`fill-${i}`}
                  x={barX + x}
                  y={barY}
                  width={w}
                  height={barHeight}
                  fill={part.color || PART_COLORS[i % PART_COLORS.length]}
                  opacity={0.7}
                  rx={i === 0 ? 4 : 0}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                  style={{ transformOrigin: `${barX + x}px ${barY}px` }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Percentage labels */}
        <AnimatePresence>
          {isVisible('percents') && (
            <motion.g
              data-testid="pbm-percents"
              initial="hidden"
              animate={isCurrent('percents') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {partWidths.map(({ x, w, part }, i) => (
                <motion.text
                  key={`pct-${i}`}
                  x={barX + x + w / 2}
                  y={barY - 8}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill={part.color || PART_COLORS[i % PART_COLORS.length]}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {part.percent}%
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Value labels */}
        <AnimatePresence>
          {isVisible('values') && (
            <motion.g
              data-testid="pbm-values"
              initial="hidden"
              animate={isCurrent('values') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {partWidths.map(({ x, w, part }, i) => (
                <motion.g key={`val-${i}`} initial="hidden" animate="visible" variants={labelAppearVariants}>
                  <text
                    x={barX + x + w / 2}
                    y={barY + barHeight / 2 + 5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="#ffffff"
                  >
                    {part.label}
                  </text>
                  <text
                    x={barX + x + w / 2}
                    y={barY + barHeight + 42}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={500}
                    fill="#374151"
                  >
                    {part.value}
                  </text>
                </motion.g>
              ))}

              {/* Total label */}
              <text
                x={barX + barWidth + 10}
                y={barY + barHeight / 2 + 5}
                textAnchor="start"
                fontSize={13}
                fontWeight={700}
                fill={primaryColor}
              >
                {language === 'he' ? `סה״כ: ${total}` : `Total: ${total}`}
              </text>
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

export default PercentBarModel
