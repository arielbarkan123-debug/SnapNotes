'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface DiagramErrorBoundaryProps {
  children: ReactNode
  /** Fallback content to show on error */
  fallback?: ReactNode
  /** Width of the placeholder */
  width?: number | string
  /** Height of the placeholder */
  height?: number | string
  /** Language for error message */
  language?: 'en' | 'he'
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Diagram type for context */
  diagramType?: string
}

interface DiagramErrorBoundaryState {
  hasError: boolean
  error: Error | null
  retryCount: number
}

/**
 * DiagramErrorBoundary - Lightweight error boundary for diagram components
 *
 * Features:
 * - Shows a placeholder SVG when diagram fails to render
 * - Retry functionality
 * - Minimal UI that doesn't disrupt the page
 * - RTL support
 */
export class DiagramErrorBoundary extends Component<DiagramErrorBoundaryProps, DiagramErrorBoundaryState> {
  static defaultProps = {
    width: '100%',
    height: 300,
    language: 'en',
  }

  constructor(props: DiagramErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<DiagramErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DiagramError]', this.props.diagramType || 'Unknown', error)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }))
  }

  render() {
    const { hasError, retryCount } = this.state
    const { children, fallback, width, height, language, diagramType } = this.props
    const isRTL = language === 'he'

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback
      }

      // Default placeholder UI
      const labels = {
        title: language === 'he' ? 'לא ניתן להציג את התרשים' : 'Could not display diagram',
        retry: language === 'he' ? 'נסה שוב' : 'Retry',
        type: diagramType ? `(${diagramType})` : '',
      }

      return (
        <div
          className="diagram-error-boundary"
          style={{ width, height: typeof height === 'number' ? height : undefined }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700"
            style={{ minHeight: typeof height === 'number' ? height : 200 }}
          >
            <div className="text-center p-4">
              {/* Error icon */}
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {labels.title} {labels.type}
              </p>

              {/* Retry button (limit to 3 attempts) */}
              {retryCount < 3 && (
                <motion.button
                  onClick={this.handleRetry}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg
                    className="w-4 h-4 inline-block mr-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {labels.retry}
                </motion.button>
              )}

              {/* Development only: show error details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-3 text-left">
                  <summary className="text-xs text-gray-400 cursor-pointer">
                    Debug info
                  </summary>
                  <pre className="mt-1 text-xs text-red-500 overflow-auto max-h-24 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </motion.div>
        </div>
      )
    }

    return children
  }
}

/**
 * HOC to wrap diagram components with error boundary
 */
export function withDiagramErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<DiagramErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <DiagramErrorBoundary {...options}>
      <Component {...props} />
    </DiagramErrorBoundary>
  )

  WrappedComponent.displayName = `withDiagramErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent
}

export default DiagramErrorBoundary
