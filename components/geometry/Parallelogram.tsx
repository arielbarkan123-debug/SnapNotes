'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ParallelogramData, ParallelogramCalculations, SolutionStep } from '@/types/geometry'
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
  outline: { en: 'Draw the parallelogram', he: 'ציור המקבילית' },
  vertices: { en: 'Mark vertices', he: 'סימון קודקודים' },
  parallelMarks: { en: 'Show parallel sides', he: 'הצגת צלעות מקבילות' },
  height: { en: 'Draw height', he: 'ציור גובה' },
  angle: { en: 'Show angle', he: 'הצגת זווית' },
  measurements: { en: 'Show measurements', he: 'הצגת מידות' },
}

interface ParallelogramProps {
  data: ParallelogramData
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
 * Parallelogram - SVG component for displaying parallelograms
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
export function Parallelogram({
  data,
  width = 350,
  height = 350,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: ParallelogramProps) {
  const {
    base,
    side,
    height: h,
    baseLabel = 'b',
    sideLabel = 'a',
    heightLabel = 'h',
    angle = 60, // Default angle
    showHeight = true,
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
      { id: 'parallelMarks', label: STEP_LABELS.parallelMarks.en, labelHe: STEP_LABELS.parallelMarks.he },
    ]
    if (hasHeight) {
      defs.push({ id: 'height', label: STEP_LABELS.height.en, labelHe: STEP_LABELS.height.he })
    }
    defs.push({ id: 'angle', label: STEP_LABELS.angle.en, labelHe: STEP_LABELS.angle.he })
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
  const calculations: ParallelogramCalculations = useMemo(() => {
    const area = base * h
    const perimeter = 2 * (base + side)

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מקבילית' : 'Area formula for a parallelogram',
        formula: 'A = base \\times height',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = ${base} \\times ${h}`,
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
        description: language === 'he' ? 'נוסחת היקף מקבילית' : 'Perimeter formula for a parallelogram',
        formula: 'P = 2(a + b)',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = 2(${side} + ${base})`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = 2 \\times ${side + base} = ${perimeter}`,
      },
    ]

    return {
      area,
      perimeter,
      steps: { area: areaSteps, perimeter: perimeterSteps },
    }
  }, [base, side, h, language])

  // SVG dimensions and scaling
  const padding = 50
  const plotWidth = width - padding * 2
  const plotHeight = height - 150

  // Calculate the slant offset based on angle
  const angleRad = (angle * Math.PI) / 180
  const slantOffset = h / Math.tan(angleRad)

  // Scale to fit
  const totalWidth = base + slantOffset
  const scaleX = plotWidth / totalWidth
  const scaleY = plotHeight / h
  const scale = Math.min(scaleX, scaleY, 25)

  const scaledBase = base * scale
  const scaledHeight = h * scale
  const scaledSlant = slantOffset * scale

  const startX = (width - scaledBase - scaledSlant) / 2 + scaledSlant
  const startY = padding + 30

  // Vertices (clockwise from top-left)
  const vertices = [
    { x: startX, y: startY, label: 'A' },
    { x: startX + scaledBase, y: startY, label: 'B' },
    { x: startX + scaledBase - scaledSlant, y: startY + scaledHeight, label: 'C' },
    { x: startX - scaledSlant, y: startY + scaledHeight, label: 'D' },
  ]

  const parallelogramPath = `M ${vertices[0].x} ${vertices[0].y}
                             L ${vertices[1].x} ${vertices[1].y}
                             L ${vertices[2].x} ${vertices[2].y}
                             L ${vertices[3].x} ${vertices[3].y} Z`

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="parallelogram-diagram"
      className={`geometry-parallelogram ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Parallelogram with base ${base} and height ${h}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="pg-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="pg-title"
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
              data-testid="pg-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Parallelogram fill */}
              <motion.path
                d={parallelogramPath}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Parallelogram outline — draws progressively */}
              <motion.path
                data-testid="pg-path"
                d={parallelogramPath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Vertices ─────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('vertices') && (
            <motion.g
              data-testid="pg-vertices"
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
                    data-testid={`pg-vertex-${v.label}`}
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

        {/* ── Step 2: Parallel Marks ───────────────────────────────── */}
        <AnimatePresence>
          {isVisible('parallelMarks') && (
            <motion.g
              data-testid="pg-parallel-marks"
              initial="hidden"
              animate={isCurrent('parallelMarks') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top and bottom (base) - single marks */}
              <motion.line
                x1={(vertices[0].x + vertices[1].x) / 2 - 5}
                y1={vertices[0].y - 3}
                x2={(vertices[0].x + vertices[1].x) / 2 + 5}
                y2={vertices[0].y - 3}
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0 }}
              />
              <motion.line
                x1={(vertices[3].x + vertices[2].x) / 2 - 5}
                y1={vertices[3].y + 3}
                x2={(vertices[3].x + vertices[2].x) / 2 + 5}
                y2={vertices[3].y + 3}
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              />

              {/* Left side marks - double marks */}
              <motion.line
                x1={(vertices[0].x + vertices[3].x) / 2 - 8}
                y1={(vertices[0].y + vertices[3].y) / 2 - 2}
                x2={(vertices[0].x + vertices[3].x) / 2 - 3}
                y2={(vertices[0].y + vertices[3].y) / 2 + 2}
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              />
              <motion.line
                x1={(vertices[0].x + vertices[3].x) / 2 - 5}
                y1={(vertices[0].y + vertices[3].y) / 2 - 2}
                x2={(vertices[0].x + vertices[3].x) / 2}
                y2={(vertices[0].y + vertices[3].y) / 2 + 2}
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              />

              {/* Right side marks - double marks */}
              <motion.line
                x1={(vertices[1].x + vertices[2].x) / 2 + 3}
                y1={(vertices[1].y + vertices[2].y) / 2 - 2}
                x2={(vertices[1].x + vertices[2].x) / 2 + 8}
                y2={(vertices[1].y + vertices[2].y) / 2 + 2}
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              />
              <motion.line
                x1={(vertices[1].x + vertices[2].x) / 2}
                y1={(vertices[1].y + vertices[2].y) / 2 - 2}
                x2={(vertices[1].x + vertices[2].x) / 2 + 5}
                y2={(vertices[1].y + vertices[2].y) / 2 + 2}
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Height Line ──────────────────────────────────── */}
        <AnimatePresence>
          {hasHeight && isVisible('height') && (
            <motion.g
              data-testid="pg-height"
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
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
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

        {/* ── Step 4: Angle Indicator ──────────────────────────────── */}
        <AnimatePresence>
          {isVisible('angle') && (
            <motion.g
              data-testid="pg-angle"
              initial="hidden"
              animate={isCurrent('angle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={`M ${vertices[3].x + 25} ${vertices[3].y}
                    A 25 25 0 0 0 ${vertices[3].x + 25 * Math.cos(angleRad)} ${vertices[3].y - 25 * Math.sin(angleRad)}`}
                fill="none"
                stroke={GEOMETRY_COLORS.label.angle}
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.text
                x={vertices[3].x + 35}
                y={vertices[3].y - 10}
                className="fill-gray-600 dark:fill-gray-400 text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.2 }}
              >
                {angle}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 5: Measurements ─────────────────────────────────── */}
        <AnimatePresence>
          {hasCalculations && isVisible('measurements') && (
            <motion.g
              data-testid="pg-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Base (top) */}
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
                {baseLabel} = {base}
              </motion.text>

              {/* Side (left) */}
              <motion.text
                x={(vertices[0].x + vertices[3].x) / 2 - 20}
                y={(vertices[0].y + vertices[3].y) / 2 - 15}
                textAnchor="middle"
                transform={`rotate(-${90 - angle}, ${(vertices[0].x + vertices[3].x) / 2 - 20}, ${(vertices[0].y + vertices[3].y) / 2 - 15})`}
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.1 }}
              >
                {sideLabel} = {side}
              </motion.text>

              {/* Formulas section */}
              {showFormulas && (
                <motion.g
                  transform={`translate(0, ${startY + scaledHeight + 40})`}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.2 }}
                >
                  <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
                    {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
                  </text>
                  <text x={10} y={18} className="fill-current text-xs">
                    {language === 'he' ? 'שטח' : 'Area'}: A = b × h = {base} × {h} = {calculations.area}
                  </text>
                  <text x={10} y={36} className="fill-current text-xs">
                    {language === 'he' ? 'היקף' : 'Perimeter'}: P = 2(a + b) = 2({side} + {base}) = {calculations.perimeter}
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
          </div>
        </div>
      )}
    </div>
  )
}

export default Parallelogram
