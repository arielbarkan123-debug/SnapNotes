'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

export type InequalityOperator = '<' | '>' | '<=' | '>=' | '!='

export interface InequalityData {
  /** Original inequality (e.g., "2x + 3 < 7") */
  originalInequality: string
  /** Variable being solved */
  variable: string
  /** Solution inequality (e.g., "x < 2") */
  solution: string
  /** Solution value (the boundary) */
  boundaryValue: number
  /** Final operator */
  finalOperator: InequalityOperator
  /** Interval notation (e.g., "(-inf, 2)" or "[3, inf)") */
  intervalNotation: string
  /** Number line bounds for visualization */
  numberLineBounds?: { min: number; max: number }
  /** Title */
  title?: string
  /** Error highlights for corrections */
  errors?: Array<{ message: string; messageHe?: string }>
}

export interface InequalityDiagramProps {
  data: InequalityData
  className?: string
  /** ViewBox width -- SVG scales responsively to container */
  width?: number
  height?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  initialStep?: number
  /** Legacy props for MathDiagramRenderer compatibility */
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
  axis: { en: 'Draw the number line', he: '\u05E6\u05D9\u05D5\u05E8 \u05E6\u05D9\u05E8 \u05D4\u05DE\u05E1\u05E4\u05E8\u05D9\u05DD' },
  ticks: { en: 'Add tick marks', he: '\u05D4\u05D5\u05E1\u05E4\u05EA \u05E1\u05D9\u05DE\u05E0\u05D9 \u05E1\u05D5\u05DC\u05DD' },
  region: { en: 'Show the inequality', he: '\u05D4\u05E6\u05D2\u05EA \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF' },
  boundaries: { en: 'Mark boundary points', he: '\u05E1\u05D9\u05DE\u05D5\u05DF \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D2\u05D1\u05D5\u05DC' },
  errors: { en: 'Show corrections', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * InequalityDiagram -- Phase 2 rebuild (SVG-based, similar to NumberLine).
 *
 * Quality standard checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] lineDrawVariants for SVG paths
 * - [x] labelAppearVariants for text elements
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 */
export function InequalityDiagram({
  data,
  className = '',
  width = 500,
  height = 120,
  subject = 'math',
  complexity: forcedComplexity,
  language = 'en',
  initialStep,
}: InequalityDiagramProps) {
  const {
    boundaryValue,
    finalOperator,
    solution,
    intervalNotation,
    title,
    errors,
  } = data

  const bounds = data.numberLineBounds || {
    min: Math.min(-5, boundaryValue - 5),
    max: Math.max(5, boundaryValue + 5),
  }

  const hasErrors = !!(errors && errors.length > 0)

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axis', label: STEP_LABELS.axis.en, labelHe: STEP_LABELS.axis.he },
      { id: 'ticks', label: STEP_LABELS.ticks.en, labelHe: STEP_LABELS.ticks.he },
      { id: 'region', label: STEP_LABELS.region.en, labelHe: STEP_LABELS.region.he },
      { id: 'boundaries', label: STEP_LABELS.boundaries.en, labelHe: STEP_LABELS.boundaries.he },
    ]
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [hasErrors])

  // useDiagramBase -- step control, colors, lineWeight, RTL
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

  const padding = { left: 40, right: 40, top: 25, bottom: 25 }
  const lineY = height - padding.bottom - 10
  const lineStartX = padding.left
  const lineEndX = width - padding.right
  const lineLength = lineEndX - lineStartX

  const safeRange = Math.abs(bounds.max - bounds.min) < 1e-10 ? 1 : bounds.max - bounds.min
  const valueToX = (value: number): number =>
    lineStartX + ((value - bounds.min) / safeRange) * lineLength

  // Tick marks
  const range = bounds.max - bounds.min
  const tickInterval = range <= 10 ? 1 : range <= 20 ? 2 : range <= 50 ? 5 : 10
  const ticks: number[] = []
  for (let v = Math.ceil(bounds.min / tickInterval) * tickInterval; v <= bounds.max; v += tickInterval) {
    ticks.push(v)
  }
  // Always include boundary value
  if (!ticks.includes(boundaryValue)) {
    ticks.push(boundaryValue)
    ticks.sort((a, b) => a - b)
  }

  // Determine shading direction
  const shadeLeft = finalOperator === '<' || finalOperator === '<='
  const inclusive = finalOperator === '<=' || finalOperator === '>='
  const boundaryX = valueToX(boundaryValue)

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="inequality-diagram"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-2">
          {title}
        </div>
      )}

      {/* Solution label */}
      {isVisible('boundaries') && (
        <div className="text-center mb-1 text-sm font-mono" style={{ color: diagram.colors.primary }}>
          {solution} &nbsp; {intervalNotation}
        </div>
      )}

      {/* SVG Diagram */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Inequality diagram: ${solution}`}
      >
        {/* Background */}
        <rect
          data-testid="ineq-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* -- Step 0: Axis ------------------------------------------------ */}
        <AnimatePresence>
          {isVisible('axis') && (
            <motion.g
              data-testid="ineq-axis"
              initial="hidden"
              animate={isCurrent('axis') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Main line */}
              <motion.path
                d={`M ${lineStartX} ${lineY} L ${lineEndX} ${lineY}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Left arrow */}
              <motion.polygon
                points={`${lineStartX - 8},${lineY} ${lineStartX},${lineY - 4} ${lineStartX},${lineY + 4}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
              />

              {/* Right arrow */}
              <motion.polygon
                points={`${lineEndX + 8},${lineY} ${lineEndX},${lineY - 4} ${lineEndX},${lineY + 4}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 1: Tick marks ------------------------------------------ */}
        <AnimatePresence>
          {isVisible('ticks') && (
            <motion.g
              data-testid="ineq-ticks"
              initial="hidden"
              animate={isCurrent('ticks') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {ticks.map((tick, index) => {
                const x = valueToX(tick)
                const isBoundary = tick === boundaryValue
                return (
                  <motion.g
                    key={`tick-${tick}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: index * 0.03 }}
                  >
                    <line
                      x1={x}
                      y1={lineY - (isBoundary ? 7 : 5)}
                      x2={x}
                      y2={lineY + (isBoundary ? 7 : 5)}
                      stroke="currentColor"
                      strokeWidth={isBoundary ? 2 : 1}
                    />
                    <text
                      x={x}
                      y={lineY + 20}
                      textAnchor="middle"
                      className="fill-current"
                      style={{
                        fontSize: isBoundary ? 13 : 11,
                        fontWeight: isBoundary ? 600 : 400,
                      }}
                    >
                      {tick}
                    </text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Inequality / solution region ------------------------ */}
        <AnimatePresence>
          {isVisible('region') && (
            <motion.g
              data-testid="ineq-region"
              initial="hidden"
              animate={isCurrent('region') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Shaded region */}
              <rect
                x={shadeLeft ? lineStartX : boundaryX}
                y={lineY - 8}
                width={shadeLeft ? boundaryX - lineStartX : lineEndX - boundaryX}
                height={16}
                fill={diagram.colors.primary}
                opacity={0.25}
              />

              {/* Solution line */}
              <motion.path
                d={
                  shadeLeft
                    ? `M ${boundaryX} ${lineY} L ${lineStartX} ${lineY}`
                    : `M ${boundaryX} ${lineY} L ${lineEndX} ${lineY}`
                }
                stroke={diagram.colors.primary}
                strokeWidth={4}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Direction arrow */}
              {shadeLeft ? (
                <motion.polygon
                  points={`${lineStartX},${lineY} ${lineStartX + 10},${lineY - 5} ${lineStartX + 10},${lineY + 5}`}
                  fill={diagram.colors.primary}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                />
              ) : (
                <motion.polygon
                  points={`${lineEndX},${lineY} ${lineEndX - 10},${lineY - 5} ${lineEndX - 10},${lineY + 5}`}
                  fill={diagram.colors.primary}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                />
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 3: Boundary points ------------------------------------ */}
        <AnimatePresence>
          {isVisible('boundaries') && (
            <motion.g
              data-testid="ineq-boundaries"
              initial="hidden"
              animate={isCurrent('boundaries') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={boundaryX}
                cy={lineY}
                r={7}
                fill={inclusive ? diagram.colors.primary : 'white'}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              {/* Label above boundary */}
              <motion.text
                x={boundaryX}
                y={lineY - 16}
                textAnchor="middle"
                className="font-medium"
                style={{ fontSize: 12, fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {boundaryValue}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 4: Error highlights ----------------------------------- */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="ineq-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Red X at boundary */}
              <line
                x1={boundaryX - 6}
                y1={lineY - 6}
                x2={boundaryX + 6}
                y2={lineY + 6}
                stroke="#EF4444"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <line
                x1={boundaryX + 6}
                y1={lineY - 6}
                x2={boundaryX - 6}
                y2={lineY + 6}
                stroke="#EF4444"
                strokeWidth={3}
                strokeLinecap="round"
              />
              {errors!.map((err, i) => (
                <text
                  key={`err-${i}`}
                  x={width / 2}
                  y={15 + i * 14}
                  textAnchor="middle"
                  style={{ fill: '#EF4444', fontSize: 11 }}
                >
                  {language === 'he' ? err.messageHe || err.message : err.message}
                </text>
              ))}
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

export default InequalityDiagram
