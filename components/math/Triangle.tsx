'use client'

import { useMemo } from 'react'
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
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
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

  // Guard against empty or insufficient vertices
  if (!vertices || vertices.length < 3) {
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
          <rect width={width} height={height} fill="#f9fafb" rx={8} />
          <text x={width / 2} y={height / 2} textAnchor="middle" fill="#9ca3af" fontSize={14}>
            Insufficient vertex data
          </text>
        </svg>
      </div>
    )
  }

  // Determine which step groups exist based on data
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

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

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

  // Draw angle arc
  const drawAngleArc = (vertexLabel: string, arcRadius: number = 20): string => {
    const vertex = getVertex(vertexLabel)
    if (!vertex) return ''
    const vertexIndex = vertices.findIndex((v) => v.label === vertexLabel)
    const prevIndex = (vertexIndex + 2) % 3
    const nextIndex = (vertexIndex + 1) % 3
    const prev = transformedVertices[prevIndex]
    const next = transformedVertices[nextIndex]
    const angle1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
    const angle2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)
    const startX = vertex.x + arcRadius * Math.cos(angle1)
    const startY = vertex.y + arcRadius * Math.sin(angle1)
    const endX = vertex.x + arcRadius * Math.cos(angle2)
    const endY = vertex.y + arcRadius * Math.sin(angle2)
    let angleDiff = angle2 - angle1
    if (angleDiff < 0) angleDiff += 2 * Math.PI
    const largeArc = angleDiff > Math.PI ? 1 : 0
    return `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${endX} ${endY}`
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
          <text
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current font-medium"
            style={{ fontSize: 14 }}
          >
            {title}
          </text>
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

              {/* Vertex points */}
              {transformedVertices.map((vertex, index) => (
                <motion.circle
                  key={`vertex-point-${index}`}
                  cx={vertex.x}
                  cy={vertex.y}
                  r={diagram.lineWeight}
                  fill="currentColor"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                />
              ))}

              {/* Vertex labels */}
              {transformedVertices.map((vertex, index) => {
                const dx = vertex.x - triCenter.x
                const dy = vertex.y - triCenter.y
                const dist = Math.hypot(dx, dy)
                const labelDist = 20
                return (
                  <motion.text
                    key={`vertex-label-${index}`}
                    x={vertex.x + (dx / dist) * labelDist}
                    y={vertex.y + (dy / dist) * labelDist}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current font-bold"
                    style={{ fontSize: 14 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    {vertex.label}
                  </motion.text>
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
                    {side.highlight && (
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={diagram.colors.primary}
                        strokeWidth={diagram.lineWeight + 1}
                      />
                    )}
                    <text
                      x={midpoint.x + perpX * 15 * direction}
                      y={midpoint.y + perpY * 15 * direction}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fill: diagram.colors.primary, fontSize: 14, fontWeight: 500 }}
                    >
                      {side.length}
                    </text>
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

                const arcPath = angle.rightAngle
                  ? drawRightAngle(angle.vertex)
                  : drawAngleArc(angle.vertex)

                // Angle label position (inside the angle)
                const vertexIndex = vertices.findIndex((v) => v.label === angle.vertex)
                const prevIndex = (vertexIndex + 2) % 3
                const nextIndex = (vertexIndex + 1) % 3
                const prev = transformedVertices[prevIndex]
                const next = transformedVertices[nextIndex]
                const a1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
                const a2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)
                const midAngle = (a1 + a2) / 2
                const labelDist = 30
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
                    {angle.measure && (
                      <motion.text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-gray-600 dark:fill-gray-400"
                        style={{ fontSize: 12 }}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                        transition={{ delay: index * 0.15 + 0.2 }}
                      >
                        {angle.measure}
                      </motion.text>
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
                    <motion.path
                      d={`M ${from.x} ${from.y} L ${foot.x} ${foot.y}`}
                      stroke="#10B981"
                      strokeWidth={diagram.lineWeight}
                      strokeDasharray="5,5"
                      fill="none"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <rect
                      x={foot.x - 5}
                      y={foot.y - 5}
                      width={10}
                      height={10}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth={1}
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
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#EF4444" strokeWidth={4} strokeDasharray="6,4" opacity={0.8} />
                    <circle cx={midX} cy={midY} r={10} fill="#EF4444" opacity={0.2} />
                    <line x1={midX - 6} y1={midY - 6} x2={midX + 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                    <line x1={midX + 6} y1={midY - 6} x2={midX - 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                    {errorHighlight?.corrections?.[sideLabel] && (
                      <text x={midX} y={midY - 18} textAnchor="middle" style={{ fill: '#EF4444', fontSize: 12, fontWeight: 500 }}>
                        {errorHighlight.corrections[sideLabel]}
                      </text>
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
                      <text x={vertex.x} y={vertex.y + 25} textAnchor="middle" style={{ fill: '#EF4444', fontSize: 12, fontWeight: 500 }}>
                        {errorHighlight.corrections[vertexLabel]}
                      </text>
                    )}
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default Triangle
