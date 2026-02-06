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
import type { PartPartWholeData } from '@/types/math'

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Show the model', he: 'הצגת המודל' },
  whole: { en: 'Show the whole', he: 'הצגת השלם' },
  parts: { en: 'Show the parts', he: 'הצגת החלקים' },
  relationship: { en: 'Show the relationship', he: 'הצגת הקשר' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PartPartWholeProps {
  data: PartPartWholeData
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

export function PartPartWhole({
  data,
  subject = 'math',
  complexity = 'elementary',
  language = 'en',
  className = '',
  width = 400,
  height = 350,
  currentStep: externalStep,
  totalSteps: externalTotal,
  onStepComplete,
  stepConfig,
}: PartPartWholeProps) {
  const { whole, part1, part2, showParts, title, labels } = data

  // Step definitions
  const stepDefs = useMemo(
    () => [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'whole', label: STEP_LABELS.whole.en, labelHe: STEP_LABELS.whole.he },
      { id: 'parts', label: STEP_LABELS.parts.en, labelHe: STEP_LABELS.parts.he },
      { id: 'relationship', label: STEP_LABELS.relationship.en, labelHe: STEP_LABELS.relationship.he },
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
  const cx = width / 2
  const wholeRadius = Math.min(width, height) * 0.18
  const wholeCy = height * 0.28
  const partRadius = wholeRadius * 0.7
  const partCy = height * 0.7
  const part1Cx = cx - width * 0.2
  const part2Cx = cx + width * 0.2

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = stepConfig?.[diagram.currentStep]?.stepLabel
    ?? (language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label)

  // Relationship equation
  const equation = showParts
    ? `${part1} + ${part2} = ${whole}`
    : `${whole} = ${part1} + ${part2}`

  return (
    <div
      data-testid="part-part-whole"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Part-part-whole model: ${whole} = ${part1} + ${part2}${title ? ` - ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="ppw-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="ppw-title"
            x={width / 2}
            y={22}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 18 }}
          >
            {title}
          </text>
        )}

        {/* Step 0: Show outlines (circles and lines) */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="ppw-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Whole circle outline */}
              <motion.circle
                data-testid="ppw-whole-circle"
                cx={cx}
                cy={wholeCy}
                r={wholeRadius}
                fill="none"
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              />

              {/* Part 1 circle outline */}
              <motion.circle
                data-testid="ppw-part1-circle"
                cx={part1Cx}
                cy={partCy}
                r={partRadius}
                fill="none"
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              />

              {/* Part 2 circle outline */}
              <motion.circle
                data-testid="ppw-part2-circle"
                cx={part2Cx}
                cy={partCy}
                r={partRadius}
                fill="none"
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
              />

              {/* Connecting lines */}
              <motion.path
                data-testid="ppw-line-left"
                d={`M ${cx} ${wholeCy + wholeRadius} L ${part1Cx} ${partCy - partRadius}`}
                stroke={diagram.colors.light}
                strokeWidth={diagram.lineWeight * 0.75}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.path
                data-testid="ppw-line-right"
                d={`M ${cx} ${wholeCy + wholeRadius} L ${part2Cx} ${partCy - partRadius}`}
                stroke={diagram.colors.light}
                strokeWidth={diagram.lineWeight * 0.75}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Labels */}
              <motion.text
                x={cx}
                y={wholeCy - wholeRadius - 8}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 14 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {labels?.whole ?? (language === 'he' ? 'שלם' : 'Whole')}
              </motion.text>
              <motion.text
                x={part1Cx}
                y={partCy + partRadius + 20}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 14 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {labels?.part1 ?? (language === 'he' ? 'חלק 1' : 'Part 1')}
              </motion.text>
              <motion.text
                x={part2Cx}
                y={partCy + partRadius + 20}
                textAnchor="middle"
                className="fill-current"
                style={{ fontSize: 14 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {labels?.part2 ?? (language === 'he' ? 'חלק 2' : 'Part 2')}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Show whole number */}
        <AnimatePresence>
          {isVisible('whole') && (
            <motion.g
              data-testid="ppw-whole-value"
              initial="hidden"
              animate={isCurrent('whole') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Filled whole circle */}
              <motion.circle
                cx={cx}
                cy={wholeCy}
                r={wholeRadius}
                fill={diagram.colors.bg}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              {/* Whole number */}
              <motion.text
                data-testid="ppw-whole-number"
                x={cx}
                y={wholeCy + 8}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 28, fill: diagram.colors.primary }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {whole}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show parts with numbers */}
        <AnimatePresence>
          {isVisible('parts') && (
            <motion.g
              data-testid="ppw-parts-values"
              initial="hidden"
              animate={isCurrent('parts') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Part 1 filled */}
              <motion.circle
                cx={part1Cx}
                cy={partCy}
                r={partRadius}
                fill={diagram.colors.bg}
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.text
                data-testid="ppw-part1-number"
                x={part1Cx}
                y={partCy + 6}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 22, fill: diagram.colors.accent }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              >
                {part1}
              </motion.text>

              {/* Part 2 filled */}
              <motion.circle
                cx={part2Cx}
                cy={partCy}
                r={partRadius}
                fill={diagram.colors.bg}
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              />
              <motion.text
                data-testid="ppw-part2-number"
                x={part2Cx}
                y={partCy + 6}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 22, fill: diagram.colors.accent }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.25 }}
              >
                {part2}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show relationship equation */}
        <AnimatePresence>
          {isVisible('relationship') && (
            <motion.g
              data-testid="ppw-relationship"
              initial="hidden"
              animate={isCurrent('relationship') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={cx - 80}
                y={height - 38}
                width={160}
                height={30}
                rx={15}
                fill={diagram.colors.bg}
                stroke={diagram.colors.primary}
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                data-testid="ppw-equation"
                x={cx}
                y={height - 18}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 16, fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {equation}
              </motion.text>
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

export default PartPartWhole
