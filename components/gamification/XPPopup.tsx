'use client'

import { useEffect, useState } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface XPPopupData {
  id: string
  type: 'xp' | 'levelUp'
  amount?: number
  level?: number
  title?: string
}

interface XPPopupProps {
  popup: XPPopupData
  onComplete: (id: string) => void
}

interface XPPopupContainerProps {
  popups: XPPopupData[]
  onComplete: (id: string) => void
}

// =============================================================================
// Single XP Popup Component
// =============================================================================

export function XPPopup({ popup, onComplete }: XPPopupProps) {
  const [stage, setStage] = useState<'enter' | 'visible' | 'exit'>('enter')

  const isLevelUp = popup.type === 'levelUp'
  const duration = isLevelUp ? 3000 : 1500

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => {
      setStage('visible')
    }, 50)

    // Start exit animation
    const exitTimer = setTimeout(() => {
      setStage('exit')
    }, duration - 300)

    // Remove from DOM
    const removeTimer = setTimeout(() => {
      onComplete(popup.id)
    }, duration)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [popup.id, duration, onComplete])

  if (isLevelUp) {
    return (
      <div
        className={`
          pointer-events-none fixed inset-0 z-50 flex items-center justify-center
          transition-all duration-300 ease-out
          ${stage === 'enter' ? 'opacity-0 scale-90' : ''}
          ${stage === 'visible' ? 'opacity-100 scale-100' : ''}
          ${stage === 'exit' ? 'opacity-0 scale-110' : ''}
        `}
        aria-label={`Level up! You reached level ${popup.level}${popup.title ? `, ${popup.title}` : ''}`}
      >
        <div className="flex flex-col items-center gap-2">
          {/* Glow effect */}
          <div className="absolute h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl" />

          {/* Level up text */}
          <div
            className={`
              relative text-center
              transition-transform duration-500
              ${stage === 'visible' ? 'translate-y-0' : 'translate-y-4'}
            `}
          >
            <div className="text-5xl font-bold text-yellow-400 drop-shadow-lg">
              Level Up!
            </div>
            <div className="mt-2 text-6xl">
              🎉
            </div>
            <div className="mt-4 text-3xl font-semibold text-white drop-shadow-md">
              Level {popup.level}
            </div>
            {popup.title && (
              <div className="mt-2 text-xl text-yellow-300/90">
                {popup.title}
              </div>
            )}
          </div>

          {/* Sparkle particles */}
          <div className="absolute">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute h-2 w-2 animate-ping rounded-full bg-yellow-300"
                style={{
                  top: `${Math.sin((i / 8) * Math.PI * 2) * 80}px`,
                  left: `${Math.cos((i / 8) * Math.PI * 2) * 80}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Regular XP popup
  return (
    <div
      className={`
        pointer-events-none fixed left-1/2 top-1/3 z-50 -translate-x-1/2
        transition-all ease-out
        ${stage === 'enter' ? 'opacity-0 translate-y-0' : ''}
        ${stage === 'visible' ? 'opacity-100 -translate-y-8' : ''}
        ${stage === 'exit' ? 'opacity-0 -translate-y-16' : ''}
      `}
      style={{
        transitionDuration: stage === 'enter' ? '150ms' : '500ms',
      }}
      aria-label={`Earned ${popup.amount} experience points`}
    >
      <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 shadow-lg shadow-yellow-500/30">
        <span className="text-lg font-bold text-white drop-shadow">
          +{popup.amount} XP
        </span>
        <span className="text-lg" aria-hidden="true">✨</span>
      </div>
    </div>
  )
}

// =============================================================================
// XP Popup Container
// =============================================================================

export function XPPopupContainer({ popups, onComplete }: XPPopupContainerProps) {
  return (
    <div role="status" aria-live="polite" aria-label="XP notifications">
      {popups.map((popup, index) => (
        <div
          key={popup.id}
          style={{
            // Offset multiple popups so they don't overlap
            transform: popup.type === 'xp' ? `translateY(${index * 50}px)` : undefined,
          }}
        >
          <XPPopup popup={popup} onComplete={onComplete} />
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Stacked XP Popup (for multiple XP gains)
// =============================================================================

interface StackedXPPopupProps {
  totalXP: number
  count: number
  onComplete: () => void
}

export function StackedXPPopup({ totalXP, count, onComplete }: StackedXPPopupProps) {
  const [stage, setStage] = useState<'enter' | 'visible' | 'exit'>('enter')

  useEffect(() => {
    const enterTimer = setTimeout(() => setStage('visible'), 50)
    const exitTimer = setTimeout(() => setStage('exit'), 1700)
    const removeTimer = setTimeout(onComplete, 2000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [onComplete])

  return (
    <div
      className={`
        pointer-events-none fixed left-1/2 top-1/3 z-50 -translate-x-1/2
        transition-all ease-out
        ${stage === 'enter' ? 'opacity-0 translate-y-0 scale-90' : ''}
        ${stage === 'visible' ? 'opacity-100 -translate-y-8 scale-100' : ''}
        ${stage === 'exit' ? 'opacity-0 -translate-y-16 scale-95' : ''}
      `}
      style={{
        transitionDuration: stage === 'enter' ? '150ms' : '400ms',
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3 shadow-lg shadow-yellow-500/30">
          <span className="text-2xl font-bold text-white drop-shadow">
            +{totalXP} XP
          </span>
          <span className="text-2xl">🔥</span>
        </div>
        {count > 1 && (
          <div className="text-sm font-medium text-yellow-400/80">
            {count} actions
          </div>
        )}
      </div>
    </div>
  )
}

export default XPPopup
