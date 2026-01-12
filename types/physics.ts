// ============================================
// PHYSICS VISUALIZATION TYPES
// Types for step-synced physics diagrams
// ============================================

/**
 * Vector2D - A 2D vector with magnitude and direction
 */
export interface Vector2D {
  magnitude: number
  angle: number // degrees from horizontal (counterclockwise positive)
  label?: string
  color?: string
}

/**
 * ForceType - Common physics force types
 */
export type ForceType =
  | 'weight'      // Gravitational force (mg)
  | 'normal'      // Normal/reaction force
  | 'friction'    // Friction force
  | 'tension'     // Tension in rope/string
  | 'applied'     // Applied/external force
  | 'spring'      // Spring force
  | 'drag'        // Air resistance/drag
  | 'buoyancy'    // Buoyant force
  | 'electric'    // Electric force
  | 'magnetic'    // Magnetic force
  | 'centripetal' // Centripetal force
  | 'net'         // Net/resultant force
  | 'component'   // Component of a force
  | 'custom'      // User-defined force

/**
 * Force - A force vector with type and optional components
 */
export interface Force extends Vector2D {
  name: string // Unique identifier (e.g., 'F1', 'weight', 'N')
  type: ForceType
  components?: {
    x: number // Horizontal component
    y: number // Vertical component
  }
  /** Origin point if different from object center */
  origin?: { x: number; y: number }
  /** Display symbol (e.g., "W", "N", "f_k", "F_net") */
  symbol?: string
  /** Subscript for the symbol (e.g., "k" for f_k) */
  subscript?: string
}

/**
 * PhysicsObjectType - Types of objects in physics diagrams
 */
export type PhysicsObjectType =
  | 'block'     // Rectangular block
  | 'sphere'    // Circle/ball
  | 'wedge'     // Triangular wedge (for inclined planes)
  | 'particle'  // Point particle
  | 'cylinder'  // Cylinder (for rolling problems)
  | 'pulley'    // Pulley wheel
  | 'spring'    // Spring element
  | 'rope'      // Rope/string element

/**
 * PhysicsObject - An object in a physics diagram
 */
export interface PhysicsObject {
  type: PhysicsObjectType
  position: { x: number; y: number }
  mass?: number
  label?: string
  width?: number  // For blocks
  height?: number // For blocks
  radius?: number // For spheres/cylinders
  rotation?: number // Rotation angle in degrees
  color?: string
}

/**
 * CoordinateSystem - Type of coordinate system to display
 */
export type CoordinateSystemType =
  | 'standard'  // Standard x-y axes
  | 'inclined'  // Rotated to match inclined plane
  | 'none'      // No axes shown

/**
 * FreeBodyDiagramData - Data for a free body diagram
 */
export interface FreeBodyDiagramData {
  object: PhysicsObject
  forces: Force[]
  coordinateSystem?: CoordinateSystemType
  showComponents?: boolean
  showNetForce?: boolean
  showAngles?: boolean
  title?: string
  /** Reference angle for inclined coordinate system */
  referenceAngle?: number
  /** Scale factor for force arrow lengths */
  forceScale?: number
}

/**
 * InclinedPlaneData - Data for inclined plane diagrams
 */
export interface InclinedPlaneData {
  /** Angle of the inclined plane in degrees */
  angle: number
  /** Object on the plane */
  object: PhysicsObject
  /** Forces acting on the object */
  forces: Force[]
  /** Whether to show force decomposition into parallel/perpendicular */
  showDecomposition?: boolean
  /** Coefficient of friction (for display) */
  frictionCoefficient?: number
  /** Coordinate system type */
  coordinateSystem?: CoordinateSystemType
  /** Show angle arc and label */
  showAngleLabel?: boolean
  /** Plane surface properties */
  surface?: {
    length?: number
    hasRoughness?: boolean
  }
  title?: string
}

/**
 * ProjectileMotionData - Data for projectile motion diagrams
 */
export interface ProjectileMotionData {
  /** Initial position */
  initial: { x: number; y: number }
  /** Initial velocity */
  initialVelocity: { magnitude: number; angle: number }
  /** Time intervals to show position markers */
  timeIntervals?: number[]
  /** Whether to show velocity vectors at each point */
  showVelocityVectors?: boolean
  /** Whether to show acceleration vector */
  showAcceleration?: boolean
  /** Whether to show trajectory path */
  showTrajectory?: boolean
  /** Whether to show component breakdown */
  showComponents?: boolean
  /** Ground level y-coordinate */
  groundLevel?: number
  title?: string
}

/**
 * PulleySystemData - Data for pulley system diagrams
 */
export interface PulleySystemData {
  pulleys: Array<{
    position: { x: number; y: number }
    radius: number
    fixed?: boolean
  }>
  masses: Array<{
    object: PhysicsObject
    attachedTo: number // pulley index
    side: 'left' | 'right'
  }>
  /** Tension forces to show */
  tensions?: Force[]
  /** Whether to show acceleration direction */
  showAcceleration?: boolean
  title?: string
}

/**
 * CircuitElement - Types of circuit elements
 */
export type CircuitElementType =
  | 'battery'
  | 'resistor'
  | 'capacitor'
  | 'inductor'
  | 'switch'
  | 'bulb'
  | 'ammeter'
  | 'voltmeter'
  | 'wire'

/**
 * CircuitElement - An element in a circuit diagram
 */
export interface CircuitElement {
  type: CircuitElementType
  position: { x: number; y: number }
  rotation?: number
  value?: number
  unit?: string
  label?: string
  /** For switches: is it closed? */
  closed?: boolean
}

/**
 * CircuitDiagramData - Data for circuit diagrams
 */
export interface CircuitDiagramData {
  elements: CircuitElement[]
  connections: Array<{
    from: number // element index
    to: number   // element index
  }>
  /** Show current flow animation */
  showCurrentFlow?: boolean
  /** Show voltage labels */
  showVoltages?: boolean
  /** Show current labels */
  showCurrents?: boolean
  title?: string
}

/**
 * WaveDiagramData - Data for wave diagrams
 */
export interface WaveDiagramData {
  waves: Array<{
    amplitude: number
    wavelength: number
    phase?: number
    color?: string
    label?: string
  }>
  /** Show amplitude labels */
  showAmplitude?: boolean
  /** Show wavelength labels */
  showWavelength?: boolean
  /** Show nodes and antinodes (for standing waves) */
  showNodesAntinodes?: boolean
  /** X-axis range */
  xRange: { min: number; max: number }
  title?: string
}

/**
 * OpticsRayData - Data for optics ray diagrams
 */
export interface OpticsRayData {
  /** Optical element type */
  elementType: 'lens' | 'mirror' | 'prism' | 'slab'
  /** Element properties */
  element: {
    position: { x: number; y: number }
    /** For lenses: focal length (positive = converging) */
    focalLength?: number
    /** For mirrors: radius of curvature */
    radius?: number
    /** For prisms: apex angle */
    apexAngle?: number
    /** For slabs: refractive index */
    refractiveIndex?: number
  }
  /** Light rays to trace */
  rays: Array<{
    origin: { x: number; y: number }
    angle: number
    color?: string
  }>
  /** Show principal axis */
  showAxis?: boolean
  /** Show focal points */
  showFocalPoints?: boolean
  /** Show object and image */
  showObjectImage?: boolean
  /** Object position */
  objectPosition?: { x: number; y: number; height: number }
  title?: string
}

// ============================================
// STEP-SYNC TYPES
// Types for controlling diagram evolution
// ============================================

/**
 * DiagramAnimationType - Animation styles for diagram transitions
 */
export type DiagramAnimationType =
  | 'none'      // No animation
  | 'fade'      // Fade in/out
  | 'draw'      // Draw stroke animation
  | 'pulse'     // Pulse/highlight animation
  | 'scale'     // Scale in/out

/**
 * DiagramStepConfig - Configuration for a single step in diagram evolution
 */
export interface DiagramStepConfig {
  /** Step number (0-indexed) */
  step: number
  /** Force names visible at this step */
  visibleForces?: string[]
  /** Force names to highlight/emphasize */
  highlightForces?: string[]
  /** Whether to show force components at this step */
  showComponents?: boolean
  /** Whether to show net force at this step */
  showNetForce?: boolean
  /** Calculation/equation to display */
  showCalculation?: string
  /** Animation for this step */
  animation?: DiagramAnimationType
  /** Optional label/explanation for this step */
  stepLabel?: string
  /** For Hebrew support */
  stepLabelHe?: string
}

/**
 * PhysicsDiagramType - All supported physics diagram types
 */
export type PhysicsDiagramType =
  | 'fbd'              // Free body diagram
  | 'inclined_plane'   // Inclined plane with forces
  | 'projectile'       // Projectile motion
  | 'pulley'           // Pulley system
  | 'circuit'          // Electric circuit
  | 'wave'             // Wave diagram
  | 'optics'           // Ray optics
  | 'motion'           // Motion diagram with vectors

/**
 * PhysicsDiagramData - Union type of all physics diagram data types
 */
export type PhysicsDiagramData =
  | { type: 'fbd'; data: FreeBodyDiagramData }
  | { type: 'inclined_plane'; data: InclinedPlaneData }
  | { type: 'projectile'; data: ProjectileMotionData }
  | { type: 'pulley'; data: PulleySystemData }
  | { type: 'circuit'; data: CircuitDiagramData }
  | { type: 'wave'; data: WaveDiagramData }
  | { type: 'optics'; data: OpticsRayData }

/**
 * DiagramState - Current state of a diagram in the UI
 */
export interface DiagramState {
  /** Type of diagram */
  type: PhysicsDiagramType
  /** Diagram data */
  data: FreeBodyDiagramData | InclinedPlaneData | ProjectileMotionData |
        PulleySystemData | CircuitDiagramData | WaveDiagramData | OpticsRayData
  /** Current visible step (0 = base state) */
  visibleStep: number
  /** Step configuration array */
  stepConfig?: DiagramStepConfig[]
  /** Elements currently highlighted */
  highlightedElements?: string[]
  /** Current animation state */
  animation?: DiagramAnimationType
  /** Total number of steps */
  totalSteps?: number
}

/**
 * TutorDiagramResponse - Diagram data included in tutor response
 */
export interface TutorDiagramResponse {
  /** Type of diagram to display */
  type: PhysicsDiagramType
  /** Diagram data */
  data: FreeBodyDiagramData | InclinedPlaneData | ProjectileMotionData |
        PulleySystemData | CircuitDiagramData | WaveDiagramData | OpticsRayData
  /** Current step to display */
  currentStep: number
  /** Full step configuration */
  stepConfig: DiagramStepConfig[]
}

// ============================================
// DEFAULT VALUES AND CONSTANTS
// ============================================

/**
 * Default colors for different force types
 */
export const FORCE_COLORS: Record<ForceType, string> = {
  weight: '#22c55e',      // Green
  normal: '#3b82f6',      // Blue
  friction: '#ef4444',    // Red
  tension: '#f59e0b',     // Amber
  applied: '#8b5cf6',     // Purple
  spring: '#06b6d4',      // Cyan
  drag: '#6b7280',        // Gray
  buoyancy: '#14b8a6',    // Teal
  electric: '#eab308',    // Yellow
  magnetic: '#ec4899',    // Pink
  centripetal: '#f97316', // Orange
  net: '#000000',         // Black
  component: '#9ca3af',   // Light gray
  custom: '#6366f1',      // Indigo
}

/**
 * Default force symbols
 */
export const FORCE_SYMBOLS: Record<ForceType, string> = {
  weight: 'W',
  normal: 'N',
  friction: 'f',
  tension: 'T',
  applied: 'F',
  spring: 'F_s',
  drag: 'F_d',
  buoyancy: 'F_b',
  electric: 'F_E',
  magnetic: 'F_B',
  centripetal: 'F_c',
  net: 'F_{net}',
  component: '',
  custom: 'F',
}
