'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ComplementarySupplementaryData } from '@/types/geometry'
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
  baseRay: { en: 'Draw vertex and base ray', he: 'ציור קודקוד וקרן בסיס' },
  angle1: { en: 'Draw first angle', he: 'ציור זווית ראשונה' },
  angle2: { en: 'Draw second angle', he: 'ציור זווית שנייה' },
  equation: { en: 'Show sum equation', he: 'הצגת משוואת סכום' },
}

interface ComplementarySupplementaryProps {
  data: ComplementarySupplementaryData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * ComplementarySupplementary - Two angles summing to 90° or 180°
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
export function ComplementarySupplementary({
  data,
  width = 400,
  height = 350,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: ComplementarySupplementaryProps) {
  const {
    angle1,
    angle2,
    relationship,
    showSum = true,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'baseRay', label: STEP_LABELS.baseRay.en, labelHe: STEP_LABELS.baseRay.he },
      { id: 'angle1', label: STEP_LABELS.angle1.en, labelHe: STEP_LABELS.angle1.he },
      { id: 'angle2', label: STEP_LABELS.angle2.en, labelHe: STEP_LABELS.angle2.he },
    ]
    if (showSum) {
      defs.push({ id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he })
    }
    return defs
  }, [showSum])

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

  // Geometry: rays from vertex
  const vx = width * 0.3
  const vy = height * 0.6
  const rayLength = Math.min(width * 0.4, 150)

  const pointOnRay = (angleDeg: number, len: number = rayLength) => ({
    x: vx + len * Math.cos((angleDeg * Math.PI) / 180),
    y: vy - len * Math.sin((angleDeg * Math.PI) / 180),
  })

  // Base ray along 0 degrees (right)
  const baseEnd = pointOnRay(0)
  // Middle ray at angle1 from base
  const middleEnd = pointOnRay(angle1)
  // Top ray at angle1 + angle2 from base
  const topEnd = pointOnRay(angle1 + angle2)

  const arcRadius = rayLength * 0.3
  const arcRadius2 = rayLength * 0.4

  // Arc path
  const makeArc = (startDeg: number, endDeg: number, r: number) => {
    const start = pointOnRay(startDeg, r)
    const end = pointOnRay(endDeg, r)
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  const sumValue = relationship === 'complementary' ? 90 : 180
  const sumLabel = `${angle1}° + ${angle2}° = ${sumValue}°`
  const relationLabel = relationship === 'complementary'
    ? (language === 'he' ? 'זוויות משלימות ל-90°' : 'Complementary Angles')
    : (language === 'he' ? 'זוויות משלימות ל-180°' : 'Supplementary Angles')

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Color coding
  const color1 = GEOMETRY_COLORS.highlight.primary
  const color2 = GEOMETRY_COLORS.highlight.secondary

  return (
    <div
      data-testid="complementary-supplementary-diagram"
      className={`geometry-comp-supp ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={title || `${relationship} angles diagram`}
      >
        {/* Background */}
        <rect
          data-testid="comp-supp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="comp-supp-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: Vertex and base ray */}
        <AnimatePresence>
          {isVisible('baseRay') && (
            <motion.g
              data-testid="comp-supp-base-ray"
              initial="hidden"
              animate={isCurrent('baseRay') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={vx}
                cy={vy}
                r={diagram.lineWeight + 1}
                fill="currentColor"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
              <motion.line
                x1={vx}
                y1={vy}
                x2={baseEnd.x}
                y2={baseEnd.y}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: First angle */}
        <AnimatePresence>
          {isVisible('angle1') && (
            <motion.g
              data-testid="comp-supp-angle1"
              initial="hidden"
              animate={isCurrent('angle1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Middle ray */}
              <motion.line
                x1={vx}
                y1={vy}
                x2={middleEnd.x}
                y2={middleEnd.y}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Angle 1 arc */}
              <motion.path
                d={makeArc(0, angle1, arcRadius)}
                fill="none"
                stroke={color1}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Angle 1 fill */}
              <motion.path
                d={`M ${vx} ${vy} L ${pointOnRay(0, arcRadius).x} ${pointOnRay(0, arcRadius).y} ${makeArc(0, angle1, arcRadius).replace('M', 'A').replace(/A.*/, '')} A ${arcRadius} ${arcRadius} 0 0 0 ${pointOnRay(angle1, arcRadius).x} ${pointOnRay(angle1, arcRadius).y} Z`}
                fill={color1}
                fillOpacity={0.15}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              />
              {/* Label */}
              <motion.text
                x={vx + (arcRadius + 16) * Math.cos((angle1 / 2) * Math.PI / 180)}
                y={vy - (arcRadius + 16) * Math.sin((angle1 / 2) * Math.PI / 180)}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: color1 }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.2 }}
              >
                {angle1}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Second angle */}
        <AnimatePresence>
          {isVisible('angle2') && (
            <motion.g
              data-testid="comp-supp-angle2"
              initial="hidden"
              animate={isCurrent('angle2') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Top ray */}
              <motion.line
                x1={vx}
                y1={vy}
                x2={topEnd.x}
                y2={topEnd.y}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Angle 2 arc */}
              <motion.path
                d={makeArc(angle1, angle1 + angle2, arcRadius2)}
                fill="none"
                stroke={color2}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Angle 2 fill */}
              <motion.path
                d={`M ${vx} ${vy} L ${pointOnRay(angle1, arcRadius2).x} ${pointOnRay(angle1, arcRadius2).y} A ${arcRadius2} ${arcRadius2} 0 0 0 ${pointOnRay(angle1 + angle2, arcRadius2).x} ${pointOnRay(angle1 + angle2, arcRadius2).y} Z`}
                fill={color2}
                fillOpacity={0.15}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              />
              {/* Label */}
              <motion.text
                x={vx + (arcRadius2 + 16) * Math.cos(((angle1 + (angle1 + angle2)) / 2) * Math.PI / 180)}
                y={vy - (arcRadius2 + 16) * Math.sin(((angle1 + (angle1 + angle2)) / 2) * Math.PI / 180)}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: color2 }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.2 }}
              >
                {angle2}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Sum equation */}
        <AnimatePresence>
          {showSum && isVisible('equation') && (
            <motion.g
              data-testid="comp-supp-equation"
              initial="hidden"
              animate={isCurrent('equation') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width * 0.65}
                y={height * 0.2}
                textAnchor="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {relationLabel}
              </motion.text>
              <motion.text
                x={width * 0.65}
                y={height * 0.2 + 24}
                textAnchor="middle"
                className="fill-current text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.15 }}
              >
                {sumLabel}
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

export default ComplementarySupplementary
