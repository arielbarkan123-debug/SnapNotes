'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CircleData, CircleErrorHighlight } from '@/types'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CircleDataWithErrors extends CircleData {
  errorHighlight?: CircleErrorHighlight
}

interface CircleProps {
  data: CircleDataWithErrors
  className?: string
  /** ViewBox width — SVG scales responsively to container */
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Draw the circle', he: 'ציור המעגל' },
  radii: { en: 'Show radii and chords', he: 'הצגת רדיוסים ומיתרים' },
  arcs: { en: 'Show arcs', he: 'הצגת קשתות' },
  angles: { en: 'Show angles', he: 'הצגת זוויות' },
  labels: { en: 'Show labels', he: 'הצגת תוויות' },
  errors: { en: 'Show corrections', he: 'הצגת תיקונים' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Circle — Phase 2 Visual Learning Overhaul.
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
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 */
export function Circle({
  data,
  className = '',
  width = 300,
  height = 300,
  complexity: forcedComplexity,
  subject = 'geometry',
  language = 'en',
  initialStep,
}: CircleProps) {
  const {
    centerX: cx,
    centerY: cy,
    radius,
    centerLabel,
    showRadius,
    radiusLabel,
    showDiameter,
    chords = [],
    tangentPoint,
    centralAngle,
    inscribedAngle,
    title,
    errorHighlight,
  } = data

  // Determine which step groups exist based on data
  const hasRadii = !!(showRadius || showDiameter || chords.length > 0)
  const hasArcs = !!(centralAngle || inscribedAngle)
  const hasAngles = !!(centralAngle || inscribedAngle || tangentPoint)
  const hasLabels = !!(centerLabel || radiusLabel || chords.some((c) => c.start.label || c.end.label))
  const hasErrors = !!(
    errorHighlight?.wrongRadius ||
    errorHighlight?.wrongCenter ||
    errorHighlight?.wrongChord !== undefined
  )

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
    ]
    if (hasRadii) defs.push({ id: 'radii', label: STEP_LABELS.radii.en, labelHe: STEP_LABELS.radii.he })
    if (hasArcs) defs.push({ id: 'arcs', label: STEP_LABELS.arcs.en, labelHe: STEP_LABELS.arcs.he })
    if (hasAngles) defs.push({ id: 'angles', label: STEP_LABELS.angles.en, labelHe: STEP_LABELS.angles.he })
    if (hasLabels) defs.push({ id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he })
    if (hasErrors) defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    return defs
  }, [hasRadii, hasArcs, hasAngles, hasLabels, hasErrors])

  // useDiagramBase — step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = 40
  const titleHeight = title ? 25 : 0
  const availableSize = Math.min(width, height) - padding * 2 - titleHeight
  const scale = availableSize / (radius * 2.5)

  const transform = (x: number, y: number): { x: number; y: number } => ({
    x: width / 2 + (x - cx) * scale,
    y: height / 2 + titleHeight / 2 - (y - cy) * scale,
  })

  const center = transform(cx, cy)
  const scaledRadius = radius * scale

  // Calculate point on circle from angle (in degrees)
  const pointOnCircle = (angleDeg: number): { x: number; y: number } => {
    const angleRad = (angleDeg * Math.PI) / 180
    return {
      x: center.x + scaledRadius * Math.cos(angleRad),
      y: center.y - scaledRadius * Math.sin(angleRad),
    }
  }

  // Draw arc path
  const arcPath = (startDeg: number, endDeg: number, r: number = scaledRadius): string => {
    const start = pointOnCircle(startDeg)
    const endPoint = {
      x: center.x + r * Math.cos((endDeg * Math.PI) / 180),
      y: center.y - r * Math.sin((endDeg * Math.PI) / 180),
    }
    // For small arcs, we need to use the scaled radius for the start point too
    const startPoint = {
      x: center.x + r * Math.cos((startDeg * Math.PI) / 180),
      y: center.y - r * Math.sin((startDeg * Math.PI) / 180),
    }
    if (r !== scaledRadius) {
      // Use the custom radius arc points
      const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
      const sweep = endDeg > startDeg ? 0 : 1
      return `M ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${endPoint.x} ${endPoint.y}`
    }
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    const sweep = endDeg > startDeg ? 0 : 1
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${endPoint.x} ${endPoint.y}`
  }

  // Circle SVG path for pathLength animation
  const circlePathD = `M ${center.x + scaledRadius} ${center.y} A ${scaledRadius} ${scaledRadius} 0 1 0 ${center.x - scaledRadius} ${center.y} A ${scaledRadius} ${scaledRadius} 0 1 0 ${center.x + scaledRadius} ${center.y}`

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="circle-diagram"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Circle${title ? `: ${title}` : ''} with radius ${radius}`}
      >
        {/* Background */}
        <rect
          data-testid="cir-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current font-medium"
            style={{ fontSize: 14 }}
          >
            {title}
          </text>
        )}

        {/* ── Step 0: Circle outline ───────────────────────────── */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="cir-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Circle fill */}
              <circle
                cx={center.x}
                cy={center.y}
                r={scaledRadius}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                stroke="none"
              />

              {/* Circle outline — draws progressively */}
              <motion.path
                d={circlePathD}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Center point */}
              <motion.circle
                cx={center.x}
                cy={center.y}
                r={diagram.lineWeight}
                fill="currentColor"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Radii and chords ─────────────────────────── */}
        <AnimatePresence>
          {hasRadii && isVisible('radii') && (
            <motion.g
              data-testid="cir-radii"
              initial="hidden"
              animate={isCurrent('radii') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Radius line */}
              {showRadius && (
                <motion.path
                  d={`M ${center.x} ${center.y} L ${center.x + scaledRadius} ${center.y}`}
                  stroke={diagram.colors.primary}
                  strokeWidth={diagram.lineWeight}
                  fill="none"
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )}

              {/* Diameter line */}
              {showDiameter && (
                <motion.path
                  d={`M ${center.x - scaledRadius} ${center.y} L ${center.x + scaledRadius} ${center.y}`}
                  stroke="#10B981"
                  strokeWidth={diagram.lineWeight}
                  fill="none"
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )}

              {/* Chords */}
              {chords.map((chord, index) => {
                const start = transform(chord.start.x, chord.start.y)
                const end = transform(chord.end.x, chord.end.y)
                return (
                  <motion.g
                    key={`chord-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.15 }}
                  >
                    <motion.path
                      d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                      stroke="#8B5CF6"
                      strokeWidth={diagram.lineWeight}
                      fill="none"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <circle cx={start.x} cy={start.y} r={diagram.lineWeight + 1} fill="#8B5CF6" />
                    <circle cx={end.x} cy={end.y} r={diagram.lineWeight + 1} fill="#8B5CF6" />
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Arcs ─────────────────────────────────────── */}
        <AnimatePresence>
          {hasArcs && isVisible('arcs') && (
            <motion.g
              data-testid="cir-arcs"
              initial="hidden"
              animate={isCurrent('arcs') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Central angle arc on circle */}
              {centralAngle && (
                <motion.path
                  d={arcPath(centralAngle.start, centralAngle.end)}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={diagram.lineWeight + 1}
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )}

              {/* Inscribed angle arc on circle */}
              {inscribedAngle && (
                <motion.path
                  d={arcPath(inscribedAngle.arc.start, inscribedAngle.arc.end)}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth={3}
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Angles ───────────────────────────────────── */}
        <AnimatePresence>
          {hasAngles && isVisible('angles') && (
            <motion.g
              data-testid="cir-angles"
              initial="hidden"
              animate={isCurrent('angles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Central angle radii + arc at center */}
              {centralAngle && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {[centralAngle.start, centralAngle.end].map((angle, i) => {
                    const point = pointOnCircle(angle)
                    return (
                      <motion.path
                        key={`central-radius-${i}`}
                        d={`M ${center.x} ${center.y} L ${point.x} ${point.y}`}
                        stroke="#EF4444"
                        strokeWidth={diagram.lineWeight}
                        fill="none"
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                    )
                  })}
                  <motion.path
                    d={arcPath(centralAngle.start, centralAngle.end, 25)}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={1.5}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  {centralAngle.label && (
                    <motion.text
                      x={center.x + 35 * Math.cos(((centralAngle.start + centralAngle.end) / 2 * Math.PI) / 180)}
                      y={center.y - 35 * Math.sin(((centralAngle.start + centralAngle.end) / 2 * Math.PI) / 180)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fill: '#EF4444', fontSize: 12 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {centralAngle.label}
                    </motion.text>
                  )}
                </motion.g>
              )}

              {/* Inscribed angle lines */}
              {inscribedAngle && (() => {
                const vertex = transform(inscribedAngle.vertex.x, inscribedAngle.vertex.y)
                const arcStart = pointOnCircle(inscribedAngle.arc.start)
                const arcEnd = pointOnCircle(inscribedAngle.arc.end)
                return (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <motion.path
                      d={`M ${vertex.x} ${vertex.y} L ${arcStart.x} ${arcStart.y}`}
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="none"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <motion.path
                      d={`M ${vertex.x} ${vertex.y} L ${arcEnd.x} ${arcEnd.y}`}
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="none"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <circle cx={vertex.x} cy={vertex.y} r={4} fill="#10B981" />
                    <circle cx={arcStart.x} cy={arcStart.y} r={4} fill="#10B981" />
                    <circle cx={arcEnd.x} cy={arcEnd.y} r={4} fill="#10B981" />
                    {inscribedAngle.label && (
                      <motion.text
                        x={vertex.x - 15}
                        y={vertex.y + 15}
                        style={{ fill: '#10B981', fontSize: 12 }}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {inscribedAngle.label}
                      </motion.text>
                    )}
                  </motion.g>
                )
              })()}

              {/* Tangent point and line */}
              {tangentPoint && (() => {
                const point = transform(tangentPoint.x, tangentPoint.y)
                const angleToCenter = Math.atan2(center.y - point.y, center.x - point.x)
                const tangentAngle = angleToCenter + Math.PI / 2
                const tangentLength = 60
                return (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <motion.path
                      d={`M ${point.x - Math.cos(tangentAngle) * tangentLength} ${point.y - Math.sin(tangentAngle) * tangentLength} L ${point.x + Math.cos(tangentAngle) * tangentLength} ${point.y + Math.sin(tangentAngle) * tangentLength}`}
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fill="none"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                    <circle cx={point.x} cy={point.y} r={4} fill="#F59E0B" />
                  </motion.g>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4: Labels ───────────────────────────────────── */}
        <AnimatePresence>
          {hasLabels && isVisible('labels') && (
            <motion.g
              data-testid="cir-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Center label */}
              {centerLabel && (
                <motion.text
                  x={center.x - 10}
                  y={center.y + 15}
                  className="fill-current font-medium"
                  style={{ fontSize: 14 }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {centerLabel}
                </motion.text>
              )}

              {/* Radius label */}
              {radiusLabel && showRadius && (
                <motion.text
                  x={center.x + scaledRadius / 2}
                  y={center.y - 8}
                  textAnchor="middle"
                  style={{ fill: diagram.colors.primary, fontSize: 14 }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.1 }}
                >
                  {radiusLabel}
                </motion.text>
              )}

              {/* Chord labels */}
              {chords.map((chord, index) => {
                const start = transform(chord.start.x, chord.start.y)
                const end = transform(chord.end.x, chord.end.y)
                return (
                  <motion.g
                    key={`chord-label-${index}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: 0.1 + index * 0.1 }}
                  >
                    {chord.start.label && (
                      <text
                        x={start.x - 15}
                        y={start.y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        style={{ fill: '#8B5CF6', fontSize: 14 }}
                      >
                        {chord.start.label}
                      </text>
                    )}
                    {chord.end.label && (
                      <text
                        x={end.x + 15}
                        y={end.y}
                        textAnchor="start"
                        dominantBaseline="middle"
                        style={{ fill: '#8B5CF6', fontSize: 14 }}
                      >
                        {chord.end.label}
                      </text>
                    )}
                  </motion.g>
                )
              })}

              {/* Tangent point label */}
              {tangentPoint?.label && (() => {
                const point = transform(tangentPoint.x, tangentPoint.y)
                return (
                  <motion.text
                    x={point.x + 10}
                    y={point.y - 10}
                    style={{ fill: '#F59E0B', fontSize: 14 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: 0.2 }}
                  >
                    {tangentPoint.label}
                  </motion.text>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 5: Error highlights ─────────────────────────── */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="cir-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Wrong radius */}
              {errorHighlight?.wrongRadius && (
                <g data-testid="cir-wrong-radius">
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={center.x + scaledRadius}
                    y2={center.y}
                    stroke="#EF4444"
                    strokeWidth={3}
                    strokeDasharray="6,4"
                  />
                  <circle cx={center.x + scaledRadius / 2} cy={center.y} r={10} fill="#EF4444" opacity={0.2} />
                  <line x1={center.x + scaledRadius / 2 - 6} y1={center.y - 6} x2={center.x + scaledRadius / 2 + 6} y2={center.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                  <line x1={center.x + scaledRadius / 2 + 6} y1={center.y - 6} x2={center.x + scaledRadius / 2 - 6} y2={center.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                  {errorHighlight?.corrections?.radius && (
                    <text x={center.x + scaledRadius / 2} y={center.y - 18} textAnchor="middle" style={{ fill: '#EF4444', fontSize: 12, fontWeight: 500 }}>
                      {errorHighlight.corrections.radius}
                    </text>
                  )}
                </g>
              )}

              {/* Wrong center */}
              {errorHighlight?.wrongCenter && (
                <g data-testid="cir-wrong-center">
                  <circle cx={center.x} cy={center.y} r={15} fill="#EF4444" opacity={0.2} />
                  <line x1={center.x - 8} y1={center.y - 8} x2={center.x + 8} y2={center.y + 8} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
                  <line x1={center.x + 8} y1={center.y - 8} x2={center.x - 8} y2={center.y + 8} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
                  {errorHighlight?.corrections?.center && (
                    <text x={center.x} y={center.y + 25} textAnchor="middle" style={{ fill: '#EF4444', fontSize: 12, fontWeight: 500 }}>
                      {errorHighlight.corrections.center}
                    </text>
                  )}
                </g>
              )}

              {/* Wrong chord */}
              {errorHighlight?.wrongChord !== undefined && chords[errorHighlight.wrongChord] && (() => {
                const chord = chords[errorHighlight.wrongChord!]
                const start = transform(chord.start.x, chord.start.y)
                const end = transform(chord.end.x, chord.end.y)
                const midX = (start.x + end.x) / 2
                const midY = (start.y + end.y) / 2
                return (
                  <g data-testid="cir-wrong-chord">
                    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#EF4444" strokeWidth={3} strokeDasharray="6,4" />
                    <circle cx={midX} cy={midY} r={10} fill="#EF4444" opacity={0.2} />
                    <line x1={midX - 6} y1={midY - 6} x2={midX + 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                    <line x1={midX + 6} y1={midY - 6} x2={midX - 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                  </g>
                )
              })()}
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

export default Circle
