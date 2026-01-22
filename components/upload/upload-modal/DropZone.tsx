'use client'

import { useTranslations } from 'next-intl'
import { MAX_FILES } from './types'

interface DropZoneProps {
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
}

/**
 * Drop zone for file upload when no files are selected
 */
export default function DropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: DropZoneProps) {
  const t = useTranslations('upload')

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`
        relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all min-h-[200px] sm:min-h-[240px] flex items-center justify-center
        ${isDragging
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 active:border-indigo-500 hover:bg-gray-50 active:bg-indigo-50 dark:hover:bg-gray-700/50 dark:active:bg-indigo-900/20'
        }
      `}
    >
      <div className="flex flex-col items-center">
        <div className={`
          w-14 h-14 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-full flex items-center justify-center transition-colors
          ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-100 dark:bg-gray-700'}
        `}>
          <svg
            className={`w-7 h-7 sm:w-8 sm:h-8 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <p className="text-gray-700 dark:text-gray-300 font-medium mb-1 text-base">
          {isDragging ? t('dropFiles') : t('tapToSelect')}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 sm:mb-3 hidden sm:block">
          {t('dragAndDrop')}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs text-center">
          {t('fileLimits')}
          <br />
          <span className="text-gray-400/80">{t('maxFiles', { max: MAX_FILES })}</span>
        </p>
      </div>
    </div>
  )
}
