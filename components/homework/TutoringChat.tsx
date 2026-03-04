'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import DiagramToggle from '@/components/ui/DiagramToggle'
import type { HomeworkSession, ConversationMessage, HintLevel, VisualUpdate } from '@/lib/homework/types'
import ExplanationStyleSelector from './ExplanationStyleSelector'
import EscalationButton from './EscalationButton'
import type { EscalationLevel, EscalationAction } from './EscalationButton'
import type { ExplanationStyleId } from '@/lib/homework/explanation-styles'

// Import diagram components
import {
  InlineDiagram,
  convertToDiagramState,
  isEngineDiagram,
} from './diagram'

// Lazy-load YouTubeEmbed (client-only, no SSR)
const YouTubeEmbed = dynamic(() => import('@/components/prepare/YouTubeEmbed'), { ssr: false })

// Lazy-load VisualSolvingPanel (client-only, no SSR)
const VisualSolvingPanel = dynamic(() => import('./VisualSolvingPanel'), { ssr: false })

// ============================================================================
// Types
// ============================================================================

interface RelatedVideo {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

interface TutoringChatProps {
  session: HomeworkSession
  onSendMessage: (message: string, explanationStyle?: string) => Promise<void>
  onRequestHint: (level: HintLevel) => Promise<void>
  onComplete: () => Promise<void>
  isLoading?: boolean
  relatedVideos?: RelatedVideo[]
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
            type="button"
            key={level}
            onClick={() => onRequestHint(level)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px]
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
  relatedVideos = [],
}: TutoringChatProps) {
  const t = useTranslations('chat')
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyleId>('step_by_step')
  const [escalationLevels, setEscalationLevels] = useState<Record<number, EscalationLevel>>({})
  const [isVisualPanelOpen, setIsVisualPanelOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Extract visual updates from conversation messages
  const visualUpdates = useMemo<VisualUpdate[]>(() => {
    return session.conversation
      .filter((msg): msg is ConversationMessage & { visualUpdate: VisualUpdate } =>
        msg.role === 'tutor' && !!msg.visualUpdate
      )
      .map((msg) => msg.visualUpdate)
  }, [session.conversation])

  // Auto-open visual panel when first visual update arrives
  useEffect(() => {
    if (visualUpdates.length > 0 && !isVisualPanelOpen) {
      setIsVisualPanelOpen(true)
    }
    // Only auto-open, not auto-close
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualUpdates.length])

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
        await onSendMessage(message, explanationStyle)
      } finally {
        setIsSubmitting(false)
      }
    },
    [input, isLoading, isSubmitting, onSendMessage, session.id, explanationStyle]
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

  const handleEscalation = useCallback(
    async (messageIdx: number, action: EscalationAction, nextLevel: EscalationLevel) => {
      if (isLoading || isSubmitting) return
      setEscalationLevels((prev) => ({ ...prev, [messageIdx]: nextLevel }))
      setIsSubmitting(true)
      try {
        await onSendMessage(`[ESCALATION:${action}] Please explain differently.`, explanationStyle)
      } finally {
        setIsSubmitting(false)
      }
    },
    [isLoading, isSubmitting, onSendMessage, explanationStyle]
  )

  // Check if session has engine-generated diagrams (no step progress needed)
  const hasEngineDiagram = session.conversation.some((msg) => {
    if (!msg.diagram) return false
    const diagramState = convertToDiagramState(msg.diagram)
    return diagramState && isEngineDiagram(diagramState)
  })

  const hasVisualUpdates = visualUpdates.length > 0

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className={`flex flex-col ${hasVisualUpdates && isVisualPanelOpen ? 'w-full md:w-[60%]' : 'w-full'}`}>
        {/* Diagram toggle */}
        <div className="flex justify-end px-4 pt-2">
          <DiagramToggle compact />
        </div>
        {/* Progress - hidden for engine diagram sessions */}
        {!hasEngineDiagram && (
          <ChatProgressBar
            currentStep={session.current_step}
            totalSteps={session.total_estimated_steps || 5}
            t={t}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {session.conversation.filter(msg => msg.content !== '__auto_start__').map((msg, idx) => (
            <div key={idx}>
              <MessageBubble
                message={msg}
                t={t}
              />
              {msg.role === 'tutor' && idx > 0 && (
                <EscalationButton
                  currentLevel={escalationLevels[idx] ?? 0}
                  onEscalate={(action, nextLevel) => handleEscalation(idx, action, nextLevel)}
                  disabled={isLoading || isSubmitting}
                  topic={session.detected_topic || undefined}
                  concept={session.detected_concepts?.[0] || undefined}
                />
              )}
            </div>
          ))}

          {/* Related YouTube videos -- shown after the latest tutor response */}
          {relatedVideos.length > 0 && !isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="mt-1 space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <span>📺</span>
                    <span>{t('relatedVideos')}</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-w-sm">
                    {relatedVideos.map((video) => (
                      <YouTubeEmbed key={video.videoId} video={{ ...video, searchQuery: '' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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

        {/* Explanation Style Selector */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <ExplanationStyleSelector
            value={explanationStyle}
            onChange={setExplanationStyle}
            compact
          />
        </div>

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
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>

          {/* Complete Button */}
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={onComplete}
              disabled={isLoading}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-colors disabled:opacity-50"
            >
              {t('markComplete')}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Solving Panel -- desktop side panel */}
      {hasVisualUpdates && isVisualPanelOpen && (
        <div className="hidden md:flex md:w-[40%] border-s border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <VisualSolvingPanel
            visualUpdates={visualUpdates}
            isOpen={isVisualPanelOpen}
            onClose={() => setIsVisualPanelOpen(false)}
          />
        </div>
      )}

      {/* Visual Solving Panel -- mobile full-screen overlay */}
      {hasVisualUpdates && isVisualPanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-white dark:bg-gray-900">
          <VisualSolvingPanel
            visualUpdates={visualUpdates}
            isOpen={isVisualPanelOpen}
            onClose={() => setIsVisualPanelOpen(false)}
          />
        </div>
      )}

      {/* Mobile floating diagram button */}
      {hasVisualUpdates && !isVisualPanelOpen && (
        <button
          type="button"
          onClick={() => setIsVisualPanelOpen(true)}
          aria-label={t('showDiagram')}
          className="fixed bottom-24 end-4 z-40 md:hidden flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-violet-700 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {t('showDiagram')}
        </button>
      )}
    </div>
  )
}
