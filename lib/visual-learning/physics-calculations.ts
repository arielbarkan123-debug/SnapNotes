/**
 * Physics Calculation Utilities
 *
 * Provides calculation functions for interactive physics diagrams.
 * Each calculator takes parameter values and returns CalculationResult arrays.
 */

import type { CalculationResult, ParameterDefinition, ExplorationSuggestion } from '@/types/interactivity'
import { PHYSICS_PARAMETER_PRESETS } from '@/types/interactivity'

// =============================================================================
// Constants
// =============================================================================

/** Standard gravitational acceleration (m/s²) */
export const GRAVITY = 9.8

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * Math.PI / 180
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * 180 / Math.PI
}

/**
 * Format a number with specified decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

/**
 * Create a formatted result
 */
export function createResult(
  value: number,
  unit: string,
  label: string,
  options: Partial<CalculationResult> = {}
): CalculationResult {
  return {
    value,
    unit,
    label,
    description: options.description || label,
    formatted: `${formatNumber(value)} ${unit}`,
    ...options,
  }
}

// =============================================================================
// Inclined Plane Calculator
// =============================================================================

export interface InclinedPlaneParams {
  mass: number      // kg
  angle: number     // degrees
  friction?: number // coefficient (0-1)
  gravity?: number  // m/s²
}

export interface InclinedPlaneResults {
  weight: number
  weightParallel: number
  weightPerpendicular: number
  normalForce: number
  frictionForce: number
  maxStaticFriction: number
  netForce: number
  acceleration: number
  isSliding: boolean
}

/**
 * Calculate inclined plane physics
 */
export function calculateInclinedPlane(params: InclinedPlaneParams): InclinedPlaneResults {
  const { mass, angle, friction = 0, gravity = GRAVITY } = params

  const theta = toRadians(angle)
  const weight = mass * gravity
  const weightParallel = weight * Math.sin(theta)
  const weightPerpendicular = weight * Math.cos(theta)
  const normalForce = weightPerpendicular
  const maxStaticFriction = friction * normalForce
  const isSliding = weightParallel > maxStaticFriction
  const frictionForce = isSliding ? maxStaticFriction : weightParallel
  const netForce = isSliding ? weightParallel - frictionForce : 0
  const acceleration = netForce / mass

  return {
    weight,
    weightParallel,
    weightPerpendicular,
    normalForce,
    frictionForce,
    maxStaticFriction,
    netForce,
    acceleration,
    isSliding,
  }
}

/**
 * Get CalculationResult array for inclined plane
 */
export function getInclinedPlaneResults(params: InclinedPlaneParams): CalculationResult[] {
  const results = calculateInclinedPlane(params)

  return [
    createResult(results.acceleration, 'm/s²', 'Acceleration', {
      labelHe: 'תאוצה',
      description: 'Acceleration down the incline',
      descriptionHe: 'תאוצה במורד המישור',
      isPrimary: true,
    }),
    createResult(results.weight, 'N', 'Weight', {
      labelHe: 'משקל',
      description: 'Total weight force (mg)',
      descriptionHe: 'כוח המשקל הכולל',
    }),
    createResult(results.weightParallel, 'N', 'W parallel', {
      labelHe: 'רכיב מקביל',
      description: 'Weight component parallel to incline (mg·sin θ)',
      descriptionHe: 'רכיב המשקל המקביל למישור',
    }),
    createResult(results.weightPerpendicular, 'N', 'W perpendicular', {
      labelHe: 'רכיב ניצב',
      description: 'Weight component perpendicular to incline (mg·cos θ)',
      descriptionHe: 'רכיב המשקל הניצב למישור',
    }),
    createResult(results.normalForce, 'N', 'Normal Force', {
      labelHe: 'כוח נורמלי',
      description: 'Normal force from surface',
      descriptionHe: 'כוח הנורמל מהמשטח',
    }),
    createResult(results.frictionForce, 'N', 'Friction', {
      labelHe: 'חיכוך',
      description: results.isSliding ? 'Kinetic friction' : 'Static friction',
      descriptionHe: results.isSliding ? 'חיכוך קינטי' : 'חיכוך סטטי',
    }),
  ]
}

/**
 * Parameter definitions for inclined plane
 */
export const INCLINED_PLANE_PARAMETERS: ParameterDefinition[] = [
  { ...PHYSICS_PARAMETER_PRESETS.mass, default: 5, max: 20 },
  { ...PHYSICS_PARAMETER_PRESETS.angle, default: 30, max: 60 },
  { ...PHYSICS_PARAMETER_PRESETS.friction, name: 'friction', default: 0.3 },
]

/**
 * Exploration suggestions for inclined plane
 */
export const INCLINED_PLANE_SUGGESTIONS: ExplorationSuggestion[] = [
  {
    id: 'steep-angle',
    question: 'What if the angle was steeper?',
    questionHe: 'מה אם הזווית הייתה תלולה יותר?',
    parameterChanges: { angle: 45 },
    insight: 'A steeper angle increases the parallel component of weight, making sliding more likely.',
    insightHe: 'זווית תלולה יותר מגדילה את הרכיב המקביל של המשקל, ומגדילה את הסיכוי להחלקה.',
  },
  {
    id: 'no-friction',
    question: 'What if there was no friction?',
    questionHe: 'מה אם לא היה חיכוך?',
    parameterChanges: { friction: 0 },
    insight: 'Without friction, the object will always slide down regardless of angle (except 0°).',
    insightHe: 'ללא חיכוך, העצם יחליק תמיד (למעט בזווית 0°).',
  },
  {
    id: 'critical-angle',
    question: 'What angle makes it start sliding?',
    questionHe: 'באיזו זווית העצם מתחיל להחליק?',
    parameterChanges: { angle: 17 }, // arctan(0.3) ≈ 17° for μ=0.3
    insight: 'The critical angle depends on the friction coefficient: tan(θ) = μ.',
    insightHe: 'הזווית הקריטית תלויה במקדם החיכוך: tan(θ) = μ.',
  },
  {
    id: 'double-mass',
    question: 'What if the mass was doubled?',
    questionHe: 'מה אם המסה הייתה כפולה?',
    parameterChanges: { mass: 10 },
    insight: 'Doubling mass doubles all forces, but acceleration stays the same (a = g·sin θ - μ·g·cos θ).',
    insightHe: 'הכפלת המסה מכפילה את כל הכוחות, אך התאוצה נשארת זהה.',
  },
]

// =============================================================================
// Free Body Diagram Calculator
// =============================================================================

export interface FBDParams {
  mass: number
  appliedForce?: number
  appliedAngle?: number  // degrees from horizontal
  friction?: number
  gravity?: number
}

export interface FBDResults {
  weight: number
  normalForce: number
  appliedForceX: number
  appliedForceY: number
  frictionForce: number
  netForceX: number
  netForceY: number
  netForceMagnitude: number
  accelerationX: number
  accelerationY: number
}

/**
 * Calculate free body diagram physics
 */
export function calculateFBD(params: FBDParams): FBDResults {
  const {
    mass,
    appliedForce = 0,
    appliedAngle = 0,
    friction = 0,
    gravity = GRAVITY,
  } = params

  const theta = toRadians(appliedAngle)
  const weight = mass * gravity
  const appliedForceX = appliedForce * Math.cos(theta)
  const appliedForceY = appliedForce * Math.sin(theta)

  // Normal force must balance weight and vertical component of applied force
  const normalForce = Math.max(0, weight - appliedForceY)

  // Friction opposes motion
  const maxFriction = friction * normalForce
  const frictionForce = Math.min(maxFriction, Math.abs(appliedForceX)) * (appliedForceX > 0 ? -1 : 1)

  // Net forces
  const netForceX = appliedForceX + frictionForce
  const netForceY = normalForce + appliedForceY - weight
  const netForceMagnitude = Math.sqrt(netForceX ** 2 + netForceY ** 2)

  // Accelerations
  const accelerationX = netForceX / mass
  const accelerationY = netForceY / mass

  return {
    weight,
    normalForce,
    appliedForceX,
    appliedForceY,
    frictionForce: Math.abs(frictionForce),
    netForceX,
    netForceY,
    netForceMagnitude,
    accelerationX,
    accelerationY,
  }
}

/**
 * Get CalculationResult array for FBD
 */
export function getFBDResults(params: FBDParams): CalculationResult[] {
  const results = calculateFBD(params)

  return [
    createResult(results.accelerationX, 'm/s²', 'Acceleration', {
      labelHe: 'תאוצה',
      description: 'Horizontal acceleration',
      descriptionHe: 'תאוצה אופקית',
      isPrimary: true,
    }),
    createResult(results.weight, 'N', 'Weight', {
      labelHe: 'משקל',
    }),
    createResult(results.normalForce, 'N', 'Normal Force', {
      labelHe: 'כוח נורמלי',
    }),
    ...(params.appliedForce ? [createResult(params.appliedForce, 'N', 'Applied Force', {
      labelHe: 'כוח מופעל',
    })] : []),
    createResult(results.frictionForce, 'N', 'Friction', {
      labelHe: 'חיכוך',
    }),
    createResult(results.netForceMagnitude, 'N', 'Net Force', {
      labelHe: 'כוח שקול',
    }),
  ]
}

/**
 * Parameter definitions for FBD
 */
export const FBD_PARAMETERS: ParameterDefinition[] = [
  { ...PHYSICS_PARAMETER_PRESETS.mass, default: 5, max: 50 },
  { ...PHYSICS_PARAMETER_PRESETS.force, name: 'appliedForce', label: 'Applied Force', labelHe: 'כוח מופעל', default: 20, max: 100 },
  { ...PHYSICS_PARAMETER_PRESETS.angle, name: 'appliedAngle', label: 'Force Angle', labelHe: 'זווית הכוח', default: 0, min: -45, max: 45, category: 'angle' },
  { ...PHYSICS_PARAMETER_PRESETS.friction, name: 'friction', default: 0.2 },
]

// =============================================================================
// Projectile Motion Calculator
// =============================================================================

export interface ProjectileParams {
  initialVelocity: number  // m/s
  launchAngle: number      // degrees
  initialHeight?: number   // m
  gravity?: number         // m/s²
}

export interface ProjectileResults {
  v0x: number
  v0y: number
  timeOfFlight: number
  maxHeight: number
  range: number
  peakTime: number
}

/**
 * Calculate projectile motion
 */
export function calculateProjectile(params: ProjectileParams): ProjectileResults {
  const {
    initialVelocity,
    launchAngle,
    initialHeight = 0,
    gravity = GRAVITY,
  } = params

  const theta = toRadians(launchAngle)
  const v0x = initialVelocity * Math.cos(theta)
  const v0y = initialVelocity * Math.sin(theta)

  // Time to reach peak
  const peakTime = v0y / gravity

  // Max height above launch point
  const maxHeight = initialHeight + (v0y ** 2) / (2 * gravity)

  // Time of flight (quadratic formula)
  const discriminant = v0y ** 2 + 2 * gravity * initialHeight
  const timeOfFlight = (v0y + Math.sqrt(discriminant)) / gravity

  // Horizontal range
  const range = v0x * timeOfFlight

  return {
    v0x,
    v0y,
    timeOfFlight,
    maxHeight,
    range,
    peakTime,
  }
}

/**
 * Get CalculationResult array for projectile
 */
export function getProjectileResults(params: ProjectileParams): CalculationResult[] {
  const results = calculateProjectile(params)

  return [
    createResult(results.range, 'm', 'Range', {
      labelHe: 'טווח',
      description: 'Horizontal distance traveled',
      descriptionHe: 'מרחק אופקי',
      isPrimary: true,
    }),
    createResult(results.maxHeight, 'm', 'Max Height', {
      labelHe: 'גובה מקסימלי',
      description: 'Maximum height reached',
      descriptionHe: 'הגובה המקסימלי',
    }),
    createResult(results.timeOfFlight, 's', 'Time of Flight', {
      labelHe: 'זמן תעופה',
    }),
    createResult(results.v0x, 'm/s', 'v₀ₓ', {
      labelHe: 'v₀ₓ',
      description: 'Initial horizontal velocity',
      descriptionHe: 'מהירות אופקית התחלתית',
    }),
    createResult(results.v0y, 'm/s', 'v₀ᵧ', {
      labelHe: 'v₀ᵧ',
      description: 'Initial vertical velocity',
      descriptionHe: 'מהירות אנכית התחלתית',
    }),
  ]
}

/**
 * Parameter definitions for projectile
 */
export const PROJECTILE_PARAMETERS: ParameterDefinition[] = [
  { ...PHYSICS_PARAMETER_PRESETS.velocity, name: 'initialVelocity', label: 'Initial Velocity', labelHe: 'מהירות התחלתית', default: 20, max: 50 },
  { ...PHYSICS_PARAMETER_PRESETS.angle, name: 'launchAngle', label: 'Launch Angle', labelHe: 'זווית שיגור', default: 45, min: 15, max: 75 },
  { ...PHYSICS_PARAMETER_PRESETS.height, name: 'initialHeight', label: 'Initial Height', labelHe: 'גובה התחלתי', default: 0, max: 20 },
]

/**
 * Exploration suggestions for projectile
 */
export const PROJECTILE_SUGGESTIONS: ExplorationSuggestion[] = [
  {
    id: 'optimal-angle',
    question: 'What angle gives maximum range?',
    questionHe: 'באיזו זווית מתקבל הטווח המקסימלי?',
    parameterChanges: { launchAngle: 45 },
    insight: 'For flat ground, 45° gives maximum range. Different angles give equal range.',
    insightHe: 'על קרקע שטוחה, 45° נותנת טווח מקסימלי.',
  },
  {
    id: 'high-angle',
    question: 'What if launched nearly vertical?',
    questionHe: 'מה אם נשגר כמעט אנכית?',
    parameterChanges: { launchAngle: 75 },
    insight: 'High angles give more height but less range.',
    insightHe: 'זוויות גבוהות נותנות יותר גובה אך פחות טווח.',
  },
  {
    id: 'low-angle',
    question: 'What if launched at a low angle?',
    questionHe: 'מה אם נשגר בזווית נמוכה?',
    parameterChanges: { launchAngle: 15 },
    insight: 'Low angles give less height but faster travel time.',
    insightHe: 'זוויות נמוכות נותנות פחות גובה אך זמן תעופה קצר יותר.',
  },
  {
    id: 'double-velocity',
    question: 'What if velocity was doubled?',
    questionHe: 'מה אם המהירות הייתה כפולה?',
    parameterChanges: { initialVelocity: 40 },
    insight: 'Doubling velocity quadruples the range (range ∝ v²).',
    insightHe: 'הכפלת המהירות מכפילה את הטווח פי 4.',
  },
]

// =============================================================================
// Circular Motion Calculator
// =============================================================================

export interface CircularMotionParams {
  mass: number
  velocity: number
  radius: number
  gravity?: number
}

export interface CircularMotionResults {
  centripetalAcceleration: number
  centripetalForce: number
  period: number
  frequency: number
  angularVelocity: number
}

/**
 * Calculate circular motion
 */
export function calculateCircularMotion(params: CircularMotionParams): CircularMotionResults {
  const { mass, velocity, radius, gravity = GRAVITY } = params

  const centripetalAcceleration = velocity ** 2 / radius
  const centripetalForce = mass * centripetalAcceleration
  const angularVelocity = velocity / radius
  const period = 2 * Math.PI / angularVelocity
  const frequency = 1 / period

  return {
    centripetalAcceleration,
    centripetalForce,
    period,
    frequency,
    angularVelocity,
  }
}

/**
 * Get CalculationResult array for circular motion
 */
export function getCircularMotionResults(params: CircularMotionParams): CalculationResult[] {
  const results = calculateCircularMotion(params)

  return [
    createResult(results.centripetalForce, 'N', 'Centripetal Force', {
      labelHe: 'כוח צנטריפטלי',
      description: 'Force toward center',
      descriptionHe: 'כוח לכיוון המרכז',
      isPrimary: true,
    }),
    createResult(results.centripetalAcceleration, 'm/s²', 'Centripetal Acceleration', {
      labelHe: 'תאוצה צנטריפטלית',
    }),
    createResult(results.period, 's', 'Period', {
      labelHe: 'מחזור',
      description: 'Time for one revolution',
      descriptionHe: 'זמן לסיבוב אחד',
    }),
    createResult(results.frequency, 'Hz', 'Frequency', {
      labelHe: 'תדירות',
    }),
    createResult(results.angularVelocity, 'rad/s', 'Angular Velocity', {
      labelHe: 'מהירות זוויתית',
    }),
  ]
}

/**
 * Parameter definitions for circular motion
 */
export const CIRCULAR_MOTION_PARAMETERS: ParameterDefinition[] = [
  { ...PHYSICS_PARAMETER_PRESETS.mass, default: 2 },
  { ...PHYSICS_PARAMETER_PRESETS.velocity, default: 5, max: 20 },
  { ...PHYSICS_PARAMETER_PRESETS.radius, default: 2, max: 5 },
]

// =============================================================================
// Collision Calculator
// =============================================================================

export interface CollisionParams {
  mass1: number
  mass2: number
  velocity1: number
  velocity2: number
  elasticity?: number  // 0 = perfectly inelastic, 1 = perfectly elastic
}

export interface CollisionResults {
  v1Final: number
  v2Final: number
  momentumInitial: number
  momentumFinal: number
  kineticEnergyInitial: number
  kineticEnergyFinal: number
  energyLoss: number
}

/**
 * Calculate collision
 */
export function calculateCollision(params: CollisionParams): CollisionResults {
  const { mass1, mass2, velocity1, velocity2, elasticity = 1 } = params

  const totalMass = mass1 + mass2
  const momentumInitial = mass1 * velocity1 + mass2 * velocity2

  // For elastic/inelastic collisions
  // v1f = ((m1 - e*m2)v1 + (1+e)*m2*v2) / (m1 + m2)
  // v2f = ((m2 - e*m1)v2 + (1+e)*m1*v1) / (m1 + m2)

  const v1Final = ((mass1 - elasticity * mass2) * velocity1 + (1 + elasticity) * mass2 * velocity2) / totalMass
  const v2Final = ((mass2 - elasticity * mass1) * velocity2 + (1 + elasticity) * mass1 * velocity1) / totalMass

  const momentumFinal = mass1 * v1Final + mass2 * v2Final
  const kineticEnergyInitial = 0.5 * mass1 * velocity1 ** 2 + 0.5 * mass2 * velocity2 ** 2
  const kineticEnergyFinal = 0.5 * mass1 * v1Final ** 2 + 0.5 * mass2 * v2Final ** 2
  const energyLoss = kineticEnergyInitial - kineticEnergyFinal

  return {
    v1Final,
    v2Final,
    momentumInitial,
    momentumFinal,
    kineticEnergyInitial,
    kineticEnergyFinal,
    energyLoss,
  }
}

/**
 * Get CalculationResult array for collision
 */
export function getCollisionResults(params: CollisionParams): CalculationResult[] {
  const results = calculateCollision(params)

  return [
    createResult(results.v1Final, 'm/s', 'v₁ final', {
      labelHe: 'v₁ סופית',
      description: 'Final velocity of object 1',
      descriptionHe: 'מהירות סופית של גוף 1',
      isPrimary: true,
    }),
    createResult(results.v2Final, 'm/s', 'v₂ final', {
      labelHe: 'v₂ סופית',
      description: 'Final velocity of object 2',
      descriptionHe: 'מהירות סופית של גוף 2',
    }),
    createResult(results.momentumInitial, 'kg·m/s', 'p initial', {
      labelHe: 'תנע התחלתי',
    }),
    createResult(results.momentumFinal, 'kg·m/s', 'p final', {
      labelHe: 'תנע סופי',
    }),
    createResult(results.kineticEnergyInitial, 'J', 'KE initial', {
      labelHe: 'אנרגיה קינטית התחלתית',
    }),
    createResult(results.kineticEnergyFinal, 'J', 'KE final', {
      labelHe: 'אנרגיה קינטית סופית',
    }),
    createResult(results.energyLoss, 'J', 'Energy Loss', {
      labelHe: 'איבוד אנרגיה',
    }),
  ]
}

/**
 * Parameter definitions for collision
 */
export const COLLISION_PARAMETERS: ParameterDefinition[] = [
  { name: 'mass1', label: 'Mass 1', labelHe: 'מסה 1', default: 2, min: 0.1, max: 20, step: 0.1, unit: 'kg', unitHe: 'ק"ג', category: 'mass' },
  { name: 'mass2', label: 'Mass 2', labelHe: 'מסה 2', default: 3, min: 0.1, max: 20, step: 0.1, unit: 'kg', unitHe: 'ק"ג', category: 'mass' },
  { name: 'velocity1', label: 'Velocity 1', labelHe: 'מהירות 1', default: 5, min: -10, max: 10, step: 0.5, unit: 'm/s', unitHe: 'מ/ש', category: 'velocity' },
  { name: 'velocity2', label: 'Velocity 2', labelHe: 'מהירות 2', default: -2, min: -10, max: 10, step: 0.5, unit: 'm/s', unitHe: 'מ/ש', category: 'velocity' },
  { name: 'elasticity', label: 'Elasticity', labelHe: 'אלסטיות', default: 1, min: 0, max: 1, step: 0.1, unit: '', description: '0=inelastic, 1=elastic', descriptionHe: '0=לא אלסטית, 1=אלסטית', category: 'other' },
]

// =============================================================================
// Export All
// =============================================================================

export const PHYSICS_CALCULATORS = {
  inclinedPlane: calculateInclinedPlane,
  fbd: calculateFBD,
  projectile: calculateProjectile,
  circularMotion: calculateCircularMotion,
  collision: calculateCollision,
}

export const PHYSICS_RESULT_GETTERS = {
  inclinedPlane: getInclinedPlaneResults,
  fbd: getFBDResults,
  projectile: getProjectileResults,
  circularMotion: getCircularMotionResults,
  collision: getCollisionResults,
}

export const PHYSICS_PARAMETERS = {
  inclinedPlane: INCLINED_PLANE_PARAMETERS,
  fbd: FBD_PARAMETERS,
  projectile: PROJECTILE_PARAMETERS,
  circularMotion: CIRCULAR_MOTION_PARAMETERS,
  collision: COLLISION_PARAMETERS,
}

export const PHYSICS_SUGGESTIONS = {
  inclinedPlane: INCLINED_PLANE_SUGGESTIONS,
  projectile: PROJECTILE_SUGGESTIONS,
}
