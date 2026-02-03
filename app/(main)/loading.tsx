'use client'

import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/Skeleton'

export default function MainLoading() {
  const t = useTranslations('processing')
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4 text-violet-600 dark:text-violet-400" />
        <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
      </div>
    </div>
  )
}
