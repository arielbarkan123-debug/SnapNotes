'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parse, evaluate } from 'mathjs'

interface Equation {
  id: string
  expression: string
  color: string
  visible: boolean
  error?: string
}

interface Point {
  x: number
  y: number
  equationId?: string
}

interface InteractiveGrapherProps {
  /** Initial equations */
  initialEquations?: Array<{ expression: string; color?: string }>
  /** Width of the graph */
  width?: number
  /** Height of the graph */
  height?: number
  /** Initial X-axis range */
  initialXRange?: [number, number]
  /** Initial Y-axis range */
  initialYRange?: [number, number]
  /** Enable trace mode (show coordinates on hover) */
  enableTrace?: boolean
  /** Enable pan (drag to move) */
  enablePan?: boolean
  /** Enable zoom (scroll to zoom) */
  enableZoom?: boolean
  /** Show grid */
  showGrid?: boolean
  /** Language */
  language?: 'en' | 'he'
}

// Predefined colors for equations
const EQUATION_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
]

/**
 * InteractiveGrapher - Full-featured interactive graphing calculator
 *
 * Features:
 * - Real-time equation input and graphing
 * - Trace mode (show coordinates on hover)
 * - Pan (drag to move the view)
 * - Zoom (scroll to zoom in/out)
 * - Touch support for mobile
 */
export function InteractiveGrapher({
  initialEquations = [],
  width = 600,
  height = 500,
  initialXRange = [-10, 10],
  initialYRange = [-10, 10],
  enableTrace = true,
  enablePan = true,
  enableZoom = true,
  showGrid = true,
  language = 'en',
}: InteractiveGrapherProps) {
  const isRTL = language === 'he'
  const svgRef = useRef<SVGSVGElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // View state (for pan/zoom)
  const [xRange, setXRange] = useState<[number, number]>(initialXRange)
  const [yRange, setYRange] = useState<[number, number]>(initialYRange)

  // Equations state
  const [equations, setEquations] = useState<Equation[]>(() =>
    initialEquations.map((eq, i) => ({
      id: `eq-${Date.now()}-${i}`,
      expression: eq.expression,
      color: eq.color || EQUATION_COLORS[i % EQUATION_COLORS.length],
      visible: true,
    }))
  )

  // Input state
  const [newEquation, setNewEquation] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  // Interaction state
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const [tracePoint, setTracePoint] = useState<Point | null>(null)
  const [tracedEquation, setTracedEquation] = useState<Equation | null>(null)

  // Touch state for pinch-to-zoom
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null)
  const [pinchCenter, setPinchCenter] = useState<Point | null>(null)

  // Padding and dimensions
  const padding = { left: 50, right: 30, top: 30, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Coordinate conversion functions
  const xToSvg = useCallback((x: number) => {
    return padding.left + ((x - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth
  }, [xRange, plotWidth])

  const yToSvg = useCallback((y: number) => {
    return padding.top + plotHeight - ((y - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight
  }, [yRange, plotHeight])

  const svgToX = useCallback((svgX: number) => {
    return ((svgX - padding.left) / plotWidth) * (xRange[1] - xRange[0]) + xRange[0]
  }, [xRange, plotWidth])

  const svgToY = useCallback((svgY: number) => {
    return yRange[1] - ((svgY - padding.top) / plotHeight) * (yRange[1] - yRange[0])
  }, [yRange, plotHeight])

  // Compile equation for evaluation
  const compileEquation = useCallback((expression: string) => {
    try {
      return parse(expression).compile()
    } catch {
      return null
    }
  }, [])

  // Evaluate equation at x
  const evaluateAt = useCallback((expression: string, x: number): number | null => {
    const compiled = compileEquation(expression)
    if (!compiled) return null
    try {
      const result = evaluate(compiled.evaluate({ x }))
      if (typeof result === 'number' && isFinite(result)) {
        return result
      }
      return null
    } catch {
      return null
    }
  }, [compileEquation])

  // Generate path for equation
  const generatePath = useCallback((expression: string): string | null => {
    try {
      const compiled = parse(expression).compile()
      const points: string[] = []
      // Use fewer points during panning for better performance
      const numPoints = isPanning ? 150 : 300
      const step = (xRange[1] - xRange[0]) / numPoints

      let isFirstPoint = true
      let wasOutOfRange = false

      for (let x = xRange[0]; x <= xRange[1]; x += step) {
        try {
          const y = evaluate(compiled.evaluate({ x }))

          if (typeof y !== 'number' || !isFinite(y)) {
            wasOutOfRange = true
            continue
          }

          const clampedY = Math.max(yRange[0] - 10, Math.min(yRange[1] + 10, y))
          const svgX = xToSvg(x)
          const svgY = yToSvg(clampedY)

          if (isFirstPoint || wasOutOfRange) {
            points.push(`M ${svgX} ${svgY}`)
            isFirstPoint = false
            wasOutOfRange = false
          } else {
            points.push(`L ${svgX} ${svgY}`)
          }
        } catch {
          wasOutOfRange = true
        }
      }

      return points.length > 0 ? points.join(' ') : null
    } catch {
      return null
    }
  }, [xRange, yRange, xToSvg, yToSvg, isPanning])

  // Memoize equation paths for performance
  const equationPaths = useMemo(() => {
    const paths: Map<string, string | null> = new Map()
    for (const eq of equations) {
      if (eq.visible && !eq.error) {
        paths.set(eq.id, generatePath(eq.expression))
      }
    }
    return paths
  }, [equations, generatePath])

  // Handle mouse move for trace
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top

    // Handle panning
    if (isPanning && panStart && enablePan) {
      const dx = svgToX(svgX) - svgToX(panStart.x)
      const dy = svgToY(svgY) - svgToY(panStart.y)

      setXRange(prev => [prev[0] - dx, prev[1] - dx])
      setYRange(prev => [prev[0] + dy, prev[1] + dy])
      setPanStart({ x: svgX, y: svgY })
      return
    }

    // Handle trace
    if (!enableTrace) return

    const x = svgToX(svgX)

    // Find closest point on any visible equation
    let closestEq: Equation | null = null
    let closestY: number | null = null
    let minDist = Infinity

    for (const eq of equations) {
      if (!eq.visible || eq.error) continue
      const y = evaluateAt(eq.expression, x)
      if (y === null) continue

      const dist = Math.abs(yToSvg(y) - svgY)
      if (dist < minDist && dist < 30) {
        minDist = dist
        closestY = y
        closestEq = eq
      }
    }

    if (closestEq && closestY !== null) {
      setTracePoint({ x, y: closestY })
      setTracedEquation(closestEq)
    } else {
      setTracePoint(null)
      setTracedEquation(null)
    }
  }, [isPanning, panStart, enablePan, enableTrace, equations, svgToX, svgToY, evaluateAt, yToSvg])

  // Handle mouse down for pan
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!enablePan) return
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsPanning(true)
  }, [enablePan])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
  }, [])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setTracePoint(null)
    setTracedEquation(null)
    setIsPanning(false)
    setPanStart(null)
  }, [])

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    if (!enableZoom) return
    e.preventDefault()

    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top

    const x = svgToX(svgX)
    const y = svgToY(svgY)

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9

    setXRange(prev => {
      const newWidth = (prev[1] - prev[0]) * zoomFactor
      const ratio = (x - prev[0]) / (prev[1] - prev[0])
      const newMin = x - ratio * newWidth
      return [newMin, newMin + newWidth]
    })

    setYRange(prev => {
      const newHeight = (prev[1] - prev[0]) * zoomFactor
      const ratio = (y - prev[0]) / (prev[1] - prev[0])
      const newMin = y - ratio * newHeight
      return [newMin, newMin + newHeight]
    })
  }, [enableZoom, svgToX, svgToY])

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: React.TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Get center point between two touches
  const getTouchCenter = useCallback((touches: React.TouchList): Point | null => {
    if (!svgRef.current || touches.length < 2) return null
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
      y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top,
    }
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1 && enablePan) {
      // Single touch - start pan
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      setPanStart({ x: touch.clientX - rect.left, y: touch.clientY - rect.top })
      setIsPanning(true)
    } else if (e.touches.length === 2 && enableZoom) {
      // Two touches - start pinch zoom
      e.preventDefault()
      setLastPinchDistance(getTouchDistance(e.touches))
      setPinchCenter(getTouchCenter(e.touches))
      setIsPanning(false)
    }
  }, [enablePan, enableZoom, getTouchDistance, getTouchCenter])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1 && isPanning && panStart && enablePan) {
      // Single touch - pan
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      const svgX = touch.clientX - rect.left
      const svgY = touch.clientY - rect.top

      const dx = svgToX(svgX) - svgToX(panStart.x)
      const dy = svgToY(svgY) - svgToY(panStart.y)

      setXRange(prev => [prev[0] - dx, prev[1] - dx])
      setYRange(prev => [prev[0] + dy, prev[1] + dy])
      setPanStart({ x: svgX, y: svgY })
    } else if (e.touches.length === 2 && enableZoom && lastPinchDistance !== null) {
      // Two touches - pinch zoom
      e.preventDefault()
      const newDistance = getTouchDistance(e.touches)
      const center = getTouchCenter(e.touches) || pinchCenter

      if (center && newDistance > 0) {
        const zoomFactor = lastPinchDistance / newDistance
        const x = svgToX(center.x)
        const y = svgToY(center.y)

        setXRange(prev => {
          const newWidth = (prev[1] - prev[0]) * zoomFactor
          const ratio = (x - prev[0]) / (prev[1] - prev[0])
          const newMin = x - ratio * newWidth
          return [newMin, newMin + newWidth]
        })

        setYRange(prev => {
          const newHeight = (prev[1] - prev[0]) * zoomFactor
          const ratio = (y - prev[0]) / (prev[1] - prev[0])
          const newMin = y - ratio * newHeight
          return [newMin, newMin + newHeight]
        })

        setLastPinchDistance(newDistance)
        setPinchCenter(center)
      }
    }
  }, [isPanning, panStart, enablePan, enableZoom, lastPinchDistance, pinchCenter, svgToX, svgToY, getTouchDistance, getTouchCenter])

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
    setLastPinchDistance(null)
    setPinchCenter(null)
    setTracePoint(null)
    setTracedEquation(null)
  }, [])

  // Reset view
  const handleResetView = useCallback(() => {
    setXRange(initialXRange)
    setYRange(initialYRange)
  }, [initialXRange, initialYRange])

  // Add equation
  const handleAddEquation = useCallback(() => {
    if (!newEquation.trim()) {
      setInputError(language === 'he' ? 'הכנס ביטוי' : 'Enter an expression')
      return
    }

    try {
      const compiled = parse(newEquation).compile()
      compiled.evaluate({ x: 0 })
    } catch (e) {
      setInputError(language === 'he' ? 'ביטוי לא תקין' : `Invalid: ${(e as Error).message}`)
      return
    }

    const newEq: Equation = {
      id: `eq-${Date.now()}`,
      expression: newEquation,
      color: EQUATION_COLORS[equations.length % EQUATION_COLORS.length],
      visible: true,
    }

    setEquations(prev => [...prev, newEq])
    setNewEquation('')
    setInputError(null)
  }, [newEquation, equations.length, language])

  // Remove equation
  const handleRemoveEquation = useCallback((id: string) => {
    setEquations(prev => prev.filter(eq => eq.id !== id))
  }, [])

  // Toggle visibility
  const handleToggleVisibility = useCallback((id: string) => {
    setEquations(prev => prev.map(eq =>
      eq.id === id ? { ...eq, visible: !eq.visible } : eq
    ))
  }, [])

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return { vertical: [], horizontal: [] }

    const getInterval = (range: number) => {
      if (range <= 5) return 1
      if (range <= 10) return 2
      if (range <= 20) return 5
      if (range <= 50) return 10
      return 20
    }

    const xInterval = getInterval(xRange[1] - xRange[0])
    const yInterval = getInterval(yRange[1] - yRange[0])

    const vertical: number[] = []
    const horizontal: number[] = []

    for (let x = Math.ceil(xRange[0] / xInterval) * xInterval; x <= xRange[1]; x += xInterval) {
      vertical.push(x)
    }

    for (let y = Math.ceil(yRange[0] / yInterval) * yInterval; y <= yRange[1]; y += yInterval) {
      horizontal.push(y)
    }

    return { vertical, horizontal }
  }, [xRange, yRange, showGrid])

  // Labels
  const labels = {
    addFunction: language === 'he' ? 'הוסף' : 'Add',
    placeholder: language === 'he' ? 'פונקציה, למשל: sin(x)' : 'Function, e.g., sin(x)',
    resetView: language === 'he' ? 'איפוס תצוגה' : 'Reset View',
    zoomTip: language === 'he' ? 'גלגל לזום' : 'Scroll to zoom',
    panTip: language === 'he' ? 'גרור להזזה' : 'Drag to pan',
    pinchTip: language === 'he' ? 'צביטה לזום' : 'Pinch to zoom',
  }

  return (
    <div className="interactive-grapher" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Equation input */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">
            y =
          </span>
          <input
            ref={inputRef}
            type="text"
            value={newEquation}
            onChange={(e) => {
              setNewEquation(e.target.value)
              setInputError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddEquation()}
            placeholder={labels.placeholder}
            className={`
              w-full pl-10 pr-3 py-2 text-sm rounded-lg border font-mono
              bg-white dark:bg-gray-800
              ${inputError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
          />
        </div>
        <button
          onClick={handleAddEquation}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg font-medium hover:bg-blue-600"
        >
          {labels.addFunction}
        </button>
        <button
          onClick={handleResetView}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          title={labels.resetView}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {inputError && (
        <p className="text-xs text-red-500 mb-2">{inputError}</p>
      )}

      {/* Graph */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`${isPanning ? 'cursor-grabbing' : enablePan ? 'cursor-grab' : 'cursor-crosshair'} touch-none`}
          role="img"
          aria-label={language === 'he'
            ? `גרף אינטראקטיבי עם ${equations.filter(e => e.visible).length} פונקציות. טווח X: ${xRange[0].toFixed(1)} עד ${xRange[1].toFixed(1)}, טווח Y: ${yRange[0].toFixed(1)} עד ${yRange[1].toFixed(1)}`
            : `Interactive graph with ${equations.filter(e => e.visible).length} functions. X range: ${xRange[0].toFixed(1)} to ${xRange[1].toFixed(1)}, Y range: ${yRange[0].toFixed(1)} to ${yRange[1].toFixed(1)}`
          }
          tabIndex={0}
        >
          {/* Background */}
          <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="#fafafa" className="dark:fill-gray-800" />

          {/* Grid */}
          {showGrid && (
            <g opacity={0.3}>
              {gridLines.vertical.map(x => (
                <line key={`v-${x}`} x1={xToSvg(x)} y1={padding.top} x2={xToSvg(x)} y2={padding.top + plotHeight} stroke="currentColor" strokeWidth={x === 0 ? 1.5 : 0.5} />
              ))}
              {gridLines.horizontal.map(y => (
                <line key={`h-${y}`} x1={padding.left} y1={yToSvg(y)} x2={padding.left + plotWidth} y2={yToSvg(y)} stroke="currentColor" strokeWidth={y === 0 ? 1.5 : 0.5} />
              ))}
            </g>
          )}

          {/* Axes */}
          <line x1={padding.left} y1={yToSvg(0)} x2={padding.left + plotWidth} y2={yToSvg(0)} stroke="currentColor" strokeWidth={1.5} />
          <line x1={xToSvg(0)} y1={padding.top} x2={xToSvg(0)} y2={padding.top + plotHeight} stroke="currentColor" strokeWidth={1.5} />

          {/* Axis labels */}
          <g fontSize={11} fill="currentColor">
            {gridLines.vertical.map(x => (
              <text key={`lx-${x}`} x={xToSvg(x)} y={padding.top + plotHeight + 18} textAnchor="middle">{x.toFixed(x % 1 === 0 ? 0 : 1)}</text>
            ))}
            {gridLines.horizontal.map(y => (
              <text key={`ly-${y}`} x={padding.left - 8} y={yToSvg(y) + 4} textAnchor="end">{y.toFixed(y % 1 === 0 ? 0 : 1)}</text>
            ))}
          </g>

          {/* Equations - using memoized paths for performance */}
          <g clipPath="url(#clip-area)">
            {equations.map(eq => {
              if (!eq.visible || eq.error) return null
              const path = equationPaths.get(eq.id)
              if (!path) return null
              return (
                <path key={eq.id} d={path} fill="none" stroke={eq.color} strokeWidth={2.5} strokeLinecap="round" />
              )
            })}
          </g>

          {/* Trace point */}
          <AnimatePresence>
            {tracePoint && tracedEquation && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Crosshair lines */}
                <line x1={xToSvg(tracePoint.x)} y1={padding.top} x2={xToSvg(tracePoint.x)} y2={padding.top + plotHeight} stroke={tracedEquation.color} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
                <line x1={padding.left} y1={yToSvg(tracePoint.y)} x2={padding.left + plotWidth} y2={yToSvg(tracePoint.y)} stroke={tracedEquation.color} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />

                {/* Point */}
                <circle cx={xToSvg(tracePoint.x)} cy={yToSvg(tracePoint.y)} r={6} fill={tracedEquation.color} stroke="white" strokeWidth={2} />

                {/* Tooltip */}
                <g transform={`translate(${xToSvg(tracePoint.x) + 10}, ${yToSvg(tracePoint.y) - 10})`}>
                  <rect x={0} y={-20} width={100} height={26} rx={4} fill="rgba(0,0,0,0.8)" />
                  <text x={50} y={-3} textAnchor="middle" fill="white" fontSize={11} fontFamily="monospace">
                    ({tracePoint.x.toFixed(2)}, {tracePoint.y.toFixed(2)})
                  </text>
                </g>
              </motion.g>
            )}
          </AnimatePresence>

          {/* Clip path */}
          <defs>
            <clipPath id="clip-area">
              <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>
        </svg>

        {/* Controls hint */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500 space-x-3">
          {enableZoom && <span>{labels.zoomTip}</span>}
          {enablePan && <span>{labels.panTip}</span>}
        </div>
      </div>

      {/* Equation list */}
      <div className="mt-3 flex flex-wrap gap-2">
        {equations.map(eq => (
          <div
            key={eq.id}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
              ${eq.visible ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-50'}
            `}
          >
            <button
              onClick={() => handleToggleVisibility(eq.id)}
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: eq.color }}
            />
            <span className="font-mono text-gray-700 dark:text-gray-300">
              y = {eq.expression}
            </span>
            <button
              onClick={() => handleRemoveEquation(eq.id)}
              className="text-gray-400 hover:text-red-500 ml-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default InteractiveGrapher
