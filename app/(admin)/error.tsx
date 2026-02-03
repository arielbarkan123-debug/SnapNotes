'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/ErrorBoundary'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[Admin] Error caught:', error.message, error.digest || '')
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center aurora-bg px-4">
      <div className="max-w-md w-full">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Admin Panel Error"
          message="Something went wrong in the admin panel. Please try again."
        />
      </div>
    </div>
  )
}
