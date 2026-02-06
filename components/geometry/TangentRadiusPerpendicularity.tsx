'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TangentRadiusPerpendicularityData } from '@/types/geometry'
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
  circle: { en: 'Draw the circle', he: 'ציור המעגל' },
  tangent: { en: 'Draw tangent line', he: 'ציור המשיק' },
  radius: { en: 'Draw radius to tangent point', he: 'ציור הרדיוס לנקודת ההשקה' },
  rightAngle: { en: 'Show right angle', he: 'הצגת הזווית הישרה' },
}

interface TangentRadiusPerpendicularityProps {
  data: TangentRadiusPerpendicularityData
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
 * TangentRadiusPerpendicularity - SVG component showing tangent-radius perpendicularity
 *
 * Demonstrates that a tangent to a circle is perpendicular to the radius
 * at the point of tangency.
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
export function TangentRadiusPerpendicularity({
  data,
  width = 380,
  height = 400,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: TangentRadiusPerpendicularityProps) {
  const {
    radius,
    tangentPoint,
    showRightAngle = true,
    showTangentLine = true,
    showRadius: showRadiusLine = true,
    externalPoint,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'circle', label: STEP_LABELS.circle.en, labelHe: STEP_LABELS.circle.he },
    ]
    if (showTangentLine) {
      defs.push({ id: 'tangent', label: STEP_LABELS.tangent.en, labelHe: STEP_LABELS.tangent.he })
    }
    if (showRadiusLine) {
      defs.push({ id: 'radius', label: STEP_LABELS.radius.en, labelHe: STEP_LABELS.radius.he })
    }
    if (showRightAngle) {
      defs.push({ id: 'rightAngle', label: STEP_LABELS.rightAngle.en, labelHe: STEP_LABELS.rightAngle.he })
    }
    return defs
  }, [showTangentLine, showRadiusLine, showRightAngle])

  // useDiagramBase -- step control, colors, lineWeight, RTL
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

  // SVG dimensions
  const padding = 60
  const diagramSize = Math.min(width, height - 100) - padding * 2
  const scaledRadius = diagramSize / 2.5
  const cx = width / 2
  const cy = padding + 20 + scaledRadius

  // Point on circle from angle (degrees)
  const pointOnCircle = (angleDeg: number, r: number = scaledRadius) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  // Tangent point on circle
  const tangentPt = pointOnCircle(tangentPoint)

  // Tangent direction is perpendicular to the radius at the tangent point
  // Radius direction: (cos(tangentPoint), -sin(tangentPoint))
  // Tangent direction: (sin(tangentPoint), cos(tangentPoint))
  const tangentAngleRad = (tangentPoint * Math.PI) / 180
  const tangentDirX = -Math.sin(tangentAngleRad) // perpendicular to radius
  const tangentDirY = -Math.cos(tangentAngleRad)
  const tangentLength = scaledRadius * 1.6

  // Tangent line endpoints
  const tangentStart = {
    x: tangentPt.x - tangentDirX * tangentLength,
    y: tangentPt.y - tangentDirY * tangentLength,
  }
  const tangentEnd = {
    x: tangentPt.x + tangentDirX * tangentLength,
    y: tangentPt.y + tangentDirY * tangentLength,
  }

  // External point (if provided)
  const extPt = externalPoint
    ? { x: cx + externalPoint.x * (scaledRadius / radius), y: cy - externalPoint.y * (scaledRadius / radius) }
    : null

  // Right angle marker at the tangent point
  const rightAngleSize = 12
  // The two directions at the tangent point: toward center, and along tangent
  const toCenterDirX = Math.cos(tangentAngleRad)
  const toCenterDirY = -Math.sin(tangentAngleRad)
  const rightAnglePath = `
    M ${tangentPt.x + toCenterDirX * rightAngleSize + tangentDirX * 0} ${tangentPt.y + toCenterDirY * rightAngleSize + tangentDirY * 0}
    L ${tangentPt.x + toCenterDirX * rightAngleSize + tangentDirX * rightAngleSize} ${tangentPt.y + toCenterDirY * rightAngleSize + tangentDirY * rightAngleSize}
    L ${tangentPt.x + toCenterDirX * 0 + tangentDirX * rightAngleSize} ${tangentPt.y + toCenterDirY * 0 + tangentDirY * rightAngleSize}
  `

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="tangent-radius-diagram"
      className={`geometry-tangent-radius ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Tangent-radius perpendicularity at ${tangentPoint}°${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="trp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="trp-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* -- Step 0: Circle ------------------------------------------------ */}
        <AnimatePresence>
          {isVisible('circle') && (
            <motion.g
              data-testid="trp-circle"
              initial="hidden"
              animate={isCurrent('circle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={cx}
                cy={cy}
                r={scaledRadius}
                fill={diagram.colors.primary}
                fillOpacity={0.06}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.circle
                data-testid="trp-circle-path"
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
              {/* Center point */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={diagram.lineWeight}
                fill="currentColor"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
              />
              <motion.text
                x={cx - 12}
                y={cy + 16}
                className="fill-current text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.4 }}
              >
                O
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 1: Tangent Line ------------------------------------------ */}
        <AnimatePresence>
          {showTangentLine && isVisible('tangent') && (
            <motion.g
              data-testid="trp-tangent"
              initial="hidden"
              animate={isCurrent('tangent') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={tangentStart.x}
                y1={tangentStart.y}
                x2={tangentEnd.x}
                y2={tangentEnd.y}
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Tangent point */}
              <motion.circle
                cx={tangentPt.x}
                cy={tangentPt.y}
                r={diagram.lineWeight + 1}
                fill={GEOMETRY_COLORS.highlight.secondary}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              />
              <motion.text
                x={tangentPt.x + (tangentPt.x > cx ? 12 : -12)}
                y={tangentPt.y + (tangentPt.y > cy ? 16 : -8)}
                textAnchor={tangentPt.x > cx ? 'start' : 'end'}
                className="fill-current text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.4 }}
              >
                T
              </motion.text>
              {/* External point if provided */}
              {extPt && (
                <>
                  <motion.circle
                    cx={extPt.x}
                    cy={extPt.y}
                    r={diagram.lineWeight + 1}
                    fill={GEOMETRY_COLORS.highlight.tertiary}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.text
                    x={extPt.x + 10}
                    y={extPt.y - 6}
                    className="fill-current text-xs font-bold"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: 0.6 }}
                  >
                    P
                  </motion.text>
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Radius to tangent point ------------------------------- */}
        <AnimatePresence>
          {showRadiusLine && isVisible('radius') && (
            <motion.g
              data-testid="trp-radius"
              initial="hidden"
              animate={isCurrent('radius') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={cx}
                y1={cy}
                x2={tangentPt.x}
                y2={tangentPt.y}
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Radius label */}
              <motion.text
                x={(cx + tangentPt.x) / 2 + 10}
                y={(cy + tangentPt.y) / 2 - 8}
                textAnchor="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.primary }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                r = {radius}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 3: Right angle mark -------------------------------------- */}
        <AnimatePresence>
          {showRightAngle && isVisible('rightAngle') && (
            <motion.g
              data-testid="trp-right-angle"
              initial="hidden"
              animate={isCurrent('rightAngle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={rightAnglePath}
                fill="none"
                stroke={GEOMETRY_COLORS.label.angle}
                strokeWidth={1.5}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              />
              {/* 90 degree label */}
              <motion.text
                x={tangentPt.x + toCenterDirX * 22 + tangentDirX * 22}
                y={tangentPt.y + toCenterDirY * 22 + tangentDirY * 22}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: GEOMETRY_COLORS.label.angle }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                90°
              </motion.text>
              {/* Theorem label */}
              <motion.g
                transform={`translate(0, ${cy + scaledRadius + 25})`}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.4 }}
              >
                <text x={width / 2} y={0} textAnchor="middle" className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
                  {language === 'he' ? 'משיק ⊥ רדיוס בנקודת ההשקה' : 'Tangent ⊥ Radius at point of tangency'}
                </text>
              </motion.g>
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

      {/* Step-by-step */}
      {showStepByStep && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">
            {language === 'he' ? 'פתרון מפורט:' : 'Step-by-Step Solution:'}
          </h4>
          <div className="border-l-2 border-pink-500 pl-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {language === 'he'
                ? 'המשיק למעגל ניצב לרדיוס בנקודת ההשקה'
                : 'A tangent to a circle is perpendicular to the radius at the point of tangency'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              OT ⊥ {language === 'he' ? 'קו המשיק' : 'Tangent line'} → 90°
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TangentRadiusPerpendicularity
