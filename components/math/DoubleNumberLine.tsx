'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DoubleNumberLineData } from '@/types/math'
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

interface DoubleNumberLineProps {
  data: DoubleNumberLineData
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
  topLine: { en: 'Draw top number line', he: 'ציור קו עליון' },
  bottomLine: { en: 'Draw bottom number line', he: 'ציור קו תחתון' },
  values: { en: 'Mark values on both lines', he: 'סימון ערכים על שני הקווים' },
  connections: { en: 'Show connections', he: 'הצגת קשרים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DoubleNumberLine({
  data,
  className = '',
  width = 500,
  height = 220,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: DoubleNumberLineProps) {
  const { topLine, bottomLine, connections, title, highlightPair } = data

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'topLine', label: STEP_LABELS.topLine.en, labelHe: STEP_LABELS.topLine.he },
    { id: 'bottomLine', label: STEP_LABELS.bottomLine.en, labelHe: STEP_LABELS.bottomLine.he },
    { id: 'values', label: STEP_LABELS.values.en, labelHe: STEP_LABELS.values.he },
    { id: 'connections', label: STEP_LABELS.connections.en, labelHe: STEP_LABELS.connections.he },
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

  // Layout constants
  const padding = { left: 60, right: 30, top: 40, bottom: 20 }
  const lineWidth = width - padding.left - padding.right
  const topLineY = 60
  const bottomLineY = 150
  const valueCount = Math.max(topLine.values.length, bottomLine.values.length)

  // Compute positions
  const topValues = topLine.values
  const bottomValues = bottomLine.values
  const topMin = Math.min(...topValues)
  const topMax = Math.max(...topValues)
  const bottomMin = Math.min(...bottomValues)
  const bottomMax = Math.max(...bottomValues)

  const topScale = (v: number) =>
    topMax === topMin
      ? padding.left + lineWidth / 2
      : padding.left + ((v - topMin) / (topMax - topMin)) * lineWidth
  const bottomScale = (v: number) =>
    bottomMax === bottomMin
      ? padding.left + lineWidth / 2
      : padding.left + ((v - bottomMin) / (bottomMax - bottomMin)) * lineWidth

  // Build connections from data or pair up by index
  const connectionPairs = connections ?? topValues.map((_, i) => ({
    topIndex: i,
    bottomIndex: i < bottomValues.length ? i : -1,
  })).filter(c => c.bottomIndex >= 0)

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="double-number-line"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="dnl-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="dnl-svg"
        viewBox={viewBox}
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        {/* Step 0: Top number line */}
        <AnimatePresence>
          {isVisible('topLine') && (
            <motion.g
              data-testid="dnl-top-line"
              initial="hidden"
              animate={isCurrent('topLine') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top label */}
              <motion.text
                x={padding.left - 10}
                y={topLineY - 15}
                textAnchor="end"
                fill={primaryColor}
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {topLine.label}
              </motion.text>
              {topLine.unit && (
                <motion.text
                  x={padding.left - 10}
                  y={topLineY - 2}
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize={10}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  ({topLine.unit})
                </motion.text>
              )}
              {/* Line */}
              <motion.line
                x1={padding.left}
                y1={topLineY}
                x2={padding.left + lineWidth}
                y2={topLineY}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Tick marks at each value */}
              {topValues.map((v, i) => (
                <motion.line
                  key={`top-tick-${i}`}
                  x1={topScale(v)}
                  y1={topLineY - 6}
                  x2={topScale(v)}
                  y2={topLineY + 6}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight}
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Bottom number line */}
        <AnimatePresence>
          {isVisible('bottomLine') && (
            <motion.g
              data-testid="dnl-bottom-line"
              initial="hidden"
              animate={isCurrent('bottomLine') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Bottom label */}
              <motion.text
                x={padding.left - 10}
                y={bottomLineY - 15}
                textAnchor="end"
                fill={accentColor}
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {bottomLine.label}
              </motion.text>
              {bottomLine.unit && (
                <motion.text
                  x={padding.left - 10}
                  y={bottomLineY - 2}
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize={10}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  ({bottomLine.unit})
                </motion.text>
              )}
              {/* Line */}
              <motion.line
                x1={padding.left}
                y1={bottomLineY}
                x2={padding.left + lineWidth}
                y2={bottomLineY}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Tick marks */}
              {bottomValues.map((v, i) => (
                <motion.line
                  key={`bottom-tick-${i}`}
                  x1={bottomScale(v)}
                  y1={bottomLineY - 6}
                  x2={bottomScale(v)}
                  y2={bottomLineY + 6}
                  stroke={accentColor}
                  strokeWidth={diagram.lineWeight}
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Value labels */}
        <AnimatePresence>
          {isVisible('values') && (
            <motion.g
              data-testid="dnl-values"
              initial="hidden"
              animate={isCurrent('values') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {topValues.map((v, i) => (
                <motion.text
                  key={`top-val-${i}`}
                  x={topScale(v)}
                  y={topLineY - 14}
                  textAnchor="middle"
                  fill={highlightPair === i ? '#ef4444' : primaryColor}
                  fontSize={12}
                  fontWeight={highlightPair === i ? 700 : 500}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {v}
                </motion.text>
              ))}
              {bottomValues.map((v, i) => (
                <motion.text
                  key={`bottom-val-${i}`}
                  x={bottomScale(v)}
                  y={bottomLineY + 20}
                  textAnchor="middle"
                  fill={highlightPair === i ? '#ef4444' : accentColor}
                  fontSize={12}
                  fontWeight={highlightPair === i ? 700 : 500}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {v}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Connections between lines */}
        <AnimatePresence>
          {isVisible('connections') && (
            <motion.g
              data-testid="dnl-connections"
              initial="hidden"
              animate={isCurrent('connections') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {connectionPairs.map((c, i) => {
                const topX = topScale(topValues[c.topIndex])
                const bottomX = bottomScale(bottomValues[c.bottomIndex])
                const isHighlighted = highlightPair === c.topIndex
                return (
                  <motion.line
                    key={`conn-${i}`}
                    x1={topX}
                    y1={topLineY + 8}
                    x2={bottomX}
                    y2={bottomLineY - 8}
                    stroke={isHighlighted ? '#ef4444' : '#9ca3af'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeDasharray={isHighlighted ? undefined : '4 3'}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
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

export default DoubleNumberLine
