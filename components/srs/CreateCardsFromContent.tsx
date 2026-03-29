'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import ContentUploadPanel, { type ContentInput } from '@/components/shared/ContentUploadPanel'
import { uploadFileToStorage, uploadImagesToStorage } from '@/lib/upload/direct-upload'
import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('component:CreateCardsFromContent')

interface CreateCardsFromContentProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void  // Called after cards are created — parent should refetch due cards
}

export default function CreateCardsFromContent({ isOpen, onClose, onSuccess }: CreateCardsFromContentProps) {
  const t = useTranslations('review')
  const [contentInput, setContentInput] = useState<ContentInput | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cardsCreated, setCardsCreated] = useState<number | null>(null)

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setContentInput(null)
      setIsGenerating(false)
      setProgress('')
      setError(null)
      setCardsCreated(null)
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isGenerating, onClose])

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  const handleGenerate = useCallback(async () => {
    if (!contentInput) return

    setIsGenerating(true)
    setError(null)
    setProgress(t('fromContent.processing'))

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let textContent = contentInput.textContent || ''
      let imageUrls: string[] | undefined
      let documentUrl: string | undefined
      let fileName: string | undefined
      let fileType: string | undefined

      // Handle file uploads
      if (contentInput.mode === 'files' && contentInput.files?.length) {
        setProgress(t('fromContent.uploading'))

        if (contentInput.fileType === 'image') {
          const uploaded = await uploadImagesToStorage(contentInput.files, user.id, `review-${Date.now()}`)
          const signRes = await fetch('/api/sign-image-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: uploaded.map(u => u.storagePath) }),
          })
          const signData = await signRes.json()
          imageUrls = signData.urls || []
        } else {
          const file = contentInput.files[0]
          const result = await uploadFileToStorage(file, user.id)
          documentUrl = result.storagePath
          fileName = file.name
          fileType = result.fileType

          // Extract text from document
          setProgress(t('fromContent.processing'))
          const extractRes = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storagePath: result.storagePath,
              fileName: file.name,
              fileType: result.fileType,
            }),
          })
          const extractData = await extractRes.json()
          if (extractData.success && extractData.extractedContent) {
            textContent = extractData.extractedContent
          } else {
            throw new Error(extractData.error || 'Failed to extract text')
          }
        }
      }

      // Call the from-content API
      setProgress(t('fromContent.generating'))
      const res = await fetch('/api/srs/cards/from-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent, imageUrls, documentUrl, fileName, fileType }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || t('fromContent.error'))
      }

      setCardsCreated(data.cardsCreated || 0)

      if (data.cardsCreated > 0) {
        // Brief delay then trigger success
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      }
    } catch (err) {
      log.error({ err }, 'Create cards from content failed')
      setError(err instanceof Error ? err.message : t('fromContent.error'))
    } finally {
      setIsGenerating(false)
    }
  }, [contentInput, t, onSuccess, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={!isGenerating ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('fromContent.title')}
          </h2>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {cardsCreated !== null && cardsCreated > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-center">
              <span className="text-3xl mb-2 block">✅</span>
              <p className="font-medium">{t('fromContent.success', { count: cardsCreated })}</p>
            </div>
          )}

          {cardsCreated !== null && cardsCreated === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm">
              {t('fromContent.noCards')}
            </div>
          )}

          {/* Content Upload (hide when showing success) */}
          {cardsCreated === null && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('fromContent.description')}
              </p>
              <ContentUploadPanel
                onContentReady={setContentInput}
                isDisabled={isGenerating}
                compact
              />
            </>
          )}

          {/* Actions */}
          {cardsCreated === null && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!contentInput || isGenerating}
                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {progress}
                  </>
                ) : (
                  t('fromContent.button')
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
