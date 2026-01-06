/**
 * Profile Synchronization Module
 *
 * Synchronizes refinement state to user_learning_profile with stability checks.
 * Respects user-locked attributes and provides effective profile calculation.
 */

import { createClient } from '@/lib/supabase/client'
import { type RefinementState, createProfileSnapshot } from './refinement-engine'
import { getAgeGroupConfig, type AgeGroupConfig } from '@/lib/learning/age-config'

// =============================================================================
// Types
// =============================================================================

export interface UserLearningProfile {
  userId: string
  educationLevel: string
  studyGoal: string
  preferredStudyTime: string
  learningStyles: string[]
  avgSessionLength: number
  optimalSessionLength: number
  peakPerformanceHour: number | null
  speedPreference: string
  overallAccuracy: number
  accuracyTrend: string
  difficultyPreference: string
  strongSubjects: string[]
  weakSubjects: string[]
  userLockedAttributes: string[]
  attributeSources: Record<string, 'user' | 'system'>
}

export interface EffectiveProfile {
  // Base profile
  educationLevel: string
  studyGoal: string

  // Effective values (from refinement or profile)
  optimalSessionLength: number
  peakPerformanceHour: number | null
  speedPreference: string
  difficultyPreference: string
  currentDifficultyTarget: number
  estimatedAbility: number

  // Confidence scores (how reliable are these values)
  sessionLengthConfidence: number
  peakHourConfidence: number
  difficultyConfidence: number

  // Age configuration
  ageConfig: AgeGroupConfig

  // Source tracking
  sources: {
    optimalSessionLength: 'user' | 'system' | 'refinement'
    peakPerformanceHour: 'user' | 'system' | 'refinement'
    speedPreference: 'user' | 'system' | 'refinement'
    difficultyPreference: 'user' | 'system' | 'refinement'
  }
}

export interface SyncResult {
  success: boolean
  updatedAttributes: string[]
  skippedAttributes: string[]
  error?: string
}

// =============================================================================
// Sync Configuration
// =============================================================================

/**
 * Minimum confidence required to sync refinement to profile
 */
const MIN_CONFIDENCE_FOR_SYNC = 0.6

/**
 * Attributes that can be synced from refinement to profile
 */
const SYNCABLE_ATTRIBUTES = [
  'optimal_session_length',
  'peak_performance_hour',
  'speed_preference',
  'difficulty_preference',
] as const

// =============================================================================
// Profile Fetching
// =============================================================================

/**
 * Get user learning profile from database
 */
export async function getUserProfile(
  userId: string
): Promise<UserLearningProfile | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_learning_profile')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    userId: data.user_id,
    educationLevel: data.education_level || 'high_school',
    studyGoal: data.study_goal || 'general_learning',
    preferredStudyTime: data.preferred_study_time || 'varies',
    learningStyles: data.learning_styles || [],
    avgSessionLength: data.avg_session_length || 15,
    optimalSessionLength: data.optimal_session_length || 15,
    peakPerformanceHour: data.peak_performance_hour,
    speedPreference: data.speed_preference || 'moderate',
    overallAccuracy: Number(data.overall_accuracy) || 0.5,
    accuracyTrend: data.accuracy_trend || 'stable',
    difficultyPreference: data.difficulty_preference || 'moderate',
    strongSubjects: data.strong_subjects || [],
    weakSubjects: data.weak_subjects || [],
    userLockedAttributes: data.user_locked_attributes || [],
    attributeSources: data.attribute_sources || {},
  }
}

// =============================================================================
// Effective Profile Calculation
// =============================================================================

/**
 * Calculate effective profile by merging user settings with refinement state
 *
 * Priority order:
 * 1. User-locked attributes (always from profile)
 * 2. High-confidence refinement values
 * 3. Profile values
 * 4. Defaults from age config
 */
export function calculateEffectiveProfile(
  profile: UserLearningProfile,
  refinementState: RefinementState | null
): EffectiveProfile {
  const ageConfig = getAgeGroupConfig(profile.educationLevel)

  // Initialize with profile values
  const effective: EffectiveProfile = {
    educationLevel: profile.educationLevel,
    studyGoal: profile.studyGoal,
    optimalSessionLength: profile.optimalSessionLength || ageConfig.lessonLength.optimal,
    peakPerformanceHour: profile.peakPerformanceHour,
    speedPreference: profile.speedPreference || 'moderate',
    difficultyPreference: profile.difficultyPreference || 'moderate',
    currentDifficultyTarget: 3.0,
    estimatedAbility: 2.5,
    sessionLengthConfidence: 0,
    peakHourConfidence: 0,
    difficultyConfidence: 0,
    ageConfig,
    sources: {
      optimalSessionLength: profile.attributeSources.optimal_session_length || 'system',
      peakPerformanceHour: profile.attributeSources.peak_performance_hour || 'system',
      speedPreference: profile.attributeSources.speed_preference || 'system',
      difficultyPreference: profile.attributeSources.difficulty_preference || 'system',
    },
  }

  // If no refinement state, return profile-based effective
  if (!refinementState) {
    return effective
  }

  // Apply refinement values for non-locked attributes with sufficient confidence
  const lockedSet = new Set(profile.userLockedAttributes)

  // Optimal session length
  if (
    !lockedSet.has('optimal_session_length') &&
    refinementState.sessionLengthConfidence >= MIN_CONFIDENCE_FOR_SYNC
  ) {
    effective.optimalSessionLength = refinementState.inferredOptimalSessionMinutes
    effective.sources.optimalSessionLength = 'refinement'
  }
  effective.sessionLengthConfidence = refinementState.sessionLengthConfidence

  // Peak performance hour
  if (
    !lockedSet.has('peak_performance_hour') &&
    refinementState.peakHourConfidence >= MIN_CONFIDENCE_FOR_SYNC &&
    refinementState.inferredPeakHour !== null
  ) {
    effective.peakPerformanceHour = refinementState.inferredPeakHour
    effective.sources.peakPerformanceHour = 'refinement'
  }
  effective.peakHourConfidence = refinementState.peakHourConfidence

  // Speed preference
  if (
    !lockedSet.has('speed_preference') &&
    refinementState.speedConfidence >= MIN_CONFIDENCE_FOR_SYNC
  ) {
    effective.speedPreference = refinementState.inferredSpeedPreference
    effective.sources.speedPreference = 'refinement'
  }

  // Difficulty preference (map target to preference)
  if (
    !lockedSet.has('difficulty_preference') &&
    refinementState.difficultyConfidence >= MIN_CONFIDENCE_FOR_SYNC
  ) {
    effective.difficultyPreference = mapDifficultyTargetToPreference(
      refinementState.currentDifficultyTarget
    )
    effective.sources.difficultyPreference = 'refinement'
  }
  effective.difficultyConfidence = refinementState.difficultyConfidence

  // Always use refinement values for dynamic metrics
  effective.currentDifficultyTarget = refinementState.currentDifficultyTarget
  effective.estimatedAbility = refinementState.estimatedAbility

  return effective
}

/**
 * Map difficulty target (1-5) to preference string
 */
function mapDifficultyTargetToPreference(target: number): string {
  if (target < 2.5) return 'easy'
  if (target < 3.5) return 'moderate'
  return 'challenging'
}

// =============================================================================
// Profile Synchronization
// =============================================================================

/**
 * Sync refinement state to user_learning_profile
 *
 * Only updates attributes that:
 * 1. Are not locked by user
 * 2. Have sufficient confidence
 * 3. Have changed significantly
 */
export async function syncRefinementToProfile(
  userId: string,
  refinementState: RefinementState,
  options: {
    force?: boolean
    respectLocks?: boolean
  } = {}
): Promise<SyncResult> {
  const { force = false, respectLocks = true } = options

  const supabase = createClient()
  const updatedAttributes: string[] = []
  const skippedAttributes: string[] = []

  try {
    // Get current profile
    const profile = await getUserProfile(userId)
    if (!profile) {
      return {
        success: false,
        updatedAttributes: [],
        skippedAttributes: [],
        error: 'Profile not found',
      }
    }

    const lockedSet = new Set(profile.userLockedAttributes)
    const updates: Record<string, unknown> = {}
    const sourceUpdates: Record<string, string> = { ...profile.attributeSources }

    // Check each syncable attribute
    for (const attr of SYNCABLE_ATTRIBUTES) {
      // Skip locked attributes unless force is true
      if (respectLocks && lockedSet.has(attr)) {
        skippedAttributes.push(attr)
        continue
      }

      const { shouldSync, value, confidence: _confidence } = getSyncValueForAttribute(
        attr,
        refinementState,
        profile,
        force
      )

      if (shouldSync && value !== undefined) {
        updates[attr] = value
        sourceUpdates[attr] = 'system'
        updatedAttributes.push(attr)
      } else {
        skippedAttributes.push(attr)
      }
    }

    // If no updates needed, return early
    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        updatedAttributes: [],
        skippedAttributes,
      }
    }

    // Create snapshot before updating
    await createProfileSnapshot(userId, 'automatic', 'Refinement sync')

    // Apply updates
    updates.attribute_sources = sourceUpdates
    updates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('user_learning_profile')
      .update(updates)
      .eq('user_id', userId)

    if (error) {
      return {
        success: false,
        updatedAttributes: [],
        skippedAttributes,
        error: error.message,
      }
    }

    return {
      success: true,
      updatedAttributes,
      skippedAttributes,
    }
  } catch (error) {
    return {
      success: false,
      updatedAttributes: [],
      skippedAttributes,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get sync value for a specific attribute
 */
function getSyncValueForAttribute(
  attr: (typeof SYNCABLE_ATTRIBUTES)[number],
  refinementState: RefinementState,
  profile: UserLearningProfile,
  force: boolean
): {
  shouldSync: boolean
  value: unknown
  confidence: number
} {
  switch (attr) {
    case 'optimal_session_length':
      return {
        shouldSync:
          force || refinementState.sessionLengthConfidence >= MIN_CONFIDENCE_FOR_SYNC,
        value: refinementState.inferredOptimalSessionMinutes,
        confidence: refinementState.sessionLengthConfidence,
      }

    case 'peak_performance_hour':
      return {
        shouldSync:
          (force || refinementState.peakHourConfidence >= MIN_CONFIDENCE_FOR_SYNC) &&
          refinementState.inferredPeakHour !== null,
        value: refinementState.inferredPeakHour,
        confidence: refinementState.peakHourConfidence,
      }

    case 'speed_preference':
      return {
        shouldSync:
          force || refinementState.speedConfidence >= MIN_CONFIDENCE_FOR_SYNC,
        value: refinementState.inferredSpeedPreference,
        confidence: refinementState.speedConfidence,
      }

    case 'difficulty_preference':
      return {
        shouldSync:
          force || refinementState.difficultyConfidence >= MIN_CONFIDENCE_FOR_SYNC,
        value: mapDifficultyTargetToPreference(refinementState.currentDifficultyTarget),
        confidence: refinementState.difficultyConfidence,
      }

    default:
      return { shouldSync: false, value: undefined, confidence: 0 }
  }
}

// =============================================================================
// Attribute Locking
// =============================================================================

/**
 * Lock an attribute to prevent automatic updates
 */
export async function lockAttribute(
  userId: string,
  attribute: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current locked attributes
  const { data: profile } = await supabase
    .from('user_learning_profile')
    .select('user_locked_attributes')
    .eq('user_id', userId)
    .single()

  const currentLocked = profile?.user_locked_attributes || []

  // Add if not already locked
  if (!currentLocked.includes(attribute)) {
    const { error } = await supabase
      .from('user_learning_profile')
      .update({ user_locked_attributes: [...currentLocked, attribute] })
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to lock attribute:', error)
      return false
    }
  }

  return true
}

/**
 * Unlock an attribute to allow automatic updates
 */
export async function unlockAttribute(
  userId: string,
  attribute: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current locked attributes
  const { data: profile } = await supabase
    .from('user_learning_profile')
    .select('user_locked_attributes')
    .eq('user_id', userId)
    .single()

  const currentLocked = profile?.user_locked_attributes || []

  // Remove if present
  const newLocked = currentLocked.filter((a: string) => a !== attribute)

  const { error } = await supabase
    .from('user_learning_profile')
    .update({ user_locked_attributes: newLocked })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to unlock attribute:', error)
    return false
  }

  return true
}

/**
 * Get list of locked attributes for a user
 */
export async function getLockedAttributes(userId: string): Promise<string[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('user_learning_profile')
    .select('user_locked_attributes')
    .eq('user_id', userId)
    .single()

  return data?.user_locked_attributes || []
}
