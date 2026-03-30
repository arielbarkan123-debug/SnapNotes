'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { isRTL, type Locale } from '@/i18n/config'
import { useStudyPlanChat } from '@/hooks/useStudyPlanChat'
import { ChatInput } from './ChatInput'
import { ChatActionCard } from './ChatActionCard'
import { SuggestedPrompts } from './SuggestedPrompts'
import type { ChatAction } from '@/types'

interface StudyPlanChatProps {
  onActionApplied?: (actions: ChatAction[]) => void
}

// Simple inline markdown: bold, italic, inline code, bullet lists, numbered lists
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType
      elements.push(
        <Tag
          key={`list-${elements.length}`}
          className={`${
            listType === 'ul' ? 'list-disc' : 'list-decimal'
          } pl-4 my-1 space-y-0.5`}
        >
          {listItems}
        </Tag>
      )
      listItems = []
      listType = null
    }
  }

  const formatInline = (str: string): React.ReactNode => {
    // Process bold (**text**), italic (*text*), inline code (`text`)
    const parts: React.ReactNode[] = []
    let remaining = str
    let key = 0

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      // Inline code
      const codeMatch = remaining.match(/`(.+?)`/)
      // Italic (single * but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)

      // Find the earliest match
      type MatchInfo = { match: RegExpMatchArray; type: 'bold' | 'code' | 'italic' }
      const matches: MatchInfo[] = []
      if (boldMatch?.index !== undefined) matches.push({ match: boldMatch, type: 'bold' })
      if (codeMatch?.index !== undefined) matches.push({ match: codeMatch, type: 'code' })
      if (italicMatch?.index !== undefined) matches.push({ match: italicMatch, type: 'italic' })

      if (matches.length === 0) {
        parts.push(remaining)
        break
      }

      matches.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0))
      const earliest = matches[0]
      const idx = earliest.match.index ?? 0

      if (idx > 0) {
        parts.push(remaining.slice(0, idx))
      }

      const content = earliest.match[1]
      if (earliest.type === 'bold') {
        parts.push(
          <strong key={`b-${key++}`} className="font-semibold">
            {content}
          </strong>
        )
      } else if (earliest.type === 'code') {
        parts.push(
          <code
            key={`c-${key++}`}
            className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs"
          >
            {content}
          </code>
        )
      } else {
        parts.push(
          <em key={`i-${key++}`}>{content}</em>
        )
      }

      remaining = remaining.slice(idx + earliest.match[0].length)
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Bullet list
    const bulletMatch = line.match(/^[-*]\s+(.+)/)
    if (bulletMatch) {
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(<li key={`li-${i}`}>{formatInline(bulletMatch[1])}</li>)
      continue
    }

    // Numbered list
    const numMatch = line.match(/^\d+\.\s+(.+)/)
    if (numMatch) {
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(<li key={`li-${i}`}>{formatInline(numMatch[1])}</li>)
      continue
    }

    flushList()

    // Empty line = spacer
    if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} className="h-2" />)
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-0.5">
        {formatInline(line)}
      </p>
    )
  }

  flushList()
  return elements
}

export function StudyPlanChat({ onActionApplied }: StudyPlanChatProps) {
  const t = useTranslations('studyPlan')
  const locale = useLocale()
  const rtl = isRTL(locale as Locale)
  const { messages, isLoading, isSending, error, sendMessage, clearChat } =
    useStudyPlanChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isSending])

  const handleSend = useCallback(
    async (text: string) => {
      setSendError(null)
      try {
        const result = await sendMessage(text)
        if (result?.actions && result.actions.length > 0 && onActionApplied) {
          onActionApplied(result.actions)
        }
      } catch (err) {
        setSendError(
          err instanceof Error ? err.message : 'Failed to send message'
        )
      }
    },
    [sendMessage, onActionApplied]
  )

  const handleClear = useCallback(async () => {
    setSendError(null)
    await clearChat()
  }, [clearChat])

  const isEmpty = messages.length === 0 && !isLoading

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <svg
              className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {t('chat.title')}
          </h3>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t('chat.clearChat')}
            aria-label={t('chat.clearChat')}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth"
      >
        {/* Loading state (initial) */}
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        {/* Empty state: welcome + suggested prompts */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-8 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-violet-600 dark:text-violet-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('chat.emptyTitle')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[260px]">
                {t('chat.emptyDescription')}
              </p>
            </div>
            <SuggestedPrompts onSelect={handleSend} />
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          const actions = msg.metadata?.actions || []

          return (
            <div key={msg.id}>
              {/* Message bubble */}
              <div
                className={`flex ${isUser ? (rtl ? 'justify-start' : 'justify-end') : (rtl ? 'justify-end' : 'justify-start')}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    isUser
                      ? 'bg-violet-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="[&>p]:my-0.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                      {renderMarkdown(msg.content)}
                    </div>
                  )}
                </div>
              </div>

              {/* Action cards below assistant messages */}
              {!isUser && actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 ps-0">
                  {actions.map((action, idx) => (
                    <ChatActionCard key={`${msg.id}-action-${idx}`} action={action} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Typing indicator */}
        {isSending && (
          <div className={`flex ${rtl ? 'justify-end' : 'justify-start'}`}>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {(error || sendError) && (
        <div className="shrink-0 mx-4 mb-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between">
          <p className="text-xs text-red-700 dark:text-red-300">
            {sendError || error}
          </p>
          <button
            onClick={() => setSendError(null)}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 font-medium"
          >
            {t('chat.dismiss')}
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <ChatInput
          onSend={handleSend}
          disabled={isSending}
          placeholder={t('chat.placeholder')}
        />
      </div>
    </div>
  )
}

export default StudyPlanChat
