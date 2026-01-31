'use client'

import { useTranslations } from 'next-intl'

// =============================================================================
// Props
// =============================================================================

interface MemoryStrengthProps {
  stability: number
}

// =============================================================================
// Helpers
// =============================================================================

function getStrengthLevel(stability: number): {
  key: 'weak' | 'learning' | 'good' | 'strong'
  color: string
  barColor: string
  width: string
} {
  if (stability < 1) {
    return { key: 'weak', color: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500', width: 'w-1/4' }
  }
  if (stability < 7) {
    return { key: 'learning', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', width: 'w-2/4' }
  }
  if (stability < 30) {
    return { key: 'good', color: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-500', width: 'w-3/4' }
  }
  return { key: 'strong', color: 'text-green-600 dark:text-green-400', barColor: 'bg-green-500', width: 'w-full' }
}

// =============================================================================
// Component
// =============================================================================

export default function MemoryStrength({ stability }: MemoryStrengthProps) {
  const t = useTranslations('review.memoryStrength')
  const level = getStrengthLevel(stability)

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Mini bar */}
      <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${level.barColor} ${level.width} rounded-full transition-all`} />
      </div>
      {/* Label */}
      <span className={`text-xs font-medium ${level.color}`}>
        {t(level.key)}
      </span>
    </div>
  )
}
