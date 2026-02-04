'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import PrepareUploadModal from '@/components/prepare/PrepareUploadModal'

interface GuideListItem {
  id: string
  title: string
  subtitle: string | null
  subject: string | null
  source_type: string | null
  generation_status: string
  created_at: string
}

export default function PrepareHubContent() {
  const t = useTranslations('prepare')
  const router = useRouter()
  const [guides, setGuides] = useState<GuideListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchGuides = useCallback(async () => {
    try {
      const res = await fetch('/api/prepare')
      if (res.ok) {
        const data = await res.json()
        setGuides(data.guides || [])
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGuides()
  }, [fetchGuides])

  const handleDelete = async (id: string) => {
    if (!confirm(t('hub.deleteConfirm'))) return

    try {
      const res = await fetch(`/api/prepare/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setGuides((prev) => prev.filter((g) => g.id !== id))
      }
    } catch {
      // Silently fail
    }
  }

  const filteredGuides = searchQuery
    ? guides.filter(
        (g) =>
          g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : guides

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return null
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t('hub.generating')}
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {t('hub.failed')}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('hub.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 text-white font-medium hover:opacity-90 transition-opacity"
        >
          {t('hub.createNew')}
        </button>
      </div>

      {/* Search */}
      {guides.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder={t('hub.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Guide List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('hub.empty')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {t('hub.emptyDescription')}
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            {t('hub.createNew')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGuides.map((guide) => (
            <div
              key={guide.id}
              className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
            >
              <Link href={`/prepare/${guide.id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {guide.title}
                      </h3>
                      {getStatusBadge(guide.generation_status)}
                    </div>
                    {guide.subtitle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {guide.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {guide.subject && <span>{guide.subject}</span>}
                      <span>{formatDate(guide.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete(guide.id)
                }}
                className="absolute top-4 end-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                aria-label="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <PrepareUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onGenerated={(guideId) => {
          setShowUpload(false)
          router.push(`/prepare/${guideId}`)
        }}
      />
    </div>
  )
}
