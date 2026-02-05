import { renderHook, act } from '@testing-library/react'
import { useDiagramBase } from '@/hooks/useDiagramBase'

describe('useDiagramBase', () => {
  it('initializes with step 0', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 5, subject: 'math' })
    )
    expect(result.current.currentStep).toBe(0)
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

  it('returns subject colors', () => {
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

  it('returns adaptive line weight based on complexity', () => {
    const { result } = renderHook(() =>
      useDiagramBase({ totalSteps: 3, subject: 'math', complexity: 'elementary' })
    )
    expect(result.current.lineWeight).toBe(4)
  })

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
})
