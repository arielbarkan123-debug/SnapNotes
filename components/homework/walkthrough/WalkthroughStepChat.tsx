'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import type { WalkthroughStepChatMessage } from '@/types/walkthrough'

const MarkdownWithMath = dynamic(
  () => import('@/components/prepare/MarkdownWithMath'),
  { ssr: false }
)

interface WalkthroughStepChatProps {
  walkthroughId: string
  stepIndex: number
  isHe: boolean
}

export default function WalkthroughStepChat({
  walkthroughId,
  stepIndex,
  isHe,
}: WalkthroughStepChatProps) {
  const t = useTranslations('homework')
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<WalkthroughStepChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch existing messages for this step when opened
  const fetchMessages = useCallback(async () => {
    if (hasFetched) return
    try {
      const res = await fetch(
        `/api/homework/walkthrough/${walkthroughId}/step-chat?stepIndex=${stepIndex}`
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
      setHasFetched(true)
    } catch {
      // Silently fail — empty chat
      setHasFetched(true)
    }
  }, [walkthroughId, stepIndex, hasFetched])

  useEffect(() => {
    if (isOpen && !hasFetched) {
      fetchMessages()
    }
  }, [isOpen, hasFetched, fetchMessages])

  // Reset when step changes
  useEffect(() => {
    setMessages([])
    setHasFetched(false)
    setInput('')
    setIsOpen(false)
  }, [stepIndex])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Optimistic update — add student message
    const tempMsg: WalkthroughStepChatMessage = {
      id: `temp-${Date.now()}`,
      walkthrough_id: walkthroughId,
      user_id: '',
      step_index: stepIndex,
      role: 'student',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const res = await fetch(
        `/api/homework/walkthrough/${walkthroughId}/step-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepIndex, message: userMessage }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        // Replace temp message with real messages from server
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== tempMsg.id)
          return [...withoutTemp, ...data.messages]
        })
      }
    } catch {
      // Keep the optimistic message, show error
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full px-4 pb-4">
      {/* Collapsible trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <span>💬</span>
          {t('walkthrough.askAboutStep')}
          {messages.length > 0 && (
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {/* Messages */}
              <div className="max-h-48 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && !isLoading && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                    {t('walkthrough.noMessages')}
                  </p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      msg.role === 'student'
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-gray-700 dark:text-gray-300 ms-8'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 me-8'
                    }`}
                  >
                    {msg.role === 'tutor' ? (
                      <MarkdownWithMath className="[&>p]:my-0.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-violet-700 dark:[&_strong]:text-violet-300">
                        {msg.content}
                      </MarkdownWithMath>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{t('walkthrough.thinking')}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 p-2 border-t border-gray-100 dark:border-gray-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('walkthrough.typeQuestion')}
                  dir={isHe ? 'rtl' : 'ltr'}
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
