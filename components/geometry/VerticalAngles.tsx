'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VerticalAnglesData } from '@/types/geometry'
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
  line1: { en: 'Draw first line', he: 'ציור קו ראשון' },
  line2: { en: 'Draw second line', he: 'ציור קו שני' },
  pair1: { en: 'Highlight first pair', he: 'הדגשת זוג ראשון' },
  pair2: { en: 'Highlight second pair', he: 'הדגשת זוג שני' },
  equality: { en: 'Show equality', he: 'הצגת שוויון' },
}

interface VerticalAnglesProps {
  data: VerticalAnglesData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * VerticalAngles - Two intersecting lines forming vertical angle pairs
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
export function VerticalAngles({
  data,
  width = 400,
  height = 380,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: VerticalAnglesProps) {
  const {
    angle1,
    angle2,
    showCongruenceMarks = true,
    title,
  } = data

  // angle2 = 180 - angle1 (supplementary on a line)
  const supplementary = 180 - angle1

  const stepDefs = useMemo(() => [
    { id: 'line1', label: STEP_LABELS.line1.en, labelHe: STEP_LABELS.line1.he },
    { id: 'line2', label: STEP_LABELS.line2.en, labelHe: STEP_LABELS.line2.he },
    { id: 'pair1', label: STEP_LABELS.pair1.en, labelHe: STEP_LABELS.pair1.he },
    { id: 'pair2', label: STEP_LABELS.pair2.en, labelHe: STEP_LABELS.pair2.he },
    { id: 'equality', label: STEP_LABELS.equality.en, labelHe: STEP_LABELS.equality.he },
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

  // Intersection at center
  const cx = width / 2
  const cy = height * 0.45
  const lineLen = Math.min(width * 0.4, 140)

  // Line 1: horizontal
  const l1Start = { x: cx - lineLen, y: cy }
  const l1End = { x: cx + lineLen, y: cy }

  // Line 2: at angle1 from horizontal
  const halfAngleRad = (angle1 * Math.PI) / 180
  const l2Start = { x: cx - lineLen * Math.cos(halfAngleRad), y: cy + lineLen * Math.sin(halfAngleRad) }
  const l2End = { x: cx + lineLen * Math.cos(halfAngleRad), y: cy - lineLen * Math.sin(halfAngleRad) }

  // Arc helpers
  const arcRadius = 25
  const arcRadius2 = 32

  const pointOnArc = (angleDeg: number, r: number) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  const makeArc = (startDeg: number, endDeg: number, r: number) => {
    const start = pointOnArc(startDeg, r)
    const end = pointOnArc(endDeg, r)
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  // Color coding for pairs
  const pair1Color = GEOMETRY_COLORS.highlight.primary // red
  const pair2Color = GEOMETRY_COLORS.highlight.secondary // green

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="vertical-angles-diagram"
      className={`geometry-vertical-angles ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={title || 'Vertical angles diagram'}
      >
        {/* Background */}
        <rect
          data-testid="vertical-angles-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="vertical-angles-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: First line (horizontal) */}
        <AnimatePresence>
          {isVisible('line1') && (
            <motion.g
              data-testid="vertical-angles-line1"
              initial="hidden"
              animate={isCurrent('line1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={l1Start.x}
                y1={l1Start.y}
                x2={l1End.x}
                y2={l1End.y}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Second line through intersection */}
        <AnimatePresence>
          {isVisible('line2') && (
            <motion.g
              data-testid="vertical-angles-line2"
              initial="hidden"
              animate={isCurrent('line2') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={l2Start.x}
                y1={l2Start.y}
                x2={l2End.x}
                y2={l2End.y}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Intersection point */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={diagram.lineWeight + 1}
                fill="currentColor"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Highlight first pair (angle1 and opposite) */}
        <AnimatePresence>
          {isVisible('pair1') && (
            <motion.g
              data-testid="vertical-angles-pair1"
              initial="hidden"
              animate={isCurrent('pair1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Angle at top-right: 0 to angle1 */}
              <motion.path
                d={makeArc(0, angle1, arcRadius)}
                fill="none"
                stroke={pair1Color}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={pointOnArc(angle1 / 2, arcRadius + 14).x}
                y={pointOnArc(angle1 / 2, arcRadius + 14).y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: pair1Color }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {angle1}°
              </motion.text>

              {/* Opposite angle: 180 to 180+angle1 */}
              <motion.path
                d={makeArc(180, 180 + angle1, arcRadius)}
                fill="none"
                stroke={pair1Color}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.2 }}
              />
              <motion.text
                x={pointOnArc(180 + angle1 / 2, arcRadius + 14).x}
                y={pointOnArc(180 + angle1 / 2, arcRadius + 14).y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: pair1Color }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.2 }}
              >
                {angle1}°
              </motion.text>

              {/* Congruence marks */}
              {showCongruenceMarks && (
                <>
                  <motion.line
                    x1={pointOnArc(angle1 / 2, arcRadius - 3).x}
                    y1={pointOnArc(angle1 / 2, arcRadius - 3).y}
                    x2={pointOnArc(angle1 / 2, arcRadius + 3).x}
                    y2={pointOnArc(angle1 / 2, arcRadius + 3).y}
                    stroke={pair1Color}
                    strokeWidth={2}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  />
                  <motion.line
                    x1={pointOnArc(180 + angle1 / 2, arcRadius - 3).x}
                    y1={pointOnArc(180 + angle1 / 2, arcRadius - 3).y}
                    x2={pointOnArc(180 + angle1 / 2, arcRadius + 3).x}
                    y2={pointOnArc(180 + angle1 / 2, arcRadius + 3).y}
                    stroke={pair1Color}
                    strokeWidth={2}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  />
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Highlight second pair (supplementary and opposite) */}
        <AnimatePresence>
          {isVisible('pair2') && (
            <motion.g
              data-testid="vertical-angles-pair2"
              initial="hidden"
              animate={isCurrent('pair2') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Angle at top-left: angle1 to 180 */}
              <motion.path
                d={makeArc(angle1, 180, arcRadius2)}
                fill="none"
                stroke={pair2Color}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={pointOnArc((angle1 + 180) / 2, arcRadius2 + 14).x}
                y={pointOnArc((angle1 + 180) / 2, arcRadius2 + 14).y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: pair2Color }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {supplementary}°
              </motion.text>

              {/* Opposite: 180+angle1 to 360 */}
              <motion.path
                d={makeArc(180 + angle1, 360, arcRadius2)}
                fill="none"
                stroke={pair2Color}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.2 }}
              />
              <motion.text
                x={pointOnArc(180 + angle1 + supplementary / 2, arcRadius2 + 14).x}
                y={pointOnArc(180 + angle1 + supplementary / 2, arcRadius2 + 14).y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: pair2Color }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.2 }}
              >
                {supplementary}°
              </motion.text>

              {/* Congruence marks (double tick) */}
              {showCongruenceMarks && (
                <>
                  {[-2, 2].map((offset) => (
                    <motion.line
                      key={`mark-pair2-a-${offset}`}
                      x1={pointOnArc((angle1 + 180) / 2, arcRadius2 - 3).x + offset}
                      y1={pointOnArc((angle1 + 180) / 2, arcRadius2 - 3).y}
                      x2={pointOnArc((angle1 + 180) / 2, arcRadius2 + 3).x + offset}
                      y2={pointOnArc((angle1 + 180) / 2, arcRadius2 + 3).y}
                      stroke={pair2Color}
                      strokeWidth={2}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    />
                  ))}
                  {[-2, 2].map((offset) => (
                    <motion.line
                      key={`mark-pair2-b-${offset}`}
                      x1={pointOnArc(180 + angle1 + supplementary / 2, arcRadius2 - 3).x + offset}
                      y1={pointOnArc(180 + angle1 + supplementary / 2, arcRadius2 - 3).y}
                      x2={pointOnArc(180 + angle1 + supplementary / 2, arcRadius2 + 3).x + offset}
                      y2={pointOnArc(180 + angle1 + supplementary / 2, arcRadius2 + 3).y}
                      stroke={pair2Color}
                      strokeWidth={2}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    />
                  ))}
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Show equality */}
        <AnimatePresence>
          {isVisible('equality') && (
            <motion.g
              data-testid="vertical-angles-equality"
              initial="hidden"
              animate={isCurrent('equality') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 50}
                textAnchor="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'זוויות קודקודיות שוות' : 'Vertical angles are equal'}
              </motion.text>
              <motion.text
                x={width / 2}
                y={height - 30}
                textAnchor="middle"
                className="fill-current text-sm"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.15 }}
              >
                <tspan style={{ fill: pair1Color }}>{angle1}°</tspan>
                {' = '}
                <tspan style={{ fill: pair1Color }}>{angle1}°</tspan>
                {'  ,  '}
                <tspan style={{ fill: pair2Color }}>{supplementary}°</tspan>
                {' = '}
                <tspan style={{ fill: pair2Color }}>{supplementary}°</tspan>
              </motion.text>
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

export default VerticalAngles
