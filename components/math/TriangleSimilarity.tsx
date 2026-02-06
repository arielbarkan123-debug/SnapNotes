'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleSimilarityData } from '@/types/math'
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

interface TriangleSimilarityProps {
  data: TriangleSimilarityData
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
  showAngles: { en: 'Show equal angles', he: 'הצגת זוויות שוות' },
  showRatios: { en: 'Show side ratios', he: 'הצגת יחסי צלעות' },
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
 * Compute the midpoint of a side.
 */
function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Offset a point outward from the triangle centroid for label placement.
 */
function offsetFromCentroid(
  pt: { x: number; y: number },
  ctr: { x: number; y: number },
  dist: number
) {
  const dx = pt.x - ctr.x
  const dy = pt.y - ctr.y
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
 * Render arc marks at a vertex to indicate equal angles.
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

/**
 * Format a scale factor for display.
 */
function formatScale(k: number): string {
  if (Number.isInteger(k)) return String(k)
  return k.toFixed(2).replace(/\.?0+$/, '')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TriangleSimilarity({
  data,
  className = '',
  width = 520,
  height = 380,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TriangleSimilarityProps) {
  const {
    triangle1,
    triangle2,
    criterion,
    scaleFactor,
    showRatios = true,
    title,
  } = data

  // Fit triangle1 (smaller) into left ~40% and triangle2 (larger) into right ~55%
  const gap = 20
  const leftW = (width - gap) * 0.4
  const rightW = (width - gap) * 0.6
  const verts1 = useMemo(
    () => fitTriangle(triangle1.vertices, 0, 30, leftW, height - 90),
    [triangle1.vertices, leftW, height]
  )
  const verts2 = useMemo(
    () => fitTriangle(triangle2.vertices, leftW + gap, 30, rightW, height - 90),
    [triangle2.vertices, leftW, gap, rightW, height]
  )

  const centroid1 = useMemo(() => centroid(verts1), [verts1])
  const centroid2 = useMemo(() => centroid(verts2), [verts2])

  // Determine step definitions - showRatios step is conditional
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawTriangles', label: STEP_LABELS.drawTriangles.en, labelHe: STEP_LABELS.drawTriangles.he },
      { id: 'showAngles', label: STEP_LABELS.showAngles.en, labelHe: STEP_LABELS.showAngles.he },
    ]
    if (showRatios) {
      defs.push({ id: 'showRatios', label: STEP_LABELS.showRatios.en, labelHe: STEP_LABELS.showRatios.he })
    }
    defs.push({ id: 'showCriterion', label: STEP_LABELS.showCriterion.en, labelHe: STEP_LABELS.showCriterion.he })
    return defs
  }, [showRatios])

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

  // Vertex labels
  const labels1 = ['A', 'B', 'C']
  const labels2 = ['D', 'E', 'F']

  // Build ratio text: "a1/a2 = b1/b2 = c1/c2 = k"
  const ratioText = useMemo(() => {
    const pairs = triangle1.sides.map((s1, i) => {
      const s2 = triangle2.sides[i]
      return s1 + '/' + s2
    })
    return pairs.join(' = ') + ' = ' + formatScale(scaleFactor)
  }, [triangle1.sides, triangle2.sides, scaleFactor])

  const viewBox = '0 0 ' + width + ' ' + height

  return (
    <div
      data-testid="triangle-similarity"
      className={'bg-white dark:bg-gray-900 rounded-lg p-4 ' + className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="ts-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="ts-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw triangles */}
        <AnimatePresence>
          {isVisible('drawTriangles') && (
            <motion.g
              data-testid="ts-triangles"
              initial="hidden"
              animate={isCurrent('drawTriangles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle 1 (smaller) */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                return (
                  <motion.line
                    key={'t1-edge-' + i}
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
                    key={'t1-label-' + i}
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
              {/* Triangle 1 side labels */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                const mid = midpoint(verts1[i], verts1[j])
                const off = offsetFromCentroid(mid, centroid1, 14)
                return (
                  <motion.text
                    key={'t1-side-' + i}
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

              {/* Triangle 2 (larger) */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                return (
                  <motion.line
                    key={'t2-edge-' + i}
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
                    key={'t2-label-' + i}
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
              {/* Triangle 2 side labels */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                const mid = midpoint(verts2[i], verts2[j])
                const off = offsetFromCentroid(mid, centroid2, 14)
                return (
                  <motion.text
                    key={'t2-side-' + i}
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
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Show equal angles */}
        <AnimatePresence>
          {isVisible('showAngles') && (
            <motion.g
              data-testid="ts-angles"
              initial="hidden"
              animate={isCurrent('showAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Matching angle arcs on both triangles */}
              {[0, 1, 2].map((i) => {
                const dirs1 = vertexAngleDirs(verts1, i)
                const dirs2 = vertexAngleDirs(verts2, i)
                const arcMid1 = ((dirs1.start + dirs1.end) / 2) * DEG
                const arcMid2 = ((dirs2.start + dirs2.end) / 2) * DEG
                const markCount = i + 1
                return (
                  <motion.g key={'angle-pair-' + i}>
                    {/* Triangle 1 angle arcs */}
                    {angleArcMarks(verts1, i, markCount, primaryColor, 1.5).map(
                      (el, idx) => (
                        <motion.g
                          key={'t1-arc-' + i + '-' + idx}
                          initial="hidden"
                          animate="visible"
                          variants={lineDrawVariants}
                        >
                          {el}
                        </motion.g>
                      )
                    )}
                    {/* Triangle 1 angle label */}
                    <motion.text
                      x={verts1[i].x + 32 * Math.cos(arcMid1)}
                      y={verts1[i].y - 32 * Math.sin(arcMid1)}
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

                    {/* Triangle 2 angle arcs */}
                    {angleArcMarks(verts2, i, markCount, accentColor, 1.5).map(
                      (el, idx) => (
                        <motion.g
                          key={'t2-arc-' + i + '-' + idx}
                          initial="hidden"
                          animate="visible"
                          variants={lineDrawVariants}
                        >
                          {el}
                        </motion.g>
                      )
                    )}
                    {/* Triangle 2 angle label */}
                    <motion.text
                      x={verts2[i].x + 32 * Math.cos(arcMid2)}
                      y={verts2[i].y - 32 * Math.sin(arcMid2)}
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

        {/* Step 2 (conditional): Show side ratios */}
        <AnimatePresence>
          {showRatios && isVisible('showRatios') && (
            <motion.g
              data-testid="ts-ratios"
              initial="hidden"
              animate={isCurrent('showRatios') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Ratio equation */}
              <motion.rect
                x={width / 2 - 140}
                y={height - 75}
                width={280}
                height={28}
                rx={6}
                fill={primaryColor}
                opacity={0.1}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              />
              <motion.text
                x={width / 2}
                y={height - 58}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={600}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {ratioText}
              </motion.text>

              {/* Dashed connector lines between corresponding sides */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                const mid1 = midpoint(verts1[i], verts1[j])
                const mid2 = midpoint(verts2[i], verts2[j])
                return (
                  <motion.line
                    key={'ratio-line-' + i}
                    x1={mid1.x}
                    y1={mid1.y}
                    x2={mid2.x}
                    y2={mid2.y}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.5}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Final step: Show criterion */}
        <AnimatePresence>
          {isVisible('showCriterion') && (
            <motion.g
              data-testid="ts-criterion"
              initial="hidden"
              animate={isCurrent('showCriterion') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Criterion badge */}
              <motion.rect
                x={width / 2 - 60}
                y={height - 42}
                width={120}
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
                {criterion} ~
              </motion.text>
              {/* Similarity statement */}
              <motion.text
                x={width / 2}
                y={showRatios ? height - 88 : height - 52}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                className="fill-gray-600 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {'\u25B3' + labels1.join('') + ' ~ \u25B3' + labels2.join('') + (language === 'he' ? '  (\u05D2\u05D5\u05E8\u05DD \u05E7\u05E0\u05D4\u0022\u05DE: ' : '  (scale factor: ') + formatScale(scaleFactor) + ')'}
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

export default TriangleSimilarity
