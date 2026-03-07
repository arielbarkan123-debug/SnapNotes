/**
 * Walkthrough Types
 *
 * Types for the interactive step-by-step solution walkthrough feature.
 * The walkthrough replaces the chat view after "Get Help", showing
 * evolving TikZ diagrams with red-highlighted new elements per step,
 * plus per-step scoped chat threads.
 */

// ============================================================================
// Walkthrough Step & Solution (AI-generated content)
// ============================================================================

/** A single step in the walkthrough solution */
export interface WalkthroughStep {
  /** Step index (0-based) */
  index: number
  /** Short title (EN) */
  title: string
  /** Short title (HE) */
  titleHe: string
  /** Detailed explanation with inline LaTeX math (EN) */
  explanation: string
  /** Detailed explanation with inline LaTeX math (HE) */
  explanationHe: string
  /** Key equation for this step (LaTeX, e.g. "v_x = v_0 \\cos\\theta") */
  equation?: string
  /** Brief description of what new elements appear in the diagram */
  newElements?: string
}

/** Complete AI-generated solution structure */
export interface WalkthroughSolution {
  /** Step-by-step solution */
  steps: WalkthroughStep[]
  /** Complete layered TikZ code with % === LAYER N === markers */
  tikzCode: string
  /** Final answer (EN) */
  finalAnswer: string
  /** Final answer (HE) */
  finalAnswerHe: string
}

// ============================================================================
// Walkthrough Session (database record)
// ============================================================================

/** Generation status for the walkthrough pipeline */
export type WalkthroughGenerationStatus =
  | 'generating'  // AI is generating the solution
  | 'compiling'   // TikZ images are being compiled
  | 'partial'     // Some images compiled, some failed
  | 'complete'    // All images ready
  | 'failed'      // Generation failed entirely

/** Database record for a walkthrough session */
export interface WalkthroughSession {
  id: string
  homework_session_id: string
  user_id: string
  question_text: string
  /** AI-generated solution (steps + TikZ code) */
  solution: WalkthroughSolution
  /** Current generation pipeline status */
  generation_status: WalkthroughGenerationStatus
  /** Number of step images that have been rendered */
  steps_rendered: number
  /** Total number of steps */
  total_steps: number
  /** Array of image URLs for each step (index-aligned with solution.steps) */
  step_images: string[]
  created_at: string
  updated_at: string
}

// ============================================================================
// Per-Step Chat
// ============================================================================

/** A single message in a step-scoped chat thread */
export interface WalkthroughStepChatMessage {
  id: string
  walkthrough_id: string
  user_id: string
  /** Which step this message belongs to (0-based index) */
  step_index: number
  /** Message role */
  role: 'student' | 'tutor'
  /** Message content (may contain LaTeX math) */
  content: string
  created_at: string
}

// ============================================================================
// Streaming Event Types (API → Client)
// ============================================================================

/** Events streamed from the walkthrough API to the client */
export type WalkthroughStreamEvent =
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'session_created'; walkthroughId: string }
  | { type: 'solution_ready'; solution: WalkthroughSolution; totalSteps: number }
  | { type: 'step_image'; stepIndex: number; imageUrl: string }
  | { type: 'compilation_progress'; stepsRendered: number; totalSteps: number }
  | { type: 'complete'; stepsRendered: number; totalSteps: number }
  | { type: 'error'; error: string; partial?: boolean }
