'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VerticalAnglesData } from '@/types/math'
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

interface VerticalAnglesProps {
  data: VerticalAnglesData
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
  drawLines: { en: 'Draw intersecting lines', he: 'ציור קווים מצטלבים' },
  showAngles: { en: 'Show angles', he: 'הצגת זוויות' },
  showCongruence: { en: 'Show congruence', he: 'הצגת חפיפה' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180

/** Create an SVG arc path for an angle at a vertex */
function angleArcPath(
  cx: number,
  cy: number,
  startAngle: number,
  endAngle: number,
  radius: number
): string {
  // Ensure we always draw the shorter arc in the correct direction
  let sa = startAngle
  let ea = endAngle
  // Normalize the arc to go from sa to ea counter-clockwise (positive direction)
  let diff = ea - sa
  if (diff < 0) diff += 360
  if (diff > 180) {
    // Swap to get short arc
    const tmp = sa
    sa = ea
    ea = tmp
    diff = 360 - diff
  }
  const largeArc = diff > 180 ? 1 : 0
  const x1 = cx + radius * Math.cos(sa * DEG)
  const y1 = cy - radius * Math.sin(sa * DEG)
  const x2 = cx + radius * Math.cos(ea * DEG)
  const y2 = cy - radius * Math.sin(ea * DEG)
  return 'M ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 0 ' + x2 + ' ' + y2
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VerticalAngles({
  data,
  className = '',
  width = 480,
  height = 380,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: VerticalAnglesProps) {
  const {
    angle1,
    angle2,
    intersection: customIntersection,
    showCongruenceMarks = true,
    title,
  } = data

  // Intersection point (center of diagram)
  const ix = customIntersection?.x ?? width / 2
  const iy = customIntersection?.y ?? height / 2

  // Line half-length (how far each line extends from intersection)
  const lineHalfLen = Math.min(width, height) * 0.4

  // Line 1: horizontal-ish, tilted by half of angle1 above horizontal
  // Line 2: tilted by angle1 from line 1
  // The two lines create 4 angles: angle1, angle2, angle1, angle2
  // where angle1 + angle2 = 180 (supplementary)
  //
  // We place line1 along direction angle1/2 from horizontal (and its opposite)
  // and line2 along direction angle1/2 + angle1 (= angle1 * 1.5 from horizontal)
  // This way angle1 is between the two lines on one side, angle2 on the other.

  // Direction angles for the 4 rays (in degrees, measured from positive x-axis)
  // Line 1 rays
  const dir1a = 0 // first ray of line 1 (pointing right)
  const dir1b = 180 // opposite ray of line 1 (pointing left)
  // Line 2 rays — rotated by angle1 from line 1
  const dir2a = angle1 // first ray of line 2
  const dir2b = angle1 + 180 // opposite ray of line 2

  // Compute line endpoints
  const endPoint = (angleDeg: number) => ({
    x: ix + lineHalfLen * Math.cos(angleDeg * DEG),
    y: iy - lineHalfLen * Math.sin(angleDeg * DEG),
  })

  const line1Start = endPoint(dir1a)
  const line1End = endPoint(dir1b)
  const line2Start = endPoint(dir2a)
  const line2End = endPoint(dir2b)

  // Four angles formed:
  // Angle A (between dir1a and dir2a): angle1 — primary pair
  // Angle B (between dir2a and dir1b): angle2 — accent pair
  // Angle C (between dir1b and dir2b): angle1 — primary pair (vertical to A)
  // Angle D (between dir2b and dir1a+360): angle2 — accent pair (vertical to B)
  const arcRadius = lineHalfLen * 0.2
  const arcRadiusOuter = lineHalfLen * 0.28

  const angles = useMemo(() => [
    { start: dir1a, end: dir2a, value: angle1, color: 'primary', label: angle1 + '\u00B0' },
    { start: dir2a, end: dir1b, value: angle2, color: 'accent', label: angle2 + '\u00B0' },
    { start: dir1b, end: dir2b, value: angle1, color: 'primary', label: angle1 + '\u00B0' },
    { start: dir2b, end: dir1a + 360, value: angle2, color: 'accent', label: angle2 + '\u00B0' },
  ], [dir1a, dir2a, dir1b, dir2b, angle1, angle2])

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawLines', label: STEP_LABELS.drawLines.en, labelHe: STEP_LABELS.drawLines.he },
      { id: 'showAngles', label: STEP_LABELS.showAngles.en, labelHe: STEP_LABELS.showAngles.he },
    ]
    if (showCongruenceMarks) {
      defs.push({ id: 'showCongruence', label: STEP_LABELS.showCongruence.en, labelHe: STEP_LABELS.showCongruence.he })
    }
    return defs
  }, [showCongruenceMarks])

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

  const viewBox = '0 0 ' + width + ' ' + height

  // Congruence tick marks: small perpendicular ticks on arcs
  // For primary pair (angles 0 and 2): single tick
  // For accent pair (angles 1 and 3): double tick
  const congruenceTicks = useMemo(() => {
    if (!showCongruenceMarks) return []

    const ticks: Array<{
      angleIdx: number
      midAngle: number
      tickCount: number
      color: string
    }> = []

    angles.forEach((a, i) => {
      const midDeg = (a.start + a.end) / 2
      ticks.push({
        angleIdx: i,
        midAngle: midDeg,
        tickCount: a.color === 'primary' ? 1 : 2,
        color: a.color === 'primary' ? primaryColor : accentColor,
      })
    })

    return ticks
  }, [showCongruenceMarks, angles, primaryColor, accentColor])

  return (
    <div
      data-testid="vertical-angles"
      className={'bg-white dark:bg-gray-900 rounded-lg p-4 ' + className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="va-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="va-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw two intersecting lines */}
        <AnimatePresence>
          {isVisible('drawLines') && (
            <motion.g
              data-testid="va-draw-lines"
              initial="hidden"
              animate={isCurrent('drawLines') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Intersection point dot */}
              <motion.circle
                cx={ix}
                cy={iy}
                r={diagram.lineWeight + 1}
                className="fill-gray-700 dark:fill-gray-300"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />

              {/* Line 1 */}
              <motion.line
                x1={line1Start.x}
                y1={line1Start.y}
                x2={line1End.x}
                y2={line1End.y}
                stroke="#374151"
                className="dark:stroke-gray-300"
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Line 2 */}
              <motion.line
                x1={line2Start.x}
                y1={line2Start.y}
                x2={line2End.x}
                y2={line2End.y}
                stroke="#374151"
                className="dark:stroke-gray-300"
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Show all 4 angles with arcs and labels */}
        <AnimatePresence>
          {isVisible('showAngles') && (
            <motion.g
              data-testid="va-show-angles"
              initial="hidden"
              animate={isCurrent('showAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {angles.map((a, i) => {
                const color = a.color === 'primary' ? primaryColor : accentColor
                const radius = a.color === 'primary' ? arcRadius : arcRadiusOuter
                const midDeg = (a.start + a.end) / 2
                const labelDist = radius + 16
                return (
                  <motion.g key={'angle-' + i}>
                    {/* Angle arc */}
                    <motion.path
                      d={angleArcPath(ix, iy, a.start, a.end, radius)}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />

                    {/* Angle degree label */}
                    <motion.text
                      x={ix + labelDist * Math.cos(midDeg * DEG)}
                      y={iy - labelDist * Math.sin(midDeg * DEG)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={600}
                      fill={color}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {a.label}
                    </motion.text>
                  </motion.g>
                )
              })}

              {/* Vertical angles relationship text */}
              <motion.text
                x={width / 2}
                y={height - 40}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                className="fill-gray-500 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'זוויות קודקודיות' : 'Vertical Angles'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show congruence marks (conditional on showCongruenceMarks) */}
        <AnimatePresence>
          {showCongruenceMarks && isVisible('showCongruence') && (
            <motion.g
              data-testid="va-show-congruence"
              initial="hidden"
              animate={isCurrent('showCongruence') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Congruence tick marks on arcs */}
              {congruenceTicks.map((tick, i) => {
                const radius = angles[tick.angleIdx].color === 'primary' ? arcRadius : arcRadiusOuter
                const midRad = tick.midAngle * DEG
                const tickLen = 5
                // Perpendicular direction to the arc at midpoint
                const perpX = -Math.sin(midRad) // actually: we want perpendicular to radius
                const perpY = -Math.cos(midRad)
                const cx = ix + radius * Math.cos(midRad)
                const cy = iy - radius * Math.sin(midRad)

                if (tick.tickCount === 1) {
                  // Single tick
                  return (
                    <motion.line
                      key={'tick-' + i}
                      x1={cx - tickLen * perpX}
                      y1={cy - tickLen * perpY}
                      x2={cx + tickLen * perpX}
                      y2={cy + tickLen * perpY}
                      stroke={tick.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.1 }}
                    />
                  )
                } else {
                  // Double tick: two parallel ticks offset along the arc
                  const offset = 3
                  const tangentX = Math.cos(midRad)
                  const tangentY = -Math.sin(midRad)
                  return (
                    <motion.g
                      key={'tick-' + i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.1 }}
                    >
                      <line
                        x1={cx - tickLen * perpX - offset * tangentX}
                        y1={cy - tickLen * perpY - offset * tangentY}
                        x2={cx + tickLen * perpX - offset * tangentX}
                        y2={cy + tickLen * perpY - offset * tangentY}
                        stroke={tick.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                      <line
                        x1={cx - tickLen * perpX + offset * tangentX}
                        y1={cy - tickLen * perpY + offset * tangentY}
                        x2={cx + tickLen * perpX + offset * tangentX}
                        y2={cy + tickLen * perpY + offset * tangentY}
                        stroke={tick.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </motion.g>
                  )
                }
              })}

              {/* Congruence equation */}
              <motion.text
                x={width / 2}
                y={height - 18}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? '\u2220A = \u2220C = ' + angle1 + '\u00B0  ,  \u2220B = \u2220D = ' + angle2 + '\u00B0'
                  : '\u2220A = \u2220C = ' + angle1 + '\u00B0  ,  \u2220B = \u2220D = ' + angle2 + '\u00B0'}
              </motion.text>

              {/* Explanation */}
              <motion.text
                x={width / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize={11}
                className="fill-gray-500 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? 'זוויות קודקודיות שוות זו לזו'
                  : 'Vertical angles are congruent'}
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

export default VerticalAngles
