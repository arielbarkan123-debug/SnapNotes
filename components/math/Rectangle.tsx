'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RectangleData } from '@/types/math'
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

interface RectangleProps {
  data: RectangleData
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
  drawRect: { en: 'Draw rectangle', he: 'ציור מלבן' },
  labelDims: { en: 'Label dimensions', he: 'סימון מידות' },
  showDiagonals: { en: 'Show diagonals', he: 'הצגת אלכסונים' },
  showFormula: { en: 'Show area formula', he: 'נוסחת שטח' },
  showCalculations: { en: 'Show calculations', he: 'הצגת חישובים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Rectangle({
  data,
  className = '',
  width: svgWidth = 450,
  height: svgHeight = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: RectangleProps) {
  const {
    width: rectW,
    height: rectH,
    widthLabel,
    heightLabel,
    showDiagonals: showDiags,
    diagonalLabel,
    title,
    showFormulas,
    showCalculations: showCalcs,
  } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawRect', label: STEP_LABELS.drawRect.en, labelHe: STEP_LABELS.drawRect.he },
      { id: 'labelDims', label: STEP_LABELS.labelDims.en, labelHe: STEP_LABELS.labelDims.he },
    ]
    if (showDiags) {
      defs.push({ id: 'showDiagonals', label: STEP_LABELS.showDiagonals.en, labelHe: STEP_LABELS.showDiagonals.he })
    }
    if (showFormulas !== false) {
      defs.push({ id: 'showFormula', label: STEP_LABELS.showFormula.en, labelHe: STEP_LABELS.showFormula.he })
    }
    if (showCalcs) {
      defs.push({ id: 'showCalculations', label: STEP_LABELS.showCalculations.en, labelHe: STEP_LABELS.showCalculations.he })
    }
    return defs
  }, [showDiags, showFormulas, showCalcs])

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

  // Layout - fit the rectangle proportionally
  const padding = { left: 60, right: 60, top: 50, bottom: 70 }
  const availableW = svgWidth - padding.left - padding.right
  const availableH = svgHeight - padding.top - padding.bottom

  // Scale the rectangle to fit while preserving aspect ratio
  const aspectRatio = rectW / rectH
  let drawW: number, drawH: number
  if (availableW / availableH > aspectRatio) {
    drawH = availableH
    drawW = drawH * aspectRatio
  } else {
    drawW = availableW
    drawH = drawW / aspectRatio
  }

  const cx = svgWidth / 2
  const cy = (svgHeight - padding.bottom + padding.top) / 2

  const topLeft = { x: cx - drawW / 2, y: cy - drawH / 2 }
  const topRight = { x: cx + drawW / 2, y: cy - drawH / 2 }
  const bottomRight = { x: cx + drawW / 2, y: cy + drawH / 2 }
  const bottomLeft = { x: cx - drawW / 2, y: cy + drawH / 2 }

  const rectPath = `M ${topLeft.x} ${topLeft.y} L ${topRight.x} ${topRight.y} L ${bottomRight.x} ${bottomRight.y} L ${bottomLeft.x} ${bottomLeft.y} Z`

  const wLabel = widthLabel || `${rectW}`
  const hLabel = heightLabel || `${rectH}`
  const diagonal = Math.sqrt(rectW * rectW + rectH * rectH)
  const diagLabel = diagonalLabel || `${diagonal.toFixed(2)}`

  const area = rectW * rectH
  const perimeter = 2 * (rectW + rectH)

  const viewBox = `0 0 ${svgWidth} ${svgHeight}`

  return (
    <div
      data-testid="rectangle-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: svgWidth }}
    >
      {title && (
        <div
          data-testid="rectangle-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="rectangle-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw rectangle */}
        <AnimatePresence>
          {isVisible('drawRect') && (
            <motion.g
              data-testid="rectangle-shape"
              initial="hidden"
              animate={isCurrent('drawRect') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={rectPath}
                fill={`${primaryColor}15`}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right angle markers */}
              {[topLeft, topRight, bottomRight, bottomLeft].map((corner, i) => {
                const markerSize = 10
                const dirs = [
                  { dx: 1, dy: 1 },
                  { dx: -1, dy: 1 },
                  { dx: -1, dy: -1 },
                  { dx: 1, dy: -1 },
                ]
                const d = dirs[i]
                return (
                  <motion.path
                    key={`angle-${i}`}
                    d={`M ${corner.x + d.dx * markerSize} ${corner.y} L ${corner.x + d.dx * markerSize} ${corner.y + d.dy * markerSize} L ${corner.x} ${corner.y + d.dy * markerSize}`}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth={diagram.lineWeight * 0.6}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label dimensions */}
        <AnimatePresence>
          {isVisible('labelDims') && (
            <motion.g
              data-testid="rectangle-labels"
              initial="hidden"
              animate={isCurrent('labelDims') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top (width) label */}
              <motion.text
                x={cx}
                y={topLeft.y - 10}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {wLabel}
              </motion.text>

              {/* Bottom (width) label */}
              <motion.text
                x={cx}
                y={bottomLeft.y + 20}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {wLabel}
              </motion.text>

              {/* Right (height) label */}
              <motion.text
                x={topRight.x + 14}
                y={cy + 4}
                textAnchor="start"
                fill={accentColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {hLabel}
              </motion.text>

              {/* Left (height) label */}
              <motion.text
                x={topLeft.x - 14}
                y={cy + 4}
                textAnchor="end"
                fill={accentColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {hLabel}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show diagonals */}
        <AnimatePresence>
          {showDiags && isVisible('showDiagonals') && (
            <motion.g
              data-testid="rectangle-diagonals"
              initial="hidden"
              animate={isCurrent('showDiagonals') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={topLeft.x}
                y1={topLeft.y}
                x2={bottomRight.x}
                y2={bottomRight.y}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight * 0.8}
                strokeDasharray="6 4"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.line
                x1={topRight.x}
                y1={topRight.y}
                x2={bottomLeft.x}
                y2={bottomLeft.y}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight * 0.8}
                strokeDasharray="6 4"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={cx + drawW * 0.2}
                y={cy - drawH * 0.2 - 6}
                textAnchor="middle"
                fill={accentColor}
                fontSize={11}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                d = {diagLabel}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show area formula */}
        <AnimatePresence>
          {isVisible('showFormula') && (
            <motion.g
              data-testid="rectangle-formula"
              initial="hidden"
              animate={isCurrent('showFormula') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={cx}
                y={bottomLeft.y + 42}
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'שטח = אורך × רוחב' : 'Area = width × height'}
              </motion.text>
              <motion.text
                x={cx}
                y={bottomLeft.y + 58}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400"
                fontSize={11}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'היקף = 2 × (אורך + רוחב)' : 'Perimeter = 2 × (w + h)'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Show calculations */}
        <AnimatePresence>
          {showCalcs && isVisible('showCalculations') && (
            <motion.g
              data-testid="rectangle-calculations"
              initial="hidden"
              animate={isCurrent('showCalculations') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={14}
                fontWeight={700}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                A = {rectW} × {rectH} = {area}
              </motion.text>
              <motion.text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                fill={accentColor}
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                P = 2 × ({rectW} + {rectH}) = {perimeter}
              </motion.text>
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

export default Rectangle
