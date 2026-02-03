'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parse, evaluate } from 'mathjs'

interface Equation {
  id: string
  expression: string
  color: string
  visible: boolean
  error?: string
}

interface EquationGrapherProps {
  /** Initial equations */
  initialEquations?: Array<{ expression: string; color?: string }>
  /** Width of the graph */
  width?: number
  /** Height of the graph */
  height?: number
  /** X-axis range */
  xRange?: [number, number]
  /** Y-axis range */
  yRange?: [number, number]
  /** Show grid */
  showGrid?: boolean
  /** Language */
  language?: 'en' | 'he'
  /** Callback when equations change */
  onEquationsChange?: (equations: Equation[]) => void
}

// Predefined colors for equations
const EQUATION_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

/**
 * EquationGrapher - Interactive function graphing component
 *
 * Features:
 * - Real-time equation input and graphing
 * - Multiple equations with different colors
 * - mathjs-powered expression parsing
 * - Error handling for invalid expressions
 * - Add/remove equations
 */
export function EquationGrapher({
  initialEquations = [],
  width = 500,
  height = 400,
  xRange = [-10, 10],
  yRange = [-10, 10],
  showGrid = true,
  language = 'en',
  onEquationsChange,
}: EquationGrapherProps) {
  const isRTL = language === 'he'
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize equations state
  const [equations, setEquations] = useState<Equation[]>(() =>
    initialEquations.map((eq, i) => ({
      id: `eq-${Date.now()}-${i}`,
      expression: eq.expression,
      color: eq.color || EQUATION_COLORS[i % EQUATION_COLORS.length],
      visible: true,
    }))
  )

  // Input state for new equation
  const [newEquation, setNewEquation] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

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

  // Generate points for an equation
  const generatePath = useCallback((expression: string): string | null => {
    try {
      const compiled = parse(expression).compile()
      const points: string[] = []
      const step = (xRange[1] - xRange[0]) / 200

      let isFirstPoint = true
      let wasOutOfRange = false

      for (let x = xRange[0]; x <= xRange[1]; x += step) {
        try {
          const y = evaluate(compiled.evaluate({ x }))

          if (typeof y !== 'number' || !isFinite(y)) {
            wasOutOfRange = true
            continue
          }

          // Clamp y to a reasonable range to avoid rendering issues
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
  }, [xRange, yRange, xToSvg, yToSvg])

  // Validate equation
  const validateEquation = useCallback((expression: string): string | null => {
    if (!expression.trim()) {
      return language === 'he' ? 'הכנס ביטוי' : 'Enter an expression'
    }

    try {
      const compiled = parse(expression).compile()
      // Test evaluation
      compiled.evaluate({ x: 0 })
      return null
    } catch (e) {
      return language === 'he'
        ? 'ביטוי לא תקין'
        : `Invalid expression: ${(e as Error).message}`
    }
  }, [language])

  // Add new equation
  const handleAddEquation = useCallback(() => {
    const error = validateEquation(newEquation)
    if (error) {
      setInputError(error)
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
    inputRef.current?.focus()
  }, [newEquation, validateEquation, equations.length])

  // Remove equation
  const handleRemoveEquation = useCallback((id: string) => {
    setEquations(prev => prev.filter(eq => eq.id !== id))
  }, [])

  // Toggle equation visibility
  const handleToggleVisibility = useCallback((id: string) => {
    setEquations(prev => prev.map(eq =>
      eq.id === id ? { ...eq, visible: !eq.visible } : eq
    ))
  }, [])

  // Update equation expression
  const handleUpdateExpression = useCallback((id: string, expression: string) => {
    setEquations(prev => prev.map(eq => {
      if (eq.id !== id) return eq
      const error = validateEquation(expression)
      return { ...eq, expression, error: error ?? undefined }
    }))
  }, [validateEquation])

  // Notify parent of changes
  useEffect(() => {
    onEquationsChange?.(equations)
  }, [equations, onEquationsChange])

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddEquation()
    }
  }, [handleAddEquation])

  // Grid generation
  const gridLines = useMemo(() => {
    if (!showGrid) return { vertical: [], horizontal: [] }

    const vertical: number[] = []
    const horizontal: number[] = []

    // Calculate appropriate tick intervals
    const xInterval = (xRange[1] - xRange[0]) <= 10 ? 1 : (xRange[1] - xRange[0]) <= 20 ? 2 : 5
    const yInterval = (yRange[1] - yRange[0]) <= 10 ? 1 : (yRange[1] - yRange[0]) <= 20 ? 2 : 5

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
    addEquation: language === 'he' ? 'הוסף פונקציה' : 'Add function',
    placeholder: language === 'he' ? 'הכנס פונקציה, למשל: x^2' : 'Enter function, e.g., x^2',
    equations: language === 'he' ? 'פונקציות' : 'Functions',
    noEquations: language === 'he' ? 'אין פונקציות' : 'No functions yet',
  }

  return (
    <div className="equation-grapher" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Equation input */}
      <div className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
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
              onKeyDown={handleKeyDown}
              placeholder={labels.placeholder}
              className={`
                w-full pl-10 pr-4 py-2 rounded-lg border font-mono
                bg-white dark:bg-gray-800
                ${inputError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }
                focus:outline-none focus:ring-2
              `}
            />
          </div>
          <motion.button
            onClick={handleAddEquation}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {labels.addEquation}
          </motion.button>
        </div>
        <AnimatePresence>
          {inputError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-1 text-sm text-red-500"
            >
              {inputError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Graph */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={language === 'he'
            ? `גרף עם ${equations.filter(e => e.visible).length} פונקציות`
            : `Graph with ${equations.filter(e => e.visible).length} functions`
          }
        >
          {/* Background */}
          <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="#fafafa" className="dark:fill-gray-800" />

          {/* Grid lines */}
          {showGrid && (
            <g className="grid-lines" opacity={0.3}>
              {gridLines.vertical.map(x => (
                <line
                  key={`v-${x}`}
                  x1={xToSvg(x)}
                  y1={padding.top}
                  x2={xToSvg(x)}
                  y2={padding.top + plotHeight}
                  stroke="currentColor"
                  strokeWidth={x === 0 ? 1.5 : 0.5}
                />
              ))}
              {gridLines.horizontal.map(y => (
                <line
                  key={`h-${y}`}
                  x1={padding.left}
                  y1={yToSvg(y)}
                  x2={padding.left + plotWidth}
                  y2={yToSvg(y)}
                  stroke="currentColor"
                  strokeWidth={y === 0 ? 1.5 : 0.5}
                />
              ))}
            </g>
          )}

          {/* Axes */}
          <g className="axes">
            {/* X-axis */}
            <line
              x1={padding.left}
              y1={yToSvg(0)}
              x2={padding.left + plotWidth}
              y2={yToSvg(0)}
              stroke="currentColor"
              strokeWidth={1.5}
            />
            {/* Y-axis */}
            <line
              x1={xToSvg(0)}
              y1={padding.top}
              x2={xToSvg(0)}
              y2={padding.top + plotHeight}
              stroke="currentColor"
              strokeWidth={1.5}
            />
          </g>

          {/* Axis labels */}
          <g className="axis-labels" fontSize={12} fill="currentColor">
            {gridLines.vertical.filter(x => x !== 0).map(x => (
              <text
                key={`label-x-${x}`}
                x={xToSvg(x)}
                y={padding.top + plotHeight + 20}
                textAnchor="middle"
              >
                {x}
              </text>
            ))}
            {gridLines.horizontal.filter(y => y !== 0).map(y => (
              <text
                key={`label-y-${y}`}
                x={padding.left - 10}
                y={yToSvg(y) + 4}
                textAnchor="end"
              >
                {y}
              </text>
            ))}
            {/* Origin */}
            <text x={padding.left - 10} y={yToSvg(0) + 4} textAnchor="end">0</text>
          </g>

          {/* Equations */}
          <g className="equations">
            {equations.map(eq => {
              if (!eq.visible || eq.error) return null
              const path = generatePath(eq.expression)
              if (!path) return null

              return (
                <motion.path
                  key={eq.id}
                  d={path}
                  fill="none"
                  stroke={eq.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )
            })}
          </g>

          {/* Clip path */}
          <defs>
            <clipPath id="plot-area">
              <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* Equation list */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {labels.equations}
        </h4>
        <div className="space-y-2">
          <AnimatePresence>
            {equations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                {labels.noEquations}
              </p>
            ) : (
              equations.map((eq) => (
                <motion.div
                  key={eq.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg border
                    ${eq.error
                      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }
                  `}
                >
                  {/* Color indicator */}
                  <button
                    onClick={() => handleToggleVisibility(eq.id)}
                    className={`
                      w-4 h-4 rounded-full border-2 flex-shrink-0
                      transition-opacity ${eq.visible ? 'opacity-100' : 'opacity-30'}
                    `}
                    style={{ backgroundColor: eq.color, borderColor: eq.color }}
                  />

                  {/* Expression */}
                  <input
                    type="text"
                    value={eq.expression}
                    onChange={(e) => handleUpdateExpression(eq.id, e.target.value)}
                    className={`
                      flex-1 px-2 py-1 text-sm font-mono bg-transparent
                      border-none focus:outline-none focus:ring-0
                      ${eq.error ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}
                    `}
                  />

                  {/* Error indicator */}
                  {eq.error && (
                    <span className="text-xs text-red-500">!</span>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveEquation(eq.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default EquationGrapher
