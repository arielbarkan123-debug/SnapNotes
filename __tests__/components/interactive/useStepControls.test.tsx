import { renderHook, act } from '@testing-library/react'
import { useStepControls } from '@/components/interactive/DiagramStepControls'
import type { StepConfig } from '@/lib/visual-learning/step-sync-manager'

// Helper to create mock steps
function createMockSteps(count: number): StepConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `step-${i}`,
    label: `Step ${i + 1}`,
    labelHe: `שלב ${i + 1}`,
    animationDuration: 300,
  }))
}

describe('useStepControls', () => {
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
    it('initializes with state at step 0', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      expect(result.current.state.currentStep).toBe(0)
      expect(result.current.state.totalSteps).toBe(5)
      expect(result.current.state.isAnimating).toBe(false)
      expect(result.current.state.isAutoAdvancing).toBe(false)
    })

    it('provides navigation functions', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      expect(typeof result.current.next).toBe('function')
      expect(typeof result.current.previous).toBe('function')
      expect(typeof result.current.goToStep).toBe('function')
      expect(typeof result.current.toggleAutoAdvance).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })

    it('exposes the manager instance', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      expect(result.current.manager).toBeDefined()
    })
  })

  // ============================================================================
  // Step Navigation
  // ============================================================================

  describe('step navigation', () => {
    it('advances step on next()', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      act(() => {
        result.current.next()
      })

      // State updates after animation starts
      expect(result.current.state.currentStep).toBe(1)
      expect(result.current.state.isAnimating).toBe(true)

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(400)
      })

      expect(result.current.state.isAnimating).toBe(false)
    })

    it('goes back on previous()', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      // Go to step 2 first
      act(() => {
        result.current.goToStep(2)
        jest.advanceTimersByTime(400)
      })

      expect(result.current.state.currentStep).toBe(2)

      // Go back
      act(() => {
        result.current.previous()
        jest.advanceTimersByTime(400)
      })

      expect(result.current.state.currentStep).toBe(1)
    })

    it('jumps to specific step on goToStep()', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      act(() => {
        result.current.goToStep(3)
        jest.advanceTimersByTime(400)
      })

      expect(result.current.state.currentStep).toBe(3)
    })

    it('resets to step 0 on reset()', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      act(() => {
        result.current.goToStep(3)
        jest.advanceTimersByTime(400)
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.state.currentStep).toBe(0)
    })
  })

  // ============================================================================
  // Auto-Advance
  // ============================================================================

  describe('auto-advance', () => {
    it('toggles auto-advance', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() => useStepControls(steps))

      act(() => {
        result.current.toggleAutoAdvance()
      })

      expect(result.current.state.isAutoAdvancing).toBe(true)

      act(() => {
        result.current.toggleAutoAdvance()
      })

      expect(result.current.state.isAutoAdvancing).toBe(false)
    })

    it('auto-advances after delay', () => {
      const steps = createMockSteps(5)
      const { result } = renderHook(() =>
        useStepControls(steps, { autoAdvanceDelay: 1000 })
      )

      act(() => {
        result.current.toggleAutoAdvance()
      })

      // Wait for auto-advance delay + animation
      act(() => {
        jest.advanceTimersByTime(1000 + 400)
      })

      expect(result.current.state.currentStep).toBe(1)
    })
  })

  // ============================================================================
  // Options
  // ============================================================================

  describe('options', () => {
    it('uses custom animation duration', () => {
      // Create steps WITHOUT animationDuration so it uses defaultAnimationDuration
      const steps: StepConfig[] = [
        { id: 'step-0', label: 'Step 1' },
        { id: 'step-1', label: 'Step 2' },
        { id: 'step-2', label: 'Step 3' },
      ]
      const { result } = renderHook(() =>
        useStepControls(steps, { defaultAnimationDuration: 100 })
      )

      act(() => {
        result.current.next()
      })

      expect(result.current.state.isAnimating).toBe(true)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(result.current.state.isAnimating).toBe(false)
    })

    it('calls onComplete when reaching final step', () => {
      const onComplete = jest.fn()
      const steps = createMockSteps(3)
      const { result } = renderHook(() =>
        useStepControls(steps, { onComplete })
      )

      act(() => {
        result.current.goToStep(2)
        jest.advanceTimersByTime(400)
      })

      expect(onComplete).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Steps Update
  // ============================================================================

  describe('steps update', () => {
    it('updates state when steps change', () => {
      const initialSteps = createMockSteps(3)
      const { result, rerender } = renderHook(
        ({ steps }) => useStepControls(steps),
        { initialProps: { steps: initialSteps } }
      )

      expect(result.current.state.totalSteps).toBe(3)

      const newSteps = createMockSteps(5)
      rerender({ steps: newSteps })

      expect(result.current.state.totalSteps).toBe(5)
    })

    it('clamps currentStep when steps decrease', () => {
      const initialSteps = createMockSteps(5)
      const { result, rerender } = renderHook(
        ({ steps }) => useStepControls(steps),
        { initialProps: { steps: initialSteps } }
      )

      act(() => {
        result.current.goToStep(4)
        jest.advanceTimersByTime(400)
      })

      expect(result.current.state.currentStep).toBe(4)

      const newSteps = createMockSteps(3)
      rerender({ steps: newSteps })

      expect(result.current.state.currentStep).toBe(2)
    })
  })

  // ============================================================================
  // Cleanup
  // ============================================================================

  describe('cleanup', () => {
    it('cleans up on unmount', () => {
      const steps = createMockSteps(5)
      const { result, unmount } = renderHook(() => useStepControls(steps))

      act(() => {
        result.current.toggleAutoAdvance()
      })

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })
})
