/**
 * XP and Leveling System
 *
 * Gamification system for StudySnap that rewards users
 * for learning activities and tracks their progress.
 */

// ============================================
// XP REWARDS
// ============================================

export const XP_REWARDS = {
  // Lesson completion
  lesson_complete: 10,
  lesson_perfect: 5, // Bonus for 100% accuracy

  // Review cards (SRS)
  card_reviewed: 1,
  card_easy: 2, // Bonus for "Easy" rating
  card_good: 1, // Standard for "Good" rating
  card_hard: 0, // No bonus for "Hard"

  // Streaks
  streak_maintained: 5, // Daily bonus for keeping streak
  streak_week: 25, // Bonus for 7-day streak
  streak_month: 100, // Bonus for 30-day streak

  // Course creation
  course_created: 20,

  // Practice sessions
  practice_complete: 5,
  practice_perfect: 10, // Bonus for 100% in practice

  // Achievements/Milestones
  first_lesson: 15,
  first_course: 25,
  mastery_achieved: 50, // Reaching "mastered" on a topic
} as const

export type XPRewardType = keyof typeof XP_REWARDS

// ============================================
// LEVEL THRESHOLDS
// ============================================

/**
 * XP thresholds for each level
 * Index 0 = Level 1, Index 1 = Level 2, etc.
 *
 * Progression curve: roughly 1.5x increase per level
 */
export const LEVEL_THRESHOLDS = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  500, // Level 4
  1000, // Level 5
  1750, // Level 6
  2750, // Level 7
  4000, // Level 8
  5500, // Level 9
  7500, // Level 10
  10000, // Level 11
  13000, // Level 12
  16500, // Level 13
  20500, // Level 14
  25000, // Level 15
  30000, // Level 16
  36000, // Level 17
  43000, // Level 18
  51000, // Level 19
  60000, // Level 20
  70000, // Level 21
  82000, // Level 22
  96000, // Level 23
  112000, // Level 24
  130000, // Level 25
  150000, // Level 26
  175000, // Level 27
  205000, // Level 28
  240000, // Level 29
  280000, // Level 30
] as const

export const MAX_LEVEL = LEVEL_THRESHOLDS.length

// ============================================
// LEVEL NAMES & TITLES
// ============================================

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Novice',
  2: 'Beginner',
  3: 'Apprentice',
  4: 'Student',
  5: 'Scholar',
  6: 'Learner',
  7: 'Dedicated',
  8: 'Committed',
  9: 'Achiever',
  10: 'Expert',
  11: 'Virtuoso',
  12: 'Master',
  13: 'Grandmaster',
  14: 'Sage',
  15: 'Enlightened',
  16: 'Brilliant',
  17: 'Genius',
  18: 'Prodigy',
  19: 'Luminary',
  20: 'Legend',
  21: 'Champion',
  22: 'Titan',
  23: 'Immortal',
  24: 'Transcendent',
  25: 'Ascended',
  26: 'Divine',
  27: 'Celestial',
  28: 'Eternal',
  29: 'Supreme',
  30: 'Ultimate',
}

// ============================================
// TYPES
// ============================================

export interface XPEvent {
  type: XPRewardType
  amount: number
  timestamp: Date
  metadata?: {
    courseId?: string
    lessonIndex?: number
    cardId?: string
    streakDays?: number
  }
}

export interface LevelProgress {
  level: number
  title: string
  currentXP: number
  levelStartXP: number
  levelEndXP: number
  xpInLevel: number
  xpNeeded: number
  percent: number
  isMaxLevel: boolean
}

export interface XPGain {
  amount: number
  newTotal: number
  leveledUp: boolean
  newLevel?: number
  newTitle?: string
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Calculate the level for a given total XP
 *
 * @param totalXP - User's total XP
 * @returns Current level (1-30)
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < 0) return 1

  // Find the highest level threshold that totalXP meets
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      return i + 1 // Levels are 1-indexed
    }
  }

  return 1
}

/**
 * Get the XP threshold for a specific level
 *
 * @param level - Level number (1-30)
 * @returns XP required to reach that level
 */
export function getXPForLevel(level: number): number {
  const index = Math.max(0, Math.min(level - 1, LEVEL_THRESHOLDS.length - 1))
  return LEVEL_THRESHOLDS[index]
}

/**
 * Get the XP needed to reach the next level
 *
 * @param currentLevel - Current level (1-30)
 * @returns XP needed for next level, or 0 if max level
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) {
    return 0
  }

  return LEVEL_THRESHOLDS[currentLevel] // Index is level for next level
}

/**
 * Get detailed progress toward the next level
 *
 * @param totalXP - User's total XP
 * @returns Progress object with current, needed, and percent
 */
export function getXPProgress(totalXP: number): LevelProgress {
  const level = calculateLevel(totalXP)
  const isMaxLevel = level >= MAX_LEVEL

  const levelStartXP = getXPForLevel(level)
  const levelEndXP = isMaxLevel ? levelStartXP : getXPForNextLevel(level)

  const xpInLevel = totalXP - levelStartXP
  const xpNeeded = levelEndXP - levelStartXP
  const percent = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100

  return {
    level,
    title: getLevelTitle(level),
    currentXP: totalXP,
    levelStartXP,
    levelEndXP,
    xpInLevel,
    xpNeeded,
    percent,
    isMaxLevel,
  }
}

/**
 * Get the title for a level
 *
 * @param level - Level number
 * @returns Level title string
 */
export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level] || LEVEL_TITLES[MAX_LEVEL] || 'Unknown'
}

// ============================================
// XP CALCULATION HELPERS
// ============================================

/**
 * Calculate XP for completing a lesson
 *
 * @param accuracy - Percentage accuracy (0-100)
 * @returns Total XP earned
 */
export function calculateLessonXP(accuracy: number): number {
  let xp = XP_REWARDS.lesson_complete

  // Perfect bonus
  if (accuracy === 100) {
    xp += XP_REWARDS.lesson_perfect
  }

  return xp
}

/**
 * Calculate XP for reviewing a card
 *
 * @param rating - SRS rating (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @returns Total XP earned
 */
export function calculateCardReviewXP(rating: 1 | 2 | 3 | 4): number {
  let xp = XP_REWARDS.card_reviewed

  switch (rating) {
    case 4: // Easy
      xp += XP_REWARDS.card_easy
      break
    case 3: // Good
      xp += XP_REWARDS.card_good
      break
    case 2: // Hard
      xp += XP_REWARDS.card_hard
      break
    // case 1: Again - no bonus
  }

  return xp
}

/**
 * Calculate XP for maintaining a streak
 *
 * @param streakDays - Number of consecutive days
 * @returns Total XP earned
 */
export function calculateStreakXP(streakDays: number): number {
  let xp = XP_REWARDS.streak_maintained

  // Weekly milestone bonus
  if (streakDays > 0 && streakDays % 7 === 0) {
    xp += XP_REWARDS.streak_week
  }

  // Monthly milestone bonus
  if (streakDays > 0 && streakDays % 30 === 0) {
    xp += XP_REWARDS.streak_month
  }

  return xp
}

/**
 * Calculate XP for completing a practice session
 *
 * @param accuracy - Percentage accuracy (0-100)
 * @returns Total XP earned
 */
export function calculatePracticeXP(accuracy: number): number {
  let xp = XP_REWARDS.practice_complete

  // Perfect bonus
  if (accuracy === 100) {
    xp += XP_REWARDS.practice_perfect
  }

  return xp
}

// ============================================
// XP AWARD FUNCTION
// ============================================

/**
 * Award XP and calculate if user leveled up
 *
 * @param currentTotalXP - User's current total XP
 * @param type - Type of XP reward
 * @param bonusXP - Optional additional XP
 * @returns XP gain result with level up info
 */
export function awardXP(
  currentTotalXP: number,
  type: XPRewardType,
  bonusXP: number = 0
): XPGain {
  const baseAmount = XP_REWARDS[type]
  const amount = baseAmount + bonusXP
  const newTotal = currentTotalXP + amount

  const oldLevel = calculateLevel(currentTotalXP)
  const newLevel = calculateLevel(newTotal)
  const leveledUp = newLevel > oldLevel

  return {
    amount,
    newTotal,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    newTitle: leveledUp ? getLevelTitle(newLevel) : undefined,
  }
}

/**
 * Award XP with custom amount
 *
 * @param currentTotalXP - User's current total XP
 * @param amount - Amount of XP to award
 * @returns XP gain result with level up info
 */
export function awardCustomXP(currentTotalXP: number, amount: number): XPGain {
  const newTotal = currentTotalXP + amount

  const oldLevel = calculateLevel(currentTotalXP)
  const newLevel = calculateLevel(newTotal)
  const leveledUp = newLevel > oldLevel

  return {
    amount,
    newTotal,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    newTitle: leveledUp ? getLevelTitle(newLevel) : undefined,
  }
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Format XP number for display
 *
 * @param xp - XP amount
 * @returns Formatted string (e.g., "1,234" or "1.2K")
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`
  }
  if (xp >= 10000) {
    return `${(xp / 1000).toFixed(1)}K`
  }
  return xp.toLocaleString()
}

/**
 * Get color for level (Tailwind classes)
 *
 * @param level - Level number
 * @returns Tailwind color class
 */
export function getLevelColor(level: number): string {
  if (level >= 25) return 'text-amber-400' // Gold
  if (level >= 20) return 'text-purple-500' // Purple
  if (level >= 15) return 'text-red-500' // Red
  if (level >= 10) return 'text-blue-500' // Blue
  if (level >= 5) return 'text-green-500' // Green
  return 'text-gray-500' // Gray
}

/**
 * Get background gradient for level (Tailwind classes)
 *
 * @param level - Level number
 * @returns Tailwind gradient class
 */
export function getLevelGradient(level: number): string {
  if (level >= 25) return 'from-amber-400 to-yellow-600'
  if (level >= 20) return 'from-purple-500 to-pink-500'
  if (level >= 15) return 'from-red-500 to-orange-500'
  if (level >= 10) return 'from-blue-500 to-indigo-500'
  if (level >= 5) return 'from-green-500 to-emerald-500'
  return 'from-gray-400 to-gray-500'
}

/**
 * Get icon/badge for level tier
 *
 * @param level - Level number
 * @returns Emoji representing the tier
 */
export function getLevelBadge(level: number): string {
  if (level >= 25) return '👑' // Crown - Legendary
  if (level >= 20) return '💎' // Diamond - Epic
  if (level >= 15) return '🔥' // Fire - Rare
  if (level >= 10) return '⭐' // Star - Uncommon
  if (level >= 5) return '🌟' // Glowing Star - Common+
  return '✨' // Sparkles - Beginner
}

// ============================================
// STATISTICS
// ============================================

/**
 * Calculate XP earned in a time period
 *
 * @param events - Array of XP events
 * @param startDate - Start of period
 * @param endDate - End of period
 * @returns Total XP earned in period
 */
export function calculateXPInPeriod(
  events: XPEvent[],
  startDate: Date,
  endDate: Date
): number {
  return events
    .filter((e) => e.timestamp >= startDate && e.timestamp <= endDate)
    .reduce((sum, e) => sum + e.amount, 0)
}

/**
 * Get XP breakdown by type
 *
 * @param events - Array of XP events
 * @returns Object with XP totals by type
 */
export function getXPBreakdown(events: XPEvent[]): Record<XPRewardType, number> {
  const breakdown = {} as Record<XPRewardType, number>

  for (const type of Object.keys(XP_REWARDS) as XPRewardType[]) {
    breakdown[type] = 0
  }

  for (const event of events) {
    breakdown[event.type] = (breakdown[event.type] || 0) + event.amount
  }

  return breakdown
}

/**
 * Calculate average daily XP
 *
 * @param totalXP - Total XP
 * @param accountCreatedAt - When the account was created
 * @returns Average XP per day
 */
export function calculateDailyAverage(totalXP: number, accountCreatedAt: Date): number {
  const now = new Date()
  const daysSinceCreation = Math.max(
    1,
    Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
  )

  return Math.round(totalXP / daysSinceCreation)
}

/**
 * Estimate days to reach a target level
 *
 * @param currentXP - Current total XP
 * @param targetLevel - Target level to reach
 * @param dailyXPRate - Estimated daily XP gain
 * @returns Estimated days to reach level, or null if already at/above level
 */
export function estimateDaysToLevel(
  currentXP: number,
  targetLevel: number,
  dailyXPRate: number
): number | null {
  const currentLevel = calculateLevel(currentXP)

  if (currentLevel >= targetLevel) {
    return null // Already at or above target
  }

  if (dailyXPRate <= 0) {
    return Infinity
  }

  const targetXP = getXPForLevel(targetLevel)
  const xpNeeded = targetXP - currentXP

  return Math.ceil(xpNeeded / dailyXPRate)
}
