'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleGeometryData } from '@/types/geometry'
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

interface TriangleGeometryProps {
  data: TriangleGeometryData
  width?: number
  height?: number
  className?: string
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Draw the triangle', he: '\u05E6\u05D9\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9' },
  vertices: { en: 'Label vertices', he: '\u05E1\u05D9\u05DE\u05D5\u05DF \u05E7\u05D5\u05D3\u05E7\u05D5\u05D3\u05D9\u05DD' },
  measurements: { en: 'Show measurements', he: '\u05D4\u05E6\u05D2\u05EA \u05DE\u05D9\u05D3\u05D5\u05EA' },
  constructions: { en: 'Show constructions', he: '\u05D4\u05E6\u05D2\u05EA \u05E7\u05D5\u05D5\u05D9\u05DD \u05E2\u05D6\u05E8' },
  errors: { en: 'Show corrections', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TriangleGeometry -- Phase 2 rebuild.
 *
 * Quality checklist:
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
export function TriangleGeometry({
  data,
  width = 400,
  height = 350,
  className = '',
  subject = 'geometry',
  complexity = 'middle_school',
  language = 'en',
  initialStep,
}: TriangleGeometryProps) {
  const {
    vertices,
    sides,
    angles,
    height: heightLine,
    highlightSides = [],
    highlightAngles = [],
    showRightAngleMarker = true,
  } = data

  // ------ Detect optional features ------
  const hasConstructions = !!(
    heightLine?.showLine ||
    highlightSides.length > 0
  )
  const hasErrors = !!(
    highlightAngles.length > 0 &&
    angles &&
    Object.values(angles).some((a) => a !== undefined)
  )

  // Build dynamic step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'vertices', label: STEP_LABELS.vertices.en, labelHe: STEP_LABELS.vertices.he },
      { id: 'measurements', label: STEP_LABELS.measurements.en, labelHe: STEP_LABELS.measurements.he },
    ]
    if (hasConstructions) {
      defs.push({ id: 'constructions', label: STEP_LABELS.constructions.en, labelHe: STEP_LABELS.constructions.he })
    }
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [hasConstructions, hasErrors])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Spotlight variants
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary],
  )

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = 40
  const plotHeight = height - padding * 2

  // Transform data vertices to SVG coordinates
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const dataWidth = maxX - minX || 1
  const dataHeight = maxY - minY || 1
  const plotWidth = width - padding * 2
  const scale = Math.min(plotWidth / dataWidth, plotHeight / dataHeight) * 0.8

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const transformPt = (x: number, y: number) => ({
    x: width / 2 + (x - centerX) * scale,
    y: padding + plotHeight / 2 - (y - centerY) * scale,
  })

  const tverts = vertices.map((v, i) => ({
    ...transformPt(v.x, v.y),
    label: v.label || String.fromCharCode(65 + i),
  }))

  const trianglePath = `M ${tverts[0].x} ${tverts[0].y} L ${tverts[1].x} ${tverts[1].y} L ${tverts[2].x} ${tverts[2].y} Z`

  // Side mapping: a = BC (1,2), b = AC (0,2), c = AB (0,1)
  const sideIndices: Record<string, [number, number]> = {
    a: [1, 2],
    b: [0, 2],
    c: [0, 1],
  }

  const getMidpoint = (i1: number, i2: number) => ({
    x: (tverts[i1].x + tverts[i2].x) / 2,
    y: (tverts[i1].y + tverts[i2].y) / 2,
  })

  const getLabelOffset = (i1: number, i2: number, offset: number = 15) => {
    const dx = tverts[i2].x - tverts[i1].x
    const dy = tverts[i2].y - tverts[i1].y
    const len = Math.hypot(dx, dy)
    if (len === 0) return { x: 0, y: -offset }
    return { x: (-dy / len) * offset, y: (dx / len) * offset }
  }

  // Angle calculations using law of cosines
  const calcAngles = useMemo(() => {
    const { a, b, c } = sides
    const A = Math.acos((b * b + c * c - a * a) / (2 * b * c)) * (180 / Math.PI)
    const B = Math.acos((a * a + c * c - b * b) / (2 * a * c)) * (180 / Math.PI)
    const C = 180 - A - B
    return { A, B, C }
  }, [sides])

  // Determine right-angle vertex
  const rightAngleVertex = useMemo(() => {
    if (data.type !== 'right' && data.type !== 'right-isosceles') return null
    const diffs = [
      { index: 0, diff: Math.abs(calcAngles.A - 90) },
      { index: 1, diff: Math.abs(calcAngles.B - 90) },
      { index: 2, diff: Math.abs(calcAngles.C - 90) },
    ]
    const closest = diffs.reduce((a, b) => (a.diff < b.diff ? a : b))
    return closest.diff < 5 ? closest.index : null
  }, [data.type, calcAngles])

  // Draw angle arc at a vertex
  const drawAngleArc = (vertexIndex: number, radius: number = 20) => {
    const vertex = tverts[vertexIndex]
    const prev = tverts[(vertexIndex + 2) % 3]
    const next = tverts[(vertexIndex + 1) % 3]
    const a1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
    const a2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)
    const sx = vertex.x + radius * Math.cos(a1)
    const sy = vertex.y + radius * Math.sin(a1)
    const ex = vertex.x + radius * Math.cos(a2)
    const ey = vertex.y + radius * Math.sin(a2)
    let diff = a2 - a1
    if (diff < 0) diff += 2 * Math.PI
    const large = diff > Math.PI ? 1 : 0
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey}`
  }

  // Draw right angle marker
  const drawRightAngle = (vertexIndex: number, size: number = 12) => {
    const vertex = tverts[vertexIndex]
    const prev = tverts[(vertexIndex + 2) % 3]
    const next = tverts[(vertexIndex + 1) % 3]
    const d1 = {
      x: (prev.x - vertex.x) / Math.hypot(prev.x - vertex.x, prev.y - vertex.y),
      y: (prev.y - vertex.y) / Math.hypot(prev.x - vertex.x, prev.y - vertex.y),
    }
    const d2 = {
      x: (next.x - vertex.x) / Math.hypot(next.x - vertex.x, next.y - vertex.y),
      y: (next.y - vertex.y) / Math.hypot(next.x - vertex.x, next.y - vertex.y),
    }
    const p1 = { x: vertex.x + d1.x * size, y: vertex.y + d1.y * size }
    const p2 = { x: vertex.x + (d1.x + d2.x) * size, y: vertex.y + (d1.y + d2.y) * size }
    const p3 = { x: vertex.x + d2.x * size, y: vertex.y + d2.y * size }
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
      data-testid="triangle-geometry"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Triangle with sides ${sides.a}, ${sides.b}, ${sides.c}`}
      >
        {/* Background */}
        <rect
          data-testid="tg-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* ---- Step 0: Draw the triangle (outline) ---- */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="tg-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Light fill */}
              <path
                d={trianglePath}
                fill={diagram.colors.primary}
                fillOpacity={0.08}
                stroke="none"
              />
              {/* Outline path with draw animation */}
              <motion.path
                d={trianglePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 1: Label vertices ---- */}
        <AnimatePresence>
          {isVisible('vertices') && (
            <motion.g
              data-testid="tg-vertices"
              initial="hidden"
              animate={isCurrent('vertices') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {tverts.map((v, i) => {
                const cx = tverts.reduce((s, vt) => s + vt.x, 0) / 3
                const cy = tverts.reduce((s, vt) => s + vt.y, 0) / 3
                const dx = v.x - cx
                const dy = v.y - cy
                const dist = Math.hypot(dx, dy)
                const labelDist = 20
                return (
                  <motion.g
                    key={`vertex-${i}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: i * 0.1 }}
                  >
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r={diagram.lineWeight}
                      fill={diagram.colors.primary}
                    />
                    <text
                      x={v.x + (dist > 0 ? (dx / dist) * labelDist : 0)}
                      y={v.y + (dist > 0 ? (dy / dist) * labelDist : -labelDist)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-current text-sm font-bold"
                    >
                      {v.label}
                    </text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 2: Show measurements (sides + angles) ---- */}
        <AnimatePresence>
          {isVisible('measurements') && (
            <motion.g
              data-testid="tg-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Side labels */}
              {(['a', 'b', 'c'] as const).map((sideKey, idx) => {
                const [i1, i2] = sideIndices[sideKey]
                const mid = getMidpoint(i1, i2)
                const off = getLabelOffset(i1, i2)
                const label = sides.labels?.[sideKey] || sideKey
                const value = sides[sideKey]
                return (
                  <motion.text
                    key={`side-${sideKey}`}
                    x={mid.x + off.x}
                    y={mid.y + off.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fill: diagram.colors.primary, fontSize: '13px', fontWeight: 500 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {label} = {value}
                  </motion.text>
                )
              })}

              {/* Angle arcs */}
              {[0, 1, 2].map((i) => {
                const isRight = rightAngleVertex === i && showRightAngleMarker
                const angleKey = (['A', 'B', 'C'] as const)[i]
                const angleVal = angles?.[angleKey]
                const calcVal = calcAngles[angleKey]
                return (
                  <motion.g
                    key={`angle-${i}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <path
                      d={isRight ? drawRightAngle(i) : drawAngleArc(i)}
                      fill="none"
                      stroke={diagram.colors.accent}
                      strokeWidth={1.5}
                    />
                    {(angleVal !== undefined || calcVal !== undefined) && (
                      <text
                        x={tverts[i].x + (tverts[i].x - (tverts.reduce((s, vt) => s + vt.x, 0) / 3)) * 0.3}
                        y={tverts[i].y + (tverts[i].y - (tverts.reduce((s, vt) => s + vt.y, 0) / 3)) * 0.3}
                        textAnchor="middle"
                        className="text-xs"
                        style={{ fill: diagram.colors.accent }}
                      >
                        {angleVal ?? Math.round(calcVal)}°
                      </text>
                    )}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 3: Show constructions (altitude, highlighted sides) ---- */}
        <AnimatePresence>
          {hasConstructions && isVisible('constructions') && (
            <motion.g
              data-testid="tg-constructions"
              initial="hidden"
              animate={isCurrent('constructions') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Height / altitude line */}
              {heightLine?.showLine && (() => {
                const fromIndex = { A: 0, B: 1, C: 2 }[heightLine.from]
                const from = tverts[fromIndex]
                const oppIndices = [[1, 2], [0, 2], [0, 1]][fromIndex]
                const p1 = tverts[oppIndices[0]]
                const p2 = tverts[oppIndices[1]]
                const dx = p2.x - p1.x
                const dy = p2.y - p1.y
                const t = ((from.x - p1.x) * dx + (from.y - p1.y) * dy) / (dx * dx + dy * dy)
                const foot = { x: p1.x + t * dx, y: p1.y + t * dy }
                return (
                  <g>
                    <motion.path
                      d={`M ${from.x} ${from.y} L ${foot.x} ${foot.y}`}
                      stroke={diagram.colors.accent}
                      strokeWidth={diagram.lineWeight}
                      strokeDasharray="5,3"
                      fill="none"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      x={(from.x + foot.x) / 2 + 10}
                      y={(from.y + foot.y) / 2}
                      style={{ fill: diagram.colors.accent, fontSize: '12px', fontWeight: 500 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: 0.3 }}
                    >
                      h = {heightLine.value}
                    </motion.text>
                  </g>
                )
              })()}

              {/* Highlighted sides */}
              {highlightSides.map((sideKey) => {
                const [i1, i2] = sideIndices[sideKey]
                return (
                  <motion.path
                    key={`hl-${sideKey}`}
                    d={`M ${tverts[i1].x} ${tverts[i1].y} L ${tverts[i2].x} ${tverts[i2].y}`}
                    stroke={diagram.colors.primary}
                    strokeWidth={diagram.lineWeight + 1}
                    fill="none"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 4: Show corrections (error highlights) ---- */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="tg-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {highlightAngles.map((angleKey) => {
                const idx = { A: 0, B: 1, C: 2 }[angleKey]
                const v = tverts[idx]
                return (
                  <g key={`err-${angleKey}`}>
                    <circle cx={v.x} cy={v.y} r={14} fill="#EF4444" opacity={0.2} />
                    <text
                      x={v.x}
                      y={v.y + 24}
                      textAnchor="middle"
                      style={{ fill: '#EF4444', fontSize: '11px', fontWeight: 600 }}
                    >
                      {language === 'he' ? '\u05E9\u05D2\u05D9\u05D0\u05D4' : 'Error'}
                    </text>
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

export default TriangleGeometry
