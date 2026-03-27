/**
 * Tests for useGlobalSearch hook
 * hooks/useGlobalSearch.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react'

// Mock useDebounce to return value immediately for testing
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: jest.fn((value: string) => value),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

import { useGlobalSearch } from '@/hooks/useGlobalSearch'

describe('useGlobalSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  it('starts with empty initial state', () => {
    const { result } = renderHook(() => useGlobalSearch())

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAISearching).toBe(false)
  })

  it('fetches results when query changes', async () => {
    const mockResults = {
      results: [
        { type: 'course', title: 'Math 101', snippet: 'Algebra basics', matchScore: 0.9 },
        { type: 'course', title: 'Physics', snippet: 'Forces', matchScore: 0.8 },
        { type: 'course', title: 'Chemistry', snippet: 'Atoms', matchScore: 0.7 },
      ],
      total: 3,
      query: 'math',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults),
    })

    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.setQuery('math')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(3)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/search?q=math')
  })

  it('clears results when query is too short', async () => {
    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.setQuery('a')
    })

    // Should not trigger fetch for short queries
    expect(result.current.results).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.setQuery('test query')
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.results).toEqual([])
  })

  it('manages recent searches in localStorage', () => {
    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.addRecentSearch('first search')
    })

    expect(result.current.recentSearches).toContain('first search')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('clears recent searches', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['one', 'two']))

    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.clearRecentSearches()
    })

    expect(result.current.recentSearches).toEqual([])
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('notesnap-recent-searches')
  })
})
