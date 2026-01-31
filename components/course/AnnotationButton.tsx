'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, AlertTriangle, Star, Check } from 'lucide-react'
import type { Annotation } from '@/hooks/useAnnotations'

interface AnnotationButtonProps {
  annotation?: Annotation
  onSave: (params: {
    noteText?: string
    flagType?: 'confusing' | 'important' | null
  }) => Promise<Annotation | null>
  onDelete?: (id: string) => Promise<boolean>
}

export default function AnnotationButton({ annotation, onSave, onDelete }: AnnotationButtonProps) {
  const t = useTranslations('course.annotations')
  const [isOpen, setIsOpen] = useState(false)
  const [noteText, setNoteText] = useState(annotation?.note_text || '')
  const [flagType, setFlagType] = useState<'confusing' | 'important' | null>(annotation?.flag_type || null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasAnnotation = !!(annotation?.note_text || annotation?.flag_type)

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!noteText.trim() && !flagType) {
      // If both empty, delete if exists
      if (annotation?.id && onDelete) {
        await onDelete(annotation.id)
      }
      setIsOpen(false)
      return
    }

    setIsSaving(true)
    const result = await onSave({ noteText: noteText.trim(), flagType })
    setIsSaving(false)

    if (result) {
      setShowSaved(true)
      setTimeout(() => {
        setShowSaved(false)
        setIsOpen(false)
      }, 800)
    }
  }

  const toggleFlag = (type: 'confusing' | 'important') => {
    setFlagType(prev => prev === type ? null : type)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all
          ${hasAnnotation
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        title={t('addNote')}
      >
        <Pencil className="w-3.5 h-3.5" />
        {hasAnnotation && (
          <span className="hidden sm:inline">{t('addNote')}</span>
        )}
        {annotation?.flag_type === 'confusing' && (
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        )}
        {annotation?.flag_type === 'important' && (
          <Star className="w-3 h-3 text-blue-500" />
        )}
      </button>
    )
  }

  return (
    <div className="mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      <textarea
        ref={textareaRef}
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder={t('notePlaceholder')}
        className="w-full text-sm p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        rows={2}
      />

      <div className="flex items-center justify-between mt-2">
        {/* Flag toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleFlag('confusing')}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors
              ${flagType === 'confusing'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              }
            `}
          >
            <AlertTriangle className="w-3 h-3" />
            {t('confusing')}
          </button>
          <button
            onClick={() => toggleFlag('important')}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors
              ${flagType === 'important'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              }
            `}
          >
            <Star className="w-3 h-3" />
            {t('important')}
          </button>
        </div>

        {/* Save / Cancel */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {showSaved ? (
              <>
                <Check className="w-3 h-3" />
                {t('saved')}
              </>
            ) : isSaving ? (
              '...'
            ) : (
              t('save') || 'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
