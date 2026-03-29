'use client'

import { useTranslations } from 'next-intl'
import { usePastExamTemplates } from '@/hooks/usePastExamTemplates'

interface PastExamNudgeBannerProps {
  subjectId?: string
  onUploadClick: () => void
  variant: 'compact' | 'full'
}

export function PastExamNudgeBanner({ subjectId, onUploadClick, variant }: PastExamNudgeBannerProps) {
  const t = useTranslations('pastExams')
  const { count, canUpload, isLoading, error } = usePastExamTemplates(subjectId)

  if (isLoading || error) return null

  // No templates — upload CTA
  if (count === 0) {
    if (variant === 'compact') {
      return (
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/40 to-purple-900/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-6 h-6 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <div>
              <p className="font-semibold text-white">{t('nudge.noTemplates')}</p>
              <p className="text-sm text-gray-400">{t('nudge.noTemplatesDescription')}</p>
            </div>
          </div>
          <button type="button" onClick={onUploadClick} className="w-full py-3 px-4 text-base font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors">
            {t('nudge.uploadCta')}
          </button>
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">{t('nudge.noTemplates')}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('nudge.noTemplatesDescription')}</p>
            <button type="button" onClick={onUploadClick} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 transition-colors">
              {t('nudge.uploadCta')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Has 1-2 templates, can upload more
  if (canUpload) {
    if (variant === 'compact') {
      return (
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/40 to-purple-900/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/40 flex items-center justify-center text-base font-bold text-violet-300">{count}</span>
            <div>
              <p className="font-semibold text-white">{t('nudge.addMore', { count })}</p>
              <p className="text-sm text-gray-400">{t('nudge.addMoreDescription')}</p>
            </div>
          </div>
          <button type="button" onClick={onUploadClick} className="w-full py-3 px-4 text-base font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors">
            {t('nudge.uploadCta')}
          </button>
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <span className="text-lg font-bold text-violet-600 dark:text-violet-400">{count}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">{t('nudge.addMore', { count })}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('nudge.addMoreDescription')}</p>
            <button type="button" onClick={onUploadClick} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 transition-colors">
              {t('nudge.uploadCta')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // At limit — personalized
  if (variant === 'compact') {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-900/30 to-emerald-900/20 p-5">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="font-semibold text-green-300">{t('nudge.personalized', { count })}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <p className="font-medium text-green-700 dark:text-green-300">{t('nudge.personalized', { count })}</p>
      </div>
    </div>
  )
}
