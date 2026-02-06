'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SampleSpaceDiagramData } from '@/types/math'
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

interface SampleSpaceDiagramProps {
  data: SampleSpaceDiagramData
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
  headers: { en: 'Show events', he: 'הצגת אירועים' },
  cells: { en: 'Fill outcomes', he: 'מילוי תוצאות' },
  highlight: { en: 'Highlight favorable', he: 'סימון תוצאות רצויות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SampleSpaceDiagram({
  data,
  className = '',
  width = 450,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: SampleSpaceDiagramProps) {
  const { event1, event2, favorableOutcomes, title } = data

  const hasFavorable = !!(favorableOutcomes && favorableOutcomes.length > 0)

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'headers', label: STEP_LABELS.headers.en, labelHe: STEP_LABELS.headers.he },
      { id: 'cells', label: STEP_LABELS.cells.en, labelHe: STEP_LABELS.cells.he },
    ]
    if (hasFavorable) {
      defs.push({ id: 'highlight', label: STEP_LABELS.highlight.en, labelHe: STEP_LABELS.highlight.he })
    }
    return defs
  }, [hasFavorable])

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

  // Grid layout calculations
  const rows = event1.outcomes.length
  const cols = event2.outcomes.length
  const svgWidth = width
  const svgHeight = height
  const headerHeight = 50
  const headerWidth = 70
  const cellWidth = Math.min(60, (svgWidth - headerWidth - 20) / cols)
  const cellHeight = Math.min(45, (svgHeight - headerHeight - 40) / rows)

  const gridX = headerWidth + 10
  const gridY = headerHeight + 10

  // Check if an outcome is favorable
  const isFavorable = (rowOutcome: string, colOutcome: string): boolean => {
    if (!favorableOutcomes) return false
    return favorableOutcomes.some(
      ([r, c]) => r === rowOutcome && c === colOutcome
    )
  }

  return (
    <div
      data-testid="sample-space-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="ssd-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="ssd-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0: Headers */}
        <AnimatePresence>
          {isVisible('headers') && (
            <motion.g
              data-testid="ssd-headers"
              initial="hidden"
              animate={isCurrent('headers') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Event 2 name (column header label) */}
              <text
                x={gridX + (cols * cellWidth) / 2}
                y={16}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={accentColor}
              >
                {event2.name}
              </text>

              {/* Column headers */}
              {event2.outcomes.map((outcome, j) => (
                <motion.text
                  key={`col-${j}`}
                  x={gridX + j * cellWidth + cellWidth / 2}
                  y={gridY - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill={accentColor}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {outcome}
                </motion.text>
              ))}

              {/* Event 1 name (row header label) */}
              <text
                x={10}
                y={gridY + (rows * cellHeight) / 2}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={primaryColor}
                transform={`rotate(-90, 10, ${gridY + (rows * cellHeight) / 2})`}
              >
                {event1.name}
              </text>

              {/* Row headers */}
              {event1.outcomes.map((outcome, i) => (
                <motion.text
                  key={`row-${i}`}
                  x={headerWidth}
                  y={gridY + i * cellHeight + cellHeight / 2 + 5}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={600}
                  fill={primaryColor}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {outcome}
                </motion.text>
              ))}

              {/* Grid lines */}
              {Array.from({ length: rows + 1 }, (_, i) => (
                <line
                  key={`hline-${i}`}
                  x1={gridX}
                  y1={gridY + i * cellHeight}
                  x2={gridX + cols * cellWidth}
                  y2={gridY + i * cellHeight}
                  stroke="#d1d5db"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: cols + 1 }, (_, j) => (
                <line
                  key={`vline-${j}`}
                  x1={gridX + j * cellWidth}
                  y1={gridY}
                  x2={gridX + j * cellWidth}
                  y2={gridY + rows * cellHeight}
                  stroke="#d1d5db"
                  strokeWidth={1}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Fill grid cells */}
        <AnimatePresence>
          {isVisible('cells') && (
            <motion.g
              data-testid="ssd-cells"
              initial="hidden"
              animate={isCurrent('cells') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {event1.outcomes.map((rowOutcome, i) =>
                event2.outcomes.map((colOutcome, j) => (
                  <motion.text
                    key={`cell-${i}-${j}`}
                    x={gridX + j * cellWidth + cellWidth / 2}
                    y={gridY + i * cellHeight + cellHeight / 2 + 4}
                    textAnchor="middle"
                    fontSize={11}
                    className="fill-gray-700 dark:fill-gray-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (i * cols + j) * 0.05 }}
                  >
                    ({rowOutcome}, {colOutcome})
                  </motion.text>
                ))
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Highlight favorable outcomes */}
        {hasFavorable && (
          <AnimatePresence>
            {isVisible('highlight') && (
              <motion.g
                data-testid="ssd-highlight"
                initial="hidden"
                animate={isCurrent('highlight') ? 'spotlight' : 'visible'}
                variants={spotlight}
              >
                {event1.outcomes.map((rowOutcome, i) =>
                  event2.outcomes.map((colOutcome, j) => {
                    if (!isFavorable(rowOutcome, colOutcome)) return null
                    return (
                      <motion.rect
                        key={`hl-${i}-${j}`}
                        x={gridX + j * cellWidth + 1}
                        y={gridY + i * cellHeight + 1}
                        width={cellWidth - 2}
                        height={cellHeight - 2}
                        fill={primaryColor}
                        opacity={0.2}
                        rx={3}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.2 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      />
                    )
                  })
                )}

                {/* Count label */}
                <motion.text
                  x={gridX + cols * cellWidth + 12}
                  y={gridY + rows * cellHeight + 20}
                  textAnchor="start"
                  fontSize={12}
                  fontWeight={700}
                  fill={primaryColor}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he'
                    ? `${favorableOutcomes!.length} מתוך ${rows * cols}`
                    : `${favorableOutcomes!.length} of ${rows * cols}`}
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>
        )}
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

export default SampleSpaceDiagram
