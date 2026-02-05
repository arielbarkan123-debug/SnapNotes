'use client'

import { useMemo } from 'react'
import type { SubjectKey } from '@/lib/diagram-theme'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import type { TriangleData, TriangleErrorHighlight } from '@/types'

interface TriangleDataWithErrors extends TriangleData {
  errorHighlight?: TriangleErrorHighlight
}

interface TriangleProps {
  data: TriangleDataWithErrors
  className?: string
  width?: number
  height?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * Triangle - SVG component for displaying triangles
 * Used for geometry problems involving triangles
 */
export function Triangle({
  data,
  className = '',
  width = 300,
  height = 280,
  subject = 'geometry',
  complexity = 'middle_school',
}: TriangleProps) {
  const { vertices, sides = [], angles = [], altitude, title, errorHighlight } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Guard against empty or insufficient vertices
  if (!vertices || vertices.length < 3) {
    return (
      <svg width={width} height={height} className={className} role="img" aria-label="Triangle diagram - insufficient data">
        <rect width={width} height={height} fill="#f9fafb" rx={8} />
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#9ca3af" fontSize={14}>
          Insufficient vertex data
        </text>
      </svg>
    )
  }

  // Calculate bounds and scaling
  const padding = 40
  const titleHeight = title ? 25 : 0

  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const dataWidth = maxX - minX || 1
  const dataHeight = maxY - minY || 1

  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2 - titleHeight

  const scale = Math.min(plotWidth / dataWidth, plotHeight / dataHeight) * 0.8

  // Transform coordinates to SVG space
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const transform = (x: number, y: number): { x: number; y: number } => ({
    x: width / 2 + (x - centerX) * scale,
    y: height / 2 + titleHeight / 2 - (y - centerY) * scale, // Flip Y
  })

  const transformedVertices = vertices.map((v) => ({
    ...transform(v.x, v.y),
    label: v.label,
  }))

  // Find vertex by label
  const getVertex = (label: string) => {
    const index = vertices.findIndex((v) => v.label === label)
    return index >= 0 ? transformedVertices[index] : null
  }

  // Draw angle arc
  const drawAngle = (vertexLabel: string, radius: number = 20): string => {
    const vertex = getVertex(vertexLabel)
    if (!vertex) return ''

    // Find adjacent vertices
    const vertexIndex = vertices.findIndex((v) => v.label === vertexLabel)
    const prevIndex = (vertexIndex + 2) % 3
    const nextIndex = (vertexIndex + 1) % 3

    const prev = transformedVertices[prevIndex]
    const next = transformedVertices[nextIndex]

    // Calculate angles from vertex to adjacent vertices
    const angle1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
    const angle2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)

    // Draw arc
    const startX = vertex.x + radius * Math.cos(angle1)
    const startY = vertex.y + radius * Math.sin(angle1)
    const endX = vertex.x + radius * Math.cos(angle2)
    const endY = vertex.y + radius * Math.sin(angle2)

    // Determine if we should use large arc flag
    let angleDiff = angle2 - angle1
    if (angleDiff < 0) angleDiff += 2 * Math.PI
    const largeArc = angleDiff > Math.PI ? 1 : 0
    const sweep = 1

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`
  }

  // Draw right angle marker
  const drawRightAngle = (vertexLabel: string, size: number = 15): string => {
    const vertex = getVertex(vertexLabel)
    if (!vertex) return ''

    const vertexIndex = vertices.findIndex((v) => v.label === vertexLabel)
    const prevIndex = (vertexIndex + 2) % 3
    const nextIndex = (vertexIndex + 1) % 3

    const prev = transformedVertices[prevIndex]
    const next = transformedVertices[nextIndex]

    // Normalize directions
    const dir1 = {
      x: (prev.x - vertex.x) / Math.hypot(prev.x - vertex.x, prev.y - vertex.y),
      y: (prev.y - vertex.y) / Math.hypot(prev.x - vertex.x, prev.y - vertex.y),
    }
    const dir2 = {
      x: (next.x - vertex.x) / Math.hypot(next.x - vertex.x, next.y - vertex.y),
      y: (next.y - vertex.y) / Math.hypot(next.x - vertex.x, next.y - vertex.y),
    }

    const p1 = { x: vertex.x + dir1.x * size, y: vertex.y + dir1.y * size }
    const p2 = {
      x: vertex.x + (dir1.x + dir2.x) * size,
      y: vertex.y + (dir1.y + dir2.y) * size,
    }
    const p3 = { x: vertex.x + dir2.x * size, y: vertex.y + dir2.y * size }

    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }

  // Calculate midpoint of a side
  const getMidpoint = (label1: string, label2: string) => {
    const v1 = getVertex(label1)
    const v2 = getVertex(label2)
    if (!v1 || !v2) return null
    return {
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2,
    }
  }

  // Triangle path
  const trianglePath = `M ${transformedVertices[0].x} ${transformedVertices[0].y}
                        L ${transformedVertices[1].x} ${transformedVertices[1].y}
                        L ${transformedVertices[2].x} ${transformedVertices[2].y} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`text-gray-800 dark:text-gray-200 ${className}`}
      role="img"
      aria-label={`Triangle${title ? `: ${title}` : ''} with vertices ${vertices.map(v => v.label).join(', ')}`}
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

      {/* Triangle fill */}
      <path d={trianglePath} fill={subjectColors.primary} fillOpacity={0.1} stroke="none" />

      {/* Triangle outline */}
      <path
        d={trianglePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={adaptiveLineWeight}
      />

      {/* Highlighted sides */}
      {sides
        .filter((s) => s.highlight)
        .map((side, index) => {
          const from = getVertex(side.from)
          const to = getVertex(side.to)
          if (!from || !to) return null

          return (
            <line
              key={`highlight-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#EF4444"
              strokeWidth={adaptiveLineWeight + 1}
            />
          )
        })}

      {/* Altitude line */}
      {altitude && (() => {
        const from = getVertex(altitude.from)
        // For altitude, calculate foot of perpendicular
        const toIndex = vertices.findIndex((v) => v.label === altitude.to)
        const otherIndex = vertices.findIndex(
          (v) => v.label !== altitude.from && v.label !== altitude.to
        )
        if (!from || toIndex < 0 || otherIndex < 0) return null

        const to = transformedVertices[toIndex]
        const other = transformedVertices[otherIndex]

        // Calculate foot of altitude (perpendicular from 'from' to line 'to-other')
        const dx = other.x - to.x
        const dy = other.y - to.y
        const t =
          ((from.x - to.x) * dx + (from.y - to.y) * dy) / (dx * dx + dy * dy)
        const foot = {
          x: to.x + t * dx,
          y: to.y + t * dy,
        }

        return (
          <g>
            <line
              x1={from.x}
              y1={from.y}
              x2={foot.x}
              y2={foot.y}
              stroke="#10B981"
              strokeWidth={adaptiveLineWeight}
              strokeDasharray="5,5"
            />
            {/* Small right angle marker at foot */}
            <rect
              x={foot.x - 5}
              y={foot.y - 5}
              width={10}
              height={10}
              fill="none"
              stroke="#10B981"
              strokeWidth={1}
              transform={`rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}, ${foot.x}, ${foot.y})`}
            />
          </g>
        )
      })()}

      {/* Angle arcs */}
      {angles.map((angle, index) => {
        if (angle.rightAngle) {
          return (
            <path
              key={`angle-${index}`}
              d={drawRightAngle(angle.vertex)}
              fill="none"
              stroke={angle.highlight ? '#EF4444' : '#6B7280'}
              strokeWidth={1.5}
            />
          )
        }

        return (
          <path
            key={`angle-${index}`}
            d={drawAngle(angle.vertex)}
            fill="none"
            stroke={angle.highlight ? '#EF4444' : '#6B7280'}
            strokeWidth={1.5}
          />
        )
      })}

      {/* Angle labels */}
      {angles.map((angle, index) => {
        if (!angle.measure) return null
        const vertex = getVertex(angle.vertex)
        if (!vertex) return null

        // Position label slightly inside the angle
        const vertexIndex = vertices.findIndex((v) => v.label === angle.vertex)
        const prevIndex = (vertexIndex + 2) % 3
        const nextIndex = (vertexIndex + 1) % 3
        const prev = transformedVertices[prevIndex]
        const next = transformedVertices[nextIndex]

        const angle1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
        const angle2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)
        const midAngle = (angle1 + angle2) / 2

        const labelDist = 30
        const labelX = vertex.x + labelDist * Math.cos(midAngle)
        const labelY = vertex.y + labelDist * Math.sin(midAngle)

        return (
          <text
            key={`angle-label-${index}`}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-600 dark:fill-gray-400 text-xs"
          >
            {angle.measure}
          </text>
        )
      })}

      {/* Side labels */}
      {sides.map((side, index) => {
        if (!side.length) return null
        const midpoint = getMidpoint(side.from, side.to)
        if (!midpoint) return null

        // Offset label perpendicular to the side
        const from = getVertex(side.from)
        const to = getVertex(side.to)
        if (!from || !to) return null

        const dx = to.x - from.x
        const dy = to.y - from.y
        const len = Math.hypot(dx, dy)
        const perpX = -dy / len
        const perpY = dx / len

        // Position on outside of triangle (check which side is outside)
        const center = {
          x: transformedVertices.reduce((sum, v) => sum + v.x, 0) / 3,
          y: transformedVertices.reduce((sum, v) => sum + v.y, 0) / 3,
        }
        const testPoint = {
          x: midpoint.x + perpX * 10,
          y: midpoint.y + perpY * 10,
        }
        const distFromCenter = Math.hypot(testPoint.x - center.x, testPoint.y - center.y)
        const origDistFromCenter = Math.hypot(midpoint.x - center.x, midpoint.y - center.y)
        const direction = distFromCenter > origDistFromCenter ? 1 : -1

        return (
          <text
            key={`side-label-${index}`}
            x={midpoint.x + perpX * 15 * direction}
            y={midpoint.y + perpY * 15 * direction}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: subjectColors.primary }}
            className="text-sm font-medium"
          >
            {side.length}
          </text>
        )
      })}

      {/* Vertex labels */}
      {transformedVertices.map((vertex, index) => {
        // Position label away from triangle center
        const center = {
          x: transformedVertices.reduce((sum, v) => sum + v.x, 0) / 3,
          y: transformedVertices.reduce((sum, v) => sum + v.y, 0) / 3,
        }
        const dx = vertex.x - center.x
        const dy = vertex.y - center.y
        const dist = Math.hypot(dx, dy)
        const labelDist = 20

        return (
          <text
            key={`vertex-${index}`}
            x={vertex.x + (dx / dist) * labelDist}
            y={vertex.y + (dy / dist) * labelDist}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-sm font-bold"
          >
            {vertex.label}
          </text>
        )
      })}

      {/* Vertex points */}
      {transformedVertices.map((vertex, index) => (
        <circle
          key={`vertex-point-${index}`}
          cx={vertex.x}
          cy={vertex.y}
          r={adaptiveLineWeight}
          fill="currentColor"
        />
      ))}

      {/* Error highlighting - Wrong sides */}
      {errorHighlight?.wrongSides?.map((sideLabel) => {
        // Parse side label (e.g., "AB" -> from A to B)
        const from = getVertex(sideLabel[0])
        const to = getVertex(sideLabel[1])
        if (!from || !to) return null

        return (
          <g key={`wrong-side-${sideLabel}`}>
            {/* Red dashed line over the wrong side */}
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#EF4444"
              strokeWidth={4}
              strokeDasharray="6,4"
              opacity={0.8}
            />
            {/* X marker at midpoint */}
            {(() => {
              const midX = (from.x + to.x) / 2
              const midY = (from.y + to.y) / 2
              return (
                <>
                  <circle cx={midX} cy={midY} r={10} fill="#EF4444" opacity={0.2} />
                  <line x1={midX - 6} y1={midY - 6} x2={midX + 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                  <line x1={midX + 6} y1={midY - 6} x2={midX - 6} y2={midY + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                </>
              )
            })()}
            {/* Correction text if available */}
            {errorHighlight?.corrections?.[sideLabel] && (
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 18}
                textAnchor="middle"
                className="fill-red-600 text-xs font-medium"
              >
                {errorHighlight.corrections[sideLabel]}
              </text>
            )}
          </g>
        )
      })}

      {/* Error highlighting - Wrong angles */}
      {errorHighlight?.wrongAngles?.map((vertexLabel) => {
        const vertex = getVertex(vertexLabel)
        if (!vertex) return null

        return (
          <g key={`wrong-angle-${vertexLabel}`}>
            {/* Red X near the angle */}
            <circle cx={vertex.x} cy={vertex.y} r={12} fill="#EF4444" opacity={0.2} />
            <line x1={vertex.x - 6} y1={vertex.y - 6} x2={vertex.x + 6} y2={vertex.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
            <line x1={vertex.x + 6} y1={vertex.y - 6} x2={vertex.x - 6} y2={vertex.y + 6} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
            {/* Correction text if available */}
            {errorHighlight?.corrections?.[vertexLabel] && (
              <text
                x={vertex.x}
                y={vertex.y + 25}
                textAnchor="middle"
                className="fill-red-600 text-xs font-medium"
              >
                {errorHighlight.corrections[vertexLabel]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default Triangle
