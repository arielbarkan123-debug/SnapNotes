import { renderHook, act } from '@testing-library/react'
import { useDiagramBase } from '@/hooks/useDiagramBase'

describe('useDiagramBase', () => {
  // ---- Step Control ----

  it('initializes with step 0 by default', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    expect(result.current.currentStep).toBe(0)
  })

  it('respects initialStep parameter', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math', initialStep: 3 })
    )
    expect(result.current.currentStep).toBe(3)
  })

  it('advances step on next()', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    act(() => result.current.next())
    expect(result.current.currentStep).toBe(1)
  })

  it('does not exceed totalSteps - 1', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 2, subject: 'math' })
    )
    act(() => result.current.next())
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.currentStep).toBe(1)
  })

  it('goes back on prev()', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    act(() => result.current.next())
    act(() => result.current.next())
    act(() => result.current.prev())
    expect(result.current.currentStep).toBe(1)
  })

  it('does not go below 0', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    act(() => result.current.prev())
    expect(result.current.currentStep).toBe(0)
  })

  it('goToStep jumps to a specific step', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    act(() => result.current.goToStep(3))
    expect(result.current.currentStep).toBe(3)
  })

  it('goToStep clamps to valid range', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    act(() => result.current.goToStep(100))
    expect(result.current.currentStep).toBe(4)
    act(() => result.current.goToStep(-5))
    expect(result.current.currentStep).toBe(0)
  })

  // ---- Callback ----

  it('calls onStepChange when step changes via next()', () => {
    const onStepChange = jest.fn()
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math', onStepChange })
    )
    act(() => result.current.next())
    expect(onStepChange).toHaveBeenCalledWith(1)
  })

  it('calls onStepChange when step changes via prev()', () => {
    const onStepChange = jest.fn()
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math', initialStep: 2, onStepChange })
    )
    act(() => result.current.prev())
    expect(onStepChange).toHaveBeenCalledWith(1)
  })

  it('calls onStepChange when step changes via goToStep()', () => {
    const onStepChange = jest.fn()
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math', onStepChange })
    )
    act(() => result.current.goToStep(4))
    expect(onStepChange).toHaveBeenCalledWith(4)
  })

  it('does not call onStepChange when next() is at max', () => {
    const onStepChange = jest.fn()
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 2, subject: 'math', initialStep: 1, onStepChange })
    )
    act(() => result.current.next())
    expect(onStepChange).not.toHaveBeenCalled()
  })

  it('does not call onStepChange when prev() is at 0', () => {
    const onStepChange = jest.fn()
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math', onStepChange })
    )
    act(() => result.current.prev())
    expect(onStepChange).not.toHaveBeenCalled()
  })

  // ---- Subject Colors ----

  it('returns subject colors for math', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math' })
    )
    expect(result.current.colors.primary).toBe('#6366f1')
  })

  it('returns geometry colors for geometry subject', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'geometry' })
    )
    expect(result.current.colors.primary).toBe('#ec4899')
  })

  // ---- Complexity / Line Weight ----

  it('returns adaptive line weight for elementary', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math', complexity: 'elementary' })
    )
    expect(result.current.lineWeight).toBe(4)
  })

  it('returns adaptive line weight for middle_school (default)', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math' })
    )
    expect(result.current.lineWeight).toBe(3)
  })

  it('returns adaptive line weight for high_school', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math', complexity: 'high_school' })
    )
    expect(result.current.lineWeight).toBe(2)
  })

  it('returns adaptive line weight for advanced', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math', complexity: 'advanced' })
    )
    expect(result.current.lineWeight).toBe(2)
  })

  // ---- Step Status ----

  it('reports isFirstStep and isLastStep correctly', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 2, subject: 'math' })
    )
    expect(result.current.isFirstStep).toBe(true)
    expect(result.current.isLastStep).toBe(false)
    act(() => result.current.next())
    expect(result.current.isFirstStep).toBe(false)
    expect(result.current.isLastStep).toBe(true)
  })

  // ---- Progress ----

  it('calculates progress as fraction of total steps', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    expect(result.current.progress).toBe(0)
    act(() => result.current.next())
    expect(result.current.progress).toBe(0.25)
    act(() => result.current.goToStep(4))
    expect(result.current.progress).toBe(1)
  })

  it('progress is 1 when totalSteps is 1', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 1, subject: 'math' })
    )
    expect(result.current.progress).toBe(1)
  })

  // ---- Spotlight ----

  it('tracks spotlightElement for current step', () => {
    const { result } = renderHook(() =>
      useDiagramBase({
        totalSteps: 3,
        subject: 'math',
        stepSpotlights: ['line-base', 'angle-A', 'label-area'],
      })
    )
    expect(result.current.spotlightElement).toBe('line-base')
    act(() => result.current.next())
    expect(result.current.spotlightElement).toBe('angle-A')
  })

  it('spotlightElement is null when no spotlights provided', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math' })
    )
    expect(result.current.spotlightElement).toBeNull()
  })

  // ---- RTL ----

  it('isRTL is false for English', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math', language: 'en' })
    )
    expect(result.current.isRTL).toBe(false)
  })

  it('isRTL is true for Hebrew', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math', language: 'he' })
    )
    expect(result.current.isRTL).toBe(true)
  })

  it('isRTL defaults to false', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math' })
    )
    expect(result.current.isRTL).toBe(false)
  })

  // ---- Backgrounds ----

  it('returns DIAGRAM_BACKGROUNDS', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math' })
    )
    expect(result.current.backgrounds.light).toHaveProperty('fill')
    expect(result.current.backgrounds.dark).toHaveProperty('fill')
    expect(result.current.backgrounds.light.fill).toBe('#ffffff')
    expect(result.current.backgrounds.dark.fill).toBe('#1a1a2e')
  })

  // ---- Edge Cases ----

  it('handles totalSteps of 1 without crashing', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 1, subject: 'math' })
    )
    expect(result.current.currentStep).toBe(0)
    expect(result.current.isFirstStep).toBe(true)
    expect(result.current.isLastStep).toBe(true)
    act(() => result.current.next())
    expect(result.current.currentStep).toBe(0)
  })
})
