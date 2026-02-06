/**
 * Visual Learning System
 *
 * Core infrastructure for intelligent visual diagram generation,
 * validation, and layout optimization.
 */

// Types
export * from './types'

// Validator
export {
  validateSchema,
  validatePhysics,
  validateDiagram,
  validateAndCorrect,
  autoCorrectDiagram,
  pointsEqual,
  normalizeAngle,
} from './validator'

// Layout Engine
export {
  LayoutEngine,
  createBoundingBox,
  createLabelBounds,
  createForceBounds,
  boxesOverlap,
  getOverlapArea,
  expandBox,
  detectCollisions,
  checkCollision,
  calculateForceOrigin,
  calculateForceOrigins,
  findLabelPosition,
  positionForceLabel,
  resolveCollisions,
  calculatePhysicsLayout,
  findAxesPosition,
} from './layout-engine'

// Step Synchronization
export {
  StepSyncManager,
  createStepsFromDiagramConfig,
  type StepState,
  type StepConfig,
  type StepSyncCallbacks,
  type StepSyncOptions,
} from './step-sync-manager'

// Physics Calculations
export {
  // Constants
  GRAVITY,
  // Utilities
  toRadians,
  toDegrees,
  formatNumber,
  createResult,
  // Calculators
  calculateInclinedPlane,
  calculateFBD,
  calculateProjectile,
  calculateCircularMotion,
  calculateCollision,
  // Result getters
  getInclinedPlaneResults,
  getFBDResults,
  getProjectileResults,
  getCircularMotionResults,
  getCollisionResults,
  // Parameters
  INCLINED_PLANE_PARAMETERS,
  FBD_PARAMETERS,
  PROJECTILE_PARAMETERS,
  CIRCULAR_MOTION_PARAMETERS,
  COLLISION_PARAMETERS,
  // Suggestions
  INCLINED_PLANE_SUGGESTIONS,
  PROJECTILE_SUGGESTIONS,
  // Aggregated exports
  PHYSICS_CALCULATORS,
  PHYSICS_RESULT_GETTERS,
  PHYSICS_PARAMETERS,
  PHYSICS_SUGGESTIONS,
  // Types
  type InclinedPlaneParams,
  type InclinedPlaneResults,
  type FBDParams,
  type FBDResults,
  type ProjectileParams,
  type ProjectileResults,
  type CircularMotionParams,
  type CircularMotionResults,
  type CollisionParams,
  type CollisionResults,
} from './physics-calculations'
