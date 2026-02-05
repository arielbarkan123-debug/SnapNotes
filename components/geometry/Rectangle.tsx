'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RectangleData, RectangleCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Draw the rectangle', he: 'ציור המלבן' },
  vertices: { en: 'Mark vertices', he: 'סימון קודקודים' },
  angles: { en: 'Show right angles', he: 'הצגת זוויות ישרות' },
  diagonals: { en: 'Draw diagonals', he: 'ציור אלכסונים' },
  measurements: { en: 'Show measurements', he: 'הצגת מידות' },
}

interface RectangleProps {
  data: RectangleData
  width?: number
  height?: number
  className?: string
  /** @deprecated Use initialStep instead */
  currentStep?: number
  /** Starting step (0-indexed) */
  initialStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * Rectangle - SVG component for displaying rectangles with calculations
 * Shows area, perimeter, and diagonal formulas with step-by-step solutions
 *
 * Quality standard checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] pathLength draw animation
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 */
export function Rectangle({
  data,
  width: svgWidth = 350,
  height: svgHeight = 350,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: RectangleProps) {
  const {
    width: rectWidth,
    height: rectHeight,
    widthLabel = 'w',
    heightLabel = 'h',
    showDiagonals = false,
    diagonalLabel = 'd',
    title,
    showFormulas = true,
    showCalculations = true,
    highlightSide,
  } = data

  // Determine which step groups exist based on data
  const hasDiagonals = showDiagonals
  const hasCalculations = showCalculations || showFormulas

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'vertices', label: STEP_LABELS.vertices.en, labelHe: STEP_LABELS.vertices.he },
      { id: 'angles', label: STEP_LABELS.angles.en, labelHe: STEP_LABELS.angles.he },
    ]
    if (hasDiagonals) {
      defs.push({ id: 'diagonals', label: STEP_LABELS.diagonals.en, labelHe: STEP_LABELS.diagonals.he })
    }
    if (hasCalculations) {
      defs.push({ id: 'measurements', label: STEP_LABELS.measurements.en, labelHe: STEP_LABELS.measurements.he })
    }
    return defs
  }, [hasDiagonals, hasCalculations])

  // useDiagramBase — step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Calculate all measurements
  const calculations: RectangleCalculations = useMemo(() => {
    const area = rectWidth * rectHeight
    const perimeter = 2 * (rectWidth + rectHeight)
    const diagonal = Math.sqrt(rectWidth * rectWidth + rectHeight * rectHeight)

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מלבן' : 'Area formula for a rectangle',
        formula: 'A = w \\times h',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = ${rectWidth} \\times ${rectHeight}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = ${area}`,
      },
    ]

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף מלבן' : 'Perimeter formula for a rectangle',
        formula: 'P = 2(w + h)',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = 2(${rectWidth} + ${rectHeight})`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = 2 \\times ${rectWidth + rectHeight} = ${perimeter}`,
      },
    ]

    const diagonalSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת אלכסון (משפט פיתגורס)' : 'Diagonal formula (Pythagorean theorem)',
        formula: 'd = \\sqrt{w^2 + h^2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `d = \\sqrt{${rectWidth}^2 + ${rectHeight}^2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `d = \\sqrt{${rectWidth * rectWidth + rectHeight * rectHeight}} \\approx ${diagonal.toFixed(2)}`,
      },
    ]

    return {
      area,
      perimeter,
      diagonal,
      steps: { area: areaSteps, perimeter: perimeterSteps, diagonal: diagonalSteps },
    }
  }, [rectWidth, rectHeight, language])

  // SVG dimensions and scaling
  const padding = 50
  const availableWidth = svgWidth - padding * 2
  const availableHeight = svgHeight - 130 - padding

  // Scale to fit
  const scaleX = availableWidth / rectWidth
  const scaleY = availableHeight / rectHeight
  const scale = Math.min(scaleX, scaleY, 30) // Cap scale for very small values

  const scaledWidth = rectWidth * scale
  const scaledHeight = rectHeight * scale
  const startX = (svgWidth - scaledWidth) / 2
  const startY = padding + 20

  // Vertices (clockwise from top-left)
  const vertices = [
    { x: startX, y: startY, label: 'A' },
    { x: startX + scaledWidth, y: startY, label: 'B' },
    { x: startX + scaledWidth, y: startY + scaledHeight, label: 'C' },
    { x: startX, y: startY + scaledHeight, label: 'D' },
  ]

  const rectPath = `M ${vertices[0].x} ${vertices[0].y}
                    L ${vertices[1].x} ${vertices[1].y}
                    L ${vertices[2].x} ${vertices[2].y}
                    L ${vertices[3].x} ${vertices[3].y} Z`

  // Right angle marker size
  const rightAngleSize = 12

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="rectangle-diagram"
      className={`geometry-rectangle ${className}`}
      style={{ width: '100%', maxWidth: svgWidth }}
    >
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Rectangle with width ${rectWidth} and height ${rectHeight}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="rect-background"
          width={svgWidth}
          height={svgHeight}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="rect-title"
            x={svgWidth / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* ── Step 0: Outline ──────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="rect-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Rectangle fill */}
              <motion.path
                d={rectPath}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Rectangle outline — draws progressively */}
              <motion.path
                data-testid="rect-path"
                d={rectPath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Highlighted sides - width */}
              {highlightSide === 'width' && (
                <>
                  <motion.line
                    x1={vertices[0].x}
                    y1={vertices[0].y}
                    x2={vertices[1].x}
                    y2={vertices[1].y}
                    stroke={GEOMETRY_COLORS.highlight.primary}
                    strokeWidth={3}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.line
                    x1={vertices[3].x}
                    y1={vertices[3].y}
                    x2={vertices[2].x}
                    y2={vertices[2].y}
                    stroke={GEOMETRY_COLORS.highlight.primary}
                    strokeWidth={3}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                </>
              )}

              {/* Highlighted sides - height */}
              {highlightSide === 'height' && (
                <>
                  <motion.line
                    x1={vertices[1].x}
                    y1={vertices[1].y}
                    x2={vertices[2].x}
                    y2={vertices[2].y}
                    stroke={GEOMETRY_COLORS.highlight.primary}
                    strokeWidth={3}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.line
                    x1={vertices[0].x}
                    y1={vertices[0].y}
                    x2={vertices[3].x}
                    y2={vertices[3].y}
                    stroke={GEOMETRY_COLORS.highlight.primary}
                    strokeWidth={3}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Vertices ─────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('vertices') && (
            <motion.g
              data-testid="rect-vertices"
              initial="hidden"
              animate={isCurrent('vertices') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {vertices.map((v, i) => (
                <motion.g
                  key={`vertex-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    delay: i * 0.1,
                  }}
                >
                  <circle
                    data-testid={`rect-vertex-${v.label}`}
                    cx={v.x}
                    cy={v.y}
                    r={diagram.lineWeight}
                    fill="currentColor"
                  />
                  <motion.text
                    x={v.x + (i === 0 || i === 3 ? -12 : 12)}
                    y={v.y + (i === 0 || i === 1 ? -8 : 12)}
                    textAnchor="middle"
                    className="fill-current text-sm font-bold"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: i * 0.1 + 0.2 }}
                  >
                    {v.label}
                  </motion.text>
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Right Angles ─────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('angles') && (
            <motion.g
              data-testid="rect-angles"
              initial="hidden"
              animate={isCurrent('angles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {[
                { vx: vertices[0].x, vy: vertices[0].y, dx1: 1, dy1: 0, dx2: 0, dy2: 1 },
                { vx: vertices[1].x, vy: vertices[1].y, dx1: 0, dy1: 1, dx2: -1, dy2: 0 },
                { vx: vertices[2].x, vy: vertices[2].y, dx1: -1, dy1: 0, dx2: 0, dy2: -1 },
                { vx: vertices[3].x, vy: vertices[3].y, dx1: 0, dy1: -1, dx2: 1, dy2: 0 },
              ].map((angle, index) => (
                <motion.path
                  key={`angle-${index}`}
                  data-testid={`rect-angle-${index}`}
                  d={`M ${angle.vx + angle.dx1 * rightAngleSize} ${angle.vy + angle.dy1 * rightAngleSize}
                      L ${angle.vx + angle.dx1 * rightAngleSize + angle.dx2 * rightAngleSize} ${angle.vy + angle.dy1 * rightAngleSize + angle.dy2 * rightAngleSize}
                      L ${angle.vx + angle.dx2 * rightAngleSize} ${angle.vy + angle.dy2 * rightAngleSize}`}
                  fill="none"
                  stroke={GEOMETRY_COLORS.label.angle}
                  strokeWidth={1.5}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Diagonals ────────────────────────────────────── */}
        <AnimatePresence>
          {hasDiagonals && isVisible('diagonals') && (
            <motion.g
              data-testid="rect-diagonals"
              initial="hidden"
              animate={isCurrent('diagonals') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={vertices[0].x}
                y1={vertices[0].y}
                x2={vertices[2].x}
                y2={vertices[2].y}
                stroke={GEOMETRY_COLORS.auxiliary.diagonal}
                strokeWidth={1.5}
                strokeDasharray="5,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.line
                x1={vertices[1].x}
                y1={vertices[1].y}
                x2={vertices[3].x}
                y2={vertices[3].y}
                stroke={GEOMETRY_COLORS.auxiliary.diagonal}
                strokeWidth={1.5}
                strokeDasharray="5,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.3 }}
              />
              <motion.text
                x={(vertices[0].x + vertices[2].x) / 2 + 10}
                y={(vertices[0].y + vertices[2].y) / 2 - 5}
                style={{ fill: GEOMETRY_COLORS.auxiliary.diagonal }}
                className="text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.5 }}
              >
                {diagonalLabel}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Measurements ─────────────────────────────────── */}
        <AnimatePresence>
          {hasCalculations && isVisible('measurements') && (
            <motion.g
              data-testid="rect-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Width label (top) */}
              <motion.text
                x={(vertices[0].x + vertices[1].x) / 2}
                y={vertices[0].y - 10}
                textAnchor="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {widthLabel} = {rectWidth}
              </motion.text>

              {/* Height label (right) */}
              <motion.text
                x={vertices[1].x + 15}
                y={(vertices[1].y + vertices[2].y) / 2}
                textAnchor="start"
                dominantBaseline="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.1 }}
              >
                {heightLabel} = {rectHeight}
              </motion.text>

              {/* Formulas section */}
              {showFormulas && (
                <motion.g
                  transform={`translate(0, ${startY + scaledHeight + 30})`}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.2 }}
                >
                  <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
                    {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
                  </text>
                  <text x={10} y={18} className="fill-current text-xs">
                    {language === 'he' ? 'שטח' : 'Area'}: A = w × h = {rectWidth} × {rectHeight} = {calculations.area}
                  </text>
                  <text x={10} y={36} className="fill-current text-xs">
                    {language === 'he' ? 'היקף' : 'Perimeter'}: P = 2(w + h) = 2({rectWidth} + {rectHeight}) = {calculations.perimeter}
                  </text>
                  {showDiagonals && (
                    <text x={10} y={54} className="fill-current text-xs">
                      {language === 'he' ? 'אלכסון' : 'Diagonal'}: d = √(w² + h²) ≈ {calculations.diagonal.toFixed(2)}
                    </text>
                  )}
                </motion.g>
              )}
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

      {/* Step-by-step solution (optional detailed view) */}
      {showStepByStep && showCalculations && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">
            {language === 'he' ? 'פתרון מפורט:' : 'Step-by-Step Solution:'}
          </h4>
          <div className="space-y-3">
            {/* Area calculation */}
            <div className="border-l-2 border-blue-500 pl-3">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {language === 'he' ? 'שטח:' : 'Area:'}
              </p>
              {calculations.steps?.area.map((step) => (
                <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                  {step.formula || step.substitution || step.result}
                </p>
              ))}
            </div>

            {/* Perimeter calculation */}
            <div className="border-l-2 border-green-500 pl-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {language === 'he' ? 'היקף:' : 'Perimeter:'}
              </p>
              {calculations.steps?.perimeter.map((step) => (
                <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                  {step.formula || step.substitution || step.result}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rectangle
