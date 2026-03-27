/**
 * Tests for lib/gamification/streak.ts
 *
 * Tests checkAndUpdateStreak, getStreakStatus, wouldStreakBreak,
 * date utilities, milestones, streak freeze.
 */

import {
  checkAndUpdateStreak,
  getStreakStatus,
  wouldStreakBreak,
  getTodayDateString,
  getYesterdayDateString,
  parseDateString,
  getHoursUntilMidnight,
  daysBetween,
  getReachedMilestone,
  getNextMilestone,
  getAchievedMilestones,
  getMilestoneProgress,
  getStreakFlames,
  getStreakColor,
  getStreakMessage,
  canUseStreakFreeze,
  useStreakFreeze,
  createDefaultStreakData,
  prepareStreakUpdate,
  STREAK_MILESTONES,
  type StreakData,
} from '@/lib/gamification/streak'

// =============================================================================
// Helpers
// =============================================================================

function makeStreakData(overrides: Partial<StreakData> = {}): StreakData {
  return {
    userId: 'user-1',
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    streakFreezes: 1,
    lastFreezeUsed: null,
    ...overrides,
  }
}

// =============================================================================
// Date utilities
// =============================================================================

describe('date utilities', () => {
  it('getTodayDateString should return a YYYY-MM-DD string', () => {
    const today = getTodayDateString()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('getYesterdayDateString should return a YYYY-MM-DD string', () => {
    const yesterday = getYesterdayDateString()
    expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('parseDateString should parse to midnight UTC', () => {
    const date = parseDateString('2026-01-15')
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(0) // January
    expect(date.getUTCDate()).toBe(15)
    expect(date.getUTCHours()).toBe(0)
  })

  it('daysBetween should calculate correct difference', () => {
    expect(daysBetween('2026-01-01', '2026-01-10')).toBe(9)
    expect(daysBetween('2026-01-10', '2026-01-01')).toBe(9) // absolute
  })

  it('getHoursUntilMidnight should return a non-negative number', () => {
    const hours = getHoursUntilMidnight()
    expect(hours).toBeGreaterThanOrEqual(0)
    expect(hours).toBeLessThanOrEqual(24)
  })
})

// =============================================================================
// checkAndUpdateStreak
// =============================================================================

describe('checkAndUpdateStreak', () => {
  it('should start new streak on first activity', () => {
    const data = makeStreakData({ lastActivityDate: null })
    const result = checkAndUpdateStreak(data)
    expect(result.currentStreak).toBe(1)
    expect(result.streakStarted).toBe(true)
    expect(result.xpEarned).toBe(5) // STREAK_MAINTAIN_XP
  })

  it('should maintain streak when already active today', () => {
    const today = getTodayDateString()
    const data = makeStreakData({
      currentStreak: 5,
      longestStreak: 5,
      lastActivityDate: today,
    })
    const result = checkAndUpdateStreak(data)
    expect(result.currentStreak).toBe(5) // no change
    expect(result.streakMaintained).toBe(true)
    expect(result.xpEarned).toBe(0)
  })

  it('should increment streak when last activity was yesterday', () => {
    const yesterday = getYesterdayDateString()
    const data = makeStreakData({
      currentStreak: 3,
      longestStreak: 5,
      lastActivityDate: yesterday,
    })
    const result = checkAndUpdateStreak(data)
    expect(result.currentStreak).toBe(4)
    expect(result.streakMaintained).toBe(true)
    expect(result.xpEarned).toBe(5)
  })

  it('should break streak when last activity was > 1 day ago', () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 3)
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(twoDaysAgo)

    const data = makeStreakData({
      currentStreak: 10,
      longestStreak: 15,
      lastActivityDate: dateStr,
    })
    const result = checkAndUpdateStreak(data)
    expect(result.currentStreak).toBe(1) // reset to 1
    expect(result.streakBroken).toBe(true)
    expect(result.streakStarted).toBe(true)
    expect(result.xpEarned).toBe(5)
  })

  it('should update longest streak when current exceeds it', () => {
    const yesterday = getYesterdayDateString()
    const data = makeStreakData({
      currentStreak: 5,
      longestStreak: 5,
      lastActivityDate: yesterday,
    })
    const result = checkAndUpdateStreak(data)
    expect(result.currentStreak).toBe(6)
    expect(result.longestStreak).toBe(6) // updated
  })

  it('should award milestone bonus at day 7', () => {
    const yesterday = getYesterdayDateString()
    const data = makeStreakData({
      currentStreak: 6,
      longestStreak: 6,
      lastActivityDate: yesterday,
    })
    const result = checkAndUpdateStreak(data)
    expect(result.currentStreak).toBe(7)
    // STREAK_MAINTAIN_XP (5) + milestone bonus (25)
    expect(result.xpEarned).toBe(5 + 25)
  })
})

// =============================================================================
// getStreakStatus
// =============================================================================

describe('getStreakStatus', () => {
  it('should show activeToday when last activity is today', () => {
    const today = getTodayDateString()
    const data = makeStreakData({
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: today,
    })
    const status = getStreakStatus(data)
    expect(status.activeToday).toBe(true)
    expect(status.isAtRisk).toBe(false)
    expect(status.current).toBe(5)
    expect(status.longest).toBe(10)
  })

  it('should show at risk when last activity was yesterday and not active today', () => {
    const yesterday = getYesterdayDateString()
    const data = makeStreakData({
      currentStreak: 5,
      lastActivityDate: yesterday,
    })
    const status = getStreakStatus(data)
    expect(status.isAtRisk).toBe(true)
    expect(status.activeToday).toBe(false)
    expect(status.hoursRemaining).toBeGreaterThan(0)
  })

  it('should calculate next milestone', () => {
    const today = getTodayDateString()
    const data = makeStreakData({
      currentStreak: 5,
      lastActivityDate: today,
    })
    const status = getStreakStatus(data)
    expect(status.nextMilestone).toBe(7)
    expect(status.daysToMilestone).toBe(2)
  })

  it('should return null milestone when all milestones achieved', () => {
    const today = getTodayDateString()
    const data = makeStreakData({
      currentStreak: 400,
      lastActivityDate: today,
    })
    const status = getStreakStatus(data)
    expect(status.nextMilestone).toBeNull()
    expect(status.daysToMilestone).toBe(0)
  })
})

// =============================================================================
// wouldStreakBreak
// =============================================================================

describe('wouldStreakBreak', () => {
  it('should return false if no streak to break', () => {
    const data = makeStreakData({ lastActivityDate: null })
    expect(wouldStreakBreak(data)).toBe(false)
  })

  it('should return false if already active today', () => {
    const today = getTodayDateString()
    const data = makeStreakData({ lastActivityDate: today })
    expect(wouldStreakBreak(data)).toBe(false)
  })

  it('should return false if last activity was yesterday (still can save it)', () => {
    const yesterday = getYesterdayDateString()
    const data = makeStreakData({ lastActivityDate: yesterday })
    expect(wouldStreakBreak(data)).toBe(false)
  })

  it('should return true if last activity was 2+ days ago', () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(threeDaysAgo)
    const data = makeStreakData({ lastActivityDate: dateStr })
    expect(wouldStreakBreak(data)).toBe(true)
  })
})

// =============================================================================
// Milestones
// =============================================================================

describe('milestones', () => {
  it('getReachedMilestone should return milestone for exact match', () => {
    const milestone = getReachedMilestone(7)
    expect(milestone).not.toBeNull()
    expect(milestone!.days).toBe(7)
    expect(milestone!.label).toBe('Week Warrior')
  })

  it('getReachedMilestone should return null for non-milestone days', () => {
    expect(getReachedMilestone(5)).toBeNull()
    expect(getReachedMilestone(10)).toBeNull()
  })

  it('getNextMilestone should return next upcoming milestone', () => {
    const next = getNextMilestone(5)
    expect(next).not.toBeNull()
    expect(next!.days).toBe(7)
  })

  it('getNextMilestone should return null if all achieved', () => {
    expect(getNextMilestone(365)).toBeNull()
    expect(getNextMilestone(999)).toBeNull()
  })

  it('getAchievedMilestones should return all milestones <= streak', () => {
    const achieved = getAchievedMilestones(14)
    expect(achieved.map(m => m.days)).toEqual([3, 7, 14])
  })

  it('getMilestoneProgress should calculate progress toward next milestone', () => {
    const progress = getMilestoneProgress(5)
    // Previous milestone: 3 (days=3), Next: 7
    // current = 5 - 3 = 2, target = 7 - 3 = 4, percent = 50
    expect(progress.current).toBe(2)
    expect(progress.target).toBe(4)
    expect(progress.percent).toBe(50)
    expect(progress.milestone!.days).toBe(7)
  })

  it('getMilestoneProgress should return 100% when all milestones achieved', () => {
    const progress = getMilestoneProgress(400)
    expect(progress.percent).toBe(100)
    expect(progress.milestone).toBeNull()
  })
})

// =============================================================================
// Display helpers
// =============================================================================

describe('display helpers', () => {
  it('getStreakFlames should return appropriate flame counts', () => {
    expect(getStreakFlames(0)).toBe('')
    expect(getStreakFlames(3)).toContain('\u{1F525}')
    expect(getStreakFlames(7).length).toBeGreaterThan(getStreakFlames(3).length)
  })

  it('getStreakColor should return correct colors', () => {
    expect(getStreakColor(0)).toContain('gray')
    expect(getStreakColor(5)).toContain('orange')
    expect(getStreakColor(50)).toContain('red')
  })
})

// =============================================================================
// Streak freeze
// =============================================================================

describe('streak freeze', () => {
  it('canUseStreakFreeze should return false with 0 freezes', () => {
    const data = makeStreakData({ streakFreezes: 0 })
    expect(canUseStreakFreeze(data)).toBe(false)
  })

  it('canUseStreakFreeze should return true with freezes available and no recent use', () => {
    const data = makeStreakData({ streakFreezes: 1, lastFreezeUsed: null })
    expect(canUseStreakFreeze(data)).toBe(true)
  })

  it('canUseStreakFreeze should return false if freeze used within 7 days', () => {
    const recentDate = getTodayDateString()
    const data = makeStreakData({
      streakFreezes: 1,
      lastFreezeUsed: recentDate,
    })
    expect(canUseStreakFreeze(data)).toBe(false)
  })

  it('useStreakFreeze should return updated data on success', () => {
    const data = makeStreakData({ streakFreezes: 2, lastFreezeUsed: null })
    const result = useStreakFreeze(data)
    expect(result).not.toBeNull()
    expect(result!.streakFreezes).toBe(1)
    expect(result!.lastFreezeUsed).toBe(getTodayDateString())
    expect(result!.lastActivityDate).toBe(getTodayDateString())
  })

  it('useStreakFreeze should return null when freeze unavailable', () => {
    const data = makeStreakData({ streakFreezes: 0 })
    expect(useStreakFreeze(data)).toBeNull()
  })
})

// =============================================================================
// Database helpers
// =============================================================================

describe('createDefaultStreakData', () => {
  it('should create default streak data', () => {
    const data = createDefaultStreakData('user-123')
    expect(data.userId).toBe('user-123')
    expect(data.currentStreak).toBe(0)
    expect(data.longestStreak).toBe(0)
    expect(data.lastActivityDate).toBeNull()
    expect(data.streakFreezes).toBe(1)
  })
})

describe('prepareStreakUpdate', () => {
  it('should format result for database update', () => {
    const result = {
      currentStreak: 5,
      longestStreak: 10,
      streakMaintained: true,
      streakBroken: false,
      streakStarted: false,
      xpEarned: 5,
    }
    const update = prepareStreakUpdate(result)
    expect(update.current_streak).toBe(5)
    expect(update.longest_streak).toBe(10)
    expect(update.last_activity_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
