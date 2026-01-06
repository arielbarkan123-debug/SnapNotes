/**
 * Metrics Module
 *
 * Multi-Metric Learning Effectiveness System
 * Research targets:
 * - Post-assessment improvement: 68.4 → 82.7
 * - Self-efficacy: Cohen's d = 0.312
 */

// Self-efficacy measurement
export {
  type SelfEfficacySurvey,
  type SelfEfficacyAnalysis,
  SELF_EFFICACY_ITEMS,
  LIKERT_OPTIONS,
  calculateSelfEfficacyScore,
  calculateCohensD,
  interpretCohensD,
  recordSelfEfficacySurvey,
  getSelfEfficacyHistory,
  analyzeSelfEfficacy,
  shouldTriggerSurvey,
} from './self-efficacy'

// Engagement tracking
export {
  type EngagementEvent,
  type EngagementEventType,
  type EngagementMetrics,
  type RetentionMetrics,
  recordEngagementEvent,
  recordEngagementEventsBatch,
  calculateEngagementMetrics,
  calculateRetentionMetrics,
  aggregateLearningEffectiveness,
  generateSessionId,
} from './engagement'
