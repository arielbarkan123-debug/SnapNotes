import { renderHook, act } from '@testing-library/react'
import { useInteractiveParameters } from '@/hooks/useInteractiveParameters'
import type { ParameterDefinition, CalculationResult } from '@/types/interactivity'

// =============================================================================
// Test Data
// =============================================================================

const mockParameters: ParameterDefinition[] = [
  {
    name: 'mass',
    label: 'Mass',
    default: 5,
    min: 0.1,
    max: 100,
    step: 0.1,
  },
  {
    name: 'angle',
    label: 'Angle',
    default: 30,
    min: 0,
    max: 90,
    step: 1,
  },
  {
    name: 'friction',
    label: 'Friction',
    default: 0.3,
    min: 0,
    max: 1,
    step: 0.01,
  },
]

const mockCalculate = (params: Record<string, number>): CalculationResult[] => [
  {
    value: params.mass * 9.8,
    unit: 'N',
    description: 'Weight force',
    label: 'Weight',
    formatted: `${(params.mass * 9.8).toFixed(1)} N`,
    isPrimary: true,
  },
  {
    value: params.mass * 9.8 * Math.sin((params.angle * Math.PI) / 180),
    unit: 'N',
    description: 'Parallel component',
    label: 'Parallel',
    formatted: `${(params.mass * 9.8 * Math.sin((params.angle * Math.PI) / 180)).toFixed(1)} N`,
  },
]

// =============================================================================
// Tests
// =============================================================================

describe('useInteractiveParameters', () => {
  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('initializes with default values from parameters', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      expect(result.current.values.mass).toBe(5)
      expect(result.current.values.angle).toBe(30)
      expect(result.current.values.friction).toBe(0.3)
    })

    it('initializes state correctly', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      expect(result.current.state.isDirty).toBe(false)
      expect(result.current.state.historyIndex).toBe(0)
      expect(result.current.state.history).toHaveLength(1)
    })

    it('initializes actions correctly', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      expect(typeof result.current.actions.setValue).toBe('function')
      expect(typeof result.current.actions.setValues).toBe('function')
      expect(typeof result.current.actions.reset).toBe('function')
      expect(typeof result.current.actions.undo).toBe('function')
      expect(typeof result.current.actions.redo).toBe('function')
      expect(result.current.actions.canUndo).toBe(false)
      expect(result.current.actions.canRedo).toBe(false)
    })

    it('initializes with empty results when no calculate function', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      expect(result.current.results).toEqual([])
    })

    it('calculates initial results when calculate function provided', () => {
      const { result } = renderHook(() =>
        useInteractiveParameters(mockParameters, { calculate: mockCalculate })
      )

      expect(result.current.results).toHaveLength(2)
      expect(result.current.results[0].label).toBe('Weight')
      expect(result.current.results[0].value).toBeCloseTo(49, 1) // 5 * 9.8
    })
  })

  // ---------------------------------------------------------------------------
  // setValue
  // ---------------------------------------------------------------------------

  describe('setValue', () => {
    it('updates a single value', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.values.mass).toBe(10)
      expect(result.current.values.angle).toBe(30) // unchanged
    })

    it('clamps value to min', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', -10) // below min of 0.1
      })

      expect(result.current.values.mass).toBe(0.1)
    })

    it('clamps value to max', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 200) // above max of 100
      })

      expect(result.current.values.mass).toBe(100)
    })

    it('rounds value to step', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('angle', 33.7) // step is 1
      })

      expect(result.current.values.angle).toBe(34) // rounded
    })

    it('marks state as dirty when value changes from default', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      expect(result.current.state.isDirty).toBe(false)

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.state.isDirty).toBe(true)
    })

    it('adds to history', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.state.history).toHaveLength(2)
      expect(result.current.state.historyIndex).toBe(1)
    })

    it('calls onChange callback', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useInteractiveParameters(mockParameters, { onChange })
      )

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ mass: 10, angle: 30, friction: 0.3 })
      )
    })

    it('recalculates results when value changes', () => {
      const { result } = renderHook(() =>
        useInteractiveParameters(mockParameters, { calculate: mockCalculate })
      )

      const initialWeight = result.current.results[0].value

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.results[0].value).toBeCloseTo(98, 1) // 10 * 9.8
      expect(result.current.results[0].value).not.toBe(initialWeight)
    })
  })

  // ---------------------------------------------------------------------------
  // setValues
  // ---------------------------------------------------------------------------

  describe('setValues', () => {
    it('updates multiple values at once', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValues({ mass: 10, angle: 45 })
      })

      expect(result.current.values.mass).toBe(10)
      expect(result.current.values.angle).toBe(45)
      expect(result.current.values.friction).toBe(0.3) // unchanged
    })

    it('clamps and rounds all values', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValues({ mass: 200, angle: 33.7 })
      })

      expect(result.current.values.mass).toBe(100) // clamped
      expect(result.current.values.angle).toBe(34) // rounded
    })

    it('adds single history entry for multiple changes', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValues({ mass: 10, angle: 45, friction: 0.5 })
      })

      expect(result.current.state.history).toHaveLength(2) // initial + one change
    })
  })

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('resets all values to defaults', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
        result.current.actions.setValue('angle', 45)
      })

      expect(result.current.values.mass).toBe(10)

      act(() => {
        result.current.actions.reset()
      })

      expect(result.current.values.mass).toBe(5)
      expect(result.current.values.angle).toBe(30)
      expect(result.current.values.friction).toBe(0.3)
    })

    it('clears dirty state', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.state.isDirty).toBe(true)

      act(() => {
        result.current.actions.reset()
      })

      expect(result.current.state.isDirty).toBe(false)
    })

    it('adds reset to history', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      const historyLength = result.current.state.history.length

      act(() => {
        result.current.actions.reset()
      })

      expect(result.current.state.history.length).toBe(historyLength + 1)
    })
  })

  // ---------------------------------------------------------------------------
  // undo/redo
  // ---------------------------------------------------------------------------

  describe('undo/redo', () => {
    it('undoes last change', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.values.mass).toBe(10)

      act(() => {
        result.current.actions.undo()
      })

      expect(result.current.values.mass).toBe(5) // back to default
    })

    it('redoes undone change', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      act(() => {
        result.current.actions.undo()
      })

      expect(result.current.values.mass).toBe(5)

      act(() => {
        result.current.actions.redo()
      })

      expect(result.current.values.mass).toBe(10)
    })

    it('canUndo is false at initial state', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      expect(result.current.actions.canUndo).toBe(false)
    })

    it('canUndo is true after change', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.actions.canUndo).toBe(true)
    })

    it('canRedo is false when at latest state', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      expect(result.current.actions.canRedo).toBe(false)
    })

    it('canRedo is true after undo', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      act(() => {
        result.current.actions.undo()
      })

      expect(result.current.actions.canRedo).toBe(true)
    })

    it('clears redo history when making new change after undo', () => {
      const { result } = renderHook(() => useInteractiveParameters(mockParameters))

      act(() => {
        result.current.actions.setValue('mass', 10)
        result.current.actions.setValue('mass', 20)
      })

      act(() => {
        result.current.actions.undo() // back to 10
      })

      act(() => {
        result.current.actions.setValue('mass', 15) // new branch
      })

      expect(result.current.values.mass).toBe(15)
      expect(result.current.actions.canRedo).toBe(false)
    })

    it('calls onChange on undo', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useInteractiveParameters(mockParameters, { onChange })
      )

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      onChange.mockClear()

      act(() => {
        result.current.actions.undo()
      })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ mass: 5 })
      )
    })

    it('calls onChange on redo', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useInteractiveParameters(mockParameters, { onChange })
      )

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      act(() => {
        result.current.actions.undo()
      })

      onChange.mockClear()

      act(() => {
        result.current.actions.redo()
      })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ mass: 10 })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // History limits
  // ---------------------------------------------------------------------------

  describe('history limits', () => {
    it('limits history to maxHistorySize', () => {
      const { result } = renderHook(() =>
        useInteractiveParameters(mockParameters, { maxHistorySize: 3 })
      )

      act(() => {
        result.current.actions.setValue('mass', 10)
        result.current.actions.setValue('mass', 20)
        result.current.actions.setValue('mass', 30)
        result.current.actions.setValue('mass', 40)
      })

      expect(result.current.state.history.length).toBeLessThanOrEqual(3)
    })
  })

  // ---------------------------------------------------------------------------
  // Results callback
  // ---------------------------------------------------------------------------

  describe('results callback', () => {
    it('calls onResultsChange when results change', () => {
      const onResultsChange = jest.fn()
      const { result } = renderHook(() =>
        useInteractiveParameters(mockParameters, {
          calculate: mockCalculate,
          onResultsChange,
        })
      )

      // Initial call
      expect(onResultsChange).toHaveBeenCalled()

      onResultsChange.mockClear()

      act(() => {
        result.current.actions.setValue('mass', 10)
      })

      // Called again with new results
      expect(onResultsChange).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Parameter updates
  // ---------------------------------------------------------------------------

  describe('parameter updates', () => {
    it('updates defaults when parameters change', () => {
      const { result, rerender } = renderHook(
        ({ params }) => useInteractiveParameters(params),
        { initialProps: { params: mockParameters } }
      )

      expect(result.current.values.mass).toBe(5)

      const newParams: ParameterDefinition[] = [
        { name: 'mass', label: 'Mass', default: 10, min: 0, max: 100, step: 1 },
      ]

      rerender({ params: newParams })

      // Values persist, but defaults are updated
      // Note: This is current behavior - values don't automatically reset
      expect(result.current.values.mass).toBe(5) // still old value
    })
  })
})
