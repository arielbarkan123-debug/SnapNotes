/**
 * Tests for lib/gamification/achievements.ts
 *
 * Tests lookups, streak checks, learning achievements, mastery achievements,
 * re-trigger prevention, progress calculation.
 */

import {
  ACHIEVEMENTS,
  getAchievement,
  getAchievementsByCategory,
  getStreakAchievements,
  getLearningAchievements,
  getMasteryAchievements,
  checkStreakAchievements,
  checkLearningAchievements,
  checkMasteryAchievements,
  checkAllAchievements,
  getAchievementProgress,
  getAllAchievementProgress,
  getNextAchievements,
  calculateTotalAchievementXP,
  getAchievementSummary,
  prepareAchievementInsert,
  getAchievementMessage,
  getAchievementColor,
  type StreakStats,
  type LearningStats,
  type MasteryStats,
} from '@/lib/gamification/achievements'

// =============================================================================
// Lookups
// =============================================================================

describe('Achievement lookups', () => {
  it('should find achievement by code', () => {
    const achievement = getAchievement('streak_7')
    expect(achievement).not.toBeNull()
    expect(achievement!.name).toBe('Week Warrior')
    expect(achievement!.category).toBe('streak')
  })

  it('should return null for unknown code', () => {
    expect(getAchievement('nonexistent')).toBeNull()
  })

  it('should get achievements by category', () => {
    const streakAchievements = getAchievementsByCategory('streak')
    expect(streakAchievements.length).toBeGreaterThan(0)
    streakAchievements.forEach(a => expect(a.category).toBe('streak'))
  })

  it('should return correct category-specific helpers', () => {
    expect(getStreakAchievements().length).toBeGreaterThan(0)
    expect(getLearningAchievements().length).toBeGreaterThan(0)
    expect(getMasteryAchievements().length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Streak achievement checks
// =============================================================================

describe('checkStreakAchievements', () => {
  it('should earn streak_3 when current streak is 3', () => {
    const stats: StreakStats = { currentStreak: 3, longestStreak: 3 }
    const earned = checkStreakAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'streak_3')).toBe(true)
  })

  it('should use longest streak for historical achievements', () => {
    const stats: StreakStats = { currentStreak: 1, longestStreak: 30 }
    const earned = checkStreakAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'streak_30')).toBe(true)
  })

  it('should not re-trigger already earned achievements', () => {
    const stats: StreakStats = { currentStreak: 10, longestStreak: 10 }
    const earnedCodes = new Set(['streak_3', 'streak_7'])
    const earned = checkStreakAchievements(stats, earnedCodes)
    expect(earned.some(a => a.code === 'streak_3')).toBe(false)
    expect(earned.some(a => a.code === 'streak_7')).toBe(false)
  })

  it('should not earn streak achievements with 0 streak', () => {
    const stats: StreakStats = { currentStreak: 0, longestStreak: 0 }
    const earned = checkStreakAchievements(stats, new Set())
    expect(earned).toHaveLength(0)
  })
})

// =============================================================================
// Learning achievement checks
// =============================================================================

describe('checkLearningAchievements', () => {
  it('should earn first_lesson when 1 lesson completed', () => {
    const stats: LearningStats = {
      totalLessonsCompleted: 1,
      totalCoursesCompleted: 0,
      totalCardsReviewed: 0,
      totalQuestionsAnswered: 0,
    }
    const earned = checkLearningAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'first_lesson')).toBe(true)
  })

  it('should earn card achievements at thresholds', () => {
    const stats: LearningStats = {
      totalLessonsCompleted: 0,
      totalCoursesCompleted: 0,
      totalCardsReviewed: 500,
      totalQuestionsAnswered: 0,
    }
    const earned = checkLearningAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'cards_100')).toBe(true)
    expect(earned.some(a => a.code === 'cards_500')).toBe(true)
    expect(earned.some(a => a.code === 'cards_1000')).toBe(false)
  })

  it('should earn course achievements at thresholds', () => {
    const stats: LearningStats = {
      totalLessonsCompleted: 0,
      totalCoursesCompleted: 5,
      totalCardsReviewed: 0,
      totalQuestionsAnswered: 0,
    }
    const earned = checkLearningAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'first_course')).toBe(true)
    expect(earned.some(a => a.code === 'courses_5')).toBe(true)
  })
})

// =============================================================================
// Mastery achievement checks
// =============================================================================

describe('checkMasteryAchievements', () => {
  it('should earn perfect achievements at thresholds', () => {
    const stats: MasteryStats = {
      perfectLessons: 5,
      currentLevel: 1,
      totalXP: 0,
      coursesWithFullMastery: 0,
    }
    const earned = checkMasteryAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'perfect_1')).toBe(true)
    expect(earned.some(a => a.code === 'perfect_5')).toBe(true)
    expect(earned.some(a => a.code === 'perfect_10')).toBe(false)
  })

  it('should earn level achievements at thresholds', () => {
    const stats: MasteryStats = {
      perfectLessons: 0,
      currentLevel: 10,
      totalXP: 0,
      coursesWithFullMastery: 0,
    }
    const earned = checkMasteryAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'level_5')).toBe(true)
    expect(earned.some(a => a.code === 'level_10')).toBe(true)
    expect(earned.some(a => a.code === 'level_15')).toBe(false)
  })

  it('should earn mastery achievements for course mastery', () => {
    const stats: MasteryStats = {
      perfectLessons: 0,
      currentLevel: 1,
      totalXP: 0,
      coursesWithFullMastery: 1,
    }
    const earned = checkMasteryAchievements(stats, new Set())
    expect(earned.some(a => a.code === 'mastery_1')).toBe(true)
  })
})

// =============================================================================
// checkAllAchievements
// =============================================================================

describe('checkAllAchievements', () => {
  it('should combine achievements from all categories', () => {
    const streakStats: StreakStats = { currentStreak: 7, longestStreak: 7 }
    const learningStats: LearningStats = {
      totalLessonsCompleted: 10,
      totalCoursesCompleted: 1,
      totalCardsReviewed: 100,
      totalQuestionsAnswered: 50,
    }
    const masteryStats: MasteryStats = {
      perfectLessons: 1,
      currentLevel: 5,
      totalXP: 1000,
      coursesWithFullMastery: 0,
    }
    const earned = checkAllAchievements(streakStats, learningStats, masteryStats, new Set())
    // Should include streak, learning, and mastery achievements
    const categories = new Set(earned.map(a => a.category))
    expect(categories.has('streak')).toBe(true)
    expect(categories.has('learning')).toBe(true)
    expect(categories.has('mastery')).toBe(true)
  })
})

// =============================================================================
// Progress calculation
// =============================================================================

describe('getAchievementProgress', () => {
  it('should calculate streak progress correctly', () => {
    const achievement = getAchievement('streak_7')!
    const progress = getAchievementProgress(achievement, {
      streak: { currentStreak: 3, longestStreak: 5 },
    })
    expect(progress.current).toBe(5) // max(3, 5)
    expect(progress.target).toBe(7)
    expect(progress.percent).toBe(71) // round(5/7 * 100)
  })

  it('should calculate learning progress correctly', () => {
    const achievement = getAchievement('lessons_10')!
    const progress = getAchievementProgress(achievement, {
      learning: {
        totalLessonsCompleted: 6,
        totalCoursesCompleted: 0,
        totalCardsReviewed: 0,
        totalQuestionsAnswered: 0,
      },
    })
    expect(progress.current).toBe(6)
    expect(progress.target).toBe(10)
    expect(progress.percent).toBe(60)
  })

  it('should return 0 current when no stats provided', () => {
    const achievement = getAchievement('streak_7')!
    const progress = getAchievementProgress(achievement, {})
    expect(progress.current).toBe(0)
  })
})

describe('calculateTotalAchievementXP', () => {
  it('should sum XP from all earned achievements', () => {
    const earnedCodes = new Set(['streak_3', 'first_lesson'])
    const total = calculateTotalAchievementXP(earnedCodes)
    // streak_3 = 25 XP, first_lesson = 15 XP
    expect(total).toBe(40)
  })

  it('should return 0 for no earned achievements', () => {
    expect(calculateTotalAchievementXP(new Set())).toBe(0)
  })
})

describe('getAchievementSummary', () => {
  it('should calculate summary stats correctly', () => {
    const earnedCodes = new Set(['streak_3', 'streak_7'])
    const summary = getAchievementSummary(earnedCodes)
    expect(summary.earned).toBe(2)
    expect(summary.earnedXP).toBe(25 + 50)
    expect(summary.byCategory.streak.earned).toBe(2)
  })
})

describe('getAchievementMessage', () => {
  it('should format message with emoji, name, and XP', () => {
    const achievement = getAchievement('streak_7')!
    const message = getAchievementMessage(achievement)
    expect(message).toContain('Week Warrior')
    expect(message).toContain('50 XP')
  })
})

describe('getAchievementColor', () => {
  it('should return correct color for each category', () => {
    expect(getAchievementColor('streak')).toBe('text-orange-500')
    expect(getAchievementColor('learning')).toBe('text-blue-500')
    expect(getAchievementColor('mastery')).toBe('text-purple-500')
  })
})
