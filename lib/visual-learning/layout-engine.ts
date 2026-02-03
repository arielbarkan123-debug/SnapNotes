/**
 * Visual Learning System - Layout Engine
 *
 * Handles:
 * 1. Collision detection between diagram elements
 * 2. Smart label positioning to avoid overlaps
 * 3. Force vector origin calculations based on force type
 * 4. Automatic layout adjustment
 */

import {
  type Point,
  type BoundingBox,
  type LayoutElement,
  type LayoutResult,
  type Collision,
  type ForceType,
  type PhysicsObject,
} from './types'

/**
 * Minimal force info needed for origin calculation
 * Compatible with both physics.ts Force and visual-learning Force
 */
export interface ForceOriginInput {
  type: ForceType
  angle: number
  origin?: Point | 'center' | 'surface' | 'attachment'
}

/**
 * Force info needed for layout calculations
 * Compatible with both physics.ts Force and visual-learning Force
 */
export interface ForceLayoutInput extends ForceOriginInput {
  id?: string
  name: string
  magnitude?: number
  symbol?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Minimum spacing between elements
 */
const MIN_SPACING = 8

/**
 * Label offset from anchor point
 */
const LABEL_OFFSET = 18

/**
 * Priority levels for different element types
 * Higher priority = less likely to be moved
 */
const ELEMENT_PRIORITY: Record<string, number> = {
  object: 100, // Never move the main object
  axis: 90, // Axes should stay in place
  force: 70, // Force vectors have medium priority
  label: 30, // Labels can be moved easily
  annotation: 20, // Annotations are most flexible
}

/**
 * Force origin rules based on force type
 */
const FORCE_ORIGIN_RULES: Record<
  ForceType,
  'center' | 'surface_contact' | 'surface_front' | 'attachment' | 'edge'
> = {
  weight: 'center',
  normal: 'surface_contact',
  friction: 'surface_front',
  tension: 'attachment',
  applied: 'edge',
  spring: 'attachment',
  drag: 'center',
  lift: 'center',
  thrust: 'edge',
  buoyancy: 'center',
  electric: 'center',
  magnetic: 'center',
  centripetal: 'center',
  net: 'center',
  component: 'center',
  custom: 'center',
  drive: 'edge',
  resistance: 'center',
  reaction: 'surface_contact',
}

// =============================================================================
// BOUNDING BOX UTILITIES
// =============================================================================

/**
 * Create bounding box from center point and dimensions
 */
export function createBoundingBox(
  center: Point,
  width: number,
  height: number
): BoundingBox {
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  }
}

/**
 * Create bounding box for a label
 */
export function createLabelBounds(
  position: Point,
  text: string,
  fontSize: number = 14
): BoundingBox {
  // Estimate text dimensions
  const charWidth = fontSize * 0.6
  const width = text.length * charWidth + 16 // padding
  const height = fontSize + 10 // padding

  return {
    x: position.x - width / 2,
    y: position.y - height / 2,
    width,
    height,
  }
}

/**
 * Create bounding box for a force vector arrow
 */
export function createForceBounds(
  origin: Point,
  angle: number,
  length: number,
  strokeWidth: number = 3
): BoundingBox {
  const angleRad = (angle * Math.PI) / 180
  const endX = origin.x + length * Math.cos(angleRad)
  const endY = origin.y - length * Math.sin(angleRad)

  const minX = Math.min(origin.x, endX) - strokeWidth
  const maxX = Math.max(origin.x, endX) + strokeWidth
  const minY = Math.min(origin.y, endY) - strokeWidth
  const maxY = Math.max(origin.y, endY) + strokeWidth

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Check if two bounding boxes overlap
 */
export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}

/**
 * Calculate overlap area between two boxes
 */
export function getOverlapArea(a: BoundingBox, b: BoundingBox): number {
  if (!boxesOverlap(a, b)) return 0

  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)

  return Math.max(0, overlapX) * Math.max(0, overlapY)
}

/**
 * Get the overlap bounding box
 */
export function getOverlapBox(a: BoundingBox, b: BoundingBox): BoundingBox | null {
  if (!boxesOverlap(a, b)) return null

  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const width = Math.min(a.x + a.width, b.x + b.width) - x
  const height = Math.min(a.y + a.height, b.y + b.height) - y

  return { x, y, width, height }
}

/**
 * Expand bounding box by padding
 */
export function expandBox(box: BoundingBox, padding: number): BoundingBox {
  return {
    x: box.x - padding,
    y: box.y - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  }
}

// =============================================================================
// COLLISION DETECTION
// =============================================================================

/**
 * Detect all collisions between layout elements
 */
export function detectCollisions(elements: LayoutElement[]): Collision[] {
  const collisions: Collision[] = []

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i]
      const b = elements[j]

      // Add spacing to bounds for collision check
      const aExpanded = expandBox(a.bounds, MIN_SPACING / 2)
      const bExpanded = expandBox(b.bounds, MIN_SPACING / 2)

      if (boxesOverlap(aExpanded, bExpanded)) {
        const overlap = getOverlapBox(aExpanded, bExpanded)
        if (overlap) {
          const maxArea = Math.max(
            a.bounds.width * a.bounds.height,
            b.bounds.width * b.bounds.height
          )
          const severity = getOverlapArea(aExpanded, bExpanded) / maxArea

          collisions.push({
            element1: a.id,
            element2: b.id,
            overlap,
            severity: Math.min(1, severity),
          })
        }
      }
    }
  }

  return collisions
}

/**
 * Check if a position causes any collision
 */
export function checkCollision(
  position: Point,
  bounds: BoundingBox,
  existingElements: LayoutElement[],
  excludeIds: string[] = []
): boolean {
  const testBox: BoundingBox = {
    x: position.x - bounds.width / 2,
    y: position.y - bounds.height / 2,
    width: bounds.width,
    height: bounds.height,
  }

  const expanded = expandBox(testBox, MIN_SPACING / 2)

  for (const element of existingElements) {
    if (excludeIds.includes(element.id)) continue

    const elementExpanded = expandBox(element.bounds, MIN_SPACING / 2)
    if (boxesOverlap(expanded, elementExpanded)) {
      return true
    }
  }

  return false
}

// =============================================================================
// FORCE ORIGIN CALCULATIONS
// =============================================================================

/**
 * Calculate force origin based on force type and object geometry
 */
export function calculateForceOrigin(
  force: ForceOriginInput,
  object: PhysicsObject,
  surfaceAngle: number = 0
): Point {
  const rule = FORCE_ORIGIN_RULES[force.type] || 'center'
  const center = object.position
  const size = typeof object.size === 'number' ? object.size : Math.max(object.size.width, object.size.height)
  const halfSize = size / 2

  switch (rule) {
    case 'center':
      return { ...center }

    case 'surface_contact':
      // Point on the surface of the object where it contacts the surface
      const surfaceRad = (surfaceAngle * Math.PI) / 180
      return {
        x: center.x - halfSize * Math.sin(surfaceRad),
        y: center.y + halfSize * Math.cos(surfaceRad),
      }

    case 'surface_front':
      // Front edge of the contact surface (for friction)
      const frontRad = (surfaceAngle * Math.PI) / 180
      const frictionDir = force.angle > 90 || force.angle < -90 ? -1 : 1
      return {
        x: center.x - halfSize * Math.sin(frontRad) + frictionDir * halfSize * 0.5 * Math.cos(frontRad),
        y: center.y + halfSize * Math.cos(frontRad) + frictionDir * halfSize * 0.5 * Math.sin(frontRad),
      }

    case 'attachment':
      // If force has explicit origin, use it
      if (force.origin && typeof force.origin === 'object' && 'x' in force.origin) {
        return force.origin as Point
      }
      // Otherwise, use edge in force direction
      return getEdgePoint(center, halfSize, force.angle)

    case 'edge':
      return getEdgePoint(center, halfSize, force.angle)

    default:
      return { ...center }
  }
}

/**
 * Get point on edge of object in given direction
 */
function getEdgePoint(center: Point, halfSize: number, angle: number): Point {
  const angleRad = (angle * Math.PI) / 180
  return {
    x: center.x + halfSize * Math.cos(angleRad),
    y: center.y - halfSize * Math.sin(angleRad),
  }
}

/**
 * Calculate force origins for all forces, ensuring no overlaps at origin
 */
export function calculateForceOrigins(
  forces: ForceLayoutInput[],
  object: PhysicsObject,
  surfaceAngle: number = 0
): Map<string, Point> {
  const origins = new Map<string, Point>()

  // Group forces by origin rule
  const forcesByRule = new Map<string, ForceLayoutInput[]>()
  for (const force of forces) {
    const rule = FORCE_ORIGIN_RULES[force.type] || 'center'
    const existing = forcesByRule.get(rule) || []
    existing.push(force)
    forcesByRule.set(rule, existing)
  }

  // Calculate origins, offsetting if multiple forces share same origin
  for (const [_rule, ruleForces] of forcesByRule) {
    if (ruleForces.length === 1) {
      const force = ruleForces[0]
      origins.set(force.id || force.name, calculateForceOrigin(force, object, surfaceAngle))
    } else {
      // Multiple forces at same origin point - spread them slightly
      const baseOrigin = calculateForceOrigin(ruleForces[0], object, surfaceAngle)
      const spreadRadius = 5

      ruleForces.forEach((force, index) => {
        const spreadAngle = (index / ruleForces.length) * 2 * Math.PI
        origins.set(force.id || force.name, {
          x: baseOrigin.x + spreadRadius * Math.cos(spreadAngle),
          y: baseOrigin.y + spreadRadius * Math.sin(spreadAngle),
        })
      })
    }
  }

  return origins
}

// =============================================================================
// LABEL POSITIONING
// =============================================================================

/**
 * Label position candidates in priority order
 */
const LABEL_POSITION_OFFSETS = [
  { dx: 0, dy: -1 }, // above
  { dx: 1, dy: -1 }, // top-right
  { dx: 1, dy: 0 }, // right
  { dx: 1, dy: 1 }, // bottom-right
  { dx: 0, dy: 1 }, // below
  { dx: -1, dy: 1 }, // bottom-left
  { dx: -1, dy: 0 }, // left
  { dx: -1, dy: -1 }, // top-left
]

/**
 * Find best position for a label to avoid collisions
 */
export function findLabelPosition(
  anchor: Point,
  labelText: string,
  existingElements: LayoutElement[],
  preferredDirection?: number, // angle in degrees
  fontSize: number = 14
): Point {
  const labelBounds = createLabelBounds({ x: 0, y: 0 }, labelText, fontSize)
  const offset = LABEL_OFFSET

  // If preferred direction specified, try that first
  if (preferredDirection !== undefined) {
    const rad = (preferredDirection * Math.PI) / 180
    const candidate = {
      x: anchor.x + offset * Math.cos(rad),
      y: anchor.y - offset * Math.sin(rad),
    }

    if (!checkCollision(candidate, labelBounds, existingElements)) {
      return candidate
    }
  }

  // Try each position in priority order
  for (const { dx, dy } of LABEL_POSITION_OFFSETS) {
    const candidate = {
      x: anchor.x + dx * offset,
      y: anchor.y + dy * offset,
    }

    if (!checkCollision(candidate, labelBounds, existingElements)) {
      return candidate
    }
  }

  // Try further out
  for (const { dx, dy } of LABEL_POSITION_OFFSETS) {
    const candidate = {
      x: anchor.x + dx * offset * 1.5,
      y: anchor.y + dy * offset * 1.5,
    }

    if (!checkCollision(candidate, labelBounds, existingElements)) {
      return candidate
    }
  }

  // Fallback: use preferred direction or default
  const fallbackAngle = preferredDirection ?? 45
  const rad = (fallbackAngle * Math.PI) / 180
  return {
    x: anchor.x + offset * 2 * Math.cos(rad),
    y: anchor.y - offset * 2 * Math.sin(rad),
  }
}

/**
 * Position label at end of force arrow
 */
export function positionForceLabel(
  force: ForceLayoutInput,
  origin: Point,
  length: number,
  existingElements: LayoutElement[],
  fontSize: number = 14
): Point {
  const angleRad = (force.angle * Math.PI) / 180
  const arrowEnd = {
    x: origin.x + length * Math.cos(angleRad),
    y: origin.y - length * Math.sin(angleRad),
  }

  const labelText = force.symbol || force.name
  return findLabelPosition(arrowEnd, labelText, existingElements, force.angle, fontSize)
}

// =============================================================================
// LAYOUT ALGORITHM
// =============================================================================

/**
 * Resolve collisions by moving lower-priority elements
 */
export function resolveCollisions(elements: LayoutElement[]): LayoutResult {
  const adjustments = new Map<string, { dx: number; dy: number }>()
  const positions = new Map<string, Point>()

  // Initialize positions
  elements.forEach((el) => {
    positions.set(el.id, { ...el.position })
    adjustments.set(el.id, { dx: 0, dy: 0 })
  })

  // Sort by priority (higher priority elements are less likely to move)
  const _sorted = [...elements].sort((a, b) => b.priority - a.priority)

  // Iteratively resolve collisions
  let iterations = 0
  const maxIterations = 50
  let collisions = detectCollisions(elements)

  while (collisions.length > 0 && iterations < maxIterations) {
    for (const collision of collisions) {
      const el1 = elements.find((e) => e.id === collision.element1)!
      const el2 = elements.find((e) => e.id === collision.element2)!

      // Move the lower priority element
      const toMove = el1.priority < el2.priority ? el1 : el2
      const fixed = el1.priority < el2.priority ? el2 : el1

      // Calculate push direction
      const movePos = positions.get(toMove.id)!
      const fixedPos = positions.get(fixed.id)!

      const dx = movePos.x - fixedPos.x
      const dy = movePos.y - fixedPos.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      // Normalize and scale push
      const pushDist = MIN_SPACING + collision.overlap.width / 2
      const pushX = (dx / dist) * pushDist
      const pushY = (dy / dist) * pushDist

      // Apply adjustment
      const currentAdj = adjustments.get(toMove.id)!
      adjustments.set(toMove.id, {
        dx: currentAdj.dx + pushX,
        dy: currentAdj.dy + pushY,
      })

      // Update position
      positions.set(toMove.id, {
        x: movePos.x + pushX,
        y: movePos.y + pushY,
      })

      // Update bounds
      toMove.position = positions.get(toMove.id)!
      toMove.bounds = {
        ...toMove.bounds,
        x: toMove.bounds.x + pushX,
        y: toMove.bounds.y + pushY,
      }
    }

    // Recalculate collisions
    collisions = detectCollisions(elements)
    iterations++
  }

  return {
    elements: positions,
    adjustments,
    collisions, // Remaining unresolved collisions
    success: collisions.length === 0,
  }
}

/**
 * Calculate complete layout for a physics diagram
 */
export function calculatePhysicsLayout(
  object: PhysicsObject,
  forces: ForceLayoutInput[],
  canvasSize: { width: number; height: number },
  options: {
    surfaceAngle?: number
    showLabels?: boolean
    forceScale?: number
  } = {}
): {
  objectPosition: Point
  forceOrigins: Map<string, Point>
  labelPositions: Map<string, Point>
  axisPosition?: Point
} {
  const { surfaceAngle = 0, showLabels = true, forceScale = 1.5 } = options

  // Calculate force origins
  const forceOrigins = calculateForceOrigins(forces, object, surfaceAngle)

  // Build layout elements
  const elements: LayoutElement[] = []

  // Add object
  const objSize = typeof object.size === 'number' ? object.size : Math.max(object.size.width, object.size.height)
  elements.push({
    id: 'object',
    type: 'object',
    position: object.position,
    bounds: createBoundingBox(object.position, objSize, objSize),
    priority: ELEMENT_PRIORITY.object,
  })

  // Add forces
  forces.forEach((force) => {
    const origin = forceOrigins.get(force.id || force.name)!
    const length = (force.magnitude || 30) * forceScale
    const bounds = createForceBounds(origin, force.angle, length)

    elements.push({
      id: `force-${force.id || force.name}`,
      type: 'force',
      position: origin,
      bounds,
      priority: ELEMENT_PRIORITY.force,
      anchor: origin,
    })
  })

  // Calculate label positions
  const labelPositions = new Map<string, Point>()

  if (showLabels) {
    forces.forEach((force) => {
      const origin = forceOrigins.get(force.id || force.name)!
      const length = (force.magnitude || 30) * forceScale
      const labelPos = positionForceLabel(force, origin, length, elements)

      labelPositions.set(force.id || force.name, labelPos)

      // Add label to elements for collision detection with other labels
      const labelText = force.symbol || force.name
      elements.push({
        id: `label-${force.id || force.name}`,
        type: 'label',
        position: labelPos,
        bounds: createLabelBounds(labelPos, labelText),
        priority: ELEMENT_PRIORITY.label,
        anchor: origin,
      })
    })
  }

  // Resolve any remaining collisions
  resolveCollisions(elements)

  // Update label positions from resolved layout
  elements.forEach((el) => {
    if (el.type === 'label') {
      const forceId = el.id.replace('label-', '')
      labelPositions.set(forceId, el.position)
    }
  })

  return {
    objectPosition: object.position,
    forceOrigins,
    labelPositions,
  }
}

// =============================================================================
// COORDINATE AXES POSITIONING
// =============================================================================

/**
 * Find best position for coordinate axes (corner placement)
 */
export function findAxesPosition(
  canvasSize: { width: number; height: number },
  existingElements: LayoutElement[],
  axisLength: number = 40
): Point {
  const margin = 15
  const boxSize = axisLength + 30

  // Try corners in order: top-right, top-left, bottom-right, bottom-left
  const corners: Point[] = [
    { x: canvasSize.width - margin - boxSize / 2, y: margin + boxSize / 2 },
    { x: margin + boxSize / 2, y: margin + boxSize / 2 },
    { x: canvasSize.width - margin - boxSize / 2, y: canvasSize.height - margin - boxSize / 2 },
    { x: margin + boxSize / 2, y: canvasSize.height - margin - boxSize / 2 },
  ]

  const axisBounds: BoundingBox = { x: 0, y: 0, width: boxSize, height: boxSize }

  for (const corner of corners) {
    if (!checkCollision(corner, axisBounds, existingElements)) {
      return corner
    }
  }

  // Fallback to top-right
  return corners[0]
}

// =============================================================================
// EXPORTS
// =============================================================================

export const LayoutEngine = {
  // Bounding box utilities
  createBoundingBox,
  createLabelBounds,
  createForceBounds,
  boxesOverlap,
  getOverlapArea,
  expandBox,

  // Collision detection
  detectCollisions,
  checkCollision,

  // Force positioning
  calculateForceOrigin,
  calculateForceOrigins,

  // Label positioning
  findLabelPosition,
  positionForceLabel,

  // Layout algorithms
  resolveCollisions,
  calculatePhysicsLayout,
  findAxesPosition,
}

export default LayoutEngine
