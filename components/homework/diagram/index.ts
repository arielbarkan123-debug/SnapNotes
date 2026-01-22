/**
 * Diagram components for TutoringChat
 */

// Components
export { default as DiagramRenderer } from './DiagramRenderer'
export { default as DiagramPanel } from './DiagramPanel'
export { default as MobileDiagramPanel } from './MobileDiagramPanel'
export { default as InlineDiagram } from './InlineDiagram'

// Types and type guards
export type { DiagramState } from './types'
export {
  PHYSICS_DIAGRAM_TYPES,
  MATH_DIAGRAM_TYPES,
  CHEMISTRY_DIAGRAM_TYPES,
  BIOLOGY_DIAGRAM_TYPES,
  DIAGRAM_TYPE_NAMES,
  isPhysicsDiagram,
  isMathDiagram,
  isChemistryDiagram,
  isBiologyDiagram,
  getDiagramTypeName,
} from './types'

// Helpers
export { convertToDiagramState, getLatestDiagram } from './helpers'
