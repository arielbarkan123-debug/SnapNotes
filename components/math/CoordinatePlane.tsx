'use client'

import type { CoordinatePlaneData, CoordinatePlaneErrorHighlight } from '@/types'

interface CoordinatePlaneDataWithErrors extends CoordinatePlaneData {
  errorHighlight?: CoordinatePlaneErrorHighlight
}

interface CoordinatePlaneProps {
  data: CoordinatePlaneDataWithErrors
  className?: string
  width?: number
  height?: number
}

/**
 * CoordinatePlane - SVG component for displaying 2D coordinate graphs
 * Used for functions, intersections, and shaded regions
 */
export function CoordinatePlane({
  data,
  className = '',
  width = 400,
  height = 400,
}: CoordinatePlaneProps) {
  const {
    xMin,
    xMax,
    yMin,
    yMax,
    points = [],
    lines = [],
    curves = [],
    title,
    xLabel = 'x',
    yLabel = 'y',
    showGrid = true,
    errorHighlight,
  } = data

  // Padding and dimensions
  const padding = { left: 50, right: 30, top: 40, bottom: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Convert coordinates to SVG coordinates
  const xToSvg = (x: number): number => {
    const ratio = (x - xMin) / (xMax - xMin)
    return padding.left + ratio * plotWidth
  }

  const yToSvg = (y: number): number => {
    const ratio = (y - yMin) / (yMax - yMin)
    return padding.top + plotHeight - ratio * plotHeight // Flip Y axis
  }

  // Find origin position (if visible)
  const originX = xToSvg(0)
  const originY = yToSvg(0)
  const showXAxis = yMin <= 0 && yMax >= 0
  const showYAxis = xMin <= 0 && xMax >= 0

  // Generate grid lines
  const xRange = xMax - xMin
  const yRange = yMax - yMin
  const xTickInterval = xRange <= 10 ? 1 : xRange <= 20 ? 2 : xRange <= 50 ? 5 : 10
  const yTickInterval = yRange <= 10 ? 1 : yRange <= 20 ? 2 : yRange <= 50 ? 5 : 10

  const xTicks: number[] = []
  const yTicks: number[] = []

  for (let x = Math.ceil(xMin / xTickInterval) * xTickInterval; x <= xMax; x += xTickInterval) {
    xTicks.push(x)
  }
  for (let y = Math.ceil(yMin / yTickInterval) * yTickInterval; y <= yMax; y += yTickInterval) {
    yTicks.push(y)
  }

  // Generate curve points using simple evaluation
  const generateCurvePoints = (expression: string, domain?: { min: number; max: number }): string => {
    const domainMin = domain?.min ?? xMin
    const domainMax = domain?.max ?? xMax
    const step = (domainMax - domainMin) / 100
    const pathPoints: string[] = []
    let isFirst = true

    for (let x = domainMin; x <= domainMax; x += step) {
      try {
        // Simple expression evaluation for common patterns
        let y: number
        const expr = expression.toLowerCase().replace(/\s/g, '')

        if (expr.includes('x^2') || expr.includes('x²')) {
          // Quadratic: parse ax² + bx + c
          const match = expr.match(/(-?\d*\.?\d*)x\^?2([+-]\d*\.?\d*x)?([+-]\d*\.?\d*)?/)
          if (match) {
            const a = match[1] === '' || match[1] === '-' ? (match[1] === '-' ? -1 : 1) : parseFloat(match[1])
            const bPart = match[2]?.replace('x', '') || '0'
            const b = bPart === '' || bPart === '+' ? 1 : bPart === '-' ? -1 : parseFloat(bPart)
            const c = parseFloat(match[3] || '0')
            y = a * x * x + b * x + c
          } else {
            y = x * x
          }
        } else if (expr.includes('sin')) {
          y = Math.sin(x)
        } else if (expr.includes('cos')) {
          y = Math.cos(x)
        } else if (expr.includes('x')) {
          // Linear: y = mx + b
          const match = expr.match(/(-?\d*\.?\d*)x([+-]\d*\.?\d*)?/)
          if (match) {
            const m = match[1] === '' || match[1] === '-' ? (match[1] === '-' ? -1 : 1) : parseFloat(match[1])
            const b = parseFloat(match[2] || '0')
            y = m * x + b
          } else {
            y = x
          }
        } else {
          y = parseFloat(expression)
        }

        if (!isNaN(y) && y >= yMin - 5 && y <= yMax + 5) {
          const svgX = xToSvg(x)
          const svgY = yToSvg(y)
          pathPoints.push(`${isFirst ? 'M' : 'L'} ${svgX} ${svgY}`)
          isFirst = false
        } else {
          isFirst = true
        }
      } catch {
        isFirst = true
      }
    }

    return pathPoints.join(' ')
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`text-gray-800 dark:text-gray-200 ${className}`}
    >
      {/* Title */}
      {title && (
        <text
          x={width / 2}
          y={20}
          textAnchor="middle"
          className="fill-current text-sm font-medium"
        >
          {title}
        </text>
      )}

      {/* Grid lines */}
      {showGrid && (
        <g className="opacity-20">
          {/* Vertical grid lines */}
          {xTicks.map((x) => (
            <line
              key={`grid-v-${x}`}
              x1={xToSvg(x)}
              y1={padding.top}
              x2={xToSvg(x)}
              y2={height - padding.bottom}
              stroke="currentColor"
              strokeWidth={x === 0 ? 0 : 1}
            />
          ))}
          {/* Horizontal grid lines */}
          {yTicks.map((y) => (
            <line
              key={`grid-h-${y}`}
              x1={padding.left}
              y1={yToSvg(y)}
              x2={width - padding.right}
              y2={yToSvg(y)}
              stroke="currentColor"
              strokeWidth={y === 0 ? 0 : 1}
            />
          ))}
        </g>
      )}

      {/* X Axis */}
      <line
        x1={padding.left}
        y1={showXAxis ? originY : height - padding.bottom}
        x2={width - padding.right}
        y2={showXAxis ? originY : height - padding.bottom}
        stroke="currentColor"
        strokeWidth={2}
      />
      {/* X axis arrow */}
      <polygon
        points={`${width - padding.right + 8},${showXAxis ? originY : height - padding.bottom} ${width - padding.right},${(showXAxis ? originY : height - padding.bottom) - 4} ${width - padding.right},${(showXAxis ? originY : height - padding.bottom) + 4}`}
        fill="currentColor"
      />
      {/* X label */}
      <text
        x={width - padding.right + 15}
        y={(showXAxis ? originY : height - padding.bottom) + 4}
        className="fill-current text-sm"
      >
        {xLabel}
      </text>

      {/* Y Axis */}
      <line
        x1={showYAxis ? originX : padding.left}
        y1={padding.top}
        x2={showYAxis ? originX : padding.left}
        y2={height - padding.bottom}
        stroke="currentColor"
        strokeWidth={2}
      />
      {/* Y axis arrow */}
      <polygon
        points={`${showYAxis ? originX : padding.left},${padding.top - 8} ${(showYAxis ? originX : padding.left) - 4},${padding.top} ${(showYAxis ? originX : padding.left) + 4},${padding.top}`}
        fill="currentColor"
      />
      {/* Y label */}
      <text
        x={(showYAxis ? originX : padding.left) - 4}
        y={padding.top - 15}
        textAnchor="middle"
        className="fill-current text-sm"
      >
        {yLabel}
      </text>

      {/* X axis ticks and labels */}
      {xTicks.map((x) => {
        if (x === 0 && showYAxis) return null
        const svgX = xToSvg(x)
        const tickY = showXAxis ? originY : height - padding.bottom
        return (
          <g key={`x-tick-${x}`}>
            <line
              x1={svgX}
              y1={tickY - 4}
              x2={svgX}
              y2={tickY + 4}
              stroke="currentColor"
              strokeWidth={1}
            />
            <text
              x={svgX}
              y={tickY + 18}
              textAnchor="middle"
              className="fill-current text-xs"
            >
              {x}
            </text>
          </g>
        )
      })}

      {/* Y axis ticks and labels */}
      {yTicks.map((y) => {
        if (y === 0 && showXAxis) return null
        const svgY = yToSvg(y)
        const tickX = showYAxis ? originX : padding.left
        return (
          <g key={`y-tick-${y}`}>
            <line
              x1={tickX - 4}
              y1={svgY}
              x2={tickX + 4}
              y2={svgY}
              stroke="currentColor"
              strokeWidth={1}
            />
            <text
              x={tickX - 10}
              y={svgY + 4}
              textAnchor="end"
              className="fill-current text-xs"
            >
              {y}
            </text>
          </g>
        )
      })}

      {/* Origin label if visible */}
      {showXAxis && showYAxis && (
        <text
          x={originX - 8}
          y={originY + 15}
          textAnchor="end"
          className="fill-current text-xs"
        >
          0
        </text>
      )}

      {/* Curves */}
      {curves.map((curve, index) => (
        <path
          key={`curve-${index}`}
          d={generateCurvePoints(curve.expression, curve.domain)}
          fill="none"
          stroke={curve.color || '#3B82F6'}
          strokeWidth={2}
        />
      ))}

      {/* Lines */}
      {lines.map((line, index) => {
        const [p1, p2] = line.points
        let x1 = xToSvg(p1.x)
        let y1 = yToSvg(p1.y)
        let x2 = xToSvg(p2.x)
        let y2 = yToSvg(p2.y)

        // Extend line to edges if it's a full line
        if (line.type === 'line' && x1 !== x2) {
          const slope = (y2 - y1) / (x2 - x1)
          x1 = padding.left
          y1 = slope * (x1 - xToSvg(p1.x)) + yToSvg(p1.y)
          x2 = width - padding.right
          y2 = slope * (x2 - xToSvg(p1.x)) + yToSvg(p1.y)
        }

        return (
          <line
            key={`line-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={line.color || '#EF4444'}
            strokeWidth={2}
            strokeDasharray={line.dashed ? '5,5' : undefined}
          />
        )
      })}

      {/* Points */}
      {points.map((point, index) => {
        const svgX = xToSvg(point.x)
        const svgY = yToSvg(point.y)

        return (
          <g key={`point-${index}`}>
            <circle
              cx={svgX}
              cy={svgY}
              r={5}
              fill={point.color || '#EF4444'}
            />
            {point.label && (
              <text
                x={svgX + 8}
                y={svgY - 8}
                className="fill-current text-xs font-medium"
                style={{ fill: point.color || '#EF4444' }}
              >
                {point.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Error highlighting - Wrong points (shown with X) */}
      {errorHighlight?.wrongPoints?.map((point, index) => {
        const svgX = xToSvg(point.x)
        const svgY = yToSvg(point.y)
        return (
          <g key={`wrong-point-${index}`}>
            {/* Red circle background */}
            <circle
              cx={svgX}
              cy={svgY}
              r={10}
              fill="#EF4444"
              opacity={0.2}
            />
            {/* Red X mark */}
            <line
              x1={svgX - 6}
              y1={svgY - 6}
              x2={svgX + 6}
              y2={svgY + 6}
              stroke="#EF4444"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={svgX + 6}
              y1={svgY - 6}
              x2={svgX - 6}
              y2={svgY + 6}
              stroke="#EF4444"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Error label */}
            {point.errorLabel && (
              <text
                x={svgX}
                y={svgY - 16}
                textAnchor="middle"
                className="fill-red-600 text-xs font-medium"
              >
                {point.errorLabel}
              </text>
            )}
          </g>
        )
      })}

      {/* Error highlighting - Correct points (shown with checkmark) */}
      {errorHighlight?.correctPoints?.map((point, index) => {
        const svgX = xToSvg(point.x)
        const svgY = yToSvg(point.y)
        return (
          <g key={`correct-point-${index}`}>
            {/* Green circle */}
            <circle
              cx={svgX}
              cy={svgY}
              r={10}
              fill="#22C55E"
              opacity={0.2}
            />
            <circle
              cx={svgX}
              cy={svgY}
              r={6}
              fill="#22C55E"
            />
            {/* Checkmark */}
            <path
              d={`M ${svgX - 3} ${svgY} L ${svgX - 1} ${svgY + 3} L ${svgX + 4} ${svgY - 3}`}
              stroke="white"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Correct label */}
            {point.correctLabel && (
              <text
                x={svgX}
                y={svgY - 16}
                textAnchor="middle"
                className="fill-green-600 text-xs font-medium"
              >
                {point.correctLabel}
              </text>
            )}
          </g>
        )
      })}

      {/* Error highlighting - Wrong curves (dashed red) */}
      {errorHighlight?.wrongCurves?.map((curve, index) => (
        <path
          key={`wrong-curve-${index}`}
          d={generateCurvePoints(curve.expression, curve.domain)}
          fill="none"
          stroke="#EF4444"
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.7}
        />
      ))}

      {/* Error highlighting - Correct curves (solid green) */}
      {errorHighlight?.correctCurves?.map((curve, index) => (
        <path
          key={`correct-curve-${index}`}
          d={generateCurvePoints(curve.expression, curve.domain)}
          fill="none"
          stroke="#22C55E"
          strokeWidth={3}
        />
      ))}
    </svg>
  )
}

export default CoordinatePlane
