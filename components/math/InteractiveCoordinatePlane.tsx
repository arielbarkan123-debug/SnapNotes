'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CoordinatePlaneData, CoordinatePoint } from '@/types'
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

interface InteractiveCoordinatePlaneProps {
  /** Base data for the coordinate plane */
  data: CoordinatePlaneData
  /** ViewBox width — SVG scales responsively to container */
  width?: number
  /** Height of the diagram */
  height?: number
  /** Enable point dragging */
  enableDragging?: boolean
  /** Enable grid snapping when dragging */
  snapToGrid?: boolean
  /** Grid snap interval (defaults to major grid interval) */
  snapInterval?: number
  /** Enable click to add points */
  enableAddPoints?: boolean
  /** Maximum number of points allowed */
  maxPoints?: number
  /** Callback when a point is moved */
  onPointMove?: (index: number, x: number, y: number) => void
  /** Callback when a point is added */
  onPointAdd?: (x: number, y: number) => void
  /** Callback when a point is removed (double-click) */
  onPointRemove?: (index: number) => void
  /** Language */
  language?: 'en' | 'he'
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  grid: { en: 'Draw the grid', he: 'ציור הרשת' },
  axes: { en: 'Draw the axes', he: 'ציור הצירים' },
  interactive: { en: 'Enable interaction', he: 'הפעלת אינטראקציה' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * InteractiveCoordinatePlane — Phase 2 Visual Learning rebuild.
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
export function InteractiveCoordinatePlane({
  data,
  width = 400,
  height = 400,
  enableDragging = true,
  snapToGrid = true,
  snapInterval,
  enableAddPoints = false,
  maxPoints = 10,
  onPointMove,
  onPointAdd,
  onPointRemove,
  language = 'en',
  subject = 'math',
  complexity = 'middle_school',
  initialStep,
  className = '',
}: InteractiveCoordinatePlaneProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [localPoints, setLocalPoints] = useState<CoordinatePoint[]>(data.points || [])

  const { xMin, xMax, yMin, yMax } = data

  // Step definitions — always 3 steps: grid, axes, interactive
  const stepDefs = useMemo(() => [
    { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'interactive', label: STEP_LABELS.interactive.en, labelHe: STEP_LABELS.interactive.he },
  ], [])

  // useDiagramBase — step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
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

  const padding = { left: 50, right: 30, top: 40, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Coordinate conversion
  const xToSvg = useCallback((x: number) => {
    return padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth
  }, [xMin, xMax, plotWidth])

  const yToSvg = useCallback((y: number) => {
    return padding.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight
  }, [yMin, yMax, plotHeight])

  const svgToData = useCallback((svgX: number, svgY: number): { x: number; y: number } => {
    const dataX = ((svgX - padding.left) / plotWidth) * (xMax - xMin) + xMin
    const dataY = yMax - ((svgY - padding.top) / plotHeight) * (yMax - yMin)
    return { x: dataX, y: dataY }
  }, [xMin, xMax, yMin, yMax, plotWidth, plotHeight])

  // Grid lines
  const gridLines = useMemo(() => {
    const getInterval = (range: number) => {
      if (range <= 5) return 1
      if (range <= 10) return 2
      if (range <= 20) return 5
      return 10
    }
    const xInterval = getInterval(xMax - xMin)
    const yInterval = getInterval(yMax - yMin)

    const vertical: number[] = []
    const horizontal: number[] = []

    for (let x = Math.ceil(xMin / xInterval) * xInterval; x <= xMax; x += xInterval) {
      vertical.push(x)
    }
    for (let y = Math.ceil(yMin / yInterval) * yInterval; y <= yMax; y += yInterval) {
      horizontal.push(y)
    }

    return { vertical, horizontal }
  }, [xMin, xMax, yMin, yMax])

  // Snap calculations
  const calculatedSnapInterval = useMemo(() => {
    if (snapInterval) return snapInterval
    const xRange = xMax - xMin
    if (xRange <= 10) return 1
    if (xRange <= 20) return 2
    if (xRange <= 50) return 5
    return 10
  }, [xMin, xMax, snapInterval])

  const snapValue = useCallback((value: number): number => {
    if (!snapToGrid) return value
    return Math.round(value / calculatedSnapInterval) * calculatedSnapInterval
  }, [snapToGrid, calculatedSnapInterval])

  // ---------------------------------------------------------------------------
  // Interaction handlers
  // ---------------------------------------------------------------------------

  const getEventPosition = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
    if (clientX === undefined || clientY === undefined) return null
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handlePointPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (!enableDragging || !isVisible('interactive')) return
    e.preventDefault()
    e.stopPropagation()
    setDraggingIndex(index)
  }, [enableDragging, diagram.currentStep])

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (draggingIndex === null) return
    const pos = getEventPosition(e)
    if (!pos) return
    const dataPos = svgToData(pos.x, pos.y)
    const snappedX = snapValue(dataPos.x)
    const snappedY = snapValue(dataPos.y)
    const clampedX = Math.max(xMin, Math.min(xMax, snappedX))
    const clampedY = Math.max(yMin, Math.min(yMax, snappedY))

    setLocalPoints(prev => {
      const newPoints = [...prev]
      if (newPoints[draggingIndex]) {
        newPoints[draggingIndex] = { ...newPoints[draggingIndex], x: clampedX, y: clampedY }
      }
      return newPoints
    })
    onPointMove?.(draggingIndex, clampedX, clampedY)
  }, [draggingIndex, getEventPosition, svgToData, snapValue, xMin, xMax, yMin, yMax, onPointMove])

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!enableAddPoints || !isVisible('interactive') || draggingIndex !== null) return
    if (localPoints.length >= maxPoints) return
    const pos = getEventPosition(e)
    if (!pos) return
    const dataPos = svgToData(pos.x, pos.y)
    const snappedX = snapValue(dataPos.x)
    const snappedY = snapValue(dataPos.y)
    if (snappedX < xMin || snappedX > xMax || snappedY < yMin || snappedY > yMax) return

    const newPoint: CoordinatePoint = {
      x: snappedX,
      y: snappedY,
      label: `P${localPoints.length + 1}`,
      color: diagram.colors.primary,
    }
    setLocalPoints(prev => [...prev, newPoint])
    onPointAdd?.(snappedX, snappedY)
  }, [enableAddPoints, draggingIndex, localPoints.length, maxPoints, getEventPosition, svgToData, snapValue, xMin, xMax, yMin, yMax, onPointAdd, diagram.colors.primary, diagram.currentStep])

  const handlePointDoubleClick = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalPoints(prev => prev.filter((_, i) => i !== index))
    onPointRemove?.(index)
  }, [onPointRemove])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Hint labels
  const hints = {
    dragHint: language === 'he' ? 'גרור נקודות' : 'Drag points',
    clickHint: language === 'he' ? 'לחץ להוספה' : 'Click to add',
    snapOn: language === 'he' ? 'הצמדה פעילה' : 'Snap ON',
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="interactive-coord-plane"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={
          language === 'he'
            ? `מישור קואורדינטות אינטראקטיבי מ-${xMin} עד ${xMax}`
            : `Interactive coordinate plane from ${xMin} to ${xMax}`
        }
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClick={handleClick}
      >
        {/* Background */}
        <rect
          data-testid="icp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* ── Step 0: Grid ────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="icp-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {gridLines.vertical.map((x, i) => (
                <motion.line
                  key={`gv-${x}`}
                  x1={xToSvg(x)}
                  y1={padding.top}
                  x2={xToSvg(x)}
                  y2={padding.top + plotHeight}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  opacity={0.2}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  transition={{ delay: i * 0.02 }}
                />
              ))}
              {gridLines.horizontal.map((y, i) => (
                <motion.line
                  key={`gh-${y}`}
                  x1={padding.left}
                  y1={yToSvg(y)}
                  x2={padding.left + plotWidth}
                  y2={yToSvg(y)}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  opacity={0.2}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  transition={{ delay: i * 0.02 }}
                />
              ))}
              {/* Axis tick labels */}
              <g fontSize={11} className="fill-current">
                {gridLines.vertical.map((x) => (
                  <motion.text
                    key={`lx-${x}`}
                    x={xToSvg(x)}
                    y={padding.top + plotHeight + 18}
                    textAnchor="middle"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {x}
                  </motion.text>
                ))}
                {gridLines.horizontal.map((y) => (
                  <motion.text
                    key={`ly-${y}`}
                    x={padding.left - 8}
                    y={yToSvg(y) + 4}
                    textAnchor="end"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {y}
                  </motion.text>
                ))}
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Axes ────────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="icp-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* X-axis */}
              <motion.path
                d={`M ${padding.left} ${yToSvg(0)} L ${padding.left + plotWidth} ${yToSvg(0)}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Y-axis */}
              <motion.path
                d={`M ${xToSvg(0)} ${padding.top} L ${xToSvg(0)} ${padding.top + plotHeight}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Axis labels */}
              {data.xLabel && (
                <motion.text
                  x={padding.left + plotWidth / 2}
                  y={height - 5}
                  textAnchor="middle"
                  className="fill-current text-xs"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {data.xLabel}
                </motion.text>
              )}
              {data.yLabel && (
                <motion.text
                  x={12}
                  y={padding.top + plotHeight / 2}
                  textAnchor="middle"
                  className="fill-current text-xs"
                  transform={`rotate(-90, 12, ${padding.top + plotHeight / 2})`}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {data.yLabel}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Interactive elements ─────────────────────── */}
        <AnimatePresence>
          {isVisible('interactive') && (
            <motion.g
              data-testid="icp-interactive"
              initial="hidden"
              animate={isCurrent('interactive') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Hints rendered as text in SVG */}
              <g>
                {enableDragging && (
                  <motion.text
                    x={width - 10}
                    y={16}
                    textAnchor="end"
                    fontSize={10}
                    className="fill-blue-500 dark:fill-blue-400"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {hints.dragHint}
                  </motion.text>
                )}
                {enableAddPoints && (
                  <motion.text
                    x={width - 10}
                    y={28}
                    textAnchor="end"
                    fontSize={10}
                    className="fill-green-500 dark:fill-green-400"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {hints.clickHint}
                  </motion.text>
                )}
                {snapToGrid && (
                  <motion.text
                    x={width - 10}
                    y={enableAddPoints ? 40 : 28}
                    textAnchor="end"
                    fontSize={10}
                    className="fill-purple-500 dark:fill-purple-400"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {hints.snapOn}
                  </motion.text>
                )}
              </g>

              {/* Interactive points */}
              {localPoints.map((point, index) => {
                const svgX = xToSvg(point.x)
                const svgY = yToSvg(point.y)
                const isActive = draggingIndex === index
                const isHovered = hoveredIndex === index
                const pointRadius = diagram.lineWeight + 3

                return (
                  <motion.g
                    key={`ipoint-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: Math.min(index * 0.08, 1.5) }}
                    onMouseDown={(e) => handlePointPointerDown(e, index)}
                    onTouchStart={(e) => handlePointPointerDown(e, index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onDoubleClick={(e) => handlePointDoubleClick(e, index)}
                    style={{ cursor: enableDragging ? 'grab' : 'default' }}
                  >
                    {/* Glow when active/hovered */}
                    {(isActive || isHovered) && (
                      <circle
                        cx={svgX}
                        cy={svgY}
                        r={16}
                        fill={point.color || diagram.colors.primary}
                        opacity={0.2}
                      />
                    )}

                    {/* Point circle */}
                    <circle
                      data-testid={`icp-point-${index}`}
                      cx={svgX}
                      cy={svgY}
                      r={isActive ? pointRadius + 4 : isHovered ? pointRadius + 2 : pointRadius}
                      fill={point.color || diagram.colors.primary}
                      stroke="white"
                      strokeWidth={diagram.lineWeight - 1}
                    />

                    {/* Coordinates tooltip when dragging */}
                    {isActive && (
                      <g>
                        <rect x={svgX + 12} y={svgY - 28} width={70} height={24} rx={4} fill="rgba(0,0,0,0.8)" />
                        <text x={svgX + 47} y={svgY - 12} textAnchor="middle" fill="white" fontSize={12} fontFamily="monospace">
                          ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                        </text>
                      </g>
                    )}

                    {/* Point label */}
                    {point.label && !isActive && (
                      <motion.text
                        x={svgX}
                        y={svgY - 12}
                        textAnchor="middle"
                        fill={point.color || diagram.colors.primary}
                        fontSize={12}
                        fontWeight={500}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {point.label}
                      </motion.text>
                    )}
                  </motion.g>
                )
              })}

              {/* Snap grid preview when dragging */}
              {draggingIndex !== null && snapToGrid && (
                <g opacity={0.15}>
                  {Array.from({ length: Math.floor((xMax - xMin) / calculatedSnapInterval) + 1 }).map((_, i) => {
                    const x = xMin + i * calculatedSnapInterval
                    return (
                      <line
                        key={`snap-v-${i}`}
                        x1={xToSvg(x)}
                        y1={padding.top}
                        x2={xToSvg(x)}
                        y2={padding.top + plotHeight}
                        stroke={diagram.colors.light}
                        strokeWidth={1}
                        strokeDasharray="2,4"
                      />
                    )
                  })}
                  {Array.from({ length: Math.floor((yMax - yMin) / calculatedSnapInterval) + 1 }).map((_, i) => {
                    const y = yMin + i * calculatedSnapInterval
                    return (
                      <line
                        key={`snap-h-${i}`}
                        x1={padding.left}
                        y1={yToSvg(y)}
                        x2={padding.left + plotWidth}
                        y2={yToSvg(y)}
                        stroke={diagram.colors.light}
                        strokeWidth={1}
                        strokeDasharray="2,4"
                      />
                    )
                  })}
                </g>
              )}
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

export default InteractiveCoordinatePlane
