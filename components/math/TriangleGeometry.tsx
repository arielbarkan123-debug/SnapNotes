'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleGeometryData } from '@/types/math'
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

interface TriangleGeometryProps {
  data: TriangleGeometryData
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
  drawTriangle: { en: 'Draw triangle', he: 'ציור משולש' },
  labelSides: { en: 'Label sides', he: 'סימון צלעות' },
  labelAngles: { en: 'Label angles', he: 'סימון זוויות' },
  showHeight: { en: 'Show height', he: 'הצגת גובה' },
  showFormulas: { en: 'Show formulas', he: 'הצגת נוסחאות' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function midpoint(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

function angleLabelOffset(
  vertex: { x: number; y: number },
  centroid: { x: number; y: number },
  distance: number
): { x: number; y: number } {
  const dx = vertex.x - centroid.x
  const dy = vertex.y - centroid.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return {
    x: vertex.x + (dx / len) * distance,
    y: vertex.y + (dy / len) * distance,
  }
}

function drawAngleArc(
  vertex: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  radius: number
): string {
  const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
  const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
  const startX = vertex.x + radius * Math.cos(a1)
  const startY = vertex.y + radius * Math.sin(a1)
  const endX = vertex.x + radius * Math.cos(a2)
  const endY = vertex.y + radius * Math.sin(a2)

  let sweep = a2 - a1
  if (sweep < -Math.PI) sweep += 2 * Math.PI
  if (sweep > Math.PI) sweep -= 2 * Math.PI
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0
  const sweepFlag = sweep > 0 ? 1 : 0

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${endX} ${endY}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TriangleGeometry({
  data,
  className = '',
  width = 450,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TriangleGeometryProps) {
  const {
    vertices: rawVertices,
    sides,
    angles,
    height: heightData,
    title,
    showFormulas,
  } = data

  // Normalize vertices into SVG coordinates
  const padding = { left: 50, right: 50, top: 50, bottom: 60 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  const vertices = useMemo(() => {
    if (!rawVertices || rawVertices.length < 3) {
      // Default equilateral triangle
      return [
        { x: padding.left + plotW / 2, y: padding.top },
        { x: padding.left, y: padding.top + plotH },
        { x: padding.left + plotW, y: padding.top + plotH },
      ]
    }
    const xs = rawVertices.map((v) => v.x)
    const ys = rawVertices.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const scale = Math.min(plotW / rangeX, plotH / rangeY)
    const offsetX = padding.left + (plotW - rangeX * scale) / 2
    const offsetY = padding.top + (plotH - rangeY * scale) / 2
    return rawVertices.map((v) => ({
      x: offsetX + (v.x - minX) * scale,
      y: offsetY + (v.y - minY) * scale,
    }))
  }, [rawVertices, padding.left, padding.top, plotW, plotH])

  const [A, B, C] = vertices
  const centroid = useMemo(
    () => ({ x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 }),
    [A, B, C]
  )

  // Build step definitions
  const hasHeight = heightData && heightData.showLine !== false
  const hasFormulas = showFormulas !== false

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawTriangle', label: STEP_LABELS.drawTriangle.en, labelHe: STEP_LABELS.drawTriangle.he },
      { id: 'labelSides', label: STEP_LABELS.labelSides.en, labelHe: STEP_LABELS.labelSides.he },
      { id: 'labelAngles', label: STEP_LABELS.labelAngles.en, labelHe: STEP_LABELS.labelAngles.he },
    ]
    if (hasHeight) {
      defs.push({ id: 'showHeight', label: STEP_LABELS.showHeight.en, labelHe: STEP_LABELS.showHeight.he })
    }
    if (hasFormulas) {
      defs.push({ id: 'showFormulas', label: STEP_LABELS.showFormulas.en, labelHe: STEP_LABELS.showFormulas.he })
    }
    return defs
  }, [hasHeight, hasFormulas])

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

  // Triangle path
  const trianglePath = `M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`

  // Side midpoints for labels
  // Side a = BC, side b = AC, side c = AB
  const midAB = midpoint(A, B)
  const midBC = midpoint(B, C)
  const midAC = midpoint(A, C)

  // Side label offsets (push away from centroid)
  const sideLabelDist = 18
  const sideLabels = useMemo(() => {
    const offset = (mid: { x: number; y: number }) => {
      const dx = mid.x - centroid.x
      const dy = mid.y - centroid.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      return { x: mid.x + (dx / len) * sideLabelDist, y: mid.y + (dy / len) * sideLabelDist }
    }
    return {
      a: offset(midBC),
      b: offset(midAC),
      c: offset(midAB),
    }
  }, [midBC, midAC, midAB, centroid])

  // Angle label positions
  const angleLabelDist = 30
  const angleLabels = useMemo(() => ({
    A: angleLabelOffset(A, centroid, angleLabelDist),
    B: angleLabelOffset(B, centroid, angleLabelDist),
    C: angleLabelOffset(C, centroid, angleLabelDist),
  }), [A, B, C, centroid])

  // Angle arcs
  const arcRadius = 22
  const arcA = useMemo(() => drawAngleArc(A, B, C, arcRadius), [A, B, C])
  const arcB = useMemo(() => drawAngleArc(B, C, A, arcRadius), [A, B, C])
  const arcC = useMemo(() => drawAngleArc(C, A, B, arcRadius), [A, B, C])

  // Height line - drop from A perpendicular to BC by default
  const heightLine = useMemo(() => {
    if (!heightData) return null
    // Drop perpendicular from A to BC
    const dx = C.x - B.x
    const dy = C.y - B.y
    const t = ((A.x - B.x) * dx + (A.y - B.y) * dy) / (dx * dx + dy * dy)
    const footX = B.x + t * dx
    const footY = B.y + t * dy
    return { from: A, to: { x: footX, y: footY } }
  }, [heightData, A, B, C])

  // Right angle mark for height
  const rightAngleMark = useMemo(() => {
    if (!heightLine) return null
    const foot = heightLine.to
    const dx1 = heightLine.from.x - foot.x
    const dy1 = heightLine.from.y - foot.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1
    const dx2 = C.x - foot.x
    const dy2 = C.y - foot.y
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
    const s = 8
    const p1 = { x: foot.x + (dx1 / len1) * s, y: foot.y + (dy1 / len1) * s }
    const p2 = { x: p1.x + (dx2 / len2) * s, y: p1.y + (dy2 / len2) * s }
    const p3 = { x: foot.x + (dx2 / len2) * s, y: foot.y + (dy2 / len2) * s }
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }, [heightLine, C])

  // Area formula
  const area = useMemo(() => {
    if (!heightData) return null
    // area = 0.5 * base * height
    const base = sides.a // BC is typically the base
    return (0.5 * base * heightData.value).toFixed(2)
  }, [heightData, sides.a])

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="triangle-geometry"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="tg-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="tg-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw triangle */}
        <AnimatePresence>
          {isVisible('drawTriangle') && (
            <motion.g
              data-testid="tg-triangle"
              initial="hidden"
              animate={isCurrent('drawTriangle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={trianglePath}
                fill="none"
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Vertex labels */}
              {['A', 'B', 'C'].map((label, _i) => {
                const pos = angleLabels[label as 'A' | 'B' | 'C']
                return (
                  <motion.text
                    key={`vertex-${label}`}
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-gray-700 dark:fill-gray-300"
                    fontSize={13}
                    fontWeight={600}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {label}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label sides */}
        <AnimatePresence>
          {isVisible('labelSides') && (
            <motion.g
              data-testid="tg-sides"
              initial="hidden"
              animate={isCurrent('labelSides') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Side a = BC */}
              <motion.text
                x={sideLabels.a.x}
                y={sideLabels.a.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={accentColor}
                fontSize={12}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sides.labels?.a ?? `a = ${sides.a}`}
              </motion.text>

              {/* Side b = AC */}
              <motion.text
                x={sideLabels.b.x}
                y={sideLabels.b.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={accentColor}
                fontSize={12}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sides.labels?.b ?? `b = ${sides.b}`}
              </motion.text>

              {/* Side c = AB */}
              <motion.text
                x={sideLabels.c.x}
                y={sideLabels.c.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={accentColor}
                fontSize={12}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {sides.labels?.c ?? `c = ${sides.c}`}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Label angles */}
        <AnimatePresence>
          {isVisible('labelAngles') && (
            <motion.g
              data-testid="tg-angles"
              initial="hidden"
              animate={isCurrent('labelAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Angle arcs */}
              <motion.path
                d={arcA}
                fill="none"
                stroke={accentColor}
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.path
                d={arcB}
                fill="none"
                stroke={accentColor}
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.path
                d={arcC}
                fill="none"
                stroke={accentColor}
                strokeWidth={1.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Angle values */}
              {[
                { label: 'A', angle: angles.A, pos: angleLabelOffset(A, centroid, angleLabelDist + 16) },
                { label: 'B', angle: angles.B, pos: angleLabelOffset(B, centroid, angleLabelDist + 16) },
                { label: 'C', angle: angles.C, pos: angleLabelOffset(C, centroid, angleLabelDist + 16) },
              ].map(({ label, angle, pos }) => (
                <motion.text
                  key={`angle-${label}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#6b7280"
                  fontSize={10}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {angle}°
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show height */}
        <AnimatePresence>
          {hasHeight && isVisible('showHeight') && heightLine && (
            <motion.g
              data-testid="tg-height"
              initial="hidden"
              animate={isCurrent('showHeight') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={heightLine.from.x}
                y1={heightLine.from.y}
                x2={heightLine.to.x}
                y2={heightLine.to.y}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Right angle mark */}
              {rightAngleMark && (
                <motion.path
                  d={rightAngleMark}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                />
              )}
              {/* Height label */}
              <motion.text
                x={(heightLine.from.x + heightLine.to.x) / 2 + 14}
                y={(heightLine.from.y + heightLine.to.y) / 2}
                textAnchor="start"
                dominantBaseline="central"
                fill="#ef4444"
                fontSize={11}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                h = {heightData!.value}
              </motion.text>
              {/* Midpoint dot on foot */}
              <motion.circle
                cx={heightLine.to.x}
                cy={heightLine.to.y}
                r={3}
                fill="#ef4444"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Show formulas */}
        <AnimatePresence>
          {hasFormulas && isVisible('showFormulas') && (
            <motion.g
              data-testid="tg-formulas"
              initial="hidden"
              animate={isCurrent('showFormulas') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 15}
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-400"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'שטח' : 'Area'} = ½ × b × h
                {area ? ` = ${area}` : ''}
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

export default TriangleGeometry
