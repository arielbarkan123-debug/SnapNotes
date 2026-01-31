'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from './useDebounce'

interface SearchResult {
  type: 'course' | 'review_card' | 'homework' | 'practice' | 'exam'
  courseId?: string
  cardId?: string
  lessonIndex?: number
  stepIndex?: number
  title: string
  snippet: string
  front?: string
  back?: string
  matchScore: number
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}

const RECENT_SEARCHES_KEY = 'notesnap-recent-searches'
const MAX_RECENT = 5

export function useGlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAISearching, setIsAISearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      setIsLoading(false)
      setIsAISearching(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        if (!res.ok) throw new Error('Search failed')
        const data: SearchResponse = await res.json()

        if (!cancelled) {
          setResults(data.results)
          setIsLoading(false)

          // If results are sparse, AI search may be running server-side
          if (data.results.length < 3) {
            setIsAISearching(true)
            // AI search happens server-side, so we just indicate it briefly
            setTimeout(() => {
              if (!cancelled) setIsAISearching(false)
            }, 1500)
          } else {
            setIsAISearching(false)
          }
        }
      } catch {
        if (!cancelled) {
          setResults([])
          setIsLoading(false)
          setIsAISearching(false)
        }
      }
    }

    fetchResults()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const addRecentSearch = useCallback((search: string) => {
    const trimmed = search.trim()
    if (!trimmed) return

    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== trimmed)
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  return {
    query,
    setQuery,
    results,
    isLoading,
    isAISearching,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  }
}

export type { SearchResult }
