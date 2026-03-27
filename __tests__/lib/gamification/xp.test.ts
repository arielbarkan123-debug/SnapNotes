/**
 * Tests for lib/gamification/xp.ts
 *
 * Tests calculateLevel, calculateLessonXP, calculateCardReviewXP,
 * calculateStreakXP, calculatePracticeXP, awardXP, formatXP, getXPProgress
 */

import {
  calculateLevel,
  calculateLessonXP,
  calculateCardReviewXP,
  calculateStreakXP,
  calculatePracticeXP,
  awardXP,
  awardCustomXP,
  formatXP,
  getXPProgress,
  getXPForLevel,
  getXPForNextLevel,
  getLevelTitle,
  getLevelColor,
  getLevelGradient,
  getLevelBadge,
  calculateXPInPeriod,
  getXPBreakdown,
  estimateDaysToLevel,
  XP_REWARDS,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  type XPEvent,
} from '@/lib/gamification/xp'

// =============================================================================
// calculateLevel
// =============================================================================

describe('calculateLevel', () => {
  it('should return level 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1)
  })

  it('should return level 1 for negative XP', () => {
    expect(calculateLevel(-100)).toBe(1)
  })

  it('should return level 2 at exactly 100 XP', () => {
    expect(calculateLevel(100)).toBe(2)
  })

  it('should return level 2 at 249 XP (just below level 3)', () => {
    expect(calculateLevel(249)).toBe(2)
  })

  it('should return level 3 at 250 XP', () => {
    expect(calculateLevel(250)).toBe(3)
  })

  it('should return level 10 at 7500 XP', () => {
    expect(calculateLevel(7500)).toBe(10)
  })

  it('should return max level (30) at last threshold', () => {
    expect(calculateLevel(280000)).toBe(30)
  })

  it('should return max level for XP above max threshold', () => {
    expect(calculateLevel(999999)).toBe(30)
  })
})

// =============================================================================
// getXPForLevel / getXPForNextLevel
// =============================================================================

describe('getXPForLevel', () => {
  it('should return 0 for level 1', () => {
    expect(getXPForLevel(1)).toBe(0)
  })

  it('should return 100 for level 2', () => {
    expect(getXPForLevel(2)).toBe(100)
  })

  it('should handle out-of-range levels gracefully', () => {
    expect(getXPForLevel(0)).toBe(0)
    expect(getXPForLevel(50)).toBe(LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1])
  })
})

describe('getXPForNextLevel', () => {
  it('should return 100 for level 1 (next is level 2)', () => {
    expect(getXPForNextLevel(1)).toBe(100)
  })

  it('should return 0 for max level', () => {
    expect(getXPForNextLevel(MAX_LEVEL)).toBe(0)
  })
})

// =============================================================================
// calculateLessonXP
// =============================================================================

describe('calculateLessonXP', () => {
  it('should return base lesson XP for non-perfect accuracy', () => {
    expect(calculateLessonXP(80)).toBe(XP_REWARDS.lesson_complete)
  })

  it('should add perfect bonus for 100% accuracy', () => {
    expect(calculateLessonXP(100)).toBe(XP_REWARDS.lesson_complete + XP_REWARDS.lesson_perfect)
  })

  it('should return base XP for 0% accuracy', () => {
    expect(calculateLessonXP(0)).toBe(XP_REWARDS.lesson_complete)
  })
})

// =============================================================================
// calculateCardReviewXP
// =============================================================================

describe('calculateCardReviewXP', () => {
  it('should return base + easy bonus for rating 4', () => {
    expect(calculateCardReviewXP(4)).toBe(XP_REWARDS.card_reviewed + XP_REWARDS.card_easy)
  })

  it('should return base + good bonus for rating 3', () => {
    expect(calculateCardReviewXP(3)).toBe(XP_REWARDS.card_reviewed + XP_REWARDS.card_good)
  })

  it('should return base + hard bonus (0) for rating 2', () => {
    expect(calculateCardReviewXP(2)).toBe(XP_REWARDS.card_reviewed + XP_REWARDS.card_hard)
  })

  it('should return base only for rating 1 (Again)', () => {
    expect(calculateCardReviewXP(1)).toBe(XP_REWARDS.card_reviewed)
  })
})

// =============================================================================
// calculateStreakXP
// =============================================================================

describe('calculateStreakXP', () => {
  it('should return base streak XP for normal day', () => {
    expect(calculateStreakXP(5)).toBe(XP_REWARDS.streak_maintained)
  })

  it('should add weekly bonus at 7 days', () => {
    expect(calculateStreakXP(7)).toBe(XP_REWARDS.streak_maintained + XP_REWARDS.streak_week)
  })

  it('should add weekly bonus at 14 days', () => {
    expect(calculateStreakXP(14)).toBe(XP_REWARDS.streak_maintained + XP_REWARDS.streak_week)
  })

  it('should add monthly bonus at 30 days', () => {
    expect(calculateStreakXP(30)).toBe(
      XP_REWARDS.streak_maintained + XP_REWARDS.streak_month
    )
  })

  it('should not add weekly or monthly bonus at 0 days', () => {
    expect(calculateStreakXP(0)).toBe(XP_REWARDS.streak_maintained)
  })
})

// =============================================================================
// calculatePracticeXP
// =============================================================================

describe('calculatePracticeXP', () => {
  it('should return base practice XP for non-perfect', () => {
    expect(calculatePracticeXP(80)).toBe(XP_REWARDS.practice_complete)
  })

  it('should add perfect bonus for 100%', () => {
    expect(calculatePracticeXP(100)).toBe(XP_REWARDS.practice_complete + XP_REWARDS.practice_perfect)
  })
})

// =============================================================================
// awardXP
// =============================================================================

describe('awardXP', () => {
  it('should add base reward to current total', () => {
    const result = awardXP(50, 'lesson_complete')
    expect(result.amount).toBe(XP_REWARDS.lesson_complete)
    expect(result.newTotal).toBe(50 + XP_REWARDS.lesson_complete)
  })

  it('should include bonus XP', () => {
    const result = awardXP(50, 'lesson_complete', 10)
    expect(result.amount).toBe(XP_REWARDS.lesson_complete + 10)
  })

  it('should cap bonus XP at 50', () => {
    const result = awardXP(0, 'lesson_complete', 100)
    expect(result.amount).toBe(XP_REWARDS.lesson_complete + 50)
  })

  it('should detect level up', () => {
    // Level 1 -> 2 boundary is at 100 XP
    const result = awardXP(95, 'lesson_complete') // 95 + 10 = 105, crosses 100
    expect(result.leveledUp).toBe(true)
    expect(result.newLevel).toBe(2)
    expect(result.newTitle).toBe('Beginner')
  })

  it('should not report level up when staying at same level', () => {
    const result = awardXP(0, 'card_reviewed')
    expect(result.leveledUp).toBe(false)
    expect(result.newLevel).toBeUndefined()
    expect(result.newTitle).toBeUndefined()
  })
})

// =============================================================================
// awardCustomXP
// =============================================================================

describe('awardCustomXP', () => {
  it('should add custom amount', () => {
    const result = awardCustomXP(50, 75)
    expect(result.amount).toBe(75)
    expect(result.newTotal).toBe(125)
  })

  it('should detect level up', () => {
    const result = awardCustomXP(95, 50)
    expect(result.leveledUp).toBe(true)
    expect(result.newLevel).toBe(2)
  })
})

// =============================================================================
// formatXP
// =============================================================================

describe('formatXP', () => {
  it('should format small numbers with locale string', () => {
    expect(formatXP(500)).toBe('500')
  })

  it('should format thousands with K suffix', () => {
    expect(formatXP(15000)).toBe('15.0K')
  })

  it('should format millions with M suffix', () => {
    expect(formatXP(1500000)).toBe('1.5M')
  })

  it('should format numbers under 10000 with locale', () => {
    // Below 10000 uses toLocaleString
    const result = formatXP(9999)
    expect(result).toBe((9999).toLocaleString())
  })
})

// =============================================================================
// getXPProgress
// =============================================================================

describe('getXPProgress', () => {
  it('should return level 1 progress for 0 XP', () => {
    const progress = getXPProgress(0)
    expect(progress.level).toBe(1)
    expect(progress.title).toBe('Novice')
    expect(progress.currentXP).toBe(0)
    expect(progress.levelStartXP).toBe(0)
    expect(progress.levelEndXP).toBe(100) // Next level threshold
    expect(progress.xpInLevel).toBe(0)
    expect(progress.xpNeeded).toBe(100)
    expect(progress.percent).toBe(0)
    expect(progress.isMaxLevel).toBe(false)
  })

  it('should calculate mid-level progress correctly', () => {
    const progress = getXPProgress(150) // Level 2 (100-250)
    expect(progress.level).toBe(2)
    expect(progress.xpInLevel).toBe(50) // 150 - 100
    expect(progress.xpNeeded).toBe(150) // 250 - 100
    expect(progress.percent).toBe(33) // round(50/150*100)
  })

  it('should return max level progress at max XP', () => {
    const progress = getXPProgress(280000)
    expect(progress.level).toBe(30)
    expect(progress.isMaxLevel).toBe(true)
    expect(progress.percent).toBe(100)
  })
})

// =============================================================================
// getLevelTitle / getLevelColor / getLevelGradient / getLevelBadge
// =============================================================================

describe('getLevelTitle', () => {
  it('should return correct titles', () => {
    expect(getLevelTitle(1)).toBe('Novice')
    expect(getLevelTitle(10)).toBe('Expert')
    expect(getLevelTitle(30)).toBe('Ultimate')
  })
})

describe('getLevelColor', () => {
  it('should return gray for levels 1-4', () => {
    expect(getLevelColor(1)).toBe('text-gray-500')
  })

  it('should return green for levels 5-9', () => {
    expect(getLevelColor(5)).toBe('text-green-500')
  })

  it('should return amber for levels 25+', () => {
    expect(getLevelColor(25)).toBe('text-amber-400')
  })
})

describe('getLevelGradient', () => {
  it('should return correct gradient for level ranges', () => {
    expect(getLevelGradient(1)).toContain('gray')
    expect(getLevelGradient(25)).toContain('amber')
  })
})

describe('getLevelBadge', () => {
  it('should return crown for level 25+', () => {
    expect(getLevelBadge(30)).toContain('\u{1F451}')
  })
})

// =============================================================================
// calculateXPInPeriod
// =============================================================================

describe('calculateXPInPeriod', () => {
  it('should sum XP within the time period', () => {
    const events: XPEvent[] = [
      { type: 'lesson_complete', amount: 10, timestamp: new Date('2026-01-15') },
      { type: 'card_reviewed', amount: 5, timestamp: new Date('2026-01-16') },
      { type: 'course_created', amount: 20, timestamp: new Date('2026-01-20') },
    ]
    const total = calculateXPInPeriod(events, new Date('2026-01-14'), new Date('2026-01-17'))
    expect(total).toBe(15) // 10 + 5
  })
})

// =============================================================================
// estimateDaysToLevel
// =============================================================================

describe('estimateDaysToLevel', () => {
  it('should return null if already at target level', () => {
    expect(estimateDaysToLevel(500, 4, 50)).toBeNull() // Level 4 = 500 XP
  })

  it('should return Infinity for 0 daily rate', () => {
    expect(estimateDaysToLevel(0, 5, 0)).toBe(Infinity)
  })

  it('should calculate days correctly', () => {
    // Level 5 = 1000 XP, current = 0, daily = 100 => 10 days
    expect(estimateDaysToLevel(0, 5, 100)).toBe(10)
  })
})
