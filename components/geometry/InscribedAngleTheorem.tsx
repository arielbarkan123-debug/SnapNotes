'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { InscribedAngleTheoremData } from '@/types/geometry'
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
  centralAngle: { en: 'Draw central angle', he: 'ציור הזווית המרכזית' },
  inscribedAngle: { en: 'Draw inscribed angle', he: 'ציור הזווית ההיקפית' },
  arc: { en: 'Highlight arc', he: 'הדגשת הקשת' },
  relationship: { en: 'Show relationship', he: 'הצגת הקשר' },
}

interface InscribedAngleTheoremProps {
  data: InscribedAngleTheoremData
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
 * InscribedAngleTheorem - SVG component for the Inscribed Angle Theorem
 *
 * Shows that an inscribed angle is half the central angle subtending the same arc.
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
export function InscribedAngleTheorem({
  data,
  width = 380,
  height = 420,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: InscribedAngleTheoremProps) {
  const {
    radius,
    centralAngle,
    inscribedAngle,
    arcAngle,
    inscribedVertex,
    arcEndpoints,
    showRelationship = true,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'circle', label: STEP_LABELS.circle.en, labelHe: STEP_LABELS.circle.he },
      { id: 'centralAngle', label: STEP_LABELS.centralAngle.en, labelHe: STEP_LABELS.centralAngle.he },
      { id: 'inscribedAngle', label: STEP_LABELS.inscribedAngle.en, labelHe: STEP_LABELS.inscribedAngle.he },
      { id: 'arc', label: STEP_LABELS.arc.en, labelHe: STEP_LABELS.arc.he },
    ]
    if (showRelationship) {
      defs.push({ id: 'relationship', label: STEP_LABELS.relationship.en, labelHe: STEP_LABELS.relationship.he })
    }
    return defs
  }, [showRelationship])

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
  const diagramSize = Math.min(width, height - 120) - padding * 2
  const scaledRadius = diagramSize / 2.5
  const cx = width / 2
  const cy = padding + 30 + scaledRadius

  // Point on circle from angle (degrees)
  const pointOnCircle = (angleDeg: number, r: number = scaledRadius) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  // Arc endpoint positions
  const arcStart = pointOnCircle(arcEndpoints[0])
  const arcEnd = pointOnCircle(arcEndpoints[1])
  const inscribedV = pointOnCircle(inscribedVertex)

  // Arc path for the intercepted arc
  const arcPath = (startDeg: number, endDeg: number, r: number = scaledRadius) => {
    const start = pointOnCircle(startDeg, r)
    const end = pointOnCircle(endDeg, r)
    const angleDiff = endDeg - startDeg
    const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0
    const sweep = angleDiff > 0 ? 0 : 1
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
  }

  // Small angle arc for marking
  const angleArc = (vertex: { x: number; y: number }, ray1Angle: number, ray2Angle: number, r: number = 20) => {
    const s = {
      x: vertex.x + r * Math.cos((ray1Angle * Math.PI) / 180),
      y: vertex.y - r * Math.sin((ray1Angle * Math.PI) / 180),
    }
    const e = {
      x: vertex.x + r * Math.cos((ray2Angle * Math.PI) / 180),
      y: vertex.y - r * Math.sin((ray2Angle * Math.PI) / 180),
    }
    const diff = ray2Angle - ray1Angle
    const large = Math.abs(diff) > 180 ? 1 : 0
    const sweep = diff > 0 ? 0 : 1
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`
  }

  // Angles for the central angle rays (from center to arc endpoints)
  const centralRay1Angle = arcEndpoints[0]
  const centralRay2Angle = arcEndpoints[1]

  // Angles for the inscribed angle rays (from inscribed vertex to arc endpoints)
  const inscribedRay1Angle = (Math.atan2(-(arcStart.y - inscribedV.y), arcStart.x - inscribedV.x) * 180) / Math.PI
  const inscribedRay2Angle = (Math.atan2(-(arcEnd.y - inscribedV.y), arcEnd.x - inscribedV.x) * 180) / Math.PI

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="inscribed-angle-theorem-diagram"
      className={`geometry-inscribed-angle ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Inscribed Angle Theorem: inscribed angle ${inscribedAngle}° = half central angle ${centralAngle}°${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="iat-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="iat-title"
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
              data-testid="iat-circle"
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
                data-testid="iat-circle-path"
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

        {/* -- Step 1: Central Angle ----------------------------------------- */}
        <AnimatePresence>
          {isVisible('centralAngle') && (
            <motion.g
              data-testid="iat-central-angle"
              initial="hidden"
              animate={isCurrent('centralAngle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Radius to arc start */}
              <motion.line
                x1={cx}
                y1={cy}
                x2={arcStart.x}
                y2={arcStart.y}
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Radius to arc end */}
              <motion.line
                x1={cx}
                y1={cy}
                x2={arcEnd.x}
                y2={arcEnd.y}
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.2 }}
              />
              {/* Central angle arc mark */}
              <motion.path
                d={angleArc({ x: cx, y: cy }, centralRay1Angle, centralRay2Angle, 22)}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.4 }}
              />
              {/* Central angle label */}
              <motion.text
                {...pointOnCircle((arcEndpoints[0] + arcEndpoints[1]) / 2, 38)}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.primary }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.5 }}
              >
                {centralAngle}°
              </motion.text>
              {/* Arc endpoint dots */}
              <motion.circle
                cx={arcStart.x}
                cy={arcStart.y}
                r={diagram.lineWeight + 1}
                fill={GEOMETRY_COLORS.highlight.primary}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              />
              <motion.circle
                cx={arcEnd.x}
                cy={arcEnd.y}
                r={diagram.lineWeight + 1}
                fill={GEOMETRY_COLORS.highlight.primary}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
              />
              {/* Labels A and B */}
              <motion.text
                x={arcStart.x + (arcStart.x > cx ? 10 : -10)}
                y={arcStart.y + (arcStart.y > cy ? 14 : -6)}
                textAnchor={arcStart.x > cx ? 'start' : 'end'}
                className="fill-current text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.5 }}
              >
                A
              </motion.text>
              <motion.text
                x={arcEnd.x + (arcEnd.x > cx ? 10 : -10)}
                y={arcEnd.y + (arcEnd.y > cy ? 14 : -6)}
                textAnchor={arcEnd.x > cx ? 'start' : 'end'}
                className="fill-current text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.6 }}
              >
                B
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Inscribed Angle --------------------------------------- */}
        <AnimatePresence>
          {isVisible('inscribedAngle') && (
            <motion.g
              data-testid="iat-inscribed-angle"
              initial="hidden"
              animate={isCurrent('inscribedAngle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Line from inscribed vertex to arc start */}
              <motion.line
                x1={inscribedV.x}
                y1={inscribedV.y}
                x2={arcStart.x}
                y2={arcStart.y}
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Line from inscribed vertex to arc end */}
              <motion.line
                x1={inscribedV.x}
                y1={inscribedV.y}
                x2={arcEnd.x}
                y2={arcEnd.y}
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.2 }}
              />
              {/* Inscribed angle arc mark */}
              <motion.path
                d={angleArc(inscribedV, inscribedRay1Angle, inscribedRay2Angle, 18)}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.4 }}
              />
              {/* Inscribed angle label */}
              <motion.text
                x={inscribedV.x + 25 * Math.cos(((inscribedRay1Angle + inscribedRay2Angle) / 2) * Math.PI / 180)}
                y={inscribedV.y - 25 * Math.sin(((inscribedRay1Angle + inscribedRay2Angle) / 2) * Math.PI / 180)}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.5 }}
              >
                {inscribedAngle}°
              </motion.text>
              {/* Inscribed vertex dot and label */}
              <motion.circle
                cx={inscribedV.x}
                cy={inscribedV.y}
                r={diagram.lineWeight + 1}
                fill={GEOMETRY_COLORS.highlight.secondary}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              />
              <motion.text
                x={inscribedV.x + (inscribedV.x > cx ? 12 : -12)}
                y={inscribedV.y + (inscribedV.y > cy ? 14 : -6)}
                textAnchor={inscribedV.x > cx ? 'start' : 'end'}
                className="fill-current text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.6 }}
              >
                P
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 3: Highlighted Arc --------------------------------------- */}
        <AnimatePresence>
          {isVisible('arc') && (
            <motion.g
              data-testid="iat-arc"
              initial="hidden"
              animate={isCurrent('arc') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={arcPath(arcEndpoints[0], arcEndpoints[1])}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Arc label */}
              <motion.text
                {...pointOnCircle((arcEndpoints[0] + arcEndpoints[1]) / 2, scaledRadius + 16)}
                textAnchor="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                {arcAngle}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 4: Relationship ------------------------------------------ */}
        <AnimatePresence>
          {showRelationship && isVisible('relationship') && (
            <motion.g
              data-testid="iat-relationship"
              initial="hidden"
              animate={isCurrent('relationship') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.g
                transform={`translate(0, ${cy + scaledRadius + 25})`}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                <text x={width / 2} y={0} textAnchor="middle" className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
                  {language === 'he' ? 'משפט הזווית ההיקפית:' : 'Inscribed Angle Theorem:'}
                </text>
                <motion.text
                  x={width / 2}
                  y={20}
                  textAnchor="middle"
                  style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                  className="text-sm font-bold"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {language === 'he' ? 'זווית היקפית' : 'Inscribed'} = {inscribedAngle}° = {centralAngle}° / 2
                </motion.text>
                <motion.text
                  x={width / 2}
                  y={38}
                  textAnchor="middle"
                  className="fill-current text-xs"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {language === 'he'
                    ? 'הזווית ההיקפית שווה לחצי מהזווית המרכזית'
                    : 'Inscribed angle = ½ × Central angle'}
                </motion.text>
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

      {/* Step-by-step solution */}
      {showStepByStep && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">
            {language === 'he' ? 'פתרון מפורט:' : 'Step-by-Step Solution:'}
          </h4>
          <div className="space-y-2">
            <div className="border-l-2 border-pink-500 pl-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {language === 'he' ? 'זווית מרכזית' : 'Central angle'} = {centralAngle}°
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {language === 'he' ? 'זווית היקפית' : 'Inscribed angle'} = {centralAngle}° ÷ 2 = {inscribedAngle}°
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {language === 'he' ? 'קשת' : 'Arc'} = {arcAngle}°
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InscribedAngleTheorem
