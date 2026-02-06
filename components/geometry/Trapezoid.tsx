'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TrapezoidData, TrapezoidCalculations, SolutionStep } from '@/types/geometry'
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
  outline: { en: 'Draw the trapezoid', he: 'ציור הטרפז' },
  vertices: { en: 'Mark vertices', he: 'סימון קודקודים' },
  height: { en: 'Show height', he: 'הצגת גובה' },
  median: { en: 'Draw median', he: 'ציור קו אמצעים' },
  measurements: { en: 'Show measurements', he: 'הצגת מידות' },
}

interface TrapezoidProps {
  data: TrapezoidData
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
 * Trapezoid - SVG component for displaying trapezoids
 * Shows area, perimeter, and median (midsegment) calculations
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
export function Trapezoid({
  data,
  width = 350,
  height = 350,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: TrapezoidProps) {
  const {
    topBase: a,
    bottomBase: b,
    height: h,
    leftSide,
    rightSide,
    topLabel = 'a',
    bottomLabel = 'b',
    heightLabel = 'h',
    leftLabel = 'c',
    rightLabel = 'd',
    showHeight = true,
    isIsosceles = false,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  // Determine which step groups exist based on data
  const hasHeight = showHeight
  const hasCalculations = showCalculations || showFormulas

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'vertices', label: STEP_LABELS.vertices.en, labelHe: STEP_LABELS.vertices.he },
    ]
    if (hasHeight) {
      defs.push({ id: 'height', label: STEP_LABELS.height.en, labelHe: STEP_LABELS.height.he })
    }
    // Always show median step for trapezoids
    defs.push({ id: 'median', label: STEP_LABELS.median.en, labelHe: STEP_LABELS.median.he })
    if (hasCalculations) {
      defs.push({ id: 'measurements', label: STEP_LABELS.measurements.en, labelHe: STEP_LABELS.measurements.he })
    }
    return defs
  }, [hasHeight, hasCalculations])

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
  const calculations: TrapezoidCalculations = useMemo(() => {
    // Area = ((a + b) / 2) × h
    const area = ((a + b) / 2) * h

    // Calculate sides if not provided
    let left = leftSide
    let right = rightSide

    if (!left || !right) {
      const offset = (b - a) / 2
      if (isIsosceles) {
        // Both sides equal for isosceles trapezoid
        const sideLen = Math.sqrt(h * h + offset * offset)
        left = left || sideLen
        right = right || sideLen
      } else {
        // Assume right-angled on left (common case)
        left = left || h
        right = right || Math.sqrt(h * h + (b - a) * (b - a))
      }
    }

    const perimeter = a + b + left + right

    // Median (midsegment) = (a + b) / 2
    const median = (a + b) / 2

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח טרפז' : 'Area formula for a trapezoid',
        formula: 'A = \\frac{(a + b)}{2} \\times h',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\frac{(${a} + ${b})}{2} \\times ${h}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = \\frac{${a + b}}{2} \\times ${h} = ${median} \\times ${h} = ${area}`,
      },
    ]

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף טרפז' : 'Perimeter formula for a trapezoid',
        formula: 'P = a + b + c + d',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = ${a} + ${b} + ${left.toFixed(2)} + ${right.toFixed(2)}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = ${perimeter.toFixed(2)}`,
      },
    ]

    const medianSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת קו אמצעים (מדיאנה)' : 'Midsegment (median) formula',
        formula: 'm = \\frac{a + b}{2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `m = \\frac{${a} + ${b}}{2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `m = ${median}`,
      },
    ]

    return {
      area,
      perimeter,
      medianLength: median,
      leftSide: left,
      rightSide: right,
      steps: { area: areaSteps, perimeter: perimeterSteps, median: medianSteps },
    }
  }, [a, b, h, leftSide, rightSide, isIsosceles, language])

  // SVG dimensions and scaling
  const padding = 50
  const plotWidth = width - padding * 2
  const plotHeight = height - 150

  // Scale to fit
  const scaleX = plotWidth / b // Bottom base is the longest
  const scaleY = plotHeight / h
  const scale = Math.min(scaleX, scaleY, 25) * 0.85

  const scaledTop = a * scale
  const scaledBottom = b * scale
  const scaledHeight = h * scale

  const cx = width / 2
  const startY = padding + 30

  // Calculate horizontal offset for top base (centered above bottom)
  const topOffset = (scaledBottom - scaledTop) / 2
  const leftOffset = isIsosceles ? topOffset : 0

  // Vertices (clockwise from top-left)
  const vertices = [
    { x: cx - scaledBottom / 2 + leftOffset, y: startY, label: 'A' }, // Top-left
    { x: cx - scaledBottom / 2 + leftOffset + scaledTop, y: startY, label: 'B' }, // Top-right
    { x: cx + scaledBottom / 2, y: startY + scaledHeight, label: 'C' }, // Bottom-right
    { x: cx - scaledBottom / 2, y: startY + scaledHeight, label: 'D' }, // Bottom-left
  ]

  const trapezoidPath = `M ${vertices[0].x} ${vertices[0].y}
                         L ${vertices[1].x} ${vertices[1].y}
                         L ${vertices[2].x} ${vertices[2].y}
                         L ${vertices[3].x} ${vertices[3].y} Z`

  // Median line position (halfway down the height)
  const medianY = startY + scaledHeight / 2
  const medianLeftX = (vertices[0].x + vertices[3].x) / 2
  const medianRightX = (vertices[1].x + vertices[2].x) / 2

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="trapezoid-diagram"
      className={`geometry-trapezoid ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Trapezoid with top base ${a}, bottom base ${b}, height ${h}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="trap-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="trap-title"
            x={width / 2}
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
              data-testid="trap-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Trapezoid fill */}
              <motion.path
                d={trapezoidPath}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Trapezoid outline — draws progressively */}
              <motion.path
                data-testid="trap-path"
                d={trapezoidPath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Parallel marks on top and bottom bases */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {/* Top base mark */}
                <line
                  x1={(vertices[0].x + vertices[1].x) / 2 - 5}
                  y1={vertices[0].y - 5}
                  x2={(vertices[0].x + vertices[1].x) / 2 + 5}
                  y2={vertices[0].y - 5}
                  stroke="currentColor"
                  strokeWidth={1.5}
                />
                {/* Bottom base mark */}
                <line
                  x1={(vertices[3].x + vertices[2].x) / 2 - 5}
                  y1={vertices[3].y + 5}
                  x2={(vertices[3].x + vertices[2].x) / 2 + 5}
                  y2={vertices[3].y + 5}
                  stroke="currentColor"
                  strokeWidth={1.5}
                />
              </motion.g>

              {/* Equal side marks for isosceles trapezoid */}
              {isIsosceles && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {/* Left side mark */}
                  <line
                    x1={(vertices[0].x + vertices[3].x) / 2 - 8}
                    y1={(vertices[0].y + vertices[3].y) / 2}
                    x2={(vertices[0].x + vertices[3].x) / 2 - 4}
                    y2={(vertices[0].y + vertices[3].y) / 2 + 5}
                    stroke="currentColor"
                    strokeWidth={diagram.lineWeight}
                  />
                  {/* Right side mark */}
                  <line
                    x1={(vertices[1].x + vertices[2].x) / 2 + 4}
                    y1={(vertices[1].y + vertices[2].y) / 2}
                    x2={(vertices[1].x + vertices[2].x) / 2 + 8}
                    y2={(vertices[1].y + vertices[2].y) / 2 + 5}
                    stroke="currentColor"
                    strokeWidth={diagram.lineWeight}
                  />
                </motion.g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Vertices ─────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('vertices') && (
            <motion.g
              data-testid="trap-vertices"
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
                    data-testid={`trap-vertex-${v.label}`}
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

        {/* ── Step 2: Height ───────────────────────────────────────── */}
        <AnimatePresence>
          {hasHeight && isVisible('height') && (
            <motion.g
              data-testid="trap-height"
              initial="hidden"
              animate={isCurrent('height') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={vertices[0].x}
                y1={vertices[0].y}
                x2={vertices[0].x}
                y2={vertices[3].y}
                stroke={GEOMETRY_COLORS.auxiliary.height}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="5,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right angle marker at bottom */}
              <motion.path
                d={`M ${vertices[0].x} ${vertices[3].y - 10}
                    L ${vertices[0].x + 10} ${vertices[3].y - 10}
                    L ${vertices[0].x + 10} ${vertices[3].y}`}
                fill="none"
                stroke={GEOMETRY_COLORS.auxiliary.height}
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              />
              {/* Height label */}
              <motion.text
                x={vertices[0].x - 20}
                y={(vertices[0].y + vertices[3].y) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: GEOMETRY_COLORS.auxiliary.height }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.5 }}
              >
                {heightLabel} = {h}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Median (midsegment) ──────────────────────────── */}
        <AnimatePresence>
          {isVisible('median') && (
            <motion.g
              data-testid="trap-median"
              initial="hidden"
              animate={isCurrent('median') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={medianLeftX}
                y1={medianY}
                x2={medianRightX}
                y2={medianY}
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="8,4"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Median label */}
              <motion.text
                x={(medianLeftX + medianRightX) / 2}
                y={medianY - 8}
                textAnchor="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
                className="text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.4 }}
              >
                m = {calculations.medianLength}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Measurements ─────────────────────────────────── */}
        <AnimatePresence>
          {hasCalculations && isVisible('measurements') && (
            <motion.g
              data-testid="trap-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Side labels */}
              {/* Top base */}
              <motion.text
                x={(vertices[0].x + vertices[1].x) / 2}
                y={vertices[0].y - 12}
                textAnchor="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {topLabel} = {a}
              </motion.text>

              {/* Bottom base */}
              <motion.text
                x={(vertices[3].x + vertices[2].x) / 2}
                y={vertices[3].y + 18}
                textAnchor="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.1 }}
              >
                {bottomLabel} = {b}
              </motion.text>

              {/* Left side */}
              <motion.text
                x={(vertices[0].x + vertices[3].x) / 2 - 18}
                y={(vertices[0].y + vertices[3].y) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.2 }}
              >
                {leftLabel}
              </motion.text>

              {/* Right side */}
              <motion.text
                x={(vertices[1].x + vertices[2].x) / 2 + 18}
                y={(vertices[1].y + vertices[2].y) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                {rightLabel}
              </motion.text>

              {/* Formulas section */}
              {showFormulas && (
                <motion.g
                  transform={`translate(0, ${startY + scaledHeight + 35})`}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.4 }}
                >
                  <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
                    {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
                  </text>
                  <text x={10} y={18} className="fill-current text-xs">
                    {language === 'he' ? 'שטח' : 'Area'}: A = ((a+b)/2)×h = (({a}+{b})/2)×{h} = {calculations.area}
                  </text>
                  <text x={10} y={36} className="fill-current text-xs">
                    {language === 'he' ? 'היקף' : 'Perimeter'}: P ≈ {calculations.perimeter.toFixed(2)}
                  </text>
                  <text x={10} y={54} className="fill-current text-xs">
                    {language === 'he' ? 'קו אמצעים' : 'Midsegment'}: m = (a+b)/2 = {calculations.medianLength}
                  </text>
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

            {/* Median calculation */}
            <div className="border-l-2 border-amber-500 pl-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {language === 'he' ? 'קו אמצעים:' : 'Midsegment:'}
              </p>
              {calculations.steps?.median?.map((step) => (
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

export default Trapezoid
