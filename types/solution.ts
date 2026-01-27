/**
 * Step-by-Step Solution Types
 * Types for unified visual learning solutions across all subjects
 */

import type { MathDiagramState } from './math'
import type { DiagramState as PhysicsDiagramState } from './physics'
import type { ChemistryDiagramState } from './chemistry'
import type { BiologyDiagramState } from './biology'

// ============================================================================
// Core Solution Types
// ============================================================================

export type Subject = 'math' | 'physics' | 'chemistry' | 'biology' | 'geography'

export type UserLevel = 'beginner' | 'intermediate' | 'advanced'

/**
 * Diagram data union type for all subjects
 */
export type DiagramData =
  | MathDiagramState
  | PhysicsDiagramState
  | ChemistryDiagramState
  | BiologyDiagramState

/**
 * A single step in a solution
 */
export interface SolutionStep {
  /** Unique step identifier */
  id: string
  /** Step number (1-indexed for display) */
  stepNumber: number
  /** Step title (e.g., "Find the dividend") */
  title: string
  titleHe?: string
  /** Detailed explanation of this step */
  explanation: string
  explanationHe?: string
  /** Optional diagram to display with this step */
  diagram?: DiagramData
  /** Optional calculation/formula to highlight (LaTeX format) */
  calculation?: string
  /** Whether this step can be skipped for advanced users */
  skipForAdvanced?: boolean
  /** Whether this is a key conceptual step (always shown) */
  isKeyStep?: boolean
  /** Hint to show if student is stuck */
  hint?: string
  hintHe?: string
  /** Expected time in seconds to understand this step */
  estimatedTime?: number
}

/**
 * Complete solution for a problem
 */
export interface Solution {
  /** Unique solution identifier */
  id: string
  /** Subject area */
  subject: Subject
  /** Problem type identifier (e.g., "long_division", "free_body", "atom_structure") */
  problemType: string
  /** Original problem statement */
  problem: string
  problemHe?: string
  /** Final answer */
  answer: string
  answerHe?: string
  /** All steps in the solution */
  steps: SolutionStep[]
  /** Total number of steps */
  totalSteps: number
  /** Recommended user level for this solution */
  recommendedLevel?: UserLevel
  /** Related topics for further learning */
  relatedTopics?: string[]
  /** Tags for categorization */
  tags?: string[]
}

// ============================================================================
// Solution Display Configuration
// ============================================================================

export interface SolutionDisplayConfig {
  /** Current user level for step filtering */
  userLevel: UserLevel
  /** Whether to show basic/detailed steps based on level */
  showBasicSteps: boolean
  /** Whether to auto-advance through steps */
  autoPlay: boolean
  /** Delay between auto-advance steps (ms) */
  autoPlayDelay: number
  /** Whether to animate step transitions */
  animate: boolean
  /** Animation duration (ms) */
  animationDuration: number
  /** Whether to show hints */
  showHints: boolean
  /** Whether to show estimated time */
  showEstimatedTime: boolean
  /** Language */
  language: 'en' | 'he'
}

export const DEFAULT_DISPLAY_CONFIG: SolutionDisplayConfig = {
  userLevel: 'beginner',
  showBasicSteps: true,
  autoPlay: false,
  autoPlayDelay: 3000,
  animate: true,
  animationDuration: 400,
  showHints: true,
  showEstimatedTime: false,
  language: 'en',
}

// ============================================================================
// Navigation State
// ============================================================================

export interface NavigationState {
  /** Current step index (0-indexed) */
  currentStep: number
  /** Total visible steps (may differ from total based on level) */
  totalVisibleSteps: number
  /** Whether auto-play is active */
  isPlaying: boolean
  /** Whether all steps have been viewed */
  completed: boolean
  /** Steps that have been viewed */
  viewedSteps: Set<number>
}

// ============================================================================
// Step Filtering
// ============================================================================

/**
 * Filter steps based on user level
 */
export function filterStepsForLevel(
  steps: SolutionStep[],
  level: UserLevel
): SolutionStep[] {
  switch (level) {
    case 'beginner':
      // Show all steps for beginners
      return steps

    case 'intermediate':
      // Skip steps marked as skippable, but keep key steps
      return steps.filter(step => !step.skipForAdvanced || step.isKeyStep)

    case 'advanced':
      // Only show key conceptual steps
      return steps.filter(step => step.isKeyStep)

    default:
      return steps
  }
}

/**
 * Get step count by level
 */
export function getStepCountByLevel(
  steps: SolutionStep[],
  level: UserLevel
): number {
  return filterStepsForLevel(steps, level).length
}

// ============================================================================
// Subject Colors
// ============================================================================

export const SUBJECT_COLORS: Record<Subject, { primary: string; secondary: string; bg: string }> = {
  math: {
    primary: '#6366f1', // Indigo
    secondary: '#818cf8',
    bg: '#eef2ff',
  },
  physics: {
    primary: '#3b82f6', // Blue
    secondary: '#60a5fa',
    bg: '#dbeafe',
  },
  chemistry: {
    primary: '#14b8a6', // Teal
    secondary: '#2dd4bf',
    bg: '#ccfbf1',
  },
  biology: {
    primary: '#22c55e', // Green
    secondary: '#4ade80',
    bg: '#dcfce7',
  },
  geography: {
    primary: '#f59e0b', // Amber
    secondary: '#fbbf24',
    bg: '#fef3c7',
  },
}

// ============================================================================
// Subject Icons (SVG paths)
// ============================================================================

export const SUBJECT_ICONS: Record<Subject, string> = {
  math: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', // Calculator-like
  physics: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', // Atom-like
  chemistry: 'M9 3v6l-4 8h14l-4-8V3M12 14v4', // Flask
  biology: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z', // Cell
  geography: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', // Globe
}

// ============================================================================
// Problem Type Labels
// ============================================================================

export const PROBLEM_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: {
    // Math
    long_division: 'Long Division',
    equation: 'Equation Solving',
    fraction: 'Fractions',
    // Physics
    fbd: 'Free Body Diagram',
    inclined_plane: 'Inclined Plane',
    projectile: 'Projectile Motion',
    // Chemistry
    atom: 'Atomic Structure',
    molecule: 'Molecular Structure',
    bonding: 'Chemical Bonding',
    // Biology
    cell: 'Cell Structure',
    dna: 'DNA Structure',
    process: 'Biological Process',
  },
  he: {
    // Math
    long_division: 'חילוק ארוך',
    equation: 'פתרון משוואה',
    fraction: 'שברים',
    // Physics
    fbd: 'דיאגרמת גוף חופשי',
    inclined_plane: 'מישור משופע',
    projectile: 'תנועה בליסטית',
    // Chemistry
    atom: 'מבנה אטום',
    molecule: 'מבנה מולקולה',
    bonding: 'קשר כימי',
    // Biology
    cell: 'מבנה תא',
    dna: 'מבנה DNA',
    process: 'תהליך ביולוגי',
  },
}
