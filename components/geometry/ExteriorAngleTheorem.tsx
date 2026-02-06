'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExteriorAngleTheoremData } from '@/types/geometry'
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
  extend: { en: 'Extend side to show exterior angle', he: 'הארכת צלע להצגת זווית חיצונית' },
  remoteInterior: { en: 'Highlight remote interior angles', he: 'הדגשת זוויות פנימיות רחוקות' },
  relationship: { en: 'Show exterior = sum of remote interiors', he: 'הצגת זווית חיצונית = סכום זוויות פנימיות רחוקות' },
}

interface ExteriorAngleTheoremProps {
  data: ExteriorAngleTheoremData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * ExteriorAngleTheorem - Triangle with exterior angle at one vertex
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
export function ExteriorAngleTheorem({
  data,
  width = 400,
  height = 380,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: ExteriorAngleTheoremProps) {
  const {
    interiorAngles,
    exteriorAngle,
    exteriorAtVertex,
    vertices,
    showRelationship = true,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'triangle', label: STEP_LABELS.triangle.en, labelHe: STEP_LABELS.triangle.he },
      { id: 'extend', label: STEP_LABELS.extend.en, labelHe: STEP_LABELS.extend.he },
      { id: 'remoteInterior', label: STEP_LABELS.remoteInterior.en, labelHe: STEP_LABELS.remoteInterior.he },
    ]
    if (showRelationship) {
      defs.push({ id: 'relationship', label: STEP_LABELS.relationship.en, labelHe: STEP_LABELS.relationship.he })
    }
    return defs
  }, [showRelationship])

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

  // Map data vertices to SVG coordinates
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
    const drawH = height - padding * 2 - 60
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

  // Extension: extend one side beyond the exterior vertex
  const extVertex = svgVertices[exteriorAtVertex]
  // The side to extend: from the previous vertex to exteriorAtVertex
  const prevIdx = (exteriorAtVertex + 2) % 3
  const prevVertex = svgVertices[prevIdx]
  // Direction from prev to extVertex
  const dx = extVertex.x - prevVertex.x
  const dy = extVertex.y - prevVertex.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const extLen = 80
  const extEnd = {
    x: extVertex.x + (dx / len) * extLen,
    y: extVertex.y + (dy / len) * extLen,
  }

  // Remote interior angles: the two vertices that are NOT the exterior vertex
  const remoteIndices = [0, 1, 2].filter((i) => i !== exteriorAtVertex)

  // Colors
  const exteriorColor = GEOMETRY_COLORS.highlight.tertiary
  const remoteColors = [GEOMETRY_COLORS.highlight.primary, GEOMETRY_COLORS.highlight.secondary]

  // Angle arcs
  const arcRadius = 20

  const pointOnArc = (ox: number, oy: number, angleDeg: number, r: number) => ({
    x: ox + r * Math.cos((angleDeg * Math.PI) / 180),
    y: oy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  const getAngleDirs = (vIdx: number) => {
    const v = svgVertices[vIdx]
    const prev = svgVertices[(vIdx + 2) % 3]
    const next = svgVertices[(vIdx + 1) % 3]
    const a1 = Math.atan2(-(prev.y - v.y), prev.x - v.x) * 180 / Math.PI
    const a2 = Math.atan2(-(next.y - v.y), next.x - v.x) * 180 / Math.PI
    return { start: a1, end: a2 }
  }

  // Exterior angle arc: from next vertex direction to extension direction
  const getExteriorArcDirs = () => {
    const v = extVertex
    const nextIdx = (exteriorAtVertex + 1) % 3
    const next = svgVertices[nextIdx]
    const a1 = Math.atan2(-(next.y - v.y), next.x - v.x) * 180 / Math.PI
    const a2 = Math.atan2(-(extEnd.y - v.y), extEnd.x - v.x) * 180 / Math.PI
    return { start: a1, end: a2 }
  }

  const makeArc = (ox: number, oy: number, startDeg: number, endDeg: number, r: number) => {
    let s = startDeg
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

  const vertexLabels = ['A', 'B', 'C']

  // Center of triangle for label offset computation
  const center = {
    x: (svgVertices[0].x + svgVertices[1].x + svgVertices[2].x) / 3,
    y: (svgVertices[0].y + svgVertices[1].y + svgVertices[2].y) / 3,
  }

  const labelPos = (vIdx: number) => {
    const v = svgVertices[vIdx]
    const ddx = v.x - center.x
    const ddy = v.y - center.y
    const l = Math.sqrt(ddx * ddx + ddy * ddy)
    return { x: v.x + (ddx / l) * 18, y: v.y + (ddy / l) * 18 }
  }

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="exterior-angle-theorem-diagram"
      className={`geometry-exterior-angle ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={title || 'Exterior angle theorem diagram'}
      >
        {/* Background */}
        <rect
          data-testid="exterior-angle-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="exterior-angle-title"
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
              data-testid="exterior-angle-triangle"
              initial="hidden"
              animate={isCurrent('triangle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={trianglePath}
                fill={diagram.colors.primary}
                fillOpacity={0.06}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.path
                d={trianglePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {svgVertices.map((v, i) => {
                const lp = labelPos(i)
                return (
                  <motion.g key={`vl-${i}`}>
                    <motion.circle
                      cx={v.x}
                      cy={v.y}
                      r={diagram.lineWeight}
                      fill="currentColor"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    />
                    <motion.text
                      x={lp.x}
                      y={lp.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-current text-xs font-bold"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {vertexLabels[i]}
                    </motion.text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Extend side to show exterior angle */}
        <AnimatePresence>
          {isVisible('extend') && (
            <motion.g
              data-testid="exterior-angle-extension"
              initial="hidden"
              animate={isCurrent('extend') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Extension line */}
              <motion.line
                x1={extVertex.x}
                y1={extVertex.y}
                x2={extEnd.x}
                y2={extEnd.y}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Exterior angle arc */}
              {(() => {
                const dirs = getExteriorArcDirs()
                return (
                  <motion.path
                    data-testid="exterior-angle-arc"
                    d={makeArc(extVertex.x, extVertex.y, dirs.start, dirs.end, arcRadius + 5)}
                    fill="none"
                    stroke={exteriorColor}
                    strokeWidth={3}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                    transition={{ delay: 0.3 }}
                  />
                )
              })()}
              {/* Exterior angle label */}
              {(() => {
                const dirs = getExteriorArcDirs()
                let mid = (dirs.start + dirs.end) / 2
                let diff = dirs.end - dirs.start
                if (diff > 180) diff -= 360
                if (diff < -180) diff += 360
                mid = dirs.start + diff / 2
                const pos = pointOnArc(extVertex.x, extVertex.y, mid, arcRadius + 22)
                return (
                  <motion.text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fill: exteriorColor }}
                    className="text-xs font-bold"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: 0.4 }}
                  >
                    {exteriorAngle}°
                  </motion.text>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Highlight remote interior angles */}
        <AnimatePresence>
          {isVisible('remoteInterior') && (
            <motion.g
              data-testid="exterior-angle-remote-interiors"
              initial="hidden"
              animate={isCurrent('remoteInterior') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {remoteIndices.map((rIdx, ci) => {
                const dirs = getAngleDirs(rIdx)
                let mid = dirs.start
                let diff = dirs.end - dirs.start
                if (diff > 180) diff -= 360
                if (diff < -180) diff += 360
                mid = dirs.start + diff / 2
                const v = svgVertices[rIdx]
                const pos = pointOnArc(v.x, v.y, mid, arcRadius + 14)
                return (
                  <motion.g key={`remote-${rIdx}`}>
                    <motion.path
                      data-testid={`remote-interior-arc-${rIdx}`}
                      d={makeArc(v.x, v.y, dirs.start, dirs.end, arcRadius)}
                      fill="none"
                      stroke={remoteColors[ci]}
                      strokeWidth={2.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                      transition={{ delay: ci * 0.2 }}
                    />
                    <motion.text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fill: remoteColors[ci] }}
                      className="text-[10px] font-bold"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: ci * 0.2 + 0.1 }}
                    >
                      {interiorAngles[rIdx]}°
                    </motion.text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show relationship */}
        <AnimatePresence>
          {showRelationship && isVisible('relationship') && (
            <motion.g
              data-testid="exterior-angle-relationship"
              initial="hidden"
              animate={isCurrent('relationship') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 45}
                textAnchor="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-sm font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'משפט הזווית החיצונית' : 'Exterior Angle Theorem'}
              </motion.text>
              <motion.text
                x={width / 2}
                y={height - 25}
                textAnchor="middle"
                className="fill-current text-sm"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.15 }}
              >
                <tspan style={{ fill: exteriorColor }}>{exteriorAngle}°</tspan>
                {' = '}
                <tspan style={{ fill: remoteColors[0] }}>{interiorAngles[remoteIndices[0]]}°</tspan>
                {' + '}
                <tspan style={{ fill: remoteColors[1] }}>{interiorAngles[remoteIndices[1]]}°</tspan>
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

export default ExteriorAngleTheorem
