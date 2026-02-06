'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RhombusData, RhombusCalculations, SolutionStep } from '@/types/geometry'
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
  outline: { en: 'Draw the rhombus', he: 'ציור המעוין' },
  vertices: { en: 'Mark vertices', he: 'סימון קודקודים' },
  sideMarks: { en: 'Show equal sides', he: 'הצגת צלעות שוות' },
  diagonals: { en: 'Draw diagonals', he: 'ציור אלכסונים' },
  angles: { en: 'Show angles', he: 'הצגת זוויות' },
  measurements: { en: 'Show measurements', he: 'הצגת מידות' },
}

interface RhombusProps {
  data: RhombusData
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
 * Rhombus - SVG component for displaying rhombi (diamonds)
 * Shows area, perimeter, and diagonal-based calculations
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
export function Rhombus({
  data,
  width = 350,
  height = 350,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: RhombusProps) {
  const {
    side,
    diagonal1: d1,
    diagonal2: d2,
    sideLabel = 'a',
    d1Label = 'd₁',
    d2Label = 'd₂',
    showDiagonals = true,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  // Determine which step groups exist based on data
  const hasDiagonals = showDiagonals
  const hasCalculations = showCalculations || showFormulas

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'vertices', label: STEP_LABELS.vertices.en, labelHe: STEP_LABELS.vertices.he },
      { id: 'sideMarks', label: STEP_LABELS.sideMarks.en, labelHe: STEP_LABELS.sideMarks.he },
    ]
    if (hasDiagonals) {
      defs.push({ id: 'diagonals', label: STEP_LABELS.diagonals.en, labelHe: STEP_LABELS.diagonals.he })
    }
    defs.push({ id: 'angles', label: STEP_LABELS.angles.en, labelHe: STEP_LABELS.angles.he })
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
  const calculations: RhombusCalculations = useMemo(() => {
    // Area = (d1 × d2) / 2
    const area = (d1 * d2) / 2

    // Perimeter = 4 × side
    // If side not given, calculate from diagonals: side = √((d1/2)² + (d2/2)²)
    const calculatedSide = side > 0 ? side : Math.sqrt((d1 / 2) ** 2 + (d2 / 2) ** 2)
    const perimeter = 4 * calculatedSide

    // Angles (using diagonals)
    // Acute angle = 2 × arctan(d2 / d1)
    const acuteAngle = 2 * Math.atan(d2 / d1) * (180 / Math.PI)
    const obtuseAngle = 180 - acuteAngle

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מעוין (לפי אלכסונים)' : 'Area formula for a rhombus (using diagonals)',
        formula: 'A = \\frac{d_1 \\times d_2}{2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\frac{${d1} \\times ${d2}}{2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = \\frac{${d1 * d2}}{2} = ${area}`,
      },
    ]

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף מעוין' : 'Perimeter formula for a rhombus',
        formula: 'P = 4a',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = 4 \\times ${calculatedSide.toFixed(2)}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = ${perimeter.toFixed(2)}`,
      },
    ]

    const sideSteps: SolutionStep[] = side > 0 ? [] : [
      {
        stepNumber: 1,
        description: language === 'he' ? 'חישוב צלע מאלכסונים (משפט פיתגורס)' : 'Calculate side from diagonals (Pythagorean theorem)',
        formula: 'a = \\sqrt{(\\frac{d_1}{2})^2 + (\\frac{d_2}{2})^2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `a = \\sqrt{(\\frac{${d1}}{2})^2 + (\\frac{${d2}}{2})^2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `a = \\sqrt{${(d1 / 2) ** 2} + ${(d2 / 2) ** 2}} = ${calculatedSide.toFixed(2)}`,
      },
    ]

    return {
      area,
      perimeter,
      side: calculatedSide,
      angles: { acute: acuteAngle, obtuse: obtuseAngle },
      steps: { area: areaSteps, perimeter: perimeterSteps, side: sideSteps },
    }
  }, [d1, d2, side, language])

  // SVG dimensions and scaling
  const padding = 50
  const plotWidth = width - padding * 2
  const plotHeight = height - 140

  // Scale to fit
  const scaleX = plotWidth / d1
  const scaleY = plotHeight / d2
  const scale = Math.min(scaleX, scaleY, 25) * 0.8

  const scaledD1 = d1 * scale
  const scaledD2 = d2 * scale

  const cx = width / 2
  const cy = padding + 30 + scaledD2 / 2

  // Vertices (diamond shape: top, right, bottom, left)
  const vertices = [
    { x: cx, y: cy - scaledD2 / 2, label: 'A' }, // Top
    { x: cx + scaledD1 / 2, y: cy, label: 'B' }, // Right
    { x: cx, y: cy + scaledD2 / 2, label: 'C' }, // Bottom
    { x: cx - scaledD1 / 2, y: cy, label: 'D' }, // Left
  ]

  const rhombusPath = `M ${vertices[0].x} ${vertices[0].y}
                       L ${vertices[1].x} ${vertices[1].y}
                       L ${vertices[2].x} ${vertices[2].y}
                       L ${vertices[3].x} ${vertices[3].y} Z`

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="rhombus-diagram"
      className={`geometry-rhombus ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Rhombus with diagonals ${d1} and ${d2}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="rhombus-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="rhombus-title"
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
              data-testid="rhombus-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Rhombus fill */}
              <motion.path
                d={rhombusPath}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Rhombus outline — draws progressively */}
              <motion.path
                data-testid="rhombus-path"
                d={rhombusPath}
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
              data-testid="rhombus-vertices"
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
                    data-testid={`rhombus-vertex-${v.label}`}
                    cx={v.x}
                    cy={v.y}
                    r={diagram.lineWeight}
                    fill="currentColor"
                  />
                  <motion.text
                    x={v.x + (i === 1 ? 12 : i === 3 ? -12 : 0)}
                    y={v.y + (i === 0 ? -10 : i === 2 ? 15 : 0)}
                    textAnchor="middle"
                    dominantBaseline={i === 1 || i === 3 ? 'middle' : 'auto'}
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

        {/* ── Step 2: Equal Side Marks ─────────────────────────────── */}
        <AnimatePresence>
          {isVisible('sideMarks') && (
            <motion.g
              data-testid="rhombus-side-marks"
              initial="hidden"
              animate={isCurrent('sideMarks') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {[
                [vertices[0], vertices[1]],
                [vertices[1], vertices[2]],
                [vertices[2], vertices[3]],
                [vertices[3], vertices[0]],
              ].map(([v1, v2], i) => {
                const mx = (v1.x + v2.x) / 2
                const my = (v1.y + v2.y) / 2
                const dx = v2.x - v1.x
                const dy = v2.y - v1.y
                const len = Math.hypot(dx, dy)
                const perpX = (-dy / len) * 8
                const perpY = (dx / len) * 8
                return (
                  <motion.line
                    key={`mark-${i}`}
                    data-testid={`rhombus-side-mark-${i}`}
                    x1={mx - perpX * 0.3}
                    y1={my - perpY * 0.3}
                    x2={mx + perpX * 0.3}
                    y2={my + perpY * 0.3}
                    stroke="currentColor"
                    strokeWidth={diagram.lineWeight}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Diagonals ────────────────────────────────────── */}
        <AnimatePresence>
          {hasDiagonals && isVisible('diagonals') && (
            <motion.g
              data-testid="rhombus-diagonals"
              initial="hidden"
              animate={isCurrent('diagonals') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Horizontal diagonal (d1) */}
              <motion.line
                data-testid="rhombus-diagonal-d1"
                x1={vertices[3].x}
                y1={vertices[3].y}
                x2={vertices[1].x}
                y2={vertices[1].y}
                stroke={GEOMETRY_COLORS.auxiliary.diagonal}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="5,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Vertical diagonal (d2) */}
              <motion.line
                data-testid="rhombus-diagonal-d2"
                x1={vertices[0].x}
                y1={vertices[0].y}
                x2={vertices[2].x}
                y2={vertices[2].y}
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="5,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.3 }}
              />
              {/* Right angle marker at center */}
              <motion.path
                data-testid="rhombus-right-angle-marker"
                d={`M ${cx + 8} ${cy} L ${cx + 8} ${cy - 8} L ${cx} ${cy - 8}`}
                fill="none"
                stroke={GEOMETRY_COLORS.label.angle}
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              />
              {/* Center point */}
              <motion.circle
                data-testid="rhombus-center-point"
                cx={cx}
                cy={cy}
                r={diagram.lineWeight}
                fill="currentColor"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 }}
              />

              {/* Diagonal labels */}
              <motion.text
                x={cx + scaledD1 / 4 + 10}
                y={cy - 8}
                style={{ fill: GEOMETRY_COLORS.auxiliary.diagonal }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.4 }}
              >
                {d1Label} = {d1}
              </motion.text>
              <motion.text
                x={cx + 10}
                y={cy - scaledD2 / 4}
                style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.5 }}
              >
                {d2Label} = {d2}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Angles ───────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('angles') && (
            <motion.g
              data-testid="rhombus-angles"
              initial="hidden"
              animate={isCurrent('angles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Acute angle at left (D) */}
              <motion.text
                data-testid="rhombus-acute-angle"
                x={vertices[3].x + 20}
                y={vertices[3].y}
                dominantBaseline="middle"
                className="fill-gray-600 dark:fill-gray-400 text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {calculations.angles.acute.toFixed(1)}°
              </motion.text>
              {/* Obtuse angle at top (A) */}
              <motion.text
                data-testid="rhombus-obtuse-angle"
                x={vertices[0].x + 5}
                y={vertices[0].y + 20}
                className="fill-gray-600 dark:fill-gray-400 text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.1 }}
              >
                {calculations.angles.obtuse.toFixed(1)}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 5: Measurements ─────────────────────────────────── */}
        <AnimatePresence>
          {hasCalculations && isVisible('measurements') && (
            <motion.g
              data-testid="rhombus-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Side label */}
              <motion.text
                data-testid="rhombus-side-label"
                x={(vertices[0].x + vertices[1].x) / 2 + 15}
                y={(vertices[0].y + vertices[1].y) / 2 - 5}
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sideLabel} = {calculations.side.toFixed(2)}
              </motion.text>

              {/* Formulas section */}
              {showFormulas && (
                <motion.g
                  transform={`translate(0, ${cy + scaledD2 / 2 + 25})`}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.2 }}
                >
                  <text
                    data-testid="rhombus-formulas-header"
                    x={10}
                    y={0}
                    className="fill-gray-600 dark:fill-gray-400 text-xs font-medium"
                  >
                    {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
                  </text>
                  <text
                    data-testid="rhombus-area-formula"
                    x={10}
                    y={18}
                    className="fill-current text-xs"
                  >
                    {language === 'he' ? 'שטח' : 'Area'}: A = (d₁×d₂)/2 = ({d1}×{d2})/2 = {calculations.area}
                  </text>
                  <text
                    data-testid="rhombus-perimeter-formula"
                    x={10}
                    y={36}
                    className="fill-current text-xs"
                  >
                    {language === 'he' ? 'היקף' : 'Perimeter'}: P = 4a = 4×{calculations.side.toFixed(2)} = {calculations.perimeter.toFixed(2)}
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
            {/* Side calculation (if computed) */}
            {calculations.steps?.side && calculations.steps.side.length > 0 && (
              <div className="border-l-2 border-purple-500 pl-3">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  {language === 'he' ? 'חישוב צלע:' : 'Side calculation:'}
                </p>
                {calculations.steps.side.map((step) => (
                  <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                    {step.formula || step.substitution || step.result}
                  </p>
                ))}
              </div>
            )}

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
          </div>
        </div>
      )}
    </div>
  )
}

export default Rhombus
