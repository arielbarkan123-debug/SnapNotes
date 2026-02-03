'use client'

import { useEffect, useState } from 'react'

interface StreakPopupProps {
  days: number
  onComplete?: () => void
}

export default function StreakPopup({ days, onComplete }: StreakPopupProps) {
  const [stage, setStage] = useState<'enter' | 'visible' | 'exit'>('enter')

  useEffect(() => {
    const enterTimer = setTimeout(() => setStage('visible'), 50)
    const exitTimer = setTimeout(() => setStage('exit'), 1200)
    const removeTimer = setTimeout(() => onComplete?.(), 1500)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [onComplete])

  return (
    <div
      className={`
        pointer-events-none fixed left-1/2 top-1/4 z-50 -translate-x-1/2
        transition-all ease-out
        ${stage === 'enter' ? 'opacity-0 translate-y-0 scale-90' : ''}
        ${stage === 'visible' ? 'opacity-100 -translate-y-4 scale-100' : ''}
        ${stage === 'exit' ? 'opacity-0 -translate-y-12 scale-95' : ''}
      `}
      style={{
        transitionDuration: stage === 'enter' ? '150ms' : '400ms',
      }}
    >
      <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 px-5 py-3 shadow-lg shadow-orange-500/30">
        <span className="text-xl">🔥</span>
        <span className="text-lg font-bold text-white drop-shadow">
          +1 day
        </span>
        <span className="text-sm font-medium text-orange-100">
          ({days} total)
        </span>
      </div>
    </div>
  )
}
