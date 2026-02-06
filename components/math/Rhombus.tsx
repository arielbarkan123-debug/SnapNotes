'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RhombusData } from '@/types/math'
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

interface RhombusProps {
  data: RhombusData
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
  drawShape: { en: 'Draw rhombus', he: 'ציור מעוין' },
  labelSides: { en: 'Label sides', he: 'סימון צלעות' },
  showDiagonals: { en: 'Show diagonals', he: 'הצגת אלכסונים' },
  showFormula: { en: 'Show area formula', he: 'נוסחת שטח' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Rhombus({
  data,
  className = '',
  width: svgWidth = 400,
  height: svgHeight = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: RhombusProps) {
  const {
    side,
    diagonal1,
    diagonal2,
    sideLabel,
    d1Label,
    d2Label,
    showDiagonals: showDiags,
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
    if (showDiags !== false) {
      defs.push({ id: 'showDiagonals', label: STEP_LABELS.showDiagonals.en, labelHe: STEP_LABELS.showDiagonals.he })
    }
    if (showFormulas !== false) {
      defs.push({ id: 'showFormula', label: STEP_LABELS.showFormula.en, labelHe: STEP_LABELS.showFormula.he })
    }
    return defs
  }, [showDiags, showFormulas])

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

  // Layout - rhombus defined by its two diagonals
  const padding = { left: 60, right: 60, top: 50, bottom: 70 }
  const availableW = svgWidth - padding.left - padding.right
  const availableH = svgHeight - padding.top - padding.bottom

  // Scale diagonals to fit
  const scaleF = Math.min(availableW / diagonal1, availableH / diagonal2) * 0.85
  const drawD1 = diagonal1 * scaleF // horizontal diagonal
  const drawD2 = diagonal2 * scaleF // vertical diagonal

  const cx = svgWidth / 2
  const cy = (svgHeight - padding.bottom + padding.top) / 2

  // Vertices: top, right, bottom, left (diamond orientation)
  const top = { x: cx, y: cy - drawD2 / 2 }
  const right = { x: cx + drawD1 / 2, y: cy }
  const bottom = { x: cx, y: cy + drawD2 / 2 }
  const left = { x: cx - drawD1 / 2, y: cy }

  const shapePath = `M ${top.x} ${top.y} L ${right.x} ${right.y} L ${bottom.x} ${bottom.y} L ${left.x} ${left.y} Z`

  const sideLabelText = sideLabel || `${side}`
  const d1LabelText = d1Label || `d\u2081 = ${diagonal1}`
  const d2LabelText = d2Label || `d\u2082 = ${diagonal2}`

  const area = (diagonal1 * diagonal2) / 2
  const perimeter = 4 * side

  const viewBox = `0 0 ${svgWidth} ${svgHeight}`

  return (
    <div
      data-testid="rhombus-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: svgWidth }}
    >
      {title && (
        <div
          data-testid="rhombus-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="rhombus-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw rhombus */}
        <AnimatePresence>
          {isVisible('drawShape') && (
            <motion.g
              data-testid="rhombus-shape"
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
              {/* Tick marks on all sides to show equal length */}
              {[
                { p1: top, p2: right },
                { p1: right, p2: bottom },
                { p1: bottom, p2: left },
                { p1: left, p2: top },
              ].map(({ p1, p2 }, i) => {
                const mx = (p1.x + p2.x) / 2
                const my = (p1.y + p2.y) / 2
                const dx = p2.x - p1.x
                const dy = p2.y - p1.y
                const len = Math.sqrt(dx * dx + dy * dy)
                const nx = -dy / len
                const ny = dx / len
                const tickLen = 5
                return (
                  <motion.line
                    key={`tick-${i}`}
                    x1={mx - nx * tickLen}
                    y1={my - ny * tickLen}
                    x2={mx + nx * tickLen}
                    y2={my + ny * tickLen}
                    stroke={primaryColor}
                    strokeWidth={diagram.lineWeight * 0.7}
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
              data-testid="rhombus-labels"
              initial="hidden"
              animate={isCurrent('labelSides') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top-right side */}
              <motion.text
                x={(top.x + right.x) / 2 + 10}
                y={(top.y + right.y) / 2 - 8}
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

              {/* Bottom-right side */}
              <motion.text
                x={(right.x + bottom.x) / 2 + 10}
                y={(right.y + bottom.y) / 2 + 4}
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

              {/* Bottom-left side */}
              <motion.text
                x={(bottom.x + left.x) / 2 - 10}
                y={(bottom.y + left.y) / 2 + 4}
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

              {/* Top-left side */}
              <motion.text
                x={(left.x + top.x) / 2 - 10}
                y={(left.y + top.y) / 2 - 8}
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
          {isVisible('showDiagonals') && (
            <motion.g
              data-testid="rhombus-diagonals"
              initial="hidden"
              animate={isCurrent('showDiagonals') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Horizontal diagonal (d1) */}
              <motion.line
                x1={left.x}
                y1={left.y}
                x2={right.x}
                y2={right.y}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight * 0.8}
                strokeDasharray="6 4"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Vertical diagonal (d2) */}
              <motion.line
                x1={top.x}
                y1={top.y}
                x2={bottom.x}
                y2={bottom.y}
                stroke="#ef4444"
                strokeWidth={diagram.lineWeight * 0.8}
                strokeDasharray="6 4"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right angle at intersection */}
              <motion.path
                d={`M ${cx + 8} ${cy} L ${cx + 8} ${cy - 8} L ${cx} ${cy - 8}`}
                fill="none"
                stroke="#6b7280"
                strokeWidth={diagram.lineWeight * 0.5}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              />
              {/* d1 label */}
              <motion.text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                fill={accentColor}
                fontSize={11}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {d1LabelText}
              </motion.text>
              {/* d2 label */}
              <motion.text
                x={cx + 16}
                y={cy - drawD2 * 0.25}
                textAnchor="start"
                fill="#ef4444"
                fontSize={11}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {d2LabelText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show formula */}
        <AnimatePresence>
          {isVisible('showFormula') && (
            <motion.g
              data-testid="rhombus-formula"
              initial="hidden"
              animate={isCurrent('showFormula') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={svgWidth / 2}
                y={bottom.y + 30}
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'שטח = (d₁ × d₂) / 2' : 'Area = (d₁ × d₂) / 2'}
              </motion.text>
              {showCalcs && (
                <motion.text
                  x={svgWidth / 2}
                  y={bottom.y + 48}
                  textAnchor="middle"
                  fill={primaryColor}
                  fontSize={13}
                  fontWeight={700}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  A = ({diagonal1} × {diagonal2}) / 2 = {area}
                </motion.text>
              )}
              <motion.text
                x={svgWidth / 2}
                y={bottom.y + (showCalcs ? 64 : 48)}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400"
                fontSize={11}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? `היקף = 4 × ${side} = ${perimeter}` : `P = 4 × ${side} = ${perimeter}`}
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

export default Rhombus
