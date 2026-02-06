'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import type { BarModelData } from '@/types/math'

// ---------------------------------------------------------------------------
// Default part colors
// ---------------------------------------------------------------------------

const PART_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#22c55e', // green
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
]

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Show the bar', he: 'הצגת הפס' },
  fill: { en: 'Fill the parts', he: 'מילוי החלקים' },
  labels: { en: 'Add labels', he: 'הוספת תוויות' },
  total: { en: 'Show the total', he: 'הצגת הסכום' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BarModelProps {
  data: BarModelData
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  className?: string
  width?: number
  height?: number
  currentStep?: number
  totalSteps?: number
  onStepComplete?: () => void
  animationDuration?: number
  stepConfig?: Array<{ step: number; stepLabel?: string; stepLabelHe?: string }>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BarModel({
  data,
  subject = 'math',
  complexity = 'elementary',
  language = 'en',
  className = '',
  width = 450,
  height = 200,
  currentStep: externalStep,
  totalSteps: externalTotal,
  onStepComplete,
  stepConfig,
}: BarModelProps) {
  const { parts, total, operation, unknownPart, title } = data

  // Step definitions
  const stepDefs = useMemo(
    () => [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'fill', label: STEP_LABELS.fill.en, labelHe: STEP_LABELS.fill.he },
      { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
      { id: 'total', label: STEP_LABELS.total.en, labelHe: STEP_LABELS.total.he },
    ],
    []
  )

  const diagram = useDiagramBase({
    totalSteps: externalTotal ?? stepDefs.length,
    subject,
    complexity,
    initialStep: externalStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
    onStepChange: (step) => {
      if (step === (externalTotal ?? stepDefs.length) - 1 && onStepComplete) {
        onStepComplete()
      }
    },
  })

  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Layout
  const padding = { left: 30, right: 30, top: title ? 50 : 30, bottom: 55 }
  const barLeft = padding.left
  const barRight = width - padding.right
  const barWidth = barRight - barLeft
  const barTop = padding.top + 10
  const barHeight = Math.min(60, (height - padding.top - padding.bottom) * 0.5)

  // Calculate part widths proportional to values
  const partsTotal = parts.reduce((sum, p) => sum + p.value, 0)
  const partWidths = parts.map((p) =>
    partsTotal > 0 ? (p.value / partsTotal) * barWidth : barWidth / parts.length
  )

  // Part x positions
  const partPositions = useMemo(() => {
    const positions: number[] = []
    let x = barLeft
    partWidths.forEach((pw) => {
      positions.push(x)
      x += pw
    })
    return positions
  }, [partWidths, barLeft])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = stepConfig?.[diagram.currentStep]?.stepLabel
    ?? (language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label)

  // Operation symbols
  const opSymbols: Record<string, string> = {
    add: '+',
    subtract: '-',
    compare: 'vs',
    multiply: '\u00D7',
    divide: '\u00F7',
  }

  return (
    <div
      data-testid="bar-model"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Bar model: ${parts.map((p) => p.label).join(` ${opSymbols[operation] || '+'} `)} = ${total}${title ? ` - ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="bm-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="bm-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 18 }}
          >
            {title}
          </text>
        )}

        {/* Step 0: Bar outline */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="bm-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Full bar outline */}
              <motion.rect
                data-testid="bm-bar-outline"
                x={barLeft}
                y={barTop}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill="none"
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Part dividers */}
              {partPositions.slice(1).map((px, i) => (
                <motion.line
                  key={`divider-${i}`}
                  data-testid={`bm-divider-${i}`}
                  x1={px}
                  y1={barTop}
                  x2={px}
                  y2={barTop + barHeight}
                  stroke={diagram.colors.primary}
                  strokeWidth={diagram.lineWeight * 0.5}
                  strokeDasharray="4 3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Fill parts with colors */}
        <AnimatePresence>
          {isVisible('fill') && (
            <motion.g
              data-testid="bm-parts"
              initial="hidden"
              animate={isCurrent('fill') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {parts.map((part, i) => {
                const isUnknown = unknownPart !== undefined && i === unknownPart
                const partColor = part.color || PART_COLORS[i % PART_COLORS.length]
                return (
                  <motion.rect
                    key={`part-${i}`}
                    data-testid={`bm-part-${i}`}
                    x={partPositions[i]}
                    y={barTop}
                    width={partWidths[i]}
                    height={barHeight}
                    rx={i === 0 ? 6 : i === parts.length - 1 ? 6 : 0}
                    fill={isUnknown ? 'none' : partColor}
                    fillOpacity={isUnknown ? 0 : 0.3}
                    stroke={isUnknown ? partColor : 'none'}
                    strokeWidth={isUnknown ? diagram.lineWeight : 0}
                    strokeDasharray={isUnknown ? '8 4' : 'none'}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.15, 1.5), ease: 'easeOut' }}
                    style={{ transformOrigin: `${partPositions[i]}px ${barTop + barHeight / 2}px` }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="bm-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {parts.map((part, i) => {
                const isUnknown = unknownPart !== undefined && i === unknownPart
                const partColor = part.color || PART_COLORS[i % PART_COLORS.length]
                const centerX = partPositions[i] + partWidths[i] / 2

                return (
                  <motion.g
                    key={`label-${i}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: Math.min(i * 0.12, 1.5) }}
                  >
                    {/* Value inside bar */}
                    <text
                      data-testid={`bm-label-${i}`}
                      x={centerX}
                      y={barTop + barHeight / 2 + 6}
                      textAnchor="middle"
                      className="font-bold"
                      style={{
                        fontSize: isUnknown ? 20 : 16,
                        fill: isUnknown ? partColor : diagram.colors.dark,
                      }}
                    >
                      {isUnknown ? '?' : part.value}
                    </text>

                    {/* Label below bar */}
                    <text
                      x={centerX}
                      y={barTop + barHeight + 20}
                      textAnchor="middle"
                      style={{ fontSize: 13, fill: partColor }}
                    >
                      {part.label}
                    </text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show total / unknown */}
        <AnimatePresence>
          {isVisible('total') && (
            <motion.g
              data-testid="bm-total"
              initial="hidden"
              animate={isCurrent('total') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Total bracket below */}
              <motion.path
                data-testid="bm-total-bracket"
                d={`M ${barLeft} ${barTop + barHeight + 32} L ${barLeft} ${barTop + barHeight + 40} L ${barRight} ${barTop + barHeight + 40} L ${barRight} ${barTop + barHeight + 32}`}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight * 0.75}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Total label */}
              <motion.text
                data-testid="bm-total-label"
                x={width / 2}
                y={barTop + barHeight + 58}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 18, fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {unknownPart !== undefined ? `? = ${total}` : total}
              </motion.text>

              {/* Operation symbol */}
              {operation && (
                <motion.text
                  x={width - padding.right + 10}
                  y={barTop + barHeight / 2 + 6}
                  textAnchor="start"
                  style={{ fontSize: 14, fill: diagram.colors.accent }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 0.3 }}
                >
                  {opSymbols[operation]}
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default BarModel
