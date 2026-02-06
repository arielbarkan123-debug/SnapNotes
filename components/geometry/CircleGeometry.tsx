'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CircleGeometryData, CircleCalculations, SolutionStep } from '@/types/geometry'
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
  outline: { en: 'Draw the circle', he: 'ציור המעגל' },
  center: { en: 'Mark center point', he: 'סימון מרכז' },
  radius: { en: 'Show radius', he: 'הצגת רדיוס' },
  diameter: { en: 'Show diameter', he: 'הצגת קוטר' },
  sector: { en: 'Show sector', he: 'הצגת גזרה' },
  arc: { en: 'Show arc', he: 'הצגת קשת' },
  chord: { en: 'Show chord', he: 'הצגת מיתר' },
  measurements: { en: 'Show measurements', he: 'הצגת מידות' },
}

interface CircleGeometryProps {
  data: CircleGeometryData
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
 * CircleGeometry - SVG component for displaying circles with all features
 * Supports: area, circumference, sectors, arcs, chords with step-by-step solutions
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
export function CircleGeometry({
  data,
  width = 350,
  height = 400,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: CircleGeometryProps) {
  const {
    radius,
    radiusLabel = 'r',
    center: _center = { x: 0, y: 0 },
    showRadius = true,
    showDiameter = false,
    diameterLabel = 'd',
    sector,
    arc,
    chord,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  // Determine which step groups exist based on data
  const hasSector = !!sector
  const hasArc = !!arc && !sector // Arc only shows if no sector
  const hasChord = !!chord
  const hasCalculations = showCalculations || showFormulas

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'center', label: STEP_LABELS.center.en, labelHe: STEP_LABELS.center.he },
    ]
    if (showRadius) {
      defs.push({ id: 'radius', label: STEP_LABELS.radius.en, labelHe: STEP_LABELS.radius.he })
    }
    if (showDiameter) {
      defs.push({ id: 'diameter', label: STEP_LABELS.diameter.en, labelHe: STEP_LABELS.diameter.he })
    }
    if (hasSector) {
      defs.push({ id: 'sector', label: STEP_LABELS.sector.en, labelHe: STEP_LABELS.sector.he })
    }
    if (hasArc) {
      defs.push({ id: 'arc', label: STEP_LABELS.arc.en, labelHe: STEP_LABELS.arc.he })
    }
    if (hasChord) {
      defs.push({ id: 'chord', label: STEP_LABELS.chord.en, labelHe: STEP_LABELS.chord.he })
    }
    if (hasCalculations) {
      defs.push({ id: 'measurements', label: STEP_LABELS.measurements.en, labelHe: STEP_LABELS.measurements.he })
    }
    return defs
  }, [showRadius, showDiameter, hasSector, hasArc, hasChord, hasCalculations])

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
  const calculations: CircleCalculations = useMemo(() => {
    const diameter = 2 * radius
    const circumference = 2 * Math.PI * radius
    const area = Math.PI * radius * radius

    let sectorArea: number | undefined
    let arcLength: number | undefined
    let chordLength: number | undefined

    // Sector calculations
    if (sector) {
      const angleDiff = Math.abs(sector.endAngle - sector.startAngle)
      const angleRad = (angleDiff * Math.PI) / 180
      sectorArea = 0.5 * radius * radius * angleRad
      arcLength = radius * angleRad
    }

    // Arc calculations (if no sector but arc is defined)
    if (arc && !sector) {
      const angleDiff = Math.abs(arc.endAngle - arc.startAngle)
      const angleRad = (angleDiff * Math.PI) / 180
      arcLength = radius * angleRad
    }

    // Chord calculations
    if (chord) {
      const angleDiff = Math.abs(chord.endAngle - chord.startAngle)
      const angleRad = (angleDiff * Math.PI) / 180
      chordLength = 2 * radius * Math.sin(angleRad / 2)
    }

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מעגל' : 'Area formula for a circle',
        formula: 'A = \\pi r^2',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\pi \\times ${radius}^2`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = \\pi \\times ${radius * radius} \\approx ${area.toFixed(2)}`,
      },
    ]

    const circumferenceSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף מעגל' : 'Circumference formula',
        formula: 'C = 2\\pi r',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `C = 2 \\times \\pi \\times ${radius}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `C \\approx ${circumference.toFixed(2)}`,
      },
    ]

    const sectorSteps: SolutionStep[] | undefined = sector
      ? [
          {
            stepNumber: 1,
            description: language === 'he' ? 'נוסחת שטח גזרה' : 'Sector area formula',
            formula: 'A_{sector} = \\frac{\\theta}{360} \\times \\pi r^2',
          },
          {
            stepNumber: 2,
            description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
            substitution: `A_{sector} = \\frac{${Math.abs(sector.endAngle - sector.startAngle)}}{360} \\times \\pi \\times ${radius}^2`,
          },
          {
            stepNumber: 3,
            description: language === 'he' ? 'חישוב' : 'Calculate',
            result: `A_{sector} \\approx ${sectorArea?.toFixed(2)}`,
          },
        ]
      : undefined

    const arcSteps: SolutionStep[] | undefined = arc || sector
      ? [
          {
            stepNumber: 1,
            description: language === 'he' ? 'נוסחת אורך קשת' : 'Arc length formula',
            formula: 'L = \\frac{\\theta}{360} \\times 2\\pi r',
          },
          {
            stepNumber: 2,
            description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
            substitution: `L = \\frac{${Math.abs((arc || sector)!.endAngle - (arc || sector)!.startAngle)}}{360} \\times 2\\pi \\times ${radius}`,
          },
          {
            stepNumber: 3,
            description: language === 'he' ? 'חישוב' : 'Calculate',
            result: `L \\approx ${arcLength?.toFixed(2)}`,
          },
        ]
      : undefined

    return {
      area,
      circumference,
      diameter,
      sectorArea,
      arcLength,
      chordLength,
      steps: {
        area: areaSteps,
        circumference: circumferenceSteps,
        sector: sectorSteps,
        arc: arcSteps,
      },
    }
  }, [radius, sector, arc, chord, language])

  // SVG dimensions
  const padding = 60
  const diagramSize = Math.min(width, height - 120) - padding * 2
  const scaledRadius = diagramSize / 2.5 // Leave room for labels
  const cx = width / 2
  const cy = padding + 30 + scaledRadius

  // Point on circle from angle (degrees)
  const pointOnCircle = (angleDeg: number, r: number = scaledRadius) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  // Arc path
  const arcPath = (startDeg: number, endDeg: number, r: number = scaledRadius) => {
    const start = pointOnCircle(startDeg, r)
    const end = pointOnCircle(endDeg, r)
    const angleDiff = endDeg - startDeg
    const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0
    const sweep = angleDiff > 0 ? 0 : 1
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
  }

  // Sector path (pie slice)
  const sectorPath = (startDeg: number, endDeg: number) => {
    const start = pointOnCircle(startDeg)
    const end = pointOnCircle(endDeg)
    const angleDiff = endDeg - startDeg
    const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0
    const sweep = angleDiff > 0 ? 0 : 1
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${scaledRadius} ${scaledRadius} 0 ${largeArc} ${sweep} ${end.x} ${end.y} Z`
  }

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="circle-diagram"
      className={`geometry-circle ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Circle with radius ${radius}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="circle-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="circle-title"
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
              data-testid="circle-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Circle fill */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={scaledRadius}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Circle outline — draws progressively */}
              <motion.circle
                data-testid="circle-path"
                cx={cx}
                cy={cy}
                r={scaledRadius}
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

        {/* ── Step 1: Center Point ─────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('center') && (
            <motion.g
              data-testid="circle-center"
              initial="hidden"
              animate={isCurrent('center') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={cx}
                cy={cy}
                r={diagram.lineWeight}
                fill="currentColor"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
              />
              <motion.text
                x={cx - 15}
                y={cy + 18}
                className="fill-current text-sm font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.2 }}
              >
                O
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Radius Line ──────────────────────────────────── */}
        <AnimatePresence>
          {showRadius && isVisible('radius') && (
            <motion.g
              data-testid="circle-radius"
              initial="hidden"
              animate={isCurrent('radius') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={cx}
                y1={cy}
                x2={cx + scaledRadius}
                y2={cy}
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={cx + scaledRadius / 2}
                y={cy - 8}
                textAnchor="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.primary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                {radiusLabel} = {radius}
              </motion.text>
              {/* Endpoint */}
              <motion.circle
                data-testid="circle-radius-endpoint"
                cx={cx + scaledRadius}
                cy={cy}
                r={diagram.lineWeight}
                fill={GEOMETRY_COLORS.highlight.primary}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: 0.4,
                }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Diameter Line ────────────────────────────────── */}
        <AnimatePresence>
          {showDiameter && isVisible('diameter') && (
            <motion.g
              data-testid="circle-diameter"
              initial="hidden"
              animate={isCurrent('diameter') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={cx - scaledRadius}
                y1={cy}
                x2={cx + scaledRadius}
                y2={cy}
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={cx}
                y={cy + 20}
                textAnchor="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                className="text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                {diameterLabel} = {calculations.diameter}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Sector ────────────────────────────────────────── */}
        <AnimatePresence>
          {hasSector && isVisible('sector') && (
            <motion.g
              data-testid="circle-sector"
              initial="hidden"
              animate={isCurrent('sector') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Sector fill */}
              <motion.path
                d={sectorPath(sector!.startAngle, sector!.endAngle)}
                fill={GEOMETRY_COLORS.highlight.tertiary}
                fillOpacity={0.45}
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={diagram.lineWeight}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />

              {/* Radii to sector endpoints */}
              <motion.line
                x1={cx}
                y1={cy}
                x2={pointOnCircle(sector!.startAngle).x}
                y2={pointOnCircle(sector!.startAngle).y}
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.line
                x1={cx}
                y1={cy}
                x2={pointOnCircle(sector!.endAngle).x}
                y2={pointOnCircle(sector!.endAngle).y}
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.2 }}
              />

              {/* Central angle arc */}
              <motion.path
                d={arcPath(sector!.startAngle, sector!.endAngle, 25)}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.4 }}
              />

              {/* Angle label */}
              {sector!.label && (
                <motion.text
                  {...pointOnCircle((sector!.startAngle + sector!.endAngle) / 2, 40)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
                  className="text-xs font-medium"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.5 }}
                >
                  {sector!.label}
                </motion.text>
              )}

              {/* Arc label on circumference */}
              {sector!.showArc && (
                <motion.text
                  {...pointOnCircle((sector!.startAngle + sector!.endAngle) / 2, scaledRadius + 15)}
                  textAnchor="middle"
                  style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
                  className="text-xs"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.6 }}
                >
                  arc
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 5: Arc (only if no sector) ──────────────────────── */}
        <AnimatePresence>
          {hasArc && isVisible('arc') && (
            <motion.g
              data-testid="circle-arc"
              initial="hidden"
              animate={isCurrent('arc') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={arcPath(arc!.startAngle, arc!.endAngle)}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={4}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Arc endpoints */}
              <motion.circle
                {...pointOnCircle(arc!.startAngle)}
                r={diagram.lineWeight}
                fill={GEOMETRY_COLORS.highlight.tertiary}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
              />
              <motion.circle
                {...pointOnCircle(arc!.endAngle)}
                r={diagram.lineWeight}
                fill={GEOMETRY_COLORS.highlight.tertiary}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
              />
              {arc!.label && (
                <motion.text
                  {...pointOnCircle((arc!.startAngle + arc!.endAngle) / 2, scaledRadius + 15)}
                  textAnchor="middle"
                  style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
                  className="text-xs"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.5 }}
                >
                  {arc!.label}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 6: Chord ─────────────────────────────────────────── */}
        <AnimatePresence>
          {hasChord && isVisible('chord') && (
            <motion.g
              data-testid="circle-chord"
              initial="hidden"
              animate={isCurrent('chord') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={pointOnCircle(chord!.startAngle).x}
                y1={pointOnCircle(chord!.startAngle).y}
                x2={pointOnCircle(chord!.endAngle).x}
                y2={pointOnCircle(chord!.endAngle).y}
                stroke={GEOMETRY_COLORS.auxiliary.diagonal}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Chord endpoints */}
              <motion.circle
                {...pointOnCircle(chord!.startAngle)}
                r={diagram.lineWeight}
                fill={GEOMETRY_COLORS.auxiliary.diagonal}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
              />
              <motion.circle
                {...pointOnCircle(chord!.endAngle)}
                r={diagram.lineWeight}
                fill={GEOMETRY_COLORS.auxiliary.diagonal}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
              />
              {/* Chord label */}
              {chord!.label && (
                <motion.text
                  x={(pointOnCircle(chord!.startAngle).x + pointOnCircle(chord!.endAngle).x) / 2}
                  y={(pointOnCircle(chord!.startAngle).y + pointOnCircle(chord!.endAngle).y) / 2 - 10}
                  textAnchor="middle"
                  style={{ fill: GEOMETRY_COLORS.auxiliary.diagonal }}
                  className="text-xs"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.5 }}
                >
                  {chord!.label} ≈ {calculations.chordLength?.toFixed(2)}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 7: Measurements / Formulas ──────────────────────── */}
        <AnimatePresence>
          {hasCalculations && isVisible('measurements') && (
            <motion.g
              data-testid="circle-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {showFormulas && (
                <motion.g
                  transform={`translate(0, ${cy + scaledRadius + 25})`}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
                    {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
                  </text>
                  <motion.text
                    x={10}
                    y={18}
                    className="fill-current text-xs"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {language === 'he' ? 'שטח' : 'Area'}: A = πr² = π×{radius}² ≈ {calculations.area.toFixed(2)}
                  </motion.text>
                  <motion.text
                    x={10}
                    y={36}
                    className="fill-current text-xs"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {language === 'he' ? 'היקף' : 'Circumference'}: C = 2πr = 2π×{radius} ≈ {calculations.circumference.toFixed(2)}
                  </motion.text>
                  {sector && calculations.sectorArea && (
                    <motion.text
                      x={10}
                      y={54}
                      className="fill-current text-xs"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {language === 'he' ? 'שטח גזרה' : 'Sector Area'}: ≈ {calculations.sectorArea.toFixed(2)}
                    </motion.text>
                  )}
                  {calculations.arcLength && (
                    <motion.text
                      x={10}
                      y={sector ? 72 : 54}
                      className="fill-current text-xs"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {language === 'he' ? 'אורך קשת' : 'Arc Length'}: ≈ {calculations.arcLength.toFixed(2)}
                    </motion.text>
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
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-60 overflow-y-auto">
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
                <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{step.stepNumber}. </span>
                  {step.formula && <span className="font-mono">{step.formula}</span>}
                  {step.substitution && <span className="font-mono"> → {step.substitution}</span>}
                  {step.result && <span className="font-mono text-green-600"> = {step.result}</span>}
                </div>
              ))}
            </div>

            {/* Circumference calculation */}
            <div className="border-l-2 border-green-500 pl-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {language === 'he' ? 'היקף:' : 'Circumference:'}
              </p>
              {calculations.steps?.circumference.map((step) => (
                <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{step.stepNumber}. </span>
                  {step.formula && <span className="font-mono">{step.formula}</span>}
                  {step.substitution && <span className="font-mono"> → {step.substitution}</span>}
                  {step.result && <span className="font-mono text-green-600"> = {step.result}</span>}
                </div>
              ))}
            </div>

            {/* Sector area calculation */}
            {sector && calculations.steps?.sector && (
              <div className="border-l-2 border-amber-500 pl-3">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {language === 'he' ? 'שטח גזרה:' : 'Sector Area:'}
                </p>
                {calculations.steps.sector.map((step) => (
                  <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">{step.stepNumber}. </span>
                    {step.formula && <span className="font-mono">{step.formula}</span>}
                    {step.substitution && <span className="font-mono"> → {step.substitution}</span>}
                    {step.result && <span className="font-mono text-green-600"> = {step.result}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CircleGeometry
