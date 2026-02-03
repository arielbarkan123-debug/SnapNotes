'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { CoordinatePlane } from './CoordinatePlane'
import type { CoordinatePlaneData } from '@/types'
import type { DesmosExpression, DesmosGraphingRef } from './DesmosGraphing'

// Lazy load Desmos component (reduces initial bundle)
const DesmosGraphing = dynamic(
  () => import('./DesmosGraphing').then((mod) => mod.DesmosGraphing),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading interactive graph...</span>
        </div>
      </div>
    ),
  }
)

// ============================================================================
// Types
// ============================================================================

type GraphMode = 'static' | 'interactive'

interface CurveData {
  expression: string
  color?: string
  label?: string
}

interface PointData {
  x: number
  y: number
  label?: string
  color?: string
}

interface LineData {
  points: Array<{ x: number; y: number }>
  color?: string
  dashed?: boolean
  label?: string
}

export interface InteractiveGraphProps {
  /** Graph mode: 'static' (SVG) or 'interactive' (Desmos) */
  mode?: GraphMode
  /** Curves/functions to display */
  curves?: CurveData[]
  /** Points to display */
  points?: PointData[]
  /** Lines to display */
  lines?: LineData[]
  /** Viewport bounds */
  bounds?: {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
  }
  /** Graph title */
  title?: string
  /** X-axis label */
  xLabel?: string
  /** Y-axis label */
  yLabel?: string
  /** Whether to show grid */
  showGrid?: boolean
  /** Whether to allow mode switching */
  allowModeSwitch?: boolean
  /** Whether to allow expression editing in interactive mode */
  allowEditing?: boolean
  /** Width */
  width?: number | string
  /** Height */
  height?: number
  /** Additional className */
  className?: string
  /** Callback when expressions change (interactive mode) */
  onExpressionsChange?: (expressions: DesmosExpression[]) => void
  /** Reference to Desmos controls */
  desmosRef?: React.RefObject<DesmosGraphingRef>
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert simple expression syntax to Desmos LaTeX format
 * e.g., "x^2" stays as "x^2", "2*x+3" becomes "2x+3"
 */
function toDesmosSyntax(expression: string): string {
  return expression
    .replace(/\*/g, '')  // Remove multiplication signs
    .replace(/Math\.(sin|cos|tan|sqrt|abs|log|exp|pow)\(([^)]+)\)/gi, (_, fn, arg) => {
      const fnMap: Record<string, string> = {
        sin: '\\sin',
        cos: '\\cos',
        tan: '\\tan',
        sqrt: '\\sqrt',
        abs: '\\left|$\\right|',
        log: '\\ln',
        exp: 'e^',
        pow: '^',
      }
      return `${fnMap[fn.toLowerCase()] || fn}(${arg})`
    })
}

/**
 * Convert curves to Desmos expressions
 */
function curvesToDesmosExpressions(curves: CurveData[]): DesmosExpression[] {
  return curves.map((curve, index) => ({
    id: `curve-${index}`,
    latex: `y = ${toDesmosSyntax(curve.expression)}`,
    color: curve.color || ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'][index % 4],
    label: curve.label,
  }))
}

/**
 * Convert points to Desmos point expressions
 */
function pointsToDesmosExpressions(points: PointData[]): DesmosExpression[] {
  return points.map((point, index) => ({
    id: `point-${index}`,
    latex: `(${point.x}, ${point.y})`,
    color: point.color || '#ef4444',
    label: point.label,
  }))
}

/**
 * Convert data to CoordinatePlane format
 */
function toCoordinatePlaneData(
  props: InteractiveGraphProps
): CoordinatePlaneData {
  const { curves = [], points = [], lines = [], bounds, title, xLabel, yLabel, showGrid = true } = props

  return {
    xMin: bounds?.xMin ?? -10,
    xMax: bounds?.xMax ?? 10,
    yMin: bounds?.yMin ?? -10,
    yMax: bounds?.yMax ?? 10,
    curves: curves.map((c) => ({
      expression: c.expression,
      color: c.color,
      label: c.label,
    })),
    points: points.map((p) => ({
      x: p.x,
      y: p.y,
      label: p.label,
      color: p.color,
    })),
    lines: lines.map((l) => ({
      type: 'segment' as const,
      points: l.points as [{ x: number; y: number }, { x: number; y: number }],
      color: l.color,
      dashed: l.dashed,
    })),
    title,
    xLabel: xLabel ?? 'x',
    yLabel: yLabel ?? 'y',
    showGrid,
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * InteractiveGraph - Unified graphing interface
 *
 * Provides a consistent API for both static (SVG-based CoordinatePlane) and
 * interactive (Desmos-powered) graphing experiences.
 *
 * Use cases:
 * - 'static' mode: Lessons, explanations, step-by-step reveals
 * - 'interactive' mode: Practice problems, exploration, student input
 *
 * @example
 * // Static mode (default)
 * <InteractiveGraph
 *   curves={[{ expression: 'x^2', label: 'y = x²' }]}
 *   points={[{ x: 2, y: 4, label: 'Point (2, 4)' }]}
 * />
 *
 * @example
 * // Interactive mode with editing
 * <InteractiveGraph
 *   mode="interactive"
 *   allowEditing={true}
 *   curves={[{ expression: 'x^2', label: 'Parabola' }]}
 * />
 *
 * @example
 * // With mode switching
 * <InteractiveGraph
 *   allowModeSwitch={true}
 *   curves={[{ expression: '2*x + 1' }]}
 * />
 */
export function InteractiveGraph({
  mode: initialMode = 'static',
  curves = [],
  points = [],
  lines = [],
  bounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
  title,
  xLabel,
  yLabel,
  showGrid = true,
  allowModeSwitch = false,
  allowEditing = false,
  width = '100%',
  height = 400,
  className = '',
  onExpressionsChange,
  desmosRef,
}: InteractiveGraphProps) {
  const [mode, setMode] = useState<GraphMode>(initialMode)

  // Memoize Desmos expressions
  const desmosExpressions = useMemo(() => {
    return [
      ...curvesToDesmosExpressions(curves),
      ...pointsToDesmosExpressions(points),
    ]
  }, [curves, points])

  // Memoize CoordinatePlane data
  const coordinatePlaneData = useMemo(() => {
    return toCoordinatePlaneData({
      curves,
      points,
      lines,
      bounds,
      title,
      xLabel,
      yLabel,
      showGrid,
    })
  }, [curves, points, lines, bounds, title, xLabel, yLabel, showGrid])

  // Toggle mode handler
  const handleModeToggle = useCallback(() => {
    setMode((prev) => (prev === 'static' ? 'interactive' : 'static'))
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* Mode toggle button */}
      {allowModeSwitch && (
        <div className="absolute right-2 top-2 z-10">
          <button
            onClick={handleModeToggle}
            className={`
              flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium
              shadow-sm transition-all
              ${mode === 'interactive'
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
            title={mode === 'interactive' ? 'Switch to static view' : 'Switch to interactive mode'}
          >
            {mode === 'interactive' ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Mode
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Interactive
              </>
            )}
          </button>
        </div>
      )}

      {/* Graph content */}
      <AnimatePresence mode="wait">
        {mode === 'interactive' ? (
          <motion.div
            key="interactive"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <DesmosGraphing
              ref={desmosRef}
              expressions={desmosExpressions}
              bounds={bounds}
              showExpressions={true}
              showZoomButtons={true}
              showKeypad={false}
              showGrid={showGrid}
              lockViewport={false}
              allowEditing={allowEditing}
              onExpressionsChange={onExpressionsChange}
              width={width}
              height={height}
              title={title || 'Interactive Graph'}
            />
          </motion.div>
        ) : (
          <motion.div
            key="static"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <CoordinatePlane
              data={coordinatePlaneData}
              width={typeof width === 'number' ? width : 400}
              height={height}
              animateCurves={true}
              className="rounded-xl border border-gray-200 dark:border-gray-700"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title overlay for static mode */}
      {mode === 'static' && title && !allowModeSwitch && (
        <div className="mt-2 text-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>
      )}
    </div>
  )
}

export default InteractiveGraph
