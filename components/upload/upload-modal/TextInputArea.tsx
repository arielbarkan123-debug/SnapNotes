'use client'

import { useTranslations } from 'next-intl'

interface TextInputAreaProps {
  textContent: string
  onTextChange: (text: string) => void
  title: string
  onTitleChange: (title: string) => void
  disabled?: boolean
}

/**
 * Text input area for creating courses from pasted text
 */
export default function TextInputArea({
  textContent,
  onTextChange,
  title,
  onTitleChange,
  disabled = false,
}: TextInputAreaProps) {
  const t = useTranslations('upload')

  return (
    <div className="space-y-4">
      {/* Text Input Area */}
      <div>
        <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('textInputLabel')}
        </label>
        <textarea
          id="text-content"
          value={textContent}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t('textPlaceholder')}
          disabled={disabled}
          rows={10}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:opacity-50 text-sm resize-none"
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {t('textDescription')}
        </p>
      </div>

      {/* Character count */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {textContent.length < 20 ? (
            <span className="text-amber-600 dark:text-amber-400">
              {t('minCharsRequired', { remaining: 20 - textContent.length })}
            </span>
          ) : (
            <span className="text-green-600 dark:text-green-400">
              {t('readyToGenerate')}
            </span>
          )}
        </span>
        <span>{t('characters', { count: textContent.length })}</span>
      </div>

      {/* Title Input */}
      <div>
        <label htmlFor="text-course-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('courseTitle')}
        </label>
        <input
          id="text-course-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('courseTitlePlaceholder')}
          disabled={disabled}
          className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:opacity-50 text-base"
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {t('courseTitleHintText')}
        </p>
      </div>
    </div>
  )
}
