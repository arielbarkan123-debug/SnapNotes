'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TangentRadiusPerpendicularityData } from '@/types/math'
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

interface TangentRadiusPerpendicularityProps {
  data: TangentRadiusPerpendicularityData
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
  drawCircle: { en: 'Draw circle', he: 'ציור מעגל' },
  drawRadius: { en: 'Draw radius', he: 'ציור רדיוס' },
  drawTangent: { en: 'Draw tangent line', he: 'ציור קו משיק' },
  showRightAngle: { en: 'Show right angle', he: 'הצגת זווית ישרה' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TangentRadiusPerpendicularity({
  data,
  className = '',
  width = 450,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TangentRadiusPerpendicularityProps) {
  const {
    radius: dataRadius,
    tangentPoint: tangentAngleDeg,
    showRightAngle: showRight,
    showTangentLine: showTangent,
    showRadius: showRad,
    title,
  } = data

  const padding = 60
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2 - padding
  const r = Math.min(maxR, maxR * 0.8)

  // Tangent point on circle
  const tangentAngleRad = (tangentAngleDeg * Math.PI) / 180
  const tangentPt = useMemo(
    () => ({
      x: cx + r * Math.cos(tangentAngleRad),
      y: cy - r * Math.sin(tangentAngleRad), // SVG y is inverted
    }),
    [cx, cy, r, tangentAngleRad]
  )

  // Tangent line direction (perpendicular to radius at tangent point)
  // Radius direction: (cos(angle), -sin(angle))
  // Tangent direction: (sin(angle), cos(angle)) in SVG coords
  const tangentDir = useMemo(
    () => ({
      dx: Math.sin(tangentAngleRad),
      dy: Math.cos(tangentAngleRad),
    }),
    [tangentAngleRad]
  )

  // Tangent line endpoints (extend both directions from tangent point)
  const tangentLen = r * 1.4
  const tangentLine = useMemo(
    () => ({
      x1: tangentPt.x - tangentDir.dx * tangentLen,
      y1: tangentPt.y - tangentDir.dy * tangentLen,
      x2: tangentPt.x + tangentDir.dx * tangentLen,
      y2: tangentPt.y + tangentDir.dy * tangentLen,
    }),
    [tangentPt, tangentDir, tangentLen]
  )

  // Right angle mark at tangent point
  const rightAngleMark = useMemo(() => {
    // Radius direction (from center to tangent point, normalized)
    const rdx = tangentPt.x - cx
    const rdy = tangentPt.y - cy
    const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1
    const rux = rdx / rlen
    const ruy = rdy / rlen
    // Tangent direction (normalized)
    const tux = tangentDir.dx
    const tuy = tangentDir.dy
    const s = 10
    // Points of the right angle square
    const p1 = { x: tangentPt.x - rux * s, y: tangentPt.y - ruy * s }
    const p2 = { x: p1.x + tux * s, y: p1.y + tuy * s }
    const p3 = { x: tangentPt.x + tux * s, y: tangentPt.y + tuy * s }
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }, [tangentPt, cx, cy, tangentDir])

  // Radius label position (midpoint of radius line, offset outward)
  const radiusLabelPos = useMemo(() => {
    const mx = (cx + tangentPt.x) / 2
    const my = (cy + tangentPt.y) / 2
    // Offset perpendicular to radius
    return { x: mx + tangentDir.dx * 14, y: my + tangentDir.dy * 14 }
  }, [cx, cy, tangentPt, tangentDir])

  // Build step definitions
  const hasRadius = showRad !== false
  const hasTangent = showTangent !== false
  const hasRightAngle = showRight !== false

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawCircle', label: STEP_LABELS.drawCircle.en, labelHe: STEP_LABELS.drawCircle.he },
    ]
    if (hasRadius) {
      defs.push({ id: 'drawRadius', label: STEP_LABELS.drawRadius.en, labelHe: STEP_LABELS.drawRadius.he })
    }
    if (hasTangent) {
      defs.push({ id: 'drawTangent', label: STEP_LABELS.drawTangent.en, labelHe: STEP_LABELS.drawTangent.he })
    }
    if (hasRightAngle) {
      defs.push({ id: 'showRightAngle', label: STEP_LABELS.showRightAngle.en, labelHe: STEP_LABELS.showRightAngle.he })
    }
    return defs
  }, [hasRadius, hasTangent, hasRightAngle])

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

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="tangent-radius-perpendicularity"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="trp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="trp-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw circle */}
        <AnimatePresence>
          {isVisible('drawCircle') && (
            <motion.g
              data-testid="trp-circle"
              initial="hidden"
              animate={isCurrent('drawCircle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Circle */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.8, ease: 'easeInOut' },
                  opacity: { duration: 0.1 },
                }}
              />
              {/* Center dot */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={4}
                fill={primaryColor}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.4 }}
              />
              {/* Center label */}
              <motion.text
                x={cx + 10}
                y={cy - 10}
                textAnchor="start"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                O
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Draw radius */}
        <AnimatePresence>
          {hasRadius && isVisible('drawRadius') && (
            <motion.g
              data-testid="trp-radius"
              initial="hidden"
              animate={isCurrent('drawRadius') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={cx}
                y1={cy}
                x2={tangentPt.x}
                y2={tangentPt.y}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Tangent point dot */}
              <motion.circle
                cx={tangentPt.x}
                cy={tangentPt.y}
                r={4}
                fill={accentColor}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
              />
              {/* Point label P */}
              <motion.text
                x={tangentPt.x + (tangentPt.x > cx ? 12 : -12)}
                y={tangentPt.y + (tangentPt.y > cy ? 18 : -10)}
                textAnchor={tangentPt.x > cx ? 'start' : 'end'}
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                P
              </motion.text>
              {/* Radius label */}
              <motion.text
                x={radiusLabelPos.x}
                y={radiusLabelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={accentColor}
                fontSize={11}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                r = {dataRadius}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Draw tangent line */}
        <AnimatePresence>
          {hasTangent && isVisible('drawTangent') && (
            <motion.g
              data-testid="trp-tangent"
              initial="hidden"
              animate={isCurrent('drawTangent') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={tangentLine.x1}
                y1={tangentLine.y1}
                x2={tangentLine.x2}
                y2={tangentLine.y2}
                stroke="#22c55e"
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Tangent label */}
              <motion.text
                x={tangentLine.x2 + 5}
                y={tangentLine.y2 - 8}
                textAnchor="start"
                fill="#22c55e"
                fontSize={11}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'משיק' : 'tangent'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show right angle mark */}
        <AnimatePresence>
          {hasRightAngle && isVisible('showRightAngle') && (
            <motion.g
              data-testid="trp-right-angle"
              initial="hidden"
              animate={isCurrent('showRightAngle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={rightAngleMark}
                fill="none"
                stroke="#ef4444"
                strokeWidth={2}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              {/* 90 degree label */}
              {(() => {
                const rdx = tangentPt.x - cx
                const rdy = tangentPt.y - cy
                const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1
                const offset = 22
                return (
                  <motion.text
                    x={tangentPt.x - (rdx / rlen) * offset + tangentDir.dx * offset}
                    y={tangentPt.y - (rdy / rlen) * offset + tangentDir.dy * offset}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ef4444"
                    fontSize={12}
                    fontWeight={700}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    90°
                  </motion.text>
                )
              })()}
              {/* Theorem text at bottom */}
              <motion.text
                x={width / 2}
                y={height - 15}
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-400"
                fontSize={11}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? 'רדיוס ⊥ משיק בנקודת ההשקה'
                  : 'radius ⊥ tangent at point of tangency'}
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

export default TangentRadiusPerpendicularity
