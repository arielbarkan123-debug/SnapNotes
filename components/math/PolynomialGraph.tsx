'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PolynomialGraphData } from '@/types/math'
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

interface PolynomialGraphProps {
  data: PolynomialGraphData
  className?: string
  width?: number
  height?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
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
  axes: { en: 'Draw axes', he: 'ציור צירים' },
  zeros: { en: 'Mark zeros', he: 'סימון שורשים' },
  curve: { en: 'Trace curve', he: 'ציור עקומה' },
  turning: { en: 'Label turning points', he: 'סימון נקודות קיצון' },
  endBehavior: { en: 'Show end behavior', he: 'הצגת התנהגות בקצוות' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function evaluatePolynomial(coefficients: number[], x: number): number {
  let result = 0
  for (let i = 0; i < coefficients.length; i++) {
    result += coefficients[i] * Math.pow(x, coefficients.length - 1 - i)
  }
  return result
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PolynomialGraph({
  data,
  className = '',
  width = 500,
  height = 400,
  subject = 'math',
  complexity: forcedComplexity,
  language = 'en',
  initialStep,
}: PolynomialGraphProps) {
  const { coefficients, expression, zeros, turningPoints, endBehavior, title } = data

  const domain = data.domain ?? { min: -5, max: 5 }

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'zeros', label: STEP_LABELS.zeros.en, labelHe: STEP_LABELS.zeros.he },
    { id: 'curve', label: STEP_LABELS.curve.en, labelHe: STEP_LABELS.curve.he },
    { id: 'turning', label: STEP_LABELS.turning.en, labelHe: STEP_LABELS.turning.he },
    { id: 'endBehavior', label: STEP_LABELS.endBehavior.en, labelHe: STEP_LABELS.endBehavior.he },
  ], [])

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

  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  const padding = { left: 50, right: 30, top: 30, bottom: 40 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // Compute y range
  const yValues: number[] = [0]
  for (let x = domain.min; x <= domain.max; x += (domain.max - domain.min) / 80) {
    yValues.push(evaluatePolynomial(coefficients, x))
  }
  if (turningPoints) {
    turningPoints.forEach((tp) => yValues.push(tp.y))
  }
  let yMin = Math.min(...yValues) - 1
  let yMax = Math.max(...yValues) + 1
  // Ensure reasonable range
  if (yMax - yMin < 2) { yMin -= 1; yMax += 1 }

  const xRange = domain.max - domain.min
  const yRange = yMax - yMin

  const toSvgX = (val: number) => padding.left + ((val - domain.min) / xRange) * plotW
  const toSvgY = (val: number) => padding.top + ((yMax - val) / yRange) * plotH

  // Generate curve path
  const numPts = 150
  const curvePoints: string[] = []
  for (let i = 0; i <= numPts; i++) {
    const x = domain.min + (i / numPts) * xRange
    const y = evaluatePolynomial(coefficients, x)
    const svgX = toSvgX(x)
    const svgY = toSvgY(y)
    if (svgY >= padding.top - 20 && svgY <= height - padding.bottom + 20) {
      curvePoints.push(`${curvePoints.length === 0 ? 'M' : 'L'} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`)
    }
  }
  const curvePath = curvePoints.join(' ')

  // Grid
  const gridXStep = xRange <= 10 ? 1 : xRange <= 20 ? 2 : 5
  const gridYStep = yRange <= 10 ? 1 : yRange <= 20 ? 2 : 5

  const gridXLines: number[] = []
  for (let x = Math.ceil(domain.min / gridXStep) * gridXStep; x <= domain.max; x += gridXStep) {
    gridXLines.push(x)
  }
  const gridYLines: number[] = []
  for (let y = Math.ceil(yMin / gridYStep) * gridYStep; y <= yMax; y += gridYStep) {
    gridYLines.push(y)
  }

  const eqLabel = expression ?? `Degree ${data.degree} polynomial`

  // End behavior arrows
  const leftArrowDir = endBehavior?.left === 'up' ? -1 : 1
  const rightArrowDir = endBehavior?.right === 'up' ? -1 : 1

  return (
    <div
      data-testid="polynomial-graph"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="pg-title"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Polynomial graph: ${eqLabel}`}
      >
        <rect
          data-testid="pg-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="pg-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {gridXLines.map((x) => (
                <line key={`gx-${x}`} x1={toSvgX(x)} y1={padding.top} x2={toSvgX(x)} y2={height - padding.bottom} stroke="currentColor" strokeWidth={0.3} opacity={0.3} />
              ))}
              {gridYLines.map((y) => (
                <line key={`gy-${y}`} x1={padding.left} y1={toSvgY(y)} x2={width - padding.right} y2={toSvgY(y)} stroke="currentColor" strokeWidth={0.3} opacity={0.3} />
              ))}
              <motion.path d={`M ${padding.left} ${toSvgY(0)} L ${width - padding.right} ${toSvgY(0)}`} stroke="currentColor" strokeWidth={diagram.lineWeight} fill="none" initial="hidden" animate="visible" variants={lineDrawVariants} />
              <motion.path d={`M ${toSvgX(0)} ${padding.top} L ${toSvgX(0)} ${height - padding.bottom}`} stroke="currentColor" strokeWidth={diagram.lineWeight} fill="none" initial="hidden" animate="visible" variants={lineDrawVariants} />
              {gridXLines.filter(x => x !== 0).map((x) => (
                <text key={`lx-${x}`} x={toSvgX(x)} y={toSvgY(0) + 16} textAnchor="middle" className="fill-current" style={{ fontSize: 10 }}>{x}</text>
              ))}
              {gridYLines.filter(y => y !== 0).map((y) => (
                <text key={`ly-${y}`} x={toSvgX(0) - 10} y={toSvgY(y) + 4} textAnchor="end" className="fill-current" style={{ fontSize: 10 }}>{y}</text>
              ))}
              <text x={width - padding.right + 10} y={toSvgY(0) + 4} className="fill-current" style={{ fontSize: 12, fontWeight: 500 }}>x</text>
              <text x={toSvgX(0) + 8} y={padding.top - 8} className="fill-current" style={{ fontSize: 12, fontWeight: 500 }}>y</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Zeros */}
        <AnimatePresence>
          {isVisible('zeros') && (
            <motion.g
              data-testid="pg-zeros"
              initial="hidden"
              animate={isCurrent('zeros') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {(zeros ?? []).map((z, i) => (
                <motion.g key={`zero-${i}`}>
                  <motion.circle
                    cx={toSvgX(z)}
                    cy={toSvgY(0)}
                    r={5}
                    fill={diagram.colors.accent}
                    stroke="white"
                    strokeWidth={2}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.12 }}
                  />
                  <motion.text
                    x={toSvgX(z)}
                    y={toSvgY(0) + 18}
                    textAnchor="middle"
                    style={{ fontSize: 10, fill: diagram.colors.accent, fontWeight: 600 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {z}
                  </motion.text>
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Curve */}
        <AnimatePresence>
          {isVisible('curve') && (
            <motion.g
              data-testid="pg-curve"
              initial="hidden"
              animate={isCurrent('curve') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={curvePath}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight + 1}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Turning points */}
        <AnimatePresence>
          {isVisible('turning') && (
            <motion.g
              data-testid="pg-turning"
              initial="hidden"
              animate={isCurrent('turning') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {(turningPoints ?? []).map((tp, i) => (
                <motion.g key={`tp-${i}`}>
                  <motion.circle
                    cx={toSvgX(tp.x)}
                    cy={toSvgY(tp.y)}
                    r={5}
                    fill={diagram.colors.primary}
                    stroke="white"
                    strokeWidth={2}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.15 }}
                  />
                  <motion.text
                    x={toSvgX(tp.x) + 10}
                    y={toSvgY(tp.y) - 8}
                    style={{ fontSize: 10, fill: diagram.colors.primary, fontWeight: 600 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    ({tp.x.toFixed(1)}, {tp.y.toFixed(1)})
                  </motion.text>
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: End behavior arrows */}
        <AnimatePresence>
          {isVisible('endBehavior') && endBehavior && (
            <motion.g
              data-testid="pg-end-behavior"
              initial="hidden"
              animate={isCurrent('endBehavior') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Left arrow */}
              <motion.path
                d={`M ${padding.left + 10} ${toSvgY(0)} L ${padding.left + 10} ${toSvgY(0) + leftArrowDir * 30}`}
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                fill="none"
                markerEnd="url(#arrowEnd)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={padding.left + 2}
                y={toSvgY(0) + leftArrowDir * 40}
                style={{ fontSize: 9, fill: diagram.colors.accent }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {endBehavior.left === 'up' ? '+\u221E' : '-\u221E'}
              </motion.text>

              {/* Right arrow */}
              <motion.path
                d={`M ${width - padding.right - 10} ${toSvgY(0)} L ${width - padding.right - 10} ${toSvgY(0) + rightArrowDir * 30}`}
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                fill="none"
                markerEnd="url(#arrowEnd)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={width - padding.right - 20}
                y={toSvgY(0) + rightArrowDir * 40}
                style={{ fontSize: 9, fill: diagram.colors.accent }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {endBehavior.right === 'up' ? '+\u221E' : '-\u221E'}
              </motion.text>

              {/* Arrow marker def */}
              <defs>
                <marker id="arrowEnd" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 Z" fill={diagram.colors.accent} />
                </marker>
              </defs>
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default PolynomialGraph
