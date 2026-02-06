'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ComplexNumberPlaneData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ComplexNumberPlaneProps {
  data: ComplexNumberPlaneData
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
  points: { en: 'Plot points', he: 'סימון נקודות' },
  modulus: { en: 'Show modulus/argument', he: 'הצגת מודולוס/ארגומנט' },
  operations: { en: 'Show operations', he: 'הצגת פעולות' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POINT_COLORS = [
  '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#3b82f6',
]

function formatComplex(real: number, imag: number): string {
  if (imag === 0) return `${real}`
  if (real === 0) return imag === 1 ? 'i' : imag === -1 ? '-i' : `${imag}i`
  const sign = imag > 0 ? '+' : ''
  const imagPart = Math.abs(imag) === 1 ? (imag > 0 ? 'i' : '-i') : `${imag}i`
  return `${real}${sign}${imagPart}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplexNumberPlane({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ComplexNumberPlaneProps) {
  const {
    points,
    operations = [],
    showModulus,
    showArgument,
    title,
  } = data

  const hasModulus = showModulus || showArgument
  const hasOperations = operations.length > 0

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he },
    ]
    if (hasModulus) {
      defs.push({ id: 'modulus', label: STEP_LABELS.modulus.en, labelHe: STEP_LABELS.modulus.he })
    }
    if (hasOperations) {
      defs.push({ id: 'operations', label: STEP_LABELS.operations.en, labelHe: STEP_LABELS.operations.he })
    }
    return defs
  }, [hasModulus, hasOperations])

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
  const _accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Determine auto-range from points
  const allReals = points.map((p) => p.real)
  const allImags = points.map((p) => p.imaginary)
  const maxAbsR = Math.max(Math.abs(Math.min(...allReals, -1)), Math.abs(Math.max(...allReals, 1)), 1)
  const maxAbsI = Math.max(Math.abs(Math.min(...allImags, -1)), Math.abs(Math.max(...allImags, 1)), 1)
  const rangeVal = Math.ceil(Math.max(maxAbsR, maxAbsI) + 1)

  const padding = 40
  const plotW = width - 2 * padding
  const plotH = height - 2 * padding
  const cxSVG = width / 2
  const cySVG = height / 2
  const scaleX = plotW / (2 * rangeVal)
  const scaleY = plotH / (2 * rangeVal)

  const toSVG = (real: number, imag: number) => ({
    sx: cxSVG + real * scaleX,
    sy: cySVG - imag * scaleY,
  })

  return (
    <div
      data-testid="complex-number-plane"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="cnp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="cnp-svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Axes */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="cnp-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid */}
              {Array.from({ length: rangeVal * 2 + 1 }, (_, i) => i - rangeVal).map((v) => {
                const { sx } = toSVG(v, 0)
                const { sy } = toSVG(0, v)
                return (
                  <g key={`grid-${v}`}>
                    <line x1={sx} y1={padding} x2={sx} y2={height - padding} stroke={v === 0 ? '#374151' : '#e5e7eb'} strokeWidth={v === 0 ? diagram.lineWeight : 0.5} />
                    <line x1={padding} y1={sy} x2={width - padding} y2={sy} stroke={v === 0 ? '#374151' : '#e5e7eb'} strokeWidth={v === 0 ? diagram.lineWeight : 0.5} />
                    {v !== 0 && (
                      <>
                        <text x={sx} y={cySVG + 14} textAnchor="middle" fontSize={10} fill="#9ca3af">{v}</text>
                        <text x={cxSVG - 12} y={sy + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{v}i</text>
                      </>
                    )}
                  </g>
                )
              })}
              {/* Axis labels */}
              <text x={width - padding + 6} y={cySVG + 4} fontSize={12} fill="#6b7280">
                {language === 'he' ? 'ממשי' : 'Re'}
              </text>
              <text x={cxSVG + 6} y={padding - 8} fontSize={12} fill="#6b7280">
                {language === 'he' ? 'מדומה' : 'Im'}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Plot points */}
        <AnimatePresence>
          {isVisible('points') && (
            <motion.g
              data-testid="cnp-points"
              initial="hidden"
              animate={isCurrent('points') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {points.map((pt, i) => {
                const { sx, sy } = toSVG(pt.real, pt.imaginary)
                const color = pt.color ?? POINT_COLORS[i % POINT_COLORS.length]
                const label = pt.label ?? formatComplex(pt.real, pt.imaginary)
                return (
                  <g key={`pt-${i}`} data-testid={`cnp-point-${i}`}>
                    <circle cx={sx} cy={sy} r={5} fill={color} />
                    <text x={sx + 8} y={sy - 6} fontSize={11} fontWeight={600} fill={color}>
                      {label}
                    </text>
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Modulus / Argument */}
        <AnimatePresence>
          {isVisible('modulus') && hasModulus && (
            <motion.g
              data-testid="cnp-modulus"
              initial="hidden"
              animate={isCurrent('modulus') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {points.map((pt, i) => {
                const { sx, sy } = toSVG(pt.real, pt.imaginary)
                const { sx: ox, sy: oy } = toSVG(0, 0)
                const modulus = Math.sqrt(pt.real * pt.real + pt.imaginary * pt.imaginary)
                const argument = Math.atan2(pt.imaginary, pt.real)
                const color = pt.color ?? POINT_COLORS[i % POINT_COLORS.length]
                return (
                  <g key={`mod-${i}`}>
                    {/* Line from origin to point (modulus) */}
                    {showModulus && (
                      <>
                        <line
                          x1={ox}
                          y1={oy}
                          x2={sx}
                          y2={sy}
                          stroke={color}
                          strokeWidth={diagram.lineWeight}
                          strokeDasharray="4 3"
                          opacity={0.7}
                        />
                        <text
                          x={(ox + sx) / 2 - 8}
                          y={(oy + sy) / 2 - 6}
                          fontSize={10}
                          fill={color}
                        >
                          |z| = {modulus.toFixed(2)}
                        </text>
                      </>
                    )}
                    {/* Argument arc */}
                    {showArgument && modulus > 0 && (
                      <text
                        x={sx + 8}
                        y={sy + 16}
                        fontSize={10}
                        fill={color}
                      >
                        {'\u03B8'} = {(argument * 180 / Math.PI).toFixed(1)}{'\u00B0'}
                      </text>
                    )}
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Operations */}
        <AnimatePresence>
          {isVisible('operations') && hasOperations && (
            <motion.g
              data-testid="cnp-operations"
              initial="hidden"
              animate={isCurrent('operations') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {operations.map((op, i) => {
                const result = op.result
                const { sx, sy } = toSVG(result.real, result.imaginary)
                return (
                  <g key={`op-${i}`}>
                    <circle cx={sx} cy={sy} r={5} fill="#22c55e" stroke="white" strokeWidth={1.5} />
                    <motion.text
                      x={sx + 8}
                      y={sy - 6}
                      fontSize={11}
                      fontWeight={600}
                      fill="#22c55e"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {formatComplex(result.real, result.imaginary)}
                    </motion.text>
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
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default ComplexNumberPlane
