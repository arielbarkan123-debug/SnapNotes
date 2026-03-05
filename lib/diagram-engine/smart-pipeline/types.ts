/**
 * Smart Pre-Compute Pipeline — Type Definitions
 *
 * Separates problem understanding + computation from diagram rendering.
 * Math is computed with SymPy (exact, deterministic) before the rendering
 * pipeline ever sees the question. This eliminates hallucinated values.
 */

export type ProblemDomain =
  | 'mechanics'
  | 'kinematics'
  | 'energy'
  | 'circuits'
  | 'algebra'
  | 'calculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry'
  | 'general_math';

export interface AnalysisResult {
  domain: ProblemDomain;
  problemType: string; // e.g. "inclined_plane_friction"
  givenValues: Record<string, { value: number; unit: string }>;
  unknowns: string[];
  formulas: string[];
  sympyCode: string; // complete executable Python
  diagramHints: {
    diagramType: string;
    elementsToShow: string[];
    coordinateRanges?: { x?: [number, number]; y?: [number, number] };
  };
}

export interface ComputedValue {
  name: string;
  value: number;
  unit: string;
  formula: string; // e.g. "F_net = m * a"
  step: string; // e.g. "F_net = 80 * 3 = 240 N"
}

export interface ComputedProblem {
  values: Record<string, ComputedValue>;
  solutionSteps: string[];
  rawOutput: string;
  computeTimeMs: number;
}

export interface VerificationResult {
  allPassed: boolean;
  checks: Array<{ name: string; passed: boolean; reason: string }>;
  crossCheckPassed: boolean; // Sonnet cross-check result
  failureReason?: string;
}

export interface SmartPipelineResult {
  computeUsed: boolean;
  analysis?: AnalysisResult;
  computed?: ComputedProblem;
  verification?: VerificationResult;
  computeAttempts?: number; // how many self-debug iterations
  skipReason?: string;
}
