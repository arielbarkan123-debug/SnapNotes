'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleAngleSumData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  lineDrawVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriangleAngleSumProps {
  data: TriangleAngleSumData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
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
  drawTriangle: { en: 'Draw the triangle', he: '\u05e6\u05d9\u05d5\u05e8 \u05d4\u05de\u05e9\u05d5\u05dc\u05e9' },
  showAngles: { en: 'Show angle measures', he: '\u05d4\u05e6\u05d2\u05ea \u05de\u05d9\u05d3\u05d5\u05ea \u05d6\u05d5\u05d5\u05d9\u05d5\u05ea' },
  showSum: { en: 'Show angle sum', he: '\u05d4\u05e6\u05d2\u05ea \u05e1\u05db\u05d5\u05dd \u05d6\u05d5\u05d5\u05d9\u05d5\u05ea' },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180

// Three distinct colors for the three angles
const ANGLE_COLORS = [
  '#6366f1', // indigo (primary)
  '#f59e0b', // amber (accent)
  '#22c55e', // green (third derived color)
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an SVG arc path for an angle at a vertex */
function angleArcPath(
  cx: number,
  cy: number,
  startAngleDeg: number,
  endAngleDeg: number,
  radius: number
): string {
  const sa = startAngleDeg
  const ea = endAngleDeg
  // Compute the sweep going from start to end counterclockwise
  let diff = ea - sa
  if (diff < 0) diff += 360
  if (diff > 360) diff -= 360
  const largeArc = diff > 180 ? 1 : 0
  const x1 = cx + radius * Math.cos(sa * DEG)
  const y1 = cy - radius * Math.sin(sa * DEG)
  const x2 = cx + radius * Math.cos(ea * DEG)
  const y2 = cy - radius * Math.sin(ea * DEG)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`
}

/** Compute direction angles from a vertex to its two adjacent vertices */
function vertexAngleDirections(
  vertices: Array<{ x: number; y: number }>,
  i: number
): { start: number; end: number } {
  const n = vertices.length
  const prev = vertices[(i - 1 + n) % n]
  const curr = vertices[i]
  const next = vertices[(i + 1) % n]
  // atan2 with negated dy for SVG coordinate system (y increases downward)
  const a1 = Math.atan2(-(prev.y - curr.y), prev.x - curr.x) / DEG
  const a2 = Math.atan2(-(next.y - curr.y), next.x - curr.x) / DEG
  return { start: a1, end: a2 }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TriangleAngleSum({
  data,
  className = '',
  width = 450,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TriangleAngleSumProps) {
  const {
    angles,
    vertices: rawVertices,
    labels,
    showSum = true,
    title,
  } = data

  // Provide default vertices if not enough provided
  const rawVerts = useMemo(() => {
    if (rawVertices && rawVertices.length === 3) return rawVertices
    return [
      { x: 80, y: 280 },
      { x: 400, y: 280 },
      { x: 220, y: 60 },
    ]
  }, [rawVertices])

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawTriangle', label: STEP_LABELS.drawTriangle.en, labelHe: STEP_LABELS.drawTriangle.he },
      { id: 'showAngles', label: STEP_LABELS.showAngles.en, labelHe: STEP_LABELS.showAngles.he },
    ]
    if (showSum) {
      defs.push({ id: 'showSum', label: STEP_LABELS.showSum.en, labelHe: STEP_LABELS.showSum.he })
    }
    return defs
  }, [showSum])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
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

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Geometry: transform raw vertices to fit in SVG viewport
  // ---------------------------------------------------------------------------

  const padding = 50
  const titleHeight = title ? 30 : 0
  const sumHeight = showSum ? 40 : 0

  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2 - titleHeight - sumHeight

  const xs = rawVerts.map((v) => v.x)
  const ys = rawVerts.map((v) => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const dataWidth = maxX - minX || 1
  const dataHeight = maxY - minY || 1

  const scale = Math.min(plotWidth / dataWidth, plotHeight / dataHeight) * 0.85

  const dataCenterX = (minX + maxX) / 2
  const dataCenterY = (minY + maxY) / 2
  const svgCenterX = width / 2
  const svgCenterY = (height - sumHeight + titleHeight) / 2

  const verts = useMemo(
    () =>
      rawVerts.map((v) => ({
        x: svgCenterX + (v.x - dataCenterX) * scale,
        y: svgCenterY - (v.y - dataCenterY) * scale,
      })),
    [rawVerts, svgCenterX, svgCenterY, dataCenterX, dataCenterY, scale]
  )

  // Triangle centroid for label offset
  const triCenter = useMemo(
    () => ({
      x: (verts[0].x + verts[1].x + verts[2].x) / 3,
      y: (verts[0].y + verts[1].y + verts[2].y) / 3,
    }),
    [verts]
  )

  // Triangle path
  const trianglePath = `M ${verts[0].x} ${verts[0].y} L ${verts[1].x} ${verts[1].y} L ${verts[2].x} ${verts[2].y} Z`

  // Angle arcs at each vertex
  const angleArcs = useMemo(
    () =>
      [0, 1, 2].map((i) => {
        const { start, end } = vertexAngleDirections(verts, i)
        return { cx: verts[i].x, cy: verts[i].y, start, end }
      }),
    [verts]
  )

  // Use subject-specific colors for the three angles, falling back to ANGLE_COLORS
  const angleColors = useMemo(
    () => [primaryColor, accentColor, ANGLE_COLORS[2]],
    [primaryColor, accentColor]
  )

  const arcRadius = 22
  const labelDist = 38

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="triangle-angle-sum"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="tas-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="tas-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw triangle */}
        <AnimatePresence>
          {isVisible('drawTriangle') && (
            <motion.g
              data-testid="tas-triangle"
              initial="hidden"
              animate={isCurrent('drawTriangle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle fill */}
              <path
                d={trianglePath}
                fill={primaryColor}
                fillOpacity={0.08}
                stroke="none"
              />

              {/* Triangle outline */}
              <motion.path
                d={trianglePath}
                fill="none"
                stroke="#374151"
                className="dark:stroke-gray-300"
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Vertex dots */}
              {verts.map((v, i) => (
                <motion.circle
                  key={`vertex-dot-${i}`}
                  cx={v.x}
                  cy={v.y}
                  r={diagram.lineWeight + 1}
                  className="fill-gray-700 dark:fill-gray-300"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    delay: i * 0.08,
                  }}
                />
              ))}

              {/* Vertex labels (A, B, C etc.) */}
              {verts.map((v, i) => {
                const dx = v.x - triCenter.x
                const dy = v.y - triCenter.y
                const dist = Math.hypot(dx, dy)
                const offsetDist = 22
                return (
                  <motion.text
                    key={`vertex-label-${i}`}
                    x={v.x + (dx / dist) * offsetDist}
                    y={v.y + (dy / dist) * offsetDist}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-gray-700 dark:fill-gray-300"
                    fontSize={14}
                    fontWeight={700}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {labels[i]}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Show angles */}
        <AnimatePresence>
          {isVisible('showAngles') && (
            <motion.g
              data-testid="tas-angles"
              initial="hidden"
              animate={isCurrent('showAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {[0, 1, 2].map((i) => {
                const arc = angleArcs[i]
                const color = angleColors[i]
                // Midpoint angle for label placement
                const midAngle = (arc.start + arc.end) / 2
                // If the arc wraps around, adjust midpoint
                let adjustedMid = midAngle
                const diff = arc.end - arc.start
                if (Math.abs(diff) > 180) {
                  adjustedMid = midAngle + 180
                }
                const lx = arc.cx + labelDist * Math.cos(adjustedMid * DEG)
                const ly = arc.cy - labelDist * Math.sin(adjustedMid * DEG)

                return (
                  <motion.g key={`angle-${i}`}>
                    {/* Filled wedge for the angle */}
                    {(() => {
                      const fillR = arcRadius
                      const xStart = arc.cx + fillR * Math.cos(arc.start * DEG)
                      const yStart = arc.cy - fillR * Math.sin(arc.start * DEG)
                      const xEnd = arc.cx + fillR * Math.cos(arc.end * DEG)
                      const yEnd = arc.cy - fillR * Math.sin(arc.end * DEG)
                      let aDiff = arc.end - arc.start
                      if (aDiff < 0) aDiff += 360
                      if (aDiff > 360) aDiff -= 360
                      const large = aDiff > 180 ? 1 : 0
                      return (
                        <motion.path
                          d={`M ${arc.cx} ${arc.cy} L ${xStart} ${yStart} A ${fillR} ${fillR} 0 ${large} 0 ${xEnd} ${yEnd} Z`}
                          fill={color}
                          fillOpacity={0.15}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: i * 0.15 }}
                        />
                      )
                    })()}

                    {/* Angle arc stroke */}
                    <motion.path
                      d={angleArcPath(arc.cx, arc.cy, arc.start, arc.end, arcRadius)}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />

                    {/* Angle measure label */}
                    <motion.text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={600}
                      fill={color}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {angles[i]}{'\u00b0'}
                    </motion.text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show sum equation (conditional) */}
        <AnimatePresence>
          {showSum && isVisible('showSum') && (
            <motion.g
              data-testid="tas-sum"
              initial="hidden"
              animate={isCurrent('showSum') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Sum equation line */}
              <motion.g
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {/* Color-coded angle values in the equation */}
                {/* Render: "60° + 70° + 50° = 180°" with each angle in its color */}
                {(() => {
                  const eqY = height - 18
                  const eqCenterX = width / 2
                  // Build the equation parts
                  const parts: Array<{ text: string; color: string }> = []
                  angles.forEach((a, i) => {
                    if (i > 0) parts.push({ text: ' + ', color: '#6b7280' })
                    parts.push({ text: `${a}\u00b0`, color: angleColors[i] })
                  })
                  parts.push({ text: ' = ', color: '#6b7280' })
                  parts.push({ text: `${angles[0] + angles[1] + angles[2]}\u00b0`, color: primaryColor })

                  // Approximate total width for centering
                  const charWidth = 8
                  const totalChars = parts.reduce((sum, p) => sum + p.text.length, 0)
                  const totalWidth = totalChars * charWidth
                  let xPos = eqCenterX - totalWidth / 2

                  return parts.map((part, pi) => {
                    const el = (
                      <text
                        key={`eq-part-${pi}`}
                        x={xPos}
                        y={eqY}
                        fontSize={14}
                        fontWeight={600}
                        fill={part.color}
                        textAnchor="start"
                        dominantBaseline="central"
                      >
                        {part.text}
                      </text>
                    )
                    xPos += part.text.length * charWidth
                    return el
                  })
                })()}
              </motion.g>

              {/* Explanatory text */}
              <motion.text
                x={width / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize={10}
                className="fill-gray-500 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? '\u05e1\u05db\u05d5\u05dd \u05d6\u05d5\u05d5\u05d9\u05d5\u05ea \u05d1\u05de\u05e9\u05d5\u05dc\u05e9 \u05e9\u05d5\u05d5\u05d4 \u05ea\u05de\u05d9\u05d3 \u05dc-180\u00b0'
                  : 'The sum of angles in a triangle is always 180\u00b0'}
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
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default TriangleAngleSum
