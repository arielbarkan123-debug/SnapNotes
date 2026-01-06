'use client'

// ============================================================================
// Error Reporter - Client-side error monitoring
// Sends errors to the monitoring API for debugging
// ============================================================================

import { getDeviceInfo } from '@/lib/analytics/device'

// ============================================================================
// Types
// ============================================================================

interface ErrorReport {
  errorType: 'javascript' | 'api' | 'network' | 'unhandled'
  errorMessage: string
  errorStack?: string
  componentName?: string
  pagePath?: string
  sessionId?: string
  userAgent?: string
  context?: Record<string, unknown>
  apiEndpoint?: string
  httpMethod?: string
  httpStatus?: number
  deviceInfo?: {
    browser?: string
    browserVersion?: string
    os?: string
    osVersion?: string
    deviceType?: string
    screenResolution?: string
  }
}

// ============================================================================
// Error Reporter Class
// ============================================================================

class ErrorReporter {
  private isInitialized = false
  private sessionId: string | null = null
  private errorQueue: ErrorReport[] = []
  private isProcessing = false
  private retryCount = 0
  private maxRetries = 3

  /**
   * Initialize the error reporter
   */
  initialize(sessionId?: string): void {
    if (typeof window === 'undefined') return
    if (this.isInitialized) return

    this.sessionId = sessionId || this.generateSessionId()
    this.isInitialized = true

    // Set up global error handlers
    this.setupGlobalHandlers()

    console.log('[ErrorReporter] Initialized')
  }

  /**
   * Report a JavaScript error
   */
  reportError(
    error: Error,
    componentName?: string,
    context?: Record<string, unknown>
  ): void {
    this.queueError({
      errorType: 'javascript',
      errorMessage: error.message,
      errorStack: error.stack,
      componentName,
      pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
      context,
    })
  }

  /**
   * Report an API error
   */
  reportApiError(
    endpoint: string,
    method: string,
    status: number,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.queueError({
      errorType: 'api',
      errorMessage: message,
      apiEndpoint: endpoint,
      httpMethod: method,
      httpStatus: status,
      pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
      context,
    })
  }

  /**
   * Report a network error
   */
  reportNetworkError(
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.queueError({
      errorType: 'network',
      errorMessage: message,
      pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
      context,
    })
  }

  /**
   * Report an unhandled promise rejection
   */
  reportUnhandledRejection(
    reason: unknown,
    context?: Record<string, unknown>
  ): void {
    const message = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? reason.stack : undefined

    this.queueError({
      errorType: 'unhandled',
      errorMessage: message,
      errorStack: stack,
      pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
      context,
    })
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupGlobalHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.queueError({
        errorType: 'javascript',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        pagePath: window.location.pathname,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack = reason instanceof Error ? reason.stack : undefined

      this.queueError({
        errorType: 'unhandled',
        errorMessage: message,
        errorStack: stack,
        pagePath: window.location.pathname,
      })
    })
  }

  private queueError(report: Partial<ErrorReport>): void {
    const deviceInfo = getDeviceInfo()

    const fullReport: ErrorReport = {
      errorType: report.errorType || 'javascript',
      errorMessage: report.errorMessage || 'Unknown error',
      errorStack: report.errorStack,
      componentName: report.componentName,
      pagePath: report.pagePath,
      sessionId: this.sessionId || undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      context: report.context,
      apiEndpoint: report.apiEndpoint,
      httpMethod: report.httpMethod,
      httpStatus: report.httpStatus,
      deviceInfo: {
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        deviceType: deviceInfo.deviceType,
        screenResolution: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
      },
    }

    this.errorQueue.push(fullReport)
    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) return

    this.isProcessing = true

    while (this.errorQueue.length > 0) {
      const report = this.errorQueue.shift()
      if (!report) continue

      try {
        await this.sendError(report)
        this.retryCount = 0
      } catch (err) {
        // Re-queue if retries available
        if (this.retryCount < this.maxRetries) {
          this.retryCount++
          this.errorQueue.unshift(report)
          // Exponential backoff
          await this.delay(1000 * Math.pow(2, this.retryCount))
        } else {
          console.error('[ErrorReporter] Failed to send error after retries:', err)
          this.retryCount = 0
        }
      }
    }

    this.isProcessing = false
  }

  private async sendError(report: ErrorReport): Promise<void> {
    // Use beacon API for reliability (works even when page is closing)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const success = navigator.sendBeacon(
        '/api/monitoring/errors',
        JSON.stringify(report)
      )
      if (success) return
    }

    // Fallback to fetch
    const response = await fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    })

    if (!response.ok) {
      throw new Error(`Failed to send error: ${response.status}`)
    }
  }

  private generateSessionId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const errorReporter = new ErrorReporter()

// ============================================================================
// React Hook
// ============================================================================

export function useErrorReporter() {
  return {
    reportError: (error: Error, componentName?: string, context?: Record<string, unknown>) =>
      errorReporter.reportError(error, componentName, context),
    reportApiError: (endpoint: string, method: string, status: number, message: string, context?: Record<string, unknown>) =>
      errorReporter.reportApiError(endpoint, method, status, message, context),
    reportNetworkError: (message: string, context?: Record<string, unknown>) =>
      errorReporter.reportNetworkError(message, context),
  }
}

export default errorReporter
