// Physics Visualization Components
// Step-synced diagrams for physics problems

export { ForceVector } from './ForceVector'
export { FreeBodyDiagram } from './FreeBodyDiagram'
export { InclinedPlane } from './InclinedPlane'
export { PhysicsDiagramRenderer } from './PhysicsDiagramRenderer'

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
  DiagramStepConfig,
  DiagramState,
  PhysicsDiagramType,
  PhysicsDiagramData,
  TutorDiagramResponse,
  DiagramAnimationType,
  CoordinateSystemType,
} from '@/types/physics'

export { FORCE_COLORS, FORCE_SYMBOLS } from '@/types/physics'
