'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LogarithmicGraphData } from '@/types/math'
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

interface LogarithmicGraphProps {
  data: LogarithmicGraphData
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
  asymptote: { en: 'Draw vertical asymptote', he: 'ציור אסימפטוטה אנכית' },
  keyPoints: { en: 'Plot key points', he: 'סימון נקודות מפתח' },
  curve: { en: 'Trace curve', he: 'ציור עקומה' },
  equation: { en: 'Show equation', he: 'הצגת משוואה' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LogarithmicGraph({
  data,
  className = '',
  width = 500,
  height = 400,
  subject = 'math',
  complexity: forcedComplexity,
  language = 'en',
  initialStep,
}: LogarithmicGraphProps) {
  const { base, asymptote, expression, title, keyPoints } = data
  const coefficient = data.coefficient ?? 1

  const domain = data.domain ?? { min: asymptote - 0.5, max: asymptote + 10 }

  const stepDefs = useMemo(() => [
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'asymptote', label: STEP_LABELS.asymptote.en, labelHe: STEP_LABELS.asymptote.he },
    { id: 'keyPoints', label: STEP_LABELS.keyPoints.en, labelHe: STEP_LABELS.keyPoints.he },
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

  // Default key points: (asymptote+1, 0), (asymptote+base, coeff)
  const defaultKeyPoints = [
    { x: asymptote + 1, y: 0, label: `(${asymptote + 1}, 0)` },
    { x: asymptote + base, y: coefficient, label: `(${asymptote + base}, ${coefficient})` },
  ]
  const effectiveKeyPoints = keyPoints ?? defaultKeyPoints

  // Compute y range
  const yValues: number[] = [0]
  effectiveKeyPoints.forEach((p) => yValues.push(p.y))
  const startX = Math.max(asymptote + 0.01, domain.min)
  for (let x = startX; x <= domain.max; x += (domain.max - startX) / 60) {
    const arg = x - asymptote
    if (arg > 0) {
      yValues.push(coefficient * (Math.log(arg) / Math.log(base)))
    }
  }
  let yMin = Math.min(...yValues) - 1
  let yMax = Math.max(...yValues) + 1
  if (yMax - yMin < 4) { yMin -= 2; yMax += 2 }

  const xRange = domain.max - domain.min
  const yRange = yMax - yMin

  const toSvgX = (val: number) => pad.left + ((val - domain.min) / xRange) * plotW
  const toSvgY = (val: number) => pad.top + ((yMax - val) / yRange) * plotH

  // Generate curve path (only where argument > 0)
  const numPts = 150
  const curvePoints: string[] = []
  for (let i = 0; i <= numPts; i++) {
    const x = startX + (i / numPts) * (domain.max - startX)
    const arg = x - asymptote
    if (arg <= 0) continue
    const y = coefficient * (Math.log(arg) / Math.log(base))
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

  const eqLabel = expression ?? `y = log_${base}(x${asymptote !== 0 ? ` - ${asymptote}` : ''})`

  return (
    <div
      data-testid="logarithmic-graph"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="lg-title"
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
        aria-label={`Logarithmic graph: ${eqLabel}`}
      >
        <rect
          data-testid="lg-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="lg-axes"
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

        {/* Step 1: Vertical asymptote */}
        <AnimatePresence>
          {isVisible('asymptote') && (
            <motion.g
              data-testid="lg-asymptote"
              initial="hidden"
              animate={isCurrent('asymptote') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
            >
              <motion.path
                d={`M ${toSvgX(asymptote)} ${pad.top} L ${toSvgX(asymptote)} ${height - pad.bottom}`}
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="8 4"
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={toSvgX(asymptote) + 8}
                y={pad.top + 14}
                style={{ fontSize: 10, fill: diagram.colors.accent }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                x = {asymptote}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Key points */}
        <AnimatePresence>
          {isVisible('keyPoints') && (
            <motion.g
              data-testid="lg-key-points"
              initial="hidden"
              animate={isCurrent('keyPoints') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
            >
              {effectiveKeyPoints.map((pt, i) => (
                <motion.g key={`kp-${i}`}>
                  <motion.circle
                    cx={toSvgX(pt.x)}
                    cy={toSvgY(pt.y)}
                    r={5}
                    fill={diagram.colors.primary}
                    stroke="white"
                    strokeWidth={2}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.15 }}
                  />
                  {pt.label && (
                    <motion.text
                      x={toSvgX(pt.x) + 10}
                      y={toSvgY(pt.y) - 8}
                      style={{ fontSize: 10, fill: diagram.colors.primary, fontWeight: 600 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {pt.label}
                    </motion.text>
                  )}
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Curve */}
        <AnimatePresence>
          {isVisible('curve') && (
            <motion.g
              data-testid="lg-curve"
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
              data-testid="lg-equation"
              initial="hidden"
              animate={isCurrent('equation') ? 'spotlight' : 'visible'}
              variants={spotlightVars}
            >
              <motion.rect
                x={width - pad.right - 170}
                y={pad.top + 5}
                width={165}
                height={26}
                rx={4}
                fill={diagram.colors.primary}
                opacity={0.1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.1 }}
              />
              <motion.text
                x={width - pad.right - 88}
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

export default LogarithmicGraph
