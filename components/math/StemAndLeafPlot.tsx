'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StemAndLeafPlotData } from '@/types/math'
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

interface StemAndLeafPlotProps {
  data: StemAndLeafPlotData
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
  structure: { en: 'Show structure', he: 'הצגת מבנה' },
  stems: { en: 'Show stems', he: 'הצגת גזעים' },
  leaves: { en: 'Add leaves', he: 'הוספת עלים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StemAndLeafPlot({
  data,
  className = '',
  width = 400,
  height: propHeight,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: StemAndLeafPlotProps) {
  const { stems, title, stemLabel, leafLabel, key } = data

  // Compute dynamic height based on stem count
  const rowHeight = 28
  const headerHeight = 40
  const keyHeight = key ? 28 : 0
  const computedHeight = propHeight ?? Math.max(180, headerHeight + stems.length * rowHeight + keyHeight + 30)

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'structure', label: STEP_LABELS.structure.en, labelHe: STEP_LABELS.structure.he },
    { id: 'stems', label: STEP_LABELS.stems.en, labelHe: STEP_LABELS.stems.he },
    { id: 'leaves', label: STEP_LABELS.leaves.en, labelHe: STEP_LABELS.leaves.he },
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
  const stepLabel_display = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Layout
  const padding = { left: 20, right: 20, top: 10, bottom: 10 }
  const dividerX = 80
  const stemColWidth = dividerX - padding.left
  const leafStartX = dividerX + 12
  const leafCharWidth = 16

  const viewBox = `0 0 ${width} ${computedHeight}`

  return (
    <div
      data-testid="stem-and-leaf-plot"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="slp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="slp-svg"
        viewBox={viewBox}
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        {/* Step 0: Structure (divider line and headers) */}
        <AnimatePresence>
          {isVisible('structure') && (
            <motion.g
              data-testid="slp-structure"
              initial="hidden"
              animate={isCurrent('structure') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Column headers */}
              <motion.text
                x={dividerX - stemColWidth / 2}
                y={padding.top + 14}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={12}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {stemLabel || (language === 'he' ? 'גזע' : 'Stem')}
              </motion.text>

              <motion.text
                x={leafStartX + 30}
                y={padding.top + 14}
                textAnchor="start"
                fill={accentColor}
                fontSize={12}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {leafLabel || (language === 'he' ? 'עלה' : 'Leaf')}
              </motion.text>

              {/* Vertical divider */}
              <motion.line
                x1={dividerX}
                y1={padding.top + 2}
                x2={dividerX}
                y2={headerHeight + stems.length * rowHeight + padding.top}
                stroke="#374151"
                strokeWidth={diagram.lineWeight}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />

              {/* Horizontal line under header */}
              <motion.line
                x1={padding.left}
                y1={headerHeight + padding.top - 8}
                x2={width - padding.right}
                y2={headerHeight + padding.top - 8}
                stroke="#e5e7eb"
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Row backgrounds for readability */}
              {stems.map((_, i) => (
                <motion.rect
                  key={`row-bg-${i}`}
                  x={padding.left}
                  y={headerHeight + padding.top + i * rowHeight - 6}
                  width={width - padding.left - padding.right}
                  height={rowHeight}
                  fill={i % 2 === 0 ? `${primaryColor}05` : 'transparent'}
                  rx={2}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Stems */}
        <AnimatePresence>
          {isVisible('stems') && (
            <motion.g
              data-testid="slp-stems"
              initial="hidden"
              animate={isCurrent('stems') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {stems.map((row, i) => (
                <motion.text
                  key={`stem-${i}`}
                  x={dividerX - 12}
                  y={headerHeight + padding.top + i * rowHeight + 14}
                  textAnchor="end"
                  fill={primaryColor}
                  fontSize={14}
                  fontWeight={700}
                  fontFamily="monospace"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {row.stem}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Leaves (appear stem by stem) */}
        <AnimatePresence>
          {isVisible('leaves') && (
            <motion.g
              data-testid="slp-leaves"
              initial="hidden"
              animate={isCurrent('leaves') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {stems.map((row, stemIdx) => (
                <motion.g key={`leaves-row-${stemIdx}`}>
                  {row.leaves.map((leaf, leafIdx) => (
                    <motion.text
                      key={`leaf-${stemIdx}-${leafIdx}`}
                      x={leafStartX + leafIdx * leafCharWidth}
                      y={headerHeight + padding.top + stemIdx * rowHeight + 14}
                      textAnchor="start"
                      fill={accentColor}
                      fontSize={14}
                      fontFamily="monospace"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: stemIdx * 0.15 + leafIdx * 0.03,
                      }}
                    >
                      {leaf}
                    </motion.text>
                  ))}
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Key */}
        {key && isVisible('leaves') && (
          <motion.text
            x={width / 2}
            y={computedHeight - padding.bottom - 2}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={10}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
          >
            {language === 'he' ? 'מפתח' : 'Key'}: {key}
          </motion.text>
        )}
      </svg>

      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={diagram.currentStep}
          totalSteps={diagram.totalSteps}
          onNext={diagram.next}
          onPrev={diagram.prev}
          stepLabel={stepLabel_display}
          language={language}
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default StemAndLeafPlot
