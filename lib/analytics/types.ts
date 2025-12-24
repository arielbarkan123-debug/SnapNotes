// ============================================================================
// Analytics Types
// ============================================================================

// Session types
export interface AnalyticsSession {
  id: string
  userId: string | null
  startedAt: Date
  endedAt?: Date
  durationMs?: number
  pageCount: number
  isBounce: boolean
  deviceInfo: DeviceInfo
  landingPage: string
  referrer?: string
  utmParams?: UTMParams
}

export interface DeviceInfo {
  deviceType: 'desktop' | 'tablet' | 'mobile'
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  screenWidth: number
  screenHeight: number
  timezone: string
  locale: string
}

export interface UTMParams {
  source?: string
  medium?: string
  campaign?: string
}

// Page view types
export interface PageView {
  id?: string
  sessionId: string
  userId?: string | null
  pagePath: string
  pageTitle: string
  referrerPath?: string
  viewStartAt: Date
  viewEndAt?: Date
  timeOnPageMs?: number
  scrollDepthPercent?: number
  isEntryPage: boolean
  isExitPage: boolean
}

// Event types
export interface AnalyticsEvent {
  name: string
  category: EventCategory
  properties?: Record<string, unknown>
  timestamp?: Date
  clickPosition?: ClickPosition
  element?: ElementInfo
}

export type EventCategory =
  | 'navigation'
  | 'interaction'
  | 'feature'
  | 'funnel'
  | 'error'
  | 'performance'
  | 'engagement'

export interface ClickPosition {
  x: number
  y: number
}

export interface ElementInfo {
  id?: string
  className?: string
  text?: string
}

// Error types
export interface AnalyticsError {
  type: 'javascript' | 'api' | 'network' | 'unhandled'
  message: string
  stackTrace?: string
  pagePath: string
  componentName?: string
  apiEndpoint?: string
  httpStatus?: number
  httpMethod?: string
  context?: Record<string, unknown>
}

// Funnel types
export interface FunnelStep {
  funnelName: string
  stepName: string
  stepOrder: number
  properties?: Record<string, unknown>
  timeFromPreviousStepMs?: number
}

// Batch types for API
export interface AnalyticsBatch {
  sessionId: string
  userId?: string | null
  events: BatchEvent[]
  pageViews: BatchPageView[]
  errors: BatchError[]
  funnelSteps: BatchFunnelStep[]
  sessionUpdate?: SessionUpdate
}

export interface BatchEvent {
  name: string
  category: EventCategory
  pagePath: string
  properties: Record<string, unknown>
  clickX?: number
  clickY?: number
  elementId?: string
  elementClass?: string
  elementText?: string
  eventTime: string // ISO string
}

export interface BatchPageView {
  pagePath: string
  pageTitle: string
  referrerPath?: string
  viewStartAt: string // ISO string
  viewEndAt?: string
  timeOnPageMs?: number
  scrollDepthPercent?: number
  isEntryPage: boolean
  isExitPage: boolean
}

export interface BatchError {
  type: 'javascript' | 'api' | 'network' | 'unhandled'
  message: string
  stackTrace?: string
  pagePath: string
  componentName?: string
  apiEndpoint?: string
  httpStatus?: number
  httpMethod?: string
  context?: Record<string, unknown>
  occurredAt: string // ISO string
}

export interface BatchFunnelStep {
  funnelName: string
  stepName: string
  stepOrder: number
  properties?: Record<string, unknown>
  timeFromPreviousStepMs?: number
  completedAt: string // ISO string
}

export interface SessionUpdate {
  endedAt?: string
  pageCount?: number
  isBounce?: boolean
}

// Dashboard types
export interface DailyMetrics {
  date: string
  dailyActiveUsers: number
  newUsers: number
  returningUsers: number
  totalSessions: number
  avgSessionDurationMs: number
  bounceRate: number
  totalPageViews: number
  uniquePageViews: number
  avgPagesPerSession: number
  totalEvents: number
  totalErrors: number
  desktopSessions: number
  mobileSessions: number
  tabletSessions: number
}

export interface PageMetrics {
  date: string
  pagePath: string
  views: number
  uniqueVisitors: number
  avgTimeOnPageMs: number
  bounceRate: number
  entryCount: number
  exitCount: number
  avgScrollDepth: number
}

export interface HourlyPattern {
  date: string
  hour: number
  dayOfWeek: number
  sessionCount: number
  pageViewCount: number
  eventCount: number
  uniqueUsers: number
}

export interface FeatureUsage {
  date: string
  featureName: string
  usageCount: number
  uniqueUsers: number
  avgDurationMs: number
}

export interface FunnelAnalytics {
  funnelName: string
  steps: FunnelStepAnalytics[]
  overallConversionRate: number
  totalEntries: number
  totalCompletions: number
}

export interface FunnelStepAnalytics {
  stepName: string
  stepOrder: number
  count: number
  conversionRate: number
  dropOffRate: number
  avgTimeToNextStepMs: number
}

// Admin types
export interface AdminUser {
  id: string
  userId: string
  role: 'admin' | 'super_admin'
  createdAt: Date
}

// Predefined features to track
export const TRACKED_FEATURES = {
  COURSE_CREATE: 'course_create',
  COURSE_VIEW: 'course_view',
  COURSE_DELETE: 'course_delete',
  LESSON_START: 'lesson_start',
  LESSON_COMPLETE: 'lesson_complete',
  PRACTICE_START: 'practice_start',
  PRACTICE_COMPLETE: 'practice_complete',
  REVIEW_START: 'review_start',
  REVIEW_COMPLETE: 'review_complete',
  EXAM_START: 'exam_start',
  EXAM_COMPLETE: 'exam_complete',
  HELP_OPEN: 'help_open',
  SEARCH_USE: 'search_use',
  UPLOAD_START: 'upload_start',
  UPLOAD_COMPLETE: 'upload_complete',
  PROFILE_VIEW: 'profile_view',
  PROGRESS_VIEW: 'progress_view',
  THEME_TOGGLE: 'theme_toggle',
} as const

export type TrackedFeature = typeof TRACKED_FEATURES[keyof typeof TRACKED_FEATURES]
