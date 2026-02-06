'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { HomeworkSession, ConversationMessage, HintLevel } from '@/lib/homework/types'

// Import diagram components
import {
  InlineDiagram,
  convertToDiagramState,
} from './diagram'

// ============================================================================
// Types
// ============================================================================

interface TutoringChatProps {
  session: HomeworkSession
  onSendMessage: (message: string) => Promise<void>
  onRequestHint: (level: HintLevel) => Promise<void>
  onComplete: () => Promise<void>
  isLoading?: boolean
}

// ============================================================================
// LocalStorage Draft Persistence
// ============================================================================

const CHAT_DRAFT_KEY_PREFIX = 'notesnap_chat_draft_'

interface ChatDraftStorage {
  text: string
  savedAt: number
}

function isChatDraftStorage(value: unknown): value is ChatDraftStorage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    'savedAt' in value &&
    typeof (value as ChatDraftStorage).text === 'string' &&
    typeof (value as ChatDraftStorage).savedAt === 'number'
  )
}

function getDraftKey(sessionId: string): string {
  return `${CHAT_DRAFT_KEY_PREFIX}${sessionId}`
}

function saveDraft(sessionId: string, text: string): void {
  if (typeof window === 'undefined') return
  try {
    if (text.trim()) {
      const draft: ChatDraftStorage = { text, savedAt: Date.now() }
      localStorage.setItem(getDraftKey(sessionId), JSON.stringify(draft))
    } else {
      localStorage.removeItem(getDraftKey(sessionId))
    }
  } catch {
    // localStorage might be full - silently continue
  }
}

function loadDraft(sessionId: string): string {
  if (typeof window === 'undefined') return ''
  try {
    const stored = localStorage.getItem(getDraftKey(sessionId))
    if (!stored) return ''

    const parsed: unknown = JSON.parse(stored)
    if (!isChatDraftStorage(parsed)) {
      localStorage.removeItem(getDraftKey(sessionId))
      return ''
    }

    // Only use draft if saved within last 24 hours
    const maxAge = 24 * 60 * 60 * 1000
    if (Date.now() - parsed.savedAt > maxAge) {
      localStorage.removeItem(getDraftKey(sessionId))
      return ''
    }
    return parsed.text
  } catch {
    return ''
  }
}

function clearDraft(sessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(getDraftKey(sessionId))
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function MessageBubble({
  message,
  t,
}: {
  message: ConversationMessage
  t: ReturnType<typeof useTranslations<'chat'>>
}) {
  const isTutor = message.role === 'tutor'
  const hasDiagram = isTutor && message.diagram

  // Convert diagram to correct type if present
  const diagramState = hasDiagram ? convertToDiagramState(message.diagram!) : null

  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] ${isTutor ? '' : 'order-last'}`}>
        {isTutor && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-sm">
              🎓
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tutor')}</span>
            {message.hintLevel && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                {t('hint', { level: message.hintLevel })}
              </span>
            )}
          </div>
        )}
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm
            ${isTutor
              ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-md'
              : 'bg-violet-600 text-white rounded-tr-md'
            }
          `}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Inline Diagram — shows fully revealed, expand for step-by-step */}
          {diagramState && (
            <InlineDiagram
              diagram={diagramState}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function HintButtons({
  hintsUsed,
  onRequestHint,
  disabled,
  t,
}: {
  hintsUsed: number
  onRequestHint: (level: HintLevel) => void
  disabled: boolean
  t: ReturnType<typeof useTranslations<'chat'>>
}) {
  const hints: { level: HintLevel; labelKey: string; icon: string }[] = [
    { level: 1, labelKey: 'hintConcept', icon: '💡' },
    { level: 2, labelKey: 'hintStrategy', icon: '🧭' },
    { level: 3, labelKey: 'hintExample', icon: '📝' },
    { level: 4, labelKey: 'hintGuide', icon: '🤝' },
    { level: 5, labelKey: 'hintAnswer', icon: '✅' },
  ]

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-2">
        <span>💡</span>
        <span>{t('needHelp', { count: hintsUsed })}</span>
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {hints.map(({ level, labelKey, icon }) => (
          <button
            key={level}
            onClick={() => onRequestHint(level)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${level === 5
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }
            `}
          >
            <span>{icon}</span>
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChatProgressBar({
  currentStep,
  totalSteps,
  t,
}: {
  currentStep: number
  totalSteps: number
  t: ReturnType<typeof useTranslations<'chat'>>
}) {
  const progress = Math.min(100, (currentStep / totalSteps) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{t('progress')}</span>
        <span>{t('stepOf', { current: currentStep, total: totalSteps })}</span>
      </div>
    </div>
  )
}

function LoadingIndicator({ t }: { t: ReturnType<typeof useTranslations<'chat'>> }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-sm">
            🎓
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tutor')}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function TutoringChat({
  session,
  onSendMessage,
  onRequestHint,
  onComplete,
  isLoading = false,
}: TutoringChatProps) {
  const t = useTranslations('chat')
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (session.id) {
      const savedDraft = loadDraft(session.id)
      if (savedDraft) {
        setInput(savedDraft)
      }
    }
  }, [session.id])

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    if (!session.id) return

    const timeoutId = setTimeout(() => {
      saveDraft(session.id, input)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [session.id, input])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.conversation])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const message = input.trim()
      if (!message || isLoading || isSubmitting) return

      setIsSubmitting(true)
      setInput('')
      if (session.id) {
        clearDraft(session.id)
      }
      try {
        await onSendMessage(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [input, isLoading, isSubmitting, onSendMessage, session.id]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  const handleHintRequest = useCallback(
    async (level: HintLevel) => {
      if (isLoading || isSubmitting) return
      await onRequestHint(level)
    },
    [isLoading, isSubmitting, onRequestHint]
  )

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex flex-col w-full">
        {/* Progress */}
        <ChatProgressBar
          currentStep={session.current_step}
          totalSteps={session.total_estimated_steps || 5}
          t={t}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {session.conversation.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              t={t}
            />
          ))}

          {isLoading && <LoadingIndicator t={t} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Hint Buttons */}
        <HintButtons
          hintsUsed={session.hints_used}
          onRequestHint={handleHintRequest}
          disabled={isLoading}
          t={t}
        />

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('typeAnswer')}
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>

          {/* Complete Button */}
          <div className="flex justify-center mt-3">
            <button
              onClick={onComplete}
              disabled={isLoading}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-colors disabled:opacity-50"
            >
              {t('markComplete')}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
