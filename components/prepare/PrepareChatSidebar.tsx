'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@supabase/ssr'
import dynamic from 'next/dynamic'
import type { DiagramState } from '@/components/homework/diagram/types'
import MarkdownWithMath from './MarkdownWithMath'

const InlineDiagram = dynamic(
  () => import('@/components/homework/diagram/InlineDiagram'),
  { ssr: false }
)

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  diagram?: DiagramState | null
}

interface PrepareChatSidebarProps {
  guideId: string
  sectionRef: string | null
  onClearSectionRef: () => void
}

export default function PrepareChatSidebar({ guideId, sectionRef, onClearSectionRef }: PrepareChatSidebarProps) {
  const t = useTranslations('prepare')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history from database on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data } = await supabase
          .from('prepare_chat_messages')
          .select('id, role, content, diagram, created_at')
          .eq('guide_id', guideId)
          .order('created_at', { ascending: true })
          .limit(50)

        if (data?.length) {
          setMessages(
            data.map((msg) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              diagram: msg.diagram as DiagramState | null,
            }))
          )
        }
      } catch {
        // Silently fail — chat still works without history
      }
    }
    loadHistory()
  }, [guideId])

  const sendMessage = useCallback(async (text: string, action?: 'quiz' | 'practice' | 'explain' | 'diagram') => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: action
        ? action === 'quiz' ? t('chat.quizMe')
          : action === 'practice' ? t('chat.practiceQuestions')
          : action === 'explain' ? t('chat.explainMore')
          : t('chat.drawDiagram')
        : text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch(`/api/prepare/${guideId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text || undefined,
          action,
          sectionRef: sectionRef || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to send')

      const data = await res.json()
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response?.message || 'Sorry, I could not generate a response.',
        diagram: data.response?.diagram || null,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', content: t('chat.error') },
      ])
    } finally {
      setIsLoading(false)
      onClearSectionRef()
    }
  }, [guideId, sectionRef, onClearSectionRef, t])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('chat.title')}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎓</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px] mx-auto">
              {t('chat.welcome')}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <>
                  <MarkdownWithMath className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                    {msg.content}
                  </MarkdownWithMath>
                  {msg.diagram && (
                    <InlineDiagram
                      diagram={msg.diagram}
                      size="compact"
                      showExpandButton={true}
                    />
                  )}
                </>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Section context indicator */}
      {sectionRef && (
        <div className="px-4 py-2 bg-violet-50 dark:bg-violet-900/20 border-t border-violet-200 dark:border-violet-800 flex items-center justify-between">
          <span className="text-xs text-violet-600 dark:text-violet-400 truncate">
            {t('chat.sectionContext', { section: sectionRef })}
          </span>
          <button
            onClick={onClearSectionRef}
            className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 ms-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-2 flex gap-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => sendMessage('', 'quiz')}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50 transition-colors"
        >
          {t('chat.quizMe')}
        </button>
        <button
          onClick={() => sendMessage('', 'practice')}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
        >
          {t('chat.practiceQuestions')}
        </button>
        <button
          onClick={() => sendMessage('', 'explain')}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50 transition-colors"
        >
          {t('chat.explainMore')}
        </button>
        <button
          onClick={() => sendMessage('', 'diagram')}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors"
        >
          {t('chat.drawDiagram')}
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
