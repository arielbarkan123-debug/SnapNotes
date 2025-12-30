'use client'

import { cn } from '@/lib/utils'
import { getGradesForSystem } from '@/lib/curriculum/grades'
import type { StudySystem, GradeOption } from '@/lib/curriculum/types'

interface GradeSelectorProps {
  system: StudySystem
  value: string | null
  onChange: (grade: string) => void
  className?: string
  disabled?: boolean
}

export function GradeSelector({
  system,
  value,
  onChange,
  className,
  disabled = false,
}: GradeSelectorProps) {
  const grades = getGradesForSystem(system)

  if (!grades.length) {
    return null
  }

  // Determine if this is RTL (Hebrew grades)
  const isRTL = system === 'israeli_bagrut'

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'flex flex-wrap gap-2',
          isRTL && 'flex-row-reverse justify-end'
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {grades.map((grade: GradeOption) => (
          <button
            key={grade.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(grade.id)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-all',
              'border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-200',
              value === grade.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 hover:border-indigo-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={grade.description}
          >
            <span className="block">
              {grade.labelLocalized || grade.label}
            </span>
            {grade.description && value !== grade.id && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                {grade.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
