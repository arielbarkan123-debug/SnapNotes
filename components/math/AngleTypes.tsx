'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AngleTypesData } from '@/types/math'
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

interface AngleTypesProps {
  data: AngleTypesData
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
  rays: { en: 'Draw rays', he: 'ציור קרניים' },
  arcs: { en: 'Show angle arcs with labels', he: 'הצגת קשתות זוויות עם תיוג' },
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

// ---------------------------------------------------------------------------
// Color per angle type
// ---------------------------------------------------------------------------

const ANGLE_TYPE_COLORS: Record<string, string> = {
  acute: '#22c55e',    // green
  right: '#3b82f6',    // blue
  obtuse: '#f59e0b',   // amber
  straight: '#8b5cf6', // purple
  reflex: '#ef4444',   // red
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AngleTypes({
  data,
  className = '',
  width = 450,
  height = 260,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: AngleTypesProps) {
  const { angles, title } = data

  const stepDefs = useMemo(
    () => [
      { id: 'rays', label: STEP_LABELS.rays.en, labelHe: STEP_LABELS.rays.he },
      { id: 'arcs', label: STEP_LABELS.arcs.en, labelHe: STEP_LABELS.arcs.he },
    ],
    []
  )

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

  // Layout: spread angles evenly across width
  const angleCount = angles.length
  const colWidth = width / Math.max(angleCount, 1)
  const rayLength = Math.min(colWidth * 0.35, 70)

  // Helper: point on ray from vertex
  const pointOnRay = (vx: number, vy: number, angleDeg: number, len: number) => ({
    x: vx + len * Math.cos((angleDeg * Math.PI) / 180),
    y: vy - len * Math.sin((angleDeg * Math.PI) / 180),
  })

  // Helper: SVG arc path between two angles
  const arcPath = (vx: number, vy: number, startDeg: number, endDeg: number, r: number) => {
    const start = pointOnRay(vx, vy, startDeg, r)
    const end = pointOnRay(vx, vy, endDeg, r)
    const angleDiff = endDeg - startDeg
    const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  const rightAngleSize = 10
  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="angle-types"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="angle-types-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="angle-types-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {angles.map((angle, i) => {
          const cx = colWidth * i + colWidth / 2
          const cy = height * 0.5
          const ray1End = pointOnRay(cx, cy, angle.ray1Angle, rayLength)
          const ray2End = pointOnRay(cx, cy, angle.ray2Angle, rayLength)
          const arcRadius = rayLength * 0.35
          const isRight = angle.type === 'right'
          const midAngleDeg = (angle.ray1Angle + angle.ray2Angle) / 2
          const midAngleRad = (midAngleDeg * Math.PI) / 180
          const rmDir1Rad = (angle.ray1Angle * Math.PI) / 180
          const rmDir2Rad = (angle.ray2Angle * Math.PI) / 180
          const typeColor = ANGLE_TYPE_COLORS[angle.type] || primaryColor
          const typeLabel = ANGLE_TYPE_LABELS[angle.type]

          return (
            <g key={`angle-${i}`} data-testid={`angle-group-${i}`}>
              {/* Step 0: Draw rays */}
              <AnimatePresence>
                {isVisible('rays') && (
                  <motion.g
                    data-testid={`angle-rays-${i}`}
                    initial="hidden"
                    animate={isCurrent('rays') ? 'spotlight' : 'visible'}
                    variants={spotlight}
                  >
                    {/* Vertex dot */}
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={diagram.lineWeight + 1}
                      className="fill-gray-700 dark:fill-gray-300"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 25,
                        delay: i * 0.08,
                      }}
                    />
                    {/* Ray 1 */}
                    <motion.line
                      x1={cx}
                      y1={cy}
                      x2={ray1End.x}
                      y2={ray1End.y}
                      stroke="#374151"
                      className="dark:stroke-gray-300"
                      strokeWidth={diagram.lineWeight}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    {/* Ray 2 */}
                    <motion.line
                      x1={cx}
                      y1={cy}
                      x2={ray2End.x}
                      y2={ray2End.y}
                      stroke="#374151"
                      className="dark:stroke-gray-300"
                      strokeWidth={diagram.lineWeight}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Step 1: Angle arcs with labels */}
              <AnimatePresence>
                {isVisible('arcs') && (
                  <motion.g
                    data-testid={`angle-arc-${i}`}
                    initial="hidden"
                    animate={isCurrent('arcs') ? 'spotlight' : 'visible'}
                    variants={spotlight}
                  >
                    {isRight ? (
                      /* Right angle marker: small square */
                      <motion.path
                        d={`M ${cx + rightAngleSize * Math.cos(rmDir1Rad)} ${cy - rightAngleSize * Math.sin(rmDir1Rad)}
                            L ${cx + rightAngleSize * Math.cos(rmDir1Rad) + rightAngleSize * Math.cos(rmDir2Rad)} ${cy - rightAngleSize * Math.sin(rmDir1Rad) - rightAngleSize * Math.sin(rmDir2Rad)}
                            L ${cx + rightAngleSize * Math.cos(rmDir2Rad)} ${cy - rightAngleSize * Math.sin(rmDir2Rad)}`}
                        fill="none"
                        stroke={typeColor}
                        strokeWidth={2}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                      />
                    ) : (
                      <motion.path
                        d={arcPath(cx, cy, angle.ray1Angle, angle.ray2Angle, arcRadius)}
                        fill="none"
                        stroke={typeColor}
                        strokeWidth={2}
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                    )}

                    {/* Degree label near arc midpoint */}
                    <motion.text
                      x={cx + (arcRadius + 14) * Math.cos(midAngleRad)}
                      y={cy - (arcRadius + 14) * Math.sin(midAngleRad)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fill: typeColor }}
                      fontSize={10}
                      fontWeight={600}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {angle.measure}°
                    </motion.text>

                    {/* Type name below */}
                    <motion.text
                      x={cx}
                      y={cy + rayLength + 18}
                      textAnchor="middle"
                      style={{ fill: typeColor }}
                      fontSize={11}
                      fontWeight={500}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {language === 'he' ? typeLabel?.he : typeLabel?.en}
                    </motion.text>

                    {/* Custom label */}
                    {angle.label && (
                      <motion.text
                        x={cx}
                        y={cy + rayLength + 32}
                        textAnchor="middle"
                        fill={accentColor}
                        fontSize={10}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {angle.label}
                      </motion.text>
                    )}
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          )
        })}
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

export default AngleTypes
