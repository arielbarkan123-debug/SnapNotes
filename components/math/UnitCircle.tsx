'use client'

import { useMemo } from 'react'
import type { UnitCircleData, UnitCircleErrorHighlight } from '@/types'
import type { SubjectKey } from '@/lib/diagram-theme'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface UnitCircleDataWithErrors extends UnitCircleData {
  errorHighlight?: UnitCircleErrorHighlight
}

interface UnitCircleProps {
  data: UnitCircleDataWithErrors
  className?: string
  width?: number
  height?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

// Standard angles for the unit circle
const STANDARD_ANGLES = [
  { degrees: 0, radians: '0', cos: '1', sin: '0' },
  { degrees: 30, radians: 'π/6', cos: '√3/2', sin: '1/2' },
  { degrees: 45, radians: 'π/4', cos: '√2/2', sin: '√2/2' },
  { degrees: 60, radians: 'π/3', cos: '1/2', sin: '√3/2' },
  { degrees: 90, radians: 'π/2', cos: '0', sin: '1' },
  { degrees: 120, radians: '2π/3', cos: '-1/2', sin: '√3/2' },
  { degrees: 135, radians: '3π/4', cos: '-√2/2', sin: '√2/2' },
  { degrees: 150, radians: '5π/6', cos: '-√3/2', sin: '1/2' },
  { degrees: 180, radians: 'π', cos: '-1', sin: '0' },
  { degrees: 210, radians: '7π/6', cos: '-√3/2', sin: '-1/2' },
  { degrees: 225, radians: '5π/4', cos: '-√2/2', sin: '-√2/2' },
  { degrees: 240, radians: '4π/3', cos: '-1/2', sin: '-√3/2' },
  { degrees: 270, radians: '3π/2', cos: '0', sin: '-1' },
  { degrees: 300, radians: '5π/3', cos: '1/2', sin: '-√3/2' },
  { degrees: 315, radians: '7π/4', cos: '√2/2', sin: '-√2/2' },
  { degrees: 330, radians: '11π/6', cos: '√3/2', sin: '-1/2' },
]

/**
 * UnitCircle - SVG component for displaying the unit circle
 * Used for trigonometry problems
 */
export function UnitCircle({
  data,
  className = '',
  width = 400,
  height = 400,
  subject = 'math',
  complexity = 'middle_school',
}: UnitCircleProps) {
  const {
    angles = [],
    showStandardAngles = false,
    highlightQuadrant,
    showSinCos = true,
    title,
    errorHighlight,
  } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  const padding = 60
  const titleHeight = title ? 30 : 0
  const center = { x: width / 2, y: (height + titleHeight) / 2 }
  const radius = Math.min(width, height) / 2 - padding

  // Convert angle to point on circle
  const angleToPoint = (degrees: number): { x: number; y: number } => {
    const rad = (degrees * Math.PI) / 180
    return {
      x: center.x + radius * Math.cos(rad),
      y: center.y - radius * Math.sin(rad), // Flip Y for SVG
    }
  }

  // Determine which angles to display
  const displayAngles = showStandardAngles
    ? STANDARD_ANGLES.map((a) => ({
        degrees: a.degrees,
        radians: a.radians,
        showCoordinates: showSinCos,
        highlight: angles.some((ua) => ua.degrees === a.degrees && ua.highlight),
        cos: a.cos,
        sin: a.sin,
      }))
    : angles.map((a) => {
        const std = STANDARD_ANGLES.find((s) => s.degrees === a.degrees)
        return {
          ...a,
          cos: std?.cos || Math.cos((a.degrees * Math.PI) / 180).toFixed(2),
          sin: std?.sin || Math.sin((a.degrees * Math.PI) / 180).toFixed(2),
        }
      })

  // Quadrant highlighting
  const quadrantPaths: Record<1 | 2 | 3 | 4, string> = {
    1: `M ${center.x} ${center.y} L ${center.x + radius} ${center.y} A ${radius} ${radius} 0 0 0 ${center.x} ${center.y - radius} Z`,
    2: `M ${center.x} ${center.y} L ${center.x} ${center.y - radius} A ${radius} ${radius} 0 0 0 ${center.x - radius} ${center.y} Z`,
    3: `M ${center.x} ${center.y} L ${center.x - radius} ${center.y} A ${radius} ${radius} 0 0 0 ${center.x} ${center.y + radius} Z`,
    4: `M ${center.x} ${center.y} L ${center.x} ${center.y + radius} A ${radius} ${radius} 0 0 0 ${center.x + radius} ${center.y} Z`,
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

      {/* Quadrant highlight */}
      {highlightQuadrant && (
        <path
          d={quadrantPaths[highlightQuadrant]}
          fill={subjectColors.primary}
          fillOpacity={0.15}
        />
      )}

      {/* Unit circle */}
      <circle
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={adaptiveLineWeight}
      />

      {/* X axis */}
      <line
        x1={center.x - radius - 20}
        y1={center.y}
        x2={center.x + radius + 20}
        y2={center.y}
        stroke="currentColor"
        strokeWidth={adaptiveLineWeight - 0.5}
      />
      <polygon
        points={`${center.x + radius + 25},${center.y} ${center.x + radius + 15},${center.y - 5} ${center.x + radius + 15},${center.y + 5}`}
        fill="currentColor"
      />
      <text
        x={center.x + radius + 35}
        y={center.y + 5}
        className="fill-current text-sm"
      >
        x
      </text>

      {/* Y axis */}
      <line
        x1={center.x}
        y1={center.y + radius + 20}
        x2={center.x}
        y2={center.y - radius - 20}
        stroke="currentColor"
        strokeWidth={adaptiveLineWeight - 0.5}
      />
      <polygon
        points={`${center.x},${center.y - radius - 25} ${center.x - 5},${center.y - radius - 15} ${center.x + 5},${center.y - radius - 15}`}
        fill="currentColor"
      />
      <text
        x={center.x + 10}
        y={center.y - radius - 25}
        className="fill-current text-sm"
      >
        y
      </text>

      {/* Axis labels */}
      <text
        x={center.x + radius + 5}
        y={center.y + 15}
        className="fill-current text-xs"
      >
        1
      </text>
      <text
        x={center.x - radius - 15}
        y={center.y + 15}
        className="fill-current text-xs"
      >
        -1
      </text>
      <text
        x={center.x + 8}
        y={center.y - radius + 5}
        className="fill-current text-xs"
      >
        1
      </text>
      <text
        x={center.x + 8}
        y={center.y + radius + 12}
        className="fill-current text-xs"
      >
        -1
      </text>

      {/* Origin */}
      <circle cx={center.x} cy={center.y} r={adaptiveLineWeight} fill="currentColor" />
      <text
        x={center.x - 12}
        y={center.y + 15}
        className="fill-current text-xs"
      >
        O
      </text>

      {/* CAST quadrant labels */}
      <text
        x={center.x + radius * 0.5}
        y={center.y - radius * 0.7}
        textAnchor="middle"
        className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
      >
        All +
      </text>
      <text
        x={center.x - radius * 0.5}
        y={center.y - radius * 0.7}
        textAnchor="middle"
        className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
      >
        Sin +
      </text>
      <text
        x={center.x - radius * 0.5}
        y={center.y + radius * 0.75}
        textAnchor="middle"
        className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
      >
        Tan +
      </text>
      <text
        x={center.x + radius * 0.5}
        y={center.y + radius * 0.75}
        textAnchor="middle"
        className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
      >
        Cos +
      </text>

      {/* Angle points and lines */}
      {displayAngles.map((angle, index) => {
        const point = angleToPoint(angle.degrees)
        const isHighlighted = angle.highlight
        const color = isHighlighted ? '#EF4444' : subjectColors.primary

        // Position label based on quadrant
        const labelOffset = 20
        const rad = (angle.degrees * Math.PI) / 180
        const labelX = center.x + (radius + labelOffset) * Math.cos(rad)
        const labelY = center.y - (radius + labelOffset) * Math.sin(rad)

        // Text anchor based on position
        const textAnchor =
          angle.degrees > 90 && angle.degrees < 270 ? 'end' : 'start'
        const dominantBaseline =
          angle.degrees > 0 && angle.degrees < 180 ? 'auto' : 'hanging'

        return (
          <g key={`angle-${index}`}>
            {/* Radius line (only for highlighted angles) */}
            {isHighlighted && (
              <line
                x1={center.x}
                y1={center.y}
                x2={point.x}
                y2={point.y}
                stroke={color}
                strokeWidth={adaptiveLineWeight}
              />
            )}

            {/* Point on circle */}
            <circle
              cx={point.x}
              cy={point.y}
              r={isHighlighted ? adaptiveLineWeight + 2 : adaptiveLineWeight + 1}
              fill={color}
            />

            {/* Angle label (radians) */}
            <text
              x={labelX}
              y={labelY}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
              className="text-xs"
              style={{ fill: isHighlighted ? '#EF4444' : subjectColors.primary, fontWeight: isHighlighted ? 500 : undefined }}
            >
              {angle.radians}
            </text>

            {/* Coordinates (if showing sin/cos) */}
            {angle.showCoordinates !== false && showSinCos && (
              <text
                x={labelX}
                y={labelY + (angle.degrees > 0 && angle.degrees < 180 ? 12 : -12)}
                textAnchor={textAnchor}
                dominantBaseline={dominantBaseline}
                className="fill-gray-500 dark:fill-gray-400 text-xs"
                style={{ fontSize: '10px' }}
              >
                ({angle.cos}, {angle.sin})
              </text>
            )}

            {/* Angle arc for highlighted angles */}
            {isHighlighted && angle.degrees !== 0 && (
              <path
                d={`M ${center.x + 25} ${center.y} A 25 25 0 ${angle.degrees > 180 ? 1 : 0} 0 ${center.x + 25 * Math.cos((angle.degrees * Math.PI) / 180)} ${center.y - 25 * Math.sin((angle.degrees * Math.PI) / 180)}`}
                fill="none"
                stroke={color}
                strokeWidth={adaptiveLineWeight}
              />
            )}
          </g>
        )
      })}

      {/* Highlighted angle sin/cos projections */}
      {displayAngles
        .filter((a) => a.highlight)
        .map((angle, index) => {
          const point = angleToPoint(angle.degrees)

          return (
            <g key={`projection-${index}`}>
              {/* Cos projection (to x-axis) */}
              <line
                x1={point.x}
                y1={point.y}
                x2={point.x}
                y2={center.y}
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
              <text
                x={point.x}
                y={center.y + (point.y < center.y ? 15 : -8)}
                textAnchor="middle"
                className="fill-green-600 dark:fill-green-400 text-xs font-medium"
              >
                sin
              </text>

              {/* Sin projection (to y-axis) */}
              <line
                x1={point.x}
                y1={point.y}
                x2={center.x}
                y2={point.y}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
              <text
                x={center.x + (point.x < center.x ? -8 : 8)}
                y={point.y}
                textAnchor={point.x < center.x ? 'end' : 'start'}
                dominantBaseline="middle"
                className="fill-amber-600 dark:fill-amber-400 text-xs font-medium"
              >
                cos
              </text>
            </g>
          )
        })}

      {/* Error highlighting - Wrong angles */}
      {errorHighlight?.wrongAngles?.map((degrees) => {
        const point = angleToPoint(degrees)
        return (
          <g key={`wrong-angle-${degrees}`}>
            {/* Red X at the wrong angle point */}
            <circle cx={point.x} cy={point.y} r={12} fill="#EF4444" opacity={0.2} />
            <line x1={point.x - 8} y1={point.y - 8} x2={point.x + 8} y2={point.y + 8} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
            <line x1={point.x + 8} y1={point.y - 8} x2={point.x - 8} y2={point.y + 8} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
          </g>
        )
      })}

      {/* Error highlighting - Correct angles */}
      {errorHighlight?.correctAngles?.map((degrees) => {
        const point = angleToPoint(degrees)
        return (
          <g key={`correct-angle-${degrees}`}>
            {/* Green checkmark at the correct angle point */}
            <circle cx={point.x} cy={point.y} r={12} fill="#22C55E" opacity={0.2} />
            <circle cx={point.x} cy={point.y} r={7} fill="#22C55E" />
            <path
              d={`M ${point.x - 4} ${point.y} L ${point.x - 1} ${point.y + 4} L ${point.x + 5} ${point.y - 4}`}
              stroke="white"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      })}

      {/* Error highlighting - Wrong sin/cos values */}
      {errorHighlight?.wrongValues?.map((item) => {
        const _point = angleToPoint(item.angle) // Keep for potential future use
        const labelOffset = 35
        const rad = (item.angle * Math.PI) / 180
        const labelX = center.x + (radius + labelOffset) * Math.cos(rad)
        const labelY = center.y - (radius + labelOffset) * Math.sin(rad)

        return (
          <g key={`wrong-value-${item.angle}`}>
            {/* Show wrong values with strikethrough */}
            {item.wrongSin && (
              <text
                x={labelX}
                y={labelY + 25}
                textAnchor="middle"
                className="fill-red-600 text-xs"
                textDecoration="line-through"
              >
                sin = {item.wrongSin}
              </text>
            )}
            {item.wrongCos && (
              <text
                x={labelX}
                y={labelY + 38}
                textAnchor="middle"
                className="fill-red-600 text-xs"
                textDecoration="line-through"
              >
                cos = {item.wrongCos}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default UnitCircle
