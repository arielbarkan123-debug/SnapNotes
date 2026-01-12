/**
 * Math Visual Components
 *
 * SVG-based components for rendering mathematical visualizations
 * Includes step-synced diagrams for tutoring (long division, equations, fractions, etc.)
 */

// Basic visualization components
export { NumberLine } from './NumberLine'
export { CoordinatePlane } from './CoordinatePlane'
export { Triangle } from './Triangle'
export { Circle } from './Circle'
export { UnitCircle } from './UnitCircle'
export { MathTable, SignTable, ValueTable, FactorTable } from './MathTable'
export { TreeDiagram, ProbabilityTree, CountingTree } from './TreeDiagram'

// Step-synced diagram components (for tutor explanations)
export { LongDivisionDiagram } from './LongDivisionDiagram'
export { EquationSteps } from './EquationSteps'
export { FractionOperation } from './FractionOperation'
export { MathDiagramRenderer } from './MathDiagramRenderer'

// Re-export types for convenience
export type {
  MathDiagramType,
  MathDiagramData,
  MathDiagramState,
  MathDiagramStepConfig,
  LongDivisionData,
  LongDivisionStep,
  EquationData,
  EquationStep,
  FractionOperationData,
  FractionStep,
  Fraction,
  NumberLineData,
  CoordinatePlaneData,
  TutorMathDiagramResponse,
} from '@/types/math'

export { MATH_COLORS, FRACTION_COLORS } from '@/types/math'
