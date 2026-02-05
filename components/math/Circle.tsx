'use client'

import { useMemo } from 'react'
import type { CircleData, CircleErrorHighlight } from '@/types'
import type { SubjectKey } from '@/lib/diagram-theme'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface CircleDataWithErrors extends CircleData {
  errorHighlight?: CircleErrorHighlight
}

interface CircleProps {
  data: CircleDataWithErrors
  className?: string
  width?: number
  height?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * Circle - SVG component for displaying circles
 * Used for geometry problems involving circles
 */
export function Circle({
  data,
  className = '',
  width = 300,
  height = 300,
  subject = 'geometry',
  complexity = 'middle_school',
}: CircleProps) {
  const {
    centerX,
    centerY,
    radius,
    centerLabel,
    showRadius,
    radiusLabel,
    showDiameter,
    chords = [],
    tangentPoint,
    centralAngle,
    inscribedAngle,
    title,
    errorHighlight,
  } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Scale and positioning
  const padding = 40
  const titleHeight = title ? 25 : 0
  const availableSize = Math.min(width, height) - padding * 2 - titleHeight

  const scale = availableSize / (radius * 2.5) // Leave some margin

  // Transform coordinates
  const transform = (x: number, y: number): { x: number; y: number } => ({
    x: width / 2 + (x - centerX) * scale,
    y: height / 2 + titleHeight / 2 - (y - centerY) * scale,
  })

  const center = transform(centerX, centerY)
  const scaledRadius = radius * scale

  // Calculate point on circle from angle (in degrees)
  const pointOnCircle = (angleDeg: number): { x: number; y: number } => {
    const angleRad = (angleDeg * Math.PI) / 180
    return {
      x: center.x + scaledRadius * Math.cos(angleRad),
      y: center.y - scaledRadius * Math.sin(angleRad), // Flip Y
    }
  }

  // Draw arc path
  const arcPath = (startDeg: number, endDeg: number, r: number = scaledRadius): string => {
    const start = pointOnCircle(startDeg)
    const end = pointOnCircle(endDeg)
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    const sweep = endDeg > startDeg ? 0 : 1
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
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

      {/* Main circle */}
      <circle
        cx={center.x}
        cy={center.y}
        r={scaledRadius}
        fill={subjectColors.primary}
        fillOpacity={0.1}
        stroke="currentColor"
        strokeWidth={adaptiveLineWeight}
      />

      {/* Center point */}
      <circle cx={center.x} cy={center.y} r={adaptiveLineWeight} fill="currentColor" />
      {centerLabel && (
        <text
          x={center.x - 10}
          y={center.y + 15}
          className="fill-current text-sm font-medium"
        >
          {centerLabel}
        </text>
      )}

      {/* Radius line */}
      {showRadius && (
        <g>
          <line
            x1={center.x}
            y1={center.y}
            x2={center.x + scaledRadius}
            y2={center.y}
            stroke={subjectColors.primary}
            strokeWidth={adaptiveLineWeight}
          />
          {radiusLabel && (
            <text
              x={center.x + scaledRadius / 2}
              y={center.y - 8}
              textAnchor="middle"
              className="text-sm"
              style={{ fill: subjectColors.primary }}
            >
              {radiusLabel}
            </text>
          )}
        </g>
      )}

      {/* Diameter line */}
      {showDiameter && (
        <line
          x1={center.x - scaledRadius}
          y1={center.y}
          x2={center.x + scaledRadius}
          y2={center.y}
          stroke="#10B981"
          strokeWidth={adaptiveLineWeight}
        />
      )}

      {/* Chords */}
      {chords.map((chord, index) => {
        const start = transform(chord.start.x, chord.start.y)
        const end = transform(chord.end.x, chord.end.y)

        return (
          <g key={`chord-${index}`}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#8B5CF6"
              strokeWidth={adaptiveLineWeight}
            />
            {/* Chord endpoints */}
            <circle cx={start.x} cy={start.y} r={adaptiveLineWeight + 1} fill="#8B5CF6" />
            <circle cx={end.x} cy={end.y} r={adaptiveLineWeight + 1} fill="#8B5CF6" />
            {/* Labels */}
            {chord.start.label && (
              <text
                x={start.x - 15}
                y={start.y}
                textAnchor="end"
                dominantBaseline="middle"
                style={{ fill: '#8B5CF6' }}
                className="text-sm"
              >
                {chord.start.label}
              </text>
            )}
            {chord.end.label && (
              <text
                x={end.x + 15}
                y={end.y}
                textAnchor="start"
                dominantBaseline="middle"
                style={{ fill: '#8B5CF6' }}
                className="text-sm"
              >
                {chord.end.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Tangent point and line */}
      {tangentPoint && (() => {
        const point = transform(tangentPoint.x, tangentPoint.y)
        // Draw tangent line perpendicular to radius at this point
        const angleToCenter = Math.atan2(
          center.y - point.y,
          center.x - point.x
        )
        const tangentAngle = angleToCenter + Math.PI / 2
        const tangentLength = 60

        return (
          <g>
            <line
              x1={point.x - Math.cos(tangentAngle) * tangentLength}
              y1={point.y - Math.sin(tangentAngle) * tangentLength}
              x2={point.x + Math.cos(tangentAngle) * tangentLength}
              y2={point.y + Math.sin(tangentAngle) * tangentLength}
              stroke="#F59E0B"
              strokeWidth={2}
            />
            {/* Radius to tangent point */}
            <line
              x1={center.x}
              y1={center.y}
              x2={point.x}
              y2={point.y}
              stroke="#6B7280"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            {/* Right angle marker */}
            <rect
              x={point.x - 8}
              y={point.y - 8}
              width={12}
              height={12}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={1}
              transform={`rotate(${(tangentAngle * 180) / Math.PI + 45}, ${point.x}, ${point.y})`}
            />
            <circle cx={point.x} cy={point.y} r={4} fill="#F59E0B" />
            {tangentPoint.label && (
              <text
                x={point.x + 10}
                y={point.y - 10}
                style={{ fill: '#F59E0B' }}
                className="text-sm"
              >
                {tangentPoint.label}
              </text>
            )}
          </g>
        )
      })()}

      {/* Central angle */}
      {centralAngle && (
        <g>
          {/* Arc */}
          <path
            d={arcPath(centralAngle.start, centralAngle.end)}
            fill="none"
            stroke="#EF4444"
            strokeWidth={adaptiveLineWeight + 1}
          />
          {/* Radii */}
          {[centralAngle.start, centralAngle.end].map((angle, i) => {
            const point = pointOnCircle(angle)
            return (
              <line
                key={`central-radius-${i}`}
                x1={center.x}
                y1={center.y}
                x2={point.x}
                y2={point.y}
                stroke="#EF4444"
                strokeWidth={adaptiveLineWeight}
              />
            )
          })}
          {/* Angle arc at center */}
          <path
            d={arcPath(centralAngle.start, centralAngle.end, 25)}
            fill="none"
            stroke="#EF4444"
            strokeWidth={1.5}
          />
          {/* Label */}
          {centralAngle.label && (
            <text
              x={center.x + 35 * Math.cos(((centralAngle.start + centralAngle.end) / 2 * Math.PI) / 180)}
              y={center.y - 35 * Math.sin(((centralAngle.start + centralAngle.end) / 2 * Math.PI) / 180)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: '#EF4444' }}
              className="text-xs"
            >
              {centralAngle.label}
            </text>
          )}
        </g>
      )}

      {/* Inscribed angle */}
      {inscribedAngle && (() => {
        const vertex = transform(inscribedAngle.vertex.x, inscribedAngle.vertex.y)
        const arcStart = pointOnCircle(inscribedAngle.arc.start)
        const arcEnd = pointOnCircle(inscribedAngle.arc.end)

        return (
          <g>
            {/* Lines from vertex to arc endpoints */}
            <line
              x1={vertex.x}
              y1={vertex.y}
              x2={arcStart.x}
              y2={arcStart.y}
              stroke="#10B981"
              strokeWidth={2}
            />
            <line
              x1={vertex.x}
              y1={vertex.y}
              x2={arcEnd.x}
              y2={arcEnd.y}
              stroke="#10B981"
              strokeWidth={2}
            />
            {/* Arc */}
            <path
              d={arcPath(inscribedAngle.arc.start, inscribedAngle.arc.end)}
              fill="none"
              stroke="#10B981"
              strokeWidth={3}
            />
            {/* Vertex point */}
            <circle cx={vertex.x} cy={vertex.y} r={4} fill="#10B981" />
            {/* Points on circle */}
            <circle cx={arcStart.x} cy={arcStart.y} r={4} fill="#10B981" />
            <circle cx={arcEnd.x} cy={arcEnd.y} r={4} fill="#10B981" />
            {/* Label */}
            {inscribedAngle.label && (
              <text
                x={vertex.x - 15}
                y={vertex.y + 15}
                style={{ fill: '#10B981' }}
                className="text-xs"
              >
                {inscribedAngle.label}
              </text>
            )}
          </g>
        )
      })()}

      {/* Error highlighting - Wrong radius */}
      {errorHighlight?.wrongRadius && (
        <g>
          {/* Red dashed line over radius */}
          <line
            x1={center.x}
            y1={center.y}
            x2={center.x + scaledRadius}
            y2={center.y}
            stroke="#EF4444"
            strokeWidth={3}
            strokeDasharray="6,4"
          />
          {/* X marker */}
          <circle cx={center.x + scaledRadius / 2} cy={center.y} r={10} fill="#EF4444" opacity={0.2} />
          <line x1={center.x + scaledRadius / 2 - 6} y1={center.y - 6} x2={center.x + scaledRadius / 2 + 6} y2={center.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
          <line x1={center.x + scaledRadius / 2 + 6} y1={center.y - 6} x2={center.x + scaledRadius / 2 - 6} y2={center.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
          {/* Correction text */}
          {errorHighlight?.corrections?.radius && (
            <text
              x={center.x + scaledRadius / 2}
              y={center.y - 18}
              textAnchor="middle"
              className="fill-red-600 text-xs font-medium"
            >
              {errorHighlight.corrections.radius}
            </text>
          )}
        </g>
      )}

      {/* Error highlighting - Wrong center */}
      {errorHighlight?.wrongCenter && (
        <g>
          {/* Red X at center */}
          <circle cx={center.x} cy={center.y} r={15} fill="#EF4444" opacity={0.2} />
          <line x1={center.x - 8} y1={center.y - 8} x2={center.x + 8} y2={center.y + 8} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
          <line x1={center.x + 8} y1={center.y - 8} x2={center.x - 8} y2={center.y + 8} stroke="#EF4444" strokeWidth={3} strokeLinecap="round" />
          {/* Correction text */}
          {errorHighlight?.corrections?.center && (
            <text
              x={center.x}
              y={center.y + 25}
              textAnchor="middle"
              className="fill-red-600 text-xs font-medium"
            >
              {errorHighlight.corrections.center}
            </text>
          )}
        </g>
      )}

      {/* Error highlighting - Wrong chord */}
      {errorHighlight?.wrongChord !== undefined && chords[errorHighlight.wrongChord] && (() => {
        const chord = chords[errorHighlight.wrongChord]
        const start = transform(chord.start.x, chord.start.y)
        const end = transform(chord.end.x, chord.end.y)
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2

        return (
          <g>
            {/* Red dashed line over chord */}
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#EF4444"
              strokeWidth={3}
              strokeDasharray="6,4"
            />
            {/* X marker */}
            <circle cx={midX} cy={midY} r={10} fill="#EF4444" opacity={0.2} />
            <line x1={midX - 6} y1={midY - 6} x2={midX + 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
            <line x1={midX + 6} y1={midY - 6} x2={midX - 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
          </g>
        )
      })()}
    </svg>
  )
}

export default Circle
