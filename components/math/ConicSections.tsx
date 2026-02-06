'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ConicSectionsData } from '@/types/math'
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

interface ConicSectionsProps {
  data: ConicSectionsData
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
  center: { en: 'Plot center/vertex', he: 'סימון מרכז/קודקוד' },
  curve: { en: 'Draw curve', he: 'ציור עקומה' },
  features: { en: 'Show foci/directrix', he: 'הצגת מוקדים/מדריכה' },
  equation: { en: 'Show equation', he: 'הצגת המשוואה' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function svgCoord(
  x: number,
  y: number,
  cx: number,
  cy: number,
  scale: number
): { sx: number; sy: number } {
  return { sx: cx + x * scale, sy: cy - y * scale }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConicSections({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ConicSectionsProps) {
  const {
    type: conicType,
    center,
    radiusX,
    radiusY,
    vertex,
    focus,
    directrix,
    a,
    b,
    orientation = 'horizontal',
    expression,
    showFoci,
    showDirectrix,
    showAsymptotes,
    title,
  } = data

  const cx = width / 2
  const cy = height / 2
  const scale = 25 // pixels per unit

  // Center or vertex point
  const mainPoint = center ?? vertex ?? { x: 0, y: 0 }

  // Build step definitions
  const hasFeatures = (showFoci && focus) || (showDirectrix && directrix !== undefined) || showAsymptotes
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'center', label: STEP_LABELS.center.en, labelHe: STEP_LABELS.center.he },
      { id: 'curve', label: STEP_LABELS.curve.en, labelHe: STEP_LABELS.curve.he },
    ]
    if (hasFeatures) {
      defs.push({ id: 'features', label: STEP_LABELS.features.en, labelHe: STEP_LABELS.features.he })
    }
    if (expression) {
      defs.push({ id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he })
    }
    return defs
  }, [hasFeatures, expression])

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

  // Generate conic path
  const conicPath = useMemo(() => {
    const mp = svgCoord(mainPoint.x, mainPoint.y, cx, cy, scale)

    switch (conicType) {
      case 'circle': {
        const r = (radiusX ?? 1) * scale
        return `M ${mp.sx - r} ${mp.sy} A ${r} ${r} 0 1 0 ${mp.sx + r} ${mp.sy} A ${r} ${r} 0 1 0 ${mp.sx - r} ${mp.sy}`
      }
      case 'ellipse': {
        const rx = (radiusX ?? 2) * scale
        const ry = (radiusY ?? 1) * scale
        return `M ${mp.sx - rx} ${mp.sy} A ${rx} ${ry} 0 1 0 ${mp.sx + rx} ${mp.sy} A ${rx} ${ry} 0 1 0 ${mp.sx - rx} ${mp.sy}`
      }
      case 'parabola': {
        const pts: string[] = []
        const vp = vertex ?? mainPoint
        const svgV = svgCoord(vp.x, vp.y, cx, cy, scale)
        // Determine direction: if focus is above vertex, opens up; etc.
        const fp = focus ?? { x: vp.x, y: vp.y + 1 }
        const opens = fp.y > vp.y ? 'up' : fp.y < vp.y ? 'down' : fp.x > vp.x ? 'right' : 'left'
        const p = Math.abs(opens === 'up' || opens === 'down' ? fp.y - vp.y : fp.x - vp.x)

        for (let t = -6; t <= 6; t += 0.1) {
          let px: number, py: number
          if (opens === 'up' || opens === 'down') {
            px = vp.x + t
            py = vp.y + (opens === 'up' ? 1 : -1) * (t * t) / (4 * p)
          } else {
            py = vp.y + t
            px = vp.x + (opens === 'right' ? 1 : -1) * (t * t) / (4 * p)
          }
          const s = svgCoord(px, py, cx, cy, scale)
          pts.push(`${pts.length === 0 ? 'M' : 'L'} ${s.sx} ${s.sy}`)
        }
        return pts.join(' ')
      }
      case 'hyperbola': {
        const ha = (a ?? 2) * scale
        const hb = (b ?? 1) * scale
        const hc = svgCoord(mainPoint.x, mainPoint.y, cx, cy, scale)

        // Two branches
        const branches: string[] = []
        for (const sign of [-1, 1]) {
          const pts: string[] = []
          if (orientation === 'horizontal') {
            for (let t = -3; t <= 3; t += 0.05) {
              const xVal = sign * (a ?? 2) * Math.cosh(t)
              const yVal = (b ?? 1) * Math.sinh(t)
              const s = svgCoord(mainPoint.x + xVal, mainPoint.y + yVal, cx, cy, scale)
              pts.push(`${pts.length === 0 ? 'M' : 'L'} ${s.sx} ${s.sy}`)
            }
          } else {
            for (let t = -3; t <= 3; t += 0.05) {
              const yVal = sign * (a ?? 2) * Math.cosh(t)
              const xVal = (b ?? 1) * Math.sinh(t)
              const s = svgCoord(mainPoint.x + xVal, mainPoint.y + yVal, cx, cy, scale)
              pts.push(`${pts.length === 0 ? 'M' : 'L'} ${s.sx} ${s.sy}`)
            }
          }
          branches.push(pts.join(' '))
        }
        return branches.join(' ')
      }
      default:
        return ''
    }
  }, [conicType, mainPoint, cx, cy, scale, radiusX, radiusY, vertex, focus, a, b, orientation])

  // Grid and axes
  const gridRange = 8

  return (
    <div
      data-testid="conic-sections"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="cs-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* SVG */}
      <svg
        data-testid="cs-svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="cs-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid lines */}
              {Array.from({ length: gridRange * 2 + 1 }, (_, i) => i - gridRange).map((v) => {
                const { sx: gx } = svgCoord(v, 0, cx, cy, scale)
                const { sy: gy } = svgCoord(0, v, cx, cy, scale)
                return (
                  <g key={`grid-${v}`}>
                    <line x1={gx} y1={0} x2={gx} y2={height} stroke={v === 0 ? '#374151' : '#e5e7eb'} strokeWidth={v === 0 ? diagram.lineWeight : 0.5} />
                    <line x1={0} y1={gy} x2={width} y2={gy} stroke={v === 0 ? '#374151' : '#e5e7eb'} strokeWidth={v === 0 ? diagram.lineWeight : 0.5} />
                  </g>
                )
              })}
              <text x={width - 10} y={cy + 14} fontSize={12} fill="#6b7280">x</text>
              <text x={cx + 8} y={14} fontSize={12} fill="#6b7280">y</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Center/vertex */}
        <AnimatePresence>
          {isVisible('center') && (
            <motion.g
              data-testid="cs-center"
              initial="hidden"
              animate={isCurrent('center') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {(() => {
                const { sx, sy } = svgCoord(mainPoint.x, mainPoint.y, cx, cy, scale)
                return (
                  <>
                    <circle cx={sx} cy={sy} r={5} fill={primaryColor} />
                    <text x={sx + 8} y={sy - 6} fontSize={11} fill={primaryColor} fontWeight={600}>
                      ({mainPoint.x}, {mainPoint.y})
                    </text>
                  </>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Curve */}
        <AnimatePresence>
          {isVisible('curve') && (
            <motion.g
              data-testid="cs-curve"
              initial="hidden"
              animate={isCurrent('curve') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={conicPath}
                fill="none"
                stroke={curveColor}
                strokeWidth={diagram.lineWeight + 1}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={pathDraw}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Features (foci, directrix, asymptotes) */}
        <AnimatePresence>
          {isVisible('features') && hasFeatures && (
            <motion.g
              data-testid="cs-features"
              initial="hidden"
              animate={isCurrent('features') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Focus point */}
              {showFoci && focus && (() => {
                const { sx, sy } = svgCoord(focus.x, focus.y, cx, cy, scale)
                return (
                  <g>
                    <circle cx={sx} cy={sy} r={4} fill={accentColor} />
                    <text x={sx + 8} y={sy - 4} fontSize={10} fill={accentColor}>F</text>
                  </g>
                )
              })()}

              {/* Directrix */}
              {showDirectrix && directrix !== undefined && (() => {
                const { sy: dy } = svgCoord(0, directrix, cx, cy, scale)
                return (
                  <g>
                    <line
                      x1={0}
                      y1={dy}
                      x2={width}
                      y2={dy}
                      stroke="#ef4444"
                      strokeWidth={diagram.lineWeight}
                      strokeDasharray="6 4"
                    />
                    <text x={8} y={dy - 4} fontSize={10} fill="#ef4444">
                      y = {directrix}
                    </text>
                  </g>
                )
              })()}

              {/* Hyperbola asymptotes */}
              {showAsymptotes && conicType === 'hyperbola' && a && b && (() => {
                const slopePos = orientation === 'horizontal' ? (b / a) : (a / b)
                const slopeNeg = -slopePos
                const mp = svgCoord(mainPoint.x, mainPoint.y, cx, cy, scale)
                const len = gridRange * scale
                return (
                  <>
                    <line
                      x1={mp.sx - len}
                      y1={mp.sy + slopePos * len}
                      x2={mp.sx + len}
                      y2={mp.sy - slopePos * len}
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                    <line
                      x1={mp.sx - len}
                      y1={mp.sy + slopeNeg * len}
                      x2={mp.sx + len}
                      y2={mp.sy - slopeNeg * len}
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                  </>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Equation */}
        <AnimatePresence>
          {isVisible('equation') && expression && (
            <motion.text
              data-testid="cs-equation"
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

      {/* Conic type label */}
      <div
        data-testid="cs-type-label"
        className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize"
      >
        {conicType}
      </div>

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

export default ConicSections
