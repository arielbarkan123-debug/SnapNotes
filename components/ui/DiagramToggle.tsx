'use client'

import { useVisuals, type DiagramMode } from '@/contexts/VisualsContext'
import { useTranslations } from 'next-intl'

interface DiagramToggleProps {
  /** Compact mode shows just icons (no label text) */
  compact?: boolean
  className?: string
}

const MODES: { value: DiagramMode; icon: string; colorOn: string }[] = [
  { value: 'off', icon: '✕', colorOn: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'quick', icon: '⚡', colorOn: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { value: 'accurate', icon: '🎯', colorOn: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
]

/**
 * Three-way diagram mode selector: Off / Quick / Accurate.
 * Reads from and writes to VisualsContext (persisted in localStorage + DB).
 * Can be placed in any feature UI (courses, practice, homework, prepare).
 */
export default function DiagramToggle({ compact = false, className = '' }: DiagramToggleProps) {
  const { preferences, setDiagramMode } = useVisuals()
  const t = useTranslations('common')
  const currentMode = preferences.diagramMode

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}
      role="radiogroup"
      aria-label={t('settings.diagramMode') || 'Diagram mode'}
    >
      {MODES.map((mode) => {
        const isActive = currentMode === mode.value
        const label = t(`settings.diagram${mode.value.charAt(0).toUpperCase() + mode.value.slice(1)}`) || mode.value

        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setDiagramMode(mode.value)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
              ${isActive
                ? `${mode.colorOn} shadow-sm`
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }
            `}
            title={label}
          >
            <span className="text-xs leading-none">{mode.icon}</span>
            {!compact && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
