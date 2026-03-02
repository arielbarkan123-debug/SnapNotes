/**
 * FSRS Parameter Optimizer
 *
 * Runs per-user FSRS weight optimization after sufficient review data.
 * Analyzes a user's actual review history to tune FSRS parameters
 * (retention target, initial stability weights) for better scheduling.
 *
 * Optimization is lightweight and heuristic-based:
 * - Adjusts requestRetention toward actual retention rate
 * - Tunes initial stability weights (w[0], w[1]) based on new-card performance
 * - Stores optimized params in user_learning_profile.fsrs_params
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { FSRS_PARAMS } from './fsrs'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum number of review log entries before optimization is meaningful */
const MIN_REVIEWS_FOR_OPTIMIZATION = 50

/** Maximum review logs to fetch for analysis (keeps query bounded) */
const MAX_LOGS_FOR_ANALYSIS = 1000

// ---------------------------------------------------------------------------
// Type for the FSRS params shape (matches FSRS_PARAMS structure)
// ---------------------------------------------------------------------------

export type FSRSParamsConfig = typeof FSRS_PARAMS

// ---------------------------------------------------------------------------
// shouldOptimize — check whether a user has enough data
// ---------------------------------------------------------------------------

/**
 * Check whether a user has accumulated enough review data to benefit
 * from parameter optimization.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @returns Whether optimization should run and the current review count
 */
export async function shouldOptimize(
  supabase: SupabaseClient,
  userId: string
): Promise<{ should: boolean; reviewCount: number }> {
  const { count } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return {
    should: (count || 0) >= MIN_REVIEWS_FOR_OPTIMIZATION,
    reviewCount: count || 0,
  }
}

// ---------------------------------------------------------------------------
// getUserFSRSParams — load per-user params (or fall back to defaults)
// ---------------------------------------------------------------------------

/**
 * Load the user's personalized FSRS parameters from user_learning_profile.
 * Falls back to the global FSRS_PARAMS defaults if no custom params exist.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @returns FSRS parameters for this user
 */
export async function getUserFSRSParams(
  supabase: SupabaseClient,
  userId: string
): Promise<FSRSParamsConfig> {
  const { data } = await supabase
    .from('user_learning_profile')
    .select('fsrs_params')
    .eq('user_id', userId)
    .maybeSingle()

  if (data?.fsrs_params && data.fsrs_params.w) {
    return {
      ...FSRS_PARAMS,
      ...data.fsrs_params,
    }
  }

  return FSRS_PARAMS
}

// ---------------------------------------------------------------------------
// optimizeFSRSParams — run the actual optimization
// ---------------------------------------------------------------------------

/**
 * Analyze a user's review history and compute optimized FSRS parameters.
 *
 * The optimization is intentionally conservative:
 * 1. **Retention target**: Blends actual retention rate toward the current
 *    target (50% weight) and clamps to [0.80, 0.95].
 * 2. **Initial stability weights (w[0], w[1])**: Scaled up if new-card
 *    retention is high (> 0.8) or down if low (< 0.6).
 *
 * Results are persisted to user_learning_profile.fsrs_params so subsequent
 * reviews use the tuned parameters automatically.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @returns Optimization result with flag, optional params, and review count
 */
export async function optimizeFSRSParams(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  optimized: boolean
  params?: FSRSParamsConfig
  reviewCount: number
}> {
  const { data: logs, count } = await supabase
    .from('review_logs')
    .select('rating, elapsed_days, stability_before, difficulty_before', {
      count: 'exact',
    })
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: true })
    .limit(MAX_LOGS_FOR_ANALYSIS)

  if (!logs || (count || 0) < MIN_REVIEWS_FOR_OPTIMIZATION) {
    return { optimized: false, reviewCount: count || 0 }
  }

  // --- Build structured review data ---

  const reviewLogs = logs.map((log) => ({
    rating: log.rating as number,
    elapsed_days: (log.elapsed_days as number) || 0,
    stability: (log.stability_before as number) || 1,
    difficulty: (log.difficulty_before as number) || 0.3,
    // A rating of 2+ (Hard, Good, Easy) counts as successful recall
    actual_retention: (log.rating as number) >= 2 ? 1 : 0,
  }))

  // --- Compute actual retention rate ---

  const actualRetentionRate =
    reviewLogs.reduce((sum, r) => sum + r.actual_retention, 0) /
    reviewLogs.length

  // Blend toward actual retention (conservative: 50% weight), clamped [0.80, 0.95]
  const optimizedRetention = Math.min(
    0.95,
    Math.max(
      0.8,
      FSRS_PARAMS.requestRetention +
        (actualRetentionRate - FSRS_PARAMS.requestRetention) * 0.5
    )
  )

  // --- Tune initial stability weights based on new-card performance ---

  const newCardLogs = reviewLogs.filter((l) => l.stability <= 1)
  const newCardRetention =
    newCardLogs.length > 0
      ? newCardLogs.reduce((sum, r) => sum + r.actual_retention, 0) /
        newCardLogs.length
      : 0.5

  // Copy default weights and adjust w[0], w[1] based on new-card success
  const w = [...FSRS_PARAMS.w]
  const stabilityMultiplier =
    newCardRetention > 0.8 ? 1.2 : newCardRetention < 0.6 ? 0.8 : 1.0
  w[0] = FSRS_PARAMS.w[0] * stabilityMultiplier
  w[1] = FSRS_PARAMS.w[1] * stabilityMultiplier

  // --- Assemble optimized params ---

  const optimizedParams: FSRSParamsConfig = {
    ...FSRS_PARAMS,
    w,
    requestRetention: Number(optimizedRetention.toFixed(3)),
  }

  // --- Persist to user_learning_profile ---

  const { error: updateError } = await supabase
    .from('user_learning_profile')
    .update({
      fsrs_params: {
        ...optimizedParams,
        lastOptimizedAt: new Date().toISOString(),
        reviewCount: count,
      },
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('[fsrs-optimizer] Failed to persist params:', updateError.message)
    return { optimized: false, reviewCount: count || 0 }
  }

  return {
    optimized: true,
    params: optimizedParams,
    reviewCount: count || 0,
  }
}
