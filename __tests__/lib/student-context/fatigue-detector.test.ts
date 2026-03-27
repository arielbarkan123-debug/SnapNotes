/**
 * Tests for lib/student-context/fatigue-detector.ts
 *
 * Tests detectSessionFatigue and computeAccuracyIntervals
 */

import {
  detectSessionFatigue,
  computeAccuracyIntervals,
  type AccuracyInterval,
} from '@/lib/student-context/fatigue-detector'

// =============================================================================
// detectSessionFatigue
// =============================================================================

describe('detectSessionFatigue', () => {
  it('should return no fatigue for fewer than 2 intervals', () => {
    const result = detectSessionFatigue([{ minuteMark: 0, accuracy: 0.9 }])
    expect(result.fatigueDetected).toBe(false)
    expect(result.recommendation).toBe('continue')
    expect(result.accuracyDrop).toBe(0)
    expect(result.fatigueDetectedAtMinute).toBeNull()
  })

  it('should return no fatigue when accuracy stays stable', () => {
    const intervals: AccuracyInterval[] = [
      { minuteMark: 0, accuracy: 0.8 },
      { minuteMark: 5, accuracy: 0.78 },
      { minuteMark: 10, accuracy: 0.75 },
    ]
    const result = detectSessionFatigue(intervals)
    expect(result.fatigueDetected).toBe(false)
    expect(result.recommendation).toBe('continue')
  })

  it('should detect fatigue with take_break for 15%+ drop', () => {
    const intervals: AccuracyInterval[] = [
      { minuteMark: 0, accuracy: 0.9 },
      { minuteMark: 5, accuracy: 0.85 },
      { minuteMark: 10, accuracy: 0.74 }, // 0.9 - 0.74 = 0.16 >= 0.15
    ]
    const result = detectSessionFatigue(intervals)
    expect(result.fatigueDetected).toBe(true)
    expect(result.recommendation).toBe('take_break')
    expect(result.fatigueDetectedAtMinute).toBe(10)
    expect(result.accuracyDrop).toBe(16) // round(0.16 * 100)
  })

  it('should detect fatigue with stop_session for 25%+ drop', () => {
    const intervals: AccuracyInterval[] = [
      { minuteMark: 0, accuracy: 0.9 },
      { minuteMark: 5, accuracy: 0.80 },
      { minuteMark: 10, accuracy: 0.64 }, // 0.9 - 0.64 = 0.26 >= 0.25
    ]
    const result = detectSessionFatigue(intervals)
    expect(result.fatigueDetected).toBe(true)
    expect(result.recommendation).toBe('stop_session')
    expect(result.fatigueDetectedAtMinute).toBe(10)
    expect(result.accuracyDrop).toBe(26)
  })

  it('should detect fatigue at the earliest interval with a significant drop', () => {
    const intervals: AccuracyInterval[] = [
      { minuteMark: 0, accuracy: 0.9 },
      { minuteMark: 5, accuracy: 0.7 }, // 0.9 - 0.7 = 0.20 >= 0.15 (triggers here)
      { minuteMark: 10, accuracy: 0.5 },
    ]
    const result = detectSessionFatigue(intervals)
    expect(result.fatigueDetectedAtMinute).toBe(5)
  })

  it('should handle empty array', () => {
    const result = detectSessionFatigue([])
    expect(result.fatigueDetected).toBe(false)
    expect(result.recommendation).toBe('continue')
  })

  it('should not detect fatigue when accuracy improves', () => {
    const intervals: AccuracyInterval[] = [
      { minuteMark: 0, accuracy: 0.6 },
      { minuteMark: 5, accuracy: 0.7 },
      { minuteMark: 10, accuracy: 0.8 },
    ]
    const result = detectSessionFatigue(intervals)
    expect(result.fatigueDetected).toBe(false)
  })
})

// =============================================================================
// computeAccuracyIntervals
// =============================================================================

describe('computeAccuracyIntervals', () => {
  it('should return empty array for empty steps', () => {
    const result = computeAccuracyIntervals([], '2026-01-01T10:00:00Z')
    expect(result).toHaveLength(0)
  })

  it('should group steps into intervals and compute accuracy', () => {
    const sessionStart = '2026-01-01T10:00:00Z'
    const steps = [
      { was_correct: true, created_at: '2026-01-01T10:01:00Z' },  // minute 1 → interval 0
      { was_correct: true, created_at: '2026-01-01T10:02:00Z' },  // minute 2 → interval 0
      { was_correct: false, created_at: '2026-01-01T10:03:00Z' }, // minute 3 → interval 0
      { was_correct: true, created_at: '2026-01-01T10:06:00Z' },  // minute 6 → interval 5
      { was_correct: false, created_at: '2026-01-01T10:07:00Z' }, // minute 7 → interval 5
    ]
    const result = computeAccuracyIntervals(steps, sessionStart, 5)
    expect(result).toHaveLength(2)

    // First interval (0-5min): 2 correct, 1 wrong => accuracy = 2/3
    expect(result[0].minuteMark).toBe(0)
    expect(result[0].accuracy).toBeCloseTo(2 / 3, 5)

    // Second interval (5-10min): 1 correct, 1 wrong => accuracy = 0.5
    expect(result[1].minuteMark).toBe(5)
    expect(result[1].accuracy).toBe(0.5)
  })

  it('should sort intervals by time', () => {
    const sessionStart = '2026-01-01T10:00:00Z'
    const steps = [
      { was_correct: true, created_at: '2026-01-01T10:12:00Z' },
      { was_correct: true, created_at: '2026-01-01T10:01:00Z' },
    ]
    const result = computeAccuracyIntervals(steps, sessionStart, 5)
    expect(result[0].minuteMark).toBeLessThan(result[1].minuteMark)
  })
})
