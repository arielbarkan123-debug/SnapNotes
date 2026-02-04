'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import GuideRenderer from '@/components/prepare/GuideRenderer'
import GuideTableOfContents from '@/components/prepare/GuideTableOfContents'
import PrepareChatSidebar from '@/components/prepare/PrepareChatSidebar'
import type { PrepareGuide } from '@/types/prepare'

interface PrepareGuideViewProps {
  guideId: string
  shareToken?: string
  isOwner: boolean
}

export default function PrepareGuideView({ guideId, shareToken, isOwner }: PrepareGuideViewProps) {
  const t = useTranslations('prepare')
  const [guide, setGuide] = useState<PrepareGuide | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [chatSectionRef, setChatSectionRef] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const fetchGuide = useCallback(async () => {
    try {
      const url = shareToken
        ? `/api/prepare/${guideId}?token=${shareToken}`
        : `/api/prepare/${guideId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load guide')
      const data = await res.json()
      setGuide(data.guide)
    } catch {
      setError('Failed to load study guide')
    } finally {
      setIsLoading(false)
    }
  }, [guideId, shareToken])

  useEffect(() => {
    fetchGuide()
  }, [fetchGuide])

  const handleSectionClick = (sectionId: string) => {
    setChatSectionRef(sectionId)
    setIsChatOpen(true)
  }

  const handleShare = async () => {
    try {
      const res = await fetch(`/api/prepare/${guideId}/share`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate share link')
      const data = await res.json()
      const url = `${window.location.origin}/prepare/${guideId}?token=${data.shareToken}`
      await navigator.clipboard.writeText(url)
      alert(t('viewer.copied'))
    } catch {
      alert(t('share.error'))
    }
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/prepare/${guideId}/pdf`)
      if (!res.ok) throw new Error('Failed to download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${guide?.title || 'study-guide'}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert(t('pdf.error'))
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !guide) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500">{error || 'Guide not found'}</p>
        <Link href="/prepare" className="mt-4 inline-block text-violet-600 hover:underline">
          {t('viewer.backToGuides')}
        </Link>
      </div>
    )
  }

  const guideData = guide.generated_guide

  return (
    <div className="flex min-h-screen">
      {/* Main content area */}
      <div className="flex-1 lg:me-[400px]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/prepare"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('viewer.backToGuides')}
            </Link>
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {t('viewer.downloadPdf')}
                </button>
                <button
                  onClick={handleShare}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  {t('viewer.share')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Guide content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {guideData.title}
            </h1>
            {guideData.subtitle && (
              <p className="text-lg text-gray-500 dark:text-gray-400">{guideData.subtitle}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 dark:text-gray-500">
              {guideData.subject && <span>{guideData.subject}</span>}
              {guideData.estimatedReadingTime > 0 && (
                <span>{t('viewer.estimatedReading', { minutes: guideData.estimatedReadingTime })}</span>
              )}
            </div>
          </div>

          {/* Table of Contents */}
          <GuideTableOfContents
            topics={guideData.topics}
            quickReference={guideData.quickReference}
            activeSectionId={activeSectionId}
          />

          {/* Guide Content */}
          <GuideRenderer
            topics={guideData.topics}
            quickReference={guideData.quickReference}
            onSectionVisible={setActiveSectionId}
            onAskAboutSection={handleSectionClick}
          />
        </div>
      </div>

      {/* Desktop Chat Sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 end-0 w-[400px] flex-col border-s border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <PrepareChatSidebar
          guideId={guideId}
          sectionRef={chatSectionRef}
          onClearSectionRef={() => setChatSectionRef(null)}
        />
      </div>

      {/* Mobile Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="lg:hidden fixed bottom-20 end-4 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-rose-500 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Mobile Chat Bottom Sheet */}
      {isChatOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsChatOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 h-[80vh] bg-white dark:bg-gray-900 rounded-t-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('chat.title')}</h3>
              <button onClick={() => setIsChatOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PrepareChatSidebar
                guideId={guideId}
                sectionRef={chatSectionRef}
                onClearSectionRef={() => setChatSectionRef(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
