'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RationalFunctionGraphData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  createPathDrawVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RationalFunctionGraphProps {
  data: RationalFunctionGraphData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  axes: { en: 'Draw axes', he: 'ציור צירים' },
  asymptotes: { en: 'Draw asymptotes', he: 'ציור אסימפטוטות' },
  curve: { en: 'Trace curve', he: 'ציור הגרף' },
  holes: { en: 'Mark holes', he: 'סימון חורים' },
  equation: { en: 'Show equation', he: 'הצגת המשוואה' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapToSVG(
  x: number,
  y: number,
  domain: { min: number; max: number },
  range: { min: number; max: number },
  svgW: number,
  svgH: number,
  padding: number
): { sx: number; sy: number } {
  const plotW = svgW - 2 * padding
  const plotH = svgH - 2 * padding
  const sx = padding + ((x - domain.min) / (domain.max - domain.min)) * plotW
  const sy = padding + ((range.max - y) / (range.max - range.min)) * plotH
  return { sx, sy }
}

/**
 * Parse a simple polynomial expression string like "x^2 - 4", "2x + 1", "x^3 - 3x"
 * into coefficients and evaluate at a given x value.
 * Supports terms like: ax^n, ax, a (constants).
 */
function evaluatePolynomialString(expr: string, x: number): number {
  // Normalize the expression
  let normalized = expr.replace(/\s/g, '')
  // Insert '+' before '-' that is not at the start for splitting
  normalized = normalized.replace(/(?<!^)(?<!\()(-)/g, '+-')

  const terms = normalized.split('+').filter(Boolean)
  let result = 0

  for (const term of terms) {
    if (term.includes('x')) {
      if (term.includes('^')) {
        // ax^n
        const parts = term.split('x^')
        const coeff = parts[0] === '' || parts[0] === '+' ? 1 : parts[0] === '-' ? -1 : parseFloat(parts[0])
        const exp = parseFloat(parts[1])
        result += coeff * Math.pow(x, exp)
      } else {
        // ax
        const parts = term.split('x')
        const coeff = parts[0] === '' || parts[0] === '+' ? 1 : parts[0] === '-' ? -1 : parseFloat(parts[0])
        result += coeff * x
      }
    } else {
      // constant
      result += parseFloat(term)
    }
  }

  return result
}

/**
 * Evaluate a rational function at x using the numerator and denominator expressions.
 * Returns null if the denominator is zero or the result is not finite.
 */
function evaluateRational(
  x: number,
  numerator: string,
  denominator: string
): number | null {
  try {
    const num = evaluatePolynomialString(numerator, x)
    const den = evaluatePolynomialString(denominator, x)
    if (Math.abs(den) < 1e-10) return null
    const val = num / den
    if (!isFinite(val) || isNaN(val)) return null
    return val
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RationalFunctionGraph({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: RationalFunctionGraphProps) {
  const {
    numerator,
    denominator,
    expression,
    verticalAsymptotes = [],
    horizontalAsymptote,
    holes = [],
    xIntercepts = [],
    domain: dataDomain,
    showAsymptotes,
    title,
  } = data

  const domain = dataDomain ?? { min: -10, max: 10 }
  const range = { min: -10, max: 10 }

  // Build step definitions
  const hasHoles = holes.length > 0
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'asymptotes', label: STEP_LABELS.asymptotes.en, labelHe: STEP_LABELS.asymptotes.he },
      { id: 'curve', label: STEP_LABELS.curve.en, labelHe: STEP_LABELS.curve.he },
    ]
    if (hasHoles) {
      defs.push({ id: 'holes', label: STEP_LABELS.holes.en, labelHe: STEP_LABELS.holes.he })
    }
    if (expression) {
      defs.push({ id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he })
    }
    return defs
  }, [hasHoles, expression])

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

  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent
  const curveColor = diagram.colors.curve

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const pathDraw = useMemo(() => createPathDrawVariants(0.8), [])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  const padding = 40

  // Generate curve path segments (split at vertical asymptotes)
  const curveSegments = useMemo(() => {
    const segments: Array<{ d: string }> = []
    const step = 0.05

    let currentPath: string[] = []
    for (let x = domain.min; x <= domain.max; x += step) {
      // Skip near vertical asymptotes
      const nearVA = verticalAsymptotes.some((va) => Math.abs(x - va) < 0.15)
      if (nearVA) {
        if (currentPath.length > 1) {
          segments.push({ d: currentPath.join(' ') })
        }
        currentPath = []
        continue
      }

      const y = evaluateRational(x, numerator, denominator)
      if (y === null || y < range.min - 5 || y > range.max + 5) {
        if (currentPath.length > 1) {
          segments.push({ d: currentPath.join(' ') })
        }
        currentPath = []
        continue
      }

      const { sx, sy } = mapToSVG(x, y, domain, range, width, height, padding)
      const cmd = currentPath.length === 0 ? `M ${sx} ${sy}` : `L ${sx} ${sy}`
      currentPath.push(cmd)
    }
    if (currentPath.length > 1) {
      segments.push({ d: currentPath.join(' ') })
    }
    return segments
  }, [numerator, denominator, domain, range, width, height, padding, verticalAsymptotes])

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = []
    for (let v = Math.ceil(domain.min); v <= Math.floor(domain.max); v++) {
      const { sx } = mapToSVG(v, 0, domain, range, width, height, padding)
      lines.push({ x1: sx, y1: padding, x2: sx, y2: height - padding, major: v === 0 })
    }
    for (let v = Math.ceil(range.min); v <= Math.floor(range.max); v++) {
      const { sy } = mapToSVG(0, v, domain, range, width, height, padding)
      lines.push({ x1: padding, y1: sy, x2: width - padding, y2: sy, major: v === 0 })
    }
    return lines
  }, [domain, range, width, height, padding])

  return (
    <div
      data-testid="rational-function-graph"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="rfg-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* SVG */}
      <svg
        data-testid="rfg-svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0: Axes and grid */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="rfg-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid */}
              {gridLines.map((l, i) => (
                <line
                  key={`grid-${i}`}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke={l.major ? '#374151' : '#e5e7eb'}
                  strokeWidth={l.major ? diagram.lineWeight : 0.5}
                />
              ))}
              {/* Axis labels */}
              {(() => {
                const { sx: ox, sy: oy } = mapToSVG(0, 0, domain, range, width, height, padding)
                return (
                  <>
                    <text x={width - padding + 8} y={oy + 4} fontSize={12} fill="#6b7280">x</text>
                    <text x={ox + 6} y={padding - 8} fontSize={12} fill="#6b7280">y</text>
                  </>
                )
              })()}
              {/* Tick labels */}
              {[...Array(Math.floor(domain.max) - Math.ceil(domain.min) + 1)].map((_, i) => {
                const v = Math.ceil(domain.min) + i
                if (v === 0) return null
                const { sx, sy } = mapToSVG(v, 0, domain, range, width, height, padding)
                return (
                  <text key={`xtick-${v}`} x={sx} y={sy + 14} textAnchor="middle" fontSize={10} fill="#9ca3af">
                    {v}
                  </text>
                )
              })}
              {[...Array(Math.floor(range.max) - Math.ceil(range.min) + 1)].map((_, i) => {
                const v = Math.ceil(range.min) + i
                if (v === 0) return null
                const { sx, sy } = mapToSVG(0, v, domain, range, width, height, padding)
                return (
                  <text key={`ytick-${v}`} x={sx - 10} y={sy + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                    {v}
                  </text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Asymptotes */}
        <AnimatePresence>
          {isVisible('asymptotes') && (
            <motion.g
              data-testid="rfg-asymptotes"
              initial="hidden"
              animate={isCurrent('asymptotes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Vertical asymptotes */}
              {verticalAsymptotes.map((va, i) => {
                const { sx } = mapToSVG(va, 0, domain, range, width, height, padding)
                return (
                  <g key={`va-${i}`}>
                    <line
                      x1={sx}
                      y1={padding}
                      x2={sx}
                      y2={height - padding}
                      stroke="#ef4444"
                      strokeWidth={diagram.lineWeight}
                      strokeDasharray="6 4"
                    />
                    <text x={sx + 4} y={padding + 12} fontSize={10} fill="#ef4444">
                      x={va}
                    </text>
                  </g>
                )
              })}
              {/* Horizontal asymptote */}
              {horizontalAsymptote !== undefined && (
                <g>
                  <line
                    x1={padding}
                    y1={mapToSVG(0, horizontalAsymptote, domain, range, width, height, padding).sy}
                    x2={width - padding}
                    y2={mapToSVG(0, horizontalAsymptote, domain, range, width, height, padding).sy}
                    stroke="#f59e0b"
                    strokeWidth={diagram.lineWeight}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={width - padding + 4}
                    y={mapToSVG(0, horizontalAsymptote, domain, range, width, height, padding).sy - 4}
                    fontSize={10}
                    fill="#f59e0b"
                  >
                    y={horizontalAsymptote}
                  </text>
                </g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Curve branches */}
        <AnimatePresence>
          {isVisible('curve') && (
            <motion.g
              data-testid="rfg-curve"
              initial="hidden"
              animate={isCurrent('curve') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {curveSegments.map((seg, i) => (
                <motion.path
                  key={`seg-${i}`}
                  d={seg.d}
                  fill="none"
                  stroke={curveColor}
                  strokeWidth={diagram.lineWeight + 1}
                  strokeLinecap="round"
                  initial="hidden"
                  animate="visible"
                  variants={pathDraw}
                />
              ))}
              {/* x-intercepts */}
              {xIntercepts.map((xi, i) => {
                const { sx, sy } = mapToSVG(xi, 0, domain, range, width, height, padding)
                return (
                  <circle
                    key={`xi-${i}`}
                    cx={sx}
                    cy={sy}
                    r={4}
                    fill={primaryColor}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Holes */}
        <AnimatePresence>
          {isVisible('holes') && hasHoles && (
            <motion.g
              data-testid="rfg-holes"
              initial="hidden"
              animate={isCurrent('holes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {holes.map((hole, i) => {
                const { sx, sy } = mapToSVG(hole.x, hole.y, domain, range, width, height, padding)
                return (
                  <g key={`hole-${i}`}>
                    <circle
                      cx={sx}
                      cy={sy}
                      r={5}
                      fill="white"
                      stroke={accentColor}
                      strokeWidth={diagram.lineWeight}
                    />
                    <text x={sx + 8} y={sy - 6} fontSize={10} fill={accentColor}>
                      ({hole.x}, {hole.y})
                    </text>
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Equation */}
        <AnimatePresence>
          {isVisible('equation') && expression && (
            <motion.text
              data-testid="rfg-equation"
              x={width / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize={14}
              fontWeight={600}
              fill={primaryColor}
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
            >
              {expression}
            </motion.text>
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

export default RationalFunctionGraph
