// ============================================================================
// Analytics Client
// Core client with event batching, session management, and page tracking
// ============================================================================

import {
  AnalyticsEvent,
  AnalyticsError,
  FunnelStep,
  AnalyticsBatch,
  BatchEvent,
  BatchPageView,
  BatchError,
  BatchFunnelStep,
  ClickPosition,
  ElementInfo,
} from './types'
import { getDeviceInfo, getUTMParams, getReferrer } from './device'

// Storage keys
const SESSION_KEY = 'notesnap_analytics_session'
const SESSION_TIMEOUT_KEY = 'notesnap_analytics_session_timeout'

// Batching configuration
const BATCH_SIZE = 10
const BATCH_INTERVAL_MS = 5000 // 5 seconds
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

class AnalyticsClient {
  private sessionId: string | null = null
  private userId: string | null = null
  private isInitialized = false
  private isAdmin = false // Admin users are excluded from tracking

  // Event queues
  private eventQueue: BatchEvent[] = []
  private pageViewQueue: BatchPageView[] = []
  private errorQueue: BatchError[] = []
  private funnelQueue: BatchFunnelStep[] = []

  // Timers
  private batchTimeout: ReturnType<typeof setTimeout> | null = null
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null

  // Current page tracking
  private currentPagePath: string = ''
  private currentPageStartTime: number = 0
  private currentPageViewId: string | null = null
  private maxScrollDepth: number = 0
  private pageCount: number = 0
  private isFirstPage: boolean = true

  /**
   * Initialize the analytics client
   */
  async initialize(userId?: string | null): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.isInitialized) return

    this.userId = userId || null
    this.sessionId = this.getOrCreateSession()
    this.isInitialized = true

    // Set up event listeners
    this.setupEventListeners()

    // Start batch timer
    this.startBatchTimer()

    // Start session timeout checker
    this.startSessionChecker()

    console.log('[Analytics] Initialized with session:', this.sessionId)
  }

  /**
   * Set user ID (call after auth)
   */
  setUserId(userId: string | null): void {
    this.userId = userId
  }

  /**
   * Set admin status - admin users are excluded from all tracking
   */
  setIsAdmin(isAdmin: boolean): void {
    this.isAdmin = isAdmin
    if (isAdmin) {
      console.log('[Analytics] Admin user detected - tracking disabled')
      // Clear any queued data
      this.eventQueue = []
      this.pageViewQueue = []
      this.errorQueue = []
      this.funnelQueue = []
    }
  }

  /**
   * Check if tracking is enabled (not admin)
   */
  isTrackingEnabled(): boolean {
    return !this.isAdmin
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  private getOrCreateSession(): string {
    // Don't create sessions for admin users
    if (this.isAdmin) {
      return 'admin-no-tracking'
    }

    const stored = localStorage.getItem(SESSION_KEY)
    const timeout = localStorage.getItem(SESSION_TIMEOUT_KEY)

    const now = Date.now()

    // Check if session is still valid
    if (stored && timeout && parseInt(timeout) > now) {
      // Extend session timeout
      this.extendSessionTimeout()
      return stored
    }

    // Create new session
    const newSessionId = this.generateId()
    localStorage.setItem(SESSION_KEY, newSessionId)
    this.extendSessionTimeout()

    // Create session in backend
    this.createSession(newSessionId)

    this.pageCount = 0
    this.isFirstPage = true

    return newSessionId
  }

  private extendSessionTimeout(): void {
    const newTimeout = Date.now() + SESSION_TIMEOUT_MS
    localStorage.setItem(SESSION_TIMEOUT_KEY, newTimeout.toString())
  }

  private async createSession(sessionId: string): Promise<void> {
    const deviceInfo = getDeviceInfo()
    const utmParams = getUTMParams()
    const referrer = getReferrer()

    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: this.userId,
          deviceInfo,
          utmParams,
          referrer,
          landingPage: window.location.pathname,
        }),
      })
    } catch (error) {
      console.error('[Analytics] Failed to create session:', error)
    }
  }

  private startSessionChecker(): void {
    // Check session validity every minute
    this.sessionCheckInterval = setInterval(() => {
      const timeout = localStorage.getItem(SESSION_TIMEOUT_KEY)
      if (timeout && parseInt(timeout) < Date.now()) {
        // Session expired, create new one
        this.endCurrentSession()
        this.sessionId = this.getOrCreateSession()
      }
    }, 60000)
  }

  private endCurrentSession(): void {
    if (!this.sessionId) return

    // End current page view
    this.endCurrentPageView(true)

    // Send end session request via beacon
    const data = JSON.stringify({
      sessionId: this.sessionId,
      endedAt: new Date().toISOString(),
      pageCount: this.pageCount,
      isBounce: this.pageCount <= 1,
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/session/end', data)
    }
  }

  // ============================================================================
  // Page View Tracking
  // ============================================================================

  /**
   * Track a page view
   */
  trackPageView(path: string, title: string): void {
    if (!this.isInitialized || !this.sessionId || this.isAdmin) return

    // End previous page view if exists
    if (this.currentPagePath && this.currentPagePath !== path) {
      this.endCurrentPageView(false)
    }

    // Start new page view
    this.currentPagePath = path
    this.currentPageStartTime = Date.now()
    this.currentPageViewId = this.generateId()
    this.maxScrollDepth = 0
    this.pageCount++

    const pageView: BatchPageView = {
      pagePath: path,
      pageTitle: title,
      referrerPath: this.currentPagePath !== path ? this.currentPagePath : undefined,
      viewStartAt: new Date().toISOString(),
      isEntryPage: this.isFirstPage,
      isExitPage: false, // Will be updated on exit
    }

    this.pageViewQueue.push(pageView)
    this.isFirstPage = false
    this.extendSessionTimeout()

    // Try to send if queue is getting full
    this.checkAndFlush()
  }

  private endCurrentPageView(isExit: boolean): void {
    if (!this.currentPagePath || this.pageViewQueue.length === 0) return

    const now = Date.now()
    const timeOnPage = now - this.currentPageStartTime

    // Find and update the current page view in queue
    const lastPageView = this.pageViewQueue[this.pageViewQueue.length - 1]
    if (lastPageView && lastPageView.pagePath === this.currentPagePath) {
      lastPageView.viewEndAt = new Date().toISOString()
      lastPageView.timeOnPageMs = timeOnPage
      lastPageView.scrollDepthPercent = this.maxScrollDepth
      lastPageView.isExitPage = isExit
    }
  }

  /**
   * Update scroll depth for current page
   */
  updateScrollDepth(percent: number): void {
    if (percent > this.maxScrollDepth) {
      this.maxScrollDepth = Math.min(100, Math.round(percent))
    }
  }

  // ============================================================================
  // Event Tracking
  // ============================================================================

  /**
   * Track a custom event
   */
  trackEvent(event: AnalyticsEvent): void {
    if (!this.isInitialized || !this.sessionId || this.isAdmin) return

    const batchEvent: BatchEvent = {
      name: event.name,
      category: event.category,
      pagePath: this.currentPagePath || window?.location?.pathname || '',
      properties: event.properties || {},
      eventTime: (event.timestamp || new Date()).toISOString(),
    }

    // Add click position if present
    if (event.clickPosition) {
      batchEvent.clickX = event.clickPosition.x
      batchEvent.clickY = event.clickPosition.y
    }

    // Add element info if present
    if (event.element) {
      batchEvent.elementId = event.element.id
      batchEvent.elementClass = event.element.className
      batchEvent.elementText = event.element.text?.slice(0, 100) // Limit text length
    }

    this.eventQueue.push(batchEvent)
    this.extendSessionTimeout()
    this.checkAndFlush()
  }

  /**
   * Track a click event with position and element info
   */
  trackClick(
    eventName: string,
    clickPosition: ClickPosition,
    element?: ElementInfo,
    properties?: Record<string, unknown>
  ): void {
    this.trackEvent({
      name: eventName,
      category: 'interaction',
      clickPosition,
      element,
      properties,
    })
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName: string, properties?: Record<string, unknown>): void {
    this.trackEvent({
      name: featureName,
      category: 'feature',
      properties,
    })
  }

  // ============================================================================
  // Error Tracking
  // ============================================================================

  /**
   * Track an error
   */
  trackError(error: AnalyticsError): void {
    if (!this.isInitialized || this.isAdmin) return

    const batchError: BatchError = {
      type: error.type,
      message: error.message,
      stackTrace: error.stackTrace,
      pagePath: error.pagePath || this.currentPagePath || window?.location?.pathname || '',
      componentName: error.componentName,
      apiEndpoint: error.apiEndpoint,
      httpStatus: error.httpStatus,
      httpMethod: error.httpMethod,
      context: error.context,
      occurredAt: new Date().toISOString(),
    }

    this.errorQueue.push(batchError)
    this.checkAndFlush()
  }

  // ============================================================================
  // Funnel Tracking
  // ============================================================================

  private completedFunnelSteps = new Set<string>()

  /**
   * Track a funnel step completion
   */
  trackFunnelStep(step: FunnelStep): void {
    if (!this.isInitialized || !this.sessionId || this.isAdmin) return

    // Prevent duplicate tracking of same step
    const stepKey = `${step.funnelName}:${step.stepName}`
    if (this.completedFunnelSteps.has(stepKey)) return
    this.completedFunnelSteps.add(stepKey)

    const batchStep: BatchFunnelStep = {
      funnelName: step.funnelName,
      stepName: step.stepName,
      stepOrder: step.stepOrder,
      properties: step.properties,
      timeFromPreviousStepMs: step.timeFromPreviousStepMs,
      completedAt: new Date().toISOString(),
    }

    this.funnelQueue.push(batchStep)
    this.checkAndFlush()
  }

  /**
   * Reset funnel tracking for a specific funnel (use when user restarts a flow)
   */
  resetFunnel(funnelName: string): void {
    const keysToRemove: string[] = []
    this.completedFunnelSteps.forEach((key) => {
      if (key.startsWith(`${funnelName}:`)) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach((key) => this.completedFunnelSteps.delete(key))
  }

  // ============================================================================
  // Batching & Sending
  // ============================================================================

  private startBatchTimer(): void {
    this.batchTimeout = setInterval(() => {
      this.flush()
    }, BATCH_INTERVAL_MS)
  }

  private checkAndFlush(): void {
    const totalItems =
      this.eventQueue.length +
      this.pageViewQueue.length +
      this.errorQueue.length +
      this.funnelQueue.length

    if (totalItems >= BATCH_SIZE) {
      this.flush()
    }
  }

  /**
   * Flush all queued events to the server
   */
  async flush(): Promise<void> {
    if (!this.sessionId) return

    // Check if there's anything to send
    if (
      this.eventQueue.length === 0 &&
      this.pageViewQueue.length === 0 &&
      this.errorQueue.length === 0 &&
      this.funnelQueue.length === 0
    ) {
      return
    }

    // Create batch
    const batch: AnalyticsBatch = {
      sessionId: this.sessionId,
      userId: this.userId,
      events: [...this.eventQueue],
      pageViews: [...this.pageViewQueue],
      errors: [...this.errorQueue],
      funnelSteps: [...this.funnelQueue],
    }

    // Clear queues immediately (optimistic)
    this.eventQueue = []
    this.pageViewQueue = []
    this.errorQueue = []
    this.funnelQueue = []

    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })

      if (!response.ok) {
        console.error('[Analytics] Failed to send batch:', response.statusText)
        // Re-queue on failure (with limit to prevent memory issues)
        if (this.eventQueue.length < 100) {
          this.eventQueue.push(...batch.events)
          this.pageViewQueue.push(...batch.pageViews)
          this.errorQueue.push(...batch.errors)
          this.funnelQueue.push(...batch.funnelSteps)
        }
      }
    } catch (error) {
      console.error('[Analytics] Failed to send batch:', error)
    }
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  private setupEventListeners(): void {
    // Scroll tracking (debounced)
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null
    window.addEventListener('scroll', () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
        this.updateScrollDepth(scrollPercent)
      }, 100)
    })

    // Visibility change (pause/resume tracking)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // User is leaving - end current page and flush
        this.endCurrentPageView(true)
        this.flush()
      } else {
        // User is back - extend session
        this.extendSessionTimeout()
      }
    })

    // Before unload - send data via beacon
    window.addEventListener('beforeunload', () => {
      this.endCurrentPageView(true)

      // Use beacon API for reliable delivery
      if (this.sessionId && navigator.sendBeacon) {
        const batch: AnalyticsBatch = {
          sessionId: this.sessionId,
          userId: this.userId,
          events: this.eventQueue,
          pageViews: this.pageViewQueue,
          errors: this.errorQueue,
          funnelSteps: this.funnelQueue,
          sessionUpdate: {
            endedAt: new Date().toISOString(),
            pageCount: this.pageCount,
            isBounce: this.pageCount <= 1,
          },
        }

        navigator.sendBeacon('/api/analytics/events', JSON.stringify(batch))
      }
    })

    // Global click tracking (for heatmap data)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!target) return

      // Only track meaningful clicks (buttons, links, etc.)
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button' ||
        target.getAttribute('data-track')

      if (isInteractive) {
        this.trackClick(
          'click',
          { x: Math.round(e.clientX), y: Math.round(e.clientY) },
          {
            id: target.id || undefined,
            className: target.className || undefined,
            text: target.textContent?.trim().slice(0, 50) || undefined,
          },
          {
            tagName: target.tagName.toLowerCase(),
            href: target.getAttribute('href') || undefined,
          }
        )
      }
    })

    // Global error tracking
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        stackTrace: event.error?.stack,
        pagePath: window.location.pathname,
      })
    })

    // Unhandled promise rejection tracking
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'unhandled',
        message: String(event.reason),
        stackTrace: event.reason?.stack,
        pagePath: window.location.pathname,
      })
    })
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateId(): string {
    // Generate proper UUID v4 for database compatibility
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.batchTimeout) {
      clearInterval(this.batchTimeout)
    }
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
    }
    this.flush()
  }
}

// Export singleton instance
export const analytics = new AnalyticsClient()
