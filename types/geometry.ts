/**
 * Geometry Types
 * Types for geometry diagram components and calculations
 */

// ============================================
// BASE TYPES
// ============================================

/**
 * Point2D - A point in 2D space
 */
export interface Point2D {
  x: number
  y: number
  label?: string
}

/**
 * SolutionStep - A step in a geometry calculation
 */
export interface SolutionStep {
  stepNumber: number
  description: string
  formula?: string // LaTeX formula
  substitution?: string // LaTeX with values substituted
  result?: string // LaTeX result
}

/**
 * GeometryFormula - A formula with its components
 */
export interface GeometryFormula {
  name: string
  formula: string // LaTeX
  description?: string
}

// ============================================
// SQUARE
// ============================================

export interface SquareData {
  side: number
  sideLabel?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showDiagonals?: boolean
  diagonalLabel?: string
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
  highlightSide?: number // 0-3
}

export interface SquareCalculations {
  area: number
  perimeter: number
  diagonal: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    diagonal?: SolutionStep[]
  }
}

// ============================================
// RECTANGLE
// ============================================

export interface RectangleData {
  width: number
  height: number
  widthLabel?: string
  heightLabel?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showDiagonals?: boolean
  diagonalLabel?: string
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
  highlightSide?: 'width' | 'height'
}

export interface RectangleCalculations {
  area: number
  perimeter: number
  diagonal: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    diagonal?: SolutionStep[]
  }
}

// ============================================
// TRIANGLE TYPES
// ============================================

export type TriangleType = 'equilateral' | 'isosceles' | 'scalene' | 'right' | 'right-isosceles' | 'general'

export interface TriangleGeometryData {
  type: TriangleType
  vertices: [Point2D, Point2D, Point2D]
  sides: {
    a: number // opposite to vertex A
    b: number // opposite to vertex B
    c: number // opposite to vertex C
    labels?: { a?: string; b?: string; c?: string }
  }
  angles?: {
    A?: number // angle at vertex A (degrees)
    B?: number // angle at vertex B
    C?: number // angle at vertex C
  }
  height?: {
    value: number
    from: 'A' | 'B' | 'C'
    showLine?: boolean
  }
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
  highlightSides?: ('a' | 'b' | 'c')[]
  highlightAngles?: ('A' | 'B' | 'C')[]
  showRightAngleMarker?: boolean
}

export interface TriangleCalculations {
  area: number
  perimeter: number
  semiperimeter: number
  heights: { hA: number; hB: number; hC: number }
  angles: { A: number; B: number; C: number }
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    angles?: SolutionStep[]
  }
}

// ============================================
// CIRCLE
// ============================================

export interface CircleGeometryData {
  radius: number
  radiusLabel?: string
  center?: Point2D
  showRadius?: boolean
  showDiameter?: boolean
  diameterLabel?: string
  sector?: {
    startAngle: number // degrees
    endAngle: number
    label?: string
    showArc?: boolean
  }
  arc?: {
    startAngle: number
    endAngle: number
    label?: string
  }
  chord?: {
    startAngle: number
    endAngle: number
    label?: string
  }
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface CircleCalculations {
  area: number
  circumference: number
  diameter: number
  sectorArea?: number
  arcLength?: number
  chordLength?: number
  steps?: {
    area: SolutionStep[]
    circumference: SolutionStep[]
    sector?: SolutionStep[]
    arc?: SolutionStep[]
  }
}

// ============================================
// PARALLELOGRAM
// ============================================

export interface ParallelogramData {
  base: number
  side: number
  height: number
  baseLabel?: string
  sideLabel?: string
  heightLabel?: string
  angle?: number // angle between base and side (degrees)
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showHeight?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface ParallelogramCalculations {
  area: number
  perimeter: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
  }
}

// ============================================
// RHOMBUS
// ============================================

export interface RhombusData {
  side: number
  diagonal1: number // horizontal diagonal
  diagonal2: number // vertical diagonal
  sideLabel?: string
  d1Label?: string
  d2Label?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showDiagonals?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface RhombusCalculations {
  area: number
  perimeter: number
  side: number
  angles: { acute: number; obtuse: number }
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    side?: SolutionStep[]
  }
}

// ============================================
// TRAPEZOID
// ============================================

export interface TrapezoidData {
  topBase: number // parallel side (shorter)
  bottomBase: number // parallel side (longer)
  height: number
  leftSide?: number
  rightSide?: number
  topLabel?: string
  bottomLabel?: string
  heightLabel?: string
  leftLabel?: string
  rightLabel?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showHeight?: boolean
  isIsosceles?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface TrapezoidCalculations {
  area: number
  perimeter: number
  medianLength: number // midsegment
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    median?: SolutionStep[]
  }
}

// ============================================
// REGULAR POLYGON
// ============================================

export type RegularPolygonType = 'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'nonagon' | 'decagon' | 'custom'

export interface RegularPolygonData {
  sides: number // number of sides (5 for pentagon, 6 for hexagon, etc.)
  sideLength: number
  sideLabel?: string
  apothem?: number // distance from center to midpoint of side
  apothemLabel?: string
  showApothem?: boolean
  showCentralAngle?: boolean
  showInteriorAngle?: boolean
  vertices?: Point2D[]
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface RegularPolygonCalculations {
  area: number
  perimeter: number
  apothem: number
  centralAngle: number
  interiorAngle: number
  exteriorAngle: number
  sumInteriorAngles: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    angles?: SolutionStep[]
  }
}

// ============================================
// GEOMETRY DIAGRAM STATE
// For renderer integration
// ============================================

export type GeometryShapeType =
  | 'square'
  | 'rectangle'
  | 'triangle'
  | 'circle'
  | 'parallelogram'
  | 'rhombus'
  | 'trapezoid'
  | 'regular_polygon'

export interface GeometryDiagramState {
  type: GeometryShapeType
  data: 
    | SquareData
    | RectangleData
    | TriangleGeometryData
    | CircleGeometryData
    | ParallelogramData
    | RhombusData
    | TrapezoidData
    | RegularPolygonData
  visibleStep: number
  totalSteps?: number
  stepConfig?: GeometryStepConfig[]
  calculations?: 
    | SquareCalculations
    | RectangleCalculations
    | TriangleCalculations
    | CircleCalculations
    | ParallelogramCalculations
    | RhombusCalculations
    | TrapezoidCalculations
    | RegularPolygonCalculations
}

export interface GeometryStepConfig {
  stepLabel: string
  stepLabelHe?: string
  showFormula?: boolean
  highlightPart?: string
  showCalculation?: boolean
}

// ============================================
// GEOMETRY COLORS
// ============================================

export const GEOMETRY_COLORS = {
  shape: {
    fill: '#3B82F6', // blue-500
    fillOpacity: 0.1,
    stroke: '#1F2937', // gray-800
  },
  highlight: {
    primary: '#EF4444', // red-500
    secondary: '#10B981', // green-500
    tertiary: '#F59E0B', // amber-500
  },
  label: {
    side: '#2563EB', // blue-600
    angle: '#6B7280', // gray-500
    formula: '#7C3AED', // purple-600
  },
  auxiliary: {
    height: '#10B981', // green-500
    diagonal: '#8B5CF6', // purple-500
    apothem: '#F59E0B', // amber-500
  },
} as const
