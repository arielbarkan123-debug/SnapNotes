'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { HelpContext, HelpRequestType, HelpAPIResponse } from '@/types'
import { sanitizeError } from '@/lib/utils/error-sanitizer'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  context: HelpContext
}

export default function HelpModal({ isOpen, onClose, context }: HelpModalProps) {
  const t = useTranslations('lesson')
  const [view, setView] = useState<'buttons' | 'loading' | 'response' | 'custom'>('buttons')
  const [response, setResponse] = useState('')
  const [sourceReference, setSourceReference] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = useState('')

  const resetState = useCallback(() => {
    setView('buttons')
    setResponse('')
    setSourceReference(null)
    setError(null)
    setCustomQuestion('')
  }, [])

  const handleClose = useCallback(() => {
    if (view !== 'loading') {
      resetState()
      onClose()
    }
  }, [view, resetState, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view !== 'loading') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, view, handleClose])

  useEffect(() => {
    if (isOpen) resetState()
  }, [isOpen, resetState])

  const handleRequest = useCallback(async (type: HelpRequestType, question?: string) => {
    setView('loading')
    setError(null)
    try {
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionType: type, context, customQuestion: question }),
      })

      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[HelpModal] Non-JSON response:', res.status)
        if (res.status === 504 || res.status === 503 || res.status === 502) {
          throw new Error('Server is taking too long. Please try again.')
        }
        throw new Error('Server error. Please try again.')
      }

      let data: HelpAPIResponse
      try {
        data = await res.json()
      } catch (parseError) {
        console.error('[HelpModal] JSON parse error:', parseError)
        throw new Error('Server error. Please try again.')
      }

      if (data.success && data.response) {
        setResponse(data.response)
        setSourceReference(data.sourceReference || null)
        setView('response')
      } else {
        setError(data.error || 'Something went wrong.')
        setView('buttons')
      }
    } catch (err) {
      setError(sanitizeError(err, 'Connection error. Please try again.'))
      setView('buttons')
    }
  }, [context])

  const handleCustomSubmit = useCallback(() => {
    if (customQuestion.trim()) handleRequest('custom', customQuestion.trim())
  }, [customQuestion, handleRequest])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {view === 'custom' ? 'Ask a Question' : view === 'response' ? 'Here\'s Help' : view === 'loading' ? 'Thinking...' : 'Need Help?'}
          </h2>
          {view !== 'loading' && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">✕</button>
          )}
        </div>

        <div className="p-4">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}

          {view === 'buttons' && (
            <div className="space-y-3">
              <button onClick={() => handleRequest('explain')} className="w-full p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📖</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Explain This</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Get a simpler explanation</div>
                  </div>
                </div>
              </button>
              <button onClick={() => handleRequest('example')} className="w-full p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Show Example</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">See a real-world example</div>
                  </div>
                </div>
              </button>
              <button onClick={() => handleRequest('hint')} className="w-full p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔍</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Give Me a Hint</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Get a clue without the answer</div>
                  </div>
                </div>
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <button onClick={() => setView('custom')} className="w-full p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✏️</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Ask My Own Question</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Type what you want to know</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {view === 'loading' && (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Getting help...</p>
            </div>
          )}

          {view === 'response' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{response}</p>
              </div>
              {sourceReference && <p className="text-sm text-gray-500 dark:text-gray-400">📍 From: {sourceReference}</p>}
              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">Got it!</button>
                <button onClick={() => setView('custom')} className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Still confused?</button>
              </div>
            </div>
          )}

          {view === 'custom' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">About: {context.lessonTitle}</p>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="What would you like to know?"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                rows={3}
                autoFocus
                maxLength={500}
              />
              <div className="flex flex-wrap gap-2">
                {['Why does this happen?', 'Can you simplify this?', 'How is this used?'].map((q) => (
                  <button key={q} onClick={() => setCustomQuestion(q)} type="button" className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">{q}</button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setView('buttons')} type="button" className="py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">← Back</button>
                <button onClick={handleCustomSubmit} disabled={!customQuestion.trim()} type="button" className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">{t('askAI')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
