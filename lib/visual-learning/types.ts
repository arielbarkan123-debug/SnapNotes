/**
 * Visual Learning System - Type Definitions
 *
 * Comprehensive schemas for structured diagram data, step synchronization,
 * validation, and interactive features.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Confidence-scored value extracted from problem text
 */
export interface ExtractedValue<T = number> {
  value: T
  unit?: string
  confidence: number // 0.0 - 1.0
  source: 'extracted' | 'inferred' | 'default'
}

/**
 * 2D point in SVG coordinates
 */
export interface Point {
  x: number
  y: number
}

/**
 * 2D vector with magnitude and angle
 */
export interface Vector2D {
  magnitude: number
  angle: number // degrees, 0 = right, 90 = up, -90 = down
}

/**
 * Bounding box for collision detection
 */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// =============================================================================
// PROBLEM ANALYSIS
// =============================================================================

export type Subject = 'physics' | 'math' | 'chemistry' | 'biology'
export type Difficulty = 'elementary' | 'middle' | 'high' | 'advanced'

/**
 * Structured analysis of a problem
 */
export interface ProblemAnalysis {
  subject: Subject
  topic: string
  subtopic?: string
  difficulty: Difficulty

  // Extracted parameters with confidence
  parameters: Record<string, ExtractedValue>

  // What the problem is asking
  goal: {
    find: string[]
    prove?: string
    graph?: string
    construct?: string
  }

  // Physical/mathematical constraints
  constraints: {
    equilibrium?: boolean
    frictionless?: boolean
    masslessRope?: boolean
    idealPulley?: boolean
    noAirResistance?: boolean
    [key: string]: boolean | undefined
  }

  // Recommended visualization
  recommendedDiagram: {
    type: DiagramType
    confidence: number
    alternativeTypes?: DiagramType[]
  }

  // Raw text for reference
  originalText: string
}

// =============================================================================
// DIAGRAM TYPES
// =============================================================================

export type PhysicsDiagramType =
  | 'free_body_diagram'
  | 'inclined_plane'
  | 'projectile_motion'
  | 'pulley_system'
  | 'circular_motion'
  | 'collision'
  | 'spring_system'
  | 'pendulum'
  | 'wave'
  | 'electric_field'
  | 'circuit'

export type MathDiagramType =
  | 'coordinate_plane'
  | 'number_line'
  | 'triangle'
  | 'circle'
  | 'long_division'
  | 'equation_steps'
  | 'fraction_operation'
  | 'polynomial'
  | 'inequality'
  | 'venn_diagram'
  | 'tree_diagram'

export type ChemistryDiagramType =
  | 'atom'
  | 'molecule'
  | 'reaction'
  | 'orbital'
  | 'periodic_element'

export type BiologyDiagramType =
  | 'cell'
  | 'dna'
  | 'protein'
  | 'organ_system'
  | 'food_web'

export type DiagramType =
  | PhysicsDiagramType
  | MathDiagramType
  | ChemistryDiagramType
  | BiologyDiagramType

// =============================================================================
// FORCE TYPES (Physics)
// =============================================================================

export type ForceType =
  | 'weight'
  | 'normal'
  | 'friction'
  | 'tension'
  | 'applied'
  | 'spring'
  | 'drag'
  | 'lift'
  | 'thrust'
  | 'buoyancy'
  | 'electric'
  | 'magnetic'
  | 'centripetal'
  | 'net'
  | 'component'
  | 'custom'
  | 'drive'
  | 'resistance'
  | 'reaction'

/**
 * Force vector with full metadata
 */
export interface Force {
  id: string
  name: string
  type: ForceType
  magnitude: number
  angle: number // degrees
  symbol?: string // e.g., "W", "N", "f"
  subscript?: string // e.g., "s" for static friction
  color?: string
  components?: boolean // whether to show decomposition
  origin?: 'center' | 'surface' | 'attachment' | Point
}

/**
 * Physics object (block, ball, etc.)
 */
export interface PhysicsObject {
  id: string
  type: 'block' | 'ball' | 'point' | 'custom'
  label?: string
  mass?: number
  position: Point
  size: number | { width: number; height: number }
  color?: string
  rotation?: number // degrees
}

// =============================================================================
// DIAGRAM DATA STRUCTURES
// =============================================================================

/**
 * Base interface for all diagram data
 */
export interface BaseDiagramData {
  title?: string
  givenInfo?: Record<string, string>
  unknowns?: string[]
}

/**
 * Free Body Diagram data
 */
export interface FreeBodyDiagramData extends BaseDiagramData {
  object: PhysicsObject
  forces: Force[]
  surface?: {
    type: 'horizontal' | 'inclined' | 'vertical' | 'none'
    angle?: number
    friction?: number
  }
  coordinateSystem?: 'standard' | 'inclined' | 'none'
  showNetForce?: boolean
  showComponents?: boolean
}

/**
 * Inclined Plane diagram data
 */
export interface InclinedPlaneData extends BaseDiagramData {
  angle: number
  object: PhysicsObject
  forces: Force[]
  frictionCoefficient?: number
  showDecomposition?: boolean
  showAngleLabel?: boolean
  coordinateSystem?: 'standard' | 'inclined' | 'none'
  surface?: {
    hasRoughness?: boolean
    length?: number
  }
}

/**
 * Projectile Motion diagram data
 */
export interface ProjectileMotionData extends BaseDiagramData {
  initial: {
    position: Point
    velocity: Vector2D
  }
  gravity?: number
  showTrajectory?: boolean
  showVelocityComponents?: boolean
  timeMarkers?: number[] // times to show position
  groundLevel?: number
}

/**
 * Coordinate Plane diagram data
 */
export interface CoordinatePlaneData extends BaseDiagramData {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  showGrid?: boolean
  showAxes?: boolean
  axisLabels?: { x: string; y: string }

  points?: {
    id: string
    x: number
    y: number
    label?: string
    color?: string
    style?: 'filled' | 'open'
  }[]

  lines?: {
    id: string
    points: [Point, Point]
    color?: string
    dashed?: boolean
    label?: string
  }[]

  curves?: {
    id: string
    expression: string // e.g., "x^2 - 4"
    color?: string
    domain?: [number, number]
  }[]

  regions?: {
    id: string
    inequality: string // e.g., "y > x + 1"
    color?: string
    opacity?: number
  }[]
}

/**
 * Number Line diagram data
 */
export interface NumberLineData extends BaseDiagramData {
  min: number
  max: number
  points?: {
    value: number
    label?: string
    style?: 'filled' | 'open'
    color?: string
  }[]
  intervals?: {
    start: number | null // null = negative infinity
    end: number | null // null = positive infinity
    startInclusive?: boolean
    endInclusive?: boolean
    color?: string
  }[]
}

/**
 * Long Division diagram data
 */
export interface LongDivisionData extends BaseDiagramData {
  dividend: number
  divisor: number
  showSteps?: boolean
}

/**
 * Atom diagram data
 */
export interface AtomDiagramData extends BaseDiagramData {
  element: {
    symbol: string
    name: string
    atomicNumber: number
    protons: number
    neutrons: number
    shells: {
      n: number
      electrons: number
      maxElectrons: number
    }[]
  }
  showProtonCount?: boolean
  showElectronCount?: boolean
  highlightValence?: boolean
}

/**
 * Molecule diagram data
 */
export interface MoleculeDiagramData extends BaseDiagramData {
  name: string
  formula: string
  geometry: 'linear' | 'bent' | 'trigonal_planar' | 'tetrahedral' | 'trigonal_pyramidal'
  atoms: {
    id: string
    symbol: string
    position: Point
  }[]
  bonds: {
    atom1: string
    atom2: string
    type: 'single' | 'double' | 'triple'
  }[]
}

/**
 * Union type for all diagram data
 */
export type DiagramData =
  | FreeBodyDiagramData
  | InclinedPlaneData
  | ProjectileMotionData
  | CoordinatePlaneData
  | NumberLineData
  | LongDivisionData
  | AtomDiagramData
  | MoleculeDiagramData

// =============================================================================
// STEP SYNCHRONIZATION
// =============================================================================

/**
 * Animation type for diagram transitions
 */
export type AnimationType = 'fade' | 'draw' | 'grow' | 'slide' | 'decompose' | 'highlight' | 'none'

/**
 * Annotation to display on diagram
 */
export interface DiagramAnnotation {
  id: string
  type: 'label' | 'calculation' | 'arrow' | 'bracket' | 'dimension'
  position: Point
  content: string
  color?: string
  fontSize?: number
}

/**
 * Visual state for a single step
 */
export interface DiagramStep {
  stepNumber: number
  title?: string

  // Element visibility
  visibleElements: string[] // IDs of elements to show
  hiddenElements?: string[] // IDs to explicitly hide
  newElements?: string[] // IDs that appear this step (animate in)

  // Emphasis
  highlightElements?: string[] // IDs to emphasize
  dimElements?: string[] // IDs to de-emphasize

  // Annotations for this step
  annotations?: DiagramAnnotation[]

  // Animation settings
  animation?: {
    type: AnimationType
    duration?: number // ms
    delay?: number // ms
    easing?: string
  }
}

/**
 * Complete diagram state with step configuration
 */
export interface StructuredDiagram {
  type: DiagramType
  data: DiagramData
  steps: DiagramStep[]

  // Metadata
  source: 'ai' | 'programmatic' | 'hybrid'
  confidence: number
  schemaVersion: number
}

// =============================================================================
// EXPLANATION STEPS
// =============================================================================

/**
 * Single explanation step synced with diagram
 */
export interface ExplanationStep {
  stepNumber: number
  title: string
  explanation: string

  // Math content
  formula?: string // KaTeX
  calculation?: string // Worked math

  // Diagram synchronization
  diagramStepIndex: number
  highlightElements?: string[]

  // Teaching notes
  conceptName?: string
  commonMistakes?: string[]
  hints?: string[]
}

// =============================================================================
// AI RESPONSE STRUCTURE
// =============================================================================

/**
 * Complete structured response from AI tutor
 */
export interface StructuredTutorResponse {
  // Introduction
  introduction: string

  // Diagram specification
  diagram: StructuredDiagram

  // Step-by-step explanation
  explanationSteps: ExplanationStep[]

  // Final answer
  answer: {
    value: string | number
    unit?: string
    explanation: string
  }

  // Interactive exploration
  exploration?: {
    question: string
    parameterToAdjust: string
    interestingValues: number[]
    explanation: string
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  confidence: number
  correctedData?: DiagramData
}

// =============================================================================
// LAYOUT ENGINE
// =============================================================================

/**
 * Element with positioning for layout calculations
 */
export interface LayoutElement {
  id: string
  type: 'force' | 'label' | 'object' | 'axis' | 'annotation'
  position: Point
  bounds: BoundingBox
  priority: number // higher = more important, don't move
  anchor?: Point // point this element is attached to
}

/**
 * Collision between two elements
 */
export interface Collision {
  element1: string
  element2: string
  overlap: BoundingBox
  severity: number // 0-1, how much they overlap
}

/**
 * Result of layout calculation
 */
export interface LayoutResult {
  elements: Map<string, Point>
  adjustments: Map<string, { dx: number; dy: number }>
  collisions: Collision[] // any remaining collisions
  success: boolean
}

// =============================================================================
// INTERACTIVE FEATURES
// =============================================================================

/**
 * Parameter definition for sliders
 */
export interface ParameterDefinition {
  id: string
  name: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  color?: string
  description?: string
}

/**
 * What-If mode configuration
 */
export interface WhatIfConfig {
  parameters: ParameterDefinition[]
  calculateResult: (params: Record<string, number>) => {
    value: number
    unit: string
    description: string
  }
  suggestions?: {
    question: string
    parameterChanges: Record<string, number>
  }[]
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isPhysicsDiagramType(type: DiagramType): type is PhysicsDiagramType {
  return [
    'free_body_diagram',
    'inclined_plane',
    'projectile_motion',
    'pulley_system',
    'circular_motion',
    'collision',
    'spring_system',
    'pendulum',
    'wave',
    'electric_field',
    'circuit',
  ].includes(type)
}

export function isMathDiagramType(type: DiagramType): type is MathDiagramType {
  return [
    'coordinate_plane',
    'number_line',
    'triangle',
    'circle',
    'long_division',
    'equation_steps',
    'fraction_operation',
    'polynomial',
    'inequality',
    'venn_diagram',
    'tree_diagram',
  ].includes(type)
}

export function isChemistryDiagramType(type: DiagramType): type is ChemistryDiagramType {
  return ['atom', 'molecule', 'reaction', 'orbital', 'periodic_element'].includes(type)
}

export function isBiologyDiagramType(type: DiagramType): type is BiologyDiagramType {
  return ['cell', 'dna', 'protein', 'organ_system', 'food_web'].includes(type)
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Force angle conventions (in degrees)
 */
export const FORCE_ANGLE_CONVENTIONS = {
  weight: -90, // straight down
  normal_horizontal: 90, // straight up
  normal_inclined: (planeAngle: number) => 90 - planeAngle,
  friction_up_slope: (planeAngle: number) => 180 - planeAngle,
  friction_down_slope: (planeAngle: number) => -planeAngle,
} as const

/**
 * Default colors for force types
 */
export const FORCE_TYPE_COLORS: Record<ForceType, string> = {
  weight: '#16a34a', // green
  normal: '#2563eb', // blue
  friction: '#dc2626', // red
  tension: '#7c3aed', // purple
  applied: '#ea580c', // orange
  spring: '#0891b2', // cyan
  drag: '#64748b', // gray
  lift: '#0ea5e9', // sky
  thrust: '#f59e0b', // amber
  buoyancy: '#06b6d4', // cyan
  electric: '#eab308', // yellow
  magnetic: '#a855f7', // purple
  centripetal: '#ec4899', // pink
  net: '#1f2937', // dark gray
  component: '#9ca3af', // light gray
  custom: '#6366f1', // indigo
  drive: '#22c55e', // green
  resistance: '#ef4444', // red
  reaction: '#3b82f6', // blue
}

/**
 * Schema version for migrations
 */
export const SCHEMA_VERSION = 1
