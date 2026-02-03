'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import Button from './ui/Button'
import { analytics } from '@/lib/analytics'
import { errorReporter } from '@/lib/monitoring'
import { ErrorCodes, type ErrorCode, getDisplayErrorCode } from '@/lib/errors'

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  translations?: {
    title: string
    description: string
    tryAgain: string
    reloadPage: string
    errorCode: string
  }
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCode: ErrorCode
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: ErrorCodes.CLIENT_UNKNOWN,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Map the error to an error code
    const errorCode = getDisplayErrorCode(error)
    return { hasError: true, error, errorCode }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console with error code
    const errorCode = this.state.errorCode || ErrorCodes.CLIENT_UNKNOWN
    console.error(`[${errorCode}] ErrorBoundary caught an error:`, error)
    console.error('Component stack:', errorInfo.componentStack)

    this.setState({ errorInfo })

    // Track error in analytics with error code
    analytics.trackError({
      type: 'javascript',
      message: error.message,
      stackTrace: error.stack,
      pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
      componentName: 'ErrorBoundary',
      context: {
        componentStack: errorInfo.componentStack,
        errorCode,
      },
    })

    // Report error to monitoring system with error code
    errorReporter.reportError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorCode,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: ErrorCodes.CLIENT_UNKNOWN,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Get translations (with fallback for when translations aren't available)
      const t = this.props.translations || {
        title: 'Something went wrong',
        description: 'We encountered an unexpected error. Please try again, or contact support if the problem persists.',
        tryAgain: 'Try Again',
        reloadPage: 'Reload Page',
        errorCode: 'Error code:',
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center aurora-bg px-4">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t.description}
            </p>

            {/* Error Code */}
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              {t.errorCode} <code className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{this.state.errorCode}</code>
            </p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-start overflow-auto">
                <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="secondary">
                {t.tryAgain}
              </Button>
              <Button onClick={this.handleReload}>
                {t.reloadPage}
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// Functional Error Fallback (for use with error.tsx)
// ============================================================================

interface ErrorFallbackProps {
  error?: Error
  reset?: () => void
  title?: string
  message?: string
  errorCode?: ErrorCode
}

export function ErrorFallback({
  error,
  reset,
  title,
  message,
  errorCode,
}: ErrorFallbackProps) {
  const t = useTranslations('errors')

  const handleReload = () => {
    window.location.reload()
  }

  const displayTitle = title || t('generic')
  const displayMessage = message || t('genericDescription')
  const displayCode = errorCode || (error ? getDisplayErrorCode(error) : ErrorCodes.CLIENT_UNKNOWN)

  return (
    <div className="min-h-[400px] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {displayTitle}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {displayMessage}
        </p>

        {/* Error Code */}
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          {t('errorCode')} <code className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{displayCode}</code>
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-start">
            <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {reset && (
            <Button onClick={reset} variant="secondary">
              {t('tryAgain')}
            </Button>
          )}
          <Button onClick={handleReload}>
            {t('reloadPage')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Network Error Component
// ============================================================================

interface NetworkErrorProps {
  onRetry?: () => void
  message?: string
}

export function NetworkError({
  onRetry,
  message,
}: NetworkErrorProps) {
  const t = useTranslations('errors')
  const displayMessage = message || t('networkError')

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
        {displayMessage}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          <svg
            className="w-4 h-4 me-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('retry')}
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Translated Error Boundary Wrapper
// ============================================================================

interface TranslatedErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export function TranslatedErrorBoundary({ children, fallback }: TranslatedErrorBoundaryProps) {
  const t = useTranslations('errors')

  return (
    <ErrorBoundary
      fallback={fallback}
      translations={{
        title: t('generic'),
        description: t('genericDescription'),
        tryAgain: t('tryAgain'),
        reloadPage: t('reloadPage'),
        errorCode: t('errorCode'),
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
