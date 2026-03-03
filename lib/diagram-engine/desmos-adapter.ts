/**
 * Desmos Adapter
 *
 * Converts AI-generated diagram JSON (from the diagram schema system)
 * into DesmosRendererProps for client-side rendering.
 */

import type { DesmosExpression, DesmosRendererProps } from '@/components/diagrams/DesmosRenderer'

// ---------------------------------------------------------------------------
// Adapter functions
// ---------------------------------------------------------------------------

/**
 * Convert a coordinate_plane diagram to Desmos expressions.
 */
export function coordinatePlaneToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const expressions: DesmosExpression[] = []

  // Curves
  const curves = data.curves as Array<{ id?: string; expression?: string; color?: string }> | undefined
  if (Array.isArray(curves)) {
    for (const curve of curves) {
      if (curve.expression) {
        expressions.push({
          id: curve.id || `curve-${expressions.length}`,
          latex: `y=${curve.expression}`,
          color: curve.color || '#6366f1',
        })
      }
    }
  }

  // Points
  const points = data.points as Array<{ id?: string; x?: number; y?: number; label?: string; color?: string }> | undefined
  if (Array.isArray(points)) {
    for (const pt of points) {
      if (pt.x !== undefined && pt.y !== undefined) {
        expressions.push({
          id: pt.id || `pt-${expressions.length}`,
          latex: `(${pt.x},${pt.y})`,
          color: pt.color || '#ef4444',
          label: pt.label,
          showLabel: !!pt.label,
          pointStyle: 'POINT',
        })
      }
    }
  }

  // Lines
  const lines = data.lines as Array<{ id?: string; points?: Array<{ x: number; y: number }>; color?: string; dashed?: boolean }> | undefined
  if (Array.isArray(lines)) {
    for (const line of lines) {
      if (line.points && line.points.length >= 2) {
        const [p1, p2] = line.points
        // Vertical line
        if (p1.x === p2.x) {
          expressions.push({
            id: line.id || `line-${expressions.length}`,
            latex: `x=${p1.x}`,
            color: line.color || '#9ca3af',
            lineStyle: line.dashed ? 'DASHED' : 'SOLID',
          })
        } else {
          // Calculate slope and intercept
          const m = (p2.y - p1.y) / (p2.x - p1.x)
          const b = p1.y - m * p1.x
          expressions.push({
            id: line.id || `line-${expressions.length}`,
            latex: `y=${m}x+${b}`,
            color: line.color || '#9ca3af',
            lineStyle: line.dashed ? 'DASHED' : 'SOLID',
          })
        }
      }
    }
  }

  if (expressions.length === 0) return null

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -10,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -10,
    yMax: (data.yMax as number) ?? 10,
    showGrid: (data.showGrid as boolean) ?? true,
  }
}

/**
 * Convert a function_graph to Desmos.
 */
export function functionGraphToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const expression = data.expression as string | undefined
  if (!expression) return null

  const expressions: DesmosExpression[] = [
    {
      id: 'fn',
      latex: expression.includes('=') ? expression : `y=${expression}`,
      color: (data.color as string) || '#6366f1',
    },
  ]

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -10,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -10,
    yMax: (data.yMax as number) ?? 10,
  }
}

/**
 * Convert a linear_equation to Desmos.
 */
export function linearEquationToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const slope = data.slope as number | undefined
  const intercept = data.intercept as number | undefined
  const equation = data.equation as string | undefined

  let latex: string
  if (equation) {
    latex = equation.includes('=') ? equation : `y=${equation}`
  } else if (slope !== undefined && intercept !== undefined) {
    latex = `y=${slope}x+${intercept}`
  } else {
    return null
  }

  const expressions: DesmosExpression[] = [
    { id: 'line', latex, color: (data.color as string) || '#6366f1' },
  ]

  // Add intercept points if available
  if (intercept !== undefined) {
    expressions.push({
      id: 'y-int',
      latex: `(0,${intercept})`,
      color: '#ef4444',
      label: `(0, ${intercept})`,
      showLabel: true,
      pointStyle: 'POINT',
    })
  }

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -10,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -10,
    yMax: (data.yMax as number) ?? 10,
  }
}

/**
 * Convert a quadratic_graph to Desmos.
 */
export function quadraticGraphToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const a = data.a as number | undefined
  const b = data.b as number | undefined
  const c = data.c as number | undefined
  const equation = data.equation as string | undefined

  let latex: string
  if (equation) {
    latex = equation.includes('=') ? equation : `y=${equation}`
  } else if (a !== undefined) {
    const bVal = b ?? 0
    const cVal = c ?? 0
    latex = `y=${a}x^2+${bVal}x+${cVal}`
  } else {
    return null
  }

  const expressions: DesmosExpression[] = [
    { id: 'parabola', latex, color: (data.color as string) || '#6366f1' },
  ]

  // Vertex
  const vertex = data.vertex as { x: number; y: number } | undefined
  if (vertex) {
    expressions.push({
      id: 'vertex',
      latex: `(${vertex.x},${vertex.y})`,
      color: '#ef4444',
      label: `Vertex (${vertex.x}, ${vertex.y})`,
      showLabel: true,
      pointStyle: 'POINT',
    })
  }

  // Axis of symmetry
  if (vertex) {
    expressions.push({
      id: 'axis',
      latex: `x=${vertex.x}`,
      color: '#9ca3af',
      lineStyle: 'DASHED',
    })
  }

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -10,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -10,
    yMax: (data.yMax as number) ?? 10,
  }
}

/**
 * Convert a system_of_equations to Desmos.
 */
export function systemOfEquationsToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const equations = data.equations as string[] | undefined
  if (!Array.isArray(equations) || equations.length === 0) return null

  const colors = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b']
  const expressions: DesmosExpression[] = equations.map((eq, i) => ({
    id: `eq-${i}`,
    latex: eq.includes('=') ? eq : `y=${eq}`,
    color: colors[i % colors.length],
  }))

  // Solution point
  const solution = data.solution as { x: number; y: number } | undefined
  if (solution) {
    expressions.push({
      id: 'solution',
      latex: `(${solution.x},${solution.y})`,
      color: '#f59e0b',
      label: `Solution (${solution.x}, ${solution.y})`,
      showLabel: true,
      pointStyle: 'POINT',
    })
  }

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -10,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -10,
    yMax: (data.yMax as number) ?? 10,
  }
}

/**
 * Convert an inequality_graph to Desmos.
 */
export function inequalityToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const expression = data.expression as string | undefined
  const inequalities = data.inequalities as string[] | undefined

  const expressions: DesmosExpression[] = []

  if (expression) {
    expressions.push({
      id: 'ineq',
      latex: expression,
      color: (data.color as string) || '#6366f1',
    })
  }

  if (Array.isArray(inequalities)) {
    for (let i = 0; i < inequalities.length; i++) {
      expressions.push({
        id: `ineq-${i}`,
        latex: inequalities[i],
        color: ['#6366f1', '#ef4444', '#22c55e'][i % 3],
      })
    }
  }

  if (expressions.length === 0) return null

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -10,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -10,
    yMax: (data.yMax as number) ?? 10,
  }
}

/**
 * Convert a trigonometric_graph to Desmos.
 */
export function trigGraphToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const expression = data.expression as string | undefined
  const functions = data.functions as Array<{ expression: string; color?: string; label?: string }> | undefined

  const expressions: DesmosExpression[] = []

  if (expression) {
    expressions.push({
      id: 'trig',
      latex: expression.includes('=') ? expression : `y=${expression}`,
      color: (data.color as string) || '#6366f1',
    })
  }

  if (Array.isArray(functions)) {
    for (let i = 0; i < functions.length; i++) {
      const fn = functions[i]
      expressions.push({
        id: `trig-${i}`,
        latex: fn.expression.includes('=') ? fn.expression : `y=${fn.expression}`,
        color: fn.color || ['#6366f1', '#ef4444', '#22c55e'][i % 3],
        label: fn.label,
        showLabel: !!fn.label,
      })
    }
  }

  if (expressions.length === 0) return null

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -2 * Math.PI,
    xMax: (data.xMax as number) ?? 2 * Math.PI,
    yMin: (data.yMin as number) ?? -3,
    yMax: (data.yMax as number) ?? 3,
  }
}

/**
 * Convert a piecewise_function to Desmos.
 */
export function piecewiseToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const pieces = data.pieces as Array<{ expression: string; domain?: string; color?: string }> | undefined
  const expression = data.expression as string | undefined

  const expressions: DesmosExpression[] = []

  if (expression) {
    expressions.push({
      id: 'piecewise',
      latex: expression,
      color: (data.color as string) || '#6366f1',
    })
  }

  if (Array.isArray(pieces)) {
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]
      let latex = piece.expression
      if (piece.domain) {
        // Desmos piecewise: y = { condition : expression }
        latex = `y=\\left\\{${piece.domain}:${piece.expression}\\right\\}`
      } else if (!latex.includes('=')) {
        latex = `y=${latex}`
      }
      expressions.push({
        id: `piece-${i}`,
        latex,
        color: piece.color || ['#6366f1', '#ef4444', '#22c55e'][i % 3],
      })
    }
  }

  if (expressions.length === 0) return null

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -10,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -10,
    yMax: (data.yMax as number) ?? 10,
  }
}

/**
 * Convert a scatter_plot_regression to Desmos.
 */
export function scatterRegressionToDesmos(data: Record<string, unknown>): DesmosRendererProps | null {
  const points = data.points as Array<{ x: number; y: number }> | undefined
  if (!Array.isArray(points) || points.length === 0) return null

  const expressions: DesmosExpression[] = []

  // Add data points
  for (let i = 0; i < points.length; i++) {
    expressions.push({
      id: `pt-${i}`,
      latex: `(${points[i].x},${points[i].y})`,
      color: '#6366f1',
      pointStyle: 'POINT',
    })
  }

  // Regression line if provided
  const regression = data.regression as string | undefined
  if (regression) {
    expressions.push({
      id: 'regression',
      latex: regression.includes('=') ? regression : `y=${regression}`,
      color: '#ef4444',
      lineStyle: 'DASHED',
    })
  }

  return {
    expressions,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? undefined,
    xMax: (data.xMax as number) ?? undefined,
    yMin: (data.yMin as number) ?? undefined,
    yMax: (data.yMax as number) ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Adapt an AI-generated diagram to DesmosRendererProps.
 * Returns null if the diagram type is not supported or data is invalid.
 */
export function adaptToDesmosProps(
  diagramType: string,
  data: Record<string, unknown>,
): DesmosRendererProps | null {
  switch (diagramType) {
    case 'coordinate_plane':
      return coordinatePlaneToDesmos(data)
    case 'function_graph':
      return functionGraphToDesmos(data)
    case 'linear_equation':
      return linearEquationToDesmos(data)
    case 'quadratic_graph':
      return quadraticGraphToDesmos(data)
    case 'system_of_equations':
      return systemOfEquationsToDesmos(data)
    case 'inequality_graph':
      return inequalityToDesmos(data)
    case 'trigonometric_graph':
      return trigGraphToDesmos(data)
    case 'piecewise_function':
      return piecewiseToDesmos(data)
    case 'scatter_plot_regression':
      return scatterRegressionToDesmos(data)
    case 'parametric_curve':
      // Pass through expression directly
      return functionGraphToDesmos(data)
    case 'polar_graph':
      // Pass through expression directly
      return functionGraphToDesmos(data)
    default:
      return null
  }
}
