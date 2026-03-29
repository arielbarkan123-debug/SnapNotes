'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  Link2,
  StickyNote,
  Trash2,
  Check,
  ExternalLink,
  FileText,
} from 'lucide-react'
import type {
  AcademicEvent,
  AcademicEventUpdate,
  EventPriority,
  EventMaterial,
  PrepStrategy,
} from '@/types'
import { EVENT_TYPE_COLORS, EVENT_TYPE_ICONS } from '@/types'
import TopicsList from './TopicsList'
import PrepStrategyPicker from './PrepStrategyPicker'
import ConfirmModal from '@/components/ui/ConfirmModal'

// ============================================================================
// Props
// ============================================================================

interface EventDetailPanelProps {
  event: AcademicEvent
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: AcademicEventUpdate) => Promise<void>
  onDelete: () => Promise<void>
}

// ============================================================================
// Priority config
// ============================================================================

const PRIORITIES: {
  value: EventPriority
  label: string
  color: string
  activeColor: string
}[] = [
  {
    value: 'low',
    label: 'Low',
    color:
      'text-green-600 dark:text-green-400 border-gray-200 dark:border-gray-600',
    activeColor:
      'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-400 dark:border-green-500',
  },
  {
    value: 'medium',
    label: 'Medium',
    color:
      'text-amber-600 dark:text-amber-400 border-gray-200 dark:border-gray-600',
    activeColor:
      'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-500',
  },
  {
    value: 'high',
    label: 'High',
    color:
      'text-red-600 dark:text-red-400 border-gray-200 dark:border-gray-600',
    activeColor:
      'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-400 dark:border-red-500',
  },
]

// ============================================================================
// Component
// ============================================================================

export default function EventDetailPanel({
  event,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: EventDetailPanelProps) {
  // ---- Local editing state ----
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(event.title)
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState(event.event_date)
  const [timeDraft, setTimeDraft] = useState(event.event_time || '')
  const [editingSubject, setEditingSubject] = useState(false)
  const [subjectDraft, setSubjectDraft] = useState(event.subject || '')
  const [descriptionDraft, setDescriptionDraft] = useState(
    event.description || ''
  )
  const [editingDescription, setEditingDescription] = useState(false)

  // Materials inline forms
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Prep strategy
  const [strategy, setStrategy] = useState<PrepStrategy>(event.prep_strategy)
  const [prepDays, setPrepDays] = useState(event.prep_days)
  const [isGenerating, setIsGenerating] = useState(false)

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Sync local state when event prop changes
  useEffect(() => {
    setTitleDraft(event.title)
    setDateDraft(event.event_date)
    setTimeDraft(event.event_time || '')
    setSubjectDraft(event.subject || '')
    setDescriptionDraft(event.description || '')
    setStrategy(event.prep_strategy)
    setPrepDays(event.prep_days)
  }, [event])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      if (isOpen) document.body.style.overflow = ''
    }
  }, [isOpen])

  // ---- Save helpers ----
  const saveTitle = useCallback(async () => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== event.title) {
      await onUpdate({ title: trimmed })
    }
    setEditingTitle(false)
  }, [titleDraft, event.title, onUpdate])

  const saveDate = useCallback(async () => {
    const updates: AcademicEventUpdate = {}
    if (dateDraft !== event.event_date) updates.event_date = dateDraft
    const newTime = timeDraft || null
    if (newTime !== (event.event_time || null)) updates.event_time = newTime
    if (Object.keys(updates).length) await onUpdate(updates)
    setEditingDate(false)
  }, [dateDraft, timeDraft, event, onUpdate])

  const saveSubject = useCallback(async () => {
    const trimmed = subjectDraft.trim()
    if (trimmed !== (event.subject || '')) {
      await onUpdate({ subject: trimmed || null })
    }
    setEditingSubject(false)
  }, [subjectDraft, event.subject, onUpdate])

  const saveDescription = useCallback(async () => {
    const trimmed = descriptionDraft.trim()
    if (trimmed !== (event.description || '')) {
      await onUpdate({ description: trimmed || null })
    }
    setEditingDescription(false)
  }, [descriptionDraft, event.description, onUpdate])

  const handlePriorityChange = useCallback(
    async (p: EventPriority) => {
      if (p !== event.priority) await onUpdate({ priority: p })
    },
    [event.priority, onUpdate]
  )

  const handleTopicsChange = useCallback(
    async (topics: string[]) => {
      await onUpdate({ topics })
    },
    [onUpdate]
  )

  // ---- Materials ----
  const addLink = useCallback(async () => {
    if (!linkUrl.trim()) return
    const newMaterial: EventMaterial = {
      type: 'link',
      url: linkUrl.trim(),
      title: linkTitle.trim() || linkUrl.trim(),
    }
    await onUpdate({ materials: [...event.materials, newMaterial] })
    setLinkUrl('')
    setLinkTitle('')
    setShowAddLink(false)
  }, [linkUrl, linkTitle, event.materials, onUpdate])

  const addNote = useCallback(async () => {
    if (!noteText.trim()) return
    const newMaterial: EventMaterial = {
      type: 'note',
      title: noteText.trim(),
    }
    await onUpdate({ materials: [...event.materials, newMaterial] })
    setNoteText('')
    setShowAddNote(false)
  }, [noteText, event.materials, onUpdate])

  const removeMaterial = useCallback(
    async (index: number) => {
      const next = event.materials.filter((_, i) => i !== index)
      await onUpdate({ materials: next })
    },
    [event.materials, onUpdate]
  )

  // ---- Prep strategy ----
  const handleStrategyChange = useCallback(
    async (s: PrepStrategy) => {
      setStrategy(s)
      await onUpdate({ prep_strategy: s })
    },
    [onUpdate]
  )

  const handleDaysChange = useCallback(
    async (d: number) => {
      setPrepDays(d)
      await onUpdate({ prep_days: d })
    },
    [onUpdate]
  )

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      // Call the generate-schedule API
      await fetch('/api/study-plan/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          strategy,
          days: prepDays,
        }),
      })
    } catch {
      // errors handled silently for now
    } finally {
      setIsGenerating(false)
    }
  }, [event.id, strategy, prepDays])

  // ---- Delete ----
  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      await onDelete()
      setShowDeleteConfirm(false)
      onClose()
    } catch {
      // handled upstream
    } finally {
      setIsDeleting(false)
    }
  }, [onDelete, onClose])

  // ---- Derived ----
  const typeColors = EVENT_TYPE_COLORS[event.event_type]
  const typeIcon = EVENT_TYPE_ICONS[event.event_type]

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return d
    }
  }

  const formatTime = (t: string) => {
    try {
      const [h, m] = t.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
    } catch {
      return t
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
        className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-md
          bg-white dark:bg-gray-800 shadow-2xl
          transform transition-transform duration-300 ease-out
          overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        tabIndex={-1}
      >
        {/* ---- Header ---- */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-3 px-5 py-4">
            {/* Icon */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg
                ${typeColors.bg}`}
            >
              {typeIcon}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') {
                      setTitleDraft(event.title)
                      setEditingTitle(false)
                    }
                  }}
                  autoFocus
                  className="w-full text-lg font-bold bg-transparent border-b-2 border-violet-400
                    text-gray-900 dark:text-white
                    focus:outline-none py-0.5"
                />
              ) : (
                <h2
                  id="event-detail-title"
                  className="text-lg font-bold text-gray-900 dark:text-white truncate
                    cursor-pointer hover:text-violet-600 dark:hover:text-violet-400
                    transition-colors"
                  onClick={() => {
                    setEditingTitle(true)
                    setTimeout(() => titleInputRef.current?.focus(), 0)
                  }}
                >
                  {event.title}
                </h2>
              )}

              {/* Type badge */}
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium
                  ${typeColors.bg} ${typeColors.text}`}
              >
                {event.event_type.charAt(0).toUpperCase() +
                  event.event_type.slice(1)}
              </span>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                focus:outline-none focus:ring-2 focus:ring-violet-400"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ---- Content ---- */}
        <div className="px-5 py-5 space-y-6">
          {/* Date & Time */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <Calendar className="w-4 h-4" />
              Date & Time
            </h3>
            {editingDate ? (
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateDraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <input
                  type="time"
                  value={timeDraft}
                  onChange={(e) => setTimeDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveDate}
                    className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium
                      hover:bg-violet-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateDraft(event.event_date)
                      setTimeDraft(event.event_time || '')
                      setEditingDate(false)
                    }}
                    className="px-3 py-1.5 rounded-lg text-gray-500 text-xs font-medium
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDate(true)}
                className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(event.event_date)}
                </p>
                {event.event_time && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(event.event_time)}
                  </p>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit
                </span>
              </button>
            )}
          </section>

          {/* Subject */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <BookOpen className="w-4 h-4" />
              Subject
            </h3>
            {editingSubject ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={subjectDraft}
                  onChange={(e) => setSubjectDraft(e.target.value)}
                  onBlur={saveSubject}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveSubject()
                    if (e.key === 'Escape') {
                      setSubjectDraft(event.subject || '')
                      setEditingSubject(false)
                    }
                  }}
                  autoFocus
                  placeholder="e.g., Biology, Math"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingSubject(true)}
                className="text-sm text-gray-700 dark:text-gray-300
                  hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {event.subject || (
                  <span className="text-gray-400 dark:text-gray-500 italic">
                    Add subject...
                  </span>
                )}
              </button>
            )}
          </section>

          {/* Priority */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Priority
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePriorityChange(p.value)}
                  className={`py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all
                    focus:outline-none focus:ring-2 focus:ring-violet-400
                    ${event.priority === p.value ? p.activeColor : p.color}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Description */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Description
            </h3>
            {editingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="Add description..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveDescription}
                    className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium
                      hover:bg-violet-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDescriptionDraft(event.description || '')
                      setEditingDescription(false)
                    }}
                    className="px-3 py-1.5 rounded-lg text-gray-500 text-xs font-medium
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDescription(true)}
                className="w-full text-left text-sm text-gray-700 dark:text-gray-300
                  hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {event.description || (
                  <span className="text-gray-400 dark:text-gray-500 italic">
                    Add description...
                  </span>
                )}
              </button>
            )}
          </section>

          {/* Topics */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Topics
            </h3>
            <TopicsList
              topics={event.topics}
              onChange={handleTopicsChange}
            />
          </section>

          {/* Materials */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Materials
            </h3>

            {/* Existing materials */}
            {event.materials.length > 0 && (
              <div className="space-y-2 mb-3">
                {event.materials.map((mat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 group"
                  >
                    {mat.type === 'link' ? (
                      <Link2 className="w-4 h-4 flex-shrink-0 text-blue-500" />
                    ) : mat.type === 'file' ? (
                      <FileText className="w-4 h-4 flex-shrink-0 text-amber-500" />
                    ) : (
                      <StickyNote className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    )}

                    {mat.type === 'link' && mat.url ? (
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate
                          flex items-center gap-1"
                      >
                        {mat.title}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                        {mat.title}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeMaterial(i)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500
                        hover:bg-red-50 dark:hover:bg-red-900/20
                        opacity-0 group-hover:opacity-100 transition-all
                        focus:outline-none focus:opacity-100"
                      aria-label={`Remove material: ${mat.title}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add link form */}
            {showAddLink && (
              <div className="space-y-2 mb-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="URL"
                  autoFocus
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addLink}
                    disabled={!linkUrl.trim()}
                    className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium
                      hover:bg-violet-600 disabled:opacity-50 transition-colors
                      flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLink(false)
                      setLinkUrl('')
                      setLinkTitle('')
                    }}
                    className="px-3 py-1.5 rounded-lg text-gray-500 text-xs font-medium
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add note form */}
            {showAddNote && (
              <div className="space-y-2 mb-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Note text"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addNote()
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={!noteText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium
                      hover:bg-violet-600 disabled:opacity-50 transition-colors
                      flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddNote(false)
                      setNoteText('')
                    }}
                    className="px-3 py-1.5 rounded-lg text-gray-500 text-xs font-medium
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add buttons */}
            {!showAddLink && !showAddNote && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLink(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    text-violet-600 dark:text-violet-400
                    hover:bg-violet-50 dark:hover:bg-violet-900/20
                    transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Add link
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    text-violet-600 dark:text-violet-400
                    hover:bg-violet-50 dark:hover:bg-violet-900/20
                    transition-colors"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  Add note
                </button>
              </div>
            )}
          </section>

          {/* Prep Strategy */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              Prep Strategy
            </h3>
            <PrepStrategyPicker
              strategy={strategy}
              days={prepDays}
              onStrategyChange={handleStrategyChange}
              onDaysChange={handleDaysChange}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </section>

          {/* Danger Zone */}
          <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20
                transition-colors w-full justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Delete Event
            </button>
          </section>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  )
}
