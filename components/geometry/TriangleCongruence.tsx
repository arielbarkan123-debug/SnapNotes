'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleCongruenceData } from '@/types/geometry'
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
  triangle1: { en: 'Draw first triangle', he: 'ציור משולש ראשון' },
  triangle2: { en: 'Draw second triangle', he: 'ציור משולש שני' },
  givenParts: { en: 'Mark given congruent parts', he: 'סימון חלקים נתונים חופפים' },
  criterion: { en: 'Show congruence criterion', he: 'הצגת כלל חפיפה' },
  allParts: { en: 'Mark all corresponding parts', he: 'סימון כל החלקים המתאימים' },
}

interface TriangleCongruenceProps {
  data: TriangleCongruenceData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * TriangleCongruence - Two congruent triangles with marked corresponding parts
 */
export function TriangleCongruence({
  data,
  width = 500,
  height = 350,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: TriangleCongruenceProps) {
  const { triangle1, triangle2, criterion, correspondingParts, title } = data

  const stepDefs = useMemo(
    () => [
      { id: 'triangle1', label: STEP_LABELS.triangle1.en, labelHe: STEP_LABELS.triangle1.he },
      { id: 'triangle2', label: STEP_LABELS.triangle2.en, labelHe: STEP_LABELS.triangle2.he },
      { id: 'givenParts', label: STEP_LABELS.givenParts.en, labelHe: STEP_LABELS.givenParts.he },
      { id: 'criterion', label: STEP_LABELS.criterion.en, labelHe: STEP_LABELS.criterion.he },
      { id: 'allParts', label: STEP_LABELS.allParts.en, labelHe: STEP_LABELS.allParts.he },
    ],
    []
  )

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

  // Map triangle vertices to SVG space
  const padding = 40
  const halfW = width / 2

  const mapVertices = (
    vertices: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }],
    offsetX: number,
    areaW: number
  ) => {
    const xs = vertices.map((v) => v.x)
    const ys = vertices.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const scale = Math.min((areaW - padding * 2) / rangeX, (height - padding * 2) / rangeY) * 0.8
    const cxOffset = offsetX + (areaW - rangeX * scale) / 2
    const cyOffset = (height - rangeY * scale) / 2

    return vertices.map((v) => ({
      x: cxOffset + (v.x - minX) * scale,
      y: cyOffset + (v.y - minY) * scale,
    }))
  }

  const v1 = mapVertices(triangle1.vertices, 0, halfW)
  const v2 = mapVertices(triangle2.vertices, halfW, halfW)

  const triPath = (verts: { x: number; y: number }[]) =>
    `M ${verts[0].x} ${verts[0].y} L ${verts[1].x} ${verts[1].y} L ${verts[2].x} ${verts[2].y} Z`

  // Tick marks for equal sides
  const drawTickMarks = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    count: number,
    color: string
  ) => {
    const mx = (p1.x + p2.x) / 2
    const my = (p1.y + p2.y) / 2
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const nx = -dy / len
    const ny = dx / len
    const tickLen = 8
    const gap = 5

    const marks: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * gap
      const tx = mx + (dx / len) * offset
      const ty = my + (dy / len) * offset
      marks.push({
        x1: tx + nx * tickLen,
        y1: ty + ny * tickLen,
        x2: tx - nx * tickLen,
        y2: ty - ny * tickLen,
      })
    }

    return marks.map((m, idx) => (
      <motion.line
        key={`tick-${idx}`}
        x1={m.x1}
        y1={m.y1}
        x2={m.x2}
        y2={m.y2}
        stroke={color}
        strokeWidth={1.5}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: idx * 0.1 }}
      />
    ))
  }

  // Arc marks for equal angles
  const drawAngleArc = (
    vertex: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    count: number,
    color: string
  ) => {
    const r = 15
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)

    const arcs = []
    for (let i = 0; i < count; i++) {
      const ri = r + i * 4
      const sx = vertex.x + Math.cos(a1) * ri
      const sy = vertex.y + Math.sin(a1) * ri
      const ex = vertex.x + Math.cos(a2) * ri
      const ey = vertex.y + Math.sin(a2) * ri
      let sweep = 0
      let da = a2 - a1
      if (da < 0) da += Math.PI * 2
      if (da > Math.PI) sweep = 1
      arcs.push(
        <motion.path
          key={`arc-${i}`}
          d={`M ${sx} ${sy} A ${ri} ${ri} 0 0 ${sweep} ${ex} ${ey}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        />
      )
    }
    return arcs
  }

  // Determine given corresponding parts: which parts to mark
  const givenSideParts = correspondingParts.filter((p) => p.type === 'side')
  const givenAngleParts = correspondingParts.filter((p) => p.type === 'angle')

  // All parts (for step 4)
  const allSideParts = [0, 1, 2].map((i) => ({ type: 'side' as const, index1: i, index2: i }))
  const allAngleParts = [0, 1, 2].map((i) => ({ type: 'angle' as const, index1: i, index2: i }))

  const sideColor = GEOMETRY_COLORS.highlight.primary
  const angleColor = GEOMETRY_COLORS.highlight.secondary

  const renderSideMarks = (
    parts: Array<{ type: 'side' | 'angle'; index1: number; index2: number }>,
    verts1: { x: number; y: number }[],
    verts2: { x: number; y: number }[]
  ) =>
    parts
      .filter((p) => p.type === 'side')
      .map((p, i) => {
        const tickCount = i + 1
        return (
          <g key={`side-mark-${i}`}>
            {drawTickMarks(verts1[p.index1], verts1[(p.index1 + 1) % 3], tickCount, sideColor)}
            {drawTickMarks(verts2[p.index2], verts2[(p.index2 + 1) % 3], tickCount, sideColor)}
          </g>
        )
      })

  const renderAngleMarks = (
    parts: Array<{ type: 'side' | 'angle'; index1: number; index2: number }>,
    verts1: { x: number; y: number }[],
    verts2: { x: number; y: number }[]
  ) =>
    parts
      .filter((p) => p.type === 'angle')
      .map((p, i) => {
        const arcCount = i + 1
        const v1Vertex = verts1[p.index1]
        const v1P1 = verts1[(p.index1 + 1) % 3]
        const v1P2 = verts1[(p.index1 + 2) % 3]
        const v2Vertex = verts2[p.index2]
        const v2P1 = verts2[(p.index2 + 1) % 3]
        const v2P2 = verts2[(p.index2 + 2) % 3]
        return (
          <g key={`angle-mark-${i}`}>
            {drawAngleArc(v1Vertex, v1P1, v1P2, arcCount, angleColor)}
            {drawAngleArc(v2Vertex, v2P1, v2P2, arcCount, angleColor)}
          </g>
        )
      })

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="triangle-congruence-diagram"
      className={`geometry-triangle-congruence ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Triangle congruence (${criterion})${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="tc-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="tc-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: First triangle */}
        <AnimatePresence>
          {isVisible('triangle1') && (
            <motion.g
              data-testid="tc-triangle1"
              initial="hidden"
              animate={isCurrent('triangle1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={triPath(v1)}
                fill={diagram.colors.primary}
                fillOpacity={0.08}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              <motion.path
                data-testid="tc-tri1-path"
                d={triPath(v1)}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {v1.map((v, i) => (
                <motion.text
                  key={`v1-label-${i}`}
                  x={v.x + (v.x < halfW / 2 ? -12 : 12)}
                  y={v.y + (v.y < height / 2 ? -8 : 16)}
                  textAnchor="middle"
                  className="fill-current text-xs font-bold"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {String.fromCharCode(65 + i)}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Second triangle */}
        <AnimatePresence>
          {isVisible('triangle2') && (
            <motion.g
              data-testid="tc-triangle2"
              initial="hidden"
              animate={isCurrent('triangle2') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={triPath(v2)}
                fill={diagram.colors.accent}
                fillOpacity={0.08}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              <motion.path
                data-testid="tc-tri2-path"
                d={triPath(v2)}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {v2.map((v, i) => (
                <motion.text
                  key={`v2-label-${i}`}
                  x={v.x + (v.x < halfW + halfW / 2 ? -12 : 12)}
                  y={v.y + (v.y < height / 2 ? -8 : 16)}
                  textAnchor="middle"
                  className="fill-current text-xs font-bold"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {String.fromCharCode(68 + i)}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Mark given congruent parts */}
        <AnimatePresence>
          {isVisible('givenParts') && (
            <motion.g
              data-testid="tc-given-parts"
              initial="hidden"
              animate={isCurrent('givenParts') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {renderSideMarks(givenSideParts, v1, v2)}
              {renderAngleMarks(givenAngleParts, v1, v2)}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show criterion */}
        <AnimatePresence>
          {isVisible('criterion') && (
            <motion.g
              data-testid="tc-criterion"
              initial="hidden"
              animate={isCurrent('criterion') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 50}
                y={height - 45}
                width={100}
                height={30}
                rx={6}
                fill={diagram.colors.primary}
                fillOpacity={0.15}
                stroke={diagram.colors.primary}
                strokeWidth={1}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                x={width / 2}
                y={height - 26}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {criterion}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Mark all corresponding parts */}
        <AnimatePresence>
          {isVisible('allParts') && (
            <motion.g
              data-testid="tc-all-parts"
              initial="hidden"
              animate={isCurrent('allParts') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {renderSideMarks(allSideParts, v1, v2)}
              {renderAngleMarks(allAngleParts, v1, v2)}
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default TriangleCongruence
