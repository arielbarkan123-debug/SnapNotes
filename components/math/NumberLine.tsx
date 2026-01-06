'use client'

import type { NumberLineData, NumberLineErrorHighlight } from '@/types'

interface NumberLineDataWithErrors extends NumberLineData {
  errorHighlight?: NumberLineErrorHighlight
}

interface NumberLineProps {
  data: NumberLineDataWithErrors
  className?: string
  width?: number
  height?: number
}

/**
 * NumberLine - SVG component for displaying number lines
 * Used for inequalities, solution sets, and intervals
 */
export function NumberLine({
  data,
  className = '',
  width = 400,
  height = 80,
}: NumberLineProps) {
  const { min, max, points = [], intervals = [], title, errorHighlight } = data

  // Padding and dimensions
  const padding = { left: 40, right: 40, top: 30, bottom: 20 }
  const lineY = height - padding.bottom - 15
  const lineStartX = padding.left
  const lineEndX = width - padding.right
  const lineLength = lineEndX - lineStartX

  // Convert value to x coordinate
  const valueToX = (value: number): number => {
    const ratio = (value - min) / (max - min)
    return lineStartX + ratio * lineLength
  }

  // Generate tick marks
  const range = max - min
  const tickInterval = range <= 10 ? 1 : range <= 20 ? 2 : range <= 50 ? 5 : 10
  const ticks: number[] = []
  for (let v = Math.ceil(min / tickInterval) * tickInterval; v <= max; v += tickInterval) {
    ticks.push(v)
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
          y={15}
          textAnchor="middle"
          className="fill-current text-sm font-medium"
        >
          {title}
        </text>
      )}

      {/* Intervals (shaded regions) */}
      {intervals.map((interval, index) => {
        const startX = interval.start !== null ? valueToX(interval.start) : lineStartX
        const endX = interval.end !== null ? valueToX(interval.end) : lineEndX

        return (
          <g key={`interval-${index}`}>
            {/* Shaded region */}
            <rect
              x={startX}
              y={lineY - 8}
              width={endX - startX}
              height={16}
              fill={interval.color || '#3B82F6'}
              opacity={0.3}
            />
            {/* Interval line */}
            <line
              x1={startX}
              y1={lineY}
              x2={endX}
              y2={lineY}
              stroke={interval.color || '#3B82F6'}
              strokeWidth={4}
            />
            {/* Start arrow if extending to negative infinity */}
            {interval.start === null && (
              <polygon
                points={`${lineStartX},${lineY} ${lineStartX + 10},${lineY - 5} ${lineStartX + 10},${lineY + 5}`}
                fill={interval.color || '#3B82F6'}
              />
            )}
            {/* End arrow if extending to positive infinity */}
            {interval.end === null && (
              <polygon
                points={`${lineEndX},${lineY} ${lineEndX - 10},${lineY - 5} ${lineEndX - 10},${lineY + 5}`}
                fill={interval.color || '#3B82F6'}
              />
            )}
          </g>
        )
      })}

      {/* Main number line */}
      <line
        x1={lineStartX}
        y1={lineY}
        x2={lineEndX}
        y2={lineY}
        stroke="currentColor"
        strokeWidth={2}
      />

      {/* Left arrow */}
      <polygon
        points={`${lineStartX - 8},${lineY} ${lineStartX},${lineY - 4} ${lineStartX},${lineY + 4}`}
        fill="currentColor"
      />

      {/* Right arrow */}
      <polygon
        points={`${lineEndX + 8},${lineY} ${lineEndX},${lineY - 4} ${lineEndX},${lineY + 4}`}
        fill="currentColor"
      />

      {/* Tick marks and labels */}
      {ticks.map((tick) => {
        const x = valueToX(tick)
        return (
          <g key={`tick-${tick}`}>
            <line
              x1={x}
              y1={lineY - 5}
              x2={x}
              y2={lineY + 5}
              stroke="currentColor"
              strokeWidth={1}
            />
            <text
              x={x}
              y={lineY + 18}
              textAnchor="middle"
              className="fill-current text-xs"
            >
              {tick}
            </text>
          </g>
        )
      })}

      {/* Points */}
      {points.map((point, index) => {
        const x = valueToX(point.value)
        const isFilled = point.style === 'filled'

        return (
          <g key={`point-${index}`}>
            {/* Point circle */}
            <circle
              cx={x}
              cy={lineY}
              r={6}
              fill={isFilled ? '#EF4444' : 'white'}
              stroke="#EF4444"
              strokeWidth={2}
            />
            {/* Point label */}
            {point.label && (
              <text
                x={x}
                y={lineY - 12}
                textAnchor="middle"
                className="fill-red-600 dark:fill-red-400 text-xs font-medium"
              >
                {point.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Interval endpoint markers */}
      {intervals.map((interval, index) => {
        const elements = []

        if (interval.start !== null) {
          const x = valueToX(interval.start)
          elements.push(
            <circle
              key={`interval-start-${index}`}
              cx={x}
              cy={lineY}
              r={5}
              fill={interval.startInclusive ? (interval.color || '#3B82F6') : 'white'}
              stroke={interval.color || '#3B82F6'}
              strokeWidth={2}
            />
          )
        }

        if (interval.end !== null) {
          const x = valueToX(interval.end)
          elements.push(
            <circle
              key={`interval-end-${index}`}
              cx={x}
              cy={lineY}
              r={5}
              fill={interval.endInclusive ? (interval.color || '#3B82F6') : 'white'}
              stroke={interval.color || '#3B82F6'}
              strokeWidth={2}
            />
          )
        }

        return elements
      })}

      {/* Error highlighting - Wrong points (shown with X) */}
      {errorHighlight?.wrongPoints?.map((point, index) => {
        const x = valueToX(point.value)
        return (
          <g key={`wrong-point-${index}`}>
            {/* Red X mark */}
            <line
              x1={x - 6}
              y1={lineY - 6}
              x2={x + 6}
              y2={lineY + 6}
              stroke="#EF4444"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={x + 6}
              y1={lineY - 6}
              x2={x - 6}
              y2={lineY + 6}
              stroke="#EF4444"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Error label */}
            {point.errorLabel && (
              <text
                x={x}
                y={lineY - 16}
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
        const x = valueToX(point.value)
        return (
          <g key={`correct-point-${index}`}>
            {/* Green circle with checkmark */}
            <circle
              cx={x}
              cy={lineY}
              r={8}
              fill="#22C55E"
              opacity={0.2}
            />
            <circle
              cx={x}
              cy={lineY}
              r={5}
              fill="#22C55E"
              stroke="white"
              strokeWidth={1}
            />
            {/* Checkmark */}
            <path
              d={`M ${x - 3} ${lineY} L ${x - 1} ${lineY + 2} L ${x + 3} ${lineY - 2}`}
              stroke="white"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Correct label */}
            {point.correctLabel && (
              <text
                x={x}
                y={lineY - 16}
                textAnchor="middle"
                className="fill-green-600 text-xs font-medium"
              >
                {point.correctLabel}
              </text>
            )}
          </g>
        )
      })}

      {/* Error highlighting - Wrong intervals */}
      {errorHighlight?.wrongIntervals?.map((interval, index) => {
        const startX = interval.start !== null ? valueToX(interval.start) : lineStartX
        const endX = interval.end !== null ? valueToX(interval.end) : lineEndX
        return (
          <g key={`wrong-interval-${index}`}>
            {/* Red dashed line */}
            <line
              x1={startX}
              y1={lineY - 12}
              x2={endX}
              y2={lineY - 12}
              stroke="#EF4444"
              strokeWidth={2}
              strokeDasharray="4,2"
            />
            {/* X marks at endpoints */}
            <text x={startX} y={lineY - 18} textAnchor="middle" className="fill-red-600 text-xs">✗</text>
            <text x={endX} y={lineY - 18} textAnchor="middle" className="fill-red-600 text-xs">✗</text>
          </g>
        )
      })}

      {/* Error highlighting - Correct intervals */}
      {errorHighlight?.correctIntervals?.map((interval, index) => {
        const startX = interval.start !== null ? valueToX(interval.start) : lineStartX
        const endX = interval.end !== null ? valueToX(interval.end) : lineEndX
        return (
          <g key={`correct-interval-${index}`}>
            {/* Green shaded region */}
            <rect
              x={startX}
              y={lineY - 10}
              width={endX - startX}
              height={20}
              fill="#22C55E"
              opacity={0.15}
            />
            {/* Green solid line */}
            <line
              x1={startX}
              y1={lineY}
              x2={endX}
              y2={lineY}
              stroke="#22C55E"
              strokeWidth={4}
            />
            {/* Checkmarks at endpoints */}
            <text x={startX} y={lineY - 18} textAnchor="middle" className="fill-green-600 text-xs">✓</text>
            <text x={endX} y={lineY - 18} textAnchor="middle" className="fill-green-600 text-xs">✓</text>
          </g>
        )
      })}
    </svg>
  )
}

export default NumberLine
