'use client'

import { useTranslations } from 'next-intl'
import { type LessonIntensityMode } from '@/types'
import { getIntensityModes } from '@/lib/learning/intensity-config'

interface IntensityModeSelectorProps {
  value: LessonIntensityMode
  onChange: (mode: LessonIntensityMode) => void
  disabled?: boolean
}

/**
 * Selector for lesson intensity mode (quick, standard, deep)
 */
export default function IntensityModeSelector({
  value,
  onChange,
  disabled = false,
}: IntensityModeSelectorProps) {
  const t = useTranslations('upload')

  return (
    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('intensityMode.title')}
      </label>
      <div className="grid grid-cols-3 gap-1.5 xs:gap-2">
        {getIntensityModes().map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center p-2 xs:p-2.5 rounded-lg xs:rounded-xl border-2 transition-all min-h-[72px] xs:min-h-[80px]
              ${value === mode.id
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
              }
              disabled:opacity-50
            `}
          >
            {/* Icon */}
            <span className="text-lg mb-0.5">
              {mode.icon === 'zap' && '⚡'}
              {mode.icon === 'book-open' && '📖'}
              {mode.icon === 'target' && '🎯'}
            </span>
            {/* Name */}
            <span className={`text-xs font-medium ${
              value === mode.id
                ? 'text-violet-700 dark:text-violet-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {t(`intensityMode.${mode.id}.label`)}
            </span>
            {/* Duration */}
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {mode.duration}
            </span>
            {/* Selected indicator */}
            {value === mode.id && (
              <div className="absolute top-1 right-1">
                <svg className="w-3.5 h-3.5 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        {t(`intensityMode.${value}.description`)}
      </p>
    </div>
  )
}
