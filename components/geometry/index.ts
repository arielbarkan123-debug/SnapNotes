/**
 * Geometry Visual Components
 *
 * SVG-based components for rendering 2D geometric shapes
 * Each component includes:
 * - Visual representation with labeled sides/angles
 * - Area and perimeter formulas
 * - Calculations from given values
 * - Step-by-step solution display
 */

// 2D Shape Components
export { Square } from './Square'
export { Rectangle } from './Rectangle'
export { TriangleGeometry } from './TriangleGeometry'
export { CircleGeometry } from './CircleGeometry'
export { Parallelogram } from './Parallelogram'
export { Rhombus } from './Rhombus'
export { Trapezoid } from './Trapezoid'
export { RegularPolygon } from './RegularPolygon'

// Renderer that routes to the correct component
export { GeometryDiagramRenderer } from './GeometryDiagramRenderer'

// Re-export types for convenience
export type {
  // Base types
  Point2D,
  SolutionStep,
  GeometryFormula,
  
  // Shape data types
  SquareData,
  SquareCalculations,
  RectangleData,
  RectangleCalculations,
  TriangleType,
  TriangleGeometryData,
  TriangleCalculations,
  CircleGeometryData,
  CircleCalculations,
  ParallelogramData,
  ParallelogramCalculations,
  RhombusData,
  RhombusCalculations,
  TrapezoidData,
  TrapezoidCalculations,
  RegularPolygonType,
  RegularPolygonData,
  RegularPolygonCalculations,
  
  // Renderer types
  GeometryShapeType,
  GeometryDiagramState,
  GeometryStepConfig,
} from '@/types/geometry'

export { GEOMETRY_COLORS } from '@/types/geometry'
