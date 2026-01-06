/**
 * Dynamic Profile Refinement Engine (RLPA-Style)
 *
 * Continuously refines user profile based on learning signals using
 * Exponential Moving Average (EMA) algorithms.
 *
 * Research target: Self-efficacy improvement Cohen's d = 0.312
 */

import { createClient } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

export interface RefinementState {
  userId: string

  // Tier 1: Rolling metrics (updated frequently)
  rollingAccuracy: number
  rollingResponseTimeMs: number
  estimatedAbility: number
  confidenceCalibration: number
  currentDifficultyTarget: number

  // Tier 2: Session metrics (updated per session)
  inferredOptimalSessionMinutes: number
  inferredPeakHour: number | null
  inferredSpeedPreference: 'fast' | 'moderate' | 'slow'

  // Confidence scores
  accuracyConfidence: number
  sessionLengthConfidence: number
  peakHourConfidence: number
  difficultyConfidence: number
  speedConfidence: number

  // Counters
  totalQuestionsAnalyzed: number
  totalSessionsAnalyzed: number
  totalSelfAssessments: number

  // Timestamps
  lastAccuracyUpdate: Date | null
  lastSessionUpdate: Date | null
  lastPeriodicUpdate: Date | null
  updatedAt: Date
}

export interface QuestionSignal {
  wasCorrect: boolean
  timeMs: number
  usedHint: boolean
  questionDifficulty: number
  conceptId?: string
}

export interface SessionSignal {
  durationMinutes: number
  questionsAnswered: number
  accuracy: number
  startHour: number
}

export interface SelfAssessmentSignal {
  selfConfidence: number // 1-4
  actualAccuracy: number // 0-100
  perceivedDifficulty: 'too_easy' | 'just_right' | 'too_hard'
}

export type RefinementSignal =
  | { type: 'question_answered'; data: QuestionSignal }
  | { type: 'session_ended'; data: SessionSignal }
  | { type: 'self_assessment'; data: SelfAssessmentSignal }

export interface RefinementUpdate {
  attribute: string
  oldValue: number | string | null
  newValue: number | string
  confidence: number
  reason: string
}

// =============================================================================
// EMA Configuration
// =============================================================================

/**
 * Alpha values for Exponential Moving Average
 * Higher alpha = more responsive to recent changes
 * Lower alpha = more stable, gradual changes
 */
export const EMA_ALPHA = {
  // Tier 1: High-frequency updates
  rolling: 0.1, // Accuracy, response time, ability
  difficulty: 0.1, // Difficulty target

  // Tier 2: Session-level updates
  session: 0.05, // Session length, peak hour

  // Tier 3: Preference updates
  preference: 0.03, // Speed preference, learning style

  // Confidence updates
  confidence: 0.08,
} as const

/**
 * Minimum thresholds before updating (noise reduction)
 */
export const UPDATE_THRESHOLDS = {
  accuracyChange: 0.05, // 5% change minimum
  responseTimeChange: 500, // 500ms change minimum
  difficultyChange: 0.2, // 0.2 level change minimum
  sessionLengthChange: 2, // 2 minute change minimum
}

/**
 * Rate limiting: minimum time between updates (in seconds)
 */
export const RATE_LIMITS = {
  accuracy: 60, // 1 minute between accuracy updates
  session: 300, // 5 minutes between session updates
  preference: 3600, // 1 hour between preference updates
}

// =============================================================================
// Core EMA Functions
// =============================================================================

/**
 * Apply Exponential Moving Average update
 */
export function applyEMA(
  currentValue: number,
  observedValue: number,
  alpha: number
): number {
  return alpha * observedValue + (1 - alpha) * currentValue
}

/**
 * Calculate confidence score based on data points
 * More data points = higher confidence
 */
export function calculateConfidence(dataPoints: number, minDataPoints: number = 10): number {
  if (dataPoints <= 0) return 0
  // Sigmoid-like curve that reaches ~0.9 at minDataPoints and ~0.99 at 5x minDataPoints
  const normalizedPoints = dataPoints / minDataPoints
  return Math.min(1, 1 - 1 / (1 + normalizedPoints))
}

/**
 * Check if enough time has passed since last update (rate limiting)
 */
export function canUpdate(
  lastUpdate: Date | null,
  rateLimitSeconds: number
): boolean {
  if (!lastUpdate) return true
  const timeSinceUpdate = (Date.now() - lastUpdate.getTime()) / 1000
  return timeSinceUpdate >= rateLimitSeconds
}

// =============================================================================
// Signal Processors
// =============================================================================

/**
 * Process a question answer signal and return updates
 */
export function processQuestionSignal(
  currentState: RefinementState,
  signal: QuestionSignal
): Partial<RefinementState> {
  const updates: Partial<RefinementState> = {}

  // Update rolling accuracy
  const accuracyValue = signal.wasCorrect ? 1 : 0
  const newAccuracy = applyEMA(
    currentState.rollingAccuracy,
    accuracyValue,
    EMA_ALPHA.rolling
  )
  updates.rollingAccuracy = Number(newAccuracy.toFixed(3))

  // Update rolling response time
  const newResponseTime = Math.round(
    applyEMA(
      currentState.rollingResponseTimeMs || signal.timeMs,
      signal.timeMs,
      EMA_ALPHA.rolling
    )
  )
  updates.rollingResponseTimeMs = newResponseTime

  // Update estimated ability (IRT-inspired)
  // If correct on hard question, increase ability more
  // If wrong on easy question, decrease ability more
  const abilityDelta = signal.wasCorrect
    ? 0.1 * (signal.questionDifficulty / 3) // Harder questions = more ability gain
    : -0.1 * ((6 - signal.questionDifficulty) / 3) // Easier questions = more ability loss
  const adjustedAbility = Math.max(
    1,
    Math.min(5, currentState.estimatedAbility + abilityDelta)
  )
  updates.estimatedAbility = Number(
    applyEMA(currentState.estimatedAbility, adjustedAbility, EMA_ALPHA.rolling).toFixed(2)
  )

  // Update difficulty target based on performance
  if (signal.wasCorrect && !signal.usedHint) {
    // Correct without hint - can handle harder content
    updates.currentDifficultyTarget = Number(
      Math.min(
        5,
        applyEMA(currentState.currentDifficultyTarget, currentState.currentDifficultyTarget + 0.1, EMA_ALPHA.difficulty)
      ).toFixed(2)
    )
  } else if (!signal.wasCorrect) {
    // Wrong - decrease difficulty target
    updates.currentDifficultyTarget = Number(
      Math.max(
        1,
        applyEMA(currentState.currentDifficultyTarget, currentState.currentDifficultyTarget - 0.1, EMA_ALPHA.difficulty)
      ).toFixed(2)
    )
  }

  // Update speed preference based on response time
  let inferredSpeed: 'fast' | 'moderate' | 'slow' = 'moderate'
  if (newResponseTime < 5000) inferredSpeed = 'fast'
  else if (newResponseTime > 15000) inferredSpeed = 'slow'

  // Only update if consistently different (requires multiple signals)
  if (inferredSpeed !== currentState.inferredSpeedPreference) {
    // Increase confidence toward new speed preference
    const speedConfidence = currentState.speedConfidence + 0.1
    if (speedConfidence > 0.7) {
      updates.inferredSpeedPreference = inferredSpeed
      updates.speedConfidence = 0.5 // Reset confidence after change
    } else {
      updates.speedConfidence = speedConfidence
    }
  }

  // Update counters and confidence
  updates.totalQuestionsAnalyzed = currentState.totalQuestionsAnalyzed + 1
  updates.accuracyConfidence = Number(
    calculateConfidence(updates.totalQuestionsAnalyzed).toFixed(2)
  )
  updates.difficultyConfidence = Number(
    calculateConfidence(updates.totalQuestionsAnalyzed, 20).toFixed(2)
  )

  updates.lastAccuracyUpdate = new Date()
  updates.updatedAt = new Date()

  return updates
}

/**
 * Process a session ended signal and return updates
 */
export function processSessionSignal(
  currentState: RefinementState,
  signal: SessionSignal
): Partial<RefinementState> {
  const updates: Partial<RefinementState> = {}

  // Update inferred optimal session length
  // Weight by questions answered (longer productive sessions are more informative)
  if (signal.questionsAnswered >= 3) {
    // Only count sessions with meaningful activity
    const currentOptimal = currentState.inferredOptimalSessionMinutes || 15
    const newOptimal = applyEMA(currentOptimal, signal.durationMinutes, EMA_ALPHA.session)
    // Bound between 5 and 60 minutes
    updates.inferredOptimalSessionMinutes = Math.round(
      Math.max(5, Math.min(60, newOptimal))
    )
    updates.sessionLengthConfidence = Number(
      calculateConfidence(currentState.totalSessionsAnalyzed + 1, 5).toFixed(2)
    )
  }

  // Update peak performance hour
  // Track when user has high accuracy sessions
  if (signal.accuracy >= 0.7 && signal.questionsAnswered >= 5) {
    // Good session - this might be a good time for user
    if (currentState.inferredPeakHour === null) {
      updates.inferredPeakHour = signal.startHour
    } else {
      // Average toward this hour (circular average)
      const currentHour = currentState.inferredPeakHour
      const newHour = signal.startHour
      // Simple approach: weighted average (can improve with circular statistics)
      const weightedHour = applyEMA(currentHour, newHour, EMA_ALPHA.session)
      updates.inferredPeakHour = Math.round(weightedHour) % 24
    }
    updates.peakHourConfidence = Number(
      calculateConfidence(currentState.totalSessionsAnalyzed + 1, 10).toFixed(2)
    )
  }

  // Update counters
  updates.totalSessionsAnalyzed = currentState.totalSessionsAnalyzed + 1
  updates.lastSessionUpdate = new Date()
  updates.updatedAt = new Date()

  return updates
}

/**
 * Process self-assessment signal for confidence calibration
 */
export function processSelfAssessmentSignal(
  currentState: RefinementState,
  signal: SelfAssessmentSignal
): Partial<RefinementState> {
  const updates: Partial<RefinementState> = {}

  // Calculate calibration: how well does self-confidence match actual performance?
  // selfConfidence: 1-4 (map to 0-1: 0.25, 0.5, 0.75, 1.0)
  // actualAccuracy: 0-100 (map to 0-1)
  const normalizedConfidence = signal.selfConfidence / 4
  const normalizedAccuracy = signal.actualAccuracy / 100

  // Positive = overconfident, Negative = underconfident
  const calibrationDelta = normalizedConfidence - normalizedAccuracy

  // Apply EMA to calibration
  const newCalibration = applyEMA(
    currentState.confidenceCalibration,
    calibrationDelta,
    EMA_ALPHA.preference
  )
  // Bound between -1 and 1
  updates.confidenceCalibration = Number(
    Math.max(-1, Math.min(1, newCalibration)).toFixed(3)
  )

  // Adjust difficulty based on perceived difficulty vs actual
  if (signal.perceivedDifficulty === 'too_easy' && signal.actualAccuracy > 80) {
    // User found it easy AND performed well - increase difficulty
    updates.currentDifficultyTarget = Number(
      Math.min(5, currentState.currentDifficultyTarget + 0.15).toFixed(2)
    )
  } else if (signal.perceivedDifficulty === 'too_hard' && signal.actualAccuracy < 60) {
    // User found it hard AND struggled - decrease difficulty
    updates.currentDifficultyTarget = Number(
      Math.max(1, currentState.currentDifficultyTarget - 0.15).toFixed(2)
    )
  }

  // Update counters
  updates.totalSelfAssessments = currentState.totalSelfAssessments + 1
  updates.updatedAt = new Date()

  return updates
}

// =============================================================================
// Main Processing Function
// =============================================================================

/**
 * Process a learning signal and update the refinement state
 */
export async function processLearningSignal(
  userId: string,
  signal: RefinementSignal
): Promise<RefinementUpdate[]> {
  const supabase = createClient()
  const updates: RefinementUpdate[] = []

  try {
    // Get current refinement state
    let currentState = await getRefinementState(userId)

    // If no state exists, initialize it
    if (!currentState) {
      await initializeRefinementState(userId)
      currentState = await getRefinementState(userId)
      if (!currentState) {
        throw new Error('Failed to initialize refinement state')
      }
    }

    // Process signal based on type
    let stateUpdates: Partial<RefinementState> = {}

    switch (signal.type) {
      case 'question_answered':
        // Check rate limit
        if (!canUpdate(currentState.lastAccuracyUpdate, RATE_LIMITS.accuracy)) {
          return []
        }
        stateUpdates = processQuestionSignal(currentState, signal.data)
        break

      case 'session_ended':
        if (!canUpdate(currentState.lastSessionUpdate, RATE_LIMITS.session)) {
          return []
        }
        stateUpdates = processSessionSignal(currentState, signal.data)
        break

      case 'self_assessment':
        stateUpdates = processSelfAssessmentSignal(currentState, signal.data)
        break
    }

    // Apply updates to database
    if (Object.keys(stateUpdates).length > 0) {
      // Convert camelCase to snake_case for database
      const dbUpdates: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(stateUpdates)) {
        const snakeKey = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
        dbUpdates[snakeKey] = value
      }

      const { error } = await supabase
        .from('profile_refinement_state')
        .update(dbUpdates)
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to update refinement state:', error)
        throw error
      }

      // Build update log
      for (const [key, newValue] of Object.entries(stateUpdates)) {
        const oldValue = currentState[key as keyof RefinementState]
        if (oldValue !== newValue) {
          updates.push({
            attribute: key,
            oldValue: oldValue as number | string | null,
            newValue: newValue as number | string,
            confidence: (stateUpdates as Record<string, number>)[`${key}Confidence`] || 0.5,
            reason: `Updated from ${signal.type} signal`,
          })
        }
      }
    }

    return updates
  } catch (error) {
    console.error('Error processing learning signal:', error)
    return []
  }
}

// =============================================================================
// State Management Functions
// =============================================================================

/**
 * Get current refinement state for a user
 */
export async function getRefinementState(
  userId: string
): Promise<RefinementState | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profile_refinement_state')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  // Convert snake_case to camelCase
  return {
    userId: data.user_id,
    rollingAccuracy: Number(data.rolling_accuracy),
    rollingResponseTimeMs: data.rolling_response_time_ms,
    estimatedAbility: Number(data.estimated_ability),
    confidenceCalibration: Number(data.confidence_calibration),
    currentDifficultyTarget: Number(data.current_difficulty_target),
    inferredOptimalSessionMinutes: data.inferred_optimal_session_minutes,
    inferredPeakHour: data.inferred_peak_hour,
    inferredSpeedPreference: data.inferred_speed_preference,
    accuracyConfidence: Number(data.accuracy_confidence),
    sessionLengthConfidence: Number(data.session_length_confidence),
    peakHourConfidence: Number(data.peak_hour_confidence),
    difficultyConfidence: Number(data.difficulty_confidence),
    speedConfidence: Number(data.speed_confidence),
    totalQuestionsAnalyzed: data.total_questions_analyzed,
    totalSessionsAnalyzed: data.total_sessions_analyzed,
    totalSelfAssessments: data.total_self_assessments,
    lastAccuracyUpdate: data.last_accuracy_update ? new Date(data.last_accuracy_update) : null,
    lastSessionUpdate: data.last_session_update ? new Date(data.last_session_update) : null,
    lastPeriodicUpdate: data.last_periodic_update ? new Date(data.last_periodic_update) : null,
    updatedAt: new Date(data.updated_at),
  }
}

/**
 * Initialize refinement state for a new user
 */
export async function initializeRefinementState(userId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('profile_refinement_state')
    .insert({ user_id: userId })
    .single()

  if (error && !error.message.includes('duplicate')) {
    console.error('Failed to initialize refinement state:', error)
    throw error
  }
}

/**
 * Create a profile snapshot for history/rollback
 */
export async function createProfileSnapshot(
  userId: string,
  snapshotType: 'automatic' | 'user_edit' | 'rollback' | 'milestone',
  triggerReason: string
): Promise<void> {
  const supabase = createClient()

  // Get current profile
  const { data: profile } = await supabase
    .from('user_learning_profile')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Get current refinement state
  const refinementState = await getRefinementState(userId)

  // Insert snapshot
  await supabase.from('profile_history').insert({
    user_id: userId,
    snapshot_type: snapshotType,
    profile_snapshot: profile || {},
    refinement_state_snapshot: refinementState || {},
    trigger_reason: triggerReason,
  })
}

/**
 * Rollback profile to a previous snapshot
 */
export async function rollbackProfile(
  userId: string,
  snapshotId: string
): Promise<boolean> {
  const supabase = createClient()

  // Get the snapshot
  const { data: snapshot, error: snapshotError } = await supabase
    .from('profile_history')
    .select('*')
    .eq('id', snapshotId)
    .eq('user_id', userId)
    .single()

  if (snapshotError || !snapshot) {
    console.error('Snapshot not found:', snapshotError)
    return false
  }

  // Create a snapshot before rollback
  await createProfileSnapshot(userId, 'rollback', `Rollback to snapshot ${snapshotId}`)

  // Restore profile
  if (snapshot.profile_snapshot) {
    const { error: profileError } = await supabase
      .from('user_learning_profile')
      .update(snapshot.profile_snapshot)
      .eq('user_id', userId)

    if (profileError) {
      console.error('Failed to restore profile:', profileError)
      return false
    }
  }

  // Restore refinement state
  if (snapshot.refinement_state_snapshot) {
    const { error: stateError } = await supabase
      .from('profile_refinement_state')
      .update(snapshot.refinement_state_snapshot)
      .eq('user_id', userId)

    if (stateError) {
      console.error('Failed to restore refinement state:', stateError)
      return false
    }
  }

  return true
}

/**
 * Get profile history for a user
 */
export async function getProfileHistory(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: string
  snapshotType: string
  triggerReason: string
  createdAt: Date
}>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profile_history')
    .select('id, snapshot_type, trigger_reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map((item) => ({
    id: item.id,
    snapshotType: item.snapshot_type,
    triggerReason: item.trigger_reason,
    createdAt: new Date(item.created_at),
  }))
}
