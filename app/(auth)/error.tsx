'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ErrorFallback } from '@/components/ErrorBoundary'
import { createLogger } from '@/lib/logger'


const log = createLogger('page:errorx')
interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AuthErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations('errors')

  useEffect(() => {
    log.error({ detail: [error.message, error.digest || ''] }, 'Error caught')
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center aurora-bg px-4">
      <div className="max-w-md w-full">
        <ErrorFallback
          error={error}
          reset={reset}
          title={t('authError')}
          message={t('authErrorDescription')}
        />
      </div>
    </div>
  )
}
