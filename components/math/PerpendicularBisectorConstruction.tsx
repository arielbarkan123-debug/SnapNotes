'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PerpendicularBisectorConstructionData } from '@/types/math'
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

interface PerpendicularBisectorConstructionProps {
  data: PerpendicularBisectorConstructionData
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
  drawSegment: { en: 'Draw segment AB', he: 'ציור קטע AB' },
  drawArcs: { en: 'Draw compass arcs', he: 'ציור קשתות מחוגה' },
  drawBisector: { en: 'Draw perpendicular bisector', he: 'ציור אנך אמצעי' },
  markMidpoint: { en: 'Mark midpoint', he: 'סימון נקודת אמצע' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function svgArc(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const startRad = (startAngleDeg * Math.PI) / 180
  const endRad = (endAngleDeg * Math.PI) / 180
  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)
  const sweep = endAngleDeg - startAngleDeg
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0
  const sweepFlag = sweep > 0 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PerpendicularBisectorConstruction({
  data,
  className = '',
  width = 450,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: PerpendicularBisectorConstructionProps) {
  const { point1, point2, title } = data

  const padding = { left: 50, right: 50, top: 60, bottom: 60 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // Map data points to SVG coordinates
  const pts = useMemo(() => {
    const allX = [point1.x, point2.x]
    const allY = [point1.y, point2.y]
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const scale = Math.min(plotW / rangeX, plotH / rangeY) * 0.7
    const centerX = padding.left + plotW / 2
    const centerY = padding.top + plotH / 2
    const midDataX = (minX + maxX) / 2
    const midDataY = (minY + maxY) / 2
    const map = (p: { x: number; y: number }) => ({
      x: centerX + (p.x - midDataX) * scale,
      y: centerY + (p.y - midDataY) * scale,
    })
    return { A: map(point1), B: map(point2) }
  }, [point1, point2, padding.left, padding.top, plotW, plotH])

  const { A, B } = pts

  // Midpoint
  const M = useMemo(() => ({
    x: (A.x + B.x) / 2,
    y: (A.y + B.y) / 2,
  }), [A, B])

  // Distance for compass radius
  const segLen = useMemo(
    () => Math.sqrt((B.x - A.x) ** 2 + (B.y - A.y) ** 2),
    [A, B]
  )
  const compassRadius = segLen * 0.7

  // Intersection points of compass arcs
  // Two circles of radius compassRadius centered at A and B
  const intersections = useMemo(() => {
    const dx = B.x - A.x
    const dy = B.y - A.y
    const d = segLen
    if (d === 0) return { top: M, bottom: M }
    const a = d / 2
    const h = Math.sqrt(compassRadius ** 2 - a ** 2)
    const mx = (A.x + B.x) / 2
    const my = (A.y + B.y) / 2
    const px = (-dy / d) * h
    const py = (dx / d) * h
    return {
      top: { x: mx + px, y: my + py },
      bottom: { x: mx - px, y: my - py },
    }
  }, [A, B, segLen, compassRadius, M])

  // Compass arc paths from point A
  const arcFromA = useMemo(() => {
    const angleToTop = Math.atan2(intersections.top.y - A.y, intersections.top.x - A.x) * (180 / Math.PI)
    const angleToBottom = Math.atan2(intersections.bottom.y - A.y, intersections.bottom.x - A.x) * (180 / Math.PI)
    // Draw arc from intersection top to intersection bottom through the right side
    return svgArc(A.x, A.y, compassRadius, angleToTop, angleToBottom)
  }, [A, intersections, compassRadius])

  const arcFromB = useMemo(() => {
    const angleToTop = Math.atan2(intersections.top.y - B.y, intersections.top.x - B.x) * (180 / Math.PI)
    const angleToBottom = Math.atan2(intersections.bottom.y - B.y, intersections.bottom.x - B.x) * (180 / Math.PI)
    return svgArc(B.x, B.y, compassRadius, angleToTop, angleToBottom)
  }, [B, intersections, compassRadius])

  // Right angle mark at midpoint
  const rightAngleMark = useMemo(() => {
    // Direction along AB
    const dx = B.x - A.x
    const dy = B.y - A.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / len
    const uy = dy / len
    // Perpendicular direction
    const px = -uy
    const py = ux
    const s = 8
    const p1 = { x: M.x + ux * s, y: M.y + uy * s }
    const p2 = { x: p1.x + px * s, y: p1.y + py * s }
    const p3 = { x: M.x + px * s, y: M.y + py * s }
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }, [A, B, M])

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'drawSegment', label: STEP_LABELS.drawSegment.en, labelHe: STEP_LABELS.drawSegment.he },
    { id: 'drawArcs', label: STEP_LABELS.drawArcs.en, labelHe: STEP_LABELS.drawArcs.he },
    { id: 'drawBisector', label: STEP_LABELS.drawBisector.en, labelHe: STEP_LABELS.drawBisector.he },
    { id: 'markMidpoint', label: STEP_LABELS.markMidpoint.en, labelHe: STEP_LABELS.markMidpoint.he },
  ], [])

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

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="perpendicular-bisector-construction"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="pbc-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="pbc-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw segment AB */}
        <AnimatePresence>
          {isVisible('drawSegment') && (
            <motion.g
              data-testid="pbc-segment"
              initial="hidden"
              animate={isCurrent('drawSegment') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Endpoint A */}
              <motion.circle
                cx={A.x}
                cy={A.y}
                r={4}
                fill={primaryColor}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
              />
              {/* Endpoint B */}
              <motion.circle
                cx={B.x}
                cy={B.y}
                r={4}
                fill={primaryColor}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
              />
              {/* Label A */}
              <motion.text
                x={A.x}
                y={A.y + 20}
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                A
              </motion.text>
              {/* Label B */}
              <motion.text
                x={B.x}
                y={B.y + 20}
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                B
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Draw compass arcs */}
        <AnimatePresence>
          {isVisible('drawArcs') && (
            <motion.g
              data-testid="pbc-arcs"
              initial="hidden"
              animate={isCurrent('drawArcs') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Arc from A */}
              <motion.path
                d={arcFromA}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Arc from B */}
              <motion.path
                d={arcFromB}
                fill="none"
                stroke="#22c55e"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Intersection dots */}
              <motion.circle
                cx={intersections.top.x}
                cy={intersections.top.y}
                r={3}
                fill="#ef4444"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.4 }}
              />
              <motion.circle
                cx={intersections.bottom.x}
                cy={intersections.bottom.y}
                r={3}
                fill="#ef4444"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.5 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Draw bisector through intersections */}
        <AnimatePresence>
          {isVisible('drawBisector') && (
            <motion.g
              data-testid="pbc-bisector"
              initial="hidden"
              animate={isCurrent('drawBisector') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Extend bisector line beyond intersection points */}
              {(() => {
                const dx = intersections.bottom.x - intersections.top.x
                const dy = intersections.bottom.y - intersections.top.y
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                const extend = 30
                const x1 = intersections.top.x - (dx / len) * extend
                const y1 = intersections.top.y - (dy / len) * extend
                const x2 = intersections.bottom.x + (dx / len) * extend
                const y2 = intersections.bottom.y + (dy / len) * extend
                return (
                  <motion.line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#ef4444"
                    strokeWidth={diagram.lineWeight}
                    strokeLinecap="round"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })()}
              {/* Right angle mark */}
              <motion.path
                d={rightAngleMark}
                fill="none"
                stroke="#ef4444"
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Mark midpoint */}
        <AnimatePresence>
          {isVisible('markMidpoint') && (
            <motion.g
              data-testid="pbc-midpoint"
              initial="hidden"
              animate={isCurrent('markMidpoint') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={M.x}
                cy={M.y}
                r={5}
                fill="#ef4444"
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              />
              <motion.text
                x={M.x + 12}
                y={M.y - 8}
                textAnchor="start"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={13}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                M
              </motion.text>
              {/* Equal distance markers on segment */}
              {(() => {
                const dx = M.x - A.x
                const dy = M.y - A.y
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                const tickLen = 6
                const px = -dy / len
                const py = dx / len
                const tick1 = { x: (A.x + M.x) / 2, y: (A.y + M.y) / 2 }
                const tick2 = { x: (M.x + B.x) / 2, y: (M.y + B.y) / 2 }
                return (
                  <>
                    {[tick1, tick2].map((t, i) => (
                      <motion.line
                        key={`tick-${i}`}
                        x1={t.x - px * tickLen}
                        y1={t.y - py * tickLen}
                        x2={t.x + px * tickLen}
                        y2={t.y + py * tickLen}
                        stroke={accentColor}
                        strokeWidth={2}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                      />
                    ))}
                  </>
                )
              })()}
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

export default PerpendicularBisectorConstruction
