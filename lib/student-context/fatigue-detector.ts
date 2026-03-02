/**
 * Session Fatigue Detector
 *
 * Detects when a student's accuracy drops significantly during a study session,
 * indicating mental fatigue. Uses accuracy-per-interval data to recommend
 * breaks or session termination.
 */

// =============================================================================
// Types
// =============================================================================

export interface FatigueSignal {
  fatigueDetected: boolean
  fatigueDetectedAtMinute: number | null
  accuracyDrop: number
  recommendation: 'continue' | 'take_break' | 'stop_session'
}

export interface AccuracyInterval {
  minuteMark: number
  accuracy: number
}

// =============================================================================
// Fatigue Detection
// =============================================================================

/**
 * Analyze accuracy over time intervals to detect fatigue.
 *
 * A 15%+ drop from session-start accuracy triggers a "take_break" signal.
 * A 25%+ drop triggers a "stop_session" signal.
 */
export function detectSessionFatigue(
  accuracyPerInterval: AccuracyInterval[]
): FatigueSignal {
  if (accuracyPerInterval.length < 2) {
    return {
      fatigueDetected: false,
      fatigueDetectedAtMinute: null,
      accuracyDrop: 0,
      recommendation: 'continue',
    }
  }

  const startAccuracy = accuracyPerInterval[0].accuracy

  for (const interval of accuracyPerInterval) {
    const drop = startAccuracy - interval.accuracy

    if (drop >= 0.15) {
      return {
        fatigueDetected: true,
        fatigueDetectedAtMinute: interval.minuteMark,
        accuracyDrop: Math.round(drop * 100),
        recommendation: drop >= 0.25 ? 'stop_session' : 'take_break',
      }
    }
  }

  return {
    fatigueDetected: false,
    fatigueDetectedAtMinute: null,
    accuracyDrop: 0,
    recommendation: 'continue',
  }
}

// =============================================================================
// Accuracy Interval Computation
// =============================================================================

/**
 * Given a list of steps (each with correctness + timestamp), group them into
 * time intervals and compute accuracy for each interval.
 *
 * @param steps     Individual step results with `was_correct` and `created_at`
 * @param sessionStartedAt  ISO timestamp of session start
 * @param intervalMinutes   Width of each interval (default: 5 minutes)
 */
export function computeAccuracyIntervals(
  steps: { was_correct: boolean; created_at: string }[],
  sessionStartedAt: string,
  intervalMinutes: number = 5
): AccuracyInterval[] {
  if (steps.length === 0) return []

  const startTime = new Date(sessionStartedAt).getTime()
  const intervalMap = new Map<number, { correct: number; total: number }>()

  for (const step of steps) {
    const elapsed = (new Date(step.created_at).getTime() - startTime) / 60000
    const intervalIndex = Math.floor(elapsed / intervalMinutes)
    const minuteMark = intervalIndex * intervalMinutes

    const interval = intervalMap.get(minuteMark) || { correct: 0, total: 0 }
    interval.total++
    if (step.was_correct) interval.correct++
    intervalMap.set(minuteMark, interval)
  }

  return Array.from(intervalMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([minuteMark, data]) => ({
      minuteMark,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
    }))
}
