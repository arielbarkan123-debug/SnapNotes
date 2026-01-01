import { useCallback, useState } from 'react'

interface ConceptPerformance {
  conceptId: string
  isCorrect: boolean
  responseTimeMs: number
  usedHint?: boolean
}

interface MasteryUpdateResult {
  success: boolean
  updated: number
  error?: string
}

interface UseConceptMasteryReturn {
  recordPerformance: (performance: ConceptPerformance | ConceptPerformance[]) => Promise<MasteryUpdateResult>
  isUpdating: boolean
  lastError: string | null
}

export function useConceptMastery(): UseConceptMasteryReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const recordPerformance = useCallback(async (
    performance: ConceptPerformance | ConceptPerformance[]
  ): Promise<MasteryUpdateResult> => {
    const performances = Array.isArray(performance) ? performance : [performance]

    if (performances.length === 0) {
      return { success: true, updated: 0 }
    }

    setIsUpdating(true)
    setLastError(null)

    try {
      // Update mastery for each concept
      const updates = performances.map((p) => ({
        conceptId: p.conceptId,
        correct: p.isCorrect,
        responseTimeMs: p.responseTimeMs,
        usedHint: p.usedHint,
      }))

      const response = await fetch('/api/user/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update mastery')
      }

      const result = await response.json()
      return { success: true, updated: result.updated || updates.length }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update mastery'
      setLastError(errorMessage)
      console.error('Concept mastery update failed:', err)
      return { success: false, updated: 0, error: errorMessage }
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    recordPerformance,
    isUpdating,
    lastError,
  }
}
