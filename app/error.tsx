'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/ErrorBoundary'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console (in production, send to error tracking service)
    console.error('Error page caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <ErrorFallback
        error={error}
        reset={reset}
        title="Something went wrong"
        message="We encountered an unexpected error. Please try again."
      />
    </div>
  )
}
