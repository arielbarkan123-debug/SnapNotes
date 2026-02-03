'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/ErrorBoundary'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AuthErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[Auth] Error caught:', error.message, error.digest || '')
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center aurora-bg px-4">
      <div className="max-w-md w-full">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Authentication Error"
          message="Something went wrong during authentication. Please try again."
        />
      </div>
    </div>
  )
}
