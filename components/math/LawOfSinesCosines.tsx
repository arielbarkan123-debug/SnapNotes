'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LawOfSinesCosinesData } from '@/types/math'
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

interface LawOfSinesCosinesProps {
  data: LawOfSinesCosinesData
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
  labelParts: { en: 'Label parts', he: 'סימון חלקים' },
  showFormula: { en: 'Show formula', he: 'הצגת נוסחה' },
  showSubstitution: { en: 'Show substitution', he: 'הצגת הצבה' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180

/** Convert a math angle (degrees) at a vertex to an SVG arc path */
function angleArcPath(
  cx: number,
  cy: number,
  startDeg: number,
  endDeg: number,
  radius: number
): string {
  const x1 = cx + radius * Math.cos(startDeg * DEG)
  const y1 = cy - radius * Math.sin(startDeg * DEG)
  const x2 = cx + radius * Math.cos(endDeg * DEG)
  const y2 = cy - radius * Math.sin(endDeg * DEG)
  let sweep = endDeg - startDeg
  if (sweep < 0) sweep += 360
  const large = sweep > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 0 ${x2} ${y2}`
}

/** Get the angle (in degrees, SVG convention: 0=right, counter-clockwise positive)
 *  of the ray from `from` to `to`. */
function rayAngle(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.atan2(-(to.y - from.y), to.x - from.x) / DEG
}

/** Midpoint of two points */
function midpoint(
  a: { x: number; y: number },
  b: { x: number; y: number }
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Offset a point away from a center */
function offsetFromCenter(
  point: { x: number; y: number },
  center: { x: number; y: number },
  distance: number
): { x: number; y: number } {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return point
  return {
    x: point.x + (dx / len) * distance,
    y: point.y + (dy / len) * distance,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LawOfSinesCosines({
  data,
  className = '',
  width = 500,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: LawOfSinesCosinesProps) {
  const {
    triangle,
    law,
    solveFor,
    knownParts,
    showFormula = true,
    showSubstitution = true,
    title,
  } = data

  // Vertex labels and opposite side labels
  const vertexLabels = ['A', 'B', 'C']
  const sideLabels = ['a', 'b', 'c'] // a opposite A, b opposite B, c opposite C

  // All known parts as a Set for quick lookup
  const knownSet = useMemo(() => new Set(knownParts), [knownParts])

  // Determine whether a part is known, unknown (solveFor), or neutral
  const partStatus = (part: string): 'known' | 'unknown' | 'neutral' => {
    if (part === solveFor) return 'unknown'
    if (knownSet.has(part)) return 'known'
    return 'neutral'
  }

  // ---------------------------------------------------------------------------
  // Scale and center the triangle within the viewBox
  // ---------------------------------------------------------------------------

  const scaledVertices = useMemo(() => {
    const rawVerts = triangle.vertices
    if (!rawVerts || rawVerts.length < 3) {
      // Fallback equilateral
      return [
        { x: width / 2, y: 80 },
        { x: width / 2 - 140, y: height - 120 },
        { x: width / 2 + 140, y: height - 120 },
      ]
    }

    const xs = rawVerts.map((v) => v.x)
    const ys = rawVerts.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const dataW = maxX - minX || 1
    const dataH = maxY - minY || 1

    const padX = 70
    const padTop = 60
    const padBottom = 100 // space for formulas at the bottom
    const availW = width - padX * 2
    const availH = height - padTop - padBottom
    const scale = Math.min(availW / dataW, availH / dataH)

    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const offsetX = width / 2 - cx * scale
    const offsetY = padTop + availH / 2 - cy * scale

    return rawVerts.map((v) => ({
      x: v.x * scale + offsetX,
      y: v.y * scale + offsetY,
    }))
  }, [triangle.vertices, width, height])

  const centroid = useMemo(() => {
    const cx = (scaledVertices[0].x + scaledVertices[1].x + scaledVertices[2].x) / 3
    const cy = (scaledVertices[0].y + scaledVertices[1].y + scaledVertices[2].y) / 3
    return { x: cx, y: cy }
  }, [scaledVertices])

  // Angle arcs at each vertex
  const angleArcs = useMemo(() => {
    return [0, 1, 2].map((i) => {
      const curr = scaledVertices[i]
      const prev = scaledVertices[(i + 2) % 3]
      const next = scaledVertices[(i + 1) % 3]
      const start = rayAngle(curr, prev)
      const end = rayAngle(curr, next)
      return { cx: curr.x, cy: curr.y, start, end }
    })
  }, [scaledVertices])

  // ---------------------------------------------------------------------------
  // Build step definitions
  // ---------------------------------------------------------------------------

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawTriangle', label: STEP_LABELS.drawTriangle.en, labelHe: STEP_LABELS.drawTriangle.he },
      { id: 'labelParts', label: STEP_LABELS.labelParts.en, labelHe: STEP_LABELS.labelParts.he },
    ]
    if (showFormula) {
      defs.push({ id: 'showFormula', label: STEP_LABELS.showFormula.en, labelHe: STEP_LABELS.showFormula.he })
    }
    if (showSubstitution) {
      defs.push({ id: 'showSubstitution', label: STEP_LABELS.showSubstitution.en, labelHe: STEP_LABELS.showSubstitution.he })
    }
    return defs
  }, [showFormula, showSubstitution])

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

  // ---------------------------------------------------------------------------
  // Color for known / unknown parts
  // ---------------------------------------------------------------------------

  const knownColor = accentColor // green-ish / accent for known parts
  const unknownColor = '#ef4444' // red for the unknown we are solving for
  const neutralColor = '#6b7280' // gray for parts not involved

  const partColor = (part: string): string => {
    const status = partStatus(part)
    if (status === 'known') return knownColor
    if (status === 'unknown') return unknownColor
    return neutralColor
  }

  // ---------------------------------------------------------------------------
  // Formula text
  // ---------------------------------------------------------------------------

  const sides = triangle.sides ?? [0, 0, 0]
  const angles = triangle.angles ?? [0, 0, 0]

  const formulaText = useMemo(() => {
    if (law === 'sines') {
      return 'a / sin A = b / sin B = c / sin C'
    }
    // For cosines, show the variant that solves for solveFor
    // Standard: c² = a² + b² − 2ab·cos C
    const lower = solveFor.toLowerCase()
    if (lower === 'a') return 'a² = b² + c² − 2bc·cos A'
    if (lower === 'b') return 'a² + c² − 2ac·cos B = b²'
    if (lower === 'c') return 'c² = a² + b² − 2ab·cos C'
    // Solving for an angle
    if (lower === 'a' || lower === 'b' || lower === 'c') return 'c² = a² + b² − 2ab·cos C'
    // Default angle variant: cos C = (a² + b² − c²) / 2ab
    return `cos ${solveFor} = (a² + b² − c²) / 2ab`
  }, [law, solveFor])

  const substitutionText = useMemo(() => {
    const a = sides[0]
    const b = sides[1]
    const c = sides[2]
    const A = angles[0]
    const B = angles[1]
    const C = angles[2]

    if (law === 'sines') {
      // Show the relevant ratios with numbers
      const parts: string[] = []
      if (knownSet.has('a') || knownSet.has('A') || solveFor === 'a' || solveFor === 'A') {
        parts.push(`${a} / sin ${A}°`)
      }
      if (knownSet.has('b') || knownSet.has('B') || solveFor === 'b' || solveFor === 'B') {
        parts.push(`${b} / sin ${B}°`)
      }
      if (knownSet.has('c') || knownSet.has('C') || solveFor === 'c' || solveFor === 'C') {
        parts.push(`${c} / sin ${C}°`)
      }
      return parts.length >= 2 ? parts.join(' = ') : `${a}/sin${A}° = ${b}/sin${B}°`
    }

    // Cosines substitution
    const lower = solveFor.toLowerCase()
    if (lower === 'a') return `a² = ${b}² + ${c}² − 2(${b})(${c})·cos ${A}°`
    if (lower === 'b') return `b² = ${a}² + ${c}² − 2(${a})(${c})·cos ${B}°`
    if (lower === 'c') return `c² = ${a}² + ${b}² − 2(${a})(${b})·cos ${C}°`
    // Solving for angle
    if (solveFor === 'A') return `cos A = (${b}² + ${c}² − ${a}²) / (2·${b}·${c})`
    if (solveFor === 'B') return `cos B = (${a}² + ${c}² − ${b}²) / (2·${a}·${c})`
    if (solveFor === 'C') return `cos C = (${a}² + ${b}² − ${c}²) / (2·${a}·${b})`
    return `c² = ${a}² + ${b}² − 2(${a})(${b})·cos ${C}°`
  }, [law, solveFor, sides, angles, knownSet])

  // ---------------------------------------------------------------------------
  // Formula Y positions
  // ---------------------------------------------------------------------------

  const formulaY = height - 65
  const substitutionY = height - 40

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="law-of-sines-cosines"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="losc-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="losc-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw triangle */}
        <AnimatePresence>
          {isVisible('drawTriangle') && (
            <motion.g
              data-testid="losc-triangle"
              initial="hidden"
              animate={isCurrent('drawTriangle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Triangle edges */}
              {[0, 1, 2].map((i) => {
                const j = (i + 1) % 3
                return (
                  <motion.line
                    key={`edge-${i}`}
                    x1={scaledVertices[i].x}
                    y1={scaledVertices[i].y}
                    x2={scaledVertices[j].x}
                    y2={scaledVertices[j].y}
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
              {/* Vertex dots */}
              {scaledVertices.map((v, i) => (
                <motion.circle
                  key={`vdot-${i}`}
                  cx={v.x}
                  cy={v.y}
                  r={3.5}
                  fill={primaryColor}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label parts (vertices, sides, angle arcs) */}
        <AnimatePresence>
          {isVisible('labelParts') && (
            <motion.g
              data-testid="losc-labels"
              initial="hidden"
              animate={isCurrent('labelParts') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Vertex labels (A, B, C) */}
              {scaledVertices.map((v, i) => {
                const offset = offsetFromCenter(v, centroid, 18)
                const color = partColor(vertexLabels[i])
                return (
                  <motion.text
                    key={`vlabel-${i}`}
                    x={offset.x}
                    y={offset.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={14}
                    fontWeight={700}
                    fill={color}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {vertexLabels[i]}
                  </motion.text>
                )
              })}

              {/* Side labels (a opposite A, b opposite B, c opposite C) */}
              {[0, 1, 2].map((i) => {
                // Side opposite vertex i connects vertices (i+1) and (i+2)
                const v1 = scaledVertices[(i + 1) % 3]
                const v2 = scaledVertices[(i + 2) % 3]
                const mid = midpoint(v1, v2)
                const offset = offsetFromCenter(mid, centroid, 16)
                const color = partColor(sideLabels[i])
                return (
                  <motion.text
                    key={`slabel-${i}`}
                    x={offset.x}
                    y={offset.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    fontWeight={600}
                    fontStyle="italic"
                    fill={color}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {sideLabels[i]} = {sides[i]}
                  </motion.text>
                )
              })}

              {/* Angle arcs */}
              {angleArcs.map((arc, i) => {
                const color = partColor(vertexLabels[i])
                // Normalize the arc sweep
                let start = arc.start
                let end = arc.end
                let sweep = end - start
                if (sweep < 0) sweep += 360
                if (sweep > 180) {
                  // Swap to go the short way
                  const tmp = start
                  start = end
                  end = tmp
                }
                const arcMidAngle = ((start + end) / 2) * DEG
                const labelR = 32
                return (
                  <motion.g key={`anglearc-${i}`}>
                    <motion.path
                      d={angleArcPath(arc.cx, arc.cy, start, end, 20)}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      x={arc.cx + labelR * Math.cos(arcMidAngle)}
                      y={arc.cy - labelR * Math.sin(arcMidAngle)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={500}
                      fill={color}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {angles[i]}°
                    </motion.text>
                  </motion.g>
                )
              })}

              {/* Known / Unknown legend */}
              <motion.g
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {/* Known indicator */}
                <circle cx={12} cy={14} r={5} fill={knownColor} opacity={0.8} />
                <text x={22} y={18} fontSize={10} fill={knownColor} fontWeight={500}>
                  {language === 'he' ? 'ידוע' : 'Known'}
                </text>
                {/* Unknown indicator */}
                <circle cx={12} cy={30} r={5} fill={unknownColor} opacity={0.8} />
                <text x={22} y={34} fontSize={10} fill={unknownColor} fontWeight={500}>
                  {language === 'he' ? `מחפשים: ${solveFor}` : `Solve for: ${solveFor}`}
                </text>
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show formula */}
        <AnimatePresence>
          {showFormula && isVisible('showFormula') && (
            <motion.g
              data-testid="losc-formula"
              initial="hidden"
              animate={isCurrent('showFormula') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Formula background */}
              <motion.rect
                x={width / 2 - 180}
                y={formulaY - 16}
                width={360}
                height={24}
                rx={6}
                fill={`${primaryColor}15`}
                stroke={primaryColor}
                strokeWidth={1}
                opacity={0.6}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4 }}
              />
              <motion.text
                x={width / 2}
                y={formulaY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={14}
                fontWeight={700}
                fill={primaryColor}
                fontFamily="serif"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {law === 'sines'
                  ? (language === 'he' ? 'חוק הסינוסים: ' : 'Law of Sines: ') + formulaText
                  : (language === 'he' ? 'חוק הקוסינוסים: ' : 'Law of Cosines: ') + formulaText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show substitution */}
        <AnimatePresence>
          {showSubstitution && isVisible('showSubstitution') && (
            <motion.g
              data-testid="losc-substitution"
              initial="hidden"
              animate={isCurrent('showSubstitution') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 180}
                y={substitutionY - 14}
                width={360}
                height={24}
                rx={6}
                fill={`${accentColor}15`}
                stroke={accentColor}
                strokeWidth={1}
                opacity={0.5}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4 }}
              />
              <motion.text
                x={width / 2}
                y={substitutionY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={600}
                fill={accentColor}
                fontFamily="serif"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {substitutionText}
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

export default LawOfSinesCosines
