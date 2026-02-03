/**
 * StepSyncManager - Manages synchronization between diagram states and explanations
 *
 * Coordinates:
 * - Current step tracking
 * - Animation timing and sequencing
 * - Step transitions with callbacks
 * - Auto-advance mode
 * - Keyboard navigation
 */

export interface StepState {
  /** Current step index (0-based) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Whether currently animating between steps */
  isAnimating: boolean
  /** Whether auto-advance is active */
  isAutoAdvancing: boolean
  /** Direction of last transition */
  direction: 'forward' | 'backward' | null
}

export interface StepConfig {
  /** Unique identifier for this step */
  id: string
  /** Display label for the step */
  label: string
  /** Hebrew label */
  labelHe?: string
  /** Duration of this step's animation in ms */
  animationDuration?: number
  /** Elements to highlight during this step */
  highlightElements?: string[]
  /** Elements visible at this step */
  visibleElements?: string[]
  /** Calculation to show */
  calculation?: string
  /** Whether this is a "pause" step (wait for user) */
  requiresInteraction?: boolean
}

export interface StepSyncCallbacks {
  /** Called when step changes */
  onStepChange?: (step: number, direction: 'forward' | 'backward') => void
  /** Called when animation starts */
  onAnimationStart?: (step: number) => void
  /** Called when animation completes */
  onAnimationComplete?: (step: number) => void
  /** Called when all steps complete */
  onComplete?: () => void
  /** Called when reset to beginning */
  onReset?: () => void
}

export interface StepSyncOptions {
  /** Default animation duration in ms */
  defaultAnimationDuration?: number
  /** Auto-advance delay between steps in ms */
  autoAdvanceDelay?: number
  /** Enable keyboard navigation */
  enableKeyboard?: boolean
  /** Loop back to start after completion */
  loop?: boolean
}

const DEFAULT_OPTIONS: Required<StepSyncOptions> = {
  defaultAnimationDuration: 400,
  autoAdvanceDelay: 2000,
  enableKeyboard: true,
  loop: false,
}

/**
 * StepSyncManager class for coordinating diagram step synchronization
 */
export class StepSyncManager {
  private state: StepState
  private steps: StepConfig[]
  private callbacks: StepSyncCallbacks
  private options: Required<StepSyncOptions>
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null
  private animationTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: Set<(state: StepState) => void> = new Set()

  constructor(
    steps: StepConfig[],
    callbacks: StepSyncCallbacks = {},
    options: StepSyncOptions = {}
  ) {
    this.steps = steps
    this.callbacks = callbacks
    this.options = { ...DEFAULT_OPTIONS, ...options }

    this.state = {
      currentStep: 0,
      totalSteps: steps.length,
      isAnimating: false,
      isAutoAdvancing: false,
      direction: null,
    }
  }

  /**
   * Get current state
   */
  getState(): StepState {
    return { ...this.state }
  }

  /**
   * Get current step configuration
   */
  getCurrentStepConfig(): StepConfig | undefined {
    return this.steps[this.state.currentStep]
  }

  /**
   * Get step configuration by index
   */
  getStepConfig(index: number): StepConfig | undefined {
    return this.steps[index]
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: StepState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  /**
   * Go to next step
   */
  next(): boolean {
    if (this.state.isAnimating) return false
    if (this.state.currentStep >= this.state.totalSteps - 1) {
      if (this.options.loop) {
        return this.goToStep(0)
      }
      this.callbacks.onComplete?.()
      return false
    }
    return this.goToStep(this.state.currentStep + 1)
  }

  /**
   * Go to previous step
   */
  previous(): boolean {
    if (this.state.isAnimating) return false
    if (this.state.currentStep <= 0) return false
    return this.goToStep(this.state.currentStep - 1)
  }

  /**
   * Go to specific step
   */
  goToStep(stepIndex: number): boolean {
    if (stepIndex < 0 || stepIndex >= this.state.totalSteps) return false
    if (this.state.isAnimating) return false

    const direction = stepIndex > this.state.currentStep ? 'forward' : 'backward'
    const stepConfig = this.steps[stepIndex]
    const duration = stepConfig?.animationDuration ?? this.options.defaultAnimationDuration

    // Update state
    this.state = {
      ...this.state,
      currentStep: stepIndex,
      isAnimating: true,
      direction,
    }

    // Notify callbacks
    this.callbacks.onStepChange?.(stepIndex, direction)
    this.callbacks.onAnimationStart?.(stepIndex)
    this.notify()

    // Handle animation completion
    this.animationTimer = setTimeout(() => {
      this.state = {
        ...this.state,
        isAnimating: false,
      }
      this.callbacks.onAnimationComplete?.(stepIndex)
      this.notify()

      // Continue auto-advance if active
      if (this.state.isAutoAdvancing && !stepConfig?.requiresInteraction) {
        this.scheduleAutoAdvance()
      }

      // Check for completion
      if (stepIndex === this.state.totalSteps - 1 && !this.options.loop) {
        this.callbacks.onComplete?.()
      }
    }, duration)

    return true
  }

  /**
   * Reset to first step
   */
  reset(): void {
    this.stopAutoAdvance()
    this.clearTimers()

    this.state = {
      currentStep: 0,
      totalSteps: this.steps.length,
      isAnimating: false,
      isAutoAdvancing: false,
      direction: null,
    }

    this.callbacks.onReset?.()
    this.notify()
  }

  /**
   * Start auto-advance mode
   */
  startAutoAdvance(): void {
    if (this.state.isAutoAdvancing) return

    this.state = {
      ...this.state,
      isAutoAdvancing: true,
    }
    this.notify()
    this.scheduleAutoAdvance()
  }

  /**
   * Stop auto-advance mode
   */
  stopAutoAdvance(): void {
    if (!this.state.isAutoAdvancing) return

    this.state = {
      ...this.state,
      isAutoAdvancing: false,
    }

    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer)
      this.autoAdvanceTimer = null
    }

    this.notify()
  }

  /**
   * Toggle auto-advance mode
   */
  toggleAutoAdvance(): boolean {
    if (this.state.isAutoAdvancing) {
      this.stopAutoAdvance()
    } else {
      this.startAutoAdvance()
    }
    return this.state.isAutoAdvancing
  }

  /**
   * Schedule the next auto-advance
   */
  private scheduleAutoAdvance(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer)
    }

    this.autoAdvanceTimer = setTimeout(() => {
      if (this.state.isAutoAdvancing) {
        this.next()
      }
    }, this.options.autoAdvanceDelay)
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
      this.animationTimer = null
    }
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer)
      this.autoAdvanceTimer = null
    }
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.options.enableKeyboard) return false

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        event.preventDefault()
        return this.next()

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        return this.previous()

      case 'Home':
        event.preventDefault()
        return this.goToStep(0)

      case 'End':
        event.preventDefault()
        return this.goToStep(this.state.totalSteps - 1)

      case 'p':
      case 'P':
        event.preventDefault()
        this.toggleAutoAdvance()
        return true

      default:
        return false
    }
  }

  /**
   * Check if can go to next step
   */
  canGoNext(): boolean {
    return !this.state.isAnimating &&
      (this.state.currentStep < this.state.totalSteps - 1 || this.options.loop)
  }

  /**
   * Check if can go to previous step
   */
  canGoPrevious(): boolean {
    return !this.state.isAnimating && this.state.currentStep > 0
  }

  /**
   * Get progress as percentage
   */
  getProgress(): number {
    if (this.state.totalSteps <= 1) return 100
    return (this.state.currentStep / (this.state.totalSteps - 1)) * 100
  }

  /**
   * Update steps (e.g., when diagram data changes)
   */
  updateSteps(newSteps: StepConfig[]): void {
    this.steps = newSteps
    this.state = {
      ...this.state,
      totalSteps: newSteps.length,
      currentStep: Math.min(this.state.currentStep, newSteps.length - 1),
    }
    this.notify()
  }

  /**
   * Cleanup - call when unmounting
   */
  destroy(): void {
    this.clearTimers()
    this.listeners.clear()
  }
}

/**
 * Create step configurations from diagram data
 */
export function createStepsFromDiagramConfig(
  stepConfig: Array<{
    step?: number
    stepLabel?: string
    stepLabelHe?: string
    visibleForces?: string[]
    highlightForces?: string[]
    showCalculation?: string
  }>,
  defaultDuration = 400
): StepConfig[] {
  return stepConfig.map((config, index) => ({
    id: `step-${config.step ?? index}`,
    label: config.stepLabel || `Step ${index + 1}`,
    labelHe: config.stepLabelHe,
    animationDuration: defaultDuration,
    highlightElements: config.highlightForces,
    visibleElements: config.visibleForces,
    calculation: config.showCalculation,
  }))
}

export default StepSyncManager
