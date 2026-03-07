'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  WalkthroughSolution,
  WalkthroughStreamEvent,
} from '@/types/walkthrough'

export type WalkthroughState =
  | 'idle'
  | 'generating'    // AI is generating solution
  | 'compiling'     // TikZ images compiling
  | 'ready'         // All done
  | 'error'

export interface UseWalkthroughReturn {
  state: WalkthroughState
  walkthroughId: string | null
  solution: WalkthroughSolution | null
  stepImages: string[]
  stepsRendered: number
  totalSteps: number
  error: string | null

  // Navigation
  currentStep: number
  visitedSteps: Set<number>
  isAutoPlaying: boolean
  goToStep: (index: number) => void
  goNext: () => void
  goPrev: () => void
  restart: () => void
  toggleAutoPlay: () => void

  // Actions
  startWalkthrough: (sessionId: string) => Promise<void>
}

/**
 * Main hook for the walkthrough feature.
 * Handles streaming from the API, state management, and navigation.
 */
export function useWalkthrough(): UseWalkthroughReturn {
  // Core state
  const [state, setState] = useState<WalkthroughState>('idle')
  const [walkthroughId, setWalkthroughId] = useState<string | null>(null)
  const [solution, setSolution] = useState<WalkthroughSolution | null>(null)
  const [stepImages, setStepImages] = useState<string[]>([])
  const [stepsRendered, setStepsRendered] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Navigation state
  const [currentStep, setCurrentStep] = useState(0)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  // ─── Navigation ──────────────────────────────────────────────

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= totalSteps) return
    setCurrentStep(index)
    setVisitedSteps(prev => new Set([...prev, index]))
  }, [totalSteps])

  const goNext = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      setIsAutoPlaying(false)
      return
    }
    goToStep(currentStep + 1)
  }, [currentStep, totalSteps, goToStep])

  const goPrev = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1)
  }, [currentStep, goToStep])

  const restart = useCallback(() => {
    setCurrentStep(0)
    setVisitedSteps(new Set([0]))
    setIsAutoPlaying(false)
  }, [])

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying(prev => !prev)
  }, [])

  // ─── Streaming ───────────────────────────────────────────────

  const startWalkthrough = useCallback(async (sessionId: string) => {
    // Cancel any existing stream
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setState('generating')
    setError(null)
    setStepImages([])
    setStepsRendered(0)
    setTotalSteps(0)
    setCurrentStep(0)
    setVisitedSteps(new Set([0]))
    setIsAutoPlaying(false)
    setSolution(null)
    setWalkthroughId(null)

    try {
      const res = await fetch(
        `/api/homework/sessions/${sessionId}/walkthrough`,
        {
          method: 'POST',
          signal: controller.signal,
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const contentType = res.headers.get('content-type') || ''

      // Check if response is JSON (existing walkthrough)
      if (contentType.includes('application/json')) {
        const data = await res.json()
        if (data.type === 'existing') {
          setWalkthroughId(data.walkthroughId)
          setSolution(data.solution)
          setStepImages(data.stepImages || [])
          setStepsRendered(data.stepsRendered || 0)
          setTotalSteps(data.totalSteps || 0)
          setState('ready')
          return
        }
      }

      // Stream response
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event: WalkthroughStreamEvent = JSON.parse(line)
            handleStreamEvent(event)
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event: WalkthroughStreamEvent = JSON.parse(buffer)
          handleStreamEvent(event)
        } catch {
          // Skip
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setState('error')
    }
  }, [])

  const handleStreamEvent = useCallback((event: WalkthroughStreamEvent) => {
    switch (event.type) {
      case 'heartbeat':
        // Keep alive — no state change
        break

      case 'session_created':
        setWalkthroughId(event.walkthroughId)
        break

      case 'solution_ready':
        setSolution(event.solution)
        setTotalSteps(event.totalSteps)
        setStepImages(new Array(event.totalSteps).fill(''))
        setState('compiling')
        break

      case 'step_image':
        setStepImages(prev => {
          const next = [...prev]
          next[event.stepIndex] = event.imageUrl
          return next
        })
        break

      case 'compilation_progress':
        setStepsRendered(event.stepsRendered)
        break

      case 'complete':
        setStepsRendered(event.stepsRendered)
        setState('ready')
        break

      case 'error':
        setError(event.error)
        if (event.partial) {
          setState('ready') // Partial is still usable
        } else if (solution) {
          setState('ready') // If we have solution text, still usable
        } else {
          setState('error')
        }
        break
    }
  }, [solution])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  return {
    state,
    walkthroughId,
    solution,
    stepImages,
    stepsRendered,
    totalSteps,
    error,
    currentStep,
    visitedSteps,
    isAutoPlaying,
    goToStep,
    goNext,
    goPrev,
    restart,
    toggleAutoPlay,
    startWalkthrough,
  }
}
