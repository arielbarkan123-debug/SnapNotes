/**
 * Step-by-Step Solution Components
 * Unified visual learning system across all subjects
 */

export { StepByStepSolution } from './StepByStepSolution'
export { SolutionStepComponent } from './SolutionStep'
export { StepNavigation } from './StepNavigation'
export { SolutionDiagram } from './SolutionDiagram'

// Re-export types for convenience
export type {
  Solution,
  SolutionStep,
  SolutionDisplayConfig,
  NavigationState,
  Subject,
  UserLevel,
  DiagramData,
} from '@/types/solution'

export {
  DEFAULT_DISPLAY_CONFIG,
  filterStepsForLevel,
  getStepCountByLevel,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
  PROBLEM_TYPE_LABELS,
} from '@/types/solution'
