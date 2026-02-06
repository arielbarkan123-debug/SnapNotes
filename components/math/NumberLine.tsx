'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NumberLineData, NumberLineErrorHighlight } from '@/types'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import { useVisualComplexity } from '@/hooks/useVisualComplexity'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { CONCRETE_ICONS } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { detectCollisions, type BoundingBox, type LayoutElement } from '@/lib/visual-learning'
import { SVGArrow, SVGLabel } from '@/components/math/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NumberLineDataWithErrors extends NumberLineData {
  errorHighlight?: NumberLineErrorHighlight
}

interface NumberLineProps {
  data: NumberLineDataWithErrors
  className?: string
  /** ViewBox width — SVG scales responsively to container */
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  axis: { en: 'Draw the number line', he: 'ציור ציר המספרים' },
  ticks: { en: 'Add tick marks', he: 'הוספת סימני סולם' },
  points: { en: 'Mark the points', he: 'סימון הנקודות' },
  intervals: { en: 'Show intervals', he: 'הצגת הקטעים' },
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * NumberLine — Reference implementation for the Visual Learning Overhaul.
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
 * - [x] Age-adaptive (elementary concrete examples)
 * - [x] Uses shared SVG primitives (SVGArrow, SVGLabel)
 */
export function NumberLine({
  data,
  className = '',
  width = 500,
  height = 100,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: NumberLineProps) {
  const { min, max, points = [], intervals = [], title, errorHighlight } = data

  // Age-adaptive rendering (font sizes, concrete examples)
  const { complexity, fontSize, showConcreteExamples } = useVisualComplexity({
    forceComplexity: forcedComplexity,
  })
  const isElementary = complexity === 'elementary'

  // Determine which step groups exist based on data
  const hasPoints = points.length > 0
  const hasIntervals = intervals.length > 0
  const hasErrors = !!(
    errorHighlight?.wrongPoints?.length ||
    errorHighlight?.correctPoints?.length ||
    errorHighlight?.wrongIntervals?.length ||
    errorHighlight?.correctIntervals?.length
  )

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axis', label: STEP_LABELS.axis.en, labelHe: STEP_LABELS.axis.he },
      { id: 'ticks', label: STEP_LABELS.ticks.en, labelHe: STEP_LABELS.ticks.he },
    ]
    if (hasPoints) defs.push({ id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he })
    if (hasIntervals) defs.push({ id: 'intervals', label: STEP_LABELS.intervals.en, labelHe: STEP_LABELS.intervals.he })
    if (hasErrors) defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    return defs
  }, [hasPoints, hasIntervals, hasErrors])

  // useDiagramBase — step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
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

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const adjustedHeight = isElementary ? Math.max(height, 120) : height
  const padding = {
    left: isElementary ? 50 : 40,
    right: isElementary ? 50 : 40,
    top: isElementary ? 40 : 30,
    bottom: isElementary ? 30 : 20,
  }
  const lineY = adjustedHeight - padding.bottom - 15
  const lineStartX = padding.left
  const lineEndX = width - padding.right
  const lineLength = lineEndX - lineStartX

  const safeRange = Math.abs(max - min) < 1e-10 ? 1 : max - min
  const valueToX = (value: number): number =>
    lineStartX + ((value - min) / safeRange) * lineLength

  // Tick marks
  const range = max - min
  const tickInterval = range <= 10 ? 1 : range <= 20 ? 2 : range <= 50 ? 5 : 10
  const ticks: number[] = []
  for (let v = Math.ceil(min / tickInterval) * tickInterval; v <= max; v += tickInterval) {
    ticks.push(v)
  }

  // Label collision avoidance
  const labelPositions = useMemo(() => {
    const positions = new Map<number, { y: number; stagger: boolean }>()
    const labelHeight = isElementary ? 20 : 16
    const labelWidth = 30
    const baseY = lineY - (isElementary ? 16 : 12)

    const elements: LayoutElement[] = points
      .filter((p) => p.label)
      .map((point, i) => {
        const x = valueToX(point.value)
        const bounds: BoundingBox = {
          x: x - labelWidth / 2,
          y: baseY - labelHeight,
          width: labelWidth,
          height: labelHeight,
        }
        return { id: `label-${i}`, type: 'label' as const, position: { x, y: baseY }, bounds, priority: 1 }
      })

    const collisions = detectCollisions(elements)

    points.forEach((point, i) => {
      const hasCollision = collisions.some(
        (c) => c.element1 === `label-${i}` || c.element2 === `label-${i}`
      )
      const shouldStagger = hasCollision && i % 2 === 1
      positions.set(point.value, {
        y: shouldStagger ? baseY - labelHeight - 4 : baseY,
        stagger: shouldStagger,
      })
    })
    return positions
  }, [points, lineY, isElementary, valueToX])

  // Elementary concrete examples renderer
  const renderConcreteExample = (value: number, x: number, y: number) => {
    if (!showConcreteExamples || !isElementary) return null
    const absValue = Math.abs(Math.round(value))
    if (absValue > 10) return null
    const icon = value >= 0 ? CONCRETE_ICONS.apple : CONCRETE_ICONS.star
    const spacing = 12
    const startX = x - ((absValue - 1) * spacing) / 2
    return (
      <g>
        {Array.from({ length: absValue }).map((_, i) => (
          <text key={`concrete-${i}`} x={startX + i * spacing} y={y - 25} textAnchor="middle" fontSize={10}>
            {icon}
          </text>
        ))}
      </g>
    )
  }

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="number-line"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* SVG Diagram */}
      <svg
        width="100%"
        height={adjustedHeight}
        viewBox={`0 0 ${width} ${adjustedHeight}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Number line from ${min} to ${max}${title ? `: ${title}` : ''}${points.length ? ` with ${points.length} marked points` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="nl-background"
          width={width}
          height={adjustedHeight}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <g data-testid="nl-title">
            <SVGLabel
              x={width / 2}
              y={isElementary ? 20 : 15}
              text={title}
              textAnchor="middle"
              fontSize={fontSize.normal}
              fontWeight={500}
              className="fill-current"
              animate={false}
            />
          </g>
        )}

        {/* ── Step 0: Axis ─────────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('axis') && (
            <motion.g
              data-testid="nl-axis"
              initial="hidden"
              animate={isCurrent('axis') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Main line — draws from left to right */}
              <motion.path
                data-testid="nl-main-line"
                d={`M ${lineStartX} ${lineY} L ${lineEndX} ${lineY}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Left arrow (uses SVGArrow shared primitive) */}
              <SVGArrow
                x={lineStartX}
                y={lineY}
                direction="left"
                size={8}
              />

              {/* Right arrow (uses SVGArrow shared primitive) */}
              <SVGArrow
                x={lineEndX}
                y={lineY}
                direction="right"
                size={8}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Tick marks ────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('ticks') && (
            <motion.g
              data-testid="nl-ticks"
              initial="hidden"
              animate={isCurrent('ticks') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {ticks.map((tick, index) => {
                const x = valueToX(tick)
                return (
                  <motion.g
                    key={`tick-${tick}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: Math.min(index * 0.03, 1.5) }}
                  >
                    <line
                      data-testid={`nl-tick-${tick}`}
                      x1={x}
                      y1={lineY - (isElementary ? 6 : 5)}
                      x2={x}
                      y2={lineY + (isElementary ? 6 : 5)}
                      stroke="currentColor"
                      strokeWidth={isElementary ? 2 : 1}
                    />
                    <SVGLabel
                      x={x}
                      y={lineY + (isElementary ? 22 : 18)}
                      text={String(tick)}
                      textAnchor="middle"
                      fontSize={fontSize.small}
                      className="fill-current"
                      animate={false}
                    />
                    {renderConcreteExample(tick, x, lineY)}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Points ───────────────────────────────────────── */}
        <AnimatePresence>
          {hasPoints && isVisible('points') && (
            <motion.g
              data-testid="nl-points"
              initial="hidden"
              animate={isCurrent('points') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {points.map((point, index) => {
                const x = valueToX(point.value)
                const isFilled = point.style === 'filled'
                const pointRadius = isElementary ? 8 : 6

                return (
                  <motion.g
                    key={`point-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: isElementary ? 150 : 300,
                      damping: isElementary ? 15 : 25,
                      delay: Math.min(index * 0.1, 1.5),
                    }}
                  >
                    <circle
                      data-testid={`nl-point-${point.value}`}
                      cx={x}
                      cy={lineY}
                      r={pointRadius}
                      fill={isFilled ? diagram.colors.primary : 'white'}
                      stroke={diagram.colors.primary}
                      strokeWidth={isElementary ? 3 : 2}
                    />
                    {point.label && (
                      <>
                        {labelPositions.get(point.value)?.stagger && (
                          <line
                            x1={x}
                            y1={lineY - (isElementary ? 10 : 8)}
                            x2={x}
                            y2={labelPositions.get(point.value)?.y ?? lineY - 12}
                            stroke="currentColor"
                            strokeWidth={1}
                            strokeDasharray="2,2"
                            opacity={0.5}
                          />
                        )}
                        <SVGLabel
                          x={x}
                          y={labelPositions.get(point.value)?.y ?? lineY - (isElementary ? 16 : 12)}
                          text={point.label}
                          textAnchor="middle"
                          fontSize={fontSize.small}
                          fontWeight={500}
                          color={diagram.colors.primary}
                        />
                      </>
                    )}
                    {renderConcreteExample(point.value, x, lineY)}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Intervals ────────────────────────────────────── */}
        <AnimatePresence>
          {hasIntervals && isVisible('intervals') && (
            <motion.g
              data-testid="nl-intervals"
              initial="hidden"
              animate={isCurrent('intervals') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {intervals.map((interval, index) => {
                const sx = interval.start !== null ? valueToX(interval.start) : lineStartX
                const ex = interval.end !== null ? valueToX(interval.end) : lineEndX

                return (
                  <motion.g
                    key={`interval-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.15, 1.5) }}
                  >
                    {/* Shaded region */}
                    <rect
                      x={sx} y={lineY - 8}
                      width={ex - sx} height={16}
                      fill={interval.color || diagram.colors.primary}
                      opacity={0.3}
                    />
                    {/* Interval line */}
                    <motion.path
                      d={`M ${sx} ${lineY} L ${ex} ${lineY}`}
                      stroke={interval.color || diagram.colors.primary}
                      strokeWidth={4} fill="none"
                      initial="hidden" animate="visible" variants={lineDrawVariants}
                    />
                    {/* Infinity arrows */}
                    {interval.start === null && (
                      <polygon
                        points={`${lineStartX},${lineY} ${lineStartX + 10},${lineY - 5} ${lineStartX + 10},${lineY + 5}`}
                        fill={interval.color || diagram.colors.primary}
                      />
                    )}
                    {interval.end === null && (
                      <polygon
                        points={`${lineEndX},${lineY} ${lineEndX - 10},${lineY - 5} ${lineEndX - 10},${lineY + 5}`}
                        fill={interval.color || diagram.colors.primary}
                      />
                    )}
                    {/* Endpoint markers */}
                    {interval.start !== null && (
                      <circle
                        cx={valueToX(interval.start)} cy={lineY} r={5}
                        fill={interval.startInclusive ? (interval.color || diagram.colors.primary) : 'white'}
                        stroke={interval.color || diagram.colors.primary}
                        strokeWidth={2}
                      />
                    )}
                    {interval.end !== null && (
                      <circle
                        cx={valueToX(interval.end)} cy={lineY} r={5}
                        fill={interval.endInclusive ? (interval.color || diagram.colors.primary) : 'white'}
                        stroke={interval.color || diagram.colors.primary}
                        strokeWidth={2}
                      />
                    )}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Error highlights ─────────────────────────────── */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="nl-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Wrong points */}
              {errorHighlight?.wrongPoints?.map((point, index) => {
                const x = valueToX(point.value)
                return (
                  <g key={`wrong-point-${index}`} data-testid={`nl-wrong-${point.value}`}>
                    <line x1={x - 6} y1={lineY - 6} x2={x + 6} y2={lineY + 6} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
                    <line x1={x + 6} y1={lineY - 6} x2={x - 6} y2={lineY + 6} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
                    {point.errorLabel && (
                      <SVGLabel x={x} y={lineY - 16} text={point.errorLabel} textAnchor="middle" color="#EF4444" fontSize={12} fontWeight={500} animate={false} />
                    )}
                  </g>
                )
              })}

              {/* Correct points */}
              {errorHighlight?.correctPoints?.map((point, index) => {
                const x = valueToX(point.value)
                return (
                  <g key={`correct-point-${index}`} data-testid={`nl-correct-${point.value}`}>
                    <circle cx={x} cy={lineY} r={8} fill="#22C55E" opacity={0.2} />
                    <circle cx={x} cy={lineY} r={5} fill="#22C55E" stroke="white" strokeWidth={1} />
                    <path
                      d={`M ${x - 3} ${lineY} L ${x - 1} ${lineY + 2} L ${x + 3} ${lineY - 2}`}
                      stroke="white" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
                    />
                    {point.correctLabel && (
                      <SVGLabel x={x} y={lineY - 16} text={point.correctLabel} textAnchor="middle" color="#22C55E" fontSize={12} fontWeight={500} animate={false} />
                    )}
                  </g>
                )
              })}

              {/* Wrong intervals */}
              {errorHighlight?.wrongIntervals?.map((interval, index) => {
                const sx = interval.start !== null ? valueToX(interval.start) : lineStartX
                const ex = interval.end !== null ? valueToX(interval.end) : lineEndX
                return (
                  <g key={`wrong-interval-${index}`}>
                    <line x1={sx} y1={lineY - 12} x2={ex} y2={lineY - 12} stroke="#EF4444" strokeWidth={2} strokeDasharray="4,2" />
                    <SVGLabel x={sx} y={lineY - 18} text="&#x2717;" textAnchor="middle" color="#EF4444" fontSize={12} animate={false} />
                    <SVGLabel x={ex} y={lineY - 18} text="&#x2717;" textAnchor="middle" color="#EF4444" fontSize={12} animate={false} />
                  </g>
                )
              })}

              {/* Correct intervals */}
              {errorHighlight?.correctIntervals?.map((interval, index) => {
                const sx = interval.start !== null ? valueToX(interval.start) : lineStartX
                const ex = interval.end !== null ? valueToX(interval.end) : lineEndX
                return (
                  <g key={`correct-interval-${index}`}>
                    <rect x={sx} y={lineY - (isElementary ? 12 : 10)} width={ex - sx} height={isElementary ? 24 : 20} fill="#22C55E" opacity={0.15} />
                    <line x1={sx} y1={lineY} x2={ex} y2={lineY} stroke="#22C55E" strokeWidth={isElementary ? 5 : 4} />
                    <SVGLabel x={sx} y={lineY - (isElementary ? 22 : 18)} text={isElementary ? '\uD83D\uDC4D' : '\u2713'} textAnchor="middle" color="#22C55E" fontSize={fontSize.small} animate={false} />
                    <SVGLabel x={ex} y={lineY - (isElementary ? 22 : 18)} text={isElementary ? '\uD83D\uDC4D' : '\u2713'} textAnchor="middle" color="#22C55E" fontSize={fontSize.small} animate={false} />
                  </g>
                )
              })}
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

export default NumberLine
