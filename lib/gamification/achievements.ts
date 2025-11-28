/**
 * Achievement System
 *
 * Tracks and awards achievements for various learning milestones.
 * Achievements are categorized into: Streak, Learning, and Mastery.
 */

// ============================================
// TYPES
// ============================================

export type AchievementCategory = 'streak' | 'learning' | 'mastery'

export interface Achievement {
  code: string
  name: string
  description: string
  category: AchievementCategory
  emoji: string
  xpReward: number
  /** Condition value (e.g., streak days, card count) */
  threshold: number
  /** Whether this is a hidden achievement (revealed on earn) */
  hidden?: boolean
}

export interface AchievementWithStatus extends Achievement {
  earned: boolean
  earnedAt: Date | null
}

export interface AchievementProgress {
  achievement: Achievement
  current: number
  target: number
  percent: number
}

export interface EarnedAchievement {
  id: string
  user_id: string
  achievement_code: string
  earned_at: string
  xp_awarded: number
}

export interface AchievementCheckResult {
  newlyEarned: Achievement[]
  totalXPAwarded: number
}

// Stats interfaces for checking achievements
export interface StreakStats {
  currentStreak: number
  longestStreak: number
}

export interface LearningStats {
  totalLessonsCompleted: number
  totalCoursesCompleted: number
  totalCardsReviewed: number
  totalQuestionsAnswered: number
}

export interface MasteryStats {
  perfectLessons: number // Lessons with 100% accuracy
  currentLevel: number
  totalXP: number
  coursesWithFullMastery: number
}

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

export const ACHIEVEMENTS: Achievement[] = [
  // ----------------------------------------
  // STREAK ACHIEVEMENTS
  // ----------------------------------------
  {
    code: 'streak_3',
    name: 'Getting Started',
    description: 'Maintain a 3-day learning streak',
    category: 'streak',
    emoji: '🔥',
    xpReward: 25,
    threshold: 3,
  },
  {
    code: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    category: 'streak',
    emoji: '⚡',
    xpReward: 50,
    threshold: 7,
  },
  {
    code: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day learning streak',
    category: 'streak',
    emoji: '💪',
    xpReward: 100,
    threshold: 14,
  },
  {
    code: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day learning streak',
    category: 'streak',
    emoji: '🏆',
    xpReward: 200,
    threshold: 30,
  },
  {
    code: 'streak_60',
    name: 'Two Month Titan',
    description: 'Maintain a 60-day learning streak',
    category: 'streak',
    emoji: '👑',
    xpReward: 400,
    threshold: 60,
  },
  {
    code: 'streak_90',
    name: 'Quarter Champion',
    description: 'Maintain a 90-day learning streak',
    category: 'streak',
    emoji: '💎',
    xpReward: 600,
    threshold: 90,
  },
  {
    code: 'streak_180',
    name: 'Half Year Hero',
    description: 'Maintain a 180-day learning streak',
    category: 'streak',
    emoji: '🌟',
    xpReward: 1000,
    threshold: 180,
  },
  {
    code: 'streak_365',
    name: 'Year of Learning',
    description: 'Maintain a 365-day learning streak',
    category: 'streak',
    emoji: '🎓',
    xpReward: 2000,
    threshold: 365,
    hidden: true,
  },

  // ----------------------------------------
  // LEARNING ACHIEVEMENTS
  // ----------------------------------------
  {
    code: 'first_lesson',
    name: 'First Steps',
    description: 'Complete your first lesson',
    category: 'learning',
    emoji: '📚',
    xpReward: 15,
    threshold: 1,
  },
  {
    code: 'lessons_10',
    name: 'Eager Learner',
    description: 'Complete 10 lessons',
    category: 'learning',
    emoji: '📖',
    xpReward: 50,
    threshold: 10,
  },
  {
    code: 'lessons_50',
    name: 'Dedicated Student',
    description: 'Complete 50 lessons',
    category: 'learning',
    emoji: '🎯',
    xpReward: 150,
    threshold: 50,
  },
  {
    code: 'lessons_100',
    name: 'Century Scholar',
    description: 'Complete 100 lessons',
    category: 'learning',
    emoji: '💯',
    xpReward: 300,
    threshold: 100,
  },
  {
    code: 'first_course',
    name: 'Course Conqueror',
    description: 'Complete your first course',
    category: 'learning',
    emoji: '🎉',
    xpReward: 50,
    threshold: 1,
  },
  {
    code: 'courses_5',
    name: 'Knowledge Seeker',
    description: 'Complete 5 courses',
    category: 'learning',
    emoji: '🔍',
    xpReward: 200,
    threshold: 5,
  },
  {
    code: 'courses_10',
    name: 'Course Master',
    description: 'Complete 10 courses',
    category: 'learning',
    emoji: '🏅',
    xpReward: 500,
    threshold: 10,
  },
  {
    code: 'cards_100',
    name: 'Card Collector',
    description: 'Review 100 flashcards',
    category: 'learning',
    emoji: '🃏',
    xpReward: 50,
    threshold: 100,
  },
  {
    code: 'cards_500',
    name: 'Card Enthusiast',
    description: 'Review 500 flashcards',
    category: 'learning',
    emoji: '🎴',
    xpReward: 150,
    threshold: 500,
  },
  {
    code: 'cards_1000',
    name: 'Card Champion',
    description: 'Review 1,000 flashcards',
    category: 'learning',
    emoji: '🀄',
    xpReward: 300,
    threshold: 1000,
  },
  {
    code: 'cards_5000',
    name: 'Card Legend',
    description: 'Review 5,000 flashcards',
    category: 'learning',
    emoji: '🌠',
    xpReward: 1000,
    threshold: 5000,
    hidden: true,
  },

  // ----------------------------------------
  // MASTERY ACHIEVEMENTS
  // ----------------------------------------
  {
    code: 'perfect_1',
    name: 'Perfect Start',
    description: 'Complete a lesson with 100% accuracy',
    category: 'mastery',
    emoji: '✨',
    xpReward: 20,
    threshold: 1,
  },
  {
    code: 'perfect_5',
    name: 'Precision Learner',
    description: 'Complete 5 lessons with 100% accuracy',
    category: 'mastery',
    emoji: '🎯',
    xpReward: 75,
    threshold: 5,
  },
  {
    code: 'perfect_10',
    name: 'Flawless Mind',
    description: 'Complete 10 lessons with 100% accuracy',
    category: 'mastery',
    emoji: '💫',
    xpReward: 150,
    threshold: 10,
  },
  {
    code: 'perfect_25',
    name: 'Perfectionist',
    description: 'Complete 25 lessons with 100% accuracy',
    category: 'mastery',
    emoji: '🌟',
    xpReward: 400,
    threshold: 25,
  },
  {
    code: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    category: 'mastery',
    emoji: '⭐',
    xpReward: 100,
    threshold: 5,
  },
  {
    code: 'level_10',
    name: 'Shining Bright',
    description: 'Reach level 10',
    category: 'mastery',
    emoji: '🌟',
    xpReward: 250,
    threshold: 10,
  },
  {
    code: 'level_15',
    name: 'Enlightened',
    description: 'Reach level 15',
    category: 'mastery',
    emoji: '💫',
    xpReward: 500,
    threshold: 15,
  },
  {
    code: 'level_20',
    name: 'Legendary',
    description: 'Reach level 20',
    category: 'mastery',
    emoji: '👑',
    xpReward: 1000,
    threshold: 20,
  },
  {
    code: 'level_25',
    name: 'Mythical',
    description: 'Reach level 25',
    category: 'mastery',
    emoji: '💎',
    xpReward: 2000,
    threshold: 25,
    hidden: true,
  },
  {
    code: 'level_30',
    name: 'Ultimate',
    description: 'Reach the maximum level',
    category: 'mastery',
    emoji: '🎓',
    xpReward: 5000,
    threshold: 30,
    hidden: true,
  },
  {
    code: 'mastery_1',
    name: 'First Mastery',
    description: 'Achieve full mastery on a course',
    category: 'mastery',
    emoji: '🏆',
    xpReward: 100,
    threshold: 1,
  },
  {
    code: 'mastery_5',
    name: 'Multi-Master',
    description: 'Achieve full mastery on 5 courses',
    category: 'mastery',
    emoji: '🏅',
    xpReward: 500,
    threshold: 5,
  },
]

// ============================================
// LOOKUP HELPERS
// ============================================

/**
 * Get achievement by code
 */
export function getAchievement(code: string): Achievement | null {
  return ACHIEVEMENTS.find((a) => a.code === code) || null
}

/**
 * Get all achievements in a category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category)
}

/**
 * Get streak achievements
 */
export function getStreakAchievements(): Achievement[] {
  return getAchievementsByCategory('streak')
}

/**
 * Get learning achievements
 */
export function getLearningAchievements(): Achievement[] {
  return getAchievementsByCategory('learning')
}

/**
 * Get mastery achievements
 */
export function getMasteryAchievements(): Achievement[] {
  return getAchievementsByCategory('mastery')
}

// ============================================
// ACHIEVEMENT CHECKING FUNCTIONS
// ============================================

/**
 * Check which streak achievements should be earned
 *
 * @param stats - Current streak statistics
 * @param earnedCodes - Set of already earned achievement codes
 * @returns Array of newly earned achievements
 */
export function checkStreakAchievements(
  stats: StreakStats,
  earnedCodes: Set<string>
): Achievement[] {
  const earned: Achievement[] = []
  const streakAchievements = getStreakAchievements()

  // Check against longest streak (so achievements persist even if current breaks)
  const maxStreak = Math.max(stats.currentStreak, stats.longestStreak)

  for (const achievement of streakAchievements) {
    if (!earnedCodes.has(achievement.code) && maxStreak >= achievement.threshold) {
      earned.push(achievement)
    }
  }

  return earned
}

/**
 * Check which learning achievements should be earned
 *
 * @param stats - Current learning statistics
 * @param earnedCodes - Set of already earned achievement codes
 * @returns Array of newly earned achievements
 */
export function checkLearningAchievements(
  stats: LearningStats,
  earnedCodes: Set<string>
): Achievement[] {
  const earned: Achievement[] = []
  const learningAchievements = getLearningAchievements()

  for (const achievement of learningAchievements) {
    if (earnedCodes.has(achievement.code)) continue

    let meetsThreshold = false

    // Check based on achievement code prefix
    if (achievement.code.startsWith('first_lesson') || achievement.code.startsWith('lessons_')) {
      meetsThreshold = stats.totalLessonsCompleted >= achievement.threshold
    } else if (
      achievement.code.startsWith('first_course') ||
      achievement.code.startsWith('courses_')
    ) {
      meetsThreshold = stats.totalCoursesCompleted >= achievement.threshold
    } else if (achievement.code.startsWith('cards_')) {
      meetsThreshold = stats.totalCardsReviewed >= achievement.threshold
    }

    if (meetsThreshold) {
      earned.push(achievement)
    }
  }

  return earned
}

/**
 * Check which mastery achievements should be earned
 *
 * @param stats - Current mastery statistics
 * @param earnedCodes - Set of already earned achievement codes
 * @returns Array of newly earned achievements
 */
export function checkMasteryAchievements(
  stats: MasteryStats,
  earnedCodes: Set<string>
): Achievement[] {
  const earned: Achievement[] = []
  const masteryAchievements = getMasteryAchievements()

  for (const achievement of masteryAchievements) {
    if (earnedCodes.has(achievement.code)) continue

    let meetsThreshold = false

    // Check based on achievement code prefix
    if (achievement.code.startsWith('perfect_')) {
      meetsThreshold = stats.perfectLessons >= achievement.threshold
    } else if (achievement.code.startsWith('level_')) {
      meetsThreshold = stats.currentLevel >= achievement.threshold
    } else if (achievement.code.startsWith('mastery_')) {
      meetsThreshold = stats.coursesWithFullMastery >= achievement.threshold
    }

    if (meetsThreshold) {
      earned.push(achievement)
    }
  }

  return earned
}

/**
 * Check all achievements and return newly earned ones
 *
 * @param streakStats - Streak statistics
 * @param learningStats - Learning statistics
 * @param masteryStats - Mastery statistics
 * @param earnedCodes - Set of already earned achievement codes
 * @returns All newly earned achievements across all categories
 */
export function checkAllAchievements(
  streakStats: StreakStats,
  learningStats: LearningStats,
  masteryStats: MasteryStats,
  earnedCodes: Set<string>
): Achievement[] {
  const newlyEarned: Achievement[] = []

  // Check all categories
  newlyEarned.push(...checkStreakAchievements(streakStats, earnedCodes))
  newlyEarned.push(...checkLearningAchievements(learningStats, earnedCodes))
  newlyEarned.push(...checkMasteryAchievements(masteryStats, earnedCodes))

  return newlyEarned
}

// ============================================
// PROGRESS CALCULATION
// ============================================

/**
 * Get progress toward a specific achievement
 *
 * @param achievement - Achievement to check progress for
 * @param stats - Combined stats object
 * @returns Progress information
 */
export function getAchievementProgress(
  achievement: Achievement,
  stats: {
    streak?: StreakStats
    learning?: LearningStats
    mastery?: MasteryStats
  }
): AchievementProgress {
  let current = 0

  switch (achievement.category) {
    case 'streak':
      if (stats.streak) {
        current = Math.max(stats.streak.currentStreak, stats.streak.longestStreak)
      }
      break

    case 'learning':
      if (stats.learning) {
        if (
          achievement.code.startsWith('first_lesson') ||
          achievement.code.startsWith('lessons_')
        ) {
          current = stats.learning.totalLessonsCompleted
        } else if (
          achievement.code.startsWith('first_course') ||
          achievement.code.startsWith('courses_')
        ) {
          current = stats.learning.totalCoursesCompleted
        } else if (achievement.code.startsWith('cards_')) {
          current = stats.learning.totalCardsReviewed
        }
      }
      break

    case 'mastery':
      if (stats.mastery) {
        if (achievement.code.startsWith('perfect_')) {
          current = stats.mastery.perfectLessons
        } else if (achievement.code.startsWith('level_')) {
          current = stats.mastery.currentLevel
        } else if (achievement.code.startsWith('mastery_')) {
          current = stats.mastery.coursesWithFullMastery
        }
      }
      break
  }

  const percent = Math.min(100, Math.round((current / achievement.threshold) * 100))

  return {
    achievement,
    current,
    target: achievement.threshold,
    percent,
  }
}

/**
 * Get progress for all achievements
 *
 * @param stats - Combined stats object
 * @param earnedCodes - Set of already earned achievement codes
 * @param includeEarned - Whether to include already earned achievements
 * @returns Array of progress information for each achievement
 */
export function getAllAchievementProgress(
  stats: {
    streak?: StreakStats
    learning?: LearningStats
    mastery?: MasteryStats
  },
  earnedCodes: Set<string>,
  includeEarned: boolean = true
): AchievementProgress[] {
  return ACHIEVEMENTS.filter((a) => {
    // Filter out hidden achievements that haven't been earned
    if (a.hidden && !earnedCodes.has(a.code)) return false
    // Filter out earned if requested
    if (!includeEarned && earnedCodes.has(a.code)) return false
    return true
  }).map((a) => getAchievementProgress(a, stats))
}

/**
 * Get next unearned achievements (closest to completion)
 *
 * @param stats - Combined stats object
 * @param earnedCodes - Set of already earned achievement codes
 * @param limit - Maximum number of achievements to return
 * @returns Array of achievements closest to being earned
 */
export function getNextAchievements(
  stats: {
    streak?: StreakStats
    learning?: LearningStats
    mastery?: MasteryStats
  },
  earnedCodes: Set<string>,
  limit: number = 3
): AchievementProgress[] {
  const allProgress = getAllAchievementProgress(stats, earnedCodes, false)

  // Sort by percent complete (descending), then by XP reward (ascending for easier ones first)
  return allProgress
    .filter((p) => p.percent < 100)
    .sort((a, b) => {
      // Prioritize achievements closer to completion
      if (b.percent !== a.percent) return b.percent - a.percent
      // Then by lower threshold (easier achievements first)
      return a.achievement.threshold - b.achievement.threshold
    })
    .slice(0, limit)
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get badge color based on achievement category (Tailwind classes)
 */
export function getAchievementColor(category: AchievementCategory): string {
  switch (category) {
    case 'streak':
      return 'text-orange-500'
    case 'learning':
      return 'text-blue-500'
    case 'mastery':
      return 'text-purple-500'
    default:
      return 'text-gray-500'
  }
}

/**
 * Get badge background gradient based on category (Tailwind classes)
 */
export function getAchievementGradient(category: AchievementCategory): string {
  switch (category) {
    case 'streak':
      return 'from-orange-400 to-red-500'
    case 'learning':
      return 'from-blue-400 to-indigo-500'
    case 'mastery':
      return 'from-purple-400 to-pink-500'
    default:
      return 'from-gray-400 to-gray-500'
  }
}

/**
 * Get category label
 */
export function getCategoryLabel(category: AchievementCategory): string {
  switch (category) {
    case 'streak':
      return 'Streak'
    case 'learning':
      return 'Learning'
    case 'mastery':
      return 'Mastery'
    default:
      return 'Other'
  }
}

/**
 * Format achievement notification message
 */
export function getAchievementMessage(achievement: Achievement): string {
  return `${achievement.emoji} Achievement Unlocked: ${achievement.name}! +${achievement.xpReward} XP`
}

/**
 * Calculate total XP from earned achievements
 */
export function calculateTotalAchievementXP(earnedCodes: Set<string>): number {
  return ACHIEVEMENTS.filter((a) => earnedCodes.has(a.code)).reduce(
    (total, a) => total + a.xpReward,
    0
  )
}

/**
 * Get summary statistics for achievements
 */
export function getAchievementSummary(earnedCodes: Set<string>): {
  total: number
  earned: number
  totalXP: number
  earnedXP: number
  byCategory: Record<AchievementCategory, { total: number; earned: number }>
} {
  const visibleAchievements = ACHIEVEMENTS.filter((a) => !a.hidden || earnedCodes.has(a.code))

  const byCategory: Record<AchievementCategory, { total: number; earned: number }> = {
    streak: { total: 0, earned: 0 },
    learning: { total: 0, earned: 0 },
    mastery: { total: 0, earned: 0 },
  }

  let earnedXP = 0

  for (const achievement of visibleAchievements) {
    byCategory[achievement.category].total++
    if (earnedCodes.has(achievement.code)) {
      byCategory[achievement.category].earned++
      earnedXP += achievement.xpReward
    }
  }

  return {
    total: visibleAchievements.length,
    earned: earnedCodes.size,
    totalXP: ACHIEVEMENTS.reduce((sum, a) => sum + a.xpReward, 0),
    earnedXP,
    byCategory,
  }
}

// ============================================
// DATABASE HELPERS
// ============================================

/**
 * Prepare achievement for database insert
 */
export function prepareAchievementInsert(
  userId: string,
  achievementCode: string
): {
  user_id: string
  achievement_code: string
  xp_awarded: number
} {
  const achievement = getAchievement(achievementCode)
  return {
    user_id: userId,
    achievement_code: achievementCode,
    xp_awarded: achievement?.xpReward || 0,
  }
}

/**
 * Convert database records to AchievementWithStatus array
 */
export function mapEarnedAchievements(
  earnedRecords: EarnedAchievement[]
): AchievementWithStatus[] {
  const earnedMap = new Map(earnedRecords.map((r) => [r.achievement_code, r.earned_at]))

  return ACHIEVEMENTS.filter((a) => !a.hidden || earnedMap.has(a.code)).map((achievement) => {
    const earnedAt = earnedMap.get(achievement.code)
    return {
      ...achievement,
      earned: !!earnedAt,
      earnedAt: earnedAt ? new Date(earnedAt) : null,
    }
  })
}

/**
 * Get recently earned achievements (for notifications)
 *
 * @param earnedRecords - Database records
 * @param withinMs - Time window in milliseconds (default 1 hour)
 * @returns Recently earned achievements
 */
export function getRecentlyEarned(
  earnedRecords: EarnedAchievement[],
  withinMs: number = 60 * 60 * 1000
): AchievementWithStatus[] {
  const now = new Date()
  const cutoff = new Date(now.getTime() - withinMs)

  return earnedRecords
    .filter((r) => new Date(r.earned_at) >= cutoff)
    .map((r) => {
      const achievement = getAchievement(r.achievement_code)
      if (!achievement) return null
      return {
        ...achievement,
        earned: true,
        earnedAt: new Date(r.earned_at),
      }
    })
    .filter((a): a is AchievementWithStatus => a !== null)
}
