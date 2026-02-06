'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SquareData } from '@/types/math'
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

interface SquareProps {
  data: SquareData
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
  drawSquare: { en: 'Draw square', he: 'ציור ריבוע' },
  labelSides: { en: 'Label sides', he: 'סימון צלעות' },
  showDiagonals: { en: 'Show diagonals', he: 'הצגת אלכסונים' },
  showFormula: { en: 'Show area formula', he: 'נוסחת שטח' },
  showCalculations: { en: 'Show calculations', he: 'הצגת חישובים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Square({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: SquareProps) {
  const {
    side,
    sideLabel,
    showDiagonals: showDiags,
    diagonalLabel,
    title,
    showFormulas,
    showCalculations: showCalcs,
  } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawSquare', label: STEP_LABELS.drawSquare.en, labelHe: STEP_LABELS.drawSquare.he },
      { id: 'labelSides', label: STEP_LABELS.labelSides.en, labelHe: STEP_LABELS.labelSides.he },
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

  // Layout - center the square in the viewBox
  const padding = { left: 60, right: 60, top: 50, bottom: 70 }
  const availableW = width - padding.left - padding.right
  const availableH = height - padding.top - padding.bottom
  const squareSize = Math.min(availableW, availableH)
  const cx = width / 2
  const cy = (height - padding.bottom + padding.top) / 2
  const half = squareSize / 2

  // Square corners
  const topLeft = { x: cx - half, y: cy - half }
  const topRight = { x: cx + half, y: cy - half }
  const bottomRight = { x: cx + half, y: cy + half }
  const bottomLeft = { x: cx - half, y: cy + half }

  const squarePath = `M ${topLeft.x} ${topLeft.y} L ${topRight.x} ${topRight.y} L ${bottomRight.x} ${bottomRight.y} L ${bottomLeft.x} ${bottomLeft.y} Z`

  const sideLabelText = sideLabel || `${side}`
  const diag = Math.sqrt(2) * side
  const diagLabelText = diagonalLabel || `${diag.toFixed(2)}`

  const area = side * side
  const perimeter = 4 * side

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="square-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="square-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="square-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw square */}
        <AnimatePresence>
          {isVisible('drawSquare') && (
            <motion.g
              data-testid="square-shape"
              initial="hidden"
              animate={isCurrent('drawSquare') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={squarePath}
                fill={`${primaryColor}15`}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right angle markers at corners */}
              {[topLeft, topRight, bottomRight, bottomLeft].map((corner, i) => {
                const markerSize = 12
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

        {/* Step 1: Label sides */}
        <AnimatePresence>
          {isVisible('labelSides') && (
            <motion.g
              data-testid="square-labels"
              initial="hidden"
              animate={isCurrent('labelSides') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top side label */}
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
                {sideLabelText}
              </motion.text>

              {/* Right side label */}
              <motion.text
                x={topRight.x + 14}
                y={cy + 4}
                textAnchor="start"
                fill={primaryColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sideLabelText}
              </motion.text>

              {/* Bottom side label */}
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
                {sideLabelText}
              </motion.text>

              {/* Left side label */}
              <motion.text
                x={topLeft.x - 14}
                y={cy + 4}
                textAnchor="end"
                fill={primaryColor}
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

        {/* Step 2: Show diagonals */}
        <AnimatePresence>
          {showDiags && isVisible('showDiagonals') && (
            <motion.g
              data-testid="square-diagonals"
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
              {/* Diagonal label */}
              <motion.text
                x={cx + half * 0.35}
                y={cy - half * 0.35 - 6}
                textAnchor="middle"
                fill={accentColor}
                fontSize={11}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                d = {diagLabelText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show area formula */}
        <AnimatePresence>
          {isVisible('showFormula') && (
            <motion.g
              data-testid="square-formula"
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
                {language === 'he' ? 'שטח = צלע²' : 'Area = side²'}
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
                {language === 'he' ? 'היקף = 4 × צלע' : 'Perimeter = 4 × side'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Show calculations */}
        <AnimatePresence>
          {showCalcs && isVisible('showCalculations') && (
            <motion.g
              data-testid="square-calculations"
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
                A = {side}² = {area}
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
                P = 4 × {side} = {perimeter}
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

export default Square
