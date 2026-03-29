'use client'

import useSWR from 'swr'
import type { AcademicEvent, AcademicEventInsert, AcademicEventUpdate } from '@/types'

// ============================================================================
// Cache Key
// ============================================================================

export const ACADEMIC_EVENTS_CACHE_KEY = '/api/academic-events'

function buildCacheKey(from?: string, to?: string): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return qs ? `${ACADEMIC_EVENTS_CACHE_KEY}?${qs}` : ACADEMIC_EVENTS_CACHE_KEY
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetcher(url: string): Promise<AcademicEvent[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch events')
  const data = await res.json()
  return data.events || []
}

// ============================================================================
// Types
// ============================================================================

export interface UseAcademicEventsReturn {
  events: AcademicEvent[]
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
  createEvent: (event: AcademicEventInsert) => Promise<AcademicEvent>
  updateEvent: (id: string, updates: AcademicEventUpdate) => Promise<AcademicEvent>
  deleteEvent: (id: string) => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useAcademicEvents(from?: string, to?: string): UseAcademicEventsReturn {
  const cacheKey = buildCacheKey(from, to)
  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<AcademicEvent[]>(cacheKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  })

  const createEvent = async (event: AcademicEventInsert): Promise<AcademicEvent> => {
    const res = await fetch(ACADEMIC_EVENTS_CACHE_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData?.error?.message || 'Failed to create event')
    }
    const data = await res.json()
    await mutate()
    return data.event
  }

  const updateEvent = async (id: string, updates: AcademicEventUpdate): Promise<AcademicEvent> => {
    const res = await fetch(`${ACADEMIC_EVENTS_CACHE_KEY}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData?.error?.message || 'Failed to update event')
    }
    const data = await res.json()
    await mutate()
    return data.event
  }

  const deleteEvent = async (id: string): Promise<void> => {
    const res = await fetch(`${ACADEMIC_EVENTS_CACHE_KEY}/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData?.error?.message || 'Failed to delete event')
    }
    await mutate()
  }

  const handleMutate = async () => {
    await mutate()
  }

  return {
    events: data || [],
    isLoading,
    error: swrError ? (swrError.message || 'Failed to load events') : null,
    mutate: handleMutate,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}

export default useAcademicEvents
