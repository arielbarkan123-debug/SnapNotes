'use client'

import { useRef, useEffect, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { COLORS, getSubjectColor } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'

// ============================================================================
// Types
// ============================================================================

/** Desmos calculator API types */
interface DesmosCalculator {
  setExpression: (opts: { id?: string; latex: string; color?: string; hidden?: boolean }) => void
  removeExpression: (opts: { id: string }) => void
  setMathBounds: (opts: { left: number; right: number; bottom: number; top: number }) => void
  getState: () => DesmosState
  setState: (state: DesmosState) => void
  observeEvent: (event: string, callback: () => void) => void
  unobserveEvent: (event: string, callback: () => void) => void
  destroy: () => void
}

interface DesmosState {
  expressions: {
    list: Array<{
      id: string
      latex?: string
      color?: string
    }>
  }
  graph?: {
    viewport?: {
      xmin: number
      xmax: number
      ymin: number
      ymax: number
    }
  }
}

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (
        element: HTMLElement,
        options?: DesmosCalculatorOptions
      ) => DesmosCalculator
    }
  }
}

interface DesmosCalculatorOptions {
  expressions?: boolean
  settingsMenu?: boolean
  zoomButtons?: boolean
  keypad?: boolean
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  xAxisNumbers?: boolean
  yAxisNumbers?: boolean
  lockViewport?: boolean
  border?: boolean
  expressionsCollapsed?: boolean
}

export interface DesmosExpression {
  id: string
  latex: string
  color?: string
  hidden?: boolean
  label?: string
}

export interface DesmosGraphingProps {
  /** Initial expressions to display */
  expressions?: DesmosExpression[]
  /** Whether to show the expression list panel */
  showExpressions?: boolean
  /** Whether to show settings menu */
  showSettings?: boolean
  /** Whether to show zoom buttons */
  showZoomButtons?: boolean
  /** Subject for color coding */
  subject?: SubjectKey
  /** Whether to show the interactive keypad */
  showKeypad?: boolean
  /** Whether to show grid lines */
  showGrid?: boolean
  /** Whether to lock the viewport (disable pan/zoom) */
  lockViewport?: boolean
  /** Whether to allow user to add/edit expressions */
  allowEditing?: boolean
  /** Initial viewport bounds */
  bounds?: {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
  }
  /** Callback when expressions change */
  onExpressionsChange?: (expressions: DesmosExpression[]) => void
  /** Callback when graph state changes */
  onStateChange?: (state: DesmosState) => void
  /** Custom width */
  width?: number | string
  /** Custom height */
  height?: number | string
  /** Additional className */
  className?: string
  /** Title for accessibility */
  title?: string
}

export interface DesmosGraphingRef {
  /** Add a new expression to the graph */
  addExpression: (expression: DesmosExpression) => void
  /** Remove an expression by id */
  removeExpression: (id: string) => void
  /** Update an existing expression */
  updateExpression: (id: string, updates: Partial<DesmosExpression>) => void
  /** Set viewport bounds */
  setBounds: (bounds: { xMin: number; xMax: number; yMin: number; yMax: number }) => void
  /** Get current graph state */
  getState: () => DesmosState | null
  /** Reset to initial state */
  reset: () => void
}

// ============================================================================
// Desmos Script Loader
// ============================================================================

const DESMOS_API_URL = 'https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'

let desmosLoadPromise: Promise<void> | null = null

function loadDesmosScript(): Promise<void> {
  if (desmosLoadPromise) return desmosLoadPromise

  desmosLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Desmos) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = DESMOS_API_URL
    script.async = true

    script.onload = () => {
      if (window.Desmos) {
        resolve()
      } else {
        reject(new Error('Desmos failed to initialize'))
      }
    }

    script.onerror = () => {
      desmosLoadPromise = null
      reject(new Error('Failed to load Desmos script'))
    }

    document.head.appendChild(script)
  })

  return desmosLoadPromise
}

// ============================================================================
// Component
// ============================================================================

/**
 * DesmosGraphing - Interactive graphing calculator powered by Desmos API
 *
 * Features:
 * - Real-time equation graphing
 * - User-editable expressions
 * - Parameter sliders
 * - Pan and zoom
 * - Professional calculator interface
 *
 * @example
 * // Basic usage
 * <DesmosGraphing
 *   expressions={[
 *     { id: '1', latex: 'y = x^2' },
 *     { id: '2', latex: 'y = 2x + 1', color: '#3b82f6' }
 *   ]}
 * />
 *
 * @example
 * // With ref for imperative control
 * const graphRef = useRef<DesmosGraphingRef>(null)
 * <DesmosGraphing ref={graphRef} />
 * // Later: graphRef.current?.addExpression({ id: '3', latex: 'y = sin(x)' })
 */
export const DesmosGraphing = forwardRef<DesmosGraphingRef, DesmosGraphingProps>(
  function DesmosGraphing(
    {
      expressions = [],
      showExpressions = true,
      showSettings = false,
      showZoomButtons = true,
      showKeypad = false,
      showGrid = true,
      lockViewport = false,
      allowEditing = true,
      bounds,
      onExpressionsChange,
      onStateChange,
      width = '100%',
      height = 400,
      className = '',
      title = 'Interactive Graph',
      subject = 'math',
    },
    ref
  ) {
    const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
    const containerRef = useRef<HTMLDivElement>(null)
    const calculatorRef = useRef<DesmosCalculator | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const initialExpressionsRef = useRef(expressions)

    // Initialize Desmos
    useEffect(() => {
      let mounted = true

      async function init() {
        if (!containerRef.current) return

        try {
          await loadDesmosScript()

          if (!mounted || !containerRef.current || !window.Desmos) return

          // Create calculator
          const calculator = window.Desmos.GraphingCalculator(containerRef.current, {
            expressions: showExpressions && allowEditing,
            settingsMenu: showSettings,
            zoomButtons: showZoomButtons,
            keypad: showKeypad,
            showGrid,
            showXAxis: true,
            showYAxis: true,
            xAxisNumbers: true,
            yAxisNumbers: true,
            lockViewport,
            border: false,
            expressionsCollapsed: !showExpressions,
          })

          calculatorRef.current = calculator

          // Set initial bounds if provided
          if (bounds) {
            calculator.setMathBounds({
              left: bounds.xMin,
              right: bounds.xMax,
              bottom: bounds.yMin,
              top: bounds.yMax,
            })
          }

          // Add initial expressions
          for (const expr of initialExpressionsRef.current) {
            calculator.setExpression({
              id: expr.id,
              latex: expr.latex,
              color: expr.color || subjectColors.primary,
              hidden: expr.hidden,
            })
          }

          // Set up change listener
          if (onStateChange || onExpressionsChange) {
            const handleChange = () => {
              if (!calculator) return
              const state = calculator.getState()
              onStateChange?.(state)

              if (onExpressionsChange) {
                const exprs = state.expressions.list.map((e) => ({
                  id: e.id,
                  latex: e.latex || '',
                  color: e.color,
                }))
                onExpressionsChange(exprs)
              }
            }

            calculator.observeEvent('change', handleChange)
          }

          setIsLoading(false)
        } catch (err) {
          console.error('Desmos initialization error:', err)
          setError(err instanceof Error ? err.message : 'Failed to load graphing calculator')
          setIsLoading(false)
        }
      }

      init()

      return () => {
        mounted = false
        if (calculatorRef.current) {
          calculatorRef.current.destroy()
          calculatorRef.current = null
        }
      }
    }, [showExpressions, showSettings, showZoomButtons, showKeypad, showGrid, lockViewport, bounds, allowEditing, onStateChange, onExpressionsChange])

    // Sync expressions when prop changes
    useEffect(() => {
      if (!calculatorRef.current || isLoading) return

      const calculator = calculatorRef.current

      // Update expressions
      for (const expr of expressions) {
        calculator.setExpression({
          id: expr.id,
          latex: expr.latex,
          color: expr.color || subjectColors.primary,
          hidden: expr.hidden,
        })
      }
    }, [expressions, isLoading])

    // Imperative API
    const addExpression = useCallback((expression: DesmosExpression) => {
      if (!calculatorRef.current) return
      calculatorRef.current.setExpression({
        id: expression.id,
        latex: expression.latex,
        color: expression.color || subjectColors.primary,
        hidden: expression.hidden,
      })
    }, [])

    const removeExpression = useCallback((id: string) => {
      if (!calculatorRef.current) return
      calculatorRef.current.removeExpression({ id })
    }, [])

    const updateExpression = useCallback((id: string, updates: Partial<DesmosExpression>) => {
      if (!calculatorRef.current) return
      const state = calculatorRef.current.getState()
      const existing = state.expressions.list.find((e) => e.id === id)
      if (existing) {
        calculatorRef.current.setExpression({
          id,
          latex: updates.latex ?? existing.latex ?? '',
          color: updates.color ?? existing.color ?? subjectColors.primary,
          hidden: updates.hidden,
        })
      }
    }, [])

    const setBounds = useCallback((newBounds: { xMin: number; xMax: number; yMin: number; yMax: number }) => {
      if (!calculatorRef.current) return
      calculatorRef.current.setMathBounds({
        left: newBounds.xMin,
        right: newBounds.xMax,
        bottom: newBounds.yMin,
        top: newBounds.yMax,
      })
    }, [])

    const getState = useCallback(() => {
      return calculatorRef.current?.getState() ?? null
    }, [])

    const reset = useCallback(() => {
      if (!calculatorRef.current) return

      // Clear all expressions
      const state = calculatorRef.current.getState()
      for (const expr of state.expressions.list) {
        calculatorRef.current.removeExpression({ id: expr.id })
      }

      // Re-add initial expressions
      for (const expr of initialExpressionsRef.current) {
        calculatorRef.current.setExpression({
          id: expr.id,
          latex: expr.latex,
          color: expr.color || subjectColors.primary,
          hidden: expr.hidden,
        })
      }

      // Reset bounds
      if (bounds) {
        calculatorRef.current.setMathBounds({
          left: bounds.xMin,
          right: bounds.xMax,
          bottom: bounds.yMin,
          top: bounds.yMax,
        })
      }
    }, [bounds])

    useImperativeHandle(ref, () => ({
      addExpression,
      removeExpression,
      updateExpression,
      setBounds,
      getState,
      reset,
    }), [addExpression, removeExpression, updateExpression, setBounds, getState, reset])

    // Render
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${className}`}
        style={{ width, height }}
        role="application"
        aria-label={title}
      >
        {/* Loading state */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading graphing calculator...</span>
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Desmos container */}
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{ opacity: isLoading || error ? 0 : 1 }}
        />
      </div>
    )
  }
)

export default DesmosGraphing
