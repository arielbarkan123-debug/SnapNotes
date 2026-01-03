'use client'

import { createContext, useContext, useCallback, useState, useRef, useEffect, ReactNode } from 'react'
import { XPPopupContainer, type XPPopupData } from '@/components/gamification/XPPopup'
import { getLevelTitle } from '@/lib/gamification/xp'

// =============================================================================
// Types
// =============================================================================

interface XPContextValue {
  /** Show XP gain popup */
  showXP: (amount: number) => void
  /** Show level up celebration */
  showLevelUp: (level: number, title?: string) => void
  /** Show achievement earned */
  showAchievement: (name: string, xpReward: number) => void
  /** Batch XP display (combines multiple gains) */
  batchXP: (amount: number) => void
  /** Flush batched XP display */
  flushBatch: () => void
}

interface XPProviderProps {
  children: ReactNode
}

// =============================================================================
// Context
// =============================================================================

const XPContext = createContext<XPContextValue | undefined>(undefined)

// =============================================================================
// Provider
// =============================================================================

export function XPProvider({ children }: XPProviderProps) {
  const [popups, setPopups] = useState<XPPopupData[]>([])

  // Batching state
  const batchedXP = useRef(0)
  const batchCount = useRef(0)
  const batchTimer = useRef<NodeJS.Timeout | null>(null)

  const generateId = () => `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const removePopup = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const showXP = useCallback((amount: number) => {
    const popup: XPPopupData = {
      id: generateId(),
      type: 'xp',
      amount,
    }

    setPopups((prev) => {
      // Limit to 3 XP popups at a time
      const xpPopups = prev.filter((p) => p.type === 'xp')
      const otherPopups = prev.filter((p) => p.type !== 'xp')

      if (xpPopups.length >= 3) {
        return [...otherPopups, ...xpPopups.slice(-2), popup]
      }
      return [...prev, popup]
    })
  }, [])

  const showLevelUp = useCallback((level: number, title?: string) => {
    const popup: XPPopupData = {
      id: generateId(),
      type: 'levelUp',
      level,
      title: title || getLevelTitle(level),
    }

    // Level up takes priority - clear existing popups
    setPopups([popup])
  }, [])

  const showAchievement = useCallback((name: string, xpReward: number) => {
    // Show XP with a slight delay to appear after achievement toast
    setTimeout(() => {
      showXP(xpReward)
    }, 500)
  }, [showXP])

  const flushBatch = useCallback(() => {
    if (batchedXP.current > 0) {
      const popup: XPPopupData = {
        id: generateId(),
        type: 'xp',
        amount: batchedXP.current,
      }
      setPopups((prev) => [...prev, popup])
      batchedXP.current = 0
      batchCount.current = 0
    }
    if (batchTimer.current) {
      clearTimeout(batchTimer.current)
      batchTimer.current = null
    }
  }, [])

  const batchXP = useCallback((amount: number) => {
    batchedXP.current += amount
    batchCount.current += 1

    // Clear existing timer
    if (batchTimer.current) {
      clearTimeout(batchTimer.current)
    }

    // Set timer to flush after 500ms of no new XP
    batchTimer.current = setTimeout(() => {
      flushBatch()
    }, 500)
  }, [flushBatch])

  // Cleanup: Clear timer on unmount to prevent memory leak and lost XP
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current)
        // Flush any remaining batched XP before unmount
        if (batchedXP.current > 0) {
          flushBatch()
        }
      }
    }
  }, [flushBatch])

  const value: XPContextValue = {
    showXP,
    showLevelUp,
    showAchievement,
    batchXP,
    flushBatch,
  }

  return (
    <XPContext.Provider value={value}>
      {children}
      <XPPopupContainer popups={popups} onComplete={removePopup} />
    </XPContext.Provider>
  )
}

// =============================================================================
// Hook
// =============================================================================

export function useXP(): XPContextValue {
  const context = useContext(XPContext)

  if (context === undefined) {
    throw new Error('useXP must be used within an XPProvider')
  }

  return context
}

// =============================================================================
// Helper hook for API integration
// =============================================================================

interface XPResult {
  xpAwarded: number
  levelUp: boolean
  newLevel?: number
  newTitle?: string
}

/**
 * Hook that handles XP display from API responses
 */
export function useXPDisplay() {
  const { showXP, showLevelUp } = useXP()

  const displayXPResult = useCallback((result: XPResult) => {
    // Show XP first
    if (result.xpAwarded > 0) {
      showXP(result.xpAwarded)
    }

    // Show level up after XP animation
    if (result.levelUp && result.newLevel) {
      setTimeout(() => {
        showLevelUp(result.newLevel!, result.newTitle)
      }, 800)
    }
  }, [showXP, showLevelUp])

  return { displayXPResult }
}

export default XPContext
