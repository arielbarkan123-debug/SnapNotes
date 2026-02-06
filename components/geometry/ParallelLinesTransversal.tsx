'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ParallelLinesTransversalData } from '@/types/geometry'
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
  parallel: { en: 'Draw parallel lines', he: 'ציור קווים מקבילים' },
  transversal: { en: 'Draw transversal', he: 'ציור חותך' },
  intersections: { en: 'Label intersection points', he: 'סימון נקודות חיתוך' },
  anglePairs: { en: 'Highlight angle pairs', he: 'הדגשת זוגות זוויות' },
}

// Angle pair type labels
const PAIR_LABELS: Record<string, { en: string; he: string }> = {
  corresponding: { en: 'Corresponding', he: 'מתאימות' },
  alternate_interior: { en: 'Alternate Interior', he: 'מתחלפות פנימיות' },
  alternate_exterior: { en: 'Alternate Exterior', he: 'מתחלפות חיצוניות' },
  co_interior: { en: 'Co-Interior', he: 'חד-צדדיות פנימיות' },
}

interface ParallelLinesTransversalProps {
  data: ParallelLinesTransversalData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * ParallelLinesTransversal - Two parallel lines cut by a transversal
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
export function ParallelLinesTransversal({
  data,
  width = 400,
  height = 400,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: ParallelLinesTransversalProps) {
  const {
    line1Y: _line1Y,
    line2Y: _line2Y,
    transversalAngle,
    highlightAngles = [],
    showAngleMeasures = true,
    title,
  } = data

  const stepDefs = useMemo(() => [
    { id: 'parallel', label: STEP_LABELS.parallel.en, labelHe: STEP_LABELS.parallel.he },
    { id: 'transversal', label: STEP_LABELS.transversal.en, labelHe: STEP_LABELS.transversal.he },
    { id: 'intersections', label: STEP_LABELS.intersections.en, labelHe: STEP_LABELS.intersections.he },
    { id: 'anglePairs', label: STEP_LABELS.anglePairs.en, labelHe: STEP_LABELS.anglePairs.he },
  ], [])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
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

  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Layout
  const padding = 50
  const lineStartX = padding
  const lineEndX = width - padding
  const y1 = height * 0.35
  const y2 = height * 0.65

  // Transversal: a line at transversalAngle passing through both parallel lines
  const tanA = Math.tan((transversalAngle * Math.PI) / 180)
  // Intersection with line 1
  const ix1x = width / 2
  const ix1y = y1
  // Intersection with line 2
  const ix2x = width / 2 + (y2 - y1) / tanA
  const ix2y = y2

  // Transversal line extends beyond intersections
  const tExtend = 60
  const tDx = tExtend * Math.cos((transversalAngle * Math.PI) / 180)
  const tDy = tExtend * Math.sin((transversalAngle * Math.PI) / 180)
  const tStart = { x: ix1x - tDx, y: ix1y + tDy }
  const tEnd = { x: ix2x + tDx, y: ix2y - tDy }

  // Arrow marks for parallel lines
  const arrowMarkSize = 8

  // Angle arc helpers
  const arcR = 20
  const pointOnArc = (ox: number, oy: number, angleDeg: number, r: number) => ({
    x: ox + r * Math.cos((angleDeg * Math.PI) / 180),
    y: oy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  const makeArc = (ox: number, oy: number, startDeg: number, endDeg: number, r: number) => {
    const start = pointOnArc(ox, oy, startDeg, r)
    const end = pointOnArc(ox, oy, endDeg, r)
    const diff = Math.abs(endDeg - startDeg)
    const largeArc = diff > 180 ? 1 : 0
    const sweep = endDeg > startDeg ? 0 : 1
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
  }

  const highlightColors = [
    GEOMETRY_COLORS.highlight.primary,
    GEOMETRY_COLORS.highlight.secondary,
    GEOMETRY_COLORS.highlight.tertiary,
    diagram.colors.primary,
  ]

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="parallel-lines-transversal-diagram"
      className={`geometry-parallel-transversal ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={title || 'Parallel lines with transversal'}
      >
        {/* Background */}
        <rect
          data-testid="parallel-transversal-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="parallel-transversal-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: Parallel lines with arrows */}
        <AnimatePresence>
          {isVisible('parallel') && (
            <motion.g
              data-testid="parallel-lines"
              initial="hidden"
              animate={isCurrent('parallel') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Line 1 */}
              <motion.line
                x1={lineStartX}
                y1={y1}
                x2={lineEndX}
                y2={y1}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Line 2 */}
              <motion.line
                x1={lineStartX}
                y1={y2}
                x2={lineEndX}
                y2={y2}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.2 }}
              />

              {/* Arrow marks for parallel (>> on each line) */}
              {[y1, y2].map((y, li) => {
                const mx = lineStartX + (lineEndX - lineStartX) * 0.2
                return (
                  <motion.g
                    key={`arrow-marks-${li}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + li * 0.1 }}
                  >
                    <line
                      x1={mx - arrowMarkSize}
                      y1={y - arrowMarkSize / 2}
                      x2={mx}
                      y2={y}
                      stroke={diagram.colors.primary}
                      strokeWidth={2}
                    />
                    <line
                      x1={mx - arrowMarkSize}
                      y1={y + arrowMarkSize / 2}
                      x2={mx}
                      y2={y}
                      stroke={diagram.colors.primary}
                      strokeWidth={2}
                    />
                    <line
                      x1={mx - arrowMarkSize + 6}
                      y1={y - arrowMarkSize / 2}
                      x2={mx + 6}
                      y2={y}
                      stroke={diagram.colors.primary}
                      strokeWidth={2}
                    />
                    <line
                      x1={mx - arrowMarkSize + 6}
                      y1={y + arrowMarkSize / 2}
                      x2={mx + 6}
                      y2={y}
                      stroke={diagram.colors.primary}
                      strokeWidth={2}
                    />
                  </motion.g>
                )
              })}

              {/* Line labels */}
              <motion.text
                x={lineEndX + 10}
                y={y1 + 4}
                className="fill-current text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                l₁
              </motion.text>
              <motion.text
                x={lineEndX + 10}
                y={y2 + 4}
                className="fill-current text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.4 }}
              >
                l₂
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Transversal */}
        <AnimatePresence>
          {isVisible('transversal') && (
            <motion.g
              data-testid="parallel-transversal-line"
              initial="hidden"
              animate={isCurrent('transversal') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={tStart.x}
                y1={tStart.y}
                x2={tEnd.x}
                y2={tEnd.y}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={tEnd.x + 8}
                y={tEnd.y - 8}
                className="fill-current text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                t
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Intersection points */}
        <AnimatePresence>
          {isVisible('intersections') && (
            <motion.g
              data-testid="parallel-intersections"
              initial="hidden"
              animate={isCurrent('intersections') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {[
                { x: ix1x, y: ix1y, label: 'P' },
                { x: ix2x, y: ix2y, label: 'Q' },
              ].map((pt, i) => (
                <motion.g
                  key={`intersection-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.15 }}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={diagram.lineWeight + 1}
                    fill="currentColor"
                  />
                  <text
                    x={pt.x + 10}
                    y={pt.y - 10}
                    className="fill-current text-xs font-bold"
                  >
                    {pt.label}
                  </text>
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Highlight angle pairs */}
        <AnimatePresence>
          {isVisible('anglePairs') && (
            <motion.g
              data-testid="parallel-angle-pairs"
              initial="hidden"
              animate={isCurrent('anglePairs') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {highlightAngles.map((anglePair, i) => {
                const color = highlightColors[i % highlightColors.length]
                const pairLabel = PAIR_LABELS[anglePair.type]
                const pLabel = language === 'he' ? pairLabel?.he : pairLabel?.en

                // Simple display: show arc at intersection points
                // Use transversal angle to determine angle positions
                const ta = transversalAngle
                let arcStart1 = 0
                let arcEnd1 = ta
                let arcStart2 = 0
                let arcEnd2 = ta

                if (anglePair.type === 'corresponding') {
                  arcStart1 = 0
                  arcEnd1 = ta
                  arcStart2 = 0
                  arcEnd2 = ta
                } else if (anglePair.type === 'alternate_interior') {
                  arcStart1 = 180
                  arcEnd1 = 180 + ta
                  arcStart2 = 0
                  arcEnd2 = ta
                } else if (anglePair.type === 'alternate_exterior') {
                  arcStart1 = 0
                  arcEnd1 = ta
                  arcStart2 = 180
                  arcEnd2 = 180 + ta
                } else if (anglePair.type === 'co_interior') {
                  arcStart1 = 180
                  arcEnd1 = 180 + ta
                  arcStart2 = ta
                  arcEnd2 = 180
                }

                return (
                  <motion.g
                    key={`pair-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.3 }}
                  >
                    {/* Arc at intersection 1 */}
                    <motion.path
                      d={makeArc(ix1x, ix1y, arcStart1, arcEnd1, arcR)}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    {showAngleMeasures && (
                      <text
                        x={pointOnArc(ix1x, ix1y, (arcStart1 + arcEnd1) / 2, arcR + 12).x}
                        y={pointOnArc(ix1x, ix1y, (arcStart1 + arcEnd1) / 2, arcR + 12).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fill: color }}
                        className="text-[9px] font-bold"
                      >
                        {Math.abs(arcEnd1 - arcStart1)}°
                      </text>
                    )}

                    {/* Arc at intersection 2 */}
                    <motion.path
                      d={makeArc(ix2x, ix2y, arcStart2, arcEnd2, arcR)}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                      transition={{ delay: 0.15 }}
                    />
                    {showAngleMeasures && (
                      <text
                        x={pointOnArc(ix2x, ix2y, (arcStart2 + arcEnd2) / 2, arcR + 12).x}
                        y={pointOnArc(ix2x, ix2y, (arcStart2 + arcEnd2) / 2, arcR + 12).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fill: color }}
                        className="text-[9px] font-bold"
                      >
                        {Math.abs(arcEnd2 - arcStart2)}°
                      </text>
                    )}

                    {/* Pair type label */}
                    <motion.text
                      x={width / 2}
                      y={height - 30 - i * 18}
                      textAnchor="middle"
                      style={{ fill: color }}
                      className="text-xs font-medium"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: 0.3 }}
                    >
                      {pLabel}
                    </motion.text>
                  </motion.g>
                )
              })}
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
    </div>
  )
}

export default ParallelLinesTransversal
