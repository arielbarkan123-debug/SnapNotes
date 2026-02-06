'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExteriorAngleTheoremData } from '@/types/math'
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

interface ExteriorAngleTheoremProps {
  data: ExteriorAngleTheoremData
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
  triangle: { en: 'Draw triangle', he: 'ציור משולש' },
  interiorAngles: { en: 'Show interior angles', he: 'הצגת זוויות פנימיות' },
  exteriorAngle: { en: 'Show exterior angle', he: 'הצגת זווית חיצונית' },
  relationship: { en: 'Show relationship', he: 'הצגת הקשר' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180

/** Create an SVG arc path for an angle at a vertex */
function angleArcPath(
  cx: number,
  cy: number,
  startAngle: number,
  endAngle: number,
  radius: number
): string {
  // Normalise so we always go from smaller to larger angle
  let sa = startAngle
  let ea = endAngle
  // Ensure arc goes the short way if needed
  let diff = ea - sa
  if (diff < 0) diff += 360
  if (diff > 180) {
    // swap
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

/** Compute angle at vertex i (in degrees, using atan2) given 3 vertices */
function vertexAngleRadians(
  vertices: Array<{ x: number; y: number }>,
  i: number
): { start: number; end: number } {
  const n = vertices.length
  const prev = vertices[(i - 1 + n) % n]
  const curr = vertices[i]
  const next = vertices[(i + 1) % n]
  const a1 = Math.atan2(-(prev.y - curr.y), prev.x - curr.x) / DEG
  const a2 = Math.atan2(-(next.y - curr.y), next.x - curr.x) / DEG
  return { start: a1, end: a2 }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExteriorAngleTheorem({
  data,
  className = '',
  width = 480,
  height = 380,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ExteriorAngleTheoremProps) {
  const {
    vertices,
    interiorAngles,
    exteriorAngle,
    exteriorAtVertex,
    showRelationship = true,
    title,
  } = data

  const verts = useMemo(() => {
    if (vertices && vertices.length === 3) return vertices
    // Default triangle if not provided
    return [
      { x: 80, y: 280 },
      { x: 400, y: 280 },
      { x: 250, y: 60 },
    ]
  }, [vertices])

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'triangle', label: STEP_LABELS.triangle.en, labelHe: STEP_LABELS.triangle.he },
      { id: 'interiorAngles', label: STEP_LABELS.interiorAngles.en, labelHe: STEP_LABELS.interiorAngles.he },
      { id: 'exteriorAngle', label: STEP_LABELS.exteriorAngle.en, labelHe: STEP_LABELS.exteriorAngle.he },
    ]
    if (showRelationship) {
      defs.push({ id: 'relationship', label: STEP_LABELS.relationship.en, labelHe: STEP_LABELS.relationship.he })
    }
    return defs
  }, [showRelationship])

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

  // Compute extended side for exterior angle
  const extVertex = verts[exteriorAtVertex]
  const prevVertex = verts[(exteriorAtVertex - 1 + 3) % 3]
  // Direction from prev to extVertex, extend beyond extVertex
  const dx = extVertex.x - prevVertex.x
  const dy = extVertex.y - prevVertex.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const extEndX = extVertex.x + (dx / len) * 80
  const extEndY = extVertex.y + (dy / len) * 80

  // Compute angle arc parameters for each interior angle
  const angleArcs = useMemo(() => {
    return [0, 1, 2].map((i) => {
      const { start, end } = vertexAngleRadians(verts, i)
      return { cx: verts[i].x, cy: verts[i].y, start, end }
    })
  }, [verts])

  // Exterior angle arc: from the extended line to the far side of the triangle
  const extArc = useMemo(() => {
    const i = exteriorAtVertex
    const next = verts[(i + 1) % 3]
    // angle of extended line from vertex
    const extAngle = Math.atan2(-(extEndY - extVertex.y), extEndX - extVertex.x) / DEG
    // angle of the other side from vertex
    const nextAngle = Math.atan2(-(next.y - extVertex.y), next.x - extVertex.x) / DEG
    return { cx: extVertex.x, cy: extVertex.y, start: extAngle, end: nextAngle }
  }, [verts, exteriorAtVertex, extEndX, extEndY, extVertex])

  // Remote interior angles (the two NOT at the exterior vertex)
  const remoteIndices = [0, 1, 2].filter((i) => i !== exteriorAtVertex)

  // Vertex labels
  const labels = ['A', 'B', 'C']

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="exterior-angle-theorem"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="eat-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="eat-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw triangle */}
        <AnimatePresence>
          {isVisible('triangle') && (
            <motion.g
              data-testid="eat-triangle"
              initial="hidden"
              animate={isCurrent('triangle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle edges */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                return (
                  <motion.line
                    key={`edge-${i}`}
                    x1={verts[i].x}
                    y1={verts[i].y}
                    x2={verts[j].x}
                    y2={verts[j].y}
                    stroke="#374151"
                    className="dark:stroke-gray-300"
                    strokeWidth={diagram.lineWeight}
                    strokeLinecap="round"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
              {/* Vertex labels */}
              {verts.map((v, i) => {
                // Offset label away from triangle center
                const cx = (verts[0].x + verts[1].x + verts[2].x) / 3
                const cy = (verts[0].y + verts[1].y + verts[2].y) / 3
                const offX = (v.x - cx) * 0.2
                const offY = (v.y - cy) * 0.2
                return (
                  <motion.text
                    key={`label-${i}`}
                    x={v.x + offX}
                    y={v.y + offY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-gray-700 dark:fill-gray-300"
                    fontSize={14}
                    fontWeight={600}
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

        {/* Step 1: Interior angles */}
        <AnimatePresence>
          {isVisible('interiorAngles') && (
            <motion.g
              data-testid="eat-interior-angles"
              initial="hidden"
              animate={isCurrent('interiorAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {[0, 1, 2].map((i) => {
                const arc = angleArcs[i]
                const isRemote = remoteIndices.includes(i)
                const color = isVisible('relationship') && isRemote ? accentColor : primaryColor
                return (
                  <motion.g key={`angle-${i}`}>
                    <motion.path
                      d={angleArcPath(arc.cx, arc.cy, arc.start, arc.end, 24)}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    {/* Angle value label */}
                    <motion.text
                      x={arc.cx + 30 * Math.cos(((arc.start + arc.end) / 2) * DEG)}
                      y={arc.cy - 30 * Math.sin(((arc.start + arc.end) / 2) * DEG)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={500}
                      fill={color}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {interiorAngles[i]}°
                    </motion.text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Exterior angle */}
        <AnimatePresence>
          {isVisible('exteriorAngle') && (
            <motion.g
              data-testid="eat-exterior-angle"
              initial="hidden"
              animate={isCurrent('exteriorAngle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Extended side (dashed) */}
              <motion.line
                x1={extVertex.x}
                y1={extVertex.y}
                x2={extEndX}
                y2={extEndY}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6 4"
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Exterior angle arc */}
              <motion.path
                d={angleArcPath(extArc.cx, extArc.cy, extArc.start, extArc.end, 32)}
                fill="none"
                stroke={accentColor}
                strokeWidth={2.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Exterior angle label */}
              <motion.text
                x={extArc.cx + 44 * Math.cos(((extArc.start + extArc.end) / 2) * DEG)}
                y={extArc.cy - 44 * Math.sin(((extArc.start + extArc.end) / 2) * DEG)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={700}
                fill={accentColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {exteriorAngle}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Relationship */}
        <AnimatePresence>
          {showRelationship && isVisible('relationship') && (
            <motion.g
              data-testid="eat-relationship"
              initial="hidden"
              animate={isCurrent('relationship') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Relationship equation below the triangle */}
              <motion.text
                x={width / 2}
                y={height - 20}
                textAnchor="middle"
                fontSize={14}
                fontWeight={600}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {exteriorAngle}° = {interiorAngles[remoteIndices[0]]}° + {interiorAngles[remoteIndices[1]]}°
              </motion.text>
              <motion.text
                x={width / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize={11}
                className="fill-gray-500 dark:fill-gray-400"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? 'זווית חיצונית = סכום שתי הזוויות הפנימיות המרוחקות'
                  : 'Exterior angle = sum of remote interior angles'}
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

export default ExteriorAngleTheorem
