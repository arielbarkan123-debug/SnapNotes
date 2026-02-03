'use client'

import { useEffect, useState } from 'react'
import { ErrorFallback } from '@/components/ErrorBoundary'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Enhanced error logging
    console.error('=== APP ERROR CAUGHT ===')
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error digest:', error.digest || 'none')
    console.error('Stack trace:', error.stack)
    console.error('Page URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')
    console.error('User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR')
    console.error('Timestamp:', new Date().toISOString())
    console.error('=== END ERROR ===')
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
        console.log('Failed to copy, details:', details)
      })
    } else {
      // Fallback - just log to console
      console.log('Clipboard not available. Error details:', details)
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
                className="text-violet-600 dark:text-violet-400 hover:underline"
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
