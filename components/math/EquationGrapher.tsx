'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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

interface EquationGrapherProps {
  /** Initial equations */
  initialEquations?: Array<{ expression: string; color?: string }>
  /** ViewBox width — SVG scales responsively to container */
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
  /** Subject for theming */
  subject?: SubjectKey
  /** Visual complexity level */
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
  '#14b8a6', // teal
  '#f97316', // orange
]

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  grid: { en: 'Draw the grid', he: 'ציור הרשת' },
  axes: { en: 'Draw the axes', he: 'ציור הצירים' },
  equations: { en: 'Plot the equations', he: 'שרטוט הפונקציות' },
  list: { en: 'Show equation list', he: 'הצגת רשימת הפונקציות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * EquationGrapher — Phase 2 Visual Learning rebuild.
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
export function EquationGrapher({
  initialEquations = [],
  width = 500,
  height = 400,
  xRange = [-10, 10],
  yRange = [-10, 10],
  showGrid = true,
  language = 'en',
  onEquationsChange,
  subject = 'math',
  complexity = 'middle_school',
  initialStep,
  className = '',
}: EquationGrapherProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Step definitions — always 4 steps
  const stepDefs = useMemo(() => [
    { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    { id: 'equations', label: STEP_LABELS.equations.en, labelHe: STEP_LABELS.equations.he },
    { id: 'list', label: STEP_LABELS.list.en, labelHe: STEP_LABELS.list.he },
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

  // Initialize equations state
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

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return { vertical: [], horizontal: [] }
    const xInterval = (xRange[1] - xRange[0]) <= 10 ? 1 : (xRange[1] - xRange[0]) <= 20 ? 2 : 5
    const yInterval = (yRange[1] - yRange[0]) <= 10 ? 1 : (yRange[1] - yRange[0]) <= 20 ? 2 : 5

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
  }, [xRange, yRange, xToSvg, yToSvg])

  // Validate equation
  const validateEquation = useCallback((expression: string): string | null => {
    if (!expression.trim()) {
      return language === 'he' ? 'הכנס ביטוי' : 'Enter an expression'
    }
    try {
      const compiled = parse(expression).compile()
      compiled.evaluate({ x: 0 })
      return null
    } catch (e) {
      return language === 'he' ? 'ביטוי לא תקין' : `Invalid expression: ${(e as Error).message}`
    }
  }, [language])

  // Add new equation
  const handleAddEquation = useCallback(() => {
    const error = validateEquation(newEquation)
    if (error) { setInputError(error); return }
    const newEq: Equation = {
      id: `eq-${Date.now()}`,
      expression: newEquation,
      color: equations.length === 0 ? diagram.colors.primary : EQUATION_COLORS[equations.length % EQUATION_COLORS.length],
      visible: true,
    }
    setEquations(prev => [...prev, newEq])
    setNewEquation('')
    setInputError(null)
    inputRef.current?.focus()
  }, [newEquation, validateEquation, equations.length, diagram.colors.primary])

  // Remove equation
  const handleRemoveEquation = useCallback((id: string) => {
    setEquations(prev => prev.filter(eq => eq.id !== id))
  }, [])

  // Toggle visibility
  const handleToggleVisibility = useCallback((id: string) => {
    setEquations(prev => prev.map(eq => eq.id === id ? { ...eq, visible: !eq.visible } : eq))
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
    if (e.key === 'Enter') handleAddEquation()
  }, [handleAddEquation])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Labels
  const labels = {
    addEquation: language === 'he' ? 'הוסף פונקציה' : 'Add function',
    placeholder: language === 'he' ? 'הכנס פונקציה, למשל: x^2' : 'Enter function, e.g., x^2',
    equations: language === 'he' ? 'פונקציות' : 'Functions',
    noEquations: language === 'he' ? 'אין פונקציות' : 'No functions yet',
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="equation-grapher"
      className={className}
      style={{ width: '100%', maxWidth: width }}
      dir={diagram.isRTL ? 'rtl' : 'ltr'}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={
          language === 'he'
            ? `גרף עם ${equations.filter(e => e.visible).length} פונקציות`
            : `Graph with ${equations.filter(e => e.visible).length} functions`
        }
      >
        {/* Background */}
        <rect
          data-testid="eg-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* ── Step 0: Grid ────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('grid') && showGrid && (
            <motion.g
              data-testid="eg-grid"
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
              <g fontSize={12} className="fill-current">
                {gridLines.vertical.filter(x => x !== 0).map((x) => (
                  <motion.text
                    key={`lx-${x}`}
                    x={xToSvg(x)}
                    y={padding.top + plotHeight + 20}
                    textAnchor="middle"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {x}
                  </motion.text>
                ))}
                {gridLines.horizontal.filter(y => y !== 0).map((y) => (
                  <motion.text
                    key={`ly-${y}`}
                    x={padding.left - 10}
                    y={yToSvg(y) + 4}
                    textAnchor="end"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {y}
                  </motion.text>
                ))}
                {/* Origin */}
                <motion.text
                  x={padding.left - 10}
                  y={yToSvg(0) + 4}
                  textAnchor="end"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  0
                </motion.text>
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Axes ────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="eg-axes"
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

        {/* ── Step 2: Equations (plotted curves) ──────────── */}
        <AnimatePresence>
          {isVisible('equations') && (
            <motion.g
              data-testid="eg-equations"
              initial="hidden"
              animate={isCurrent('equations') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <defs>
                <clipPath id="eg-clip-area">
                  <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
                </clipPath>
              </defs>
              <g clipPath="url(#eg-clip-area)">
                {equations.map(eq => {
                  if (!eq.visible || eq.error) return null
                  const path = generatePath(eq.expression)
                  if (!path) return null
                  return (
                    <motion.path
                      key={eq.id}
                      data-testid={`eg-eq-${eq.id}`}
                      d={path}
                      fill="none"
                      stroke={eq.color}
                      strokeWidth={diagram.lineWeight}
                      strokeLinecap="round"
                      strokeLinejoin="round"
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

      {/* ── Step 3: Equation list (input + list panel) ─── */}
      <AnimatePresence>
        {isVisible('list') && (
          <motion.div
            data-testid="eg-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3"
          >
            {/* Equation input */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
                  y =
                </span>
                <input
                  ref={inputRef}
                  data-testid="eg-equation-input"
                  type="text"
                  value={newEquation}
                  onChange={(e) => { setNewEquation(e.target.value); setInputError(null) }}
                  onKeyDown={handleKeyDown}
                  placeholder={labels.placeholder}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border font-mono bg-white dark:bg-gray-800 ${inputError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                />
              </div>
              <button
                data-testid="eg-add-btn"
                onClick={handleAddEquation}
                className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-colors"
                style={{ backgroundColor: diagram.colors.primary }}
              >
                {labels.addEquation}
              </button>
            </div>
            {inputError && <p className="text-sm text-red-500 mb-2">{inputError}</p>}

            {/* Equation list */}
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.equations}
            </h4>
            <div className="space-y-2">
              {equations.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  {labels.noEquations}
                </p>
              ) : (
                equations.map((eq) => (
                  <div
                    key={eq.id}
                    data-testid={`eg-list-item-${eq.id}`}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${eq.error ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}
                  >
                    {/* Color indicator */}
                    <button
                      onClick={() => handleToggleVisibility(eq.id)}
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-opacity ${eq.visible ? 'opacity-100' : 'opacity-30'}`}
                      style={{ backgroundColor: eq.color, borderColor: eq.color }}
                    />

                    {/* Expression input */}
                    <input
                      type="text"
                      value={eq.expression}
                      onChange={(e) => handleUpdateExpression(eq.id, e.target.value)}
                      className={`flex-1 px-2 py-1 text-sm font-mono bg-transparent border-none focus:outline-none focus:ring-0 ${eq.error ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}
                    />

                    {/* Error indicator */}
                    {eq.error && <span className="text-xs text-red-500">!</span>}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveEquation(eq.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EquationGrapher
