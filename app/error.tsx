'use client'

import { useEffect, useState } from 'react'
import { ErrorFallback } from '@/components/ErrorBoundary'
import { createLogger } from '@/lib/logger'

const log = createLogger('page:error')

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Enhanced error logging
    log.error('APP ERROR CAUGHT')
    log.error({ detail: error.message }, 'Error message')
    log.error({ detail: error.name }, 'Error name')
    log.error({ detail: error.digest || 'none' }, 'Error digest')
    log.error({ detail: error.stack }, 'Stack trace')
    log.error({ detail: typeof window !== 'undefined' ? window.location.href : 'SSR' }, 'Page URL')
    log.error({ detail: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR' }, 'User Agent')
    log.error({ detail: new Date().toISOString() }, 'Timestamp')
    log.error('END ERROR')
  }, [error])

  // Copy error details to clipboard
  const copyErrorDetails = () => {
    const details = `
Error: ${error.message}
Name: ${error.name}
Digest: ${error.digest || 'none'}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
Time: ${new Date().toISOString()}
Stack: ${error.stack || 'N/A'}
    `.trim()

    // Safe clipboard access - may not be available in all contexts
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(details).then(() => {
        alert('Error details copied to clipboard')
      }).catch(() => {
        log.info({ detail: details }, 'Failed to copy, details')
      })
    } else {
      // Fallback - just log to console
      log.info({ detail: details }, 'Clipboard not available. Error details')
      alert('Could not copy to clipboard. Check console for error details.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center aurora-bg px-4">
      <div className="max-w-md w-full">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Something went wrong"
          message="We encountered an unexpected error. Please try again."
        />

        {/* Debug section - always visible in development, collapsible in production */}
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            {showDetails ? 'Hide' : 'Show'} error details
          </button>

          {showDetails && (
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
              <p className="font-mono text-red-600 dark:text-red-400 break-all mb-2">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  Digest: {error.digest}
                </p>
              )}
              <button
                onClick={copyErrorDetails}
                className="text-violet-600 dark:text-violet-400 underline hover:underline"
              >
                Copy error details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
