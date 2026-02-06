'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AngleTypesDiagramData } from '@/types/geometry'
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
  vertex: { en: 'Draw vertex and initial ray', he: 'ציור קודקוד וקרן ראשונה' },
  secondRay: { en: 'Draw second ray', he: 'ציור קרן שנייה' },
  arc: { en: 'Show angle arc', he: 'הצגת קשת הזווית' },
  label: { en: 'Label with measure and type', he: 'תיוג מידה וסוג' },
}

// ---------------------------------------------------------------------------
// Angle type labels
// ---------------------------------------------------------------------------

const ANGLE_TYPE_LABELS: Record<string, { en: string; he: string }> = {
  acute: { en: 'Acute', he: 'חדה' },
  right: { en: 'Right', he: 'ישרה' },
  obtuse: { en: 'Obtuse', he: 'קהה' },
  straight: { en: 'Straight', he: 'שטוחה' },
  reflex: { en: 'Reflex', he: 'שקועה' },
}

interface AngleTypesDiagramProps {
  data: AngleTypesDiagramData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * AngleTypesDiagram - Shows different angle types (acute, right, obtuse, straight, reflex)
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
export function AngleTypesDiagram({
  data,
  width = 400,
  height = 350,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: AngleTypesDiagramProps) {
  const {
    angles,
    showProtractor = false,
    title,
  } = data

  const stepDefs = useMemo(() => [
    { id: 'vertex', label: STEP_LABELS.vertex.en, labelHe: STEP_LABELS.vertex.he },
    { id: 'secondRay', label: STEP_LABELS.secondRay.en, labelHe: STEP_LABELS.secondRay.he },
    { id: 'arc', label: STEP_LABELS.arc.en, labelHe: STEP_LABELS.arc.he },
    { id: 'label', label: STEP_LABELS.label.en, labelHe: STEP_LABELS.label.he },
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

  // Layout angles in a row
  const angleCount = angles.length
  const colWidth = width / angleCount
  const rayLength = Math.min(colWidth * 0.35, 80)

  // Point on ray from vertex at given angle
  const pointOnRay = (vx: number, vy: number, angleDeg: number, len: number) => ({
    x: vx + len * Math.cos((angleDeg * Math.PI) / 180),
    y: vy - len * Math.sin((angleDeg * Math.PI) / 180),
  })

  // Arc path between two angles
  const arcPath = (vx: number, vy: number, startDeg: number, endDeg: number, r: number) => {
    const start = pointOnRay(vx, vy, startDeg, r)
    const end = pointOnRay(vx, vy, endDeg, r)
    const angleDiff = endDeg - startDeg
    const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Right angle marker size
  const rightAngleSize = 10

  return (
    <div
      data-testid="angle-types-diagram"
      className={`geometry-angle-types ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={title || 'Angle types diagram'}
      >
        {/* Background */}
        <rect
          data-testid="angle-types-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="angle-types-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {angles.map((angle, i) => {
          const cx = colWidth * i + colWidth / 2
          const cy = height * 0.5
          const ray1End = pointOnRay(cx, cy, angle.ray1Angle, rayLength)
          const ray2End = pointOnRay(cx, cy, angle.ray2Angle, rayLength)
          const arcRadius = rayLength * 0.35
          const angleTypeLabel = ANGLE_TYPE_LABELS[angle.type]

          // Right angle marker: small square at vertex
          const isRight = angle.type === 'right'
          const midAngleRad = ((angle.ray1Angle + angle.ray2Angle) / 2) * Math.PI / 180
          const rmDir1Rad = (angle.ray1Angle * Math.PI) / 180
          const rmDir2Rad = (angle.ray2Angle * Math.PI) / 180

          return (
            <g key={`angle-${i}`} data-testid={`angle-group-${i}`}>
              {/* Step 0: Vertex and initial ray */}
              <AnimatePresence>
                {isVisible('vertex') && (
                  <motion.g
                    data-testid={`angle-vertex-${i}`}
                    initial="hidden"
                    animate={isCurrent('vertex') ? 'spotlight' : 'visible'}
                    variants={spotlight}
                  >
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={diagram.lineWeight + 1}
                      fill="currentColor"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.1 }}
                    />
                    <motion.line
                      x1={cx}
                      y1={cy}
                      x2={ray1End.x}
                      y2={ray1End.y}
                      stroke="currentColor"
                      strokeWidth={diagram.lineWeight}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Step 1: Second ray */}
              <AnimatePresence>
                {isVisible('secondRay') && (
                  <motion.g
                    data-testid={`angle-second-ray-${i}`}
                    initial="hidden"
                    animate={isCurrent('secondRay') ? 'spotlight' : 'visible'}
                    variants={spotlight}
                  >
                    <motion.line
                      x1={cx}
                      y1={cy}
                      x2={ray2End.x}
                      y2={ray2End.y}
                      stroke="currentColor"
                      strokeWidth={diagram.lineWeight}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Step 2: Angle arc */}
              <AnimatePresence>
                {isVisible('arc') && (
                  <motion.g
                    data-testid={`angle-arc-${i}`}
                    initial="hidden"
                    animate={isCurrent('arc') ? 'spotlight' : 'visible'}
                    variants={spotlight}
                  >
                    {isRight ? (
                      // Right angle marker: small square
                      <motion.path
                        d={`M ${cx + rightAngleSize * Math.cos(rmDir1Rad)} ${cy - rightAngleSize * Math.sin(rmDir1Rad)}
                            L ${cx + rightAngleSize * Math.cos(rmDir1Rad) + rightAngleSize * Math.cos(rmDir2Rad)} ${cy - rightAngleSize * Math.sin(rmDir1Rad) - rightAngleSize * Math.sin(rmDir2Rad)}
                            L ${cx + rightAngleSize * Math.cos(rmDir2Rad)} ${cy - rightAngleSize * Math.sin(rmDir2Rad)}`}
                        fill="none"
                        stroke={GEOMETRY_COLORS.label.angle}
                        strokeWidth={1.5}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                      />
                    ) : (
                      <motion.path
                        d={arcPath(cx, cy, angle.ray1Angle, angle.ray2Angle, arcRadius)}
                        fill="none"
                        stroke={diagram.colors.primary}
                        strokeWidth={2}
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                    )}
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Step 3: Label with measure and type */}
              <AnimatePresence>
                {isVisible('label') && (
                  <motion.g
                    data-testid={`angle-label-${i}`}
                    initial="hidden"
                    animate={isCurrent('label') ? 'spotlight' : 'visible'}
                    variants={spotlight}
                  >
                    {/* Measure */}
                    <motion.text
                      x={cx + (arcRadius + 14) * Math.cos(midAngleRad)}
                      y={cy - (arcRadius + 14) * Math.sin(midAngleRad)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fill: diagram.colors.primary }}
                      className="text-xs font-medium"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.05 }}
                    >
                      {angle.measure}°
                    </motion.text>

                    {/* Type label */}
                    <motion.text
                      x={cx}
                      y={cy + rayLength + 20}
                      textAnchor="middle"
                      className="fill-current text-xs font-medium"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.05 + 0.1 }}
                    >
                      {language === 'he' ? angleTypeLabel?.he : angleTypeLabel?.en}
                    </motion.text>

                    {/* Custom label */}
                    {angle.label && (
                      <motion.text
                        x={cx}
                        y={cy + rayLength + 36}
                        textAnchor="middle"
                        style={{ fill: diagram.colors.primary }}
                        className="text-xs"
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                        transition={{ delay: i * 0.05 + 0.2 }}
                      >
                        {angle.label}
                      </motion.text>
                    )}
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Optional protractor overlay */}
              {showProtractor && isVisible('arc') && (
                <motion.g
                  data-testid={`angle-protractor-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  transition={{ duration: 0.4 }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rayLength * 0.7}
                    fill="none"
                    stroke={GEOMETRY_COLORS.label.angle}
                    strokeWidth={0.5}
                  />
                  {/* Tick marks every 30 degrees */}
                  {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
                    const inner = pointOnRay(cx, cy, deg, rayLength * 0.6)
                    const outer = pointOnRay(cx, cy, deg, rayLength * 0.7)
                    return (
                      <line
                        key={`tick-${i}-${deg}`}
                        x1={inner.x}
                        y1={inner.y}
                        x2={outer.x}
                        y2={outer.y}
                        stroke={GEOMETRY_COLORS.label.angle}
                        strokeWidth={0.5}
                      />
                    )
                  })}
                </motion.g>
              )}
            </g>
          )
        })}
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

export default AngleTypesDiagram
