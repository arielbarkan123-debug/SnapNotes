'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { LevelToggle } from './LevelToggle'
import { hasSubjectLevels } from '@/lib/curriculum/grades'
import type { StudySystem, AvailableSubject } from '@/lib/curriculum/types'

interface SubjectCardProps {
  subject: AvailableSubject
  system: StudySystem
  grade?: string | null
  selected: boolean
  level: string | null
  onToggle: () => void
  onLevelChange: (level: string) => void
  compact?: boolean
  className?: string
}

export function SubjectCard({
  subject,
  system,
  grade,
  selected,
  level,
  onToggle,
  onLevelChange,
  compact = false,
  className,
}: SubjectCardProps) {
  const t = useTranslations('subjects')

  // Get translated subject name - falls back to original if not found
  const getSubjectName = (): string => {
    try {
      return t(`${system}.${subject.id}`)
    } catch {
      return subject.name
    }
  }

  const translatedName = getSubjectName()

  // Only show levels if the system supports it AND the grade requires it
  // For Israeli Bagrut, younger grades (א-ט) don't choose יחידות
  const showLevels = hasSubjectLevels(system, grade) && subject.levels && subject.levels.length > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        'relative rounded-lg border-2 transition-all cursor-pointer',
        'hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200',
        compact ? 'p-2' : 'p-3',
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750',
        className
      )}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className={cn('flex items-center gap-2', compact ? 'gap-1.5' : 'gap-2')}>
        {/* Icon */}
        {subject.icon && (
          <span className={cn('flex-shrink-0', compact ? 'text-lg' : 'text-xl')}>
            {subject.icon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn('font-medium truncate', compact ? 'text-sm' : 'text-base')}>
            {translatedName}
          </div>
        </div>
      </div>

      {/* Level selector - only show when selected and has levels */}
      {selected && showLevels && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <LevelToggle
            system={system}
            value={level}
            onChange={onLevelChange}
            availableLevels={subject.levels}
            compact
          />
        </div>
      )}
    </div>
  )
}
