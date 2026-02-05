// Physics Visualization Components
// Step-synced diagrams for physics problems

export { ForceVector } from './ForceVector'
export { FreeBodyDiagram } from './FreeBodyDiagram'
export { InclinedPlane } from './InclinedPlane'
export { ProjectileMotion } from './ProjectileMotion'
export { PulleySystem } from './PulleySystem'
export { CircularMotion } from './CircularMotion'
export { CollisionDiagram } from './CollisionDiagram'
export { PhysicsDiagramRenderer } from './PhysicsDiagramRenderer'

// Interactive versions with What-If Mode
export { InteractiveInclinedPlane } from './InteractiveInclinedPlane'
export { InteractiveFreeBodyDiagram } from './InteractiveFreeBodyDiagram'
export { InteractiveProjectileMotion } from './InteractiveProjectileMotion'
export { InteractiveCircularMotion } from './InteractiveCircularMotion'
export { InteractivePulleySystem } from './InteractivePulleySystem'
export { InteractiveCollisionDiagram } from './InteractiveCollisionDiagram'

// Re-export types for convenience
export type {
  Force,
  ForceType,
  Vector2D,
  PhysicsObject,
  PhysicsObjectType,
  FreeBodyDiagramData,
  InclinedPlaneData,
  ProjectileMotionData,
  PulleySystemData,
  CircuitDiagramData,
  WaveDiagramData,
  OpticsRayData,
  CircularMotionData,
  CollisionDiagramData,
  CollisionObject,
  DiagramStepConfig,
  DiagramState,
  PhysicsDiagramType,
  PhysicsDiagramData,
  TutorDiagramResponse,
  DiagramAnimationType,
  CoordinateSystemType,
} from '@/types/physics'

export { FORCE_COLORS, FORCE_SYMBOLS } from '@/types/physics'
