'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { InscribedAngleTheoremData } from '@/types/math'
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

interface InscribedAngleTheoremProps {
  data: InscribedAngleTheoremData
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
  circle: { en: 'Draw circle', he: 'ציור מעגל' },
  centralAngle: { en: 'Show central angle', he: 'הצגת זווית מרכזית' },
  inscribedAngle: { en: 'Show inscribed angle', he: 'הצגת זווית היקפית' },
  relationship: { en: 'Show relationship', he: 'הצגת הקשר' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180

function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  return {
    x: cx + r * Math.cos(angleDeg * DEG),
    y: cy - r * Math.sin(angleDeg * DEG),
  }
}

function svgArcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  largeArc?: boolean
): string {
  const p1 = pointOnCircle(cx, cy, r, startDeg)
  const p2 = pointOnCircle(cx, cy, r, endDeg)
  let sweep = endDeg - startDeg
  if (sweep < 0) sweep += 360
  const large = largeArc !== undefined ? (largeArc ? 1 : 0) : (sweep > 180 ? 1 : 0)
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 0 ${p2.x} ${p2.y}`
}

function angleArcPath(
  cx: number,
  cy: number,
  startDeg: number,
  endDeg: number,
  radius: number
): string {
  const p1 = pointOnCircle(cx, cy, radius, startDeg)
  const p2 = pointOnCircle(cx, cy, radius, endDeg)
  let sweep = endDeg - startDeg
  if (sweep < 0) sweep += 360
  const large = sweep > 180 ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${large} 0 ${p2.x} ${p2.y}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InscribedAngleTheorem({
  data,
  className = '',
  width = 450,
  height = 420,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: InscribedAngleTheoremProps) {
  const {
    radius: r = 120,
    centralAngle,
    inscribedAngle,
    arcEndpoints,
    inscribedVertex,
    showRelationship = true,
    title,
  } = data

  // Circle center
  const cx = width / 2
  const cy = height / 2 - 15

  // Points on circle
  const pointA = useMemo(() => pointOnCircle(cx, cy, r, arcEndpoints[0]), [cx, cy, r, arcEndpoints])
  const pointB = useMemo(() => pointOnCircle(cx, cy, r, arcEndpoints[1]), [cx, cy, r, arcEndpoints])
  const pointP = useMemo(() => pointOnCircle(cx, cy, r, inscribedVertex), [cx, cy, r, inscribedVertex])

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'circle', label: STEP_LABELS.circle.en, labelHe: STEP_LABELS.circle.he },
      { id: 'centralAngle', label: STEP_LABELS.centralAngle.en, labelHe: STEP_LABELS.centralAngle.he },
      { id: 'inscribedAngle', label: STEP_LABELS.inscribedAngle.en, labelHe: STEP_LABELS.inscribedAngle.he },
    ]
    if (showRelationship) {
      defs.push({ id: 'relationship', label: STEP_LABELS.relationship.en, labelHe: STEP_LABELS.relationship.he })
    }
    return defs
  }, [showRelationship])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'high_school',
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

  // Central angle arc (small arc near center)
  const centralArcAngleFrom = arcEndpoints[0]
  const centralArcAngleTo = arcEndpoints[1]

  // Inscribed angle: angle at P from PA to PB
  const inscAngleFrom = Math.atan2(-(pointA.y - pointP.y), pointA.x - pointP.x) / DEG
  const inscAngleTo = Math.atan2(-(pointB.y - pointP.y), pointB.x - pointP.x) / DEG

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="inscribed-angle-theorem"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="iat-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="iat-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw circle */}
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
                r={r}
                fill="none"
                stroke="#374151"
                className="dark:stroke-gray-400"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Center point */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={3}
                fill={primaryColor}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              />
              <motion.text
                x={cx + 8}
                y={cy - 8}
                fontSize={12}
                fontWeight={600}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                O
              </motion.text>
              {/* Arc endpoint labels */}
              <motion.circle cx={pointA.x} cy={pointA.y} r={3.5} fill={primaryColor}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }} />
              <motion.text
                x={pointA.x + (pointA.x - cx) * 0.15}
                y={pointA.y + (pointA.y - cy) * 0.15}
                textAnchor="middle" dominantBaseline="central"
                fontSize={13} fontWeight={600} fill={primaryColor}
                initial="hidden" animate="visible" variants={labelAppearVariants}
              >
                A
              </motion.text>
              <motion.circle cx={pointB.x} cy={pointB.y} r={3.5} fill={primaryColor}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} />
              <motion.text
                x={pointB.x + (pointB.x - cx) * 0.15}
                y={pointB.y + (pointB.y - cy) * 0.15}
                textAnchor="middle" dominantBaseline="central"
                fontSize={13} fontWeight={600} fill={primaryColor}
                initial="hidden" animate="visible" variants={labelAppearVariants}
              >
                B
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Central angle */}
        <AnimatePresence>
          {isVisible('centralAngle') && (
            <motion.g
              data-testid="iat-central-angle"
              initial="hidden"
              animate={isCurrent('centralAngle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* OA and OB lines */}
              <motion.line
                x1={cx} y1={cy} x2={pointA.x} y2={pointA.y}
                stroke={primaryColor} strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />
              <motion.line
                x1={cx} y1={cy} x2={pointB.x} y2={pointB.y}
                stroke={primaryColor} strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />
              {/* Central angle arc */}
              <motion.path
                d={angleArcPath(cx, cy, centralArcAngleFrom, centralArcAngleTo, 22)}
                fill="none" stroke={primaryColor} strokeWidth={2}
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />
              {/* Central angle label */}
              <motion.text
                x={cx + 35 * Math.cos(((centralArcAngleFrom + centralArcAngleTo) / 2) * DEG)}
                y={cy - 35 * Math.sin(((centralArcAngleFrom + centralArcAngleTo) / 2) * DEG)}
                textAnchor="middle" dominantBaseline="central"
                fontSize={12} fontWeight={600} fill={primaryColor}
                initial="hidden" animate="visible" variants={labelAppearVariants}
              >
                {centralAngle}°
              </motion.text>
              {/* Highlighted arc on circle */}
              <motion.path
                d={svgArcPath(cx, cy, r, arcEndpoints[0], arcEndpoints[1])}
                fill="none" stroke={primaryColor} strokeWidth={4} opacity={0.4}
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Inscribed angle */}
        <AnimatePresence>
          {isVisible('inscribedAngle') && (
            <motion.g
              data-testid="iat-inscribed-angle"
              initial="hidden"
              animate={isCurrent('inscribedAngle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Point P */}
              <motion.circle cx={pointP.x} cy={pointP.y} r={3.5} fill={accentColor}
                initial={{ scale: 0 }} animate={{ scale: 1 }} />
              <motion.text
                x={pointP.x + (pointP.x - cx) * 0.15}
                y={pointP.y + (pointP.y - cy) * 0.15}
                textAnchor="middle" dominantBaseline="central"
                fontSize={13} fontWeight={600} fill={accentColor}
                initial="hidden" animate="visible" variants={labelAppearVariants}
              >
                P
              </motion.text>
              {/* PA and PB lines */}
              <motion.line
                x1={pointP.x} y1={pointP.y} x2={pointA.x} y2={pointA.y}
                stroke={accentColor} strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />
              <motion.line
                x1={pointP.x} y1={pointP.y} x2={pointB.x} y2={pointB.y}
                stroke={accentColor} strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />
              {/* Inscribed angle arc */}
              <motion.path
                d={angleArcPath(pointP.x, pointP.y, inscAngleFrom, inscAngleTo, 22)}
                fill="none" stroke={accentColor} strokeWidth={2}
                initial="hidden" animate="visible" variants={lineDrawVariants}
              />
              {/* Inscribed angle label */}
              <motion.text
                x={pointP.x + 35 * Math.cos(((inscAngleFrom + inscAngleTo) / 2) * DEG)}
                y={pointP.y - 35 * Math.sin(((inscAngleFrom + inscAngleTo) / 2) * DEG)}
                textAnchor="middle" dominantBaseline="central"
                fontSize={12} fontWeight={600} fill={accentColor}
                initial="hidden" animate="visible" variants={labelAppearVariants}
              >
                {inscribedAngle}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Relationship */}
        <AnimatePresence>
          {showRelationship && isVisible('relationship') && (
            <motion.g
              data-testid="iat-relationship"
              initial="hidden"
              animate={isCurrent('relationship') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={cy + r + 45}
                textAnchor="middle"
                fontSize={14} fontWeight={700} fill={primaryColor}
                initial="hidden" animate="visible" variants={labelAppearVariants}
              >
                {language === 'he'
                  ? `זווית היקפית = ½ × זווית מרכזית`
                  : `Inscribed = ½ × Central`}
              </motion.text>
              <motion.text
                x={width / 2}
                y={cy + r + 65}
                textAnchor="middle"
                fontSize={13} fontWeight={600} fill={accentColor}
                initial="hidden" animate="visible" variants={labelAppearVariants}
              >
                {inscribedAngle}° = ½ × {centralAngle}°
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

export default InscribedAngleTheorem
