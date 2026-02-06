'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleAngleSumData } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  triangle: { en: 'Draw triangle', he: 'ציור משולש' },
  arcs: { en: 'Show angle arcs', he: 'הצגת קשתות זוויות' },
  labels: { en: 'Label each angle', he: 'תיוג כל זווית' },
  sum: { en: 'Show sum equation', he: 'הצגת משוואת סכום' },
}

interface TriangleAngleSumProps {
  data: TriangleAngleSumData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * TriangleAngleSum - Triangle with angles summing to 180°
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
 */
export function TriangleAngleSum({
  data,
  width = 400,
  height = 380,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: TriangleAngleSumProps) {
  const {
    angles,
    vertices,
    labels = ['A', 'B', 'C'],
    showSum = true,
    showTearOff = false,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'triangle', label: STEP_LABELS.triangle.en, labelHe: STEP_LABELS.triangle.he },
      { id: 'arcs', label: STEP_LABELS.arcs.en, labelHe: STEP_LABELS.arcs.he },
      { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
    ]
    if (showSum) {
      defs.push({ id: 'sum', label: STEP_LABELS.sum.en, labelHe: STEP_LABELS.sum.he })
    }
    return defs
  }, [showSum])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
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

  // Map data vertices to SVG space
  const padding = 60
  const svgVertices = useMemo(() => {
    const xs = vertices.map((v) => v.x)
    const ys = vertices.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const dataW = maxX - minX || 1
    const dataH = maxY - minY || 1
    const drawW = width - padding * 2
    const drawH = (height - 80) - padding
    const scale = Math.min(drawW / dataW, drawH / dataH)
    const offsetX = padding + (drawW - dataW * scale) / 2
    const offsetY = padding + 20 + (drawH - dataH * scale) / 2

    return vertices.map((v) => ({
      x: offsetX + (v.x - minX) * scale,
      y: offsetY + (v.y - minY) * scale,
    }))
  }, [vertices, width, height, padding])

  const trianglePath = `M ${svgVertices[0].x} ${svgVertices[0].y}
                         L ${svgVertices[1].x} ${svgVertices[1].y}
                         L ${svgVertices[2].x} ${svgVertices[2].y} Z`

  // Angle arcs at each vertex
  const angleColors = [
    GEOMETRY_COLORS.highlight.primary,
    GEOMETRY_COLORS.highlight.secondary,
    GEOMETRY_COLORS.highlight.tertiary,
  ]

  const arcRadius = 22

  // Calculate angle direction at each vertex
  const getAngleDirections = (vIdx: number) => {
    const v = svgVertices[vIdx]
    const prev = svgVertices[(vIdx + 2) % 3]
    const next = svgVertices[(vIdx + 1) % 3]

    const angle1 = Math.atan2(-(prev.y - v.y), prev.x - v.x) * 180 / Math.PI
    const angle2 = Math.atan2(-(next.y - v.y), next.x - v.x) * 180 / Math.PI

    return { start: angle1, end: angle2 }
  }

  const pointOnArc = (ox: number, oy: number, angleDeg: number, r: number) => ({
    x: ox + r * Math.cos((angleDeg * Math.PI) / 180),
    y: oy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  const makeArc = (ox: number, oy: number, startDeg: number, endDeg: number, r: number) => {
    // Ensure we go the short way around
    const s = startDeg
    let e = endDeg
    let diff = e - s
    if (diff > 180) e -= 360
    if (diff < -180) e += 360
    diff = e - s

    const start = pointOnArc(ox, oy, s, r)
    const end = pointOnArc(ox, oy, e, r)
    const largeArc = Math.abs(diff) > 180 ? 1 : 0
    const sweep = diff > 0 ? 0 : 1
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
  }

  // Label offsets - push label away from center
  const center = {
    x: (svgVertices[0].x + svgVertices[1].x + svgVertices[2].x) / 3,
    y: (svgVertices[0].y + svgVertices[1].y + svgVertices[2].y) / 3,
  }

  const labelOffset = (vIdx: number) => {
    const v = svgVertices[vIdx]
    const dx = v.x - center.x
    const dy = v.y - center.y
    const len = Math.sqrt(dx * dx + dy * dy)
    return {
      x: v.x + (dx / len) * 20,
      y: v.y + (dy / len) * 20,
    }
  }

  // Tear-off animation: show three colored sectors aligned on a straight line
  const tearOffY = height - 50
  const tearOffX = width / 2

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="triangle-angle-sum-diagram"
      className={`geometry-triangle-angle-sum ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={title || 'Triangle angle sum diagram'}
      >
        {/* Background */}
        <rect
          data-testid="triangle-angle-sum-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="triangle-angle-sum-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: Draw triangle */}
        <AnimatePresence>
          {isVisible('triangle') && (
            <motion.g
              data-testid="triangle-angle-sum-shape"
              initial="hidden"
              animate={isCurrent('triangle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Fill */}
              <motion.path
                d={trianglePath}
                fill={diagram.colors.primary}
                fillOpacity={0.08}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              {/* Outline */}
              <motion.path
                data-testid="triangle-angle-sum-path"
                d={trianglePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Vertex dots */}
              {svgVertices.map((v, i) => (
                <motion.circle
                  key={`vertex-${i}`}
                  cx={v.x}
                  cy={v.y}
                  r={diagram.lineWeight}
                  fill="currentColor"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 + i * 0.1 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Angle arcs */}
        <AnimatePresence>
          {isVisible('arcs') && (
            <motion.g
              data-testid="triangle-angle-sum-arcs"
              initial="hidden"
              animate={isCurrent('arcs') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {svgVertices.map((v, i) => {
                const dirs = getAngleDirections(i)
                return (
                  <motion.path
                    key={`arc-${i}`}
                    data-testid={`triangle-arc-${i}`}
                    d={makeArc(v.x, v.y, dirs.start, dirs.end, arcRadius)}
                    fill="none"
                    stroke={angleColors[i]}
                    strokeWidth={2.5}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                    transition={{ delay: i * 0.15 }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="triangle-angle-sum-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {svgVertices.map((_, i) => {
                const dirs = getAngleDirections(i)
                let midAngle = (dirs.start + dirs.end) / 2
                // Same short-way normalization
                let diff = dirs.end - dirs.start
                if (diff > 180) diff -= 360
                if (diff < -180) diff += 360
                midAngle = dirs.start + diff / 2

                const lbl = labelOffset(i)
                return (
                  <motion.g key={`label-${i}`}>
                    {/* Vertex label */}
                    <motion.text
                      x={lbl.x}
                      y={lbl.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-current text-xs font-bold"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.1 }}
                    >
                      {labels[i]}
                    </motion.text>

                    {/* Angle measure */}
                    <motion.text
                      x={svgVertices[i].x + (arcRadius + 14) * Math.cos((midAngle * Math.PI) / 180)}
                      y={svgVertices[i].y - (arcRadius + 14) * Math.sin((midAngle * Math.PI) / 180)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fill: angleColors[i] }}
                      className="text-[10px] font-bold"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.1 + 0.1 }}
                    >
                      {angles[i]}°
                    </motion.text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Sum equation + optional tear-off */}
        <AnimatePresence>
          {showSum && isVisible('sum') && (
            <motion.g
              data-testid="triangle-angle-sum-equation"
              initial="hidden"
              animate={isCurrent('sum') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Tear-off animation: colored sectors on a straight line */}
              {showTearOff && (
                <motion.g
                  data-testid="triangle-tear-off"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Baseline */}
                  <line
                    x1={tearOffX - 60}
                    y1={tearOffY}
                    x2={tearOffX + 60}
                    y2={tearOffY}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray="4,2"
                  />
                  {/* Colored sectors stacked together = straight line */}
                  {angles.map((angle, i) => {
                    const startAngle = angles.slice(0, i).reduce((a, b) => a + b, 0)
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = ((startAngle + angle) * Math.PI) / 180
                    const r = 20
                    const sx = tearOffX + r * Math.cos(Math.PI - startRad)
                    const sy = tearOffY - r * Math.sin(Math.PI - startRad)
                    const ex = tearOffX + r * Math.cos(Math.PI - endRad)
                    const ey = tearOffY - r * Math.sin(Math.PI - endRad)
                    const largeArc = angle > 180 ? 1 : 0
                    return (
                      <motion.path
                        key={`tear-${i}`}
                        d={`M ${tearOffX} ${tearOffY} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`}
                        fill={angleColors[i]}
                        fillOpacity={0.3}
                        stroke={angleColors[i]}
                        strokeWidth={1.5}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.2 }}
                      />
                    )
                  })}
                </motion.g>
              )}

              {/* Equation */}
              <motion.text
                x={width / 2}
                y={showTearOff ? tearOffY - 30 : height - 40}
                textAnchor="middle"
                className="fill-current text-sm font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                <tspan style={{ fill: angleColors[0] }}>{angles[0]}°</tspan>
                {' + '}
                <tspan style={{ fill: angleColors[1] }}>{angles[1]}°</tspan>
                {' + '}
                <tspan style={{ fill: angleColors[2] }}>{angles[2]}°</tspan>
                {' = 180°'}
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default TriangleAngleSum
