'use client'

import { useTranslations } from 'next-intl'
import { type UploadError, type UploadFileError } from './types'

interface ErrorDisplayProps {
  error: UploadError | null
  failedFiles: UploadFileError[]
  isUploading: boolean
  hasFiles: boolean
  onRetry: () => void
  onDismissFailedFiles: () => void
}

/**
 * Display component for errors and failed file warnings
 */
export default function ErrorDisplay({
  error,
  failedFiles,
  isUploading,
  hasFiles,
  onRetry,
  onDismissFailedFiles,
}: ErrorDisplayProps) {
  const t = useTranslations('upload')

  return (
    <>
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-400 text-sm">{error.message}</p>
              {error.code && (
                <p className="mt-1 text-xs text-red-500/70 dark:text-red-400/70">
                  Code: <code className="font-mono">{error.code}</code>
                </p>
              )}
              {error.isRetryable && !isUploading && hasFiles && (
                <button
                  onClick={onRetry}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium underline"
                >
                  {t('tryAgain')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Failed Files Warning */}
      {failedFiles.length > 0 && !error && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                {failedFiles.length === 1
                  ? t('failedFile', { count: failedFiles.length })
                  : t('failedFiles', { count: failedFiles.length })}
              </p>
              <ul className="mt-1 text-xs text-amber-600 dark:text-amber-500 space-y-0.5">
                {failedFiles.map((f, i) => (
                  <li key={i} className="truncate">
                    <span className="font-medium">{f.filename}:</span> {f.error}
                  </li>
                ))}
              </ul>
              <button
                onClick={onDismissFailedFiles}
                className="mt-2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
              >
                {t('dismiss')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
