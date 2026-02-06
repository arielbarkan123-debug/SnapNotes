'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleCongruenceData } from '@/types/math'
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

interface TriangleCongruenceProps {
  data: TriangleCongruenceData
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
  drawTriangles: { en: 'Draw triangles', he: 'ציור משולשים' },
  labelParts: { en: 'Label parts', he: 'תיוג חלקים' },
  showCorrespondence: { en: 'Show correspondence', he: 'הצגת התאמה' },
  showCriterion: { en: 'Show criterion', he: 'הצגת קריטריון' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180

/**
 * Scale and translate triangle vertices to fit within a bounding box.
 */
function fitTriangle(
  vertices: Array<{ x: number; y: number }>,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  padding: number = 20
): Array<{ x: number; y: number }> {
  if (vertices.length === 0) return vertices
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const vw = maxX - minX || 1
  const vh = maxY - minY || 1
  const scale = Math.min((bw - 2 * padding) / vw, (bh - 2 * padding) / vh)
  const cx = bx + bw / 2
  const cy = by + bh / 2
  const ocx = (minX + maxX) / 2
  const ocy = (minY + maxY) / 2
  return vertices.map((v) => ({
    x: cx + (v.x - ocx) * scale,
    y: cy + (v.y - ocy) * scale,
  }))
}

/**
 * Compute the midpoint of a side for labelling.
 */
function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Offset a midpoint outward from the triangle centroid for label placement.
 */
function offsetFromCentroid(
  pt: { x: number; y: number },
  centroid: { x: number; y: number },
  dist: number
) {
  const dx = pt.x - centroid.x
  const dy = pt.y - centroid.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: pt.x + (dx / len) * dist, y: pt.y + (dy / len) * dist }
}

/**
 * Compute the centroid of a triangle.
 */
function centroid(verts: Array<{ x: number; y: number }>) {
  return {
    x: (verts[0].x + verts[1].x + verts[2].x) / 3,
    y: (verts[0].y + verts[1].y + verts[2].y) / 3,
  }
}

/**
 * Create an SVG arc path for an angle at a vertex.
 */
function angleArcPath(
  cx: number,
  cy: number,
  startAngle: number,
  endAngle: number,
  radius: number
): string {
  let sa = startAngle
  let ea = endAngle
  let diff = ea - sa
  if (diff < 0) diff += 360
  if (diff > 180) {
    const tmp = sa
    sa = ea
    ea = tmp
    diff = 360 - diff
  }
  const largeArc = diff > 180 ? 1 : 0
  const x1 = cx + radius * Math.cos(sa * DEG)
  const y1 = cy - radius * Math.sin(sa * DEG)
  const x2 = cx + radius * Math.cos(ea * DEG)
  const y2 = cy - radius * Math.sin(ea * DEG)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`
}

/**
 * Compute angle directions at vertex i for drawing an arc.
 */
function vertexAngleDirs(
  verts: Array<{ x: number; y: number }>,
  i: number
): { start: number; end: number } {
  const n = verts.length
  const prev = verts[(i - 1 + n) % n]
  const curr = verts[i]
  const next = verts[(i + 1) % n]
  const a1 = Math.atan2(-(prev.y - curr.y), prev.x - curr.x) / DEG
  const a2 = Math.atan2(-(next.y - curr.y), next.x - curr.x) / DEG
  return { start: a1, end: a2 }
}

/**
 * Render tick marks on a side to indicate congruence.
 * `count` is the number of ticks (1, 2, or 3).
 */
function sideTickMarks(
  a: { x: number; y: number },
  b: { x: number; y: number },
  count: number,
  color: string,
  lineWeight: number
): JSX.Element[] {
  const mid = midpoint(a, b)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  // Perpendicular direction
  const px = -dy / len
  const py = dx / len
  // Along-side direction (unit)
  const ax = dx / len
  const ay = dy / len
  const tickLen = 8
  const tickSpacing = 5

  const marks: JSX.Element[] = []
  for (let t = 0; t < count; t++) {
    const offset = (t - (count - 1) / 2) * tickSpacing
    const cx = mid.x + ax * offset
    const cy = mid.y + ay * offset
    marks.push(
      <line
        key={`tick-${t}`}
        x1={cx - px * tickLen}
        y1={cy - py * tickLen}
        x2={cx + px * tickLen}
        y2={cy + py * tickLen}
        stroke={color}
        strokeWidth={lineWeight}
        strokeLinecap="round"
      />
    )
  }
  return marks
}

/**
 * Render arc marks at a vertex to indicate congruent angles.
 * `count` is the number of arcs (1, 2, or 3).
 */
function angleArcMarks(
  verts: Array<{ x: number; y: number }>,
  vertexIndex: number,
  count: number,
  color: string,
  lineWeight: number
): JSX.Element[] {
  const dirs = vertexAngleDirs(verts, vertexIndex)
  const marks: JSX.Element[] = []
  const baseRadius = 16
  const arcSpacing = 5
  for (let t = 0; t < count; t++) {
    const r = baseRadius + t * arcSpacing
    marks.push(
      <path
        key={`arc-mark-${t}`}
        d={angleArcPath(
          verts[vertexIndex].x,
          verts[vertexIndex].y,
          dirs.start,
          dirs.end,
          r
        )}
        fill="none"
        stroke={color}
        strokeWidth={lineWeight}
        strokeLinecap="round"
      />
    )
  }
  return marks
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TriangleCongruence({
  data,
  className = '',
  width = 520,
  height = 380,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TriangleCongruenceProps) {
  const {
    triangle1,
    triangle2,
    criterion,
    correspondingParts,
    showCongruenceMarks = true,
    title,
  } = data

  // Fit triangles into left/right halves of the viewBox
  const gap = 20
  const halfW = (width - gap) / 2
  const verts1 = useMemo(
    () => fitTriangle(triangle1.vertices, 0, 30, halfW, height - 80),
    [triangle1.vertices, halfW, height]
  )
  const verts2 = useMemo(
    () => fitTriangle(triangle2.vertices, halfW + gap, 30, halfW, height - 80),
    [triangle2.vertices, halfW, gap, height]
  )

  const centroid1 = useMemo(() => centroid(verts1), [verts1])
  const centroid2 = useMemo(() => centroid(verts2), [verts2])

  // Build step definitions
  const stepDefs = useMemo(() => {
    return [
      { id: 'drawTriangles', label: STEP_LABELS.drawTriangles.en, labelHe: STEP_LABELS.drawTriangles.he },
      { id: 'labelParts', label: STEP_LABELS.labelParts.en, labelHe: STEP_LABELS.labelParts.he },
      { id: 'showCorrespondence', label: STEP_LABELS.showCorrespondence.en, labelHe: STEP_LABELS.showCorrespondence.he },
      { id: 'showCriterion', label: STEP_LABELS.showCriterion.en, labelHe: STEP_LABELS.showCriterion.he },
    ]
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

  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Build correspondence map: for each corresponding part, assign a tick/arc count (1-based)
  const correspondenceMap = useMemo(() => {
    let sideCounter = 0
    let angleCounter = 0
    return correspondingParts.map((part) => {
      if (part.type === 'side') {
        sideCounter++
        return { ...part, markCount: sideCounter }
      } else {
        angleCounter++
        return { ...part, markCount: angleCounter }
      }
    })
  }, [correspondingParts])

  // Vertex labels
  const labels1 = ['A', 'B', 'C']
  const labels2 = ['D', 'E', 'F']

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="triangle-congruence"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="tc-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="tc-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw triangles */}
        <AnimatePresence>
          {isVisible('drawTriangles') && (
            <motion.g
              data-testid="tc-triangles"
              initial="hidden"
              animate={isCurrent('drawTriangles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle 1 */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                return (
                  <motion.line
                    key={`t1-edge-${i}`}
                    x1={verts1[i].x}
                    y1={verts1[i].y}
                    x2={verts1[j].x}
                    y2={verts1[j].y}
                    stroke={primaryColor}
                    strokeWidth={diagram.lineWeight}
                    strokeLinecap="round"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
              {/* Triangle 1 vertex labels */}
              {verts1.map((v, i) => {
                const off = offsetFromCentroid(v, centroid1, 16)
                return (
                  <motion.text
                    key={`t1-label-${i}`}
                    x={off.x}
                    y={off.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    fontWeight={600}
                    fill={primaryColor}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {labels1[i]}
                  </motion.text>
                )
              })}

              {/* Triangle 2 */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                return (
                  <motion.line
                    key={`t2-edge-${i}`}
                    x1={verts2[i].x}
                    y1={verts2[i].y}
                    x2={verts2[j].x}
                    y2={verts2[j].y}
                    stroke={accentColor}
                    strokeWidth={diagram.lineWeight}
                    strokeLinecap="round"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
              {/* Triangle 2 vertex labels */}
              {verts2.map((v, i) => {
                const off = offsetFromCentroid(v, centroid2, 16)
                return (
                  <motion.text
                    key={`t2-label-${i}`}
                    x={off.x}
                    y={off.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    fontWeight={600}
                    fill={accentColor}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {labels2[i]}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label parts (side lengths and angle measures) */}
        <AnimatePresence>
          {isVisible('labelParts') && (
            <motion.g
              data-testid="tc-labels"
              initial="hidden"
              animate={isCurrent('labelParts') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle 1 side labels */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                const mid = midpoint(verts1[i], verts1[j])
                const off = offsetFromCentroid(mid, centroid1, 14)
                return (
                  <motion.text
                    key={`t1-side-${i}`}
                    x={off.x}
                    y={off.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={500}
                    fill={primaryColor}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {triangle1.sides[i]}
                  </motion.text>
                )
              })}
              {/* Triangle 1 angle arcs and labels */}
              {[0, 1, 2].map((i) => {
                const dirs = vertexAngleDirs(verts1, i)
                const arcMidAngle = ((dirs.start + dirs.end) / 2) * DEG
                return (
                  <motion.g key={`t1-angle-${i}`}>
                    <motion.path
                      d={angleArcPath(verts1[i].x, verts1[i].y, dirs.start, dirs.end, 18)}
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth={1.5}
                      opacity={0.6}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      x={verts1[i].x + 28 * Math.cos(arcMidAngle)}
                      y={verts1[i].y - 28 * Math.sin(arcMidAngle)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={500}
                      fill={primaryColor}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {triangle1.angles[i]}°
                    </motion.text>
                  </motion.g>
                )
              })}

              {/* Triangle 2 side labels */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                const mid = midpoint(verts2[i], verts2[j])
                const off = offsetFromCentroid(mid, centroid2, 14)
                return (
                  <motion.text
                    key={`t2-side-${i}`}
                    x={off.x}
                    y={off.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={500}
                    fill={accentColor}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {triangle2.sides[i]}
                  </motion.text>
                )
              })}
              {/* Triangle 2 angle arcs and labels */}
              {[0, 1, 2].map((i) => {
                const dirs = vertexAngleDirs(verts2, i)
                const arcMidAngle = ((dirs.start + dirs.end) / 2) * DEG
                return (
                  <motion.g key={`t2-angle-${i}`}>
                    <motion.path
                      d={angleArcPath(verts2[i].x, verts2[i].y, dirs.start, dirs.end, 18)}
                      fill="none"
                      stroke={accentColor}
                      strokeWidth={1.5}
                      opacity={0.6}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      x={verts2[i].x + 28 * Math.cos(arcMidAngle)}
                      y={verts2[i].y - 28 * Math.sin(arcMidAngle)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={500}
                      fill={accentColor}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {triangle2.angles[i]}°
                    </motion.text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show correspondence (tick marks and arc marks) */}
        <AnimatePresence>
          {isVisible('showCorrespondence') && showCongruenceMarks && (
            <motion.g
              data-testid="tc-correspondence"
              initial="hidden"
              animate={isCurrent('showCorrespondence') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {correspondenceMap.map((part, pi) => {
                if (part.type === 'side') {
                  // Side correspondence: tick marks on both triangles
                  const i1 = part.index1
                  const j1 = (i1 + 1) % 3
                  const i2 = part.index2
                  const j2 = (i2 + 1) % 3
                  return (
                    <motion.g
                      key={`corr-side-${pi}`}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {sideTickMarks(verts1[i1], verts1[j1], part.markCount, primaryColor, diagram.lineWeight)}
                      {sideTickMarks(verts2[i2], verts2[j2], part.markCount, accentColor, diagram.lineWeight)}
                    </motion.g>
                  )
                } else {
                  // Angle correspondence: arc marks on both triangles
                  return (
                    <motion.g
                      key={`corr-angle-${pi}`}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {angleArcMarks(verts1, part.index1, part.markCount, primaryColor, diagram.lineWeight)}
                      {angleArcMarks(verts2, part.index2, part.markCount, accentColor, diagram.lineWeight)}
                    </motion.g>
                  )
                }
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show criterion */}
        <AnimatePresence>
          {isVisible('showCriterion') && (
            <motion.g
              data-testid="tc-criterion"
              initial="hidden"
              animate={isCurrent('showCriterion') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Criterion badge */}
              <motion.rect
                x={width / 2 - 70}
                y={height - 42}
                width={140}
                height={32}
                rx={8}
                fill={primaryColor}
                opacity={0.9}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              />
              <motion.text
                x={width / 2}
                y={height - 22}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={16}
                fontWeight={800}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {criterion} ≅
              </motion.text>
              {/* Congruence statement */}
              <motion.text
                x={width / 2}
                y={height - 52}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                className="fill-gray-600 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                △{labels1.join('')} ≅ △{labels2.join('')}
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

export default TriangleCongruence
