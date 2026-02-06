'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TrapezoidData } from '@/types/math'
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

interface TrapezoidProps {
  data: TrapezoidData
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
  drawShape: { en: 'Draw trapezoid', he: 'ציור טרפז' },
  labelBases: { en: 'Label bases', he: 'סימון בסיסים' },
  showHeight: { en: 'Show height', he: 'הצגת גובה' },
  showFormula: { en: 'Show area formula', he: 'נוסחת שטח' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Trapezoid({
  data,
  className = '',
  width: svgWidth = 450,
  height: svgHeight = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TrapezoidProps) {
  const {
    topBase,
    bottomBase,
    height: trapHeight,
    topLabel,
    bottomLabel,
    heightLabel,
    showHeight: showH,
    isIsosceles,
    title,
    showFormulas,
    showCalculations: showCalcs,
  } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawShape', label: STEP_LABELS.drawShape.en, labelHe: STEP_LABELS.drawShape.he },
      { id: 'labelBases', label: STEP_LABELS.labelBases.en, labelHe: STEP_LABELS.labelBases.he },
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

  // Scale to fit
  const maxBase = Math.max(topBase, bottomBase)
  const scaleF = Math.min(availableW / maxBase, availableH / trapHeight) * 0.85
  const drawTopBase = topBase * scaleF
  const drawBottomBase = bottomBase * scaleF
  const drawHeight = trapHeight * scaleF

  const cx = svgWidth / 2
  const baseY = (svgHeight - padding.bottom + padding.top) / 2 + drawHeight / 2

  // For isosceles trapezoid, the top base is centered; otherwise offset slightly
  const topOffset = isIsosceles !== false ? (drawBottomBase - drawTopBase) / 2 : (drawBottomBase - drawTopBase) * 0.4

  // Points
  const bl = { x: cx - drawBottomBase / 2, y: baseY }
  const br = { x: cx + drawBottomBase / 2, y: baseY }
  const tl = { x: bl.x + topOffset, y: baseY - drawHeight }
  const tr = { x: tl.x + drawTopBase, y: baseY - drawHeight }

  const shapePath = `M ${bl.x} ${bl.y} L ${br.x} ${br.y} L ${tr.x} ${tr.y} L ${tl.x} ${tl.y} Z`

  const topLabelText = topLabel || `${topBase}`
  const bottomLabelText = bottomLabel || `${bottomBase}`
  const heightLabelText = heightLabel || `${trapHeight}`

  const area = ((topBase + bottomBase) * trapHeight) / 2

  const viewBox = `0 0 ${svgWidth} ${svgHeight}`

  // Height line position: drop from top-left vertex down, or from a point on the top base
  const heightLineX = tl.x + drawTopBase * 0.15

  return (
    <div
      data-testid="trapezoid-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: svgWidth }}
    >
      {title && (
        <div
          data-testid="trapezoid-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="trapezoid-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw trapezoid */}
        <AnimatePresence>
          {isVisible('drawShape') && (
            <motion.g
              data-testid="trapezoid-shape"
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
              {/* Parallel markers on top and bottom bases */}
              {/* Bottom base arrows */}
              <motion.g initial="hidden" animate="visible" variants={labelAppearVariants}>
                <line
                  x1={(bl.x + br.x) / 2 - 6}
                  y1={bl.y - 3}
                  x2={(bl.x + br.x) / 2}
                  y2={bl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
                <line
                  x1={(bl.x + br.x) / 2 - 6}
                  y1={bl.y + 3}
                  x2={(bl.x + br.x) / 2}
                  y2={bl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
                <line
                  x1={(bl.x + br.x) / 2 + 6}
                  y1={bl.y - 3}
                  x2={(bl.x + br.x) / 2}
                  y2={bl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
                <line
                  x1={(bl.x + br.x) / 2 + 6}
                  y1={bl.y + 3}
                  x2={(bl.x + br.x) / 2}
                  y2={bl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
              </motion.g>
              {/* Top base arrows */}
              <motion.g initial="hidden" animate="visible" variants={labelAppearVariants}>
                <line
                  x1={(tl.x + tr.x) / 2 - 6}
                  y1={tl.y - 3}
                  x2={(tl.x + tr.x) / 2}
                  y2={tl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
                <line
                  x1={(tl.x + tr.x) / 2 - 6}
                  y1={tl.y + 3}
                  x2={(tl.x + tr.x) / 2}
                  y2={tl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
                <line
                  x1={(tl.x + tr.x) / 2 + 6}
                  y1={tl.y - 3}
                  x2={(tl.x + tr.x) / 2}
                  y2={tl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
                <line
                  x1={(tl.x + tr.x) / 2 + 6}
                  y1={tl.y + 3}
                  x2={(tl.x + tr.x) / 2}
                  y2={tl.y}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight * 0.5}
                />
              </motion.g>
              {/* Equal side marks for isosceles */}
              {isIsosceles && (
                <>
                  {[
                    { p1: bl, p2: tl },
                    { p1: br, p2: tr },
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
                        key={`iso-tick-${i}`}
                        x1={mx - nx * tickLen}
                        y1={my - ny * tickLen}
                        x2={mx + nx * tickLen}
                        y2={my + ny * tickLen}
                        stroke={accentColor}
                        strokeWidth={diagram.lineWeight * 0.7}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      />
                    )
                  })}
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label bases */}
        <AnimatePresence>
          {isVisible('labelBases') && (
            <motion.g
              data-testid="trapezoid-labels"
              initial="hidden"
              animate={isCurrent('labelBases') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top base label */}
              <motion.text
                x={(tl.x + tr.x) / 2}
                y={tl.y - 10}
                textAnchor="middle"
                fill={accentColor}
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                a = {topLabelText}
              </motion.text>

              {/* Bottom base label */}
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
                b = {bottomLabelText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show height */}
        <AnimatePresence>
          {isVisible('showHeight') && (
            <motion.g
              data-testid="trapezoid-height"
              initial="hidden"
              animate={isCurrent('showHeight') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Height line */}
              <motion.line
                x1={heightLineX}
                y1={tl.y}
                x2={heightLineX}
                y2={bl.y}
                stroke="#ef4444"
                strokeWidth={diagram.lineWeight * 0.9}
                strokeDasharray="5 3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right angle marker at bottom */}
              <motion.path
                d={`M ${heightLineX + 8} ${bl.y} L ${heightLineX + 8} ${bl.y - 8} L ${heightLineX} ${bl.y - 8}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={diagram.lineWeight * 0.6}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              />
              {/* Right angle marker at top */}
              <motion.path
                d={`M ${heightLineX + 8} ${tl.y} L ${heightLineX + 8} ${tl.y + 8} L ${heightLineX} ${tl.y + 8}`}
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
                y={(tl.y + bl.y) / 2 + 4}
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
              data-testid="trapezoid-formula"
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
                {language === 'he' ? 'שטח = (a + b) × h / 2' : 'Area = (a + b) × h / 2'}
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
                  A = ({topBase} + {bottomBase}) × {trapHeight} / 2 = {area}
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

export default Trapezoid
