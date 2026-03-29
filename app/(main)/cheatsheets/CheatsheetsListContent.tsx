'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import ContentUploadPanel, { type ContentInput } from '@/components/shared/ContentUploadPanel'
import { uploadFileToStorage, uploadImagesToStorage } from '@/lib/upload/direct-upload'
import { createClient } from '@/lib/supabase/client'

interface CheatsheetItem {
  id: string
  title: string
  title_he: string | null
  course_id: string
  exam_mode: boolean
  created_at: string
}

export default function CheatsheetsListContent() {
  const t = useTranslations('cheatsheet')
  const locale = useLocale()
  const isHe = locale === 'he'
  const router = useRouter()

  const [cheatsheets, setCheatsheets] = useState<CheatsheetItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showContentUpload, setShowContentUpload] = useState(false)
  const [contentInput, setContentInput] = useState<ContentInput | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/cheatsheets')
        const json = await res.json()
        if (json.success) {
          setCheatsheets(json.cheatsheets)
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleCreateFromContent = useCallback(async () => {
    if (!contentInput) return
    setIsCreating(true)
    setCreateError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let textContent = contentInput.textContent || ''
      let imageUrls: string[] | undefined
      let documentUrl: string | undefined
      let fileType: string | undefined

      if (contentInput.mode === 'files' && contentInput.files?.length) {
        if (contentInput.fileType === 'image') {
          const uploaded = await uploadImagesToStorage(contentInput.files, user.id, `cheatsheet-${Date.now()}`)
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
          fileType = result.fileType
          const extractRes = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePath: result.storagePath, fileName: file.name, fileType: result.fileType }),
          })
          const extractData = await extractRes.json()
          if (extractData.success && extractData.extractedContent) {
            textContent = extractData.extractedContent
          } else {
            throw new Error('Failed to extract text from document')
          }
        }
      }

      const res = await fetch('/api/cheatsheets/from-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent, imageUrls, documentUrl, fileType }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to create cheatsheet')
      }

      setShowContentUpload(false)
      router.push(`/cheatsheets/${data.cheatsheetId}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('createError'))
    } finally {
      setIsCreating(false)
    }
  }, [contentInput, router, t])

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold gradient-text mb-2">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('subtitle')}</p>
      </div>

      {/* Create Cheatsheet Card */}
      <div className="mb-6 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/40 to-purple-900/30 p-5">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-8 h-8 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <div>
            <p className="font-semibold text-white">{t('createFromContent')}</p>
            <p className="text-sm text-gray-400">{t('createFromContentDesc')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowContentUpload(true)}
          className="w-full py-3 px-4 text-base font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors"
        >
          {t('uploadContent')}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-[22px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && cheatsheets.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('empty')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">{t('emptyDesc')}</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            {t('goToCourses')}
          </Link>
        </div>
      )}

      {/* Grid */}
      {!isLoading && cheatsheets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cheatsheets.map((sheet, idx) => (
            <motion.div
              key={sheet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                href={`/cheatsheets/${sheet.id}`}
                className="block bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card card-hover-lift overflow-hidden group"
              >
                <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📋</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {isHe && sheet.title_he ? sheet.title_he : sheet.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {sheet.exam_mode && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                        {t('examMode')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(sheet.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US')}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Content Upload Modal */}
      {showContentUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !isCreating && setShowContentUpload(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('createFromContent')}</h2>
              <button onClick={() => setShowContentUpload(false)} disabled={isCreating} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('createFromContentDesc')}</p>
              <ContentUploadPanel onContentReady={setContentInput} isDisabled={isCreating} compact />
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {createError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowContentUpload(false)}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateFromContent}
                  disabled={!contentInput || isCreating}
                  className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      {t('creating')}
                    </>
                  ) : t('createButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
