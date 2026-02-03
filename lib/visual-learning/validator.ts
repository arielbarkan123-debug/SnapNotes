/**
 * Visual Learning System - Diagram Validator
 *
 * Validates diagram data for:
 * 1. Schema correctness (required fields, types)
 * 2. Physics consistency (force angles, conservation laws)
 * 3. Mathematical validity (bounds, calculations)
 * 4. Auto-correction of common errors
 */

import {
  type DiagramType,
  type DiagramData,
  type ValidationResult,
  type ValidationError,
  type FreeBodyDiagramData,
  type InclinedPlaneData,
  type ProjectileMotionData,
  type CoordinatePlaneData,
  type NumberLineData,
  type StructuredDiagram,
  type Point,
  FORCE_ANGLE_CONVENTIONS,
  isPhysicsDiagramType,
} from './types'

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

/**
 * Validate that required fields exist and have correct types
 */
export function validateSchema(diagram: StructuredDiagram): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Check top-level structure
  if (!diagram.type) {
    errors.push({ field: 'type', message: 'Diagram type is required', severity: 'error' })
  }

  if (!diagram.data) {
    errors.push({ field: 'data', message: 'Diagram data is required', severity: 'error' })
  }

  if (!diagram.steps || !Array.isArray(diagram.steps)) {
    warnings.push({ field: 'steps', message: 'Steps array is missing or invalid', severity: 'warning' })
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, confidence: 0 }
  }

  // Type-specific validation
  const typeValidation = validateTypeSpecificSchema(diagram.type, diagram.data)
  errors.push(...typeValidation.errors)
  warnings.push(...typeValidation.warnings)

  const confidence = calculateSchemaConfidence(errors, warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    confidence,
  }
}

function validateTypeSpecificSchema(
  type: DiagramType,
  data: DiagramData
): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  switch (type) {
    case 'free_body_diagram':
      validateFBDSchema(data as FreeBodyDiagramData, errors, warnings)
      break
    case 'inclined_plane':
      validateInclinedPlaneSchema(data as InclinedPlaneData, errors, warnings)
      break
    case 'projectile_motion':
      validateProjectileSchema(data as ProjectileMotionData, errors, warnings)
      break
    case 'coordinate_plane':
      validateCoordinatePlaneSchema(data as CoordinatePlaneData, errors, warnings)
      break
    case 'number_line':
      validateNumberLineSchema(data as NumberLineData, errors, warnings)
      break
    default:
      // Generic validation for other types
      break
  }

  return { errors, warnings }
}

function validateFBDSchema(
  data: FreeBodyDiagramData,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!data.object) {
    errors.push({ field: 'data.object', message: 'FBD requires an object', severity: 'error' })
  }

  if (!data.forces || !Array.isArray(data.forces)) {
    errors.push({ field: 'data.forces', message: 'FBD requires forces array', severity: 'error' })
  } else if (data.forces.length === 0) {
    warnings.push({ field: 'data.forces', message: 'FBD has no forces', severity: 'warning' })
  } else {
    data.forces.forEach((force, i) => {
      if (force.magnitude === undefined || force.magnitude === null) {
        errors.push({
          field: `data.forces[${i}].magnitude`,
          message: `Force "${force.name}" has no magnitude`,
          severity: 'error',
        })
      }
      if (force.angle === undefined || force.angle === null) {
        errors.push({
          field: `data.forces[${i}].angle`,
          message: `Force "${force.name}" has no angle`,
          severity: 'error',
        })
      }
    })
  }
}

function validateInclinedPlaneSchema(
  data: InclinedPlaneData,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (data.angle === undefined || data.angle === null) {
    errors.push({ field: 'data.angle', message: 'Inclined plane requires angle', severity: 'error' })
  } else if (data.angle < 0 || data.angle > 90) {
    warnings.push({
      field: 'data.angle',
      message: `Angle ${data.angle}° is outside typical range (0-90°)`,
      severity: 'warning',
    })
  }

  if (!data.object) {
    errors.push({ field: 'data.object', message: 'Inclined plane requires an object', severity: 'error' })
  }

  if (!data.forces || data.forces.length === 0) {
    warnings.push({ field: 'data.forces', message: 'Inclined plane has no forces', severity: 'warning' })
  }
}

function validateProjectileSchema(
  data: ProjectileMotionData,
  errors: ValidationError[],
  _warnings: ValidationError[]
): void {
  if (!data.initial) {
    errors.push({ field: 'data.initial', message: 'Projectile requires initial conditions', severity: 'error' })
  } else {
    if (!data.initial.position) {
      errors.push({
        field: 'data.initial.position',
        message: 'Projectile requires initial position',
        severity: 'error',
      })
    }
    if (!data.initial.velocity) {
      errors.push({
        field: 'data.initial.velocity',
        message: 'Projectile requires initial velocity',
        severity: 'error',
      })
    }
  }
}

function validateCoordinatePlaneSchema(
  data: CoordinatePlaneData,
  errors: ValidationError[],
  _warnings: ValidationError[]
): void {
  if (data.xMin === undefined || data.xMax === undefined) {
    errors.push({ field: 'data.xMin/xMax', message: 'Coordinate plane requires x bounds', severity: 'error' })
  } else if (data.xMin >= data.xMax) {
    errors.push({ field: 'data.xMin/xMax', message: 'xMin must be less than xMax', severity: 'error' })
  }

  if (data.yMin === undefined || data.yMax === undefined) {
    errors.push({ field: 'data.yMin/yMax', message: 'Coordinate plane requires y bounds', severity: 'error' })
  } else if (data.yMin >= data.yMax) {
    errors.push({ field: 'data.yMin/yMax', message: 'yMin must be less than yMax', severity: 'error' })
  }
}

function validateNumberLineSchema(
  data: NumberLineData,
  errors: ValidationError[],
  _warnings: ValidationError[]
): void {
  if (data.min === undefined || data.max === undefined) {
    errors.push({ field: 'data.min/max', message: 'Number line requires min and max', severity: 'error' })
  } else if (data.min >= data.max) {
    errors.push({ field: 'data.min/max', message: 'min must be less than max', severity: 'error' })
  }
}

// =============================================================================
// PHYSICS VALIDATION
// =============================================================================

/**
 * Validate physics consistency of diagram
 */
export function validatePhysics(diagram: StructuredDiagram): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!isPhysicsDiagramType(diagram.type)) {
    return { valid: true, errors: [], warnings: [], confidence: 1.0 }
  }

  switch (diagram.type) {
    case 'free_body_diagram':
      validateFBDPhysics(diagram.data as FreeBodyDiagramData, errors, warnings)
      break
    case 'inclined_plane':
      validateInclinedPlanePhysics(diagram.data as InclinedPlaneData, errors, warnings)
      break
    case 'projectile_motion':
      validateProjectilePhysics(diagram.data as ProjectileMotionData, errors, warnings)
      break
  }

  const confidence = calculatePhysicsConfidence(errors, warnings)

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
    warnings,
    confidence,
  }
}

function validateFBDPhysics(
  data: FreeBodyDiagramData,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!data.forces) return

  // Check weight force angle
  const weightForce = data.forces.find((f) => f.type === 'weight')
  if (weightForce && Math.abs(weightForce.angle - FORCE_ANGLE_CONVENTIONS.weight) > 1) {
    errors.push({
      field: 'forces.weight.angle',
      message: `Weight force angle should be -90° (down), got ${weightForce.angle}°`,
      severity: 'error',
    })
  }

  // Check normal force on horizontal surface
  if (data.surface?.type === 'horizontal') {
    const normalForce = data.forces.find((f) => f.type === 'normal')
    if (normalForce && Math.abs(normalForce.angle - FORCE_ANGLE_CONVENTIONS.normal_horizontal) > 1) {
      errors.push({
        field: 'forces.normal.angle',
        message: `Normal force on horizontal surface should be 90° (up), got ${normalForce.angle}°`,
        severity: 'error',
      })
    }
  }

  // Check friction opposes motion (simplified check)
  const frictionForce = data.forces.find((f) => f.type === 'friction')
  if (frictionForce) {
    // Friction should be horizontal (0° or 180°) on horizontal surface
    if (data.surface?.type === 'horizontal') {
      if (Math.abs(frictionForce.angle) !== 0 && Math.abs(frictionForce.angle) !== 180) {
        warnings.push({
          field: 'forces.friction.angle',
          message: `Friction on horizontal surface should be 0° or 180°, got ${frictionForce.angle}°`,
          severity: 'warning',
        })
      }
    }
  }
}

function validateInclinedPlanePhysics(
  data: InclinedPlaneData,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!data.forces) return

  const planeAngle = data.angle

  // Check weight force
  const weightForce = data.forces.find((f) => f.type === 'weight')
  if (weightForce && Math.abs(weightForce.angle - FORCE_ANGLE_CONVENTIONS.weight) > 1) {
    errors.push({
      field: 'forces.weight.angle',
      message: `Weight force should be -90° (straight down), got ${weightForce.angle}°`,
      severity: 'error',
    })
  }

  // Check normal force perpendicular to plane
  const normalForce = data.forces.find((f) => f.type === 'normal')
  if (normalForce) {
    const expectedNormalAngle = FORCE_ANGLE_CONVENTIONS.normal_inclined(planeAngle)
    if (Math.abs(normalForce.angle - expectedNormalAngle) > 5) {
      warnings.push({
        field: 'forces.normal.angle',
        message: `Normal force should be ~${expectedNormalAngle}° (perpendicular to ${planeAngle}° slope), got ${normalForce.angle}°`,
        severity: 'warning',
      })
    }
  }

  // Check friction parallel to plane
  const frictionForce = data.forces.find((f) => f.type === 'friction')
  if (frictionForce) {
    // Friction up the slope (opposing downward motion)
    const expectedFrictionUp = 180 - planeAngle
    const expectedFrictionDown = -planeAngle

    const diffUp = Math.abs(frictionForce.angle - expectedFrictionUp)
    const diffDown = Math.abs(frictionForce.angle - expectedFrictionDown)

    if (diffUp > 5 && diffDown > 5) {
      warnings.push({
        field: 'forces.friction.angle',
        message: `Friction should be parallel to slope (~${expectedFrictionUp}° or ~${expectedFrictionDown}°), got ${frictionForce.angle}°`,
        severity: 'warning',
      })
    }
  }

  // Validate weight component magnitudes if decomposition is shown
  if (data.showDecomposition && weightForce) {
    const W = weightForce.magnitude
    const _expectedParallel = W * Math.sin((planeAngle * Math.PI) / 180) // Reserved for friction validation
    const expectedPerp = W * Math.cos((planeAngle * Math.PI) / 180)

    // Check if normal ≈ W_perp (for equilibrium perpendicular to plane)
    if (normalForce) {
      const diff = Math.abs(normalForce.magnitude - expectedPerp) / expectedPerp
      if (diff > 0.05) {
        warnings.push({
          field: 'forces.normal.magnitude',
          message: `Normal force (${normalForce.magnitude.toFixed(1)}N) should equal W⊥ (${expectedPerp.toFixed(1)}N) for equilibrium`,
          severity: 'warning',
        })
      }
    }
  }
}

function validateProjectilePhysics(
  data: ProjectileMotionData,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!data.initial?.velocity) return

  // Check launch angle is reasonable
  const angle = data.initial.velocity.angle
  if (angle < -90 || angle > 90) {
    warnings.push({
      field: 'initial.velocity.angle',
      message: `Launch angle ${angle}° is outside typical range (-90° to 90°)`,
      severity: 'warning',
    })
  }

  // Check initial velocity magnitude is positive
  if (data.initial.velocity.magnitude < 0) {
    errors.push({
      field: 'initial.velocity.magnitude',
      message: 'Initial velocity magnitude must be positive',
      severity: 'error',
    })
  }
}

// =============================================================================
// AUTO-CORRECTION
// =============================================================================

/**
 * Attempt to auto-correct common errors in diagram data
 */
export function autoCorrectDiagram(diagram: StructuredDiagram): StructuredDiagram {
  const corrected = JSON.parse(JSON.stringify(diagram)) as StructuredDiagram

  if (isPhysicsDiagramType(diagram.type)) {
    switch (diagram.type) {
      case 'free_body_diagram':
        autoCorrectFBD(corrected.data as FreeBodyDiagramData)
        break
      case 'inclined_plane':
        autoCorrectInclinedPlane(corrected.data as InclinedPlaneData)
        break
    }
  }

  return corrected
}

function autoCorrectFBD(data: FreeBodyDiagramData): void {
  if (!data.forces) return

  data.forces.forEach((force) => {
    // Ensure weight points down
    if (force.type === 'weight') {
      force.angle = FORCE_ANGLE_CONVENTIONS.weight
    }

    // Ensure normal points up on horizontal surface
    if (force.type === 'normal' && data.surface?.type === 'horizontal') {
      force.angle = FORCE_ANGLE_CONVENTIONS.normal_horizontal
    }

    // Ensure magnitude is positive
    if (force.magnitude < 0) {
      force.magnitude = Math.abs(force.magnitude)
      force.angle = (force.angle + 180) % 360
    }

    // Add default values for missing fields
    if (!force.id) {
      force.id = force.name || force.type
    }
  })
}

function autoCorrectInclinedPlane(data: InclinedPlaneData): void {
  if (!data.forces) return

  const planeAngle = data.angle

  data.forces.forEach((force) => {
    // Ensure weight points down
    if (force.type === 'weight') {
      force.angle = FORCE_ANGLE_CONVENTIONS.weight
    }

    // Correct normal force angle
    if (force.type === 'normal') {
      force.angle = FORCE_ANGLE_CONVENTIONS.normal_inclined(planeAngle)
    }

    // Ensure magnitude is positive
    if (force.magnitude < 0) {
      force.magnitude = Math.abs(force.magnitude)
    }

    // Add default ID
    if (!force.id) {
      force.id = force.name || force.type
    }
  })

  // Ensure angle is in valid range
  if (data.angle < 0) data.angle = Math.abs(data.angle)
  if (data.angle > 90) data.angle = 90
}

// =============================================================================
// COMBINED VALIDATION
// =============================================================================

/**
 * Run all validations and return combined result
 */
export function validateDiagram(diagram: StructuredDiagram): ValidationResult {
  // Schema validation
  const schemaResult = validateSchema(diagram)
  if (!schemaResult.valid) {
    return schemaResult
  }

  // Physics validation (if applicable)
  const physicsResult = validatePhysics(diagram)

  // Combine results
  const allErrors = [...schemaResult.errors, ...physicsResult.errors]
  const allWarnings = [...schemaResult.warnings, ...physicsResult.warnings]
  const combinedConfidence = schemaResult.confidence * physicsResult.confidence

  return {
    valid: allErrors.filter((e) => e.severity === 'error').length === 0,
    errors: allErrors,
    warnings: allWarnings,
    confidence: combinedConfidence,
  }
}

/**
 * Validate and auto-correct diagram
 */
export function validateAndCorrect(diagram: StructuredDiagram): {
  result: ValidationResult
  correctedDiagram: StructuredDiagram
} {
  // First validation
  let result = validateDiagram(diagram)

  // If there are correctable errors, try auto-correction
  if (!result.valid || result.warnings.length > 0) {
    const corrected = autoCorrectDiagram(diagram)
    result = validateDiagram(corrected)
    result.correctedData = corrected.data
    return { result, correctedDiagram: corrected }
  }

  return { result, correctedDiagram: diagram }
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateSchemaConfidence(
  errors: ValidationError[],
  warnings: ValidationError[]
): number {
  const errorPenalty = errors.length * 0.2
  const warningPenalty = warnings.length * 0.05
  return Math.max(0, 1 - errorPenalty - warningPenalty)
}

function calculatePhysicsConfidence(
  errors: ValidationError[],
  warnings: ValidationError[]
): number {
  const errorPenalty = errors.length * 0.15
  const warningPenalty = warnings.length * 0.05
  return Math.max(0, 1 - errorPenalty - warningPenalty)
}

/**
 * Check if two points are approximately equal
 */
export function pointsEqual(p1: Point, p2: Point, tolerance: number = 0.01): boolean {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
}

/**
 * Normalize angle to -180 to 180 range
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle % 360
  if (normalized > 180) normalized -= 360
  if (normalized < -180) normalized += 360
  return normalized
}
