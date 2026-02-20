'use client'

import { useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleData, TriangleErrorHighlight } from '@/types'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { SVGPoint, SVGLabel, SVGLine } from '@/components/math/shared'
import { InlineMath } from '@/components/ui/MathRenderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriangleDataWithErrors extends TriangleData {
  errorHighlight?: TriangleErrorHighlight
}

interface TriangleProps {
  data: TriangleDataWithErrors
  className?: string
  /** ViewBox width — SVG scales responsively to container */
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Draw the triangle', he: 'ציור המשולש' },
  sides: { en: 'Label the sides', he: 'סימון הצלעות' },
  angles: { en: 'Show the angles', he: 'הצגת הזוויות' },
  special: { en: 'Show special lines', he: 'הצגת קווים מיוחדים' },
  formulas: { en: 'Formulas & Properties', he: 'נוסחאות ותכונות' },
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
}

// ---------------------------------------------------------------------------
// FormulaRow — small helper for each formula entry
// ---------------------------------------------------------------------------

function FormulaRow({
  label,
  color,
  children,
}: {
  label: string
  color: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="inline-block mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}: </span>
        <span className="text-gray-800 dark:text-gray-200">{children}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Triangle — Phase 2 Visual Learning Overhaul.
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
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 * - [x] Uses shared SVG primitives (SVGPoint, SVGLabel, SVGLine)
 */
export function Triangle({
  data,
  className = '',
  width = 300,
  height = 280,
  complexity: forcedComplexity,
  subject = 'geometry',
  language = 'en',
  initialStep,
}: TriangleProps) {
  const { vertices, sides = [], angles = [], altitude, title, errorHighlight } = data

  // Determine which step groups exist based on data
  // (computed before hooks so hooks can use these values)
  const hasValidVertices = !!vertices && vertices.length >= 3
  const hasSides = sides.length > 0
  const hasAngles = angles.length > 0
  const hasSpecial = !!altitude
  const hasErrors = !!(
    errorHighlight?.wrongSides?.length ||
    errorHighlight?.wrongAngles?.length
  )

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
    ]
    if (hasSides) defs.push({ id: 'sides', label: STEP_LABELS.sides.en, labelHe: STEP_LABELS.sides.he })
    if (hasAngles) defs.push({ id: 'angles', label: STEP_LABELS.angles.en, labelHe: STEP_LABELS.angles.he })
    if (hasSpecial) defs.push({ id: 'special', label: STEP_LABELS.special.en, labelHe: STEP_LABELS.special.he })
    defs.push({ id: 'formulas', label: STEP_LABELS.formulas.en, labelHe: STEP_LABELS.formulas.he })
    if (hasErrors) defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    return defs
  }, [hasSides, hasAngles, hasSpecial, hasErrors])

  // useDiagramBase — step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Guard against empty or insufficient vertices (after all hooks)
  if (!hasValidVertices) {
    return (
      <div
        data-testid="triangle-diagram"
        style={{ width: '100%', maxWidth: width }}
      >
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className={className}
          role="img"
          aria-label="Triangle diagram - insufficient data"
        >
          <rect width={width} height={height} fill="#f9fafb" className="dark:fill-gray-800" rx={8} />
          <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontSize={14}>
            Insufficient vertex data
          </text>
        </svg>
      </div>
    )
  }

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = 40
  const titleHeight = title ? 25 : 0

  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const dataWidth = maxX - minX || 1
  const dataHeight = maxY - minY || 1

  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2 - titleHeight

  const scale = Math.min(plotWidth / dataWidth, plotHeight / dataHeight) * 0.8

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const transformCoord = (x: number, y: number): { x: number; y: number } => ({
    x: width / 2 + (x - centerX) * scale,
    y: height / 2 + titleHeight / 2 - (y - centerY) * scale,
  })

  const transformedVertices = vertices.map((v) => ({
    ...transformCoord(v.x, v.y),
    label: v.label,
  }))

  const getVertex = (label: string) => {
    const index = vertices.findIndex((v) => v.label === label)
    return index >= 0 ? transformedVertices[index] : null
  }

  // Triangle path
  const trianglePath = `M ${transformedVertices[0].x} ${transformedVertices[0].y} L ${transformedVertices[1].x} ${transformedVertices[1].y} L ${transformedVertices[2].x} ${transformedVertices[2].y} Z`

  // Midpoint of a side
  const getMidpoint = (label1: string, label2: string) => {
    const v1 = getVertex(label1)
    const v2 = getVertex(label2)
    if (!v1 || !v2) return null
    return { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }
  }

  // Triangle centroid for label offset direction
  const triCenter = {
    x: transformedVertices.reduce((sum, v) => sum + v.x, 0) / 3,
    y: transformedVertices.reduce((sum, v) => sum + v.y, 0) / 3,
  }

  // Compute the interior angle bisector direction at a vertex.
  // Returns the midAngle (in radians) that points toward the triangle interior.
  const getInteriorBisector = (vertexLabel: string): { a1: number; a2: number; midAngle: number } | null => {
    const vertex = getVertex(vertexLabel)
    if (!vertex) return null
    const vertexIndex = vertices.findIndex((v) => v.label === vertexLabel)
    const prevIndex = (vertexIndex + 2) % 3
    const nextIndex = (vertexIndex + 1) % 3
    const prev = transformedVertices[prevIndex]
    const next = transformedVertices[nextIndex]
    const a1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
    const a2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)
    // Compute midAngle as the bisector of the interior angle.
    // The two candidate bisectors are (a1+a2)/2 and (a1+a2)/2 + PI.
    // Choose the one pointing toward the triangle centroid (triCenter).
    let mid = (a1 + a2) / 2
    const testX = vertex.x + Math.cos(mid)
    const testY = vertex.y + Math.sin(mid)
    const distToCenter = Math.hypot(testX - triCenter.x, testY - triCenter.y)
    const testX2 = vertex.x + Math.cos(mid + Math.PI)
    const testY2 = vertex.y + Math.sin(mid + Math.PI)
    const distToCenter2 = Math.hypot(testX2 - triCenter.x, testY2 - triCenter.y)
    if (distToCenter2 < distToCenter) {
      mid += Math.PI
    }
    return { a1, a2, midAngle: mid }
  }

  // Draw angle arc — always through the interior angle
  const drawAngleArc = (vertexLabel: string, arcRadius: number = 20): string => {
    const vertex = getVertex(vertexLabel)
    if (!vertex) return ''
    const bisector = getInteriorBisector(vertexLabel)
    if (!bisector) return ''
    const { a1, a2 } = bisector
    const startX = vertex.x + arcRadius * Math.cos(a1)
    const startY = vertex.y + arcRadius * Math.sin(a1)
    const endX = vertex.x + arcRadius * Math.cos(a2)
    const endY = vertex.y + arcRadius * Math.sin(a2)
    // Determine the correct sweep direction so the arc goes through the interior.
    // The interior bisector midAngle points inward. We sweep from a1 to a2:
    // Check which sweep direction (CW=0 or CCW=1) passes through midAngle.
    let diff = a2 - a1
    if (diff < 0) diff += 2 * Math.PI
    // If diff > PI, the CCW sweep from a1 to a2 is the reflex arc.
    // We want the shorter arc (interior angle < 180 for any triangle vertex).
    const largeArc = 0 // Triangle interior angles are always < 180
    const sweep = diff < Math.PI ? 1 : 0
    return `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} ${sweep} ${endX} ${endY}`
  }

  // Draw right angle marker
  const drawRightAngle = (vertexLabel: string, size: number = 15): string => {
    const vertex = getVertex(vertexLabel)
    if (!vertex) return ''
    const vertexIndex = vertices.findIndex((v) => v.label === vertexLabel)
    const prevIndex = (vertexIndex + 2) % 3
    const nextIndex = (vertexIndex + 1) % 3
    const prev = transformedVertices[prevIndex]
    const next = transformedVertices[nextIndex]
    const d1 = Math.hypot(prev.x - vertex.x, prev.y - vertex.y)
    const d2 = Math.hypot(next.x - vertex.x, next.y - vertex.y)
    const dir1 = { x: (prev.x - vertex.x) / d1, y: (prev.y - vertex.y) / d1 }
    const dir2 = { x: (next.x - vertex.x) / d2, y: (next.y - vertex.y) / d2 }
    const p1 = { x: vertex.x + dir1.x * size, y: vertex.y + dir1.y * size }
    const p2 = { x: vertex.x + (dir1.x + dir2.x) * size, y: vertex.y + (dir1.y + dir2.y) * size }
    const p3 = { x: vertex.x + dir2.x * size, y: vertex.y + dir2.y * size }
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="triangle-diagram"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Triangle${title ? `: ${title}` : ''} with vertices ${vertices.map((v) => v.label).join(', ')}`}
      >
        {/* Background */}
        <rect
          data-testid="tri-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <SVGLabel
            x={width / 2}
            y={20}
            text={title}
            textAnchor="middle"
            fontSize={14}
            fontWeight={500}
            className="fill-current"
            animate={false}
          />
        )}

        {/* ── Step 0: Outline ───────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="tri-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle fill */}
              <path
                d={trianglePath}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                stroke="none"
              />

              {/* Triangle outline — draws progressively */}
              <motion.path
                d={trianglePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Vertex points (uses SVGPoint shared primitive) */}
              {transformedVertices.map((vertex, index) => (
                <SVGPoint
                  key={`vertex-point-${index}`}
                  cx={vertex.x}
                  cy={vertex.y}
                  r={diagram.lineWeight}
                  color="currentColor"
                  animate={true}
                />
              ))}

              {/* Vertex labels (uses SVGLabel shared primitive) */}
              {transformedVertices.map((vertex, index) => {
                const dx = vertex.x - triCenter.x
                const dy = vertex.y - triCenter.y
                const dist = Math.hypot(dx, dy)
                const labelDist = 20
                return (
                  <SVGLabel
                    key={`vertex-label-${index}`}
                    x={vertex.x + (dx / dist) * labelDist}
                    y={vertex.y + (dy / dist) * labelDist}
                    text={vertex.label}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={700}
                    className="fill-current"
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Sides ────────────────────────────────────── */}
        <AnimatePresence>
          {hasSides && isVisible('sides') && (
            <motion.g
              data-testid="tri-sides"
              initial="hidden"
              animate={isCurrent('sides') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {sides.map((side, index) => {
                if (!side.length) return null
                const midpoint = getMidpoint(side.from, side.to)
                if (!midpoint) return null

                const from = getVertex(side.from)
                const to = getVertex(side.to)
                if (!from || !to) return null

                // Offset label perpendicular to the side, away from center
                const dx = to.x - from.x
                const dy = to.y - from.y
                const len = Math.hypot(dx, dy)
                const perpX = -dy / len
                const perpY = dx / len
                const testPoint = { x: midpoint.x + perpX * 10, y: midpoint.y + perpY * 10 }
                const distFromCenter = Math.hypot(testPoint.x - triCenter.x, testPoint.y - triCenter.y)
                const origDistFromCenter = Math.hypot(midpoint.x - triCenter.x, midpoint.y - triCenter.y)
                const direction = distFromCenter > origDistFromCenter ? 1 : -1

                return (
                  <motion.g
                    key={`side-${index}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Side highlight line (uses SVGLine shared primitive) */}
                    {side.highlight && (
                      <SVGLine
                        x1={from.x} y1={from.y}
                        x2={to.x} y2={to.y}
                        color={diagram.colors.primary}
                        strokeWidth={diagram.lineWeight + 1}
                        animate={false}
                      />
                    )}
                    {/* Side length label (uses SVGLabel shared primitive) */}
                    <SVGLabel
                      x={midpoint.x + perpX * 15 * direction}
                      y={midpoint.y + perpY * 15 * direction}
                      text={side.length}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={500}
                      color={diagram.colors.primary}
                      animate={false}
                    />
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Angles ───────────────────────────────────── */}
        <AnimatePresence>
          {hasAngles && isVisible('angles') && (
            <motion.g
              data-testid="tri-angles"
              initial="hidden"
              animate={isCurrent('angles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {angles.map((angle, index) => {
                const vertex = getVertex(angle.vertex)
                if (!vertex) return null

                // Adaptive arc radius: scale with triangle size but cap at 20px
                const vIdx = vertices.findIndex((v) => v.label === angle.vertex)
                const pIdx = (vIdx + 2) % 3
                const nIdx = (vIdx + 1) % 3
                const shortestArm = Math.min(
                  Math.hypot(transformedVertices[pIdx].x - vertex.x, transformedVertices[pIdx].y - vertex.y),
                  Math.hypot(transformedVertices[nIdx].x - vertex.x, transformedVertices[nIdx].y - vertex.y),
                )
                const adaptiveArcRadius = Math.max(10, Math.min(20, shortestArm * 0.2))
                const arcPath = angle.rightAngle
                  ? drawRightAngle(angle.vertex, Math.max(8, Math.min(15, shortestArm * 0.15)))
                  : drawAngleArc(angle.vertex, adaptiveArcRadius)

                // Angle label position — always inside the triangle
                const bisector = getInteriorBisector(angle.vertex)
                // Compute a safe label distance: at least 22px but adapt to
                // the triangle size so labels don't fly outside small triangles.
                const vertexIndex = vertices.findIndex((v) => v.label === angle.vertex)
                const prevIndex = (vertexIndex + 2) % 3
                const nextIndex = (vertexIndex + 1) % 3
                const prev = transformedVertices[prevIndex]
                const next = transformedVertices[nextIndex]
                const armLen = Math.min(
                  Math.hypot(prev.x - vertex.x, prev.y - vertex.y),
                  Math.hypot(next.x - vertex.x, next.y - vertex.y),
                )
                // Label sits at ~30% of the shortest arm, clamped between 22-40px
                const labelDist = Math.max(22, Math.min(40, armLen * 0.3))
                const midAngle = bisector?.midAngle ?? 0
                const labelX = vertex.x + labelDist * Math.cos(midAngle)
                const labelY = vertex.y + labelDist * Math.sin(midAngle)

                return (
                  <motion.g
                    key={`angle-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.15 }}
                  >
                    <motion.path
                      d={arcPath}
                      fill="none"
                      stroke={angle.highlight ? '#EF4444' : '#6B7280'}
                      strokeWidth={1.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    {/* Angle measure label (uses SVGLabel shared primitive) */}
                    {angle.measure && (
                      <SVGLabel
                        x={labelX}
                        y={labelY}
                        text={angle.measure}
                        textAnchor="middle"
                        fontSize={12}
                        className="fill-gray-600 dark:fill-gray-400"
                      />
                    )}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Special lines (altitude/median/bisector) ── */}
        <AnimatePresence>
          {hasSpecial && isVisible('special') && (
            <motion.g
              data-testid="tri-special"
              initial="hidden"
              animate={isCurrent('special') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {altitude && (() => {
                const from = getVertex(altitude.from)
                const toIndex = vertices.findIndex((v) => v.label === altitude.to)
                const otherIndex = vertices.findIndex(
                  (v) => v.label !== altitude.from && v.label !== altitude.to
                )
                if (!from || toIndex < 0 || otherIndex < 0) return null

                const to = transformedVertices[toIndex]
                const other = transformedVertices[otherIndex]

                const dx = other.x - to.x
                const dy = other.y - to.y
                const t = ((from.x - to.x) * dx + (from.y - to.y) * dy) / (dx * dx + dy * dy)
                const foot = { x: to.x + t * dx, y: to.y + t * dy }

                return (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Altitude line (uses SVGLine shared primitive) */}
                    <SVGLine
                      x1={from.x} y1={from.y}
                      x2={foot.x} y2={foot.y}
                      color="#10B981"
                      strokeWidth={diagram.lineWeight}
                      dashed
                      dashPattern="5 5"
                    />
                    {/* Right angle marker at foot */}
                    <rect
                      x={foot.x - 5} y={foot.y - 5}
                      width={10} height={10}
                      fill="none" stroke="#10B981" strokeWidth={1}
                      transform={`rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}, ${foot.x}, ${foot.y})`}
                    />
                  </motion.g>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Error highlights ─────────────────────────── */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="tri-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Wrong sides */}
              {errorHighlight?.wrongSides?.map((sideLabel) => {
                const from = getVertex(sideLabel[0])
                const to = getVertex(sideLabel[1])
                if (!from || !to) return null
                const midX = (from.x + to.x) / 2
                const midY = (from.y + to.y) / 2
                return (
                  <g key={`wrong-side-${sideLabel}`} data-testid={`tri-wrong-side-${sideLabel}`}>
                    <SVGLine
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      color="#EF4444" strokeWidth={4} dashed dashPattern="6 4"
                      animate={false}
                    />
                    <circle cx={midX} cy={midY} r={10} fill="#EF4444" opacity={0.2} />
                    <line x1={midX - 6} y1={midY - 6} x2={midX + 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                    <line x1={midX + 6} y1={midY - 6} x2={midX - 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                    {errorHighlight?.corrections?.[sideLabel] && (
                      <SVGLabel x={midX} y={midY - 18} text={errorHighlight.corrections[sideLabel]} textAnchor="middle" color="#EF4444" fontSize={12} fontWeight={500} animate={false} />
                    )}
                  </g>
                )
              })}

              {/* Wrong angles */}
              {errorHighlight?.wrongAngles?.map((vertexLabel) => {
                const vertex = getVertex(vertexLabel)
                if (!vertex) return null
                return (
                  <g key={`wrong-angle-${vertexLabel}`} data-testid={`tri-wrong-angle-${vertexLabel}`}>
                    <circle cx={vertex.x} cy={vertex.y} r={12} fill="#EF4444" opacity={0.2} />
                    <line x1={vertex.x - 6} y1={vertex.y - 6} x2={vertex.x + 6} y2={vertex.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                    <line x1={vertex.x + 6} y1={vertex.y - 6} x2={vertex.x - 6} y2={vertex.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                    {errorHighlight?.corrections?.[vertexLabel] && (
                      <SVGLabel x={vertex.x} y={vertex.y + 25} text={errorHighlight.corrections[vertexLabel]} textAnchor="middle" color="#EF4444" fontSize={12} fontWeight={500} animate={false} />
                    )}
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* ── Formulas & Properties (HTML below SVG) ─────────── */}
      <AnimatePresence>
        {isVisible('formulas') && (
          <motion.div
            data-testid="tri-formulas"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mt-3 rounded-xl p-4 border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
          >
            <h4
              className="text-sm font-semibold mb-3 flex items-center gap-1.5"
              style={{ color: diagram.colors.primary }}
            >
              <span>{language === 'he' ? 'נוסחאות ותכונות' : 'Formulas & Properties'}</span>
            </h4>

            <div className="space-y-2.5 text-sm">
              {/* Area = ½ × base × height (always shown) */}
              <FormulaRow
                label={language === 'he' ? 'שטח' : 'Area'}
                color={diagram.colors.primary}
              >
                <InlineMath>{'A = \\tfrac{1}{2} \\times base \\times height'}</InlineMath>
                {(() => {
                  // If numeric sides and a right angle, compute area
                  const rightAngle = angles.find(a => a.rightAngle)
                  if (rightAngle && sides.length >= 2) {
                    const rightVertex = rightAngle.vertex
                    const adjSides = sides.filter(s => s.from === rightVertex || s.to === rightVertex)
                    const nums = adjSides.map(s => s.length ? parseFloat(s.length) : NaN).filter(n => !isNaN(n))
                    if (nums.length === 2) {
                      const area = (nums[0] * nums[1]) / 2
                      return (
                        <span className="block mt-0.5 text-xs opacity-80">
                          <InlineMath>{`= \\tfrac{1}{2} \\times ${nums[0]} \\times ${nums[1]} = ${Number.isInteger(area) ? area : area.toFixed(2)}`}</InlineMath>
                        </span>
                      )
                    }
                  }
                  return null
                })()}
              </FormulaRow>

              {/* Perimeter: P = a + b + c (if sides data available with numeric values) */}
              {(() => {
                const numericSides = sides
                  .map(s => ({ label: `${s.from}${s.to}`, val: s.length ? parseFloat(s.length) : NaN }))
                  .filter(s => !isNaN(s.val))
                if (numericSides.length >= 3) {
                  const perimeter = numericSides.slice(0, 3).reduce((sum, s) => sum + s.val, 0)
                  return (
                    <FormulaRow
                      label={language === 'he' ? 'היקף' : 'Perimeter'}
                      color={diagram.colors.primary}
                    >
                      <InlineMath>{'P = a + b + c'}</InlineMath>
                      <span className="block mt-0.5 text-xs opacity-80">
                        <InlineMath>{`= ${numericSides.slice(0, 3).map(s => s.val).join(' + ')} = ${Number.isInteger(perimeter) ? perimeter : perimeter.toFixed(2)}`}</InlineMath>
                      </span>
                    </FormulaRow>
                  )
                }
                return null
              })()}

              {/* Pythagorean Theorem: a² + b² = c² (if any angle is 90°) */}
              {angles.some(a => a.rightAngle) && (
                <FormulaRow
                  label={language === 'he' ? 'משפט פיתגורס' : 'Pythagorean Theorem'}
                  color={diagram.colors.accent}
                >
                  <InlineMath>{'a^2 + b^2 = c^2'}</InlineMath>
                  {(() => {
                    // Show numeric verification if we have 3 numeric sides
                    const nums = sides.map(s => s.length ? parseFloat(s.length) : NaN).filter(n => !isNaN(n))
                    if (nums.length >= 3) {
                      const sorted = [...nums].sort((a, b) => a - b)
                      const [a, b, c] = sorted
                      const lhs = a * a + b * b
                      const rhs = c * c
                      const check = Math.abs(lhs - rhs) < 0.01
                      return (
                        <span className="block mt-0.5 text-xs opacity-80">
                          <InlineMath>{`${a}^2 + ${b}^2 = ${c}^2`}</InlineMath>
                          <span className="mx-1">{' '}</span>
                          <InlineMath>{`${a * a} + ${b * b} = ${c * c}`}</InlineMath>
                          {check && <span className="ml-1 text-green-600 dark:text-green-400">{' '}&#10003;</span>}
                        </span>
                      )
                    }
                    return null
                  })()}
                </FormulaRow>
              )}

              {/* Law of Sines: a/sin(A) = b/sin(B) = c/sin(C) (if angles data) */}
              {hasAngles && (
                <FormulaRow
                  label={language === 'he' ? 'חוק הסינוסים' : 'Law of Sines'}
                  color={diagram.colors.primary}
                >
                  <InlineMath>{'\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}'}</InlineMath>
                </FormulaRow>
              )}

              {/* Law of Cosines: c² = a² + b² − 2ab·cos(C) (if angles data) */}
              {hasAngles && (
                <FormulaRow
                  label={language === 'he' ? 'חוק הקוסינוסים' : 'Law of Cosines'}
                  color={diagram.colors.primary}
                >
                  <InlineMath>{'c^2 = a^2 + b^2 - 2ab \\cos C'}</InlineMath>
                </FormulaRow>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default Triangle