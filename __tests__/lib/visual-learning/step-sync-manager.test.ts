import {
  StepSyncManager,
  createStepsFromDiagramConfig,
  type StepConfig,
  type StepSyncCallbacks,
  type StepSyncOptions,
} from '@/lib/visual-learning/step-sync-manager'

// Helper to create mock steps
function createMockSteps(count: number): StepConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `step-${i}`,
    label: `Step ${i + 1}`,
    labelHe: `שלב ${i + 1}`,
    animationDuration: 300,
  }))
}

// Helper to wait for timers
function advanceTimers(ms: number) {
  jest.advanceTimersByTime(ms)
}

describe('StepSyncManager', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('initialization', () => {
    it('creates with default state at step 0', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)
      const state = manager.getState()

      expect(state.currentStep).toBe(0)
      expect(state.totalSteps).toBe(5)
      expect(state.isAnimating).toBe(false)
      expect(state.isAutoAdvancing).toBe(false)
      expect(state.direction).toBeNull()
    })

    it('initializes with empty steps array', () => {
      const manager = new StepSyncManager([])
      const state = manager.getState()

      expect(state.totalSteps).toBe(0)
    })

    it('accepts custom options', () => {
      const steps = createMockSteps(3)
      const manager = new StepSyncManager(steps, {}, {
        defaultAnimationDuration: 500,
        autoAdvanceDelay: 3000,
        enableKeyboard: false,
        loop: true,
      })

      // Options are internal but we can test their effects
      expect(manager).toBeDefined()
    })
  })

  // ============================================================================
  // Step Navigation
  // ============================================================================

  describe('step navigation', () => {
    describe('next()', () => {
      it('advances to next step', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        const result = manager.next()
        advanceTimers(400) // Wait for animation

        expect(result).toBe(true)
        expect(manager.getState().currentStep).toBe(1)
      })

      it('does not exceed max step', () => {
        const steps = createMockSteps(3)
        const manager = new StepSyncManager(steps)

        manager.goToStep(2)
        advanceTimers(400)

        const result = manager.next()
        expect(result).toBe(false)
        expect(manager.getState().currentStep).toBe(2)
      })

      it('loops when loop option is enabled', () => {
        const steps = createMockSteps(3)
        const manager = new StepSyncManager(steps, {}, { loop: true })

        manager.goToStep(2)
        advanceTimers(400)

        const result = manager.next()
        advanceTimers(400)

        expect(result).toBe(true)
        expect(manager.getState().currentStep).toBe(0)
      })

      it('does not advance while animating', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        manager.next() // Start animation
        const result = manager.next() // Try to advance again

        expect(result).toBe(false)
      })
    })

    describe('previous()', () => {
      it('goes back to previous step', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        manager.goToStep(3)
        advanceTimers(400)

        const result = manager.previous()
        advanceTimers(400)

        expect(result).toBe(true)
        expect(manager.getState().currentStep).toBe(2)
      })

      it('does not go below 0', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        const result = manager.previous()
        expect(result).toBe(false)
        expect(manager.getState().currentStep).toBe(0)
      })

      it('does not go back while animating', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        manager.goToStep(3)
        advanceTimers(400)

        manager.previous() // Start animation
        const result = manager.previous() // Try again

        expect(result).toBe(false)
      })
    })

    describe('goToStep()', () => {
      it('jumps to specific step', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        const result = manager.goToStep(3)
        advanceTimers(400)

        expect(result).toBe(true)
        expect(manager.getState().currentStep).toBe(3)
      })

      it('returns false for out-of-range positive index', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        const result = manager.goToStep(10)
        expect(result).toBe(false)
        expect(manager.getState().currentStep).toBe(0)
      })

      it('returns false for negative index', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        const result = manager.goToStep(-1)
        expect(result).toBe(false)
      })

      it('sets direction to forward when jumping ahead', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        manager.goToStep(3)
        expect(manager.getState().direction).toBe('forward')
      })

      it('sets direction to backward when jumping back', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        manager.goToStep(3)
        advanceTimers(400)

        manager.goToStep(1)
        expect(manager.getState().direction).toBe('backward')
      })
    })

    describe('reset()', () => {
      it('resets to step 0', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        manager.goToStep(3)
        advanceTimers(400)

        manager.reset()
        const state = manager.getState()

        expect(state.currentStep).toBe(0)
        expect(state.isAnimating).toBe(false)
        expect(state.isAutoAdvancing).toBe(false)
        expect(state.direction).toBeNull()
      })

      it('stops auto-advance when resetting', () => {
        const steps = createMockSteps(5)
        const manager = new StepSyncManager(steps)

        manager.startAutoAdvance()
        manager.reset()

        expect(manager.getState().isAutoAdvancing).toBe(false)
      })
    })
  })

  // ============================================================================
  // Animation State
  // ============================================================================

  describe('animation state', () => {
    it('sets isAnimating to true during step transition', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      manager.next()
      expect(manager.getState().isAnimating).toBe(true)
    })

    it('sets isAnimating to false after animation completes', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      manager.next()
      advanceTimers(400)

      expect(manager.getState().isAnimating).toBe(false)
    })

    it('uses custom animation duration from step config', () => {
      const steps: StepConfig[] = [
        { id: 'step-0', label: 'Step 1', animationDuration: 100 },
        { id: 'step-1', label: 'Step 2', animationDuration: 500 },
      ]
      const manager = new StepSyncManager(steps)

      // Navigate to step 1, which has 500ms animation duration
      manager.next()

      // After 100ms (less than 500ms), should still be animating
      advanceTimers(100)
      expect(manager.getState().isAnimating).toBe(true)

      // After total 500ms, animation should be complete
      advanceTimers(400)
      expect(manager.getState().isAnimating).toBe(false)
    })
  })

  // ============================================================================
  // Auto-Advance
  // ============================================================================

  describe('auto-advance', () => {
    it('starts auto-advancing', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      manager.startAutoAdvance()
      expect(manager.getState().isAutoAdvancing).toBe(true)
    })

    it('auto-advances after delay', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps, {}, { autoAdvanceDelay: 1000 })

      manager.startAutoAdvance()
      advanceTimers(1000) // Auto-advance delay
      advanceTimers(400) // Animation

      expect(manager.getState().currentStep).toBe(1)
    })

    it('stops auto-advancing', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      manager.startAutoAdvance()
      manager.stopAutoAdvance()

      expect(manager.getState().isAutoAdvancing).toBe(false)
    })

    it('toggles auto-advance', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      let result = manager.toggleAutoAdvance()
      expect(result).toBe(true)
      expect(manager.getState().isAutoAdvancing).toBe(true)

      result = manager.toggleAutoAdvance()
      expect(result).toBe(false)
      expect(manager.getState().isAutoAdvancing).toBe(false)
    })

    it('pauses on steps requiring interaction', () => {
      const steps: StepConfig[] = [
        { id: 'step-0', label: 'Step 1' },
        { id: 'step-1', label: 'Step 2', requiresInteraction: true },
        { id: 'step-2', label: 'Step 3' },
      ]
      const manager = new StepSyncManager(steps, {}, { autoAdvanceDelay: 1000 })

      manager.startAutoAdvance()
      advanceTimers(1000) // Advance to step 1
      advanceTimers(400) // Animation

      // Should not auto-advance past step 1 because it requires interaction
      advanceTimers(1000)
      advanceTimers(400)

      expect(manager.getState().currentStep).toBe(1)
      expect(manager.getState().isAutoAdvancing).toBe(true) // Still in auto mode
    })
  })

  // ============================================================================
  // Callbacks
  // ============================================================================

  describe('callbacks', () => {
    it('calls onStepChange when step changes', () => {
      const onStepChange = jest.fn()
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps, { onStepChange })

      manager.next()

      expect(onStepChange).toHaveBeenCalledWith(1, 'forward')
    })

    it('calls onAnimationStart when animation begins', () => {
      const onAnimationStart = jest.fn()
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps, { onAnimationStart })

      manager.next()

      expect(onAnimationStart).toHaveBeenCalledWith(1)
    })

    it('calls onAnimationComplete when animation ends', () => {
      const onAnimationComplete = jest.fn()
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps, { onAnimationComplete })

      manager.next()
      advanceTimers(400)

      expect(onAnimationComplete).toHaveBeenCalledWith(1)
    })

    it('calls onComplete when reaching final step', () => {
      const onComplete = jest.fn()
      const steps = createMockSteps(3)
      const manager = new StepSyncManager(steps, { onComplete })

      manager.goToStep(2)
      advanceTimers(400)

      expect(onComplete).toHaveBeenCalled()
    })

    it('calls onReset when resetting', () => {
      const onReset = jest.fn()
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps, { onReset })

      manager.goToStep(3)
      advanceTimers(400)
      manager.reset()

      expect(onReset).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Subscriptions
  // ============================================================================

  describe('subscriptions', () => {
    it('notifies subscribers on state change', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)
      const listener = jest.fn()

      manager.subscribe(listener)
      manager.next()

      expect(listener).toHaveBeenCalled()
      expect(listener.mock.calls[0][0].currentStep).toBe(1)
    })

    it('unsubscribes correctly', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)
      const listener = jest.fn()

      const unsubscribe = manager.subscribe(listener)
      unsubscribe()
      manager.next()

      expect(listener).not.toHaveBeenCalled()
    })

    it('handles multiple subscribers', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      manager.subscribe(listener1)
      manager.subscribe(listener2)
      manager.next()

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Keyboard Handling
  // ============================================================================

  describe('keyboard handling', () => {
    it('advances on ArrowRight', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      const prevented = manager.handleKeyDown(event)

      expect(prevented).toBe(true)
      expect(manager.getState().currentStep).toBe(1)
    })

    it('goes back on ArrowLeft', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      manager.goToStep(2)
      advanceTimers(400)

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      manager.handleKeyDown(event)
      advanceTimers(400)

      expect(manager.getState().currentStep).toBe(1)
    })

    it('advances on Space', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      const event = new KeyboardEvent('keydown', { key: ' ' })
      manager.handleKeyDown(event)

      expect(manager.getState().currentStep).toBe(1)
    })

    it('jumps to start on Home', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      manager.goToStep(3)
      advanceTimers(400)

      const event = new KeyboardEvent('keydown', { key: 'Home' })
      manager.handleKeyDown(event)
      advanceTimers(400)

      expect(manager.getState().currentStep).toBe(0)
    })

    it('jumps to end on End', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      const event = new KeyboardEvent('keydown', { key: 'End' })
      manager.handleKeyDown(event)
      advanceTimers(400)

      expect(manager.getState().currentStep).toBe(4)
    })

    it('toggles auto-advance on P', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      const event = new KeyboardEvent('keydown', { key: 'p' })
      manager.handleKeyDown(event)

      expect(manager.getState().isAutoAdvancing).toBe(true)
    })

    it('ignores keyboard when disabled', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps, {}, { enableKeyboard: false })

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      const handled = manager.handleKeyDown(event)

      expect(handled).toBe(false)
      expect(manager.getState().currentStep).toBe(0)
    })
  })

  // ============================================================================
  // Helper Methods
  // ============================================================================

  describe('helper methods', () => {
    it('getCurrentStepConfig returns current step config', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      expect(manager.getCurrentStepConfig()).toEqual(steps[0])

      manager.goToStep(2)
      advanceTimers(400)

      expect(manager.getCurrentStepConfig()).toEqual(steps[2])
    })

    it('getStepConfig returns specific step config', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      expect(manager.getStepConfig(3)).toEqual(steps[3])
      expect(manager.getStepConfig(10)).toBeUndefined()
    })

    it('canGoNext returns correct value', () => {
      const steps = createMockSteps(3)
      const manager = new StepSyncManager(steps)

      expect(manager.canGoNext()).toBe(true)

      manager.goToStep(2)
      advanceTimers(400)

      expect(manager.canGoNext()).toBe(false)
    })

    it('canGoPrevious returns correct value', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      expect(manager.canGoPrevious()).toBe(false)

      manager.goToStep(2)
      advanceTimers(400)

      expect(manager.canGoPrevious()).toBe(true)
    })

    it('getProgress returns percentage', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      expect(manager.getProgress()).toBe(0)

      manager.goToStep(2)
      advanceTimers(400)

      expect(manager.getProgress()).toBe(50)

      manager.goToStep(4)
      advanceTimers(400)

      expect(manager.getProgress()).toBe(100)
    })

    it('getProgress handles single step', () => {
      const steps = createMockSteps(1)
      const manager = new StepSyncManager(steps)

      expect(manager.getProgress()).toBe(100)
    })
  })

  // ============================================================================
  // Update Steps
  // ============================================================================

  describe('updateSteps', () => {
    it('updates steps dynamically', () => {
      const steps = createMockSteps(3)
      const manager = new StepSyncManager(steps)

      const newSteps = createMockSteps(5)
      manager.updateSteps(newSteps)

      expect(manager.getState().totalSteps).toBe(5)
    })

    it('clamps currentStep when new steps are fewer', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)

      manager.goToStep(4)
      advanceTimers(400)

      const newSteps = createMockSteps(3)
      manager.updateSteps(newSteps)

      expect(manager.getState().currentStep).toBe(2)
    })

    it('notifies listeners when steps update', () => {
      const steps = createMockSteps(3)
      const manager = new StepSyncManager(steps)
      const listener = jest.fn()

      manager.subscribe(listener)
      manager.updateSteps(createMockSteps(5))

      expect(listener).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Cleanup
  // ============================================================================

  describe('cleanup', () => {
    it('destroy clears timers and listeners', () => {
      const steps = createMockSteps(5)
      const manager = new StepSyncManager(steps)
      const listener = jest.fn()

      manager.subscribe(listener)
      manager.startAutoAdvance()

      // listener is called once when startAutoAdvance updates state
      expect(listener).toHaveBeenCalledTimes(1)
      listener.mockClear()

      manager.destroy()

      // Advance time - should not trigger any callbacks after destroy
      advanceTimers(5000)

      // Listener should not be called after destroy
      expect(listener).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// createStepsFromDiagramConfig
// ============================================================================

describe('createStepsFromDiagramConfig', () => {
  it('creates step configs from diagram config array', () => {
    const config = [
      { step: 0, stepLabel: 'Setup', visibleForces: ['weight'] },
      { step: 1, stepLabel: 'Add forces', visibleForces: ['weight', 'normal'] },
      { step: 2, stepLabel: 'Solve', showCalculation: 'F = 10N' },
    ]

    const steps = createStepsFromDiagramConfig(config)

    expect(steps).toHaveLength(3)
    expect(steps[0].id).toBe('step-0')
    expect(steps[0].label).toBe('Setup')
    expect(steps[2].calculation).toBe('F = 10N')
  })

  it('uses index when step not specified', () => {
    const config = [
      { stepLabel: 'First' },
      { stepLabel: 'Second' },
    ]

    const steps = createStepsFromDiagramConfig(config)

    expect(steps[0].id).toBe('step-0')
    expect(steps[1].id).toBe('step-1')
  })

  it('includes Hebrew labels', () => {
    const config = [
      { stepLabel: 'Draw', stepLabelHe: 'ציירו' },
    ]

    const steps = createStepsFromDiagramConfig(config)

    expect(steps[0].labelHe).toBe('ציירו')
  })

  it('uses custom default duration', () => {
    const config = [{ stepLabel: 'Step' }]

    const steps = createStepsFromDiagramConfig(config, 600)

    expect(steps[0].animationDuration).toBe(600)
  })
})
