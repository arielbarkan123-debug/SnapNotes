/**
 * Tests for useProgress hook
 * hooks/useProgress.ts
 */

import { renderHook, waitFor } from '@testing-library/react'

// Mock SWR
const mockMutate = jest.fn()
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

import useSWR from 'swr'
import { useProgress, PROGRESS_CACHE_KEY, type ProgressData } from '@/hooks/useProgress'

const mockUseSWR = useSWR as jest.Mock

describe('useProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMutate.mockResolvedValue(undefined)
  })

  it('returns loading state initially', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: mockMutate,
    })

    const { result } = renderHook(() => useProgress())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns data when loaded', () => {
    const mockData: ProgressData = {
      overview: {
        studyTime: { week: 120, month: 400 },
        cardsReviewed: { count: 50, trend: 10 },
        accuracy: { percent: 85, trend: 5 },
        mastery: { percent: 72, totalLessons: 10 },
      },
      accuracyChart: [{ date: '2026-03-20', accuracy: 0.85, count: 10 }],
      timeChart: [{ date: '2026-03-20', minutes: 30, dayLabel: 'Mon' }],
      masteryMap: [],
      weakAreas: [],
      strongAreas: [],
      insights: [{ icon: '💡', text: 'Keep it up!', type: 'positive' }],
    }

    mockUseSWR.mockReturnValue({
      data: mockData,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: mockMutate,
    })

    const { result } = renderHook(() => useProgress())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBe(mockData)
    expect(result.current.data!.overview.accuracy.percent).toBe(85)
  })

  it('returns error message when SWR errors', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch progress data'),
      isLoading: false,
      isValidating: false,
      mutate: mockMutate,
    })

    const { result } = renderHook(() => useProgress())

    expect(result.current.error).toBe('Failed to fetch progress data')
    expect(result.current.data).toBeNull()
  })

  it('uses the correct SWR cache key', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: mockMutate,
    })

    renderHook(() => useProgress())

    expect(mockUseSWR).toHaveBeenCalledWith(
      PROGRESS_CACHE_KEY,
      expect.objectContaining({
        onErrorRetry: expect.any(Function),
      })
    )
  })

  it('provides refetch function that calls mutate', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: mockMutate,
    })

    const { result } = renderHook(() => useProgress())

    await result.current.refetch()
    expect(mockMutate).toHaveBeenCalled()
  })

  it('provides mutate function for cache invalidation', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: mockMutate,
    })

    const { result } = renderHook(() => useProgress())

    await result.current.mutate()
    expect(mockMutate).toHaveBeenCalled()
  })
})
