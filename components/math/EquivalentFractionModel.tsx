'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { EquivalentFractionModelData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquivalentFractionModelProps {
  data: EquivalentFractionModelData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  onStepComplete?: () => void
  animationDuration?: number
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  first: { en: 'Show first fraction', he: 'הצגת השבר הראשון' },
  second: { en: 'Show second fraction', he: 'הצגת השבר השני' },
  highlight: { en: 'Highlight equal amounts', he: 'הדגשת כמויות שוות' },
  equals: { en: 'Show equivalence', he: 'הצגת שוויון' },
}

// ---------------------------------------------------------------------------
// SVG arc for circles
// ---------------------------------------------------------------------------

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180
  const endRad = ((endAngle - 90) * Math.PI) / 180
  const x1 = cx + radius * Math.cos(startRad)
  const y1 = cy + radius * Math.sin(startRad)
  const x2 = cx + radius * Math.cos(endRad)
  const y2 = cy + radius * Math.sin(endRad)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquivalentFractionModel({
  data,
  className = '',
  width = 500,
  height = 300,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: EquivalentFractionModelProps) {
  const { fraction1, fraction2, showAlignment, modelType = 'bar', title } = data

  const isCircle = modelType === 'circle' || modelType === 'both'
  const isBar = modelType === 'bar' || modelType === 'both'

  const stepDefs = useMemo(() => [
    { id: 'first', label: STEP_LABELS.first.en, labelHe: STEP_LABELS.first.he },
    { id: 'second', label: STEP_LABELS.second.en, labelHe: STEP_LABELS.second.he },
    { id: 'highlight', label: STEP_LABELS.highlight.en, labelHe: STEP_LABELS.highlight.he },
    { id: 'equals', label: STEP_LABELS.equals.en, labelHe: STEP_LABELS.equals.he },
  ], [])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'elementary',
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
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Geometry for bar models
  // ---------------------------------------------------------------------------

  const padding = { left: 40, right: 40, top: 45, bottom: 45 }
  const barWidth = width - padding.left - padding.right - 60 // Leave room for labels
  const barHeight = 36
  const barX = padding.left

  const modelStartY = padding.top + 10
  const bar1Y = modelStartY
  const bar2Y = modelStartY + barHeight + 24

  const partWidth1 = barWidth / Math.max(fraction1.denominator, 1)
  const partWidth2 = barWidth / Math.max(fraction2.denominator, 1)

  // Shaded widths
  const shaded1Width = partWidth1 * fraction1.numerator
  const shaded2Width = partWidth2 * fraction2.numerator

  // ---------------------------------------------------------------------------
  // Geometry for circle models
  // ---------------------------------------------------------------------------

  const circleRadius = Math.min(70, (width - 160) / 4)
  const circle1Cx = width * 0.3
  const circle2Cx = width * 0.7
  const circleCy = height / 2 + 5

  // ---------------------------------------------------------------------------
  // Render a bar fraction model
  // ---------------------------------------------------------------------------

  function renderBarModel(
    bx: number, by: number, bw: number, bh: number,
    num: number, denom: number, pw: number,
    fColor: string, prefix: string,
  ) {
    return (
      <g>
        {/* Outline */}
        <rect
          data-testid={`${prefix}-outline`}
          x={bx}
          y={by}
          width={bw}
          height={bh}
          fill="none"
          stroke="currentColor"
          strokeWidth={diagram.lineWeight}
          rx={3}
        />

        {/* Division lines */}
        {Array.from({ length: denom - 1 }, (_, i) => {
          const x = bx + (i + 1) * pw
          return (
            <line
              key={`${prefix}-div-${i}`}
              x1={x}
              y1={by}
              x2={x}
              y2={by + bh}
              stroke="currentColor"
              strokeWidth={diagram.lineWeight * 0.5}
            />
          )
        })}

        {/* Shaded parts */}
        {Array.from({ length: num }, (_, i) => (
          <rect
            key={`${prefix}-shade-${i}`}
            data-testid={`${prefix}-shade-${i}`}
            x={bx + i * pw}
            y={by}
            width={pw}
            height={bh}
            fill={fColor}
            fillOpacity={0.45}
            rx={i === 0 ? 3 : 0}
          />
        ))}

        {/* Label */}
        <text
          data-testid={`${prefix}-label`}
          x={bx + bw + 10}
          y={by + bh / 2 + 6}
          textAnchor="start"
          className="fill-current font-semibold"
          style={{ fontSize: 16 }}
        >
          {num}/{denom}
        </text>
      </g>
    )
  }

  // ---------------------------------------------------------------------------
  // Render a circle fraction model
  // ---------------------------------------------------------------------------

  function renderCircleModel(
    cx: number, cy: number, r: number,
    num: number, denom: number,
    fColor: string, prefix: string,
  ) {
    const sliceAngle = 360 / Math.max(denom, 1)
    return (
      <g>
        {/* Circle */}
        <circle
          data-testid={`${prefix}-circle`}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={diagram.lineWeight}
        />

        {/* Division lines */}
        {Array.from({ length: denom }, (_, i) => {
          const angle = ((i * sliceAngle - 90) * Math.PI) / 180
          const x2 = cx + r * Math.cos(angle)
          const y2 = cy + r * Math.sin(angle)
          return (
            <line
              key={`${prefix}-div-${i}`}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={diagram.lineWeight * 0.6}
            />
          )
        })}

        {/* Shaded sectors */}
        {Array.from({ length: num }, (_, i) => {
          const startAngle = i * sliceAngle
          const endAngle = (i + 1) * sliceAngle
          const path = describeArc(cx, cy, r, startAngle, endAngle)
          return (
            <path
              key={`${prefix}-sector-${i}`}
              data-testid={`${prefix}-sector-${i}`}
              d={path}
              fill={fColor}
              fillOpacity={0.45}
              stroke={fColor}
              strokeWidth={0.5}
            />
          )
        })}

        {/* Label */}
        <text
          data-testid={`${prefix}-label`}
          x={cx}
          y={cy + r + 22}
          textAnchor="middle"
          className="fill-current font-semibold"
          style={{ fontSize: 16 }}
        >
          {num}/{denom}
        </text>
      </g>
    )
  }

  return (
    <div
      data-testid="equivalent-fraction-model"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Equivalent fraction model: ${fraction1.numerator}/${fraction1.denominator} = ${fraction2.numerator}/${fraction2.denominator}${title ? ` - ${title}` : ''}`}
      >
        <rect width={width} height={height} rx={4} className="fill-white dark:fill-gray-900" />

        {/* Title */}
        {title && (
          <text
            data-testid="efm-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
          >
            {title}
          </text>
        )}

        {/* ── Step 0: First fraction model ─────────────────── */}
        <AnimatePresence>
          {isVisible('first') && (
            <motion.g
              data-testid="efm-first"
              initial="hidden"
              animate={isCurrent('first') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {isBar && renderBarModel(
                barX, bar1Y, barWidth, barHeight,
                fraction1.numerator, fraction1.denominator,
                partWidth1, primaryColor, 'efm-bar1',
              )}
              {isCircle && !isBar && renderCircleModel(
                circle1Cx, circleCy, circleRadius,
                fraction1.numerator, fraction1.denominator,
                primaryColor, 'efm-circle1',
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Second fraction model ────────────────── */}
        <AnimatePresence>
          {isVisible('second') && (
            <motion.g
              data-testid="efm-second"
              initial="hidden"
              animate={isCurrent('second') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {isBar && renderBarModel(
                barX, bar2Y, barWidth, barHeight,
                fraction2.numerator, fraction2.denominator,
                partWidth2, accentColor, 'efm-bar2',
              )}
              {isCircle && !isBar && renderCircleModel(
                circle2Cx, circleCy, circleRadius,
                fraction2.numerator, fraction2.denominator,
                accentColor, 'efm-circle2',
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Highlight equal amounts ──────────────── */}
        <AnimatePresence>
          {showAlignment && isVisible('highlight') && (
            <motion.g
              data-testid="efm-highlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: isCurrent('highlight') ? 1 : 0.7 }}
              transition={{ duration: 0.5 }}
            >
              {isBar && (
                <>
                  {/* Alignment lines connecting shaded regions */}
                  <motion.line
                    data-testid="efm-align-left"
                    x1={barX}
                    y1={bar1Y + barHeight}
                    x2={barX}
                    y2={bar2Y}
                    stroke={primaryColor}
                    strokeWidth={1.5}
                    strokeDasharray="4,3"
                    opacity={0.5}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  <motion.line
                    data-testid="efm-align-right"
                    x1={barX + shaded1Width}
                    y1={bar1Y + barHeight}
                    x2={barX + shaded2Width}
                    y2={bar2Y}
                    stroke={primaryColor}
                    strokeWidth={1.5}
                    strokeDasharray="4,3"
                    opacity={0.5}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                    transition={{ delay: 0.2 }}
                  />

                  {/* Highlight bracket for shaded area 1 */}
                  <motion.rect
                    x={barX - 2}
                    y={bar1Y - 2}
                    width={shaded1Width + 4}
                    height={barHeight + 4}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth={2.5}
                    rx={4}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  />

                  {/* Highlight bracket for shaded area 2 */}
                  <motion.rect
                    x={barX - 2}
                    y={bar2Y - 2}
                    width={shaded2Width + 4}
                    height={barHeight + 4}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={2.5}
                    rx={4}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  />
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Equals sign and labels ────────────────── */}
        <AnimatePresence>
          {isVisible('equals') && (
            <motion.g
              data-testid="efm-equals"
              initial="hidden"
              animate={isCurrent('equals') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                data-testid="efm-equals-text"
                x={width / 2}
                y={height - 18}
                textAnchor="middle"
                className="fill-current font-bold"
                style={{ fontSize: 20 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {fraction1.numerator}/{fraction1.denominator} = {fraction2.numerator}/{fraction2.denominator}
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
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default EquivalentFractionModel
