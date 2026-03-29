'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import type { StudyPlanChatMessage, ChatAction } from '@/types'

const CHAT_CACHE_KEY = '/api/study-plan/chat'

async function chatFetcher(url: string): Promise<StudyPlanChatMessage[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load chat')
  const data = await res.json()
  return data.messages || []
}

export function useStudyPlanChat() {
  const { data, error, isLoading, mutate } = useSWR<StudyPlanChatMessage[]>(
    CHAT_CACHE_KEY,
    chatFetcher,
    { revalidateOnFocus: false }
  )
  const [isSending, setIsSending] = useState(false)

  const sendMessage = useCallback(
    async (
      text: string
    ): Promise<{ message: string; actions: ChatAction[] } | null> => {
      setIsSending(true)
      try {
        // Optimistic update: add user message immediately
        const optimisticMsg: StudyPlanChatMessage = {
          id: `temp-${Date.now()}`,
          user_id: '',
          role: 'user',
          content: text,
          metadata: {},
          created_at: new Date().toISOString(),
        }
        mutate((prev) => [...(prev || []), optimisticMsg], false)

        const res = await fetch(CHAT_CACHE_KEY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const errMsg = typeof errData.error === 'string'
            ? errData.error
            : errData.error?.message || 'Failed to send message'
          throw new Error(errMsg)
        }
        const responseData = await res.json()

        // Revalidate to get real messages from DB
        await mutate()

        return {
          message: responseData.message,
          actions: responseData.actions || [],
        }
      } catch (err) {
        // Remove optimistic message on error
        await mutate()
        throw err
      } finally {
        setIsSending(false)
      }
    },
    [mutate]
  )

  const clearChat = useCallback(async () => {
    await fetch(CHAT_CACHE_KEY, { method: 'DELETE' })
    await mutate([], false)
  }, [mutate])

  return {
    messages: data || [],
    isLoading,
    isSending,
    error: error ? 'Failed to load chat' : null,
    sendMessage,
    clearChat,
    mutate,
  }
}
