'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QuadraticGraphData } from '@/types/math'
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

interface QuadraticGraphProps {
  data: QuadraticGraphData
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
  axes: { en: 'Draw axes with grid', he: 'ציור צירים עם רשת' },
  vertex: { en: 'Plot vertex point', he: 'סימון נקודת קודקוד' },
  symmetry: { en: 'Draw axis of symmetry', he: 'ציור ציר סימטריה' },
  parabola: { en: 'Trace parabola', he: 'ציור פרבולה' },
  roots: { en: 'Mark roots on x-axis', he: 'סימון שורשים על ציר x' },
  equation: { en: 'Show equation', he: 'הצגת משוואה' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuadraticGraph({
  data,
  className = '',
  width = 500,
  height = 400,
  subject = 'math',
  complexity: forcedComplexity,
  language = 'en',
  initialStep,
}: QuadraticGraphProps) {
  const { a, b, c, expression, title } = data

  // Calculate vertex
  const vertex = data.vertex ?? {
    x: -b / (2 * a),
    y: a * (-b / (2 * a)) ** 2 + b * (-b / (2 * a)) + c,
  }
  const axisOfSymmetry = data.axisOfSymmetry ?? vertex.x

  // Calculate roots using quadratic formula
  const discriminant = b * b - 4 * a * c
  const roots = data.roots ?? (
    discriminant >= 0
      ? discriminant === 0
        ? [-b / (2 * a)]
        : [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)]
      : []
  )

  // Domain for drawing
  const domain = data.domain ?? {
    min: vertex.x - 5,
    max: vertex.x + 5,
  }

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'vertex', label: STEP_LABELS.vertex.en, labelHe: STEP_LABELS.vertex.he },
      { id: 'symmetry', label: STEP_LABELS.symmetry.en, labelHe: STEP_LABELS.symmetry.he },
      { id: 'parabola', label: STEP_LABELS.parabola.en, labelHe: STEP_LABELS.parabola.he },
      { id: 'roots', label: STEP_LABELS.roots.en, labelHe: STEP_LABELS.roots.he },
      { id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he },
    ]
    return defs
  }, [])

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
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = { left: 50, right: 30, top: 30, bottom: 40 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // Compute y-range from domain
  const yValues: number[] = []
  for (let x = domain.min; x <= domain.max; x += (domain.max - domain.min) / 50) {
    yValues.push(a * x * x + b * x + c)
  }
  yValues.push(vertex.y)
  const yMin = Math.min(...yValues, 0) - 1
  const yMax = Math.max(...yValues, 0) + 1

  const xRange = domain.max - domain.min
  const yRange = yMax - yMin

  const toSvgX = (val: number) => padding.left + ((val - domain.min) / xRange) * plotW
  const toSvgY = (val: number) => padding.top + ((yMax - val) / yRange) * plotH

  // Generate parabola path
  const numPoints = 100
  const parabolaPoints: string[] = []
  for (let i = 0; i <= numPoints; i++) {
    const x = domain.min + (i / numPoints) * xRange
    const y = a * x * x + b * x + c
    const svgX = toSvgX(x)
    const svgY = toSvgY(y)
    if (svgY >= padding.top - 10 && svgY <= height - padding.bottom + 10) {
      parabolaPoints.push(`${i === 0 || parabolaPoints.length === 0 ? 'M' : 'L'} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`)
    }
  }
  const parabolaPath = parabolaPoints.join(' ')

  // Grid lines
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

  const eqLabel = expression ?? `y = ${a !== 1 ? (a === -1 ? '-' : a) : ''}x² ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}x ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`}`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="quadratic-graph"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="qg-title"
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
        aria-label={`Quadratic graph: ${eqLabel}`}
      >
        <rect
          data-testid="qg-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Step 0: Axes with grid */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="qg-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid lines */}
              {gridXLines.map((x) => (
                <line
                  key={`gx-${x}`}
                  x1={toSvgX(x)}
                  y1={padding.top}
                  x2={toSvgX(x)}
                  y2={height - padding.bottom}
                  stroke="currentColor"
                  strokeWidth={0.3}
                  opacity={0.3}
                />
              ))}
              {gridYLines.map((y) => (
                <line
                  key={`gy-${y}`}
                  x1={padding.left}
                  y1={toSvgY(y)}
                  x2={width - padding.right}
                  y2={toSvgY(y)}
                  stroke="currentColor"
                  strokeWidth={0.3}
                  opacity={0.3}
                />
              ))}

              {/* X-axis */}
              <motion.path
                d={`M ${padding.left} ${toSvgY(0)} L ${width - padding.right} ${toSvgY(0)}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Y-axis */}
              <motion.path
                d={`M ${toSvgX(0)} ${padding.top} L ${toSvgX(0)} ${height - padding.bottom}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Axis tick labels */}
              {gridXLines.filter(x => x !== 0).map((x) => (
                <text
                  key={`lx-${x}`}
                  x={toSvgX(x)}
                  y={toSvgY(0) + 16}
                  textAnchor="middle"
                  className="fill-current"
                  style={{ fontSize: 10 }}
                >
                  {x}
                </text>
              ))}
              {gridYLines.filter(y => y !== 0).map((y) => (
                <text
                  key={`ly-${y}`}
                  x={toSvgX(0) - 10}
                  y={toSvgY(y) + 4}
                  textAnchor="end"
                  className="fill-current"
                  style={{ fontSize: 10 }}
                >
                  {y}
                </text>
              ))}

              {/* Axis labels */}
              <text
                x={width - padding.right + 10}
                y={toSvgY(0) + 4}
                className="fill-current"
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                x
              </text>
              <text
                x={toSvgX(0) + 8}
                y={padding.top - 8}
                className="fill-current"
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                y
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Vertex */}
        <AnimatePresence>
          {isVisible('vertex') && (
            <motion.g
              data-testid="qg-vertex"
              initial="hidden"
              animate={isCurrent('vertex') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={toSvgX(vertex.x)}
                cy={toSvgY(vertex.y)}
                r={6}
                fill={diagram.colors.primary}
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                x={toSvgX(vertex.x) + 10}
                y={toSvgY(vertex.y) - 10}
                style={{ fontSize: 11, fill: diagram.colors.primary, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                ({vertex.x.toFixed(1)}, {vertex.y.toFixed(1)})
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Axis of symmetry */}
        <AnimatePresence>
          {isVisible('symmetry') && (
            <motion.g
              data-testid="qg-symmetry"
              initial="hidden"
              animate={isCurrent('symmetry') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={`M ${toSvgX(axisOfSymmetry)} ${padding.top} L ${toSvgX(axisOfSymmetry)} ${height - padding.bottom}`}
                stroke={diagram.colors.accent}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6 4"
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={toSvgX(axisOfSymmetry) + 8}
                y={padding.top + 14}
                style={{ fontSize: 10, fill: diagram.colors.accent }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                x = {axisOfSymmetry.toFixed(1)}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Parabola curve */}
        <AnimatePresence>
          {isVisible('parabola') && (
            <motion.g
              data-testid="qg-parabola"
              initial="hidden"
              animate={isCurrent('parabola') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={parabolaPath}
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

        {/* Step 4: Roots */}
        <AnimatePresence>
          {isVisible('roots') && (
            <motion.g
              data-testid="qg-roots"
              initial="hidden"
              animate={isCurrent('roots') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {roots.map((root, i) => (
                <motion.g key={`root-${i}`}>
                  <motion.circle
                    cx={toSvgX(root)}
                    cy={toSvgY(0)}
                    r={5}
                    fill={diagram.colors.accent}
                    stroke="white"
                    strokeWidth={2}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.15 }}
                  />
                  <motion.text
                    x={toSvgX(root)}
                    y={toSvgY(0) + 18}
                    textAnchor="middle"
                    style={{ fontSize: 10, fill: diagram.colors.accent, fontWeight: 600 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {root.toFixed(2)}
                  </motion.text>
                </motion.g>
              ))}
              {roots.length === 0 && (
                <motion.text
                  x={width / 2}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  style={{ fontSize: 11, fill: diagram.colors.accent, fontStyle: 'italic' }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he' ? 'אין שורשים ממשיים' : 'No real roots'}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 5: Equation */}
        <AnimatePresence>
          {isVisible('equation') && (
            <motion.g
              data-testid="qg-equation"
              initial="hidden"
              animate={isCurrent('equation') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={width - padding.right - 150}
                y={padding.top + 5}
                width={145}
                height={26}
                rx={4}
                fill={diagram.colors.primary}
                opacity={0.1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.1 }}
              />
              <motion.text
                x={width - padding.right - 78}
                y={padding.top + 22}
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

export default QuadraticGraph
