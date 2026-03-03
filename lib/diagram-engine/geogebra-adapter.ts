/**
 * GeoGebra Adapter
 *
 * Converts AI-generated diagram JSON (from the diagram schema system)
 * into GeoGebraRendererProps for client-side rendering.
 */

import type { GeoGebraCommand, GeoGebraRendererProps } from '@/components/diagrams/GeoGebraRenderer'

// ---------------------------------------------------------------------------
// Adapter functions
// ---------------------------------------------------------------------------

/**
 * Convert a triangle diagram to GeoGebra commands.
 */
export function triangleToGeoGebra(data: Record<string, unknown>): GeoGebraRendererProps | null {
  const commands: GeoGebraCommand[] = []

  const vertices = data.vertices as Array<{ x: number; y: number; label?: string }> | undefined
  if (!Array.isArray(vertices) || vertices.length < 3) return null

  // Create points
  const labels: string[] = []
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    const label = v.label || String.fromCharCode(65 + i) // A, B, C
    labels.push(label)
    commands.push({
      command: `${label} = (${v.x}, ${v.y})`,
      label,
      color: '#6366f1',
      showLabel: true,
    })
  }

  // Create polygon
  commands.push({
    command: `Polygon(${labels.join(', ')})`,
    label: 'poly1',
    color: '#6366f1',
  })

  // Add angle markers if requested
  const showAngles = data.showAngles as boolean | undefined
  if (showAngles && labels.length >= 3) {
    for (let i = 0; i < labels.length; i++) {
      const prev = labels[(i + labels.length - 1) % labels.length]
      const curr = labels[i]
      const next = labels[(i + 1) % labels.length]
      commands.push({
        command: `Angle(${prev}, ${curr}, ${next})`,
        label: `angle_${curr}`,
        color: '#ef4444',
        showLabel: true,
      })
    }
  }

  // Side lengths
  const showSides = data.showSides as boolean | undefined
  if (showSides) {
    for (let i = 0; i < labels.length; i++) {
      const a = labels[i]
      const b = labels[(i + 1) % labels.length]
      commands.push({
        command: `Segment(${a}, ${b})`,
        label: `side_${a}${b}`,
        color: '#6366f1',
        showLabel: true,
      })
    }
  }

  return {
    commands,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -2,
    xMax: (data.xMax as number) ?? 10,
    yMin: (data.yMin as number) ?? -2,
    yMax: (data.yMax as number) ?? 10,
  }
}

/**
 * Convert a circle_geometry diagram to GeoGebra commands.
 */
export function circleToGeoGebra(data: Record<string, unknown>): GeoGebraRendererProps | null {
  const commands: GeoGebraCommand[] = []

  const center = data.center as { x: number; y: number } | undefined
  const radius = data.radius as number | undefined

  if (!center) return null

  // Center point
  commands.push({
    command: `O = (${center.x}, ${center.y})`,
    label: 'O',
    color: '#6366f1',
    showLabel: true,
  })

  // Circle
  if (radius) {
    commands.push({
      command: `Circle(O, ${radius})`,
      label: 'c',
      color: '#6366f1',
    })
  }

  // Additional points on circle
  const points = data.points as Array<{ x: number; y: number; label?: string }> | undefined
  if (Array.isArray(points)) {
    for (let i = 0; i < points.length; i++) {
      const pt = points[i]
      const label = pt.label || String.fromCharCode(65 + i) // A, B, C...
      commands.push({
        command: `${label} = (${pt.x}, ${pt.y})`,
        label,
        color: '#ef4444',
        showLabel: true,
      })
    }
  }

  // Lines (chords, secants, tangents)
  const lines = data.lines as Array<{ from: string; to: string; type?: string }> | undefined
  if (Array.isArray(lines)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.type === 'tangent') {
        commands.push({
          command: `Tangent(${line.from}, c)`,
          label: `tangent_${i}`,
          color: '#22c55e',
        })
      } else {
        commands.push({
          command: `Segment(${line.from}, ${line.to})`,
          label: `seg_${i}`,
          color: '#f59e0b',
          showLabel: true,
        })
      }
    }
  }

  return {
    commands,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? (center.x - (radius || 5) - 2),
    xMax: (data.xMax as number) ?? (center.x + (radius || 5) + 2),
    yMin: (data.yMin as number) ?? (center.y - (radius || 5) - 2),
    yMax: (data.yMax as number) ?? (center.y + (radius || 5) + 2),
  }
}

/**
 * Convert a polygon diagram to GeoGebra commands.
 */
export function polygonToGeoGebra(data: Record<string, unknown>): GeoGebraRendererProps | null {
  const commands: GeoGebraCommand[] = []

  const vertices = data.vertices as Array<{ x: number; y: number; label?: string }> | undefined
  if (!Array.isArray(vertices) || vertices.length < 3) return null

  const labels: string[] = []
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    const label = v.label || String.fromCharCode(65 + i)
    labels.push(label)
    commands.push({
      command: `${label} = (${v.x}, ${v.y})`,
      label,
      color: '#6366f1',
      showLabel: true,
    })
  }

  // Create polygon
  commands.push({
    command: `Polygon(${labels.join(', ')})`,
    label: 'poly1',
    color: '#6366f1',
  })

  // Show angles if requested
  const showAngles = data.showAngles as boolean | undefined
  if (showAngles) {
    for (let i = 0; i < labels.length; i++) {
      const prev = labels[(i + labels.length - 1) % labels.length]
      const curr = labels[i]
      const next = labels[(i + 1) % labels.length]
      commands.push({
        command: `Angle(${prev}, ${curr}, ${next})`,
        label: `angle_${i}`,
        color: '#ef4444',
        showLabel: true,
      })
    }
  }

  return {
    commands,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -2,
    xMax: (data.xMax as number) ?? 12,
    yMin: (data.yMin as number) ?? -2,
    yMax: (data.yMax as number) ?? 12,
  }
}

/**
 * Convert a transformation diagram to GeoGebra commands.
 */
export function transformationToGeoGebra(data: Record<string, unknown>): GeoGebraRendererProps | null {
  const commands: GeoGebraCommand[] = []

  const type = data.transformationType as string | undefined
  const vertices = data.vertices as Array<{ x: number; y: number; label?: string }> | undefined

  if (!Array.isArray(vertices) || vertices.length < 3) return null

  // Create original shape
  const labels: string[] = []
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    const label = v.label || String.fromCharCode(65 + i)
    labels.push(label)
    commands.push({
      command: `${label} = (${v.x}, ${v.y})`,
      label,
      color: '#6366f1',
      showLabel: true,
    })
  }

  commands.push({
    command: `poly1 = Polygon(${labels.join(', ')})`,
    label: 'poly1',
    color: '#6366f1',
  })

  // Apply transformation
  switch (type) {
    case 'reflection': {
      const lineOfReflection = data.line as string | undefined
      if (lineOfReflection) {
        commands.push({ command: lineOfReflection, label: 'mirrorLine', color: '#9ca3af' })
        commands.push({
          command: `Reflect(poly1, mirrorLine)`,
          label: 'poly2',
          color: '#ef4444',
        })
      } else {
        // Default: reflect over y-axis
        commands.push({
          command: `Reflect(poly1, yAxis)`,
          label: 'poly2',
          color: '#ef4444',
        })
      }
      break
    }
    case 'rotation': {
      const angle = data.angle as number ?? 90
      const centerPt = data.center as { x: number; y: number } | undefined
      if (centerPt) {
        commands.push({
          command: `Center = (${centerPt.x}, ${centerPt.y})`,
          label: 'Center',
          color: '#f59e0b',
          showLabel: true,
        })
        commands.push({
          command: `Rotate(poly1, ${angle}deg, Center)`,
          label: 'poly2',
          color: '#ef4444',
        })
      } else {
        commands.push({
          command: `Rotate(poly1, ${angle}deg, (0,0))`,
          label: 'poly2',
          color: '#ef4444',
        })
      }
      break
    }
    case 'translation': {
      const vector = data.vector as { x: number; y: number } | undefined
      if (vector) {
        commands.push({
          command: `v = Vector((0,0), (${vector.x}, ${vector.y}))`,
          label: 'v',
          color: '#9ca3af',
          showLabel: true,
        })
        commands.push({
          command: `Translate(poly1, v)`,
          label: 'poly2',
          color: '#ef4444',
        })
      }
      break
    }
    case 'dilation': {
      const factor = data.factor as number ?? 2
      const centerPt2 = data.center as { x: number; y: number } | undefined
      const cx = centerPt2?.x ?? 0
      const cy = centerPt2?.y ?? 0
      commands.push({
        command: `Center = (${cx}, ${cy})`,
        label: 'Center',
        color: '#f59e0b',
        showLabel: true,
      })
      commands.push({
        command: `Dilate(poly1, ${factor}, Center)`,
        label: 'poly2',
        color: '#ef4444',
      })
      break
    }
  }

  return {
    commands,
    title: data.title as string | undefined,
    xMin: (data.xMin as number) ?? -8,
    xMax: (data.xMax as number) ?? 8,
    yMin: (data.yMin as number) ?? -8,
    yMax: (data.yMax as number) ?? 8,
  }
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Adapt an AI-generated diagram to GeoGebraRendererProps.
 * Returns null if the diagram type is not supported or data is invalid.
 */
export function adaptToGeoGebraProps(
  diagramType: string,
  data: Record<string, unknown>,
): GeoGebraRendererProps | null {
  switch (diagramType) {
    case 'triangle':
      return triangleToGeoGebra(data)
    case 'circle_geometry':
      return circleToGeoGebra(data)
    case 'polygon':
    case 'angle_measurement':
    case 'parallel_lines':
    case 'congruence':
    case 'similarity':
    case 'pythagorean_theorem':
    case 'circle_theorems':
    case 'construction':
      return polygonToGeoGebra(data)
    case 'transformation':
      return transformationToGeoGebra(data)
    default:
      return null
  }
}
