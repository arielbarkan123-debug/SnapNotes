'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import type {
  AcademicEvent,
  AcademicEventInsert,
  AcademicEventType,
  EventPriority,
} from '@/types'
import { EVENT_TYPE_ICONS } from '@/types'
import { useAcademicEvents } from '@/hooks/useAcademicEvents'
import Button from '@/components/ui/Button'

// ============================================================================
// Props
// ============================================================================

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: string
  onEventCreated?: (event: AcademicEvent) => void
}

// ============================================================================
// Constants
// ============================================================================

const EVENT_TYPES: { value: AcademicEventType; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'homework', label: 'Homework' },
  { value: 'project', label: 'Project' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
]

const PRIORITIES: { value: EventPriority; label: string; color: string; activeColor: string }[] = [
  {
    value: 'low',
    label: 'Low',
    color: 'text-green-600 dark:text-green-400 border-gray-200 dark:border-gray-600',
    activeColor: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-400 dark:border-green-500',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'text-amber-600 dark:text-amber-400 border-gray-200 dark:border-gray-600',
    activeColor: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-500',
  },
  {
    value: 'high',
    label: 'High',
    color: 'text-red-600 dark:text-red-400 border-gray-200 dark:border-gray-600',
    activeColor: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-400 dark:border-red-500',
  },
]

// ============================================================================
// Component
// ============================================================================

export default function AddEventModal({
  isOpen,
  onClose,
  defaultDate,
  onEventCreated,
}: AddEventModalProps) {
  const { createEvent } = useAcademicEvents()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<AcademicEventType>('test')
  const [date, setDate] = useState(defaultDate || '')
  const [time, setTime] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<EventPriority>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setEventType('test')
      setDate(defaultDate || '')
      setTime('')
      setSubject('')
      setDescription('')
      setPriority('medium')
      setError(null)
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [isOpen, defaultDate])

  // Focus trap & scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => dialogRef.current?.focus(), 0)
    }
    return () => {
      if (isOpen) {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Escape key
  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
    if (previousActiveElement.current?.focus) {
      setTimeout(() => previousActiveElement.current?.focus(), 0)
    }
  }, [onClose, isSubmitting])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, handleClose])

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return

    setIsSubmitting(true)
    setError(null)

    try {
      const insert: AcademicEventInsert = {
        title: title.trim(),
        event_type: eventType,
        event_date: date,
        priority,
        created_via: 'manual',
      }
      if (time) insert.event_time = time
      if (subject.trim()) insert.subject = subject.trim()
      if (description.trim()) insert.description = description.trim()

      const created = await createEvent(insert)
      onEventCreated?.(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4
        bg-black/50 backdrop-blur-sm"
      onClick={isSubmitting ? undefined : handleClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-title"
        className="relative w-full sm:max-w-lg bg-white dark:bg-gray-800
          rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none
          max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4
          bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700
          rounded-t-2xl">
          <h2
            id="add-event-title"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Add Event
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-violet-400"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="event-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Biology Midterm"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                transition-colors"
            />
          </div>

          {/* Event Type */}
          <div>
            <label
              htmlFor="event-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Event Type
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as AcademicEventType)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                transition-colors appearance-none"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {EVENT_TYPE_ICONS[t.value]} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="event-date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                  transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="event-time"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Time
              </label>
              <input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                  transition-colors"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor="event-subject"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Subject
            </label>
            <input
              id="event-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Biology, Math"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="event-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any details..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                transition-colors resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all
                    focus:outline-none focus:ring-2 focus:ring-violet-400
                    ${priority === p.value ? p.activeColor : p.color}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] sm:min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !title.trim() || !date}
              isLoading={isSubmitting}
              className="flex-1 min-h-[48px] sm:min-h-[44px]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Event'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
