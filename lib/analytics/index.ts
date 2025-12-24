// ============================================================================
// Analytics Library - Main Export
// ============================================================================

// Core client
export { analytics } from './client'

// React hooks
export {
  useAnalytics,
  usePageTracking,
  useEventTracking,
  useErrorTracking,
  useFunnelTracking,
  useTimeTracking,
  useTrackedClick,
  useTrackedAction,
} from './hooks'

// Device utilities
export {
  detectDeviceType,
  detectBrowser,
  detectOS,
  getDeviceInfo,
  getUTMParams,
  getReferrer,
} from './device'

// Funnel configurations
export {
  ONBOARDING_FUNNEL,
  COURSE_CREATION_FUNNEL,
  LESSON_FUNNEL,
  PRACTICE_FUNNEL,
  EXAM_FUNNEL,
  REVIEW_FUNNEL,
  SIGNUP_FUNNEL,
  ALL_FUNNELS,
  getStepOrder,
} from './funnels'

// Types
export type {
  AnalyticsSession,
  DeviceInfo,
  UTMParams,
  PageView,
  AnalyticsEvent,
  EventCategory,
  ClickPosition,
  ElementInfo,
  AnalyticsError,
  FunnelStep,
  AnalyticsBatch,
  BatchEvent,
  BatchPageView,
  BatchError,
  BatchFunnelStep,
  SessionUpdate,
  DailyMetrics,
  PageMetrics,
  HourlyPattern,
  FeatureUsage,
  FunnelAnalytics,
  FunnelStepAnalytics,
  AdminUser,
  TrackedFeature,
} from './types'

export { TRACKED_FEATURES } from './types'
export type { FunnelConfig, FunnelName } from './funnels'
