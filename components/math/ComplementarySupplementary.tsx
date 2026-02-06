'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ComplementarySupplementaryData } from '@/types/math'
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

interface ComplementarySupplementaryProps {
  data: ComplementarySupplementaryData
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
  drawAngles: { en: 'Draw angles', he: 'ציור זוויות' },
  labelAngles: { en: 'Label angles', he: 'תיוג זוויות' },
  showSum: { en: 'Show sum', he: 'הצגת הסכום' },
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
  const x1 = cx + radius * Math.cos(startAngle * DEG)
  const y1 = cy - radius * Math.sin(startAngle * DEG)
  const x2 = cx + radius * Math.cos(endAngle * DEG)
  const y2 = cy - radius * Math.sin(endAngle * DEG)
  const diff = endAngle - startAngle
  const largeArc = Math.abs(diff) > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplementarySupplementary({
  data,
  className = '',
  width = 480,
  height = 380,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ComplementarySupplementaryProps) {
  const {
    angle1,
    angle2,
    relationship,
    showSum = true,
    vertex: customVertex,
    title,
  } = data

  const isComplementary = relationship === 'complementary'
  const totalAngle = isComplementary ? 90 : 180

  // Vertex position: default to a point that allows good visualization
  const vx = customVertex?.x ?? width / 2
  const vy = customVertex?.y ?? height * 0.6

  // Ray length
  const rayLength = Math.min(width, height) * 0.38

  // For complementary: start from 0 deg (right), angle1 goes up, angle2 continues to 90
  // For supplementary: start from 0 deg (right), angle1 goes up, angle2 continues to 180
  const ray1Angle = 0 // base ray along positive x-axis
  const ray2Angle = angle1 // dividing ray between the two angles
  const ray3Angle = angle1 + angle2 // terminal ray (should equal totalAngle)

  // Compute ray endpoints
  const rayEnd = (angleDeg: number) => ({
    x: vx + rayLength * Math.cos(angleDeg * DEG),
    y: vy - rayLength * Math.sin(angleDeg * DEG),
  })

  const ray1End = rayEnd(ray1Angle)
  const ray2End = rayEnd(ray2Angle)
  const ray3End = rayEnd(ray3Angle)

  // Arc radii for angle indicators
  const arcRadius1 = rayLength * 0.25
  const arcRadius2 = rayLength * 0.35

  // Label positions at arc midpoints
  const labelRadius = rayLength * 0.2
  const label1Mid = ray1Angle + angle1 / 2
  const label2Mid = ray2Angle + angle2 / 2

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawAngles', label: STEP_LABELS.drawAngles.en, labelHe: STEP_LABELS.drawAngles.he },
      { id: 'labelAngles', label: STEP_LABELS.labelAngles.en, labelHe: STEP_LABELS.labelAngles.he },
    ]
    if (showSum) {
      defs.push({ id: 'showSum', label: STEP_LABELS.showSum.en, labelHe: STEP_LABELS.showSum.he })
    }
    return defs
  }, [showSum])

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

  // Right-angle indicator square for complementary angles
  const rightAngleSize = 14
  const rightAngleSquare = useMemo(() => {
    if (!isComplementary) return null
    // Draw small square at the vertex between ray1 (0 deg) and ray3 (90 deg)
    const dx1 = Math.cos(ray1Angle * DEG)
    const dy1 = -Math.sin(ray1Angle * DEG)
    const dx3 = Math.cos(ray3Angle * DEG)
    const dy3 = -Math.sin(ray3Angle * DEG)
    const s = rightAngleSize
    const p1x = vx + s * dx1
    const p1y = vy + s * dy1
    const p2x = vx + s * dx1 + s * dx3
    const p2y = vy + s * dy1 + s * dy3
    const p3x = vx + s * dx3
    const p3y = vy + s * dy3
    return 'M ' + p1x + ' ' + p1y + ' L ' + p2x + ' ' + p2y + ' L ' + p3x + ' ' + p3y
  }, [isComplementary, vx, vy, ray1Angle, ray3Angle, rightAngleSize])

  const viewBox = '0 0 ' + width + ' ' + height

  // Sum equation text
  const sumEquation = '\u03B1 + \u03B2 = ' + angle1 + '\u00B0 + ' + angle2 + '\u00B0 = ' + totalAngle + '\u00B0'

  return (
    <div
      data-testid="complementary-supplementary"
      className={'bg-white dark:bg-gray-900 rounded-lg p-4 ' + className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="cs-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="cs-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw angles - rays, arcs, and right-angle / straight-line indicator */}
        <AnimatePresence>
          {isVisible('drawAngles') && (
            <motion.g
              data-testid="cs-draw-angles"
              initial="hidden"
              animate={isCurrent('drawAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Vertex dot */}
              <motion.circle
                cx={vx}
                cy={vy}
                r={diagram.lineWeight + 1}
                className="fill-gray-700 dark:fill-gray-300"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />

              {/* Ray 1: base ray (0 degrees) */}
              <motion.line
                x1={vx}
                y1={vy}
                x2={ray1End.x}
                y2={ray1End.y}
                stroke="#374151"
                className="dark:stroke-gray-300"
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Ray 2: dividing ray (angle1 degrees from base) */}
              <motion.line
                x1={vx}
                y1={vy}
                x2={ray2End.x}
                y2={ray2End.y}
                stroke="#374151"
                className="dark:stroke-gray-300"
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Ray 3: terminal ray (angle1 + angle2 degrees from base) */}
              <motion.line
                x1={vx}
                y1={vy}
                x2={ray3End.x}
                y2={ray3End.y}
                stroke="#374151"
                className="dark:stroke-gray-300"
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* For supplementary: extend base ray in opposite direction to show straight line */}
              {!isComplementary && (
                <motion.line
                  x1={vx}
                  y1={vy}
                  x2={vx - rayLength * 0.3}
                  y2={vy}
                  stroke="#374151"
                  className="dark:stroke-gray-300"
                  strokeWidth={diagram.lineWeight}
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )}

              {/* Angle 1 arc (primary color) */}
              <motion.path
                d={angleArcPath(vx, vy, ray1Angle, ray2Angle, arcRadius1)}
                fill="none"
                stroke={primaryColor}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Angle 2 arc (accent color) */}
              <motion.path
                d={angleArcPath(vx, vy, ray2Angle, ray3Angle, arcRadius2)}
                fill="none"
                stroke={accentColor}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Right-angle indicator for complementary */}
              {isComplementary && rightAngleSquare && (
                <motion.path
                  d={rightAngleSquare}
                  fill="none"
                  stroke="#6b7280"
                  className="dark:stroke-gray-400"
                  strokeWidth={1.5}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                />
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label angles - degree values on each arc */}
        <AnimatePresence>
          {isVisible('labelAngles') && (
            <motion.g
              data-testid="cs-label-angles"
              initial="hidden"
              animate={isCurrent('labelAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Angle 1 degree label */}
              <motion.text
                x={vx + (labelRadius + 18) * Math.cos(label1Mid * DEG)}
                y={vy - (labelRadius + 18) * Math.sin(label1Mid * DEG)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={600}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {angle1}°
              </motion.text>

              {/* Greek alpha symbol for angle 1 */}
              <motion.text
                x={vx + (arcRadius1 - 6) * Math.cos(label1Mid * DEG)}
                y={vy - (arcRadius1 - 6) * Math.sin(label1Mid * DEG)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={500}
                fill={primaryColor}
                fontStyle="italic"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                α
              </motion.text>

              {/* Angle 2 degree label */}
              <motion.text
                x={vx + (labelRadius + 30) * Math.cos(label2Mid * DEG)}
                y={vy - (labelRadius + 30) * Math.sin(label2Mid * DEG)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={600}
                fill={accentColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {angle2}°
              </motion.text>

              {/* Greek beta symbol for angle 2 */}
              <motion.text
                x={vx + (arcRadius2 - 6) * Math.cos(label2Mid * DEG)}
                y={vy - (arcRadius2 - 6) * Math.sin(label2Mid * DEG)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={500}
                fill={accentColor}
                fontStyle="italic"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                β
              </motion.text>

              {/* Relationship label */}
              <motion.text
                x={width / 2}
                y={height - 60}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                className="fill-gray-500 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? isComplementary
                    ? 'זוויות משלימות ל-90°'
                    : 'זוויות צמודות (משלימות ל-180°)'
                  : isComplementary
                    ? 'Complementary Angles'
                    : 'Supplementary Angles'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show sum equation (conditional on showSum) */}
        <AnimatePresence>
          {showSum && isVisible('showSum') && (
            <motion.g
              data-testid="cs-show-sum"
              initial="hidden"
              animate={isCurrent('showSum') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Sum equation */}
              <motion.text
                x={width / 2}
                y={height - 30}
                textAnchor="middle"
                fontSize={15}
                fontWeight={700}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sumEquation}
              </motion.text>

              {/* Descriptive text */}
              <motion.text
                x={width / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize={11}
                className="fill-gray-500 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? isComplementary
                    ? 'סכום הזוויות שווה ל-90°'
                    : 'סכום הזוויות שווה ל-180°'
                  : isComplementary
                    ? 'The angles sum to 90°'
                    : 'The angles sum to 180°'}
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

export default ComplementarySupplementary
