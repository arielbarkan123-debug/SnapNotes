'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExponentialGraphData } from '@/types/math'
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

interface ExponentialGraphProps {
  data: ExponentialGraphData
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
  asymptote: { en: 'Draw horizontal asymptote', he: 'ציור אסימפטוטה אופקית' },
  yIntercept: { en: 'Plot y-intercept', he: 'סימון נקודת חיתוך עם y' },
  curve: { en: 'Trace curve', he: 'ציור עקומה' },
  equation: { en: 'Show equation', he: 'הצגת משוואה' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExponentialGraph({
  data,
  className = '',
  width = 500,
  height = 400,
  subject = 'math',
  complexity: forcedComplexity,
  language = 'en',
  initialStep,
}: ExponentialGraphProps) {
  const { base, asymptote, expression, isGrowth, title } = data
  const coefficient = data.coefficient ?? 1
  const yInterceptVal = data.yIntercept ?? (coefficient + asymptote)

  const domain = data.domain ?? { min: -4, max: 4 }

  const stepDefs = useMemo(() => [
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'asymptote', label: STEP_LABELS.asymptote.en, labelHe: STEP_LABELS.asymptote.he },
    { id: 'yIntercept', label: STEP_LABELS.yIntercept.en, labelHe: STEP_LABELS.yIntercept.he },
    { id: 'curve', label: STEP_LABELS.curve.en, labelHe: STEP_LABELS.curve.he },
    { id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he },
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

  const spotlightVars = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  const pad = { left: 50, right: 30, top: 30, bottom: 40 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  // Compute y range
  const yValues: number[] = [0, asymptote, yInterceptVal]
  for (let x = domain.min; x <= domain.max; x += (domain.max - domain.min) / 60) {
    yValues.push(coefficient * Math.pow(base, x) + asymptote)
  }
  let yMin = Math.min(...yValues) - 1
  let yMax = Math.max(...yValues) + 1
  if (yMax - yMin < 4) { yMin -= 2; yMax += 2 }

  const xRange = domain.max - domain.min
  const yRange = yMax - yMin

  const toSvgX = (val: number) => pad.left + ((val - domain.min) / xRange) * plotW
  const toSvgY = (val: number) => pad.top + ((yMax - val) / yRange) * plotH

  // Generate curve path
  const numPts = 120
  const curvePoints: string[] = []
  for (let i = 0; i <= numPts; i++) {
    const x = domain.min + (i / numPts) * xRange
    const y = coefficient * Math.pow(base, x) + asymptote
    const svgX = toSvgX(x)
    const svgY = toSvgY(y)
    if (svgY >= pad.top - 20 && svgY <= height - pad.bottom + 20) {
      curvePoints.push(`${curvePoints.length === 0 ? 'M' : 'L'} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`)
    }
  }
  const curvePath = curvePoints.join(' ')

  // Grid
  const gridXStep = xRange <= 10 ? 1 : xRange <= 20 ? 2 : 5
  const gridYStep = yRange <= 10 ? 1 : yRange <= 20 ? 2 : 5
  const gridXLines: number[] = []
  for (let x = Math.ceil(domain.min / gridXStep) * gridXStep; x <= domain.max; x += gridXStep) gridXLines.push(x)
  const gridYLines: number[] = []
  for (let y = Math.ceil(yMin / gridYStep) * gridYStep; y <= yMax; y += gridYStep) gridYLines.push(y)

  const eqLabel = expression ?? `y = ${coefficient !== 1 ? coefficient : ''}${'\u00B7'}${base}^x ${asymptote >= 0 ? `+ ${asymptote}` : `- ${Math.abs(asymptote)}`}`

  return (
    <div
      data-testid="exponential-graph"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="eg-title"
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
        aria-label={`Exponential graph: ${isGrowth ? 'growth' : 'decay'}`}
      >
        <rect
          data-testid="eg-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="eg-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
            >
              {gridXLines.map((x) => (
                <line key={`gx-${x}`} x1={toSvgX(x)} y1={pad.top} x2={toSvgX(x)} y2={height - pad.bottom} stroke="currentColor" strokeWidth={0.3} opacity={0.3} />
              ))}
              {gridYLines.map((y) => (
                <line key={`gy-${y}`} x1={pad.left} y1={toSvgY(y)} x2={width - pad.right} y2={toSvgY(y)} stroke="currentColor" strokeWidth={0.3} opacity={0.3} />
              ))}
              <motion.path d={`M ${pad.left} ${toSvgY(0)} L ${width - pad.right} ${toSvgY(0)}`} stroke="currentColor" strokeWidth={diagram.lineWeight} fill="none" initial="hidden" animate="visible" variants={lineDrawVariants} />
              <motion.path d={`M ${toSvgX(0)} ${pad.top} L ${toSvgX(0)} ${height - pad.bottom}`} stroke="currentColor" strokeWidth={diagram.lineWeight} fill="none" initial="hidden" animate="visible" variants={lineDrawVariants} />
              {gridXLines.filter(x => x !== 0).map((x) => (
                <text key={`lx-${x}`} x={toSvgX(x)} y={toSvgY(0) + 16} textAnchor="middle" className="fill-current" style={{ fontSize: 10 }}>{x}</text>
              ))}
              {gridYLines.filter(y => y !== 0).map((y) => (
                <text key={`ly-${y}`} x={toSvgX(0) - 10} y={toSvgY(y) + 4} textAnchor="end" className="fill-current" style={{ fontSize: 10 }}>{y}</text>
              ))}
              <text x={width - pad.right + 10} y={toSvgY(0) + 4} className="fill-current" style={{ fontSize: 12, fontWeight: 500 }}>x</text>
              <text x={toSvgX(0) + 8} y={pad.top - 8} className="fill-current" style={{ fontSize: 12, fontWeight: 500 }}>y</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Asymptote */}
        <AnimatePresence>
          {isVisible('asymptote') && (
            <motion.g
              data-testid="eg-asymptote"
              initial="hidden"
              animate={isCurrent('asymptote') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
            >
              <motion.path
                d={`M ${pad.left} ${toSvgY(asymptote)} L ${width - pad.right} ${toSvgY(asymptote)}`}
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="8 4"
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={width - pad.right - 5}
                y={toSvgY(asymptote) - 8}
                textAnchor="end"
                style={{ fontSize: 10, fill: diagram.colors.accent }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                y = {asymptote}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Y-intercept */}
        <AnimatePresence>
          {isVisible('yIntercept') && (
            <motion.g
              data-testid="eg-y-intercept"
              initial="hidden"
              animate={isCurrent('yIntercept') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
            >
              <motion.circle
                cx={toSvgX(0)}
                cy={toSvgY(yInterceptVal)}
                r={6}
                fill={diagram.colors.primary}
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                x={toSvgX(0) + 10}
                y={toSvgY(yInterceptVal) - 10}
                style={{ fontSize: 11, fill: diagram.colors.primary, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                (0, {yInterceptVal})
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Curve */}
        <AnimatePresence>
          {isVisible('curve') && (
            <motion.g
              data-testid="eg-curve"
              initial="hidden"
              animate={isCurrent('curve') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
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

        {/* Step 4: Equation */}
        <AnimatePresence>
          {isVisible('equation') && (
            <motion.g
              data-testid="eg-equation"
              initial="hidden"
              animate={isCurrent('equation') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
            >
              <motion.rect
                x={width - pad.right - 160}
                y={pad.top + 5}
                width={155}
                height={26}
                rx={4}
                fill={diagram.colors.primary}
                opacity={0.1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.1 }}
              />
              <motion.text
                x={width - pad.right - 83}
                y={pad.top + 22}
                textAnchor="middle"
                style={{ fontSize: 12, fill: diagram.colors.primary, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {eqLabel}
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default ExponentialGraph
