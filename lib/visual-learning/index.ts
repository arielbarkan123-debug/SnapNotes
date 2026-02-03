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
