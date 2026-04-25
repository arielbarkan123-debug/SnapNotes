'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { type HelpContext, type HelpRequestType, type HelpAPIResponse } from '@/types'

const MarkdownWithMath = dynamic(() => import('@/components/prepare/MarkdownWithMath'), { ssr: false })
import { sanitizeError } from '@/lib/utils/error-sanitizer'
import { trapFocus } from '@/lib/utils/focus-trap'
import { createLogger } from '@/lib/logger'

const log = createLogger('ui:help-modal')

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  context: HelpContext
}

export default function HelpModal({ isOpen, onClose, context }: HelpModalProps) {
  const t = useTranslations('lesson')
  const modalRef = useRef<HTMLDivElement>(null)
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

  // Focus trap when modal is open
  useEffect(() => {
    if (!isOpen || !modalRef.current) return
    const cleanup = trapFocus(modalRef.current)
    return () => cleanup()
  }, [isOpen, view])

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
        log.error({ status: res.status }, 'Non-JSON response')
        if (res.status === 504 || res.status === 503 || res.status === 502) {
          throw new Error('Server is taking too long. Please try again.')
        }
        throw new Error('Server error. Please try again.')
      }

      let data: HelpAPIResponse
      try {
        data = await res.json()
      } catch (parseError) {
        log.error({ err: parseError }, 'JSON parse error')
        throw new Error('Server error. Please try again.')
      }

      if (data.success && data.response) {
        setResponse(data.response)
        setSourceReference(data.sourceReference || null)
        setView('response')
      } else {
        const errVal = data.error as string | { message?: string } | undefined
        setError(typeof errVal === 'string' ? errVal : (errVal as { message?: string })?.message || 'Something went wrong.')
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
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {view === 'custom' ? t('help.askQuestion') : view === 'response' ? t('help.heresHelp') : view === 'loading' ? t('help.thinking') : t('help.needHelp')}
          </h2>
          {view !== 'loading' && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close help">✕</button>
          )}
        </div>

        <div className="p-4">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}

          {view === 'buttons' && (
            <div className="space-y-3">
              <button onClick={() => handleRequest('explain')} className="w-full p-4 text-start rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📖</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('help.explainTitle')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('help.explainDesc')}</div>
                  </div>
                </div>
              </button>
              <button onClick={() => handleRequest('example')} className="w-full p-4 text-start rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('help.exampleTitle')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('help.exampleDesc')}</div>
                  </div>
                </div>
              </button>
              <button onClick={() => handleRequest('hint')} className="w-full p-4 text-start rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔍</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('help.hintTitle')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('help.hintDesc')}</div>
                  </div>
                </div>
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <button onClick={() => setView('custom')} className="w-full p-4 text-start rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✏️</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{t('help.customTitle')}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{t('help.customDesc')}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {view === 'loading' && (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('help.gettingHelp')}</p>
            </div>
          )}

          {view === 'response' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <MarkdownWithMath className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-gray-900 dark:[&_h1]:text-white [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 dark:[&_h3]:text-gray-200 [&_h3]:mb-1 [&_p]:text-gray-800 dark:[&_p]:text-gray-200 [&_p]:leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:text-gray-800 dark:[&_ul]:text-gray-200 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:text-gray-800 dark:[&_ol]:text-gray-200 [&_ol]:mb-2 [&_li]:text-gray-800 dark:[&_li]:text-gray-200 [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_em]:italic [&_code]:bg-gray-200 dark:[&_code]:bg-gray-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono">
                  {response}
                </MarkdownWithMath>
              </div>
              {sourceReference && <p className="text-sm text-gray-500 dark:text-gray-400">📍 {t('help.source')}: {sourceReference}</p>}
              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 py-2.5 px-4 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition">{t('help.gotIt')}</button>
                <button onClick={() => setView('custom')} className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t('help.stillConfused')}</button>
              </div>
            </div>
          )}

          {view === 'custom' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('help.about')}: {context.lessonTitle}</p>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder={t('help.placeholder')}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                rows={3}
                autoFocus
                maxLength={500}
              />
              <div className="flex flex-wrap gap-2">
                {[t('help.quick1'), t('help.quick2'), t('help.quick3')].map((q) => (
                  <button key={q} onClick={() => setCustomQuestion(q)} type="button" className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">{q}</button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setView('buttons')} type="button" className="py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t('help.back')}</button>
                <button onClick={handleCustomSubmit} disabled={!customQuestion.trim()} type="button" className="flex-1 py-2.5 px-4 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed">{t('askAI')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
