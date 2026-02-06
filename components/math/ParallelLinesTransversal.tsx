'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ParallelLinesTransversalData } from '@/types/math'
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

interface ParallelLinesTransversalProps {
  data: ParallelLinesTransversalData
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
  drawParallelLines: { en: 'Draw parallel lines', he: '\u05e6\u05d9\u05d5\u05e8 \u05d9\u05e9\u05e8\u05d9\u05dd \u05de\u05e7\u05d1\u05d9\u05dc\u05d9\u05dd' },
  drawTransversal: { en: 'Draw transversal', he: '\u05e6\u05d9\u05d5\u05e8 \u05d7\u05d5\u05ea\u05da' },
  labelAngles: { en: 'Label angles', he: '\u05e1\u05d9\u05de\u05d5\u05df \u05d6\u05d5\u05d5\u05d9\u05d5\u05ea' },
  highlightPairs: { en: 'Highlight angle pairs', he: '\u05d4\u05d3\u05d2\u05e9\u05ea \u05d6\u05d5\u05d2\u05d5\u05ea \u05d6\u05d5\u05d5\u05d9\u05d5\u05ea' },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180

const ANGLE_PAIR_LABELS: Record<string, { en: string; he: string }> = {
  corresponding: { en: 'Corresponding', he: '\u05de\u05ea\u05d0\u05d9\u05de\u05d5\u05ea' },
  alternate_interior: { en: 'Alternate Interior', he: '\u05de\u05ea\u05d7\u05dc\u05e4\u05d5\u05ea \u05e4\u05e0\u05d9\u05de\u05d9\u05d5\u05ea' },
  alternate_exterior: { en: 'Alternate Exterior', he: '\u05de\u05ea\u05d7\u05dc\u05e4\u05d5\u05ea \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d5\u05ea' },
  co_interior: { en: 'Co-interior (Same-side)', he: '\u05d7\u05d3-\u05e6\u05d3\u05d3\u05d9\u05d5\u05ea \u05e4\u05e0\u05d9\u05de\u05d9\u05d5\u05ea' },
  vertical: { en: 'Vertical', he: '\u05e7\u05d5\u05d3\u05e7\u05d5\u05d3\u05d9\u05d5\u05ea' },
}

const HIGHLIGHT_COLORS = [
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function angleArcPath(
  cx: number,
  cy: number,
  startAngleDeg: number,
  endAngleDeg: number,
  radius: number
): string {
  const sa = startAngleDeg
  const ea = endAngleDeg
  let diff = ea - sa
  if (diff < 0) diff += 360
  if (diff > 360) diff -= 360
  const largeArc = diff > 180 ? 1 : 0
  const x1 = cx + radius * Math.cos(sa * DEG)
  const y1 = cy - radius * Math.sin(sa * DEG)
  const x2 = cx + radius * Math.cos(ea * DEG)
  const y2 = cy - radius * Math.sin(ea * DEG)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`
}

function getIntersectionAngles(transversalAngleDeg: number) {
  const tAngle = transversalAngleDeg
  const tAngleOpposite = (transversalAngleDeg + 180) % 360
  const hRight = 0
  const hLeft = 180

  return [
    { start: hRight, end: tAngle, position: 'above', side: 'right', index: 1 },
    { start: tAngle, end: hLeft, position: 'above', side: 'left', index: 2 },
    { start: hLeft, end: tAngleOpposite, position: 'below', side: 'left', index: 3 },
    { start: tAngleOpposite, end: 360, position: 'below', side: 'right', index: 4 },
  ]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParallelLinesTransversal({
  data,
  className = '',
  width = 450,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ParallelLinesTransversalProps) {
  const {
    transversalAngle,
    highlightAngles,
    showAngleMeasures = true,
    title,
  } = data

  const hasHighlights = !!(highlightAngles && highlightAngles.length > 0)

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawParallelLines', label: STEP_LABELS.drawParallelLines.en, labelHe: STEP_LABELS.drawParallelLines.he },
      { id: 'drawTransversal', label: STEP_LABELS.drawTransversal.en, labelHe: STEP_LABELS.drawTransversal.he },
      { id: 'labelAngles', label: STEP_LABELS.labelAngles.en, labelHe: STEP_LABELS.labelAngles.he },
    ]
    if (hasHighlights) {
      defs.push({ id: 'highlightPairs', label: STEP_LABELS.highlightPairs.en, labelHe: STEP_LABELS.highlightPairs.he })
    }
    return defs
  }, [hasHighlights])

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

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = 50
  const titleHeight = title ? 30 : 0
  const drawAreaTop = padding + titleHeight
  const drawAreaBottom = height - padding

  const y1 = drawAreaTop + (drawAreaBottom - drawAreaTop) * 0.3
  const y2 = drawAreaTop + (drawAreaBottom - drawAreaTop) * 0.7

  const lineStartX = padding - 10
  const lineEndX = width - padding + 10

  const arrowSize = 8

  const centerX = width / 2

  // Calculate intersection points with the transversal
  const tAngleRad = transversalAngle * DEG
  const dy = y2 - y1
  const dx = dy / Math.tan(tAngleRad)

  const ix1 = centerX
  const ix2 = centerX + dx

  // Extend the transversal beyond both intersection points
  const extendFactor = 40
  const segDx = ix2 - ix1
  const segDy = y2 - y1
  const segLen = Math.sqrt(segDx * segDx + segDy * segDy)
  const normDx = segDx / segLen
  const normDy = segDy / segLen
  const transStartX = ix1 - normDx * extendFactor
  const transStartY = y1 - normDy * extendFactor
  const transEndX = ix2 + normDx * extendFactor
  const transEndY = y2 + normDy * extendFactor

  // Transversal direction angle in standard math coordinates
  const transAngleFromHoriz = Math.atan2(-(y2 - y1), ix2 - ix1) / DEG
  const normalizedTransAngle = ((transAngleFromHoriz % 360) + 360) % 360

  const anglesAtIntersection = useMemo(
    () => getIntersectionAngles(normalizedTransAngle),
    [normalizedTransAngle]
  )

  const angleMeasures = useMemo(() => {
    const a = normalizedTransAngle
    const angle1 = a
    const angle2 = 180 - a
    return [angle1, angle2, angle1, angle2]
  }, [normalizedTransAngle])

  const highlightedAngleIndices = useMemo(() => {
    if (!highlightAngles) return new Map<string, number>()
    const map = new Map<string, number>()
    highlightAngles.forEach((ha, i) => {
      const key1 = `1-${ha.position}-${ha.side}`
      const key2 = `2-${ha.position}-${ha.side}`
      map.set(key1, i)
      map.set(key2, i)
    })
    return map
  }, [highlightAngles])

  const angleLabels = ['1', '2', '3', '4', '5', '6', '7', '8']

  const arcRadius = 18
  const labelRadius = 32

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="parallel-lines-transversal"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="plt-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="plt-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Arrowhead marker definitions */}
        <defs>
          <marker
            id="plt-arrow"
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={arrowSize / 2}
            refY={arrowSize / 2}
            orient="auto"
          >
            <path
              d={`M 0 0 L ${arrowSize} ${arrowSize / 2} L 0 ${arrowSize} Z`}
              fill={primaryColor}
            />
          </marker>
          <marker
            id="plt-arrow-reverse"
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={arrowSize / 2}
            refY={arrowSize / 2}
            orient="auto-start-reverse"
          >
            <path
              d={`M 0 0 L ${arrowSize} ${arrowSize / 2} L 0 ${arrowSize} Z`}
              fill={primaryColor}
            />
          </marker>
        </defs>

        {/* Step 0: Draw parallel lines */}
        <AnimatePresence>
          {isVisible('drawParallelLines') && (
            <motion.g
              data-testid="plt-parallel-lines"
              initial="hidden"
              animate={isCurrent('drawParallelLines') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Line 1 (top) */}
              <motion.line
                x1={lineStartX}
                y1={y1}
                x2={lineEndX}
                y2={y1}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                markerStart="url(#plt-arrow-reverse)"
                markerEnd="url(#plt-arrow)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Line 2 (bottom) */}
              <motion.line
                x1={lineStartX}
                y1={y2}
                x2={lineEndX}
                y2={y2}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                markerStart="url(#plt-arrow-reverse)"
                markerEnd="url(#plt-arrow)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Parallel indicator chevrons (>>) on each line */}
              {[y1, y2].map((y, li) => {
                const mx = width * 0.25
                return (
                  <motion.g
                    key={`parallel-marker-${li}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    <line
                      x1={mx - 4} y1={y - 5}
                      x2={mx + 4} y2={y}
                      stroke={primaryColor} strokeWidth={1.5}
                    />
                    <line
                      x1={mx - 4} y1={y}
                      x2={mx + 4} y2={y + 5}
                      stroke={primaryColor} strokeWidth={1.5}
                    />
                    <line
                      x1={mx + 2} y1={y - 5}
                      x2={mx + 10} y2={y}
                      stroke={primaryColor} strokeWidth={1.5}
                    />
                    <line
                      x1={mx + 2} y1={y}
                      x2={mx + 10} y2={y + 5}
                      stroke={primaryColor} strokeWidth={1.5}
                    />
                  </motion.g>
                )
              })}
              {/* Line labels */}
              <motion.text
                x={lineEndX + 12}
                y={y1 + 4}
                fontSize={13}
                fontWeight={600}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {'\u2113\u2081'}
              </motion.text>
              <motion.text
                x={lineEndX + 12}
                y={y2 + 4}
                fontSize={13}
                fontWeight={600}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {'\u2113\u2082'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Draw transversal */}
        <AnimatePresence>
          {isVisible('drawTransversal') && (
            <motion.g
              data-testid="plt-transversal"
              initial="hidden"
              animate={isCurrent('drawTransversal') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={transStartX}
                y1={transStartY}
                x2={transEndX}
                y2={transEndY}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Transversal label */}
              <motion.text
                x={transEndX + 8}
                y={transEndY - 8}
                fontSize={13}
                fontWeight={600}
                fill={accentColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                t
              </motion.text>
              {/* Intersection points */}
              {[{ x: ix1, y: y1 }, { x: ix2, y: y2 }].map((pt, i) => (
                <motion.circle
                  key={`intersection-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={3}
                  fill={accentColor}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 + i * 0.1 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Label angles */}
        <AnimatePresence>
          {isVisible('labelAngles') && (
            <motion.g
              data-testid="plt-angle-labels"
              initial="hidden"
              animate={isCurrent('labelAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Angles at intersection 1 (line 1) */}
              {anglesAtIntersection.map((angleDef, ai) => {
                const measure = angleMeasures[ai]
                let adjustedMid = (angleDef.start + angleDef.end) / 2
                if (angleDef.start > angleDef.end) {
                  adjustedMid = ((angleDef.start + angleDef.end + 360) / 2) % 360
                }
                const lx = ix1 + labelRadius * Math.cos(adjustedMid * DEG)
                const ly = y1 - labelRadius * Math.sin(adjustedMid * DEG)

                const highlightKey = `1-${angleDef.position}-${angleDef.side}`
                const isHighlighted = isVisible('highlightPairs') && highlightedAngleIndices.has(highlightKey)
                const highlightColorIdx = highlightedAngleIndices.get(highlightKey)
                const color = isHighlighted && highlightColorIdx !== undefined
                  ? HIGHLIGHT_COLORS[highlightColorIdx % HIGHLIGHT_COLORS.length]
                  : '#6b7280'

                return (
                  <motion.g key={`angle-1-${ai}`}>
                    <motion.path
                      d={angleArcPath(ix1, y1, angleDef.start, angleDef.end, arcRadius)}
                      fill="none"
                      stroke={color}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={isHighlighted ? 700 : 500}
                      fill={color}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {showAngleMeasures ? `${Math.round(measure)}\u00b0` : angleLabels[ai]}
                    </motion.text>
                  </motion.g>
                )
              })}

              {/* Angles at intersection 2 (line 2) */}
              {anglesAtIntersection.map((angleDef, ai) => {
                const measure = angleMeasures[ai]
                let adjustedMid = (angleDef.start + angleDef.end) / 2
                if (angleDef.start > angleDef.end) {
                  adjustedMid = ((angleDef.start + angleDef.end + 360) / 2) % 360
                }
                const lx = ix2 + labelRadius * Math.cos(adjustedMid * DEG)
                const ly = y2 - labelRadius * Math.sin(adjustedMid * DEG)

                const highlightKey = `2-${angleDef.position}-${angleDef.side}`
                const isHighlighted = isVisible('highlightPairs') && highlightedAngleIndices.has(highlightKey)
                const highlightColorIdx = highlightedAngleIndices.get(highlightKey)
                const color = isHighlighted && highlightColorIdx !== undefined
                  ? HIGHLIGHT_COLORS[highlightColorIdx % HIGHLIGHT_COLORS.length]
                  : '#6b7280'

                return (
                  <motion.g key={`angle-2-${ai}`}>
                    <motion.path
                      d={angleArcPath(ix2, y2, angleDef.start, angleDef.end, arcRadius)}
                      fill="none"
                      stroke={color}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={isHighlighted ? 700 : 500}
                      fill={color}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {showAngleMeasures ? `${Math.round(measure)}\u00b0` : angleLabels[ai + 4]}
                    </motion.text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Highlight angle pairs (conditional) */}
        <AnimatePresence>
          {hasHighlights && isVisible('highlightPairs') && (
            <motion.g
              data-testid="plt-highlight-pairs"
              initial="hidden"
              animate={isCurrent('highlightPairs') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Shaded wedges for highlighted angle pairs */}
              {highlightAngles!.map((ha, i) => {
                const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]
                const matchingAngles = anglesAtIntersection.filter(
                  (a) => a.position === ha.position && a.side === ha.side
                )

                return matchingAngles.map((angleDef, mi) => {
                  const cx = mi === 0 ? ix1 : ix2
                  const cy = mi === 0 ? y1 : y2
                  const fillRadius = arcRadius + 4
                  const xStart = cx + fillRadius * Math.cos(angleDef.start * DEG)
                  const yStart = cy - fillRadius * Math.sin(angleDef.start * DEG)
                  const xEnd = cx + fillRadius * Math.cos(angleDef.end * DEG)
                  const yEnd = cy - fillRadius * Math.sin(angleDef.end * DEG)
                  let diff = angleDef.end - angleDef.start
                  if (diff < 0) diff += 360
                  const largeArc = diff > 180 ? 1 : 0

                  return (
                    <motion.path
                      key={`highlight-${i}-${mi}`}
                      d={`M ${cx} ${cy} L ${xStart} ${yStart} A ${fillRadius} ${fillRadius} 0 ${largeArc} 0 ${xEnd} ${yEnd} Z`}
                      fill={color}
                      fillOpacity={0.15}
                      stroke={color}
                      strokeWidth={2}
                      strokeOpacity={0.5}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.15 }}
                    />
                  )
                })
              })}

              {/* Legend for highlighted pairs */}
              {highlightAngles!.map((ha, i) => {
                const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]
                const typeLabel = ANGLE_PAIR_LABELS[ha.type]
                const label = typeLabel
                  ? (language === 'he' ? typeLabel.he : typeLabel.en)
                  : ha.type

                return (
                  <motion.g
                    key={`legend-${i}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    <rect
                      x={padding}
                      y={height - 28 - i * 18}
                      width={10}
                      height={10}
                      rx={2}
                      fill={color}
                      fillOpacity={0.6}
                    />
                    <text
                      x={padding + 16}
                      y={height - 19 - i * 18}
                      fontSize={10}
                      fontWeight={500}
                      fill={color}
                    >
                      {label}
                    </text>
                  </motion.g>
                )
              })}
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

export default ParallelLinesTransversal
