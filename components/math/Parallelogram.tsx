'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ParallelogramData } from '@/types/math'
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

interface ParallelogramProps {
  data: ParallelogramData
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
  drawShape: { en: 'Draw parallelogram', he: 'ציור מקבילית' },
  labelSides: { en: 'Label sides', he: 'סימון צלעות' },
  showHeight: { en: 'Show height', he: 'הצגת גובה' },
  showFormula: { en: 'Show area formula', he: 'נוסחת שטח' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Parallelogram({
  data,
  className = '',
  width: svgWidth = 450,
  height: svgHeight = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ParallelogramProps) {
  const {
    base,
    side,
    height: paraHeight,
    baseLabel,
    sideLabel,
    heightLabel,
    angle,
    showHeight: showH,
    title,
    showFormulas,
    showCalculations: showCalcs,
  } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawShape', label: STEP_LABELS.drawShape.en, labelHe: STEP_LABELS.drawShape.he },
      { id: 'labelSides', label: STEP_LABELS.labelSides.en, labelHe: STEP_LABELS.labelSides.he },
    ]
    if (showH !== false) {
      defs.push({ id: 'showHeight', label: STEP_LABELS.showHeight.en, labelHe: STEP_LABELS.showHeight.he })
    }
    if (showFormulas !== false) {
      defs.push({ id: 'showFormula', label: STEP_LABELS.showFormula.en, labelHe: STEP_LABELS.showFormula.he })
    }
    return defs
  }, [showH, showFormulas])

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
  const padding = { left: 60, right: 60, top: 50, bottom: 70 }
  const availableW = svgWidth - padding.left - padding.right
  const availableH = svgHeight - padding.top - padding.bottom

  // Calculate offset using angle (default 60 degrees)
  const angleRad = ((angle || 60) * Math.PI) / 180
  const offsetX = paraHeight / Math.tan(angleRad)

  // Scale to fit
  const totalW = base + offsetX
  const totalH = paraHeight
  const scaleF = Math.min(availableW / totalW, availableH / totalH) * 0.85

  const drawBase = base * scaleF
  const drawHeight = paraHeight * scaleF
  const drawOffset = offsetX * scaleF

  const cx = svgWidth / 2
  const baseY = (svgHeight - padding.bottom + padding.top) / 2 + drawHeight / 2

  // Points (bottom-left, bottom-right, top-right, top-left)
  const bl = { x: cx - drawBase / 2 - drawOffset * 0.3, y: baseY }
  const br = { x: bl.x + drawBase, y: baseY }
  const tr = { x: br.x + drawOffset, y: baseY - drawHeight }
  const tl = { x: bl.x + drawOffset, y: baseY - drawHeight }

  const shapePath = `M ${bl.x} ${bl.y} L ${br.x} ${br.y} L ${tr.x} ${tr.y} L ${tl.x} ${tl.y} Z`

  const baseLabelText = baseLabel || `${base}`
  const sideLabelText = sideLabel || `${side}`
  const heightLabelText = heightLabel || `${paraHeight}`

  const area = base * paraHeight

  const viewBox = `0 0 ${svgWidth} ${svgHeight}`

  // Height line: perpendicular from top to base
  const heightLineX = tl.x
  const heightTop = tl.y
  const heightBottom = bl.y

  return (
    <div
      data-testid="parallelogram-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: svgWidth }}
    >
      {title && (
        <div
          data-testid="parallelogram-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="parallelogram-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw parallelogram */}
        <AnimatePresence>
          {isVisible('drawShape') && (
            <motion.g
              data-testid="parallelogram-shape"
              initial="hidden"
              animate={isCurrent('drawShape') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={shapePath}
                fill={`${primaryColor}15`}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Parallel tick marks on opposite sides */}
              {/* Bottom side ticks */}
              <motion.g initial="hidden" animate="visible" variants={labelAppearVariants}>
                <line
                  x1={(bl.x + br.x) / 2 - 4}
                  y1={bl.y - 4}
                  x2={(bl.x + br.x) / 2 + 4}
                  y2={bl.y + 4}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.6}
                />
                <line
                  x1={(bl.x + br.x) / 2 - 4 + 6}
                  y1={bl.y - 4}
                  x2={(bl.x + br.x) / 2 + 4 + 6}
                  y2={bl.y + 4}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.6}
                />
              </motion.g>
              {/* Top side ticks */}
              <motion.g initial="hidden" animate="visible" variants={labelAppearVariants}>
                <line
                  x1={(tl.x + tr.x) / 2 - 4}
                  y1={tl.y - 4}
                  x2={(tl.x + tr.x) / 2 + 4}
                  y2={tl.y + 4}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.6}
                />
                <line
                  x1={(tl.x + tr.x) / 2 - 4 + 6}
                  y1={tl.y - 4}
                  x2={(tl.x + tr.x) / 2 + 4 + 6}
                  y2={tl.y + 4}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.6}
                />
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label sides */}
        <AnimatePresence>
          {isVisible('labelSides') && (
            <motion.g
              data-testid="parallelogram-labels"
              initial="hidden"
              animate={isCurrent('labelSides') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Base label (bottom) */}
              <motion.text
                x={(bl.x + br.x) / 2}
                y={bl.y + 20}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {baseLabelText}
              </motion.text>

              {/* Left side label */}
              <motion.text
                x={(bl.x + tl.x) / 2 - 14}
                y={(bl.y + tl.y) / 2 + 4}
                textAnchor="end"
                fill={accentColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sideLabelText}
              </motion.text>

              {/* Top label */}
              <motion.text
                x={(tl.x + tr.x) / 2}
                y={tl.y - 10}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {baseLabelText}
              </motion.text>

              {/* Right side label */}
              <motion.text
                x={(br.x + tr.x) / 2 + 14}
                y={(br.y + tr.y) / 2 + 4}
                textAnchor="start"
                fill={accentColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sideLabelText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show height */}
        <AnimatePresence>
          {isVisible('showHeight') && (
            <motion.g
              data-testid="parallelogram-height"
              initial="hidden"
              animate={isCurrent('showHeight') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Height line (dashed) */}
              <motion.line
                x1={heightLineX}
                y1={heightTop}
                x2={heightLineX}
                y2={heightBottom}
                stroke="#ef4444"
                strokeWidth={diagram.lineWeight * 0.9}
                strokeDasharray="5 3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right angle marker at base */}
              <motion.path
                d={`M ${heightLineX + 8} ${heightBottom} L ${heightLineX + 8} ${heightBottom - 8} L ${heightLineX} ${heightBottom - 8}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={diagram.lineWeight * 0.6}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              />
              {/* Height label */}
              <motion.text
                x={heightLineX - 10}
                y={(heightTop + heightBottom) / 2 + 4}
                textAnchor="end"
                fill="#ef4444"
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                h = {heightLabelText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show formula */}
        <AnimatePresence>
          {isVisible('showFormula') && (
            <motion.g
              data-testid="parallelogram-formula"
              initial="hidden"
              animate={isCurrent('showFormula') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={svgWidth / 2}
                y={bl.y + 42}
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'שטח = בסיס × גובה' : 'Area = base × height'}
              </motion.text>
              {showCalcs && (
                <motion.text
                  x={svgWidth / 2}
                  y={bl.y + 58}
                  textAnchor="middle"
                  fill={primaryColor}
                  fontSize={13}
                  fontWeight={700}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  A = {base} × {paraHeight} = {area}
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

export default Parallelogram
