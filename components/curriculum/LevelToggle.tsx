'use client'

import { cn } from '@/lib/utils'
import { getLevelConfig, getLevelLabel } from '@/lib/curriculum/grades'
import type { StudySystem } from '@/lib/curriculum/types'

interface LevelToggleProps {
  system: StudySystem
  value: string | null
  onChange: (level: string) => void
  availableLevels?: string[] // Subject-specific levels (may be subset of system levels)
  compact?: boolean
  disabled?: boolean
  className?: string
}

export function LevelToggle({
  system,
  value,
  onChange,
  availableLevels,
  compact = false,
  disabled = false,
  className,
}: LevelToggleProps) {
  const config = getLevelConfig(system)

  // If no level configuration, don't render anything
  if (config.type === 'none' || config.options.length === 0) {
    return null
  }

  // Use subject-specific levels if provided, otherwise use all system levels
  const levels = availableLevels || config.options

  // If only one level available, show it as a badge
  if (levels.length === 1) {
    return (
      <span className={cn('text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded', className)}>
        {getLevelLabel(system, levels[0])}
      </span>
    )
  }

  // Toggle type (IB: SL/HL)
  if (config.type === 'toggle') {
    return (
      <div
        className={cn(
          'inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden',
          compact ? 'text-xs' : 'text-sm',
          className
        )}
      >
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              onChange(level)
            }}
            className={cn(
              'font-medium transition-colors',
              compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
              value === level
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {level}
          </button>
        ))}
      </div>
    )
  }

  // Select type (Bagrut: 3/4/5 units)
  if (config.type === 'select') {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 px-2 py-1',
          compact ? 'text-xs' : 'text-sm',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <option value="" disabled>
          Select
        </option>
        {levels.map((level) => (
          <option key={level} value={level}>
            {getLevelLabel(system, level)}
          </option>
        ))}
      </select>
    )
  }

  return null
}
