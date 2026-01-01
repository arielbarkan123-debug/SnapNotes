'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { SubjectCard } from './SubjectCard'
import { loadAvailableSubjects } from '@/lib/curriculum/loader'
import { getDefaultLevel } from '@/lib/curriculum/grades'
import type { StudySystem, SystemSubjects, AvailableSubject } from '@/lib/curriculum/types'

export interface SelectedSubject {
  id: string
  level: string | null
}

interface SubjectPickerProps {
  system: StudySystem
  grade?: string | null
  selectedSubjects: SelectedSubject[]
  onChange: (subjects: SelectedSubject[]) => void
  maxSubjects?: number
  compact?: boolean
  className?: string
}

export function SubjectPicker({
  system,
  grade,
  selectedSubjects,
  onChange,
  maxSubjects,
  compact = false,
  className,
}: SubjectPickerProps) {
  const [subjectsData, setSubjectsData] = useState<SystemSubjects | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSubjects() {
      setLoading(true)
      setError(null)
      try {
        const data = await loadAvailableSubjects(system)
        setSubjectsData(data)
      } catch {
        setError('Failed to load subjects')
      } finally {
        setLoading(false)
      }
    }
    loadSubjects()
  }, [system])

  const handleToggleSubject = (subject: AvailableSubject) => {
    const isSelected = selectedSubjects.some((s) => s.id === subject.id)

    if (isSelected) {
      // Remove subject
      onChange(selectedSubjects.filter((s) => s.id !== subject.id))
    } else {
      // Add subject with default level
      if (maxSubjects && selectedSubjects.length >= maxSubjects) {
        return // Don't add if at max
      }
      const defaultLevel = subject.levels?.[0] || getDefaultLevel(system) || null
      onChange([...selectedSubjects, { id: subject.id, level: defaultLevel }])
    }
  }

  const handleLevelChange = (subjectId: string, level: string) => {
    onChange(
      selectedSubjects.map((s) =>
        s.id === subjectId ? { ...s, level } : s
      )
    )
  }

  const getSelectedLevel = (subjectId: string): string | null => {
    const found = selectedSubjects.find((s) => s.id === subjectId)
    return found?.level || null
  }

  const isSelected = (subjectId: string): boolean => {
    return selectedSubjects.some((s) => s.id === subjectId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-gray-500 dark:border-t-gray-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !subjectsData) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {error || 'No subjects available for this study system'}
      </div>
    )
  }

  // Group subjects by their group property
  const groupedSubjects = subjectsData.subjects.reduce<Record<string, AvailableSubject[]>>(
    (acc, subject) => {
      const groupId = subject.group || 'other'
      if (!acc[groupId]) {
        acc[groupId] = []
      }
      acc[groupId].push(subject)
      return acc
    },
    {}
  )

  // Get group order from subjectsData.groups, or use alphabetical if no groups defined
  const groupOrder = subjectsData.groups?.map((g) => g.id) || Object.keys(groupedSubjects).sort()
  const groupLabels = subjectsData.groups?.reduce<Record<string, string>>(
    (acc, g) => ({ ...acc, [g.id]: g.name }),
    {}
  ) || {}

  return (
    <div className={cn('space-y-6', className)}>
      {/* Selection count */}
      {maxSubjects && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Selected: {selectedSubjects.length}
          {maxSubjects && ` / ${maxSubjects}`}
        </div>
      )}

      {/* Grouped subjects */}
      {groupOrder.map((groupId) => {
        const subjects = groupedSubjects[groupId]
        if (!subjects || subjects.length === 0) return null

        return (
          <div key={groupId} className="space-y-3">
            {/* Group header */}
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-1">
              {groupLabels[groupId] || groupId}
            </h3>

            {/* Subject grid */}
            <div
              className={cn(
                'grid gap-3',
                compact
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              )}
            >
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  system={system}
                  grade={grade}
                  selected={isSelected(subject.id)}
                  level={getSelectedLevel(subject.id)}
                  onToggle={() => handleToggleSubject(subject)}
                  onLevelChange={(level) => handleLevelChange(subject.id, level)}
                  compact={compact}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Subjects without groups */}
      {groupedSubjects['other']?.length > 0 && !groupOrder.includes('other') && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-1">
            Other Subjects
          </h3>
          <div
            className={cn(
              'grid gap-3',
              compact
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
            )}
          >
            {groupedSubjects['other'].map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                system={system}
                grade={grade}
                selected={isSelected(subject.id)}
                level={getSelectedLevel(subject.id)}
                onToggle={() => handleToggleSubject(subject)}
                onLevelChange={(level) => handleLevelChange(subject.id, level)}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
