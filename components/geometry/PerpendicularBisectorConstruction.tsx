'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PerpendicularBisectorConstructionData } from '@/types/geometry'
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
  segment: { en: 'Draw segment', he: 'ציור קטע' },
  arc1: { en: 'Arc from first endpoint', he: 'קשת מנקודה ראשונה' },
  arc2: { en: 'Arc from second endpoint', he: 'קשת מנקודה שנייה' },
  bisector: { en: 'Draw bisector line', he: 'ציור האנך האמצעי' },
  midpoint: { en: 'Mark midpoint & right angle', he: 'סימון אמצע וזווית ישרה' },
}

interface PerpendicularBisectorConstructionProps {
  data: PerpendicularBisectorConstructionData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

export function PerpendicularBisectorConstruction({
  data,
  width = 400,
  height = 400,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: PerpendicularBisectorConstructionProps) {
  const { point1, point2, title } = data

  const stepDefs = useMemo(
    () => [
      { id: 'segment', label: STEP_LABELS.segment.en, labelHe: STEP_LABELS.segment.he },
      { id: 'arc1', label: STEP_LABELS.arc1.en, labelHe: STEP_LABELS.arc1.he },
      { id: 'arc2', label: STEP_LABELS.arc2.en, labelHe: STEP_LABELS.arc2.he },
      { id: 'bisector', label: STEP_LABELS.bisector.en, labelHe: STEP_LABELS.bisector.he },
      { id: 'midpoint', label: STEP_LABELS.midpoint.en, labelHe: STEP_LABELS.midpoint.he },
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

  // Layout: map data points into SVG space
  const padding = 60
  const cx = width / 2
  const cy = height / 2

  // Segment endpoints (map to SVG)
  const dx = point2.x - point1.x
  const dy = point2.y - point1.y
  const segLen = Math.sqrt(dx * dx + dy * dy)
  const scale = Math.min((width - padding * 2) / (segLen || 1), (height - padding * 2) / (segLen || 1)) * 0.5

  const ax = cx - (dx * scale) / 2
  const ay = cy - (dy * scale) / 2
  const bx = cx + (dx * scale) / 2
  const by = cy + (dy * scale) / 2

  // Midpoint
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2

  // Arc radius (a bit more than half the segment)
  const halfLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2) / 2
  const arcRadius = halfLen * 1.4

  // Perpendicular direction (unit normal)
  const segDx = bx - ax
  const segDy = by - ay
  const segLength = Math.sqrt(segDx * segDx + segDy * segDy)
  const nx = -segDy / segLength
  const ny = segDx / segLength

  // Arc intersection points (where arcs cross)
  const d = Math.sqrt(arcRadius * arcRadius - halfLen * halfLen)
  const ix1 = mx + nx * d
  const iy1 = my + ny * d
  const ix2 = mx - nx * d
  const iy2 = my - ny * d

  // Arc SVG helpers
  const computeArcPath = (centerX: number, centerY: number, radius: number, p1x: number, p1y: number, p2x: number, p2y: number) => {
    // Draw arc from p1 to p2 centered at (centerX, centerY) with given radius
    const largeArc = 0
    const sweep = ((p2x - centerX) * (p1y - centerY) - (p2y - centerY) * (p1x - centerX)) > 0 ? 1 : 0
    return `M ${p1x} ${p1y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${p2x} ${p2y}`
  }

  // Right angle marker
  const raSize = 10

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="perpendicular-bisector-construction-diagram"
      className={`geometry-perpendicular-bisector ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Perpendicular bisector construction${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="pbc-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="pbc-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: Draw segment */}
        <AnimatePresence>
          {isVisible('segment') && (
            <motion.g
              data-testid="pbc-segment"
              initial="hidden"
              animate={isCurrent('segment') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Endpoint labels */}
              <motion.text
                x={ax - 15}
                y={ay + 5}
                textAnchor="middle"
                className="fill-current text-sm font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {point1.label || 'A'}
              </motion.text>
              <motion.text
                x={bx + 15}
                y={by + 5}
                textAnchor="middle"
                className="fill-current text-sm font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {point2.label || 'B'}
              </motion.text>
              {/* Endpoint dots */}
              <circle cx={ax} cy={ay} r={3} fill="currentColor" />
              <circle cx={bx} cy={by} r={3} fill="currentColor" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Arc from first endpoint */}
        <AnimatePresence>
          {isVisible('arc1') && (
            <motion.g
              data-testid="pbc-arc1"
              initial="hidden"
              animate={isCurrent('arc1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={computeArcPath(ax, ay, arcRadius, ix1, iy1, ix2, iy2)}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={1.5}
                strokeDasharray="4,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Arc from second endpoint */}
        <AnimatePresence>
          {isVisible('arc2') && (
            <motion.g
              data-testid="pbc-arc2"
              initial="hidden"
              animate={isCurrent('arc2') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={computeArcPath(bx, by, arcRadius, ix1, iy1, ix2, iy2)}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={1.5}
                strokeDasharray="4,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Intersection points */}
              <motion.circle
                cx={ix1}
                cy={iy1}
                r={3}
                fill={diagram.colors.primary}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
              />
              <motion.circle
                cx={ix2}
                cy={iy2}
                r={3}
                fill={diagram.colors.primary}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Draw bisector line */}
        <AnimatePresence>
          {isVisible('bisector') && (
            <motion.g
              data-testid="pbc-bisector"
              initial="hidden"
              animate={isCurrent('bisector') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={ix1}
                y1={iy1}
                x2={ix2}
                y2={iy2}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Mark midpoint and right angle */}
        <AnimatePresence>
          {isVisible('midpoint') && (
            <motion.g
              data-testid="pbc-midpoint"
              initial="hidden"
              animate={isCurrent('midpoint') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Midpoint dot */}
              <motion.circle
                cx={mx}
                cy={my}
                r={4}
                fill={GEOMETRY_COLORS.highlight.primary}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                x={mx + 10}
                y={my - 10}
                textAnchor="start"
                className="text-xs font-medium"
                style={{ fill: GEOMETRY_COLORS.highlight.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                M
              </motion.text>

              {/* Right angle marker at midpoint */}
              <motion.path
                d={`M ${mx + nx * raSize} ${my + ny * raSize}
                    L ${mx + nx * raSize + segDx / segLength * raSize} ${my + ny * raSize + segDy / segLength * raSize}
                    L ${mx + segDx / segLength * raSize} ${my + segDy / segLength * raSize}`}
                fill="none"
                stroke={GEOMETRY_COLORS.label.angle}
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              />
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

export default PerpendicularBisectorConstruction
