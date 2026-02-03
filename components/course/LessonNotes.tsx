'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, AlertTriangle, Star, Send } from 'lucide-react'
import type { Annotation, UseAnnotationsReturn } from '@/hooks/useAnnotations'

interface LessonNotesProps {
  courseId: string
  lessonIndex: number
  annotations: Annotation[]
  saveAnnotation: UseAnnotationsReturn['saveAnnotation']
  deleteAnnotation: UseAnnotationsReturn['deleteAnnotation']
}

export default function LessonNotes({
  courseId: _courseId,
  lessonIndex: _lessonIndex,
  annotations,
  saveAnnotation,
  deleteAnnotation,
}: LessonNotesProps) {
  const t = useTranslations('course.lessonNotes')
  const [isOpen, setIsOpen] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAddNote = async () => {
    const text = newNote.trim()
    if (!text) return

    setIsSaving(true)
    await saveAnnotation({ noteText: text })
    setNewNote('')
    setIsSaving(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }

  return (
    <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
          {t('title')}
          {annotations.length > 0 && (
            <span className="ms-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-full">
              {annotations.length}
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 py-3 space-y-3">
          {/* Existing notes */}
          {annotations.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              {t('noNotes')}
            </p>
          ) : (
            <div className="space-y-2">
              {annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-start gap-3 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {ann.step_index !== null
                          ? t('stepRef', { index: ann.step_index + 1 })
                          : t('lessonLevel')}
                      </span>
                      {ann.flag_type === 'confusing' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          {t('stepRef', { index: '' }).trim() ? '' : ''}
                        </span>
                      )}
                      {ann.flag_type === 'important' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          <Star className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {ann.note_text && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {ann.note_text}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteAnnotation(ann.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors p-1"
                    aria-label="Delete note"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new note input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('addNote')}
              className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || isSaving}
              className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
