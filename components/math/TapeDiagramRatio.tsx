'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TapeDiagramRatioData } from '@/types/math'
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

interface TapeDiagramRatioProps {
  data: TapeDiagramRatioData
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
  tape1: { en: 'Show first tape', he: 'הצגת סרט ראשון' },
  tape2: { en: 'Show second tape with ratio', he: 'הצגת סרט שני עם יחס' },
  total: { en: 'Show total value', he: 'הצגת ערך כולל' },
  unknown: { en: 'Find the unknown', he: 'מציאת הנעלם' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TapeDiagramRatio({
  data,
  className = '',
  width = 450,
  height = 220,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TapeDiagramRatioProps) {
  const { ratio, labels, totalValue, unknownPart, partColors, title } = data
  const [ratio1, ratio2] = ratio
  const [label1, label2] = labels
  const totalUnits = ratio1 + ratio2

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'tape1', label: STEP_LABELS.tape1.en, labelHe: STEP_LABELS.tape1.he },
      { id: 'tape2', label: STEP_LABELS.tape2.en, labelHe: STEP_LABELS.tape2.he },
    ]
    if (totalValue !== undefined) {
      defs.push({ id: 'total', label: STEP_LABELS.total.en, labelHe: STEP_LABELS.total.he })
    }
    if (unknownPart !== undefined) {
      defs.push({ id: 'unknown', label: STEP_LABELS.unknown.en, labelHe: STEP_LABELS.unknown.he })
    }
    return defs
  }, [totalValue, unknownPart])

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
  const padding = { left: 80, right: 30, top: 30, bottom: 30 }
  const tapeAreaWidth = width - padding.left - padding.right
  const unitWidth = tapeAreaWidth / totalUnits
  const tapeHeight = 36
  const tape1Y = 50
  const tape2Y = 110
  const gapBetweenTapes = tape2Y - tape1Y - tapeHeight

  const color1 = partColors?.[0] ?? primaryColor
  const color2 = partColors?.[1] ?? accentColor

  // Compute unit value if total is provided
  const unitValue = totalValue !== undefined ? totalValue / totalUnits : undefined
  const value1 = unitValue !== undefined ? unitValue * ratio1 : undefined
  const value2 = unitValue !== undefined ? unitValue * ratio2 : undefined

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="tape-diagram-ratio"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="tdr-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="tdr-svg"
        viewBox={viewBox}
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        {/* Step 0: First tape */}
        <AnimatePresence>
          {isVisible('tape1') && (
            <motion.g
              data-testid="tdr-tape1"
              initial="hidden"
              animate={isCurrent('tape1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Label */}
              <motion.text
                x={padding.left - 10}
                y={tape1Y + tapeHeight / 2 + 4}
                textAnchor="end"
                fill={color1}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {label1}
              </motion.text>

              {/* Tape units */}
              {Array.from({ length: ratio1 }, (_, i) => (
                <motion.rect
                  key={`tape1-${i}`}
                  x={padding.left + i * unitWidth}
                  y={tape1Y}
                  width={unitWidth}
                  height={tapeHeight}
                  fill={`${color1}25`}
                  stroke={color1}
                  strokeWidth={diagram.lineWeight}
                  rx={i === 0 ? 4 : 0}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                />
              ))}

              {/* Ratio number inside tape */}
              <motion.text
                x={padding.left + (ratio1 * unitWidth) / 2}
                y={tape1Y + tapeHeight / 2 + 5}
                textAnchor="middle"
                fill={color1}
                fontSize={14}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {ratio1}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Second tape */}
        <AnimatePresence>
          {isVisible('tape2') && (
            <motion.g
              data-testid="tdr-tape2"
              initial="hidden"
              animate={isCurrent('tape2') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Label */}
              <motion.text
                x={padding.left - 10}
                y={tape2Y + tapeHeight / 2 + 4}
                textAnchor="end"
                fill={color2}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {label2}
              </motion.text>

              {/* Tape units */}
              {Array.from({ length: ratio2 }, (_, i) => (
                <motion.rect
                  key={`tape2-${i}`}
                  x={padding.left + i * unitWidth}
                  y={tape2Y}
                  width={unitWidth}
                  height={tapeHeight}
                  fill={`${color2}25`}
                  stroke={color2}
                  strokeWidth={diagram.lineWeight}
                  rx={i === 0 ? 4 : 0}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                />
              ))}

              {/* Ratio number inside tape */}
              <motion.text
                x={padding.left + (ratio2 * unitWidth) / 2}
                y={tape2Y + tapeHeight / 2 + 5}
                textAnchor="middle"
                fill={color2}
                fontSize={14}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {ratio2}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Total value bracket */}
        <AnimatePresence>
          {totalValue !== undefined && isVisible('total') && (
            <motion.g
              data-testid="tdr-total"
              initial="hidden"
              animate={isCurrent('total') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Bracket right side */}
              <motion.line
                x1={padding.left + totalUnits * unitWidth + 10}
                y1={tape1Y}
                x2={padding.left + totalUnits * unitWidth + 10}
                y2={tape2Y + tapeHeight}
                stroke="#6b7280"
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.line
                x1={padding.left + totalUnits * unitWidth + 5}
                y1={tape1Y}
                x2={padding.left + totalUnits * unitWidth + 10}
                y2={tape1Y}
                stroke="#6b7280"
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.line
                x1={padding.left + totalUnits * unitWidth + 5}
                y1={tape2Y + tapeHeight}
                x2={padding.left + totalUnits * unitWidth + 10}
                y2={tape2Y + tapeHeight}
                stroke="#6b7280"
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Total label */}
              <motion.text
                x={padding.left + totalUnits * unitWidth + 18}
                y={(tape1Y + tape2Y + tapeHeight) / 2 + 4}
                textAnchor="start"
                fill="#374151"
                fontSize={14}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {totalValue}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Unknown value highlight */}
        <AnimatePresence>
          {unknownPart !== undefined && isVisible('unknown') && (
            <motion.g
              data-testid="tdr-unknown"
              initial="hidden"
              animate={isCurrent('unknown') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Highlight the unknown part */}
              {unknownPart === 0 && value1 !== undefined && (
                <>
                  <motion.rect
                    x={padding.left - 2}
                    y={tape1Y - 2}
                    width={ratio1 * unitWidth + 4}
                    height={tapeHeight + 4}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    strokeDasharray="6 3"
                    rx={6}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.text
                    x={padding.left + (ratio1 * unitWidth) / 2}
                    y={tape1Y - 8}
                    textAnchor="middle"
                    fill="#22c55e"
                    fontSize={14}
                    fontWeight={700}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    = {value1}
                  </motion.text>
                </>
              )}
              {unknownPart === 1 && value2 !== undefined && (
                <>
                  <motion.rect
                    x={padding.left - 2}
                    y={tape2Y - 2}
                    width={ratio2 * unitWidth + 4}
                    height={tapeHeight + 4}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    strokeDasharray="6 3"
                    rx={6}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.text
                    x={padding.left + (ratio2 * unitWidth) / 2}
                    y={tape2Y - 8}
                    textAnchor="middle"
                    fill="#22c55e"
                    fontSize={14}
                    fontWeight={700}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    = {value2}
                  </motion.text>
                </>
              )}

              {/* Show unit value */}
              {unitValue !== undefined && (
                <motion.text
                  x={width / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={11}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he' ? 'ערך יחידה' : '1 unit'} = {unitValue}
                </motion.text>
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

export default TapeDiagramRatio
