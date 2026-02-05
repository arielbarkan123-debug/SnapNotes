/**
 * Math Components Index
 * 
 * All math visualization components for NoteSnap
 */

// Main renderer
export { MathDiagramRenderer } from './MathDiagramRenderer'

// Arithmetic & Basic Operations
export { LongDivisionDiagram } from './LongDivisionDiagram'
export { FractionOperation } from './FractionOperation'

// Algebra - Equations
export { EquationSteps } from './EquationSteps'
export { SystemsOfEquations, type SystemsOfEquationsData, type SystemStep, type SystemEquation } from './SystemsOfEquations'
export { InequalityDiagram, type InequalityData, type InequalityOperator } from './InequalityDiagram'

// Algebra - Expressions
export { FactoringDiagram, type FactoringData, type FactoringStep, type FactorPair } from './FactoringDiagram'
export { CompletingSquareSteps, type CompletingSquareData, type CompletingSquareStep } from './CompletingSquareSteps'
export { PolynomialOperations, type PolynomialOperationsData, type PolynomialStep, type PolynomialTerm } from './PolynomialOperations'
export { RadicalSimplification, type RadicalSimplificationData, type RadicalStep, type PrimeFactor } from './RadicalSimplification'

// Graphing & Visualization
export { CoordinatePlane } from './CoordinatePlane'
export { NumberLine } from './NumberLine'

// Geometry
export { Triangle } from './Triangle'
export { Circle } from './Circle'
export { UnitCircle } from './UnitCircle'

// Data Display
export { MathTable } from './MathTable'
export { TreeDiagram } from './TreeDiagram'
