'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parse, evaluate } from 'mathjs'
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
}

interface InteractiveGrapherProps {
  /** Initial equations */
  initialEquations?: Array<{ expression: string; color?: string }>
  /** ViewBox width — SVG scales responsively to container */
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
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
  className?: string
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

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  grid: { en: 'Draw the grid', he: 'ציור הרשת' },
  axes: { en: 'Draw the axes', he: 'ציור הצירים' },
  equations: { en: 'Plot the equations', he: 'שרטוט הפונקציות' },
  controls: { en: 'Enable controls', he: 'הפעלת בקרות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * InteractiveGrapher — Phase 2 Visual Learning rebuild.
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
  subject = 'math',
  complexity = 'middle_school',
  initialStep,
  className = '',
}: InteractiveGrapherProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // View state (for pan/zoom)
  const [xRange, setXRange] = useState<[number, number]>(initialXRange)
  const [yRange, setYRange] = useState<[number, number]>(initialYRange)

  // Step definitions — always 4 steps
  const stepDefs = useMemo(() => [
    { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'equations', label: STEP_LABELS.equations.en, labelHe: STEP_LABELS.equations.he },
    { id: 'controls', label: STEP_LABELS.controls.en, labelHe: STEP_LABELS.controls.he },
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

  // Equations state
  const [equations, setEquations] = useState<Equation[]>(() =>
    initialEquations.map((eq, i) => ({
      id: `eq-${i}`,
      expression: eq.expression,
      color: eq.color || (i === 0 ? diagram.colors.primary : EQUATION_COLORS[i % EQUATION_COLORS.length]),
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

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  const padding = { left: 50, right: 30, top: 30, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

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

  // ---------------------------------------------------------------------------
  // Equation evaluation
  // ---------------------------------------------------------------------------

  const evaluateAt = useCallback((expression: string, x: number): number | null => {
    try {
      const compiled = parse(expression).compile()
      const result = evaluate(compiled.evaluate({ x }))
      if (typeof result === 'number' && isFinite(result)) return result
      return null
    } catch {
      return null
    }
  }, [])

  const generatePath = useCallback((expression: string): string | null => {
    try {
      const compiled = parse(expression).compile()
      const points: string[] = []
      const numPoints = isPanning ? 150 : 300
      const step = (xRange[1] - xRange[0]) / numPoints
      let isFirstPoint = true
      let wasOutOfRange = false

      for (let x = xRange[0]; x <= xRange[1]; x += step) {
        try {
          const y = evaluate(compiled.evaluate({ x }))
          if (typeof y !== 'number' || !isFinite(y)) { wasOutOfRange = true; continue }
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
        } catch { wasOutOfRange = true }
      }
      return points.length > 0 ? points.join(' ') : null
    } catch { return null }
  }, [xRange, yRange, xToSvg, yToSvg, isPanning])

  const equationPaths = useMemo(() => {
    const paths: Map<string, string | null> = new Map()
    for (const eq of equations) {
      if (eq.visible && !eq.error) {
        paths.set(eq.id, generatePath(eq.expression))
      }
    }
    return paths
  }, [equations, generatePath])

  // ---------------------------------------------------------------------------
  // Interaction handlers
  // ---------------------------------------------------------------------------

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top

    if (isPanning && panStart && enablePan) {
      const dx = svgToX(svgX) - svgToX(panStart.x)
      const dy = svgToY(svgY) - svgToY(panStart.y)
      setXRange(prev => [prev[0] - dx, prev[1] - dx])
      setYRange(prev => [prev[0] + dy, prev[1] + dy])
      setPanStart({ x: svgX, y: svgY })
      return
    }

    if (!enableTrace || !isVisible('controls')) return
    const x = svgToX(svgX)
    let closestEq: Equation | null = null
    let closestY: number | null = null
    let minDist = Infinity
    for (const eq of equations) {
      if (!eq.visible || eq.error) continue
      const y = evaluateAt(eq.expression, x)
      if (y === null) continue
      const dist = Math.abs(yToSvg(y) - svgY)
      if (dist < minDist && dist < 30) { minDist = dist; closestY = y; closestEq = eq }
    }
    if (closestEq && closestY !== null) {
      setTracePoint({ x, y: closestY })
      setTracedEquation(closestEq)
    } else {
      setTracePoint(null)
      setTracedEquation(null)
    }
  }, [isPanning, panStart, enablePan, enableTrace, equations, svgToX, svgToY, evaluateAt, yToSvg, diagram.currentStep])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!enablePan || !isVisible('controls') || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsPanning(true)
  }, [enablePan, diagram.currentStep])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTracePoint(null)
    setTracedEquation(null)
    setIsPanning(false)
    setPanStart(null)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    if (!enableZoom || !isVisible('controls') || !svgRef.current) return
    e.preventDefault()
    const rect = svgRef.current.getBoundingClientRect()
    const x = svgToX(e.clientX - rect.left)
    const y = svgToY(e.clientY - rect.top)
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
  }, [enableZoom, svgToX, svgToY, diagram.currentStep])

  const handleResetView = useCallback(() => {
    setXRange(initialXRange)
    setYRange(initialYRange)
  }, [initialXRange, initialYRange])

  // Equation management
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
      color: equations.length === 0 ? diagram.colors.primary : EQUATION_COLORS[equations.length % EQUATION_COLORS.length],
      visible: true,
    }
    setEquations(prev => [...prev, newEq])
    setNewEquation('')
    setInputError(null)
  }, [newEquation, equations.length, language, diagram.colors.primary])

  const handleRemoveEquation = useCallback((id: string) => {
    setEquations(prev => prev.filter(eq => eq.id !== id))
  }, [])

  const handleToggleVisibility = useCallback((id: string) => {
    setEquations(prev => prev.map(eq => eq.id === id ? { ...eq, visible: !eq.visible } : eq))
  }, [])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Labels
  const labels = {
    addFunction: language === 'he' ? 'הוסף' : 'Add',
    placeholder: language === 'he' ? 'פונקציה, למשל: sin(x)' : 'Function, e.g., sin(x)',
    resetView: language === 'he' ? 'איפוס תצוגה' : 'Reset View',
    zoomTip: language === 'he' ? 'גלגל לזום' : 'Scroll to zoom',
    panTip: language === 'he' ? 'גרור להזזה' : 'Drag to pan',
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="interactive-grapher"
      className={className}
      style={{ width: '100%', maxWidth: width }}
      dir={diagram.isRTL ? 'rtl' : 'ltr'}
    >
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`text-gray-800 dark:text-gray-200 ${isPanning ? 'cursor-grabbing' : enablePan ? 'cursor-grab' : 'cursor-crosshair'} touch-none`}
        role="img"
        aria-label={
          language === 'he'
            ? `גרף אינטראקטיבי עם ${equations.filter(e => e.visible).length} פונקציות`
            : `Interactive graph with ${equations.filter(e => e.visible).length} functions`
        }
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        tabIndex={0}
      >
        {/* Background */}
        <rect
          data-testid="ig-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* ── Step 0: Grid ────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('grid') && showGrid && (
            <motion.g
              data-testid="ig-grid"
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
                  strokeWidth={x === 0 ? 1.5 : 0.5}
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
                  strokeWidth={y === 0 ? 1.5 : 0.5}
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
                    {x.toFixed(x % 1 === 0 ? 0 : 1)}
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
                    {y.toFixed(y % 1 === 0 ? 0 : 1)}
                  </motion.text>
                ))}
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Axes ────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="ig-axes"
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
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 2: Equations ───────────────────────────── */}
        <AnimatePresence>
          {isVisible('equations') && (
            <motion.g
              data-testid="ig-equations"
              initial="hidden"
              animate={isCurrent('equations') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <defs>
                <clipPath id="ig-clip-area">
                  <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
                </clipPath>
              </defs>
              <g clipPath="url(#ig-clip-area)">
                {equations.map(eq => {
                  if (!eq.visible || eq.error) return null
                  const path = equationPaths.get(eq.id)
                  if (!path) return null
                  return (
                    <motion.path
                      key={eq.id}
                      data-testid={`ig-eq-${eq.id}`}
                      d={path}
                      fill="none"
                      stroke={eq.color}
                      strokeWidth={diagram.lineWeight}
                      strokeLinecap="round"
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  )
                })}
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3: Controls (trace, hints) ─────────────── */}
        <AnimatePresence>
          {isVisible('controls') && (
            <motion.g
              data-testid="ig-controls"
              initial="hidden"
              animate={isCurrent('controls') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Trace point */}
              {tracePoint && tracedEquation && (
                <g>
                  <line x1={xToSvg(tracePoint.x)} y1={padding.top} x2={xToSvg(tracePoint.x)} y2={padding.top + plotHeight} stroke={tracedEquation.color} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
                  <line x1={padding.left} y1={yToSvg(tracePoint.y)} x2={padding.left + plotWidth} y2={yToSvg(tracePoint.y)} stroke={tracedEquation.color} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
                  <circle cx={xToSvg(tracePoint.x)} cy={yToSvg(tracePoint.y)} r={6} fill={tracedEquation.color} stroke="white" strokeWidth={2} />
                  <g transform={`translate(${xToSvg(tracePoint.x) + 10}, ${yToSvg(tracePoint.y) - 10})`}>
                    <rect x={0} y={-20} width={100} height={26} rx={4} fill="rgba(0,0,0,0.8)" />
                    <text x={50} y={-3} textAnchor="middle" fill="white" fontSize={11} fontFamily="monospace">
                      ({tracePoint.x.toFixed(2)}, {tracePoint.y.toFixed(2)})
                    </text>
                  </g>
                </g>
              )}

              {/* Control hints */}
              <motion.text
                x={width - 10}
                y={height - 10}
                textAnchor="end"
                fontSize={10}
                className="fill-gray-400 dark:fill-gray-500"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {enableZoom ? labels.zoomTip : ''}{enableZoom && enablePan ? ' | ' : ''}{enablePan ? labels.panTip : ''}
              </motion.text>
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

      {/* Equation input — only shown at controls step */}
      {isVisible('controls') && (
        <div className="mt-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">
                y =
              </span>
              <input
                ref={inputRef}
                data-testid="ig-equation-input"
                type="text"
                value={newEquation}
                onChange={(e) => { setNewEquation(e.target.value); setInputError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEquation()}
                placeholder={labels.placeholder}
                className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg border font-mono bg-white dark:bg-gray-800 ${inputError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <button
              data-testid="ig-add-btn"
              onClick={handleAddEquation}
              className="px-4 py-2 text-white text-sm rounded-lg font-medium hover:opacity-90"
              style={{ backgroundColor: diagram.colors.primary }}
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
          {inputError && <p className="text-xs text-red-500 mt-1">{inputError}</p>}

          {/* Equation list */}
          <div className="mt-2 flex flex-wrap gap-2">
            {equations.map(eq => (
              <div
                key={eq.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${eq.visible ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-50'}`}
              >
                <button onClick={() => handleToggleVisibility(eq.id)} className="w-3 h-3 rounded-full" style={{ backgroundColor: eq.color }} />
                <span className="font-mono text-gray-700 dark:text-gray-300">y = {eq.expression}</span>
                <button onClick={() => handleRemoveEquation(eq.id)} className="text-gray-400 hover:text-red-500 ml-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default InteractiveGrapher
