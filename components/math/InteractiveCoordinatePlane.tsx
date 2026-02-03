'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { CoordinatePlane } from './CoordinatePlane'
import type { CoordinatePlaneData, CoordinatePoint } from '@/types'

interface InteractiveCoordinatePlaneProps {
  /** Base data for the coordinate plane */
  data: CoordinatePlaneData
  /** Width of the diagram */
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
}

/**
 * InteractiveCoordinatePlane - CoordinatePlane with interactive features
 *
 * Features:
 * - Drag points to new positions
 * - Snap to grid for precision
 * - Click to add new points
 * - Double-click to remove points
 * - Touch support for mobile
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
}: InteractiveCoordinatePlaneProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [localPoints, setLocalPoints] = useState<CoordinatePoint[]>(data.points || [])

  const { xMin, xMax, yMin, yMax } = data
  const isRTL = language === 'he'

  // Calculate padding and dimensions
  const padding = { left: 50, right: 30, top: 40, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Calculate snap interval
  const calculatedSnapInterval = useMemo(() => {
    if (snapInterval) return snapInterval
    const xRange = xMax - xMin
    if (xRange <= 10) return 1
    if (xRange <= 20) return 2
    if (xRange <= 50) return 5
    return 10
  }, [xMin, xMax, snapInterval])

  // Convert SVG coordinates to data coordinates
  const svgToData = useCallback((svgX: number, svgY: number): { x: number; y: number } => {
    const dataX = ((svgX - padding.left) / plotWidth) * (xMax - xMin) + xMin
    const dataY = yMax - ((svgY - padding.top) / plotHeight) * (yMax - yMin)
    return { x: dataX, y: dataY }
  }, [xMin, xMax, yMin, yMax, plotWidth, plotHeight])

  // Snap value to grid
  const snapValue = useCallback((value: number): number => {
    if (!snapToGrid) return value
    return Math.round(value / calculatedSnapInterval) * calculatedSnapInterval
  }, [snapToGrid, calculatedSnapInterval])

  // Get mouse/touch position relative to SVG
  const getEventPosition = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null

    const rect = svgRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY

    if (clientX === undefined || clientY === undefined) return null

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  // Handle pointer down on a point
  const handlePointPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (!enableDragging) return
    e.preventDefault()
    e.stopPropagation()
    setDraggingIndex(index)
  }, [enableDragging])

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (draggingIndex === null) return

    const pos = getEventPosition(e)
    if (!pos) return

    const dataPos = svgToData(pos.x, pos.y)
    const snappedX = snapValue(dataPos.x)
    const snappedY = snapValue(dataPos.y)

    // Clamp to bounds
    const clampedX = Math.max(xMin, Math.min(xMax, snappedX))
    const clampedY = Math.max(yMin, Math.min(yMax, snappedY))

    setLocalPoints(prev => {
      const newPoints = [...prev]
      if (newPoints[draggingIndex]) {
        newPoints[draggingIndex] = {
          ...newPoints[draggingIndex],
          x: clampedX,
          y: clampedY,
        }
      }
      return newPoints
    })

    onPointMove?.(draggingIndex, clampedX, clampedY)
  }, [draggingIndex, getEventPosition, svgToData, snapValue, xMin, xMax, yMin, yMax, onPointMove])

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null)
  }, [])

  // Handle click to add point
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!enableAddPoints || draggingIndex !== null) return
    if (localPoints.length >= maxPoints) return

    const pos = getEventPosition(e)
    if (!pos) return

    const dataPos = svgToData(pos.x, pos.y)
    const snappedX = snapValue(dataPos.x)
    const snappedY = snapValue(dataPos.y)

    // Check if within bounds
    if (snappedX < xMin || snappedX > xMax || snappedY < yMin || snappedY > yMax) return

    const newPoint: CoordinatePoint = {
      x: snappedX,
      y: snappedY,
      label: `P${localPoints.length + 1}`,
      color: '#3b82f6',
    }

    setLocalPoints(prev => [...prev, newPoint])
    onPointAdd?.(snappedX, snappedY)
  }, [enableAddPoints, draggingIndex, localPoints.length, maxPoints, getEventPosition, svgToData, snapValue, xMin, xMax, yMin, yMax, onPointAdd])

  // Handle double-click to remove point
  const handlePointDoubleClick = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalPoints(prev => prev.filter((_, i) => i !== index))
    onPointRemove?.(index)
  }, [onPointRemove])

  // Build data with local points (available for future use)
  const _interactiveData = useMemo((): CoordinatePlaneData => ({
    ...data,
    points: localPoints,
  }), [data, localPoints])

  // Labels
  const labels = {
    dragHint: language === 'he' ? 'גרור נקודות' : 'Drag points',
    clickHint: language === 'he' ? 'לחץ להוספה' : 'Click to add',
    snapOn: language === 'he' ? 'הצמדה פעילה' : 'Snap ON',
  }

  return (
    <div className="relative" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hints */}
      <div className="absolute top-2 right-2 flex gap-2 text-xs">
        {enableDragging && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
            {labels.dragHint}
          </span>
        )}
        {enableAddPoints && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
            {labels.clickHint}
          </span>
        )}
        {snapToGrid && (
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
            {labels.snapOn}
          </span>
        )}
      </div>

      {/* SVG wrapper for interaction handling */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="cursor-crosshair"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClick={handleClick}
      >
        {/* Render base coordinate plane (without points for custom rendering) */}
        <foreignObject x={0} y={0} width={width} height={height}>
          <CoordinatePlane
            data={{ ...data, points: [] }}
            width={width}
            height={height}
            animateCurves={!draggingIndex}
          />
        </foreignObject>

        {/* Render interactive points */}
        {localPoints.map((point, index) => {
          const svgX = padding.left + ((point.x - xMin) / (xMax - xMin)) * plotWidth
          const svgY = padding.top + plotHeight - ((point.y - yMin) / (yMax - yMin)) * plotHeight
          const isActive = draggingIndex === index
          const isHovered = hoveredIndex === index

          return (
            <motion.g
              key={`interactive-point-${index}`}
              onMouseDown={(e) => handlePointPointerDown(e, index)}
              onTouchStart={(e) => handlePointPointerDown(e, index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onDoubleClick={(e) => handlePointDoubleClick(e, index)}
              style={{ cursor: enableDragging ? 'grab' : 'default' }}
            >
              {/* Point shadow/glow when active */}
              {(isActive || isHovered) && (
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={16}
                  fill={point.color || '#3b82f6'}
                  opacity={0.2}
                />
              )}

              {/* Point circle */}
              <motion.circle
                cx={svgX}
                cy={svgY}
                r={isActive ? 10 : isHovered ? 8 : 6}
                fill={point.color || '#3b82f6'}
                stroke="white"
                strokeWidth={2}
                animate={{
                  scale: isActive ? 1.3 : isHovered ? 1.1 : 1,
                }}
                transition={{ duration: 0.15 }}
              />

              {/* Coordinates tooltip when dragging */}
              {isActive && (
                <g>
                  <rect
                    x={svgX + 12}
                    y={svgY - 28}
                    width={70}
                    height={24}
                    rx={4}
                    fill="rgba(0,0,0,0.8)"
                  />
                  <text
                    x={svgX + 47}
                    y={svgY - 12}
                    textAnchor="middle"
                    fill="white"
                    fontSize={12}
                    fontFamily="monospace"
                  >
                    ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                  </text>
                </g>
              )}

              {/* Point label */}
              {point.label && !isActive && (
                <text
                  x={svgX}
                  y={svgY - 12}
                  textAnchor="middle"
                  fill={point.color || '#3b82f6'}
                  fontSize={12}
                  fontWeight={500}
                >
                  {point.label}
                </text>
              )}
            </motion.g>
          )
        })}

        {/* Snap grid preview when dragging */}
        {draggingIndex !== null && snapToGrid && (
          <g opacity={0.3}>
            {Array.from({ length: Math.floor((xMax - xMin) / calculatedSnapInterval) + 1 }).map((_, i) => {
              const x = xMin + i * calculatedSnapInterval
              const svgX = padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth
              return (
                <line
                  key={`snap-v-${i}`}
                  x1={svgX}
                  y1={padding.top}
                  x2={svgX}
                  y2={padding.top + plotHeight}
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="2,4"
                />
              )
            })}
            {Array.from({ length: Math.floor((yMax - yMin) / calculatedSnapInterval) + 1 }).map((_, i) => {
              const y = yMin + i * calculatedSnapInterval
              const svgY = padding.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight
              return (
                <line
                  key={`snap-h-${i}`}
                  x1={padding.left}
                  y1={svgY}
                  x2={padding.left + plotWidth}
                  y2={svgY}
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="2,4"
                />
              )
            })}
          </g>
        )}
      </svg>
    </div>
  )
}

export default InteractiveCoordinatePlane
